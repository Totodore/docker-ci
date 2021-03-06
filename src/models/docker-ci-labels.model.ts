export interface DockerCiLabels {
  "docker-ci.enable"?: string;
  "docker-ci.name"?: string;
  "docker-ci.repo-url"?: string;
  
  "docker-ci.email"?: string;
  "docker-ci.email.notify"?: boolean;

  "docker-ci.password"?: string;
  "docker-ci.username"?: string;
  "docker-ci.auth-server"?: string;

  "docker-ci.webhook-secret"?: string;
  "docker-ci.webhook-callback"?: string;
}