import { Logger } from './utils/logger';
import * as express from "express";
import * as crypto from "crypto";
import fetch from "node-fetch";
import * as bodyParser from "body-parser";
import { isUrl, objectToFormdata } from "./utils/utils";
import * as cors from "cors";
import { WebhooksModel } from './models/webhooks.model';
import { dockerhubCallbackConf } from "./conf/dockerhub-callback-body";
export class WebhooksManager {
  public readonly deployPath = "/deploy";
  private readonly _logger = new Logger(this);

  private readonly _app: express.Application = express();
  private readonly _router: express.Router = express.Router();
  private readonly _routes: WebhooksModel.Routes[] = [];

  public async init() {
    this._app.use(cors({ origin: '*' }));
    this._app.use(bodyParser.json());
    this._app.use(bodyParser.urlencoded({ extended: true }));
    this._app.use(this._router);

    this._router.all(`${this.deployPath}/:id`, (req, res) => this._webhookTriggered(req.params.id, res, req));
    
    return new Promise<void>((resolve) => this._app.listen(process.env.PORT ?? 3000, () => resolve())).catch(e => {
      this._logger.error(e);
      this._logger.error("Error detected, stopping application...");
      process.exit(1);
    });
  }

  /**
   * Add a route to the list of routes
   */
  public addRoute(name: string, id: string, handler: () => void, secret?: string, callbackUrl?: string) {
    this._routes.push({
      handler,
      name,
      id,
      secret,
      callbackUrl
    });
  }

  public removeRoute(id: string) {
    const index = this._routes.findIndex(el => el.id == id);
    this._routes.splice(index, 1);
  }

  /**
   * Check if the id in param exists, otherwise return a bad request 400
   * @param id 
   * @param res 
   */
  private async _webhookTriggered(name: string, res: express.Response, req: express.Request) {
    const routeData = this._routes.find(el => el.name === name);
    if (!routeData) {
      res.status(404).send("Bad request : invalid name");
      return;
    }
    if ((routeData.secret && !this._verifySecret(routeData.secret, req)) || (routeData.callbackUrl && !await this._verifyCallback(req.body["callback_url"]))) {
      this._logger.info("Webhook triggered with invalid request");
      res.sendStatus(401);
      return;
    }

    routeData.handler();
    res.status(200).send(`Webhook ${routeData.name} triggered...`);
    this._logger.info(`${this.webhookUrl}/${routeData.name} triggered`);
  }

  /**
   * Verify that the given secret is valid
   * Verify the Github webhooks
   */
  private _verifySecret(secret: string, req: express.Request): boolean {
    if (!req.body)
      return false;
    const token = req.header("X-Hub-Signature-256")?.split('='); //In case the token starts with SHA256=
    const signature = crypto.createHmac("sha256", secret).update(JSON.stringify(req.body));
    return crypto.timingSafeEqual(Buffer.from(token[token.length - 1]), Buffer.from(signature.digest("hex")));
  }

  /**
   * Verify that the given callback exists
   * Verify the Dockerhub webhooks
   */
  private async _verifyCallback(callback: string): Promise<boolean> {
    if (!isUrl(callback))
      return false;
    const formData = objectToFormdata(dockerhubCallbackConf);
    try {
      const req = await fetch(callback, { method: 'POST', body: formData });
      return req.status < 200 || req.status > 300
    } catch (e) {
      return false;
    }
  }

  public get webhookUrl() { return `http://0.0.0.0:${process.env.PORT ?? 3000}${this.deployPath}`; };

}