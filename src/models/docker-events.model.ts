import { Image } from "dockerode";

export namespace DockerEventsModel {
  export enum ContainerEvents {
    "attach",
    "commit",
    "copy",
    "create",
    "destroy",
    "detach",
    "die",
    "exec_create",
    "exec_detach",
    "exec_die",
    "exec_start",
    "export",
    "health_status",
    "kill",
    "oom",
    "pause",
    "rename",
    "resize",
    "restart",
    "start",
    "stop",
    "top",
    "unpause",
    "update",
  };
  export enum ImageEvents {
    "delete",
    "import",
    "load",
    "pull",
    "push",
    "save",
    "tag",
    "untag",
  }

  export interface EventResponse {
    type: "container" | "image",
    action: ContainerEvents | ImageEvents,
    actor: {
      ID: string;
      Attributes: { [k: string]: string }
    },
    time: number,
    timeNano: number
  }

}