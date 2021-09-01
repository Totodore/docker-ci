import { Logger } from './logger';
import { createTransport } from "nodemailer";
import { MailingConf } from '../models/mailing-conf.model';

class MailerManager {

  private readonly mailConf?: MailingConf;

  private readonly _transporter = createTransport({
    host: this.mailConf?.mail_host,
    port: this.mailConf?.mail_port,
    secure: true,
    auth: this.mailConf?.mail_oauth ? {
      type: "OAuth2",
      user: this.mailConf?.mail_addr,
      serviceClient: this.mailConf?.client_id,
      privateKey: this.mailConf?.private_key,
    } : {
      user: this.mailConf?.mail_addr,
      pass: this.mailConf?.mail_password
    },
  });
  
  private _healthy: boolean = false;
  private readonly _logger = new Logger(this);
  
  constructor() {
    try {
      this.mailConf = require("../../conf/mail");
    } catch (e) {
      this._logger.log("Mail conf disabled");
    };
  }

  public async init(): Promise<MailerManager> {
    try {
      if (!this.mailConf?.mailing) {
        this._logger.log("Mail Server disabled");
        return;
      }
			this._logger.log("Checking mail server configuration...");
      await this._transporter.verify();
      this._healthy = true;
		} catch(e) {
			this._logger.error("Mail error during verification", e);
    }
    return this;
  }
  
  public async sendErrorMail(container: string, mailDest?: string, ...error: any[]) {
    if (!this._healthy) {
      this._logger.log("No email sent, email system disabled from conf");
      return;
    }
    else 
      this._logger.log("Sending error email to :", mailDest, this.mailConf.mail_admin);
    try {
      await this._transporter.sendMail({
        from: this.mailConf.mail_addr,
        to: this.mailConf.mail_admin,
        subject: `Erreur lors du déploiement de : ${container?.substr(1)}`,
        html: `
          <h1 style='text-align: center'>Logs : </h1>
          <p>${error.join(" ")}</p>
        `
      });
      if (mailDest)
        await this._transporter.sendMail({
          from: this.mailConf.mail_addr,
          to: mailDest,
          subject: `Erreur lors du déploiement de : ${container?.substr(1)}`,
          html: "Les administrateurs de ce serveur ont été notifiés",
        });
    } catch (e) {
      this._logger.error("Error sending error mail", e)
    }
  }

  public async sendNotifyMail(container: string, mailDest: string) {
    try {
      const date = new Date();
      await this._transporter.sendMail({
        from: this.mailConf.mail_addr,
        to: this.mailConf.mail_admin,
        subject: `Ton projet : ${container.substr(1)} s'est déployé avec succès !`,
        html: `Ton projet : ${container.substr(1)} s'est déployé avec succès à ${date.getHours()}:${date.getMinutes()} le ${date.getDate()}/${date.getMonth()}/${date.getFullYear()} !`
      });
    } catch (e) {
      this._logger.error("Error sending error mail", e)
    }
  }
}

export { MailerManager };