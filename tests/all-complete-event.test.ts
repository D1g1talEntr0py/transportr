import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Transportr } from '../src/transportr.js';
import { startTestServer, type TestServer } from './scripts/server.js';

describe('All Complete Event', () => {
	let server: TestServer;

	beforeAll(async () => { server = await startTestServer() });
	afterAll(async () => { await server.close() });
	afterEach(() => { server.reset() });

	it('should fire the all-complete event when all requests are complete', async () => {
		const transportr = new Transportr(server.url);

		const configuredEventListener = vi.fn();
		const configuredRegistration = Transportr.register(Transportr.RequestEvent.CONFIGURED, configuredEventListener);

		const successEventListener = vi.fn();
		const successRegistration = Transportr.register(Transportr.RequestEvent.SUCCESS, successEventListener);

		const errorEventListener = vi.fn();
		const errorRegistration = Transportr.register(Transportr.RequestEvent.ERROR, errorEventListener);

		const abortEventListener = vi.fn();
		const abortRegistration = Transportr.register(Transportr.RequestEvent.ABORTED, abortEventListener);

		const timeoutEventListener = vi.fn();
		const timeoutRegistration = Transportr.register(Transportr.RequestEvent.TIMEOUT, timeoutEventListener);

		const completeEventListener = vi.fn();
		const completeRegistration = Transportr.register(Transportr.RequestEvent.COMPLETE, completeEventListener);

		const allCompleteEventListener = vi.fn();
		const allCompleteRegistration = Transportr.register(Transportr.RequestEvent.ALL_COMPLETE, allCompleteEventListener);

		try {
			const results = await Promise.all([
				transportr.get('/json'),
				transportr.get('/json'),
				transportr.get('/json')
			]);

			expect(results).toHaveLength(3);
			expect(results.every((result) => (result as { id: string }).id === '1')).toBe(true);

			await vi.waitFor(() => expect(allCompleteEventListener).toHaveBeenCalledTimes(1));

			expect(configuredEventListener).toHaveBeenCalledTimes(3);
			expect(completeEventListener).toHaveBeenCalledTimes(3);
			expect(successEventListener).toHaveBeenCalledTimes(3);
			expect(errorEventListener).toHaveBeenCalledTimes(0);
			expect(abortEventListener).toHaveBeenCalledTimes(0);
			expect(timeoutEventListener).toHaveBeenCalledTimes(0);
		} finally {
			Transportr.unregister(configuredRegistration);
			Transportr.unregister(successRegistration);
			Transportr.unregister(errorRegistration);
			Transportr.unregister(abortRegistration);
			Transportr.unregister(timeoutRegistration);
			Transportr.unregister(completeRegistration);
			Transportr.unregister(allCompleteRegistration);
		}
	});

	it('should fire all-complete once per batch, not once per request', async () => {
		const transportr = new Transportr(server.url);
		const allCompleteEventListener = vi.fn();
		const registration = Transportr.register(Transportr.RequestEvent.ALL_COMPLETE, allCompleteEventListener);

		try {
			await transportr.get('/json');
			await vi.waitFor(() => expect(allCompleteEventListener).toHaveBeenCalledTimes(1));

			await transportr.get('/json');
			await vi.waitFor(() => expect(allCompleteEventListener).toHaveBeenCalledTimes(2));
		} finally {
			Transportr.unregister(registration);
		}
	});
});
