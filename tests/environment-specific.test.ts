import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { Transportr } from '../src/transportr.js';
import { HttpError } from '../src/http-error.js';
import { startTestServer, type TestServer } from './scripts/server.js';

describe('Environment-specific method behavior in Node.js', () => {
	let server: TestServer;
	let transportr: Transportr;

	beforeAll(async () => {
		server = await startTestServer();
		transportr = new Transportr(server.url);
	});

	afterAll(async () => { await server.close() });

	afterEach(() => { server.reset() });

	describe('DOM-specific methods should work in Node.js via JSDOM', () => {
		it('should parse an HTML document with its content intact', async () => {
			const document_ = await transportr.getHtml('/html') as Document;

			expect(document_.nodeType).toBe(9);
			expect(document_.title).toBe('Test Page');
			expect(document_.querySelector('#heading')?.textContent).toBe('Transportr');
			expect(document_.querySelector('.content')?.textContent).toBe('Hello');
		});

		it('should strip scripts and inline event handlers under the default sanitization policy', async () => {
			const document_ = await transportr.getHtml('/html') as Document;

			expect(document_.querySelectorAll('script')).toHaveLength(0);
			expect(document_.querySelector('#clickable')?.getAttribute('onclick')).toBeNull();
		});

		it('should parse an HTML fragment with its content intact', async () => {
			const fragment = await transportr.getHtmlFragment('/html') as DocumentFragment;

			expect(fragment.nodeType).toBe(11);
			expect(fragment.querySelector('#heading')?.textContent).toBe('Transportr');
			expect(fragment.querySelectorAll('script')).toHaveLength(0);
		});

		it('should parse an XML document with its elements and attributes intact', async () => {
			const document_ = await transportr.getXml('/xml') as Document;

			expect(document_.nodeType).toBe(9);
			expect(document_.documentElement.nodeName).toBe('catalog');
			expect(document_.querySelector('artist')?.getAttribute('id')).toBe('1');
			expect(document_.querySelector('name')?.textContent).toBe('Miles Davis');
		});
	});

	describe('Resource-loading methods propagate HTTP errors', () => {
		// JSDOM does not fetch subresources, so `<script>`, `<link>` and `<img>` never emit
		// load/error events. The success paths for these handlers are covered by the browser project.
		it('should reject with an HttpError when the script resource is missing', async () => {
			await expect(transportr.getScript('/status/404')).rejects.toThrow(HttpError);
			await expect(transportr.getScript('/status/404')).rejects.toMatchObject({ statusCode: 404 });
		});

		it('should reject with an HttpError when the stylesheet resource is missing', async () => {
			await expect(transportr.getStylesheet('/status/404')).rejects.toMatchObject({ statusCode: 404 });
		});

		it('should reject with an HttpError when the image resource is missing', async () => {
			await expect(transportr.getImage('/status/404')).rejects.toMatchObject({ statusCode: 404 });
		});
	});

	describe('Environment detection functions', () => {
		it('should correctly detect that JSDOM window is loaded in Node.js', () => {
			// JSDOM sets globalThis.window which provides DOM access including Image
			expect(typeof globalThis.window).toBe('object');
			expect(typeof globalThis.window.Image).toBe('function');
		});

		it('should detect that Image constructor is available via window.Image', () => {
			expect(typeof globalThis.window.Image).toBe('function');
			// But the global Image is not exposed
			expect(typeof Image).toBe('undefined');
		});
	});

	describe('Response handler environment checks', () => {
		it('should handle text/plain content type in Node.js', async () => {
			await expect(transportr.get('/text')).resolves.toBe('hello');
		});

		it('should handle application/json content type in Node.js', async () => {
			await expect(transportr.get('/json')).resolves.toEqual({ id: '1', firstName: 'Miles', lastName: 'Davis' });
		});

		it('should handle application/octet-stream content type in Node.js', async () => {
			const stream = await transportr.get('/binary') as ReadableStream<Uint8Array>;

			expect(stream).toBeInstanceOf(ReadableStream);

			const bytes: number[] = [];
			for await (const chunk of stream) { bytes.push(...chunk) }

			expect(bytes).toEqual([ 1, 2, 3 ]);
		});

		it('should select the handler from the response content type rather than the request path', async () => {
			// `/echo` has no file extension yet still returns JSON because the handler is content-type driven.
			await expect(transportr.get('/echo?id=7')).resolves.toMatchObject({ query: { id: '7' } });
		});
	});
});
