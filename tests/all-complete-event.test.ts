import { describe, expect, it, vi } from 'vitest';
import { Transportr } from '../src/transportr.js';

describe('All Complete Event', () => {
	it('should fire the all-complete event when all requests are complete', async () => {
		const transportr = new Transportr('https://67894e02b72f3b1b31f75ff4.mockapi.io/api/v1/');

		const configuredEventListener = vi.fn();
		const configuredRegistration = Transportr.register(Transportr.RequestEvents.CONFIGURED, configuredEventListener);

		const successEventListener = vi.fn();
		const successRegistration = Transportr.register(Transportr.RequestEvents.SUCCESS, successEventListener);

		const errorEventListener = vi.fn();
		const errorRegistration = Transportr.register(Transportr.RequestEvents.ERROR, errorEventListener);

		const abortEventListener = vi.fn();
		const abortRegistration = Transportr.register(Transportr.RequestEvents.ABORTED, abortEventListener);

		const timeoutEventListener = vi.fn();
		const timeoutRegistration = Transportr.register(Transportr.RequestEvents.TIMEOUT, timeoutEventListener);

		const completeEventListener = vi.fn();
		const completeRegistration = Transportr.register(Transportr.RequestEvents.COMPLETE, completeEventListener);

		const allCompleteEventListener = vi.fn();
		const allCompleteRegistration = Transportr.register(Transportr.RequestEvents.ALL_COMPLETE, allCompleteEventListener);

		try {
			const results = await Promise.allSettled([
				transportr.get('/users'),
				transportr.get('/users'),
				transportr.get('/users')
			]);

			// Check that all requests completed (whether successful or failed)
			expect(results.length).toBe(3);

			// Give time for events to be processed
			await new Promise(resolve => setTimeout(resolve, 100));

			// Check events after processing results
			console.log('Event listener call counts:', {
				configured: configuredEventListener.mock.calls.length,
				success: successEventListener.mock.calls.length,
				error: errorEventListener.mock.calls.length,
				abort: abortEventListener.mock.calls.length,
				timeout: timeoutEventListener.mock.calls.length,
				complete: completeEventListener.mock.calls.length,
				allComplete: allCompleteEventListener.mock.calls.length
			});

			// Basic expectations: all requests should be configured and completed
			expect(configuredEventListener).toHaveBeenCalledTimes(3);
			expect(completeEventListener).toHaveBeenCalledTimes(3);
			expect(allCompleteEventListener).toHaveBeenCalledTimes(1);

			// Either success or error events should be triggered (API may be down)
			const totalSuccessOrError = successEventListener.mock.calls.length + errorEventListener.mock.calls.length;
			expect(totalSuccessOrError).toBeGreaterThanOrEqual(3);

			// No abort or timeout events should occur
			expect(abortEventListener).toHaveBeenCalledTimes(0);
			expect(timeoutEventListener).toHaveBeenCalledTimes(0);
		} finally {
			// Clean up event listeners
			Transportr.unregister(configuredRegistration);
			Transportr.unregister(successRegistration);
			Transportr.unregister(errorRegistration);
			Transportr.unregister(abortRegistration);
			Transportr.unregister(timeoutRegistration);
			Transportr.unregister(completeRegistration);
			Transportr.unregister(allCompleteRegistration);
		}
	});
});