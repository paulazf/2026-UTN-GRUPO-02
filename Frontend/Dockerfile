FROM node:24-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8081 8082 19000

CMD ["sh", "-c", "npm install && npm run start -- --lan"]