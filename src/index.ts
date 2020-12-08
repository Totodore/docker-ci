import { WebhooksManager } from './webhooks';
import { DockerManager } from './docker';
import { DockerCiLabels } from './models/docker-ci-labels.model';
import { DockerEventsModel } from './models/docker-events.model';
import { Logger } from './utils/logger';

class App {

  private readonly _logger = new Logger(this);
  private _dockerManager = new DockerManager();
  private _webhooksManager = new WebhooksManager();

  public async init() {
    this._logger.log("Connecting to docker endpoint");
    await this._dockerManager.init();
    await this._webhooksManager.init();

    this._dockerManager.addContainerEventListener("start", (res) => this._onCreateContainer(res));

    this._logger.log("Connected to docker endpoint.");
    this._logger.log("Watching container creation.");
    this._logger.log(`Listening webhooks on ${this._webhooksManager.webhookUrl}/:id`);
    this._logger.log("Loading configuration from existing containers");
    this.loadContainerConf();
  }

  public async loadContainerConf() {
    const containers = await this._dockerManager.getAllContainersEnabled();
    this._logger.log(Object.values(containers).length, "containers with webhooks detected");
    for (const containerId in containers) {
      this._logger.log("Adding route for container named", containers[containerId]);
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
      const routeId = labels["docker-ci.name"] || containerName;
      if (labels["docker-ci.enable"]) {
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
   * Add the route to wenhooks
   * @param routeId 
   * @param id 
   */
  private async _addContainerConf(routeId: string, id: string) {
    this._logger.log(`New webhook available at : ${this._webhooksManager.webhookUrl}/${routeId}`);
    this._webhooksManager.addRoute(routeId, () => this._onUrlTriggered(id));
  }

  /**
   * Triggered when someone call the url 
   * @param id the id/name of the container to reload
   */
  private async _onUrlTriggered(id: string) {
    try {
      const containerInfos = await this._dockerManager.getContainer(id).inspect();
      if (!await this._dockerManager.pullImage(containerInfos.Image))
        throw "Error Pulling Image";
      await this._dockerManager.recreateContainer(id);
    } catch (e) {
      this._logger.error("Error Pulling Image and Recreating Container", e);
    }
  }

}

new App().init();