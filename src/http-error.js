/** @typedef {import('./transportr.js').ResponseBody} ResponseBody */
/** @typedef {import('./response-status.js').default} ResponseStatus */

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
export default class HttpError extends Error {
	/** @type {ResponseBody} */
	#entity;
	/** @type {ResponseStatus} */
	#responseStatus;

	/**
	 * @param {string} [message] The error message.
	 * @param {HttpErrorOptions} [httpErrorOptions] The http error options.
	 * @param {any} [httpErrorOptions.cause] The cause of the error.
	 * @param {ResponseStatus} [httpErrorOptions.status] The response status.
	 * @param {ResponseBody} [httpErrorOptions.entity] The error entity from the server, if any.
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

	get name() {
		return 'HttpError';
	}

	/**
	 * A String value that is used in the creation of the default string
	 * description of an object. Called by the built-in method {@link Object.prototype.toString}.
	 *
	 * @returns {string} The default string description of this object.
	 */
	get [Symbol.toStringTag]() {
		return 'HttpError';
	}
}