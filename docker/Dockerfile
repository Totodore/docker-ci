FROM golang:1.17.2-alpine as go-builder

# Define build env
ENV GOOS linux
ENV CGO_ENABLED 0
ENV GOPATH=

COPY go.mod go.sum ./

RUN go mod download

COPY . .

RUN go build -o server ./src

FROM node:15.5-alpine as node-builder

COPY app/package.json ./

RUN npm install --force

COPY app/* .

RUN npm build

FROM alpine:latest

ENV PORT 80

COPY --from=go-builder ./server .
COPY --from=node-builder dist ./dist

EXPOSE 80

CMD ./server