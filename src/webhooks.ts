import { Logger } from './utils/logger';
import * as express from "express";
import { HmacSHA256 } from "crypto-js";
import * as basicAuth from "express-basic-auth";
export class WebhooksManager {
  public readonly deployPath = "/deploy";
  private readonly _logger = new Logger(this);

  private readonly _app: express.Application = express();
  private readonly _router: express.Router = express.Router();
  private readonly _routes: { name: string, handler: () => void, hash: string, id: string }[] = [];
  private readonly _hashedRoutes = process.env.PROTECTED_WEBHOOKS == 'true';
  private readonly _basicAuthConfig: basicAuth.BasicAuthMiddlewareOptions = {
    users: {
      [process.env.API_USER]: process.env.API_PASSWORD
    },
    challenge: true
  }

  public async init() {
    this._app.use(this._router);

    this._router.all(`${this.deployPath}/:id`, (req, res) => this._webhookTriggered(req.params.id, res));
    if (this._hashedRoutes)
      this._router.get(`/api/:name`, basicAuth(this._basicAuthConfig), (req, res) => this._apiGetUrlFromNameTriggered(req.params.name, res));
    
    return new Promise<void>((resolve) => this._app.listen(process.env.PORT ?? 3000, () => resolve())).catch(e => {
      this._logger.error(e);
      this._logger.error("Error detected, stopping application...");
      process.exit(1);
    });
  }

  /**
   * Add a route to the list of routes
   */
  public addRoute(name: string, id: string, handler: () => void): string {
    const hash = this._hashedRoutes ? HmacSHA256(name, process.env.PRIVATE_KEY).toString() : name;
    this._routes.push({
      hash,
      handler,
      name,
      id
    });
    return hash;
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
  private _webhookTriggered(hash: string, res: express.Response) {
    const routeData = this._routes.find(el => this._hashedRoutes ? el.hash === hash : el.name === hash);
    if (!routeData) {
      this._logger.info("Webhook triggered with invalid hash");
      res.status(400).send("Bad request : invalid hash");
      return;
    }
    routeData.handler();
    res.status(200).send(`Webhook ${routeData.name} triggered...`);
    this._logger.info(`${this.webhookUrl}/${routeData.name} triggered`);
  }

  private _apiGetUrlFromNameTriggered(name: string, res: express.Response) {
    const data = this._routes.find(el => el.name == name);
    this._logger.log(name);
    if (data)
      res.json({ name: data.name, url: this.webhookUrl + "/" + data.hash });
    else
      res.sendStatus(400);
  }
  
  public get webhookUrl() { return `http://0.0.0.0:${process.env.PORT ?? 3000}${this.deployPath}`; };

}