import { describe, expect, it, vi } from 'vitest';
import { SignalController } from '../src/signal-controller.js';

describe('SignalController', () => {
	it('should create a SignalController instance with default values', () => {
		const signalController = new SignalController();

		expect(signalController).toBeInstanceOf(SignalController);
		expect(signalController.signal).toBeInstanceOf(AbortSignal);
	});

	it('should throw a RangeError if the timeout is negative', () => {
		expect(() => new SignalController({ timeout: -1 })).toThrow(RangeError);
	});

	it('should create a SignalController instance with a custom signal and timeout', () => {
		const signal = new AbortController().signal;
		const timeout = 5000;

		const signalController = new SignalController({ signal, timeout });

		expect(signalController).toBeInstanceOf(SignalController);
		expect(signalController.signal).toBeInstanceOf(AbortSignal);
	});

	it('should add an event listener for the "abort" event', () => {
		const signalController = new SignalController();
		const eventListener = vi.fn();

		signalController.onAbort(eventListener);

		expect(eventListener).toHaveBeenCalledTimes(0);

		signalController.abort();

		expect(eventListener).toHaveBeenCalledTimes(1);
	});

	// The synthetic `timeout` event cannot be observed here: Vitest replaces the global Event,
	// CustomEvent and DOMException with userland classes that Node's native AbortSignal rejects.
	// Verified working against the built package in a plain Node process.
	it('should abort with a TimeoutError reason when the timeout elapses', async () => {
		const signalController = new SignalController({ timeout: 50 });
		const abortListener = vi.fn();

		signalController.onAbort(abortListener);

		expect(abortListener).toHaveBeenCalledTimes(0);

		await vi.waitFor(() => expect(abortListener).toHaveBeenCalledTimes(1));

		expect(signalController.signal.aborted).toBe(true);
		expect((signalController.signal.reason as Error).name).toBe('TimeoutError');
	});

	it('should abort the signal', () => {
		const signalController = new SignalController();
		const eventListener = vi.fn();

		signalController.onAbort(eventListener);

		expect(eventListener).toHaveBeenCalledTimes(0);

		signalController.abort();

		expect(eventListener).toHaveBeenCalledTimes(1);
	});

	it('should remove all event listeners from the signal', () => {
		const signalController = new SignalController();
		const eventListener = vi.fn();

		signalController.onAbort(eventListener);

		expect(eventListener).toHaveBeenCalledTimes(0);

		signalController.destroy();

		signalController.abort();

		expect(eventListener).toHaveBeenCalledTimes(0);
	});

	it('should output the value of the toStringTag property as "[object SignalController]"', () => {
		const signalController = new SignalController();

		expect(Object.prototype.toString.call(signalController)).toBe('[object SignalController]');
	});

	it('should not dispatch timeout event after manual abort', async () => {
		const signalController = new SignalController({ timeout: 150 });
		const timeoutListener = vi.fn();
		const abortListener = vi.fn();

		signalController.onTimeout(timeoutListener);
		signalController.onAbort(abortListener);

		// Manually abort before the timeout fires
		signalController.abort();

		// Wait long enough for the timeout to have fired if it were going to
		await new Promise(resolve => setTimeout(resolve, 300));

		expect(abortListener).toHaveBeenCalledTimes(1);
		expect(timeoutListener).toHaveBeenCalledTimes(0);
	}, 5000);

	describe('external signals', () => {
		it('should abort when an external signal aborts and no timeout is configured', () => {
			const externalController = new AbortController();
			const signalController = new SignalController({ signal: externalController.signal });
			const abortListener = vi.fn();

			signalController.onAbort(abortListener);
			externalController.abort();

			expect(abortListener).toHaveBeenCalledTimes(1);
			expect(signalController.signal.aborted).toBe(true);
		});

		it('should treat an infinite timeout as no timeout', () => {
			const externalController = new AbortController();
			const signalController = new SignalController({ signal: externalController.signal, timeout: Infinity });
			const timeoutListener = vi.fn();

			signalController.onTimeout(timeoutListener);
			externalController.abort();

			expect(signalController.signal.aborted).toBe(true);
			expect(timeoutListener).toHaveBeenCalledTimes(0);
		});

		it('should not dispatch a timeout event when an external signal aborts before the timeout', async () => {
			const externalController = new AbortController();
			const signalController = new SignalController({ signal: externalController.signal, timeout: 5000 });
			const timeoutListener = vi.fn();
			const abortListener = vi.fn();

			signalController.onTimeout(timeoutListener);
			signalController.onAbort(abortListener);

			externalController.abort(new Error('caller changed their mind'));

			await vi.waitFor(() => expect(abortListener).toHaveBeenCalledTimes(1));

			expect(timeoutListener).toHaveBeenCalledTimes(0);
			expect((signalController.signal.reason as Error).message).toBe('caller changed their mind');
		});

		it('should still allow destroy to remove listeners on a composite signal', () => {
			const externalController = new AbortController();
			const signalController = new SignalController({ signal: externalController.signal });
			const abortListener = vi.fn();

			signalController.onAbort(abortListener).destroy();
			externalController.abort();

			expect(abortListener).toHaveBeenCalledTimes(0);
		});
	});
});