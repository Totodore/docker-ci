import { Logger } from './utils/logger';
import * as express from "express";

export class WebhooksManager {
  public readonly routePath = "/deploy";
  private readonly _logger = new Logger(this);

  private _app: express.Application = express();
  private _router: express.Router = express.Router();
  private readonly _routes: { [id: string]: () => void } = {};

  public async init() {
    this._app.use(this._router);

    this._router.get(`${this.routePath}/:id`, (req: express.Request, res: express.Response) => this._webhookTriggered(req.params.id, res));

    return new Promise<void>((resolve) => this._app.listen(process.env.PORT ?? 3000, () => resolve())).catch(e => {
      this._logger.error(e);
      this._logger.log("Error detected, stopping application...");
      process.exit(1);
    });
  }

  /**
   * Add a route to the list of routes
   * @param id 
   * @param handler 
   */
  public addRoute(id: string, handler: () => void) {
    this._routes[id] = handler;
  }

  /**
   * Check if the id in param exists, otherwise return a bad request 400
   * @param id 
   * @param res 
   */
  private _webhookTriggered(id: string, res: express.Response) {
    if (this._routes[id]) {
      this._routes[id]();
      res.send(`Webhook ${id} triggered...`);
      this._logger.log(`${this.webhookUrl}/${id} triggered`);
    }
    else {
      this._logger.log(`Unknown id route triggered : ${id}`);
      res.status(400).send(`Unknown '${id}' webhook triggered...`);
    }
  }
  
  public get webhookUrl() { return `http(s)://0.0.0.0:${process.env.PORT ?? 3000}${this.routePath}`; };

}