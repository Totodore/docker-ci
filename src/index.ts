import { WebhooksManager } from './webhooks';
import Dockerode = require('dockerode');
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

    this._dockerManager.addContainerEventListener("create", (res) => this._onCreateContainer(res));
  }

  private async _onCreateContainer(res: DockerEventsModel.EventResponse) {
    this._logger.log(res.actor.ID);
    try {
      const containerInfos = await this._dockerManager.getContainer(res.actor.ID).inspect();
      const labels: DockerCiLabels = containerInfos.Config.Labels;
      if (labels["docker-ci.enable"])
        this._addContainerConf(containerInfos, labels);
    } catch (e) {
      this._logger.error("Error with getting informations of container :", e);
    }
  }

  private async _addContainerConf(containerInfos: Dockerode.ContainerInspectInfo, label: DockerCiLabels) {
    this._webhooksManager.addRoute(containerInfos.Name,
      () => this._onUrlTriggered(containerInfos.Name, containerInfos.Id, label["docker-ci.url"]));
  }

  private async _onUrlTriggered(name: string, id: string, url: string) {
    await this._dockerManager.pullImage(url);
  }

}

new App().init();