import { Logger } from './logger';
import { createTransport } from "nodemailer";
import { MailingConf } from '../models/mailing-conf.model';
const mailConf: MailingConf = require("../../mail");
class MailerManager {

  private readonly _transporter = createTransport({
    host: mailConf?.mail_host,
    port: mailConf?.mail_port,
    secure: true,
    auth: mailConf?.mail_oauth ? {
      type: "OAuth2",
      user: mailConf?.mail_addr,
      serviceClient: mailConf?.client_id,
      privateKey: mailConf?.private_key,
    } : {
      user: mailConf?.mail_addr,
      pass: mailConf?.mail_password
    },
  });
  
  private _healthy: boolean = false;
  private readonly _logger = new Logger(this);
  
  public async init(): Promise<MailerManager> {
    try {
      if (!mailConf?.mailing) {
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
  
  public async sendErrorMail(container: string, mailDest: string, ...error: any[]) {
    if (!this._healthy)
      this._logger.log("No email sent, email system disabled from conf");
    else 
      this._logger.log("Sending error email to :", mailDest, mailConf.mail_admin);
    
    await this._transporter.sendMail({
      from: mailConf.mail_addr,
      to: mailConf.mail_admin,
      subject: `Erreur lors du déploiement de : ${container.substr(1)}`,
      html: `
        <h1 style='text-align: center'>Logs : </h1>
        <p>${error.join(" ")}</p>
      `
    }).catch(e => this._logger.info("Error sending error mail"));

    if (mailDest) {
      await this._transporter.sendMail({
        from: mailConf.mail_addr,
        to: mailDest,
        subject: `Erreur lors du déploiement de : ${container.substr(1)}`,
        html: "Les administrateurs de ce serveur ont été notifiés",
      }).catch(e => this._logger.info("Error sending error mail"));
    }
  }
}

export { MailerManager };