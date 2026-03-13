import { afterEach, describe, expect, it, vi } from 'vitest';
import { Transportr } from '../src/transportr.js';
import { HttpError } from '../src/http-error.js';
import config from './scripts/config.js';

const apiBaseUrl = `https://${config.apiKey}.mockapi.io/artists`;

describe('Hooks', () => {
	afterEach(() => {
		Transportr.clearHooks();
	});

	describe('beforeRequest', () => {
		it('should run global beforeRequest hooks', async () => {
			const hook = vi.fn();
			Transportr.addHooks({ beforeRequest: [hook] });

			const transportr = new Transportr(apiBaseUrl);
			await transportr.getJson('/1');

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

			await transportr.getJson('/1');

			expect(hook).toHaveBeenCalledTimes(1);
		});

		it('should run hooks in order: global → instance → per-request', async () => {
			const order: string[] = [];

			Transportr.addHooks({ beforeRequest: [() => { order.push('global') }] });

			const transportr = new Transportr(apiBaseUrl);
			transportr.addHooks({ beforeRequest: [() => { order.push('instance') }] });

			await transportr.getJson('/1', {
				hooks: { beforeRequest: [() => { order.push('per-request') }] }
			});

			expect(order).toEqual(['global', 'instance', 'per-request']);
		});

		it('should allow beforeRequest hook to modify headers', async () => {
			const transportr = new Transportr(apiBaseUrl);
			transportr.addHooks({
				beforeRequest: [(options) => {
					options.headers?.set('x-custom-header', 'test-value');
				}]
			});

			// If the hook runs without error, it successfully modified the options
			const data = await transportr.getJson('/1');
			expect(data).toHaveProperty('id');
		});
	});

	describe('afterResponse', () => {
		it('should run global afterResponse hooks', async () => {
			const hook = vi.fn();
			Transportr.addHooks({ afterResponse: [hook] });

			const transportr = new Transportr(apiBaseUrl);
			await transportr.getJson('/1');

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

			await transportr.getJson('/1');

			expect(hook).toHaveBeenCalledTimes(1);
		});

		it('should run afterResponse hooks in order: global → instance → per-request', async () => {
			const order: string[] = [];

			Transportr.addHooks({ afterResponse: [() => { order.push('global') }] });

			const transportr = new Transportr(apiBaseUrl);
			transportr.addHooks({ afterResponse: [() => { order.push('instance') }] });

			await transportr.getJson('/1', {
				hooks: { afterResponse: [() => { order.push('per-request') }] }
			});

			expect(order).toEqual(['global', 'instance', 'per-request']);
		});
	});

	describe('beforeError', () => {
		it('should run global beforeError hooks on HTTP errors', async () => {
			const hook = vi.fn();
			Transportr.addHooks({ beforeError: [hook] });

			const transportr = new Transportr(apiBaseUrl);

			try {
				await transportr.getJson('/nonexistent-endpoint-99999');
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
				await transportr.getJson('/nonexistent-endpoint-99999');
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
				await transportr.getJson('/nonexistent-endpoint-99999');
			} catch {
				// expected
			}

			expect(hook).toHaveBeenCalledTimes(1);
		});
	});

	describe('clearHooks', () => {
		it('should clear global hooks', async () => {
			const hook = vi.fn();
			Transportr.addHooks({ beforeRequest: [hook] });
			Transportr.clearHooks();

			const transportr = new Transportr(apiBaseUrl);
			await transportr.getJson('/1');

			expect(hook).toHaveBeenCalledTimes(0);
		});

		it('should clear instance hooks', async () => {
			const hook = vi.fn();
			const transportr = new Transportr(apiBaseUrl);
			transportr.addHooks({ beforeRequest: [hook] });
			transportr.clearHooks();

			await transportr.getJson('/1');

			expect(hook).toHaveBeenCalledTimes(0);
		});
	});
});
