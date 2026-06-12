FROM node:22.22.3-bookworm AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

FROM node:22.22.3-bookworm AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/dist/* ./

EXPOSE 4002

CMD ["node", "index.js"]