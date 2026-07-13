# Stage 1: Build the frontend and backend bundle
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Production runner
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
# Cloud Run will set PORT automatically, default to 8080 if not set
ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/server.cjs"]
