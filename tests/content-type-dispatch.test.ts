import { describe, expect, it, vi, afterEach } from 'vitest';
import { Transportr } from '../src/transportr.js';

describe('Content type handler dispatch (jsdom)', () => {
	const transportr = new Transportr('http://localhost');

	/**
	 * Stubs fetch with a single real Response so the handler under test does real work.
	 * @param body The response body.
	 * @param contentType The response content type.
	 */
	const respondWith = (body: BodyInit, contentType: string): void => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(body, { status: 200, headers: { 'content-type': contentType } }));
	};

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should handle text/plain content type', async () => {
		respondWith('hello world', 'text/plain');

		await expect(transportr.get('/test')).resolves.toBe('hello world');
	});

	it('should handle application/json content type', async () => {
		respondWith('{"ok":true}', 'application/json');

		await expect(transportr.get('/test')).resolves.toEqual({ ok: true });
	});

	it('should handle application/octet-stream content type', async () => {
		respondWith(new Uint8Array([ 1, 2, 3 ]), 'application/octet-stream');

		const stream = await transportr.get('/file') as ReadableStream<Uint8Array>;
		const bytes: number[] = [];
		for await (const chunk of stream) { bytes.push(...chunk) }

		expect(bytes).toEqual([ 1, 2, 3 ]);
	});

	it('should handle text/html content type', async () => {
		respondWith('<html><body><p id="greeting">hello</p></body></html>', 'text/html');

		const document_ = await transportr.get('/page') as Document;

		expect(document_.querySelector('#greeting')?.textContent).toBe('hello');
	});

	it('should handle application/xml content type', async () => {
		respondWith('<root><item>1</item></root>', 'application/xml');

		const document_ = await transportr.get('/data.xml') as Document;

		expect(document_.documentElement.nodeName).toBe('root');
		expect(document_.querySelector('item')?.textContent).toBe('1');
	});

	it('should dispatch to a registered custom content type handler', async () => {
		const handler = vi.fn(async (response: Response) => `handled:${await response.text()}`);
		Transportr.registerContentTypeHandler('application/x-test-browser', handler);
		respondWith('payload', 'application/x-test-browser');

		try {
			await expect(transportr.get('/test')).resolves.toBe('handled:payload');
			expect(handler).toHaveBeenCalledTimes(1);
		} finally {
			Transportr.unregisterContentTypeHandler('application/x-test-browser');
		}
	});

	it('should stop dispatching to a handler once it is unregistered', async () => {
		const handler = vi.fn(async () => 'handled');
		Transportr.registerContentTypeHandler('application/x-test-browser', handler);
		Transportr.unregisterContentTypeHandler('application/x-test-browser');
		respondWith('payload', 'application/x-test-browser');

		await transportr.get('/test');

		expect(handler).not.toHaveBeenCalled();
	});
});
