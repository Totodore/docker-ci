export namespace WebhooksModel {
  export interface Routes {
    name: string,
    handler: () => void,
    id: string,
    secret?: string;
    callbackUrl?: string;
  }
}