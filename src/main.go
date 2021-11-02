package main

import (
	"log"
	"os"

	"github.com/docker/docker/api/types/events"
	"github.com/joho/godotenv"
)

type ContainerInfo struct {
	Names []string
	Id    string
}

var docker *DockerClient
var enabledContainers []ContainerInfo

func main() {
	if os.Getenv("DOCKER_HOST") == "" {
		err := godotenv.Load()
		if err != nil {
			log.Fatal("Error loading .env file")
		}
	}
	docker = InitDockerInstance()
	docker.events[start_container] = onCreateContainer
	docker.events[stop_container] = onDestroyContainer
	go docker.ListenToEvents()
	loadContainersConfig()
	startServer(onRequest)
}

func loadContainersConfig() {
	containers := docker.GetContainersEnabled()
	enabledContainers = make([]ContainerInfo, len(containers))
	for _, container := range containers {
		name := container.Names[0][1:]
		enabledContainers = append(enabledContainers, ContainerInfo{container.Names, container.ID})
		log.Printf("Webhook available at: %s/hooks/%s", os.Getenv("BASE_URL"), name)
	}
}
func onRequest(name string) int {
	if !isContainerEnabled(name) {
		return 400
	}
	log.Println("Request received for " + name)

	return 200
}
func onCreateContainer(msg events.Message) {
	log.Println("Container creation detected:", msg.Actor.Attributes["name"])
	defer loadContainersConfig()
}
func onDestroyContainer(msg events.Message) {
	log.Println("Container deletion detected: ", msg.Actor.Attributes["name"])
	defer loadContainersConfig()
}
func isContainerEnabled(name string) bool {
	for _, container := range enabledContainers {
		for _, containerName := range container.Names {
			if containerName == "/"+name {
				return true
			}
		}
	}
	return false
}
