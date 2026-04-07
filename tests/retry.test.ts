import { afterEach, describe, expect, it, vi } from 'vitest';
import { Transportr } from '../src/transportr.js';
import { HttpError } from '../src/http-error.js';

describe('Retry', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('normalizeRetryOptions (via _request behavior)', () => {
		it('should not retry by default', async () => {
			const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
				new Response(null, { status: 500, statusText: 'Internal Server Error' })
			);

			const transportr = new Transportr('http://example.com');

			await expect(transportr.getJson('/test')).rejects.toThrow(HttpError);
			expect(fetchSpy).toHaveBeenCalledTimes(1);
		});

		it('should retry with numeric shorthand', async () => {
			const fetchSpy = vi.spyOn(globalThis, 'fetch')
				.mockResolvedValueOnce(new Response(null, { status: 503, statusText: 'Service Unavailable' }))
				.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), {
					status: 200,
					headers: { 'content-type': 'application/json' }
				}));

			const transportr = new Transportr('http://example.com');
			const result = await transportr.getJson('/test', { retry: 2 });

			expect(fetchSpy).toHaveBeenCalledTimes(2);
			expect(result).toEqual({ ok: true });
		});

		it('should retry with object options', async () => {
			const fetchSpy = vi.spyOn(globalThis, 'fetch')
				.mockResolvedValueOnce(new Response(null, { status: 429, statusText: 'Too Many Requests' }))
				.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), {
					status: 200,
					headers: { 'content-type': 'application/json' }
				}));

			const transportr = new Transportr('http://example.com');
			const result = await transportr.getJson('/test', {
				retry: { limit: 3, statusCodes: [429], delay: 10, backoffFactor: 1 }
			});

			expect(fetchSpy).toHaveBeenCalledTimes(2);
			expect(result).toEqual({ ok: true });
		});
	});

	describe('retry limit enforcement', () => {
		it('should not exceed retry limit', async () => {
			const fetchSpy = vi.spyOn(globalThis, 'fetch')
				.mockResolvedValue(new Response(null, { status: 503, statusText: 'Service Unavailable' }));

			const transportr = new Transportr('http://example.com');

			await expect(transportr.getJson('/test', {
				retry: { limit: 2, delay: 1, backoffFactor: 1 }
			})).rejects.toThrow(HttpError);

			// 1 initial + 2 retries = 3 total
			expect(fetchSpy).toHaveBeenCalledTimes(3);
		});

		it('should stop retrying on success', async () => {
			const fetchSpy = vi.spyOn(globalThis, 'fetch')
				.mockResolvedValueOnce(new Response(null, { status: 500, statusText: 'Internal Server Error' }))
				.mockResolvedValueOnce(new Response(null, { status: 502, statusText: 'Bad Gateway' }))
				.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), {
					status: 200,
					headers: { 'content-type': 'application/json' }
				}));

			const transportr = new Transportr('http://example.com');
			const result = await transportr.getJson('/test', {
				retry: { limit: 5, delay: 1, backoffFactor: 1 }
			});

			expect(fetchSpy).toHaveBeenCalledTimes(3);
			expect(result).toEqual({ ok: true });
		});
	});

	describe('status code filtering', () => {
		it('should not retry non-retryable status codes', async () => {
			const fetchSpy = vi.spyOn(globalThis, 'fetch')
				.mockResolvedValue(new Response(null, { status: 404, statusText: 'Not Found' }));

			const transportr = new Transportr('http://example.com');

			await expect(transportr.getJson('/test', {
				retry: { limit: 3, delay: 1, backoffFactor: 1 }
			})).rejects.toThrow(HttpError);

			// 404 is not in default retryStatusCodes, so no retries
			expect(fetchSpy).toHaveBeenCalledTimes(1);
		});

		it('should retry custom status codes', async () => {
			const fetchSpy = vi.spyOn(globalThis, 'fetch')
				.mockResolvedValueOnce(new Response(null, { status: 418, statusText: "I'm a Teapot" }))
				.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), {
					status: 200,
					headers: { 'content-type': 'application/json' }
				}));

			const transportr = new Transportr('http://example.com');
			const result = await transportr.getJson('/test', {
				retry: { limit: 2, statusCodes: [418], delay: 1, backoffFactor: 1 }
			});

			expect(fetchSpy).toHaveBeenCalledTimes(2);
			expect(result).toEqual({ ok: true });
		});
	});

	describe('method filtering', () => {
		it('should not retry POST by default', async () => {
			const fetchSpy = vi.spyOn(globalThis, 'fetch')
				.mockResolvedValue(new Response(null, { status: 503, statusText: 'Service Unavailable' }));

			const transportr = new Transportr('http://example.com');

			await expect(transportr.post('/test', { data: 'test' }, {
				retry: { limit: 3, delay: 1, backoffFactor: 1 }
			})).rejects.toThrow(HttpError);

			// POST is not in default retryMethods, so no retries
			expect(fetchSpy).toHaveBeenCalledTimes(1);
		});

		it('should retry POST when explicitly allowed', async () => {
			const fetchSpy = vi.spyOn(globalThis, 'fetch')
				.mockResolvedValueOnce(new Response(null, { status: 503, statusText: 'Service Unavailable' }))
				.mockResolvedValueOnce(new Response(JSON.stringify({ id: 1 }), {
					status: 200,
					headers: { 'content-type': 'application/json' }
				}));

			const transportr = new Transportr('http://example.com');
			const result = await transportr.post<{ id: number }>('/test', { data: 'test' }, {
				retry: { limit: 2, methods: ['POST'], delay: 1, backoffFactor: 1 }
			});

			expect(fetchSpy).toHaveBeenCalledTimes(2);
			expect(result).toEqual({ id: 1 });
		});
	});

	describe('retry event', () => {
		it('should emit retry event on each retry attempt', async () => {
			vi.spyOn(globalThis, 'fetch')
				.mockResolvedValueOnce(new Response(null, { status: 503, statusText: 'Service Unavailable' }))
				.mockResolvedValueOnce(new Response(null, { status: 502, statusText: 'Bad Gateway' }))
				.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), {
					status: 200,
					headers: { 'content-type': 'application/json' }
				}));

			const retryHandler = vi.fn();
			const transportr = new Transportr('http://example.com');
			const registration = transportr.register(Transportr.RequestEvent.RETRY, retryHandler);

			await transportr.getJson('/test', {
				retry: { limit: 3, delay: 1, backoffFactor: 1 }
			});

			expect(retryHandler).toHaveBeenCalledTimes(2);
			expect(retryHandler).toHaveBeenCalledWith(
				expect.any(CustomEvent),
				expect.objectContaining({ attempt: 1, status: 503, method: 'GET', path: '/test' })
			);
			expect(retryHandler).toHaveBeenCalledWith(
				expect.any(CustomEvent),
				expect.objectContaining({ attempt: 2, status: 502, method: 'GET', path: '/test' })
			);

			transportr.unregister(registration);
		});
	});

	describe('network error retry', () => {
		it('should retry on network errors', async () => {
			const fetchSpy = vi.spyOn(globalThis, 'fetch')
				.mockRejectedValueOnce(new TypeError('Failed to fetch'))
				.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), {
					status: 200,
					headers: { 'content-type': 'application/json' }
				}));

			const transportr = new Transportr('http://example.com');
			const result = await transportr.getJson('/test', {
				retry: { limit: 2, delay: 1, backoffFactor: 1 }
			});

			expect(fetchSpy).toHaveBeenCalledTimes(2);
			expect(result).toEqual({ ok: true });
		});

		it('should emit retry event on network error retry', async () => {
			vi.spyOn(globalThis, 'fetch')
				.mockRejectedValueOnce(new TypeError('Failed to fetch'))
				.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), {
					status: 200,
					headers: { 'content-type': 'application/json' }
				}));

			const retryHandler = vi.fn();
			const transportr = new Transportr('http://example.com');
			const registration = transportr.register(Transportr.RequestEvent.RETRY, retryHandler);

			await transportr.getJson('/test', {
				retry: { limit: 2, delay: 1, backoffFactor: 1 }
			});

			expect(retryHandler).toHaveBeenCalledTimes(1);
			expect(retryHandler).toHaveBeenCalledWith(
				expect.any(CustomEvent),
				expect.objectContaining({ attempt: 1, error: 'Failed to fetch', method: 'GET', path: '/test' })
			);

			transportr.unregister(registration);
		});
	});

	describe('delay and backoff', () => {
		it('should apply exponential backoff', async () => {
			vi.spyOn(globalThis, 'fetch')
				.mockResolvedValueOnce(new Response(null, { status: 503, statusText: 'Service Unavailable' }))
				.mockResolvedValueOnce(new Response(null, { status: 503, statusText: 'Service Unavailable' }))
				.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), {
					status: 200,
					headers: { 'content-type': 'application/json' }
				}));

			const timeoutSpy = vi.spyOn(globalThis, 'setTimeout');

			const transportr = new Transportr('http://example.com');
			await transportr.getJson('/test', {
				retry: { limit: 3, delay: 100, backoffFactor: 2 }
			});

			// First retry: 100 * 2^0 = 100ms, Second retry: 100 * 2^1 = 200ms
			const retryTimeouts = timeoutSpy.mock.calls.filter(([, ms]) => ms === 100 || ms === 200);
			expect(retryTimeouts).toHaveLength(2);
		});

		it('should support custom delay function', async () => {
			vi.spyOn(globalThis, 'fetch')
				.mockResolvedValueOnce(new Response(null, { status: 503, statusText: 'Service Unavailable' }))
				.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), {
					status: 200,
					headers: { 'content-type': 'application/json' }
				}));

			const delayFn = vi.fn().mockReturnValue(50);
			const transportr = new Transportr('http://example.com');
			await transportr.getJson('/test', {
				retry: { limit: 2, delay: delayFn }
			});

			expect(delayFn).toHaveBeenCalledWith(1);
		});
	});
});
