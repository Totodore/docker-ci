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
    Type: "container" | "image",
    Action: keyof typeof ContainerEvents | keyof typeof ImageEvents,
    Actor: {
      ID: string;
      Attributes: { [k: string]: string }
    },
    Time: number,
    TimeNano: number
  }

}