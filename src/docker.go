package main

import (
	"context"
	"log"

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

func (docker *DockerClient) listenToEvents() {
	body, err := docker.cli.Events(context.Background(), types.EventsOptions{
		Filters: filters.NewArgs(filters.Arg("type", "container")),
	})
	for {
		select {
		case msg := <-body:
			//Get handler and if it exists and then check if msg type correspond to current event
			log.Println("Event received: ", msg.Type)
			if handler, ok := docker.events[ContainerEvent(msg.Actor.ID)]; msg.Type == events.ContainerEventType && ok {
				handler(msg)
			}
		case err := <-err:
			log.Fatal(err)
		}
	}
}

func (docker *DockerClient) getContainersEnabled() []types.Container {
	docker.cli.ContainerList(context.Background(), types.ContainerListOptions{})
	containers, err := docker.cli.ContainerList(context.Background(), types.ContainerListOptions{})
	if err != nil {
		panic(err)
	}
	enabledContainers := make([]types.Container, 0)
	for _, container := range containers {
		if container.Labels["docker-ci.enable"] == "true" && container.Labels["docker-ci.repo-url"] != "" {
			enabledContainers = append(enabledContainers, container)
		}
	}
	return enabledContainers
}
