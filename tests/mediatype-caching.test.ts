import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { MediaType } from '@d1g1tal/media-type';
import { Transportr } from '../src/transportr.js';
import { startTestServer, type TestServer } from './scripts/server.js';

describe('MediaType Caching Optimization', () => {
	let server: TestServer;

	beforeAll(async () => { server = await startTestServer() });
	afterAll(async () => { await server.close() });

	afterEach(() => {
		server.reset();
		vi.restoreAllMocks();
	});

	it('should cache parsed MediaType instances to avoid redundant parsing', async () => {
		const transportr = new Transportr(server.url);
		const parseSpy = vi.spyOn(MediaType, 'parse');

		await transportr.get('/json');
		const callsAfterFirst = parseSpy.mock.calls.length;

		await transportr.get('/json');

		expect(parseSpy.mock.calls.length).toBe(callsAfterFirst);
	});

	it('should handle sequential requests efficiently', async () => {
		const transportr = new Transportr(server.url);
		const parseSpy = vi.spyOn(MediaType, 'parse');

		for (let i = 0; i < 5; i++) { await transportr.get('/json') }

		// The exact content type is already in the pre-populated cache, so nothing needs parsing.
		expect(parseSpy.mock.calls.length).toBeLessThanOrEqual(1);
	});
});
