import { Logger } from './utils/logger';
import * as express from "express";

export class WebhooksManager {
  private readonly _routePath = "/deploy";
  private readonly _logger = new Logger(this);

  private _app: express.Application = express();
  private _router: express.Router = express.Router();
  private readonly _routes: { [id: string]: () => void } = {};

  public async init() {
    this._app.use(this._router);
    this._router.get(`${this._routePath}/:id`, (req, res) => this._webhookTriggered(req.params.id));
  }

  public addRoute(id: string, handler: () => void) {
    this._routes[id] = handler;
  }

  private _webhookTriggered(id: string) {
    if (this._routes[id])
      this._routes[id]();
    else
      this._logger.log(`Unknown id route triggered : ${id}`);
  } 
}