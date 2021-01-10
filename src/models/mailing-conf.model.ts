export interface MailingConf {
  mailing: boolean; //Enable the mailing system
  mail_host: string; //the host of the mail server, can be an IP or a domain name
  mail_port: number; //The port of the mail server
  mail_password: string; //The password for the mail server
  mail_addr: string; //The sender mail address
  mail_oauth: boolean; //If the server use a basic auth system or an oauth system
  client_id: string; //The client id for the oauth system
  private_key: string; //The private key for the oauth system
  mail_admin: string; //The admin mail where error alerts will be sent
}
