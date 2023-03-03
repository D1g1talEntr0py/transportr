/** @typedef {import('./transportr.js').ResponseBody} ResponseBody */
/** @typedef {import('./transportr.js').ResponseStatus} ResponseStatus */

/**
 * @typedef {Object} HttpErrorOptions
 * @property {any} cause The cause of the error.
 * @property {ResponseStatus} status The response status.
 * @property {ResponseBody} entity The error entity from the server, if any.
 */

/**
 * @module HttpError
 * @extends Error
 * @author D1g1talEntr0py
 */
class HttpError extends Error {
	/** @type {ResponseBody} */
	#entity;
	/** @type {ResponseStatus} */
	#responseStatus;

	/**
	 * @param {string} [message] The error message.
	 * @param {HttpErrorOptions} [options] The error options.
	 * @param {Error} [options.cause] The cause of the error.
	 * @param {ResponseStatus} [options.status] The response status.
	 * @param {ResponseBody} [options.entity] The error entity from the server, if any.
	 */
	constructor(message, { cause, status, entity }) {
		super(message, { cause });
		this.#entity = entity;
		this.#responseStatus = status;
	}

	/**
	 * It returns the value of the private variable #entity.
	 *
	 * @returns {ResponseBody} The entity property of the class.
	 */
	get entity() {
		return this.#entity;
	}

	/**
	 * It returns the status code of the {@link Response}.
	 *
	 * @returns {number} The status code of the {@link Response}.
	 */
	get statusCode() {
		return this.#responseStatus?.code;
	}

	/**
	 * It returns the status text of the {@link Response}.
	 *
	 * @returns {string} The status code and status text of the {@link Response}.
	 */
	get statusText() {
		return this.#responseStatus?.text;
	}
}

export default HttpError;