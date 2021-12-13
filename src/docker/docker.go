package docker

import (
	"context"
	"log"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/events"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/client"
)

type DockerClient struct {
	cli             *client.Client
	Events          map[ContainerEvent]func(event events.Message) //Map with container event in key and function in value
	containerAgents []*ContainerAgent
}

func New() *DockerClient {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		log.Fatal("Docker instance error:", err)
	}
	version, err := cli.ServerVersion(context.Background())
	if err != nil {
		log.Fatal("Docker instance error:", err)
	}
	log.Println("Connected to docker sock version:", version.Version)
	return &DockerClient{cli, make(map[ContainerEvent]func(event events.Message)), make([]*ContainerAgent, 0)}
}

//Listen to container events and call the function associated with the event
func (docker *DockerClient) ListenToEvents() {
	log.Printf("Listening for container %v", docker.mapKeys(docker.Events))
	body, err := docker.cli.Events(context.Background(), types.EventsOptions{
		Filters: filters.NewArgs(filters.Arg("type", "container")),
	})
	for {
		select {
		case msg := <-body:
			//Get handler and if it exists and then check if msg type correspond to current event
			if handler, ok := docker.Events[ContainerEvent(msg.Action)]; msg.Type == events.ContainerEventType && ok {
				handler(msg)
			}
		case err := <-err:
			log.Fatal(err)
		}
	}
}

func (docker *DockerClient) IsContainerEnabled(containerId string) bool {
	container, err := docker.cli.ContainerInspect(context.Background(), containerId)
	if err != nil {
		return false
	}
	return container.Config.Labels["docker-ci.enable"] == "true"
}

//Get a slice with all the container that have docker-ci enabled
func (docker *DockerClient) GetContainersEnabled() []types.Container {

	containers, err := docker.cli.ContainerList(context.Background(), types.ContainerListOptions{All: true})
	if err != nil {
		log.Panic(err)
	}
	enabledContainers := make([]types.Container, 0)
	for _, container := range containers {
		if container.Labels["docker-ci.enable"] == "true" {
			enabledContainers = append(enabledContainers, container)
		}
	}
	return enabledContainers
}

func (docker *DockerClient) NewRequest(containerId string, name string) error {
	containerAgent := NewContainerAgent(docker, containerId, name)
	docker.containerAgents = append(docker.containerAgents, containerAgent)
	return containerAgent.UpdateContainer()
}

//Get the list of the listened events
func (docker *DockerClient) mapKeys(m map[ContainerEvent]func(event events.Message)) []string {
	keys := make([]string, len(m))

	i := 0
	for k := range m {
		keys[i] = string(k)
		i++
	}
	return keys
}
