# Docker-CI

Docker-CI is a little program which allow you to implement easy continuous integration through Github Workflows and docker-compose. It uses labels to set the different options to enable Docker-ci for each container.

Docker-CI watch for container creations, it means that you don't have to restart Docker-CI whenever you update a container configuration.

Docker-CI will then create a route corresponding to this pattern : ```http(s)://0.0.0.0[:port]/deploy/:appName``` where the appName correspond to the name you gave to your container or to the name you gave through the option ```docker-ci.name```
You can then set a Github Automation with an [Image building](https://github.com/actions/starter-workflows/blob/a571f2981ab5a22dfd9158f20646c2358db3654c/ci/docker-publish.yml) and you can then add a webhook to trigger the above url when the image is built and stored in the Github Package Registry

## Base configuration :
This is the default configuration, you just have to add docker-ci.enable in your docker-compose.yml :

|Name|Type|Description|
|----|----|-----------|
| ```docker-ci.enable```|```boolean```|Enable CI for this container, an endpoint will be created for this container and whenever it will be called the container image will be repulled and the container will be recreated (total update of the container)|
| ```docker-ci.name```|```string (Optional)```|Set a custom name for the endpoint, by default it is the name of the container|


## Authentification
In case your package is private, you can specify credentials in your config :

|Name|Type|Description|
|----|----|-----------|
| ```docker-ci.username```|```string (Optional)```|Set a username for the docker package registry auth|
| ```docker-ci.password```|```string (Optional)```|Set a password or a token for the docker package registry auth|
| ```docker-ci.auth-server```|```string (Optional)```|Set an auth server for the docker package registry auth|


## Example

### docker-compose.yml of docker-ci app
```yaml
version: "3"
services:
  docker-ci:
    container_name: docker-ci
    image: totodore/docker-ci:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    restart: always
    ports:
      - "5050:80"
    environment:
      - PORT=80
      - VERBOSE=true #Print logs
      - NODE_ENV=production
```
### docker-compose.yml of application Docker-CI (example of App with a Continuous integration workflow) :
```yaml
version: "3.7"
services:
  app:
    image: ghcr.io/totodore/automate:latest  ##The package registry link
    container_name: automate
    tty: true
    expose:
      - 80
    restart: always
    labels:
      - "docker-ci.enabled=true"
      - "docker-ci.name=automate" #This argument is optional by default it is the name of the container (container_name)
      # The following is only if you use auth to get private package
      - "docker-ci.password=MyPasswordOrToken" #Registry Password or token 
      - "docker-ci.username=MyRegistryUsername"
      - "docker-ci.auth-server=MyRegistryURL" #Ex for Github Registry : https://ghcr.io or https://docker.pkg.github.com
```

### docker-publish in the github repo :
```yaml
name: Docker

on:
  push:
    # Publish `master` as Docker `latest` image.
    branches:
      - master

    # Publish `v1.2.3` tags as releases.
    tags:
      - v*

env:
  # TODO: Change variable to your image's name.
  IMAGE_NAME: automate

jobs:
  push:
    runs-on: ubuntu-latest
    if: github.event_name == 'push'

    steps:
      - uses: actions/checkout@v2

      - name: Build image
        run: docker build . --file Dockerfile --tag $IMAGE_NAME

      - name: Log into GitHub Container Registry
      # TODO: Create a PAT with `read:packages` and `write:packages` scopes and save it as an Actions secret `CR_PAT`
        run: echo "${{ secrets.CR_PAT }}" | docker login https://ghcr.io -u ${{ github.actor }} --password-stdin

      - name: Push image to GitHub Container Registry
        run: |
          IMAGE_ID=ghcr.io/${{ github.repository_owner }}/$IMAGE_NAME
          # Change all uppercase to lowercase
          IMAGE_ID=$(echo $IMAGE_ID | tr '[A-Z]' '[a-z]')
          # Strip git ref prefix from version
          VERSION=$(echo "${{ github.ref }}" | sed -e 's,.*/\(.*\),\1,')
          # Strip "v" prefix from tag name
          [[ "${{ github.ref }}" == "refs/tags/"* ]] && VERSION=$(echo $VERSION | sed -e 's/^v//')
          # Use Docker `latest` tag convention
          [ "$VERSION" == "master" ] && VERSION=latest
          echo IMAGE_ID=$IMAGE_ID
          echo VERSION=$VERSION
          docker tag $IMAGE_NAME $IMAGE_ID:$VERSION
          docker push $IMAGE_ID:$VERSION
  deploy:
    needs: push
    name: deploy
    runs-on: ubuntu-18.04
    steps:
      - name: Deploy docker container webhook
        uses: joelwmale/webhook-action@master
        env:
          WEBHOOK_URL: ${{ secrets.DEPLOY_WEBHOOK_URL }} #This Docker secret correspond to http(s)://IP[:port]/deploy/automate
```

## All Labels :
|Name|Type|Description|
|----|----|-----------|
| ```docker-ci.enable```|```boolean```|Enable CI for this container, an endpoint will be created for this container and whenever it will be called the container image will be repulled and the container will be recreated (total update of the container)|
| ```docker-ci.name```|```string (Optional)```|Set a custom name for the endpoint, by default it is the name of the container|
| ```docker-ci.username```|```string (Optional)```|Set a username for the docker package registry auth|
| ```docker-ci.password```|```string (Optional)```|Set a password or a token for the docker package registry auth|
| ```docker-ci.auth-server```|```string (Optional)```|Set an auth server for the docker package registry auth|