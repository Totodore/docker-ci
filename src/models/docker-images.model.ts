export namespace DockerImagesModel {
  export interface PullImageParameters {
    fromImage?: string;
    fromSrc?: string;
    repo?: string;
    tag?: string;
    platform?: string;
    "X-Registry-Auth"?: string;
  }

  export interface PullImageAuth {
    username: string;
    password: string;
    serveraddress: string;
  }
}