import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { Transportr } from '../src/transportr.js';
import type { RequestOptions } from '../src/@types/index.js';
import { HttpError } from '../src/http-error.js';
import { startTestServer, type TestServer } from './scripts/server.js';

type Echo = {
	method: string;
	pathname: string;
	query: Record<string, string>;
	headers: Record<string, string>;
	body: string;
};

describe('Request configuration', () => {
	let server: TestServer;
	let echoUrl: string;

	beforeAll(async () => {
		server = await startTestServer();
		echoUrl = `${server.url}/echo`;
	});

	afterAll(async () => { await server.close() });

	afterEach(() => {
		server.reset();
		// Expire anything an XSRF test left behind.
		for (const cookie of document.cookie.split(';')) {
			const cookieName = cookie.split('=')[0]!.trim();
			if (cookieName) {
				document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
			}
		}
	});

	describe('headers', () => {
		it('should skip header entries whose value is undefined', async () => {
			const transportr = new Transportr(server.url);
			const headers: { 'x-defined': string, 'x-optional'?: string } = { 'x-defined': 'kept' };

			const echo = await transportr.get('/echo', { headers }) as unknown as Echo;

			expect(echo.headers['x-defined']).toBe('kept');
			// Without the guard the runtime would send the literal string "undefined".
			expect(echo.headers).not.toHaveProperty('x-optional');
		});

		it('should drop a content-type header supplied on a bodyless method', async () => {
			const transportr = new Transportr(server.url);

			const { headers } = await transportr.get('/echo', { headers: { 'content-type': 'application/json', 'x-keep': 'yes' } }) as unknown as Echo;

			expect(headers).not.toHaveProperty('content-type');
			expect(headers['x-keep']).toBe('yes');
		});
	});

	describe('search parameters', () => {
		it('should skip search parameter entries whose value is undefined', async () => {
			const transportr = new Transportr(server.url);
			const searchParams: { keep: string, drop?: string } = { keep: 'yes' };

			const { query } = await transportr.get('/echo', { searchParams }) as unknown as Echo;

			// Without the guard the runtime would send `drop=undefined`.
			expect(query).toEqual({ keep: 'yes' });
		});

		it('should stringify non-string search parameter values', async () => {
			const transportr = new Transportr(server.url);

			const { query } = await transportr.get('/echo', { searchParams: { page: 2, active: true } }) as unknown as Echo;

			expect(query).toEqual({ page: '2', active: 'true' });
		});
	});

	describe('bodyless methods', () => {
		it('should fold a URLSearchParams body into the query string', async () => {
			const transportr = new Transportr(server.url);

			// `get()` clears the body outright, so the fold is reachable through the generic request entry point.
			const response = await transportr.request('/echo', { method: 'GET', body: new URLSearchParams({ artist: 'miles' }) } as unknown as RequestOptions) as unknown as Response;
			const { query, body } = await response.json() as unknown as Echo;

			expect(query).toEqual({ artist: 'miles' });
			expect(body).toBe('');
		});
	});

	describe('body merging', () => {
		it('should deep merge an instance body with a request body', async () => {
			const transportr = new Transportr(echoUrl, { body: { source: 'instance', nested: { keep: true } } });

			const { body } = await transportr.post({ source: 'request', nested: { added: true } }) as unknown as Echo;

			expect(JSON.parse(body)).toEqual({ source: 'request', nested: { keep: true, added: true } });
		});

		it('should send a raw body as-is and let the runtime set the content type', async () => {
			const transportr = new Transportr(echoUrl, { body: { source: 'instance' } });

			const { body, headers } = await transportr.post(new URLSearchParams({ raw: 'yes' })) as unknown as Echo;

			expect(body).toBe('raw=yes');
			expect(headers['content-type']).toContain('application/x-www-form-urlencoded');
		});
	});

	describe('XSRF protection', () => {
		it('should send the token from the default cookie as the default header', async () => {
			document.cookie = 'XSRF-TOKEN=token-value; path=/';
			const transportr = new Transportr(server.url);

			const { headers } = await transportr.get('/echo', { xsrf: true }) as unknown as Echo;

			expect(headers['x-xsrf-token']).toBe('token-value');
		});

		it('should send nothing when the cookie is absent', async () => {
			const transportr = new Transportr(server.url);

			const { headers } = await transportr.get('/echo', { xsrf: true }) as unknown as Echo;

			expect(headers).not.toHaveProperty('x-xsrf-token');
		});

		it('should not send the token when protection is disabled', async () => {
			document.cookie = 'XSRF-TOKEN=token-value; path=/';
			const transportr = new Transportr(server.url);

			const { headers } = await transportr.get('/echo', { xsrf: false }) as unknown as Echo;

			expect(headers).not.toHaveProperty('x-xsrf-token');
		});

		it('should honour custom cookie and header names', async () => {
			document.cookie = 'CSRF=custom-value; path=/';
			const transportr = new Transportr(server.url);

			const { headers } = await transportr.get('/echo', { xsrf: { cookieName: 'CSRF', headerName: 'x-csrf' } }) as unknown as Echo;

			expect(headers['x-csrf']).toBe('custom-value');
			expect(headers).not.toHaveProperty('x-xsrf-token');
		});
	});

	describe('error body capture', () => {
		it('should attach the response body to the error by default', async () => {
			const transportr = new Transportr(server.url);

			await expect(transportr.get('/status/500')).rejects.toMatchObject({ statusCode: 500, entity: expect.stringContaining('expected failure') });
		});

		it('should omit the response body when captureErrorBody is false', async () => {
			const transportr = new Transportr(server.url);

			const error = await transportr.get('/status/500', { captureErrorBody: false }).catch((cause: HttpError) => cause);

			expect(error).toBeInstanceOf(HttpError);
			expect((error as HttpError).statusCode).toBe(500);
			expect((error as HttpError).entity).toBeUndefined();
		});
	});

	describe('timeout', () => {
		it('should reject with the synthetic gateway timeout status', async () => {
			const transportr = new Transportr(server.url);

			await expect(transportr.get('/delay/2000', { timeout: 30 })).rejects.toMatchObject({ statusCode: 504 });
		});

		it('should not time out a request that completes in time', async () => {
			const transportr = new Transportr(server.url);

			await expect(transportr.get('/json', { timeout: 2000 })).resolves.toHaveProperty('firstName', 'Miles');
		});
	});

	describe('responses without a content type', () => {
		it('should resolve to undefined when no handler can be selected', async () => {
			const transportr = new Transportr(server.url);

			await expect(transportr.get('/no-content-type')).resolves.toBeUndefined();
		});

		it('should still expose the raw response through request()', async () => {
			const transportr = new Transportr(server.url);

			const response = await transportr.request('/no-content-type') as Response;

			expect(response.ok).toBe(true);
			expect(response.headers.get('content-type')).toBeNull();
			await expect(response.text()).resolves.toBe('untyped payload');
		});
	});
});
