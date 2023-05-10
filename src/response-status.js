/**
 * A class that holds a status code and a status text
 *
 * @module ResponseStatus
 * @author D1g1talEntr0py <jason.dimeo@gmail.com>
 */
export default class ResponseStatus {
	/** @type {number} */
	#code;
	/** @type {string} */
	#text;

	/**
	 *
	 * @param {number} code The status code from the {@link Response}
	 * @param {string} text The status text from the {@link Response}
	 */
	constructor(code, text) {
		this.#code = code;
		this.#text = text;
	}

	/**
	 * Returns the status code from the {@link Response}
	 *
	 * @returns {number} The status code.
	 */
	get code() {
		return this.#code;
	}

	/**
	 * Returns the status text from the {@link Response}.
	 *
	 * @returns {string} The status text.
	 */
	get text() {
		return this.#text;
	}

	/**
	 * A String value that is used in the creation of the default string
	 * description of an object. Called by the built-in method {@link Object.prototype.toString}.
	 *
	 * @override
	 * @returns {string} The default string description of this object.
	 */
	get [Symbol.toStringTag]() {
		return 'ResponseStatus';
	}

	/**
	 * tostring method for the class.
	 *
	 * @override
	 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/toString|Object.prototype.toString}
	 * @returns {string} The status code and status text.
	 */
	toString() {
		return `${this.#code} ${this.#text}`;
	}
}