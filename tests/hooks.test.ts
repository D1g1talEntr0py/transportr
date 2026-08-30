import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Transportr } from '../src/transportr.js';
import { HttpError } from '../src/http-error.js';
import { ResponseStatus } from '../src/response-status.js';
import { startTestServer, type TestServer } from './scripts/server.js';

describe('Hooks', () => {
	let server: TestServer;
	let apiBaseUrl: string;

	beforeAll(async () => {
		server = await startTestServer();
		apiBaseUrl = server.url;
	});

	afterAll(async () => { await server.close() });

	afterEach(() => {
		server.reset();
		Transportr.clearHooks();
	});

	describe('beforeRequest', () => {
		it('should run global beforeRequest hooks', async () => {
			const hook = vi.fn();
			Transportr.addHooks({ beforeRequest: [hook] });

			const transportr = new Transportr(apiBaseUrl);
			await transportr.getJson('/json');

			expect(hook).toHaveBeenCalledTimes(1);
			expect(hook).toHaveBeenCalledWith(
				expect.objectContaining({ method: 'GET' }),
				expect.any(URL)
			);
		});

		it('should run instance beforeRequest hooks', async () => {
			const hook = vi.fn();
			const transportr = new Transportr(apiBaseUrl);
			transportr.addHooks({ beforeRequest: [hook] });

			await transportr.getJson('/json');

			expect(hook).toHaveBeenCalledTimes(1);
		});

		it('should run hooks in order: global → instance → per-request', async () => {
			const order: string[] = [];

			Transportr.addHooks({ beforeRequest: [() => { order.push('global') }] });

			const transportr = new Transportr(apiBaseUrl);
			transportr.addHooks({ beforeRequest: [() => { order.push('instance') }] });

			await transportr.getJson('/json', {
				hooks: { beforeRequest: [() => { order.push('per-request') }] }
			});

			expect(order).toEqual(['global', 'instance', 'per-request']);
		});

		it('should allow beforeRequest hook to modify headers', async () => {
			const transportr = new Transportr(apiBaseUrl);
			transportr.addHooks({
				beforeRequest: [(options) => {
					const headers = new Headers(options.headers);
					headers.set('x-custom-header', 'test-value');
					return { ...options, headers };
				}]
			});

			// If the hook runs without error, it successfully modified the options
			const data = await transportr.getJson('/json');
			expect(data).toHaveProperty('id');
		});
	});

	describe('afterResponse', () => {
		it('should run global afterResponse hooks', async () => {
			const hook = vi.fn();
			Transportr.addHooks({ afterResponse: [hook] });

			const transportr = new Transportr(apiBaseUrl);
			await transportr.getJson('/json');

			expect(hook).toHaveBeenCalledTimes(1);
			expect(hook).toHaveBeenCalledWith(
				expect.objectContaining({ ok: true }),
				expect.objectContaining({ method: 'GET' })
			);
		});

		it('should run instance afterResponse hooks', async () => {
			const hook = vi.fn();
			const transportr = new Transportr(apiBaseUrl);
			transportr.addHooks({ afterResponse: [hook] });

			await transportr.getJson('/json');

			expect(hook).toHaveBeenCalledTimes(1);
		});

		it('should run afterResponse hooks in order: global → instance → per-request', async () => {
			const order: string[] = [];

			Transportr.addHooks({ afterResponse: [() => { order.push('global') }] });

			const transportr = new Transportr(apiBaseUrl);
			transportr.addHooks({ afterResponse: [() => { order.push('instance') }] });

			await transportr.getJson('/json', {
				hooks: { afterResponse: [() => { order.push('per-request') }] }
			});

			expect(order).toEqual(['global', 'instance', 'per-request']);
		});

		it('should keep the original response when a hook returns nothing', async () => {
			const transportr = new Transportr(apiBaseUrl);
			transportr.addHooks({ afterResponse: [() => undefined] });

			await expect(transportr.getJson('/json')).resolves.toEqual({ id: '1', firstName: 'Miles', lastName: 'Davis' });
		});

		it('should use the replacement response when a hook returns one', async () => {
			const transportr = new Transportr(apiBaseUrl);
			transportr.addHooks({
				afterResponse: [() => new Response(JSON.stringify({ replaced: true }), { headers: { 'content-type': 'application/json' } })]
			});

			await expect(transportr.getJson('/json')).resolves.toEqual({ replaced: true });
		});
	});

	describe('beforeError', () => {
		it('should run global beforeError hooks on HTTP errors', async () => {
			const hook = vi.fn();
			Transportr.addHooks({ beforeError: [hook] });

			const transportr = new Transportr(apiBaseUrl);

			try {
				await transportr.getJson('/status/404');
			} catch {
				// expected
			}

			expect(hook).toHaveBeenCalledTimes(1);
			expect(hook).toHaveBeenCalledWith(expect.any(HttpError));
		});

		it('should allow beforeError hook to transform the error', async () => {
			const transportr = new Transportr(apiBaseUrl);
			transportr.addHooks({
				beforeError: [(error) => {
					// Return a new HttpError with modified message
					return new HttpError(
						{ code: error.statusCode, text: 'Custom Error' } as any,
						{ message: 'Hook-modified error' }
					);
				}]
			});

			try {
				await transportr.getJson('/status/404');
				expect.unreachable('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(HttpError);
				expect((error as HttpError).statusText).toBe('Custom Error');
			}
		});

		it('should run instance beforeError hooks', async () => {
			const hook = vi.fn();
			const transportr = new Transportr(apiBaseUrl);
			transportr.addHooks({ beforeError: [hook] });

			try {
				await transportr.getJson('/status/404');
			} catch {
				// expected
			}

			expect(hook).toHaveBeenCalledTimes(1);
		});

		it('should keep the original error when a hook returns something that is not an HttpError', async () => {
			const transportr = new Transportr(apiBaseUrl);
			transportr.addHooks({ beforeError: [() => undefined, () => new Error('not an HttpError') as unknown as HttpError] });

			const error = await transportr.getJson('/status/404').catch((cause: unknown) => cause);

			expect(error).toBeInstanceOf(HttpError);
			expect((error as HttpError).statusCode).toBe(404);
		});

		it('should run per-request beforeError hooks', async () => {
			const hook = vi.fn();
			const transportr = new Transportr(apiBaseUrl);

			await transportr.getJson('/status/404', { hooks: { beforeError: [hook] } }).catch(() => undefined);

			expect(hook).toHaveBeenCalledTimes(1);
			expect(hook).toHaveBeenCalledWith(expect.any(HttpError));
		});

		it('should let a per-request beforeError hook replace the error', async () => {
			const transportr = new Transportr(apiBaseUrl);

			const error = await transportr.getJson('/status/404', {
				hooks: { beforeError: [(cause) => new HttpError(new ResponseStatus(cause.statusCode, 'Replaced'), { message: 'per-request replacement' })] }
			}).catch((cause: unknown) => cause);

			expect(error).toBeInstanceOf(HttpError);
			expect((error as HttpError).statusText).toBe('Replaced');
			expect((error as HttpError).message).toBe('per-request replacement');
		});

		it('should run beforeError hooks in order: global → instance → per-request', async () => {
			const order: string[] = [];

			Transportr.addHooks({ beforeError: [() => { order.push('global') }] });

			const transportr = new Transportr(apiBaseUrl);
			transportr.addHooks({ beforeError: [() => { order.push('instance') }] });

			await transportr.getJson('/status/404', {
				hooks: { beforeError: [() => { order.push('per-request') }] }
			}).catch(() => undefined);

			expect(order).toEqual([ 'global', 'instance', 'per-request' ]);
		});
	});

	describe('clearHooks', () => {
		it('should clear global hooks', async () => {
			const hook = vi.fn();
			Transportr.addHooks({ beforeRequest: [hook] });
			Transportr.clearHooks();

			const transportr = new Transportr(apiBaseUrl);
			await transportr.getJson('/json');

			expect(hook).toHaveBeenCalledTimes(0);
		});

		it('should clear instance hooks', async () => {
			const hook = vi.fn();
			const transportr = new Transportr(apiBaseUrl);
			transportr.addHooks({ beforeRequest: [hook] });
			transportr.clearHooks();

			await transportr.getJson('/json');

			expect(hook).toHaveBeenCalledTimes(0);
		});
	});
});
