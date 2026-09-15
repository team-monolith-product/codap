### Step 1 ###
# Ruby와 Node.js 설치 및 정적 파일 빌드

FROM debian:bookworm-slim@sha256:88200866dfff7ea7f5cbcb6ec7c8a701889efe6fe859fe64d6990e4b07ea4171 AS builder

# 필요한 패키지 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential ca-certificates curl xz-utils libssl-dev zlib1g-dev \
    libyaml-dev libreadline-dev libffi-dev libgmp-dev git rsync file openjdk-17-jre-headless \
    && rm -rf /var/lib/apt/lists/*

# Ruby 2.7 기본 OpenSSL 확장이 시스템 OpenSSL 3을 지원하지 않아 호환되는 확장으로 빌드함
# Digest 빌드에서 참조하는 deprecation.rb는 Ruby 소스의 것을 보존함
RUN curl -fsSL https://cache.ruby-lang.org/pub/ruby/2.7/ruby-2.7.8.tar.xz -o /tmp/ruby.tar.xz \
    && echo 'f22f662da504d49ce2080e446e4bea7008cee11d5ec4858fc69000d0e5b1d7fb  /tmp/ruby.tar.xz' | sha256sum -c - \
    && curl -fsSL https://github.com/ruby/openssl/archive/refs/tags/v3.3.3.tar.gz -o /tmp/openssl.tar.gz \
    && echo '32b2d66405cb5fc8d1020156c9d942a213bf7f01f89fae6990fd002dde164094  /tmp/openssl.tar.gz' | sha256sum -c - \
    && mkdir -p /usr/src \
    && tar -xJf /tmp/ruby.tar.xz -C /usr/src \
    && tar -xzf /tmp/openssl.tar.gz -C /usr/src \
    && mv /usr/src/ruby-2.7.8/ext/openssl/deprecation.rb /tmp/ \
    && rm -rf /usr/src/ruby-2.7.8/ext/openssl \
    && cp -r /usr/src/openssl-3.3.3/ext/openssl /usr/src/ruby-2.7.8/ext/openssl \
    && cp -r /usr/src/openssl-3.3.3/lib /usr/src/ruby-2.7.8/ext/openssl/lib \
    && cp /usr/src/openssl-3.3.3/openssl.gemspec /usr/src/ruby-2.7.8/ext/openssl/ \
    && mv /tmp/deprecation.rb /usr/src/ruby-2.7.8/ext/openssl/

WORKDIR /usr/src/ruby-2.7.8
RUN ./configure --enable-shared --disable-install-doc && make -j4
RUN make install && ldconfig
WORKDIR /
RUN rm -rf /usr/src/ruby-2.7.8 /usr/src/openssl-3.3.3 /tmp/ruby.tar.xz /tmp/openssl.tar.gz

# Node.js 16.20 설치
RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash - \
    && apt-get install -y nodejs=16.20.2-1nodesource1 \
    && apt-mark hold nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# add `/app/node_modules/.bin` to $PATH
ENV PATH /app/node_modules/.bin:$PATH

# extn 레포 clone 및 빌드

# 1. codap-data
WORKDIR /
RUN git clone https://github.com/concord-consortium/codap-data.git
WORKDIR /codap-data
# 커밋 해쉬가 변경되면 캐시가 파기됩니다.
# https://api.github.com/repos/concord-consortium/codap-data/commits/master
RUN git checkout 7151186335a3e9e394c1b3fbd89d1a9a191e28e1

# 2. codap-data-interactives
WORKDIR /
RUN git clone https://github.com/team-monolith-product/codap-data-interactives.git
WORKDIR /codap-data-interactives
# 커밋 해쉬가 변경되면 캐시가 파기됩니다.
# https://api.github.com/repos/team-monolith-product/codap-data-interactives/commits/master
RUN git checkout 917dca171fb0c57278e1a6cf67d66bd8bcf9d384
# codap-data-interactives 레포 라이브러리 설치
RUN npm ci

# set working directory
WORKDIR /codap

# install dependencies - ruby
ADD Gemfile Gemfile.lock ./
# 2.7 버전의 루비를 사용하기 위해 bundler 2.4.22 버전으로 설치
RUN gem install bundler -v 2.4.22 \
    && bundler config --global frozen 1
RUN gem install eventmachine
RUN bundle install

# SproutCore가 하드코딩한 PermGen 옵션은 Java 17에서 JVM 시작을 막음
RUN sed -i 's/ -XX:MaxPermSize=256m//' "$(bundle show sproutcore)/lib/sproutcore/helpers/minifier.rb"

# Node.js 의존성 설치
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# add app
COPY . ./

# BUILD_NUMBER 를 env 로 설정
# 추후에 해당 숫자를 갖는 폴더는 경로에서 제거되므로, 임의의 숫자로 설정합니다.
ENV BUILD_NUMBER 000000

# makeCodap 명령이 local 환경에서 실행되는 것을 가정하고 있기 때문에,
# 비슷한 환경을 만들어줍니다.
RUN touch ~/.codap-build.rc
RUN mkdir -p ../codap-data-interactives/target/build



FROM builder as builder-dev
# bundle app
RUN npm run build:bundle-dev

# timestamp 로 buildnumber 를 설정
RUN bash -e ./bin/makeCodap --languages=en,ko $BUILD_NUMBER

# move up one level
RUN mv /codap/dist/$BUILD_NUMBER/* /codap/dist/



FROM builder as builder-prd
# bundle app
RUN npm run build:bundle-prod

# timestamp 로 buildnumber 를 설정
RUN bash -e ./bin/makeCodap --languages=en,ko $BUILD_NUMBER

# move up one level
RUN mv /codap/dist/$BUILD_NUMBER/* /codap/dist/



FROM busybox:1.37.0-musl@sha256:fc6dddc4c44b1bfe37f41cae8e67d1693828e8f42a91862816d7953e2c9d3f23 AS assets

RUN addgroup -g 101 codap \
    && adduser -D -H -u 101 -G codap -h /app/codap -s /bin/false codap \
    && mkdir -p /app/codap \
    && chown 101:101 /app/codap

USER 101:101

FROM assets AS dev
COPY --chown=101:101 --from=builder-dev /codap/dist /app/codap

FROM assets AS prd
COPY --chown=101:101 --from=builder-prd /codap/dist /app/codap
