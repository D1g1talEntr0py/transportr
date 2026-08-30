import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Transportr } from '../src/transportr.js';
import { startTestServer, type TestServer } from './scripts/server.js';

describe('Network Tests', () => {
	let server: TestServer;

	beforeAll(async () => { server = await startTestServer() });
	afterAll(async () => { await server.close() });

	afterEach(() => {
		server.reset();
		vi.restoreAllMocks();
	});

	it('should successfully make HTTP requests to real API', async () => {
		const transportr = new Transportr(server.url);

		const configuredEventListener = vi.fn();
		const configuredRegistration = Transportr.register(Transportr.RequestEvent.CONFIGURED, configuredEventListener);

		const successEventListener = vi.fn();
		const successRegistration = Transportr.register(Transportr.RequestEvent.SUCCESS, successEventListener);

		const errorEventListener = vi.fn();
		const errorRegistration = Transportr.register(Transportr.RequestEvent.ERROR, errorEventListener);

		try {
			const data = await transportr.getJson('/json');

			expect(data).toEqual({ id: '1', firstName: 'Miles', lastName: 'Davis' });

			await vi.waitFor(() => expect(successEventListener).toHaveBeenCalledTimes(1));

			expect(configuredEventListener).toHaveBeenCalledTimes(1);
			expect(errorEventListener).toHaveBeenCalledTimes(0);
			expect(server.requests).toMatchObject([ { method: 'GET', pathname: '/json' } ]);
		} finally {
			Transportr.unregister(configuredRegistration);
			Transportr.unregister(successRegistration);
			Transportr.unregister(errorRegistration);
		}
	});

	it('should test POST request functionality', async () => {
		const transportr = new Transportr(`${server.url}/echo`);

		const postData = {
			firstName: 'Test',
			lastName: 'User',
			gender: 'Male',
			recordLabel: 'Test Records'
		};

		const result = await transportr.post(postData) as { method: string, body: string, headers: Record<string, string> };

		expect(result.method).toBe('POST');
		expect(JSON.parse(result.body)).toEqual(postData);
		expect(result.headers['content-type']).toContain('application/json');
	});

	it('should test global event handler registration', async () => {
		const globalConfiguredEventHandler = vi.fn();
		const registration = Transportr.register(Transportr.RequestEvent.CONFIGURED, globalConfiguredEventHandler);

		try {
			const transportr = new Transportr(server.url);

			expect(await transportr.getJson('/json')).toHaveProperty('firstName', 'Miles');
			expect(await transportr.getJson('/echo?id=14')).toHaveProperty('query', { id: '14' });

			await vi.waitFor(() => expect(globalConfiguredEventHandler).toHaveBeenCalledTimes(2));

			expect(server.requests.map(({ pathname }) => pathname)).toEqual([ '/json', '/echo' ]);
		} finally {
			Transportr.unregister(registration);
		}
	});
});
