/**
 * A class that holds a status code and a status text
 *
 * @module ResponseStatus
 * @author D1g1talEntr0py
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
}