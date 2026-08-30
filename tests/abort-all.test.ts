import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Transportr } from '../src/transportr.js';
import { startTestServer, type TestServer } from './scripts/server.js';

describe('Abort All', () => {
	let server: TestServer;

	beforeAll(async () => { server = await startTestServer() });
	afterAll(async () => { await server.close() });

	afterEach(() => {
		server.reset();
		Transportr.abortAll();
	});

	it('should cancel all requests when abortAll is called', async () => {
		const transportr = new Transportr(server.url);

		const abortEventListener = vi.fn();
		const allCompleteEventListener = vi.fn();
		const configuredEventListener = vi.fn();

		// Register listeners and save registrations for cleanup
		const abortRegistration = Transportr.register(Transportr.RequestEvent.ABORTED, abortEventListener);
		const allCompleteRegistration = Transportr.register(Transportr.RequestEvent.ALL_COMPLETE, allCompleteEventListener);
		const configuredRegistration = Transportr.register(Transportr.RequestEvent.CONFIGURED, configuredEventListener);

		try {
			// Start multiple slow requests
			const requests = [
				transportr.get('/delay/2000'),
				transportr.get('/delay/2000'),
				transportr.get('/delay/2000')
			];

			// Every request has registered its signal controller once it has been configured.
			await vi.waitFor(() => expect(configuredEventListener).toHaveBeenCalledTimes(3));

			Transportr.abortAll();

			const results = await Promise.allSettled(requests);

			// All requests should be rejected due to abort
			expect(results.every((result) => result.status === 'rejected')).toBe(true);

			// The abort events should have been triggered
			await vi.waitFor(() => expect(abortEventListener).toHaveBeenCalledTimes(3));

			// No ALL_COMPLETE event should fire since requests were aborted
			expect(allCompleteEventListener).not.toHaveBeenCalled();
		} finally {
			// Clean up event listeners
			Transportr.unregister(abortRegistration);
			Transportr.unregister(allCompleteRegistration);
			Transportr.unregister(configuredRegistration);
		}
	});
});