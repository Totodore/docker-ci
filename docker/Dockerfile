FROM golang:1.17.2 as builder
# Define build env
ENV GOOS linux
ENV CGO_ENABLED 0

WORKDIR /app

COPY go.mod go.sum ./

RUN go mod download

COPY . .

RUN go build -o app ./src

FROM alpine:latest

ENV PORT 8080

COPY --from=builder app .

EXPOSE 8080

CMD ./app