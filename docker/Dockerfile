FROM node:14.2-alpine

WORKDIR /app

COPY . .

RUN npm install

RUN npm install -g typescript

RUN npm run build

CMD npm start