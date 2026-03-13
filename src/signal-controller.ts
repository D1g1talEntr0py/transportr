import { SignalErrors, SignalEvents, abortEvent, eventListenerOptions, timeoutEvent } from './constants.js';
import type { AbortConfiguration, AbortEvent, AbortSignalEvent } from '@types';

/** Class representing a controller for abort signals, allowing for aborting requests and handling timeout events */
export class SignalController {
	private readonly abortSignal: AbortSignal;
	private readonly abortController = new AbortController();
	private readonly events = new Map<EventListener, string>();

	/**
	 * Creates a new SignalController instance.
	 * @param options - The options for the SignalController.
	 * @param options.signal - The signal to listen for abort events. Defaults to the internal abort signal.
	 * @param options.timeout - The timeout value in milliseconds. Defaults to Infinity.
	 * @throws {RangeError} If the timeout value is negative.
	 */
	constructor({ signal, timeout = Infinity }: AbortConfiguration = {}) {
		if (timeout < 0) { throw new RangeError('The timeout cannot be negative') }

		const signals = [ this.abortController.signal ];
		if (signal != null) { signals.push(signal) }
		if (timeout !== Infinity) { signals.push(AbortSignal.timeout(timeout)) }

		(this.abortSignal = AbortSignal.any(signals)).addEventListener(SignalEvents.ABORT, this, eventListenerOptions);
	}

	/**
	 * Handles the 'abort' event. If the event is caused by a timeout, the 'timeout' event is dispatched.
	 * Guards against a timeout firing after a manual abort to prevent spurious timeout events.
	 * @param event The event to abort with
	 * @see https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#specifying_this_using_bind
	 */
	handleEvent({ target: { reason } }: AbortSignalEvent): void {
		if (this.abortController.signal.aborted) { return }
		if (reason instanceof DOMException && reason.name === SignalErrors.TIMEOUT) { this.abortSignal.dispatchEvent(timeoutEvent()) }
	}

	/**
	 * Gets the signal. This signal will be able to abort the request, but will not be notified if the request is aborted by the timeout.
	 * @returns The signal
	 */
	get signal(): AbortSignal {
		return this.abortSignal;
	}

	/**
	 * Adds an event listener for the 'abort' event.
	 *
	 * @param eventListener The listener to add
	 * @returns The SignalController
	 */
	onAbort(eventListener: EventListener): SignalController {
		return this.addEventListener(SignalEvents.ABORT, eventListener);
	}

	/**
	 * Adds an event listener for the 'timeout' event.
	 *
	 * @param eventListener The listener to add
	 * @returns The SignalController
	 */
	onTimeout(eventListener: EventListener): SignalController {
		return this.addEventListener(SignalEvents.TIMEOUT, eventListener);
	}

	/**
	 * Aborts the signal.
	 *
	 * @param event The event to abort with
	 */
	abort(event: AbortEvent = abortEvent()): void {
		this.abortController.abort(event.detail?.cause);
	}

	/**
	 * Removes all event listeners from the signal.
	 *
	 * @returns The SignalController
	 */
	destroy(): SignalController {
		this.abortSignal.removeEventListener(SignalEvents.ABORT, this, eventListenerOptions);

		for (const [ eventListener, type ] of this.events) {
			this.abortSignal.removeEventListener(type, eventListener, eventListenerOptions);
		}

		this.events.clear();

		return this;
	}

	/**
	 * Adds an event listener for the specified event type.
	 *
	 * @param type The event type to listen for
	 * @param eventListener The listener to add
	 * @returns The SignalController
	 */
	private addEventListener(type: string, eventListener: EventListener): SignalController {
		this.abortSignal.addEventListener(type, eventListener, eventListenerOptions);
		this.events.set(eventListener, type);

		return this;
	}

	/**
	 * A String value that is used in the creation of the default string
	 * description of an object. Called by the built-in method {@link Object.prototype.toString}.
	 *
	 * @returns The default string description of this object.
	 */
	get [Symbol.toStringTag](): string {
		return 'SignalController';
	}
}