package main

import (
	"log"
	"os"

	"github.com/docker/docker/api/types/events"
	"github.com/joho/godotenv"
)

var docker *DockerClient
var enabledContainers []string

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
	go startServer(onRequest)
	go docker.listenToEvents()
	loadContainersConfig()
	log.Println("Listening to Container creation and deletion")
}

func loadContainersConfig() {
	containers := docker.getContainersEnabled()
	enabledContainers = make([]string, len(containers))
	for _, container := range containers {
		enabledContainers = append(enabledContainers, container.ID)
		log.Println("Webhook available at: " + os.Getenv("BASE_URL") + container.Names[0])
	}
}
func onRequest(name string) {
	log.Println("Request received for " + name)
}
func onCreateContainer(msg events.Message) {
	log.Println("Container creation detected: ", msg.Actor.Attributes["name"])
	loadContainersConfig()
}
func onDestroyContainer(msg events.Message) {
	log.Println("Container deletion detected: ", msg.Actor.Attributes["name"])
	loadContainersConfig()
}
