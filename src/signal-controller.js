/**
 * A controller object that allows you to abort one or more Transportr requests.
 *
 * @module {SignalController} signal-controller
 * @author D1g1talEntr0py <jason.dimeo@gmail.com>
 *
 */
export default class SignalController {
	/** @type {AbortController} */
	#abortController;

	/**
	 * @param {AbortSignal} [signal] The signal to be used to abort the request.
	 */
	constructor(signal) {
		this.#abortController = new AbortController();
		signal?.addEventListener('abort', () => this.#abortController.abort());
	}

	/**
	 * Returns the {@link AbortSignal} object associated with this object.
	 *
	 * @returns {AbortSignal} The {@link AbortSignal} object associated with this object.
	 */
	get signal() {
		return this.#abortController.signal;
	}

	/**
	 * Aborts a DOM request before it has completed.
	 * This is able to abort fetch requests, data sent using the XMLHttpRequest API, and Web Sockets.
	 *
	 * @param {DOMException} [reason] The reason for aborting the request.
	 * @returns {void}
	 */
	abort(reason) {
		this.#abortController.abort(reason);
	}

	/**
	 * A String value that is used in the creation of the default string
	 * description of an object. Called by the built-in method {@link Object.prototype.toString}.
	 *
	 * @override
	 * @returns {string} The default string description of this object.
	 */
	get [Symbol.toStringTag]() {
		return 'SignalController';
	}
}