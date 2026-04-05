import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Transportr } from '../src/transportr.js';
import { HttpError } from '../src/http-error.js';

describe('Concurrent Request Helpers', () => {
	const mockFetch = vi.fn();

	beforeEach(() => {
		global.fetch = mockFetch;
	});

	afterEach(() => {
		vi.restoreAllMocks();
		Transportr.unregisterAll();
	});

	describe('Transportr.all()', () => {
		it('should resolve all requests concurrently', async () => {
			mockFetch
				.mockResolvedValueOnce(new Response(JSON.stringify({ id: 1 }), { status: 200, headers: { 'content-type': 'application/json' } }))
				.mockResolvedValueOnce(new Response(JSON.stringify({ id: 2 }), { status: 200, headers: { 'content-type': 'application/json' } }))
				.mockResolvedValueOnce(new Response(JSON.stringify({ id: 3 }), { status: 200, headers: { 'content-type': 'application/json' } }));

			const api = new Transportr('https://api.example.com');

			const [a, b, c] = await Transportr.all([
				api.getJson('/users/1'),
				api.getJson('/users/2'),
				api.getJson('/users/3')
			]);

			expect(a).toEqual({ id: 1 });
			expect(b).toEqual({ id: 2 });
			expect(c).toEqual({ id: 3 });
		});

		it('should reject if any request fails', async () => {
			mockFetch
				.mockResolvedValueOnce(new Response(JSON.stringify({ id: 1 }), { status: 200, headers: { 'content-type': 'application/json' } }))
				.mockResolvedValueOnce(new Response('Not Found', { status: 404, statusText: 'Not Found' }));

			const api = new Transportr('https://api.example.com');

			await expect(Transportr.all([
				api.getJson('/users/1'),
				api.getJson('/users/999')
			])).rejects.toThrow(HttpError);
		});

		it('should preserve typed tuple ordering', async () => {
			mockFetch
				.mockResolvedValueOnce(new Response(JSON.stringify({ name: 'Alice' }), { status: 200, headers: { 'content-type': 'application/json' } }))
				.mockResolvedValueOnce(new Response('plain text', { status: 200, headers: { 'content-type': 'text/plain' } }));

			const api = new Transportr('https://api.example.com');

			const [json, response] = await Transportr.all([
				api.getJson('/data'),
				api.get('/info')
			]);

			expect(json).toEqual({ name: 'Alice' });
			expect(response).toBe('plain text');
		});
	});

	describe('Transportr.race()', () => {
		it('should resolve with the first settled request', async () => {
			let slowResolve: ((v: Response) => void) | undefined;
			mockFetch.mockImplementation(async (_url: string | URL) => {
				const url = _url.toString();
				if (url.includes('fast')) {
					return new Response(JSON.stringify({ source: 'fast' }), { status: 200, headers: { 'content-type': 'application/json' } });
				}
				// Simulate slow response — will be aborted before resolving
				return new Promise<Response>((resolve) => { slowResolve = resolve });
			});

			const api = new Transportr('https://api.example.com');

			const result = await Transportr.race([
				(signal) => api.getJson('/fast', { signal }),
				(signal) => api.getJson('/slow', { signal })
			]);

			expect(result).toEqual({ source: 'fast' });
			// Resolve the slow promise to avoid dangling
			slowResolve?.(new Response(null, { status: 200 }));
		});

		it('should abort losing requests after winner settles', async () => {
			const signals: AbortSignal[] = [];
			let slowResolve: ((v: Response) => void) | undefined;

			mockFetch.mockImplementation(async (_url: string | URL, init?: RequestInit) => {
				if (init?.signal) { signals.push(init.signal) }
				const url = _url.toString();
				if (url.includes('winner')) {
					return new Response(JSON.stringify({ winner: true }), { status: 200, headers: { 'content-type': 'application/json' } });
				}
				return new Promise<Response>((resolve) => { slowResolve = resolve });
			});

			const api = new Transportr('https://api.example.com');

			await Transportr.race([
				(signal) => api.getJson('/winner', { signal }),
				(signal) => api.getJson('/loser', { signal })
			]);

			// Wait a tick for finally() to run
			await new Promise((resolve) => { queueMicrotask(() => resolve(undefined)) });

			// All signals should be aborted after race settles
			for (const signal of signals) {
				expect(signal.aborted).toBe(true);
			}

			slowResolve?.(new Response(null, { status: 200 }));
		});

		it('should reject if the first to settle is a rejection', async () => {
			mockFetch.mockResolvedValue(new Response('Server Error', { status: 500, statusText: 'Internal Server Error' }));

			const api = new Transportr('https://api.example.com');

			await expect(Transportr.race([
				(signal) => api.getJson('/fail1', { signal }),
				(signal) => api.getJson('/fail2', { signal })
			])).rejects.toThrow(HttpError);
		});
	});
});
