import { describe, expect, it, vi } from 'vitest';
import { Transportr } from '../src/transportr.js';
import config from './scripts/config.js';
import { MediaType } from '@d1g1tal/media-type';

const apiBaseUrl = `https://${config.apiKey}.mockapi.io/artists`;

describe('MediaType Caching Optimization', () => {
	it('should cache parsed MediaType instances to avoid redundant parsing', async () => {
		const transportr = new Transportr(apiBaseUrl);
		const parseSpy = vi.spyOn(MediaType, 'parse');

		// Make a request. This will parse the content-type (e.g. application/json; charset=utf-8)
		await transportr.get('/1');

		const callsAfterFirst = parseSpy.mock.calls.length;

		// Make another request. This should reuse the cached MediaType.
		await transportr.get('/2');

		const callsAfterSecond = parseSpy.mock.calls.length;

		// The number of calls should NOT increase if caching is working.
		expect(callsAfterSecond).toBe(callsAfterFirst);

		parseSpy.mockRestore();
	});

	it('should handle sequential requests efficiently', async () => {
		const transportr = new Transportr(apiBaseUrl);
		const parseSpy = vi.spyOn(MediaType, 'parse');

		// Make 5 sequential requests
		for (let i = 1; i <= 5; i++) {
			await transportr.get(`/${i}`);
		}

		const totalParseCalls = parseSpy.mock.calls.length;

		// We expect at most 1 parse call (for the first request),
		// assuming all requests return the same content-type.
		// If the content-type is in the predefined map (exact match), it might be 0.
		expect(totalParseCalls).toBeLessThanOrEqual(1);

		parseSpy.mockRestore();
	});
});
