import { Logger } from './logger';
import { createTransport, TransportOptions } from "nodemailer";

class MailerManager {

  private readonly _transporter = createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    secure: true,
    auth: process.env.MAIL_OAUTH ? {
      type: "OAuth2",
      user: process.env.MAIL_ADDR,
      serviceClient: process.env.MAIL_ID,
      privateKey: process.env.MAIL_PWD,
    } : {
      user: process.env.MAIL_ADDR,
      pass: process.env.MAIL_PWD
    },
  } as TransportOptions);
  
  private _healthy: boolean = false;
  private readonly _logger = new Logger(this);
  
  public async init(): Promise<MailerManager> {
		try {
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
      this._logger.log("Sending error email to :", mailDest, process.env.MAIL_DEST);
    await this._transporter.sendMail({
      from: process.env.MAIL_ADDR,
      to: process.env.MAIL_DEST,
      subject: `Erreur lors du déploiement de : ${container.substr(1)}`,
      html: `
        <h1 style='text-align: center'>Logs : </h1>
        <p>${error.join(" ")}</p>
      `
    }).catch(e => this._logger.info("Error sending error mail"));
    if (mailDest) {
      await this._transporter.sendMail({
        from: process.env.MAIL_ADDR,
        to: mailDest,
        subject: `Erreur lors du déploiement de : ${container.substr(1)}`,
        html: "Les administrateurs de ce serveur ont été notifiés",
      }).catch(e => this._logger.info("Error sending error mail"));
    }
  }
}

export { MailerManager };