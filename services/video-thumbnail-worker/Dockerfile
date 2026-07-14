FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates ffmpeg \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json server.mjs ./

ENV NODE_ENV=production
ENV PORT=8080

USER node
CMD ["node", "server.mjs"]
