import { describe, expect, it, jest } from '@jest/globals';
import AbortSignal from '../src/abort-signal';

describe('AbortSignal', () => {
	let signal;

	beforeEach(() => {
		signal = new AbortSignal();
	});

	afterEach(() => {
		signal.clearTimeout();
	});

	describe('constructor', () => {
		it('should return an AbortSignal object', () => {
			expect(signal).toBeInstanceOf(AbortSignal);
		});

		it('should return an AbortSignal object when passed an AbortSignal object', () => {
			const signal2 = new AbortSignal(signal);
			expect(signal2).toBeInstanceOf(AbortSignal);
		});
	});

	describe('aborted', () => {
		it('should return false when the signal is not aborted', () => {
			expect(signal.aborted).toBe(false);
		});

		it('should return true when the signal is aborted', () => {
			signal.abort();
			expect(signal.aborted).toBe(true);
		});
	});

	describe('reason', () => {
		it('should return undefined when the signal is not aborted', () => {
			expect(signal.reason).toBe(undefined);
		});

		it('should return a DOMException object when the signal is aborted', () => {
			signal.abort();
			expect(signal.reason).toBeInstanceOf(DOMException);
		});
	});

	describe('timeout', () => {
		it('should return the abort signal', () => {
			expect(signal.timeout(1000)).toBeInstanceOf(globalThis.AbortSignal);
		});

		it('should abort the signal after the specified timeout', async () => {
			const timeout = 1000;
			const start = Date.now();
			signal.timeout(timeout);

			await new Promise(resolve => setTimeout(resolve, timeout + 100));

			expect(signal.aborted).toBe(true);
			expect(signal.reason).toEqual(expect.any(DOMException));
			expect(signal.reason.name).toBe('TimeoutError');
			expect(Date.now() - start).toBeGreaterThanOrEqual(timeout);
		});

		it('should not abort the signal if the timeout is Infinity', async () => {
			signal.timeout(Infinity);

			await new Promise(resolve => setTimeout(resolve, 100));

			expect(signal.aborted).toBe(false);
		});

		it('should throw an error if the timeout is negative', async () => {
			expect(() => signal.timeout(-1)).toThrow(RangeError);
		});
	});

	describe('onAbort', () => {
		it('should add an event listener to the signal', () => {
			const listener = jest.fn();
			signal.onAbort(listener);
			signal.abort();
			expect(listener).toHaveBeenCalled();
		});
	});
});