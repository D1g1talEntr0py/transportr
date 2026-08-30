import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Transportr } from '../src/transportr.js';
import { startTestServer, type TestServer } from './scripts/server.js';

describe('Global Event Handler', () => {
	let server: TestServer;

	beforeAll(async () => { server = await startTestServer() });
	afterAll(async () => { await server.close() });
	afterEach(() => { server.reset() });

	it('should trigger global event handlers for multiple requests', async () => {
		const transportr = new Transportr(server.url);

		const globalConfiguredEventHandler = vi.fn();
		const registration = Transportr.register(Transportr.RequestEvent.CONFIGURED, globalConfiguredEventHandler);

		try {
			expect(await transportr.getJson('/json')).toHaveProperty('lastName', 'Davis');
			expect(await transportr.getJson('/echo?id=14')).toHaveProperty('query', { id: '14' });

			expect(globalConfiguredEventHandler).toHaveBeenCalledTimes(2);
			expect(server.requests.map(({ pathname }) => pathname)).toEqual([ '/json', '/echo' ]);
		} finally {
			Transportr.unregister(registration);
		}
	});

	it('should stop notifying a handler once it is unregistered', async () => {
		const transportr = new Transportr(server.url);
		const handler = vi.fn();

		Transportr.unregister(Transportr.register(Transportr.RequestEvent.CONFIGURED, handler));
		await transportr.getJson('/json');

		expect(handler).not.toHaveBeenCalled();
	});
});
