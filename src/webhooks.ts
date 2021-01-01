import { Logger } from './utils/logger';
import * as express from "express";
export class WebhooksManager {
  public readonly deployPath = "/deploy";
  private readonly _logger = new Logger(this);

  private readonly _app: express.Application = express();
  private readonly _router: express.Router = express.Router();
  private readonly _routes: { name: string, handler: () => void, id: string }[] = [];

  public async init() {
    this._app.use(this._router);

    this._router.all(`${this.deployPath}/:id`, (req, res) => this._webhookTriggered(req.params.id, res));
    
    return new Promise<void>((resolve) => this._app.listen(process.env.PORT ?? 3000, () => resolve())).catch(e => {
      this._logger.error(e);
      this._logger.error("Error detected, stopping application...");
      process.exit(1);
    });
  }

  /**
   * Add a route to the list of routes
   */
  public addRoute(name: string, id: string, handler: () => void) {
    this._routes.push({
      handler,
      name,
      id
    });
  }

  public removeRoute(id: string) {
    const index = this._routes.findIndex(el => el.id == id);
    this._routes.splice(index, 1);
  }

  /**
   * Check if the hash given in argument is the good one
   * Check if the id in param exists, otherwise return a bad request 400
   * @param id 
   * @param res 
   */
  private _webhookTriggered(name: string, res: express.Response) {
    const routeData = this._routes.find(el => el.name === name);
    if (!routeData) {
      this._logger.info("Webhook triggered with invalid name");
      res.status(400).send("Bad request : invalid name");
      return;
    }
    routeData.handler();
    res.status(200).send(`Webhook ${routeData.name} triggered...`);
    this._logger.info(`${this.webhookUrl}/${routeData.name} triggered`);
  }

  public get webhookUrl() { return `http://0.0.0.0:${process.env.PORT ?? 3000}${this.deployPath}`; };

}