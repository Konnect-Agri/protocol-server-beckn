FROM node:16.20-alpine3.18 AS builder

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

FROM node:16.20-alpine3.18

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app ./

EXPOSE 5003

CMD ["node", "dist/app.js"]