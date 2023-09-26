import { SignalEvents, abortEvent } from './constants.js';

/**
 * @typedef {function(Event):void} EventListener
 * @param {Event} event The event object
 */

export default class AbortSignal extends EventTarget {
	/** @type {AbortController} */
	#abortController;
	/** @type {number} */
	#timeoutId;

	/**
	 * @param {AbortSignal} signal The signal to listen to
	 */
	constructor(signal) {
		super();
		this.#abortController = new AbortController();
		signal?.addEventListener(SignalEvents.ABORT, (event) => this.#abort(event));
	}

	/**
	 * The aborted property is a Boolean that indicates whether the request has been aborted (true) or not (false).
	 *
	 * @returns {boolean} Whether the signal was aborted or not
	 */
	get aborted() {
		return this.#abortController.signal.aborted;
	}

	/**
	 * The reason property returns a DOMException object indicating the reason the operation was aborted, or null if the operation is not aborted.
	 *
	 * @returns {DOMException} The reason the signal was aborted
	 */
	get reason() {
		return this.#abortController.signal.reason;
	}

	/**
	 * Returns an AbortSignal instance that will be aborted when the provided amount of milliseconds have passed.
	 * A value of {@link Infinity} means there is no timeout.
	 * Note: You can't set this property to a value less than 0.
	 *
	 * @param {number} timeout The timeout in milliseconds
	 * @returns {AbortSignal} The abort signal
	 */
	timeout(timeout) {
		if (timeout < 0) {
			throw new RangeError('The timeout cannot be negative');
		}

		if (timeout != Infinity) {
			this.#timeoutId ??= setTimeout(() => this.#abort(new CustomEvent(SignalEvents.TIMEOUT, { detail: { timeout, cause: new DOMException(`The request timed-out after ${timeout / 1000} seconds`, 'TimeoutError') } }), true), timeout);
		}

		return this.#abortController.signal;
	}

	/**
	 * Clears the timeout.
	 * Note: This does not abort the signal, dispatch the timeout event, or reset the timeout.
	 *
	 * @returns {void}
	 */
	clearTimeout() {
		clearTimeout(this.#timeoutId);
	}

	/**
	 * Adds an event listener for the 'abort' event.
	 *
	 * @param {EventListener} listener The listener to add
	 * @returns {AbortSignal} The AbortSignal
	 */
	onAbort(listener) {
		this.#abortController.signal.addEventListener(SignalEvents.ABORT, listener);

		return this;
	}

	/**
	 * Adds an event listener for the 'timeout' event.
	 *
	 * @param {EventListener} listener The listener to add
	 * @returns {AbortSignal} The AbortSignal
	 */
	onTimeout(listener) {
		this.#abortController.signal.addEventListener(SignalEvents.TIMEOUT, listener);

		return this;
	}

	/**
	 * Aborts the signal. This is so naughty. ¯\_(ツ)_/¯
	 *
	 * @param {Event} event The event to abort with
	 * @returns {void}
	 */
	abort(event) {
		this.#abort(event);
	}

	/**
	 * Aborts the signal.
	 *
	 * @private
	 * @param {Event} event The event to abort with
	 * @param {boolean} [dispatchEvent = false] Whether to dispatch the event or not
	 * @returns {void}
	 * @fires SignalEvents.ABORT When the signal is aborted
	 * @fires SignalEvents.TIMEOUT When the signal times out
	 */
	#abort(event = abortEvent, dispatchEvent = false) {
		clearTimeout(this.#timeoutId);
		this.#abortController.abort(event.detail?.cause);
		if (dispatchEvent) {
			this.#abortController.signal.dispatchEvent(event);
		}
	}
}