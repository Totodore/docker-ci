import { DockerEventsModel } from './models/docker-events.model';
import * as Docker from "dockerode";
import { Logger } from "./utils/logger";

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
   * Pull an image from its tag
   * @returns true in case of success
   */
  public async pullImage(imageName: string): Promise<boolean> {
    try {
      const imageInfos = await this.getImage(imageName).inspect();
      this._logger.log("Pulling : ", ...imageInfos.RepoTags);
      for (const tag of imageInfos.RepoTags)
        await this._docker.pull(tag)
      return true; 
    } catch (e) {
      this._logger.error(e);
      return false;
    }
  }

  /**
   * Recreate a container from its ID
   * TODO: Find a way to create the same container from docker-compose
   * @param containerId 
   */
  public async recreateContainer(containerId: string) {
    const container = this.getContainer(containerId);
    const infos = await container.inspect();
    await container.stop();
    await container.remove();
    this._docker.createContainer(infos.Config);
  }
}