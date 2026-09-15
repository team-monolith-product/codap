#!/usr/bin/env python3
"""Check the assets stage, or a built dev/prd image passed with --image."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tarfile
import tempfile
import uuid


ROOT = Path(__file__).resolve().parents[1]


def command(*args):
    return subprocess.check_output(args, text=True).strip()


def manifest(args):
    entries = {}
    with subprocess.Popen(args, stdout=subprocess.PIPE) as process:
        with tarfile.open(fileobj=process.stdout, mode="r|") as archive:
            for member in archive:
                name = member.name.removeprefix("./").rstrip("/")
                if name in ("", "."):
                    continue
                entry = {"mode": oct(member.mode), "uid": member.uid, "gid": member.gid}
                if member.isfile():
                    digest = hashlib.sha256()
                    with archive.extractfile(member) as source:
                        for chunk in iter(lambda: source.read(1024 * 1024), b""):
                            digest.update(chunk)
                    entry.update(type="file", size=member.size, sha256=digest.hexdigest(), mtime=member.mtime)
                elif member.isdir():
                    entry.update(type="directory")
                elif member.issym():
                    entry.update(type="symlink", target=member.linkname)
                else:
                    raise AssertionError(f"Unexpected asset type: {member.name}")
                assert name not in entries, f"Duplicate archive path: {name}"
                entries[name] = entry
        assert process.wait() == 0, f"Archive command failed: {args}"
    return entries


def check_image(image, platform, built_assets=False):
    info = json.loads(command("docker", "image", "inspect", image))[0]
    config = info["Config"]
    assert config["User"] == "101:101", config["User"]
    assert not config.get("Entrypoint"), config.get("Entrypoint")
    assert not config.get("ExposedPorts"), config.get("ExposedPorts")
    assert platform == info["Os"] + "/" + info["Architecture"]
    run = ["docker", "run", "--rm", "--platform", platform, "--network", "none",
           "--read-only", "--user", "101:101", "--cap-drop", "ALL",
           "--security-opt", "no-new-privileges"]
    command(*run, image, "sh", "-ec", """
        test "$(id -u)" = 101
        test "$(id -g)" = 101
        test "$(id -u codap)" = 101
        test "$(id -g codap)" = 101
        if command -v nginx; then exit 1; fi
        test ! -e /etc/nginx
        test ! -e /opt/bitnami/nginx
        test -x /bin/cp
        test "$(stat -c '%u:%g' /app/codap)" = 101:101
        if touch /app/codap/.readonly-check 2>/dev/null; then exit 1; fi
    """)
    source = manifest([*run, image, "tar", "-C", "/app/codap", "-cf", "-", "."])
    assert source, "Assets directory is empty"
    for path, entry in source.items():
        assert (entry["uid"], entry["gid"]) == (101, 101), (path, entry)
    if built_assets:
        for entry in ("index.html", "static/dg/en/cert/index.html", "static/dg/ko/cert/index.html"):
            assert source.get(entry, {}).get("type") == "file", f"Missing entry: {entry}"
            assert source[entry]["size"] > 0, f"Empty entry: {entry}"
    volume = "codap-sim10-assets-" + uuid.uuid4().hex[:12]
    command("docker", "volume", "create", volume)
    mount = ["--mount", f"type=volume,source={volume},target=/work"]
    try:
        command("docker", "run", "--rm", "--platform", platform, "--network", "none",
                "--read-only", "--user", "0:0", *mount, image, "sh", "-ec",
                "chown 0:101 /work; chmod 2770 /work")
        command(*run, *mount, image, "sh", "-ec", "cp -Rp /app/codap /work/")
        copied = manifest([*run, *mount, image, "tar", "-C", "/work/codap", "-cf", "-", "."])
        assert source == copied, json.dumps({
            path: {"source": source.get(path), "copied": copied.get(path)}
            for path in source.keys() | copied.keys() if source.get(path) != copied.get(path)
        }, indent=2)
    finally:
        command("docker", "volume", "rm", volume)
    print(json.dumps({"image": image, "id": info["Id"], "platform": platform,
                      "entries": len(source), "files": sum(e["type"] == "file" for e in source.values()),
                      "bytes": sum(e.get("size", 0) for e in source.values()),
                      "result": "UID/GID, readonly, no NGINX, hashes, mtimes, modes and symlinks passed"}), flush=True)
    return source


def check_fixture(platform):
    name = "codap-sim10-assets-" + uuid.uuid4().hex[:12]
    base = name + "-base"
    try:
        subprocess.run(["docker", "build", "--platform", platform, "--target", "assets",
                        "--tag", base, str(ROOT)], check=True)
        with tempfile.TemporaryDirectory(prefix="codap-sim10-assets-") as temp:
            context = Path(temp)
            assets = context / "fixture"
            assets.mkdir()
            (assets / "index.html").write_text("<!doctype html><title>CODAP assets</title>\n")
            (assets / "bytes.bin").write_bytes(bytes(range(256)) * 17)
            (assets / ".hidden").write_text("hidden asset\n")
            private = assets / ".nested"
            private.mkdir(mode=0o750)
            (private / "data.txt").write_text("nested hidden asset\n")
            (private / "data.txt").chmod(0o640)
            (assets / "executable").write_text("#!/bin/sh\nexit 0\n")
            (assets / "executable").chmod(0o750)
            (assets / "relative-link").symlink_to("bytes.bin")
            (assets / "directory-link").symlink_to(".nested", target_is_directory=True)
            (assets / "missing-link").symlink_to("missing")
            (assets / "absolute-link").symlink_to("/etc/passwd")
            for path in assets.rglob("*"):
                if path.is_file() and not path.is_symlink():
                    os.utime(path, (946684800, 946684800))
            (context / "Dockerfile").write_text(
                f"FROM {base}\nCOPY --chown=101:101 fixture/ /app/codap/\n")
            subprocess.run(["docker", "build", "--platform", platform, "--tag", name, temp], check=True)
            result = check_image(name, platform)
            for path in (".hidden", ".nested/data.txt"):
                assert path in result, f"Fixture was not included: {path}"
            assert result[".nested/data.txt"]["mode"] == "0o640"
            assert result["executable"]["mode"] == "0o750"
            for path, target in {"relative-link": "bytes.bin", "directory-link": ".nested",
                                 "missing-link": "missing", "absolute-link": "/etc/passwd"}.items():
                assert result[path]["type"] == "symlink", (path, result[path])
                assert result[path]["target"] == target, (path, result[path])
    finally:
        subprocess.run(["docker", "image", "rm", name, base], check=False,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--image", action="append", default=[], help="Built dev/prd image; repeat to check both")
    parser.add_argument("--platform", default="linux/amd64")
    args = parser.parse_args()
    if args.image:
        for image in args.image:
            check_image(image, args.platform, built_assets=True)
    else:
        check_fixture(args.platform)


if __name__ == "__main__":
    main()
