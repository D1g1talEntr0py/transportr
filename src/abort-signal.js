import { SignalEvents, abortEvent } from './constants.js';

const NativeAbortSignal = globalThis.AbortSignal;

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
	 * Returns an {@link AbortSignal} instance that is already set as aborted.
	 *
	 * @static
	 * @returns {AbortSignal} The abort signal
	 */
	static abort() {
		return NativeAbortSignal.abort();
	}

	/**
	 * Returns an AbortSignal instance that will automatically abort after a specified time.
	 *
	 * @static
	 * @param {number} time The time in milliseconds to wait before aborting
	 * @returns {AbortSignal} The abort signal
	 */
	static timeout(time) {
		return NativeAbortSignal.timeout(time);
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
	 * throws the signal's abort reason if the signal has been aborted; otherwise it does nothing.
	 *
	 * @returns {void}
	 */
	throwIfAborted() {
		this.#abortController.signal.throwIfAborted();
	}

	/**
	 * Returns an AbortSignal instance that will be aborted when the provided amount of milliseconds have passed.
	 * A value of -1 (which is the default) means there is no timeout.
	 * Note: You can't set this property to a value less than 0.
	 *
	 * @param {number} timeout The timeout in milliseconds
	 * @returns {AbortSignal} The abort signal
	 */
	withTimeout(timeout) {
		if (timeout < 0) {
			throw new RangeError('The timeout cannot be negative');
		}

		this.#timeoutId ??= setTimeout(() => this.#abort(AbortSignal.#generateTimeoutEvent(timeout), true), timeout);

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
	 * Adds an event listener for the specified event type.
	 *
	 * @override
	 * @param {string} eventName The name of the event to listen to
	 * @param {EventListener} listener The listener to add
	 * @returns {void}
	 */
	addEventListener(eventName, listener) {
		this.#abortController.signal.addEventListener(eventName, listener);
	}

	/**
	 * Dispatches an event to this EventTarget.
	 *
	 * @override
	 * @param {Event} event The event to dispatch
	 * @returns {boolean} Whether the event was dispatched or not
	 */
	dispatchEvent(event) {
		return this.#abortController.signal.dispatchEvent(event);
	}

	/**
	 * Removes an event listener for the specified event type.
	 *
	 * @override
	 * @param {string} eventName The name of the event to listen to
	 * @param {EventListener} listener The listener to remove
	 * @returns {void}
	 */
	removeEventListener(eventName, listener) {
		this.#abortController.signal.removeEventListener(eventName, listener);
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

	/**
	 * Generates a timeout event.
	 *
	 * @private
	 * @static
	 * @param {number} timeout The timeout in milliseconds
	 * @returns {CustomEvent} The timeout event
	 */
	static #generateTimeoutEvent(timeout) {
		return new CustomEvent(SignalEvents.TIMEOUT, { detail: { timeout, cause: new DOMException(`The request timed-out after ${timeout / 1000} seconds`, 'TimeoutError') } });
	}
}