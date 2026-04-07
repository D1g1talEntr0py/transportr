import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Transportr } from '../src/transportr.js';
import { HttpError } from '../src/http-error.js';

describe('Result Tuple (unwrap: false)', () => {
	const mockFetch = vi.fn();

	beforeEach(() => {
		global.fetch = mockFetch;
	});

	afterEach(() => {
		vi.restoreAllMocks();
		Transportr.unregisterAll();
	});

	it('should return [true, data] on success', async () => {
		const transportr = new Transportr('https://api.example.com');
		const responseBody = { id: 1, name: 'Alice' };
		mockFetch.mockResolvedValueOnce(new Response(JSON.stringify(responseBody), {
			status: 200,
			headers: { 'content-type': 'application/json' }
		}));

		const [ok, result] = await transportr.getJson('/users/1', { unwrap: false });

		expect(ok).toBe(true);
		expect(result).toEqual(responseBody);
	});

	it('should return [false, HttpError] on HTTP error', async () => {
		const transportr = new Transportr('https://api.example.com');
		mockFetch.mockResolvedValueOnce(new Response('Not Found', {
			status: 404,
			statusText: 'Not Found'
		}));

		const [ok, result] = await transportr.getJson('/users/999', { unwrap: false });

		expect(ok).toBe(false);
		expect(result).toBeInstanceOf(HttpError);
		expect((result as HttpError).statusCode).toBe(404);
	});

	it('should return [false, error] on network error', async () => {
		const transportr = new Transportr('https://api.example.com');
		mockFetch.mockRejectedValueOnce(new TypeError('Network error'));

		const [ok, result] = await transportr.get('/unreachable', { unwrap: false });

		expect(ok).toBe(false);
		expect(result).toBeTruthy();
	});

	it('should work with post method', async () => {
		const transportr = new Transportr('https://api.example.com');
		const responseBody = { id: 2, created: true };
		mockFetch.mockResolvedValueOnce(new Response(JSON.stringify(responseBody), {
			status: 201,
			headers: { 'content-type': 'application/json' }
		}));

		const [ok, result] = await transportr.post('/users', { name: 'Bob' }, {
			unwrap: false
		});

		expect(ok).toBe(true);
		expect(result).toEqual(responseBody);
	});

	it('should work with options passed as first argument', async () => {
		const transportr = new Transportr('https://api.example.com');
		const responseBody = { status: 'ok' };
		mockFetch.mockResolvedValueOnce(new Response(JSON.stringify(responseBody), {
			status: 200,
			headers: { 'content-type': 'application/json' }
		}));

		const [ok, result] = await transportr.getJson({ unwrap: false });

		expect(ok).toBe(true);
		expect(result).toEqual(responseBody);
	});

	it('should work with constructor-level unwrap: false', async () => {
		const transportr = new Transportr('https://api.example.com', { unwrap: false });

		mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), {
			status: 200,
			headers: { 'content-type': 'application/json' }
		}));

		const result = await transportr.getJson('/test');

		expect(Array.isArray(result)).toBe(true);
		const [ok, data] = result as [boolean, unknown];
		expect(ok).toBe(true);
		expect(data).toEqual({ ok: true });
	});

	it('should work with multiple sequential calls', async () => {
		const transportr = new Transportr('https://api.example.com');

		mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), {
			status: 200,
			headers: { 'content-type': 'application/json' }
		}));

		mockFetch.mockResolvedValueOnce(new Response('Error', {
			status: 500,
			statusText: 'Internal Server Error'
		}));

		const [ok1, result1] = await transportr.getJson('/ok', { unwrap: false });
		const [ok2, result2] = await transportr.getJson('/fail', { unwrap: false });

		expect(ok1).toBe(true);
		expect(result1).toEqual({ ok: true });
		expect(ok2).toBe(false);
		expect(result2).toBeInstanceOf(HttpError);
	});

	it('should work with options() method on success', async () => {
		const transportr = new Transportr('https://api.example.com');
		mockFetch.mockResolvedValueOnce(new Response(null, {
			status: 200,
			headers: { allow: 'GET, POST, PUT' }
		}));

		const [ok, result] = await transportr.options('/resource', { unwrap: false });

		expect(ok).toBe(true);
		expect(result).toEqual(['GET', 'POST', 'PUT']);
	});

	it('should work with options() method on error', async () => {
		const transportr = new Transportr('https://api.example.com');
		mockFetch.mockResolvedValueOnce(new Response('Forbidden', {
			status: 403,
			statusText: 'Forbidden'
		}));

		const [ok, result] = await transportr.options('/resource', { unwrap: false });

		expect(ok).toBe(false);
		expect(result).toBeInstanceOf(HttpError);
	});

	it('should work with request() method on success', async () => {
		const transportr = new Transportr('https://api.example.com');
		mockFetch.mockResolvedValueOnce(new Response('OK', {
			status: 200,
			headers: { 'content-type': 'text/plain' }
		}));

		const [ok, result] = await transportr.request('/resource', { unwrap: false });

		expect(ok).toBe(true);
		expect(result).toBeInstanceOf(Response);
	});

	it('should work with request() method on error', async () => {
		const transportr = new Transportr('https://api.example.com');
		mockFetch.mockResolvedValueOnce(new Response('Not Found', {
			status: 404,
			statusText: 'Not Found'
		}));

		const [ok, result] = await transportr.request('/missing', { unwrap: false });

		expect(ok).toBe(false);
		expect(result).toBeInstanceOf(HttpError);
	});

	it('should work with getEventStream() on success', async () => {
		const transportr = new Transportr('https://api.example.com');
		const encoder = new TextEncoder();
		const stream = new ReadableStream({
			start(controller) {
				controller.enqueue(encoder.encode('data: hello\n\n'));
				controller.close();
			}
		});
		mockFetch.mockResolvedValueOnce(new Response(stream, {
			status: 200,
			headers: { 'content-type': 'text/event-stream' }
		}));

		const [ok, result] = await transportr.getEventStream('/events', { unwrap: false });

		expect(ok).toBe(true);
		const events = [];
		for await (const event of result as AsyncIterable<unknown>) {
			events.push(event);
		}
		expect(events).toHaveLength(1);
	});

	it('should work with getEventStream() on error', async () => {
		const transportr = new Transportr('https://api.example.com');
		mockFetch.mockResolvedValueOnce(new Response('Unauthorized', {
			status: 401,
			statusText: 'Unauthorized'
		}));

		const [ok, result] = await transportr.getEventStream('/events', { unwrap: false });

		expect(ok).toBe(false);
		expect(result).toBeInstanceOf(HttpError);
	});

	it('should work with getJsonStream() on success', async () => {
		const transportr = new Transportr('https://api.example.com');
		const encoder = new TextEncoder();
		const stream = new ReadableStream({
			start(controller) {
				controller.enqueue(encoder.encode('{"id":1}\n'));
				controller.close();
			}
		});
		mockFetch.mockResolvedValueOnce(new Response(stream, {
			status: 200,
			headers: { 'content-type': 'application/x-ndjson' }
		}));

		const [ok, result] = await transportr.getJsonStream('/export', { unwrap: false });

		expect(ok).toBe(true);
		const records = [];
		for await (const record of result as AsyncIterable<unknown>) {
			records.push(record);
		}
		expect(records).toEqual([{ id: 1 }]);
	});

	it('should work with getJsonStream() on error', async () => {
		const transportr = new Transportr('https://api.example.com');
		mockFetch.mockResolvedValueOnce(new Response('Server Error', {
			status: 500,
			statusText: 'Internal Server Error'
		}));

		const [ok, result] = await transportr.getJsonStream('/export', { unwrap: false });

		expect(ok).toBe(false);
		expect(result).toBeInstanceOf(HttpError);
	});

	it('should early-return Result from getHtml with unwrap: false', async () => {
		const transportr = new Transportr('https://api.example.com');
		mockFetch.mockResolvedValueOnce(new Response('Not Found', {
			status: 404,
			statusText: 'Not Found'
		}));

		const [ok, result] = await transportr.getHtml('/page', { unwrap: false }, '#test');

		expect(ok).toBe(false);
		expect(result).toBeInstanceOf(HttpError);
	});

	it('should early-return Result from getHtmlFragment with unwrap: false', async () => {
		const transportr = new Transportr('https://api.example.com');
		mockFetch.mockResolvedValueOnce(new Response('Forbidden', {
			status: 403,
			statusText: 'Forbidden'
		}));

		const [ok, result] = await transportr.getHtmlFragment('/fragment', { unwrap: false }, '.item');

		expect(ok).toBe(false);
		expect(result).toBeInstanceOf(HttpError);
	});
});
