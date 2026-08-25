FROM node:20-slim

RUN apt-get update && apt-get install -y python3 --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /sandbox

COPY runner.ts .
RUN npm init -y && npm install tsx

# Container runs as non-root for security
RUN useradd -m sandbox
USER sandbox

CMD ["npx", "tsx", "runner.ts"]
