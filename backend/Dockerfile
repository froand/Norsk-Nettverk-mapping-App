FROM norsknettverkacr.azurecr.io/node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM norsknettverkacr.azurecr.io/node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev
EXPOSE 3001
CMD ["node", "dist/index.js"]
