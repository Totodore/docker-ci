import { Logger } from './logger';
import { createTransport } from "nodemailer";

class MailerManager {

  private readonly _transporter = createTransport({
    host: process.env.MAIL_HOST,
		auth: {
      user: process.env.MAIL_ADDR,
			pass: process.env.MAIL_PWD,
    },
  });

  private readonly _logger = new Logger(this);
  
  public async init(): Promise<MailerManager> {
		try {
			this._logger.log("Checking mail server configuration...");
      await this._transporter.verify();
		} catch(e) {
			this._logger.error("Mail error during verification", e);
    }
    return this;
  }
  
  public async sendErrorMail(container: string, mailDest: string, ...error: any[]) {
    this._logger.log("Envoi des emails d'erreur à :", mailDest, process.env.MAIL_DEST);
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