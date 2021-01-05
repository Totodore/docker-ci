import { WebhooksManager } from './webhooks';
import { DockerManager } from './docker';
import { DockerCiLabels } from './models/docker-ci-labels.model';
import { DockerEventsModel } from './models/docker-events.model';
import { Logger } from './utils/logger';
import { MailerManager } from './utils/mailer';
import * as dotenv from "dotenv";
import { ContainerInspectInfo } from 'dockerode';

class App {

  private readonly _logger = new Logger(this);
  private _dockerManager = new DockerManager();
  private _webhooksManager = new WebhooksManager();
  private _mailer = new MailerManager();

  public async init() {
    this._logger.log("Connecting to docker endpoint");
    await this._dockerManager.init();
    await this._webhooksManager.init();
    process.env.MAILING && await this._mailer.init();
    this._dockerManager.addContainerEventListener("start", (res) => this._onCreateContainer(res));
    this._dockerManager.addContainerEventListener("destroy", (res) => this._onRemovedContainer(res));
    this._logger.log("Connected to docker endpoint.");
    this._logger.log("Watching container creation.");
    this._logger.log(`Listening webhooks on ${this._webhooksManager.webhookUrl}/:id`);
    this._logger.log("Loading configuration from existing containers");
    this._logger.info("Docker-CI started");
    this.loadContainerConf();
  }

  /**
   * Load configuration from the existing containers
   * with the labels docker-ci.enabled=true
   */
  public async loadContainerConf() {
    const containers = await this._dockerManager.getAllContainersEnabled();
    this._logger.log(Object.values(containers).length, "containers with webhooks detected");
    for (const containerId in containers) {
      this._logger.info("Adding route for container named", containers[containerId]);
      this._addContainerConf(containers[containerId], containerId);
    }
  }

  /**
   * Called when a container is recreated/created
   * If docker-ci.enable is true :
   * Add a route to the webhooks with the id of the container or the given name "docker-ci.name"
   */
  private async _onCreateContainer(res: DockerEventsModel.EventResponse) {
    const containerName = res.Actor.Attributes.name;
    this._logger.log("Container creation detected :", containerName);

    try {
      const containerInfos = await this._dockerManager.getContainer(res.Actor.ID).inspect();
      const labels: DockerCiLabels = containerInfos.Config.Labels;
      const routeId = labels["docker-ci.name"] || containerName.replace("/", "");
      if (labels["docker-ci.enable"] === "true" && labels["docker-ci.repo-url"]) {
        this._logger.log("Docker-ci enabled, adding container to webhook conf");
        this._addContainerConf(routeId, containerInfos.Id);
      }
      else
        this._logger.log("Docker-ci not enabled, skipping...");
      
    } catch (e) {
      this._logger.error("Error with getting informations of container :", e);
    }
  }

  /**
   * Remove the route from webhooks
   */
  private async _onRemovedContainer(res: DockerEventsModel.EventResponse) {
    this._logger.log("Container deletion detected :", res.Actor.Attributes.name);
    this._webhooksManager.removeRoute(res.Actor.ID);
  }

  /**
   * Add the route to webhooks
   */
  private async _addContainerConf(name: string, id: string) {
    const labels: DockerCiLabels = (await this._dockerManager.getContainer(id).inspect()).Config.Labels;
    this._webhooksManager.addRoute(name, id, () => this._onUrlTriggered(id), labels['docker-ci.webhook-secret'], labels['docker-ci.webhook-callback']);
    this._logger.info(`New webhook available at : ${this._webhooksManager.webhookUrl}/${name}`);
  }

  /**
   * Triggered when someone call the url 
   * -Pull an image
   * -Recreate the container
   * -Prune images
   * @param id the id/name of the container to reload
   */
  private async _onUrlTriggered(id: string) {
    let containerInfos: ContainerInspectInfo;
    const previousImageLength = await this._dockerManager.getImageLength();
    try {
      containerInfos = await this._dockerManager.getContainer(id).inspect();
      if (!await this._dockerManager.pullImage(containerInfos.Image, containerInfos.Config.Labels))
        throw "Error Pulling Image";
      if (previousImageLength < await this._dockerManager.getImageLength())
        await this._dockerManager.recreateContainer(id, containerInfos.Image);
      else
        this._logger.info("Image already updated, no container restart needed");
    } catch (e) {
      this._sendErrorMail(containerInfos, e?.stack ?? e);
    }

    try {
      this._dockerManager.pruneImages();
    } catch (e) {
      this._logger.error("Error removing unused images", e);
    }
  }

  private async _sendErrorMail(infos: ContainerInspectInfo, error: string) {
    try {
      const labels: DockerCiLabels = infos?.Config?.Labels;
      if (labels['docker-ci.email']?.includes("@"))
        this._mailer.sendErrorMail(infos?.Name, labels?.["docker-ci.email"], error);
      else
        this._mailer.sendErrorMail(infos?.Name, null, error);
    } catch (e) {
      this._logger.error(e);
    }
  }
}

dotenv.config();
new App().init();