#!/usr/bin/env python3
"""Test a built runtime image with the server block rendered by service-helm."""

import argparse
import gzip
import hashlib
from html.parser import HTMLParser
import http.client
import json
from pathlib import Path
import re
import socket
import subprocess
import tempfile
import time
import unittest
from urllib.parse import urljoin, urlsplit
import uuid


def command(*args):
    return subprocess.check_output(args, text=True, stderr=subprocess.STDOUT).strip()


class EntryAssets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.references = set()
        self.in_script = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "script":
            self.in_script = True
            if attrs.get("src"):
                self.references.add((attrs["src"], "script"))
        if tag == "link" and attrs.get("rel") == "stylesheet" and attrs.get("href"):
            self.references.add((attrs["href"], "style"))

    def handle_endtag(self, tag):
        if tag == "script":
            self.in_script = False

    def handle_data(self, data):
        if self.in_script:
            for path in re.findall(r'''["']([^"'\s]+\.css)["']''', data):
                self.references.add((path, "style"))


class RuntimeTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="codap-sim10-")
        cls.addClassCleanup(cls.temp.cleanup)
        directory = Path(cls.temp.name)
        args = ["helm", "template", "codap-sim10", str(cls.options.helm_chart),
                "--show-only", "templates/configmap.yaml"]
        for values in cls.options.values:
            args.extend(["--values", str(values)])
        rendered = command(*args)
        block = rendered.split("  server-block.conf: |\n", 1)[1]
        config = "\n".join(line[4:] for line in block.splitlines()) + "\n"
        config_directory = directory / "config"
        config_directory.mkdir()
        (config_directory / "server-block.conf").write_text(config)
        assets = directory / "assets"
        assets.mkdir()
        (assets / "index.html").write_text("<!doctype html><title>codap fixture</title>\n")
        (assets / "asset.js").write_text("console.log('codap');\n" * 200)
        (assets / "bytes.txt").write_text("0123456789abcdef")
        (assets / "directory").mkdir()
        (assets / "directory" / "index.html").write_text("directory index\n")
        (assets / "inside-link").symlink_to("bytes.txt")
        (assets / "outside-link").symlink_to("/etc/os-release")
        (assets / "directory-link").symlink_to("directory", target_is_directory=True)
        cls.name = "codap-sim10-" + uuid.uuid4().hex[:12]
        run = ["docker", "run", "--detach", "--name", cls.name,
               "--read-only", "--tmpfs", "/tmp:rw,noexec,nosuid,size=16m",
               "--cap-drop", "ALL", "--security-opt", "no-new-privileges",
               "--publish", "127.0.0.1::8080",
               "--volume", f"{config_directory}:/opt/bitnami/nginx/conf/server_blocks:ro"]
        if not cls.options.built_assets:
            run.extend(["--volume", f"{assets}:/app/codap:ro"])
        run.append(cls.options.image)
        command(*run)
        cls.addClassCleanup(command, "docker", "rm", "--force", cls.name)
        port = command("docker", "port", cls.name, "8080/tcp")
        cls.port = int(port.rsplit(":", 1)[1])
        for _ in range(100):
            try:
                if cls.request("/health_check")[0] == 200:
                    break
            except (OSError, http.client.HTTPException):
                pass
            time.sleep(0.1)
        else:
            raise RuntimeError(command("docker", "logs", cls.name))
        info = json.loads(command("docker", "image", "inspect", cls.options.image))[0]
        cls.image_user = info["Config"]["User"]
        print(json.dumps({"image": info["Id"], "platform": info["Os"] + "/" + info["Architecture"],
                          "nginx": command("docker", "exec", cls.name, "nginx", "-v"),
                          "server_block_sha256": hashlib.sha256(config.encode()).hexdigest(),
                          "built_assets": cls.options.built_assets}), flush=True)

    @classmethod
    def request(cls, path, method="GET", headers=None):
        connection = http.client.HTTPConnection("127.0.0.1", cls.port, timeout=5)
        try:
            connection.request(method, path, headers=headers or {})
            response = connection.getresponse()
            return response.status, {k.lower(): v for k, v in response.getheaders()}, response.read()
        finally:
            connection.close()

    def test_runtime_permissions_and_config(self):
        self.assertEqual(self.image_user, "1001:1001")
        self.assertEqual(command("docker", "exec", self.name, "id", "-u"), "1001")
        self.assertEqual(command("docker", "exec", self.name, "id", "-g"), "1001")
        self.assertIn(":101:101:", command("docker", "exec", self.name, "getent", "passwd", "nginx"))
        self.assertIn(":1001:1001:", command("docker", "exec", self.name, "getent", "passwd", "codap"))
        self.assertEqual(command("docker", "exec", self.name, "stat", "-c", "%u:%g", "/etc/nginx/nginx.conf"), "101:0")
        command("docker", "exec", self.name, "sh", "-ec",
                "touch /tmp/write-check; ! touch /etc/nginx/write-check 2>/dev/null; "
                "test -s /tmp/nginx.pid; test ! -e /run/nginx.pid")
        command("docker", "exec", self.name, "nginx", "-t")
        config = command("docker", "exec", self.name, "nginx", "-T")
        self.assertIn("/opt/bitnami/nginx/conf/server_blocks/server-block.conf", config)
        self.assertIn("disable_symlinks on;", config)
        self.assertNotIn("listen       80;", config)
        processes = command("docker", "exec", self.name, "sh", "-ec",
                            "for file in /proc/[0-9]*/status; do "
                            "if grep -q '^Name:[[:space:]]*nginx$' \"$file\"; then "
                            "awk '/^Uid:|^Gid:/ {print $2}' \"$file\"; fi; done")
        self.assertTrue(processes)
        self.assertEqual(set(processes.splitlines()), {"1001"})

    def test_health_and_document_alias(self):
        self.assertEqual(self.request("/health_check")[::2], (200, b"OK"))
        normal = self.request("/index.html")
        aliased = self.request("/dg/index.html")
        self.assertEqual(normal[0], 200)
        self.assertEqual(aliased[0], 200)
        self.assertEqual(normal[2], aliased[2])
        self.assertTrue(normal[2])
        self.assertEqual(normal[1]["content-type"], "text/html")
        self.assertEqual(normal[1]["server"], "nginx")
        self.assertEqual(normal[1]["x-frame-options"], "SAMEORIGIN")
        self.assertNotIn("x-frame-options", aliased[1])
        self.assertEqual(self.request("/dg/")[2], normal[2])
        redirect = self.request("/dg?language=ko")
        self.assertEqual(redirect[0], 301)
        self.assertEqual(redirect[1]["location"], "/dg/?language=ko")
        if self.options.built_assets:
            for language in ("en", "ko"):
                entry_path = f"/static/dg/{language}/cert/index.html"
                entry = self.request(entry_path)
                self.assertEqual(entry[0], 200)
                self.assertEqual(entry[1]["content-type"], "text/html")
                self.assertEqual(self.request("/dg" + entry_path)[2], entry[2])
                assets = EntryAssets()
                assets.feed(entry[2].decode())
                self.assertEqual({kind for _, kind in assets.references}, {"script", "style"})
                for reference, kind in sorted(assets.references):
                    path = urlsplit(urljoin(entry_path, reference))
                    if path.scheme or path.netloc:
                        continue
                    with self.subTest(path=path.path):
                        resource = self.request(path.path)
                        self.assertEqual(resource[0], 200)
                        self.assertTrue(resource[2])
                        if kind == "style":
                            self.assertEqual(resource[1]["content-type"], "text/css")
                        elif path.path.endswith(".js"):
                            self.assertEqual(resource[1]["content-type"], "application/javascript")
                        self.assertEqual(self.request("/dg" + path.path)[2], resource[2])

    def test_missing_files_and_head(self):
        for path in ["/", "/missing-sim10", "/dg/missing-sim10"]:
            with self.subTest(path=path):
                self.assertEqual(self.request(path)[0], 404)
        get = self.request("/dg/index.html")
        head = self.request("/dg/index.html", method="HEAD")
        self.assertEqual(head[0], 200)
        self.assertEqual(head[2], b"")
        self.assertEqual(head[1]["content-length"], get[1]["content-length"])

    def test_ranges_and_conditional_requests(self):
        path = "/index.html" if self.options.built_assets else "/bytes.txt"
        full = self.request(path)
        partial = self.request(path, headers={"Range": "bytes=2-5"})
        self.assertEqual(partial[0], 206)
        self.assertEqual(partial[2], full[2][2:6])
        self.assertEqual(partial[1]["content-range"], f"bytes 2-5/{len(full[2])}")
        for header, value in [("If-None-Match", full[1]["etag"]),
                              ("If-Modified-Since", full[1]["last-modified"])]:
            with self.subTest(header=header):
                response = self.request(path, headers={header: value})
                self.assertEqual(response[0], 304)
                self.assertEqual(response[2], b"")

    def test_request_body_limit(self):
        for length, status in [(2 * 1024 * 1024, 405), (81 * 1024 * 1024, 413)]:
            with self.subTest(content_length=length):
                with socket.create_connection(("127.0.0.1", self.port), timeout=5) as connection:
                    connection.sendall(("POST /index.html HTTP/1.1\r\nHost: localhost\r\n"
                                        f"Content-Length: {length}\r\nConnection: close\r\n\r\n").encode())
                    response = http.client.HTTPResponse(connection)
                    response.begin()
                    self.assertEqual(response.status, status)
                    response.close()

    def test_fixture_directories_and_mime(self):
        if self.options.built_assets:
            self.skipTest("Synthetic fixtures are tested without --built-assets")
        self.assertEqual(self.request("/directory")[0], 404)
        self.assertEqual(self.request("/dg/directory")[0], 301)
        self.assertEqual(self.request("/dg/directory/")[::2], (200, b"directory index\n"))
        self.assertEqual(self.request("/asset.js")[1]["content-type"], "application/javascript")
        encoded = self.request("/asset.js", headers={"Accept-Encoding": "gzip", "Via": "1.1 proxy"})
        self.assertEqual(encoded[1]["content-encoding"], "gzip")
        self.assertEqual(gzip.decompress(encoded[2]), self.request("/asset.js")[2])

    def test_fixture_symlinks_are_blocked(self):
        if self.options.built_assets:
            self.skipTest("Synthetic fixtures are tested without --built-assets")
        for path in ["inside-link", "outside-link", "directory-link/index.html"]:
            for prefix, status in [("/", 404), ("/dg/", 403)]:
                with self.subTest(path=prefix + path):
                    expected = 404 if path.startswith("directory-link/") else status
                    self.assertEqual(self.request(prefix + path)[0], expected)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--image", required=True, help="Image built from Dockerfile's runtime, dev, or prd target")
    parser.add_argument("--helm-chart", required=True, type=Path, help="service-helm/codap-nginx checkout path")
    parser.add_argument("--values", action="append", type=Path, default=[])
    parser.add_argument("--built-assets", action="store_true", help="Serve the actual dev/prd image assets")
    RuntimeTest.options = parser.parse_args()
    unittest.main(argv=[__file__], verbosity=2)
