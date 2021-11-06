package docker

import (
	"bufio"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"log"
	"regexp"
	"strings"
	"time"

	"dockerci/src/utils"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/events"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/client"
)

type DockerClient struct {
	cli    *client.Client
	Events map[ContainerEvent]func(event events.Message) //Map with container event in key and function in value
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
	return &DockerClient{cli, make(map[ContainerEvent]func(event events.Message))}
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

//This method will pull the container image, check if it is the same that the current
//In case of a new one the container will be recreated and restarted
func (docker *DockerClient) UpdateContainer(containerId string) (err error) {
	defer func() {
		if r := recover(); r != nil {
			err = errors.New(r.(string))
		}
	}()
	ctx := context.Background()
	containerInfos, err := docker.cli.ContainerInspect(ctx, containerId)
	name := containerInfos.Name[1:]
	imageInfos, _, err := docker.cli.ImageInspectWithRaw(ctx, containerInfos.Image)
	if err != nil {
		docker.panic(name, "Error while fetching container", err)
	}
	//Pulling Image
	authToken := docker.getContainerCredsToken(&containerInfos)
	reader, err := docker.cli.ImagePull(ctx, containerInfos.Config.Image, types.ImagePullOptions{All: false, RegistryAuth: authToken})
	if err != nil {
		docker.panic(name, "Error while pulling image:", err)
	}
	scanner := bufio.NewScanner(reader)
	regex, err := regexp.Compile(`\b(sha256:[A-Fa-f0-9]{64})\b`)
	if err != nil {
		docker.panic(name, "Error while compiling regex", err)
	}
	//While pulling image we check if the image is new
	//If not we stop the update process
	for scanner.Scan() {
		line := scanner.Text()
		if sha := regex.FindString(line); sha != "" {
			docker.print(name, "Pulling image with digest:", sha)
			for _, digest := range imageInfos.RepoDigests {
				//We get the digest from the repo digest (name@digest)
				if regex.FindString(digest) == sha {
					docker.print(name, "Image already up to date, stopping process...")
					return nil
				}
			}
		}
	}
	defer reader.Close()

	//Stopping Container
	if containerInfos.State.Running {
		duration, _ := time.ParseDuration("5s")
		if err = docker.cli.ContainerStop(ctx, containerId, &duration); err != nil {
			docker.panic(name, "Error while stopping container:", err)
		}
	}
	//Removing Container
	docker.cli.ContainerRemove(ctx, containerId, types.ContainerRemoveOptions{
		RemoveVolumes: false, RemoveLinks: false, Force: true,
	})
	//Recreating Container
	createdContainer, err := docker.cli.ContainerCreate(ctx, containerInfos.Config, containerInfos.HostConfig, nil, nil, containerInfos.Name)
	if err != nil {
		docker.panic(name, "Error while creating container:", err)
	}
	//Starting Container
	if err := docker.cli.ContainerStart(ctx, createdContainer.ID, types.ContainerStartOptions{}); err != nil {
		docker.panic(name, "Error while starting container:", err)
	}
	//Removing former image
	if _, err := docker.cli.ImageRemove(ctx, imageInfos.ID, types.ImageRemoveOptions{Force: true}); err != nil {
		docker.panic(name, "Error while removing former image:", err)
	}
	statusCh, errCh := docker.cli.ContainerWait(ctx, createdContainer.ID, container.WaitConditionNotRunning)
	select {
	case err := <-errCh:
		if err != nil {
			docker.panic(name, "Container didn't start correctly:", err)
		}
	case <-statusCh:
	}
	return err
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

//Panic with container name
func (docker *DockerClient) panic(name string, args ...interface{}) {
	log.Panicf("[%s] %v", name, strings.Join(utils.InterfaceToStringSlice(args), " "))
}

//Print with container name
func (docker *DockerClient) print(name string, args ...interface{}) {
	log.Printf("[%s] %v", name, strings.Join(utils.InterfaceToStringSlice(args), " "))
}

//Read auth config from container labels and return a base64 encoded string for docker.
func (docker *DockerClient) getContainerCredsToken(container *types.ContainerJSON) string {
	serveraddress := container.Config.Labels["docker-ci.auth-server"]
	password := container.Config.Labels["docker-ci.password"]
	username := container.Config.Labels["docker-ci.username"]
	if serveraddress != "" && username != "" && password != "" {
		data, err := json.Marshal(DockerAuth{Username: username, Password: password, Serveraddress: serveraddress})
		if err != nil {
			docker.panic(container.Name[1:], "Error while marshalling auth config:", err)
		}
		auth := base64.StdEncoding.EncodeToString(data)
		return string(auth)
	} else {
		return ""
	}
}
