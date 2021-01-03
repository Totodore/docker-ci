import * as express from "express";
export namespace WebhooksModel {
  export interface Routes {
    name: string,
    handler: () => void,
    id: string,
    secret?: string;
    callbackUrl?: string;
  }

  export interface Request extends express.Request {
    rawBody: Buffer;
  }
}