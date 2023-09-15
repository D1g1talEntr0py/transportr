import AbortSignal from '../src/abort-signal';
import { jest, describe, expect, it } from '@jest/globals';

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

	describe('AbortSignal.abort', () => {
		it('should return an AbortSignal object', () => {
			expect(AbortSignal.abort()).toBeInstanceOf(globalThis.AbortSignal);
		});

		it('should return an aborted AbortSignal object', () => {
			const signal = AbortSignal.abort();
			expect(signal.aborted).toBe(true);
		});
	});

	describe('AbortSignal.timeout', () => {
		it('should return an AbortSignal object', () => {
			expect(AbortSignal.timeout(1000)).toBeInstanceOf(globalThis.AbortSignal);
		});

		it('should return an aborted AbortSignal object after the specified timeout', async () => {
			const timeout = 1000;
			const start = Date.now();
			const signal = AbortSignal.timeout(timeout);

			await new Promise(resolve => setTimeout(resolve, timeout + 100));

			expect(signal.aborted).toBe(true);
			expect(signal.reason).toEqual(expect.any(DOMException));
			expect(signal.reason.name).toBe('TimeoutError');
			expect(Date.now() - start).toBeGreaterThanOrEqual(timeout);
		});

		it('should throw an error if the timeout is negative', async () => {
			expect(() => AbortSignal.timeout(-1)).toThrowError(/[RangeError]/);
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

	describe('throwIfAborted', () => {
		it('should not throw an error when the signal is not aborted', () => {
			expect(() => signal.throwIfAborted()).not.toThrow();
		});

		it('should throw an error when the signal is aborted', () => {
			signal.abort();
			expect(() => signal.throwIfAborted()).toThrow(DOMException);
		});
	});

	describe('withTimeout', () => {
		it('should return the abort signal', () => {
			expect(signal.withTimeout(1000)).toBeInstanceOf(globalThis.AbortSignal);
		});

		it('should abort the signal after the specified timeout', async () => {
			const timeout = 1000;
			const start = Date.now();
			signal.withTimeout(timeout);

			await new Promise(resolve => setTimeout(resolve, timeout + 100));

			expect(signal.aborted).toBe(true);
			expect(signal.reason).toEqual(expect.any(DOMException));
			expect(signal.reason.name).toBe('TimeoutError');
			expect(Date.now() - start).toBeGreaterThanOrEqual(timeout);
		});

		it('should throw an error if the timeout is negative', async () => {
			expect(() => signal.withTimeout(-1)).toThrow(RangeError);
		});
	});

	describe('addEventListener', () => {
		it('should add an event listener to the signal', () => {
			const listener = jest.fn();
			signal.addEventListener('abort', listener);
			signal.abort();
			expect(listener).toHaveBeenCalled();
		});
	});

	describe('removeEventListener', () => {
		it('should remove an event listener from the signal', () => {
			const listener = jest.fn();
			signal.addEventListener('abort', listener);
			signal.removeEventListener('abort', listener);
			signal.abort();
			expect(listener).not.toHaveBeenCalled();
		});
	});

	describe('dispatchEvent', () => {
		it('should dispatch an event to the signal', () => {
			const listener = jest.fn();
			signal.addEventListener('abort', listener);
			signal.dispatchEvent(new Event('abort'));
			expect(listener).toHaveBeenCalled();
		});
	});
});