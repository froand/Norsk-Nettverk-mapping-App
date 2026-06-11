FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3011
COPY --from=build /app/dist ./dist
COPY --from=build /app/data ./data
COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev
EXPOSE 3011
CMD ["node", "dist/index.js"]
