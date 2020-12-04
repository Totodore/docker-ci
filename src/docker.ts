import { DockerEventsModel } from './models/docker-events.model';
import * as Docker from "dockerode";
import { Logger } from "./utils/logger";
import { DockerImagesModel } from './models/docker-images.model';

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

  public async addContainerEventListener(e: (keyof typeof DockerEventsModel.ContainerEvents), callback: (res: DockerEventsModel.EventResponse) => void) {
    (await this._docker.getEvents()).on(e,
      (res: DockerEventsModel.EventResponse) => res.type === "container" && callback(res));
  }

  public getContainer(id: string): Docker.Container {
    return this._docker.getContainer(id);
  }

  public async pullImage(imageUrl: string): Promise<boolean> {
    try {
      const params: DockerImagesModel.PullImageParameters = {
        fromSrc: imageUrl,
      }
      await this._docker.createImage(params);
      return true;
    } catch (e) {
      this._logger.error(e);
    }
  }
}