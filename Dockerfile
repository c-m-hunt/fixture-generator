# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1
WORKDIR /usr/src/app
COPY package.json bun.lockb /usr/src/app/
RUN bun install --frozen-lockfile
COPY . .
RUN mkdir -p /usr/src/app/output && chown bun /usr/src/app/output

# run the app
USER bun
ENTRYPOINT [ "bun", "run", "src/index.ts" ]