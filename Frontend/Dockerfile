FROM node:24-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --no-audit --no-fund

COPY . .

EXPOSE 8081 8082 19000

ENV EXPO_NO_TELEMETRY=1

CMD ["sh", "-c", "npm install --no-audit --no-fund && npm run start -- --lan"]