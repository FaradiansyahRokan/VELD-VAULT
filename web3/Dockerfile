FROM node:20-alpine

WORKDIR /app

# Install basic network tools for healthcheck/debugging
RUN apk add --no-cache bash curl

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

EXPOSE 8545

CMD ["npx", "hardhat", "node", "--hostname", "0.0.0.0"]
