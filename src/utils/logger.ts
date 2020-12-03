export class Logger {
	private _name: string
	constructor(
		_instantiator: object
	) {
		this._name = Object.getPrototypeOf(_instantiator).constructor.name;
	}

	log(...params: any[]) {
		console.log(`[${this._name}]`, ...params);
	}

	error(...params: any[]) {
		console.error(`[${this._name}]`, ...params);
	}
}