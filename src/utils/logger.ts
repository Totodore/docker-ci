export class Logger {
  private _name: string;
  constructor(_instantiator: object) {
    this._name = Object.getPrototypeOf(_instantiator).constructor.name;
  }

  log(...params: any[]) {
    if (process.env.VERBOSE === "true")
      console.log(`LOG [${this._name}]`, ...params);
  }

  error(...params: any[]) {
    console.error(`ERR [${this._name}]`, ...params);
  }

  info(...params: any[]) {
    console.info(`INF [${this._name}]`, ...params);
  }
}
