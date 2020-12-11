import { DockerCiLabels } from './models/docker-ci-labels.model';
import { DockerEventsModel } from './models/docker-events.model';
import { DockerImagesModel } from './models/docker-images.model';
import * as Docker from "dockerode";
import { Logger } from "./utils/logger";
import { IncomingMessage } from "http"; 
export class DockerManager {
  private _docker: Docker;
  private _logger = new Logger(this);
  
  public async init() {
    try {
      this._docker = new Docker({ socketPath: "/var/run/docker.sock" })
      await this._docker.ping();
    } catch (e) {
      this._logger.error("Error connecting to Docker.", e);
      process.exit(1);
    }
  }

  /**
   * Add a event listener on container events
   * @param e the event to listen
   * @param callback 
   */
  public async addContainerEventListener(e: (keyof typeof DockerEventsModel.ContainerEvents), callback: (res: DockerEventsModel.EventResponse) => void) {
    (await this._docker.getEvents()).on("data", (rawData) => {
      const data: DockerEventsModel.EventResponse = JSON.parse(rawData);
      if (data.Type === "container" && data.Action === e) {
        callback(data);
      }
    });
  }

  public getContainer(id: string): Docker.Container {
    return this._docker.getContainer(id);
  }
  public getImage(name: string): Docker.Image {
    return this._docker.getImage(name);
  }

  /**
   * Get all docker container enableb with docker-ci.enabled
   * Return a object where key is the id of the container and value
   * Is the name of the webhook or the name of the container
   */
  public async getAllContainersEnabled(): Promise<{ [k: string]: string }> {
    const containers = (await this._docker.listContainers());
    const response: { [k: string]: string } = {};
    for (const container of containers) {
      const labels: DockerCiLabels = container.Labels;
      if (labels["docker-ci.enable"] === "true")
        response[container.Id] = labels["docker-ci.name"] || (await this.getContainer(container.Id).inspect()).Name.replace("/", "")
    }
    return response;
  }

  public async pruneImages(): Promise<void> {
    await this._docker.pruneImages();
  }

  /**
   * Pull an image from its tag
   * @returns true in case of success
   */
  public async pullImage(imageName: string, containerLabels: DockerCiLabels): Promise<boolean> {
    try {
      const imageInfos = await this.getImage(imageName).inspect();
      this._logger.info("Pulling : ", ...imageInfos.RepoTags);
      let authConf: DockerImagesModel.PullImageAuth | undefined;
      if (containerLabels["docker-ci.username"] && containerLabels["docker-ci.password"] && containerLabels["docker-ci.auth-server"]) {
        authConf = {
          username: containerLabels["docker-ci.username"],
          password: containerLabels["docker-ci.password"],
          serveraddress: containerLabels["docker-ci.auth-server"]
        }
      }
      let data: any[] = [];
      for(const tag of imageInfos.RepoTags)
        data.push(await this._docker.pull(tag, authConf && { authconfig: authConf }));
      const message: IncomingMessage = data[0];
      message?.on("data", (data) => {
        try {
          this._logger.log(JSON.parse(data));
        } catch (e) {
          this._logger.log(data.toString())
        }
      });
      return new Promise<boolean>((resolve, reject) => {
        message?.on("end", () => resolve(true)) || resolve(true); 
      });
    } catch (e) {
      this._logger.error("Error pulling image", e);
      return false;
    }
  }

  /**
   * Recreate a container from its ID
   * @param containerId 
   */
  public async recreateContainer(containerId: string, image: string) {
    let oldContainer: Docker.Container = this.getContainer(containerId);
    const oldImageInfo = await this._docker.getImage(image).inspect();
    const oldContainerInfo = await oldContainer.inspect();

    this._logger.log("Stopping container");
    await oldContainer.stop();

    this._logger.log("Removing container");
    await oldContainer.remove();

    const allImages = (await this._docker.listImages()).filter(el => el.RepoTags?.length > 0).filter(allImageEl =>
      allImageEl.RepoTags.some(el => oldImageInfo.RepoTags.includes(el)));
    
    this._logger.log("Available images for this container : ", allImages)
    const newImage = (await this._docker.listImages()).filter(el => el.RepoTags?.length > 0)[0];
    this._logger.log("Recreating container with image :", newImage.RepoTags, newImage.RepoDigests);
    
    await new Promise<void>((resolve, reject) => {
      setTimeout(async () => {
        (await this._docker.createContainer({
          ...oldContainerInfo.Config,
          name: oldContainerInfo.Name,
          Image: newImage.RepoTags[0],
          NetworkingConfig: {
            EndpointsConfig: oldContainerInfo.NetworkSettings.Networks,
          },
          HostConfig: {
            Binds: oldContainerInfo.Mounts.map(el => `${el.Name}:${el.Destination}:${el.Mode}`)  //Binding volumes mountpoints in case of named volumes
          },
        })).start();
        resolve();
      }, 3000);
    });
    this._logger.info(`Container ${oldContainerInfo.Name} recreated and updated !`);
  }
}