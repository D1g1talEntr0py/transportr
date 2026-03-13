import { describe, expect, it, vi } from 'vitest';
import { Transportr } from '../src/transportr';

describe('Abort All', () => {
	it('should cancel all requests when abortAll is called', async () => {
		const transportr = new Transportr('https://httpbin.org/');

		const abortEventListener = vi.fn();
		const allCompleteEventListener = vi.fn();

		// Register listeners and save registrations for cleanup
		const abortRegistration = Transportr.register(Transportr.RequestEvents.ABORTED, abortEventListener);
		const allCompleteRegistration = Transportr.register(Transportr.RequestEvents.ALL_COMPLETE, allCompleteEventListener);

		try {
			// Start multiple slow requests
			const requests = [
				transportr.get('/delay/2'),
				transportr.get('/delay/2'),
				transportr.get('/delay/2')
			];

			// Give time for requests to start
			await new Promise(resolve => setTimeout(resolve, 100));

			// Abort all requests
			Transportr.abortAll();

			// Wait for all requests to settle
			const results = await Promise.allSettled(requests);

			// All requests should be rejected due to abort
			expect(results.every(result => result.status === 'rejected')).toBe(true);

			// Give time for events to be processed
			await new Promise(resolve => setTimeout(resolve, 100));

			// The abort events should have been triggered
			expect(abortEventListener).toHaveBeenCalledTimes(3);

			// No ALL_COMPLETE event should fire since requests were aborted
			expect(allCompleteEventListener).not.toHaveBeenCalled();
		} finally {
			// Clean up event listeners
			Transportr.unregister(abortRegistration);
			Transportr.unregister(allCompleteRegistration);
		}
	});
});