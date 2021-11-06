FROM golang:1.17.2-alpine as go-builder

# Define build env
ENV GOOS linux
ENV CGO_ENABLED 0
ENV GOPATH=

WORKDIR /app

COPY go.mod go.sum ./

RUN go mod download

COPY . .

RUN go build -o server ./src

FROM node:15.5-alpine as node-builder

WORKDIR /app

COPY app/package.json ./

RUN npm install --force

COPY app/ .

RUN npm run build

FROM alpine:latest

WORKDIR /app

ENV PORT 80
ENV GIN_MODE=release

COPY --from=go-builder /app/server .
COPY --from=node-builder /app/dist ./dist

EXPOSE 80

CMD ./server