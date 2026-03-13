/**
 * A class that holds a status code and a status text, typically from a {@link Response}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Response/status|Response.status
 * @author D1g1talEntr0py <jason.dimeo@gmail.com>
 */
export class ResponseStatus {
	private readonly _code: number;
	private readonly _text: string;

	/**
	 *
	 * @param code The status code from the {@link Response}
	 * @param text The status text from the {@link Response}
	 */
	constructor(code: number, text: string) {
		this._code = code;
		this._text = text;
	}

	/**
	 * Returns the status code from the {@link Response}
	 *
	 * @returns The status code.
	 */
	get code(): number {
		return this._code;
	}

	/**
	 * Returns the status text from the {@link Response}.
	 *
	 * @returns The status text.
	 */
	get text(): string {
		return this._text;
	}

	/**
	 * A String value that is used in the creation of the default string
	 * description of an object. Called by the built-in method {@link Object.prototype.toString}.
	 *
	 * @returns The default string description of this object.
	 */
	get [Symbol.toStringTag](): string {
		return 'ResponseStatus';
	}

	/**
	 * tostring method for the class.
	 *
	 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/toString|Object.prototype.toString}
	 * @returns The status code and status text.
	 */
	toString(): string {
		return `${this._code} ${this._text}`;
	}
}