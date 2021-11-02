package main

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/events"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/client"
)

type DockerClient struct {
	cli    *client.Client
	events map[ContainerEvent]func(event events.Message) //Map with container event in key and function in value
}

func InitDockerInstance() *DockerClient {
	cli, err := client.NewClientWithOpts(client.FromEnv)
	version, err1 := cli.ServerVersion(context.Background())
	if err == nil && err1 == nil {
		log.Println("Connected to docker sock version:", version.Version)
	} else if err != nil {
		log.Fatal("Docker instance error ", err)
	} else if err1 != nil {
		log.Fatal("Docker instance error ", err1)
	}
	return &DockerClient{cli, make(map[ContainerEvent]func(event events.Message))}
}

func (docker *DockerClient) ListenToEvents() {
	log.Printf("Listening for container %v", docker.mapKeys(docker.events))
	body, err := docker.cli.Events(context.Background(), types.EventsOptions{
		Filters: filters.NewArgs(filters.Arg("type", "container")),
	})
	for {
		select {
		case msg := <-body:
			//Get handler and if it exists and then check if msg type correspond to current event
			if handler, ok := docker.events[ContainerEvent(msg.Action)]; msg.Type == events.ContainerEventType && ok {
				handler(msg)
			}
		case err := <-err:
			log.Fatal(err)
		}
	}
}

func (docker *DockerClient) GetContainersEnabled() []types.Container {
	docker.cli.ContainerList(context.Background(), types.ContainerListOptions{})
	containers, err := docker.cli.ContainerList(context.Background(), types.ContainerListOptions{})
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
func (docker *DockerClient) UpdateContainer(containerId string) {
	container, err := docker.cli.ContainerInspect(context.Background(), containerId)
	if err != nil {
		log.Panic("Error while fetching container", err)
	}
	if container.State.Running {
		duration, _ := time.ParseDuration("5s")
		if err = docker.cli.ContainerStop(context.Background(), containerId, &duration); err != nil {
			log.Panic("Error while stopping container", err)
		}
	}
	docker.cli.ContainerRemove(context.Background(), containerId, types.ContainerRemoveOptions{
		RemoveVolumes: false, RemoveLinks: false, Force: true,
	})
	serveraddress := container.Config.Labels["docker-ci.auth-server"]
	password := container.Config.Labels["docker-ci.password"]
	username := container.Config.Labels["docker-ci.username"]
	var auth []byte
	if serveraddress != "" && username != "" && password != "" {
		auth, _ = json.Marshal(DockerAuth{Username: username, Password: password, Serveraddress: serveraddress})
	}
	docker.cli.ImagePull(context.Background(), container.Config.Image, types.ImagePullOptions{All: false, RegistryAuth: string(auth)})
}

func (docker *DockerClient) mapKeys(m map[ContainerEvent]func(event events.Message)) []string {
	keys := make([]string, len(m))

	i := 0
	for k := range m {
		keys[i] = string(k)
		i++
	}
	return keys
}
