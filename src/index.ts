import { Logger } from './utils/logger';
import * as Docker from "dockerode";

class App {

  private _docker: Docker;
  private _logger = new Logger(this);

  public async init() {
    this._connect();
    console.log(await this._docker.getEvents());
  }

  private _connect() {
    try {
      this._docker = new Docker({ socketPath: "/var/run/docker.sock" })
    } catch (e) {
      this._logger.error("Error connecting to Docker", e);
      process.exit(1);
    }
  }
}

new App().init();