/**
 * Browser-environment tests for response handlers that depend on a real HTML parser.
 *
 * These tests run in Chromium via Playwright and validate DOMPurify behaviour with
 * the browser's native HTML parser. jsdom is intentionally permissive and does not
 * reproduce the way Chrome/Firefox handle top-level script elements inside
 * DocumentFragments — making it unsuitable for verifying bypass preset correctness.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Transportr } from '../src/transportr.js';
import { ContentType } from '../src/content-type.js';

describe('Response Handlers (browser)', () => {
	const transportr = new Transportr('https://example.com');
	const mockFetch = vi.fn();

	beforeEach(() => {
		vi.stubGlobal('fetch', mockFetch);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		mockFetch.mockReset();
	});

	describe('getHtmlFragment — sanitizePreset', () => {
		it('should strip script tags by default (strict preset)', async () => {
			mockFetch.mockResolvedValue(new Response(
				'<p>Hello</p><script>alert("XSS")</script>',
				{ headers: { 'Content-Type': ContentType.HTML } }
			));

			const fragment = await transportr.getHtmlFragment('/test') as DocumentFragment;

			expect(fragment).toBeInstanceOf(DocumentFragment);
			expect(fragment.querySelector('p')?.textContent).toBe('Hello');
			expect(fragment.querySelector('script')).toBeNull();
		});

		it('should preserve a script-only fragment when sanitizePreset is bypass', async () => {
			mockFetch.mockResolvedValue(new Response(
				'<script>window.__transportr = true;</script>',
				{ headers: { 'Content-Type': ContentType.HTML } }
			));

			const fragment = await transportr.getHtmlFragment('/test', { sanitizePreset: 'bypass' }) as DocumentFragment;

			expect(fragment).toBeInstanceOf(DocumentFragment);
			const script = fragment.querySelector('script');
			expect(script).not.toBeNull();
			expect(script?.textContent).toContain('window.__transportr = true;');
		});

		it('should preserve a leading script tag when sanitizePreset is bypass', async () => {
			mockFetch.mockResolvedValue(new Response(
				'<script src="/bootstrap.js"></script><p>Hello</p>',
				{ headers: { 'Content-Type': ContentType.HTML } }
			));

			const fragment = await transportr.getHtmlFragment('/test', { sanitizePreset: 'bypass' }) as DocumentFragment;

			expect(fragment).toBeInstanceOf(DocumentFragment);
			const script = fragment.querySelector('script');
			expect(script).not.toBeNull();
			expect(script?.getAttribute('src')).toBe('/bootstrap.js');
			expect(fragment.querySelector('p')?.textContent).toBe('Hello');
		});

		it('should preserve a trailing script alongside other elements when sanitizePreset is bypass', async () => {
			mockFetch.mockResolvedValue(new Response(
				'<p>Hello</p><script src="/app.js" type="text/javascript"></script>',
				{ headers: { 'Content-Type': ContentType.HTML } }
			));

			const fragment = await transportr.getHtmlFragment('/test', { sanitizePreset: 'bypass' }) as DocumentFragment;

			expect(fragment).toBeInstanceOf(DocumentFragment);
			const script = fragment.querySelector('script');
			expect(script).not.toBeNull();
			expect(script?.getAttribute('src')).toBe('/app.js');
			expect(script?.getAttribute('type')).toBe('text/javascript');
		});

		it('should preserve inline event handlers when sanitizePreset is bypass', async () => {
			mockFetch.mockResolvedValue(new Response(
				'<p onclick="handleClick()">Hello</p><script src="/app.js"></script>',
				{ headers: { 'Content-Type': ContentType.HTML } }
			));

			const fragment = await transportr.getHtmlFragment('/test', { sanitizePreset: 'bypass' }) as DocumentFragment;

			expect(fragment).toBeInstanceOf(DocumentFragment);
			// Full bypass — event handlers are preserved along with scripts
			expect(fragment.querySelector('p')?.getAttribute('onclick')).toBe('handleClick()');
			expect(fragment.querySelector('script')).not.toBeNull();
		});

		it('should preserve multiple scripts in a fragment when sanitizePreset is bypass', async () => {
			mockFetch.mockResolvedValue(new Response(
				'<script src="/a.js"></script><script src="/b.js"></script>',
				{ headers: { 'Content-Type': ContentType.HTML } }
			));

			const fragment = await transportr.getHtmlFragment('/test', { sanitizePreset: 'bypass' }) as DocumentFragment;

			expect(fragment).toBeInstanceOf(DocumentFragment);
			const scripts = fragment.querySelectorAll('script');
			expect(scripts).toHaveLength(2);
			expect(scripts[0]?.getAttribute('src')).toBe('/a.js');
			expect(scripts[1]?.getAttribute('src')).toBe('/b.js');
		});

		it('should preserve script templates with non-JS type when sanitizePreset is bypass', async () => {
			mockFetch.mockResolvedValue(new Response(
				'<script id="tmpl" type="text/x-jquery-tmpl"><div class="row">{{each items}}<span>${$value}</span>{{/each}}</div></script>',
				{ headers: { 'Content-Type': ContentType.HTML } }
			));

			const fragment = await transportr.getHtmlFragment('/test', { sanitizePreset: 'bypass' }) as DocumentFragment;

			expect(fragment).toBeInstanceOf(DocumentFragment);
			const script = fragment.querySelector('#tmpl');
			expect(script).not.toBeNull();
			expect(script?.getAttribute('type')).toBe('text/x-jquery-tmpl');
			expect(script?.textContent).toContain('each items');
		});

		it('should preserve template scripts without bypass when sanitization policy enables preserveTemplateScripts', async () => {
			mockFetch.mockResolvedValue(new Response(
				'<p onclick="run()">Hello</p><script id="tmpl" type="text/x-jquery-tmpl"><div>{{each items}}<span>${$value}</span>{{/each}}</div></script><script>alert("XSS")</script>',
				{ headers: { 'Content-Type': ContentType.HTML } }
			));

			const fragment = await transportr.getHtmlFragment('/test', {
				sanitization: {
					preserveTemplateScripts: true
				}
			}) as DocumentFragment;

			expect(fragment).toBeInstanceOf(DocumentFragment);
			expect(fragment.querySelector('p')?.getAttribute('onclick')).toBeNull();
			expect(fragment.querySelectorAll('script')).toHaveLength(1);
			expect(fragment.querySelector('#tmpl')?.getAttribute('type')).toBe('text/x-jquery-tmpl');
		});

		it('should preserve script with async and defer attributes when sanitizePreset is bypass', async () => {
			mockFetch.mockResolvedValue(new Response(
				'<script src="/bundle.js" async defer></script>',
				{ headers: { 'Content-Type': ContentType.HTML } }
			));

			const fragment = await transportr.getHtmlFragment('/test', { sanitizePreset: 'bypass' }) as DocumentFragment;

			expect(fragment).toBeInstanceOf(DocumentFragment);
			const script = fragment.querySelector('script');
			expect(script).not.toBeNull();
			expect(script?.hasAttribute('async')).toBe(true);
			expect(script?.hasAttribute('defer')).toBe(true);
		});

		it('should respect sanitizePreset from instance defaults', async () => {
			mockFetch.mockResolvedValue(new Response(
				'<script>window.__fromInstance = true;</script>',
				{ headers: { 'Content-Type': ContentType.HTML } }
			));

			const client = new Transportr('https://example.com', { sanitizePreset: 'bypass' });
			const fragment = await client.getHtmlFragment('/test') as DocumentFragment;

			expect(fragment).toBeInstanceOf(DocumentFragment);
			const script = fragment.querySelector('script');
			expect(script).not.toBeNull();
			expect(script?.textContent).toContain('window.__fromInstance = true;');
		});

		it('should allow per-request sanitizePreset to override instance default', async () => {
			mockFetch.mockResolvedValue(new Response(
				'<p>Hello</p><script src="/bundle.js"></script>',
				{ headers: { 'Content-Type': ContentType.HTML } }
			));

			const client = new Transportr('https://example.com', { sanitizePreset: 'bypass' });
			const fragment = await client.getHtmlFragment('/test', { sanitizePreset: 'strict' }) as DocumentFragment;

			expect(fragment).toBeInstanceOf(DocumentFragment);
			expect(fragment.querySelector('script')).toBeNull();
			expect(fragment.querySelector('p')?.textContent).toBe('Hello');
		});

		it('should bypass sanitization when sanitizePreset is bypass', async () => {
			mockFetch.mockResolvedValue(new Response(
				'<p onclick="run()">Hello</p><script src="/preset.js"></script>',
				{ headers: { 'Content-Type': ContentType.HTML } }
			));

			const fragment = await transportr.getHtmlFragment('/test', { sanitizePreset: 'bypass' }) as DocumentFragment;

			expect(fragment).toBeInstanceOf(DocumentFragment);
			expect(fragment.querySelector('p')?.getAttribute('onclick')).toBe('run()');
			expect(fragment.querySelector('script')?.getAttribute('src')).toBe('/preset.js');
		});

		it('should prioritize per-request sanitizePreset over instance sanitizePreset', async () => {
			mockFetch.mockResolvedValue(new Response(
				'<p>Hello</p><script src="/app.js"></script>',
				{ headers: { 'Content-Type': ContentType.HTML } }
			));

			const client = new Transportr('https://example.com', { sanitizePreset: 'bypass' });
			const fragment = await client.getHtmlFragment('/test', { sanitizePreset: 'strict' }) as DocumentFragment;

			expect(fragment).toBeInstanceOf(DocumentFragment);
			expect(fragment.querySelector('script')).toBeNull();
		});
	});

	// jsdom never fetches subresources, so `<script>`, `<link>` and `<img>` built from object URLs
	// never emit load/error events there. Only a real browser can exercise these success paths.
	describe('resource-loading handlers', () => {
		afterEach(() => {
			for (const link of document.head.querySelectorAll('link[rel="stylesheet"]')) { link.remove() }
			Reflect.deleteProperty(globalThis, '__transportrScriptRan');
		});

		it('should execute the script and remove the injected element', async () => {
			mockFetch.mockResolvedValue(new Response(
				'globalThis.__transportrScriptRan = true;',
				{ headers: { 'Content-Type': ContentType.JAVA_SCRIPT } }
			));

			await transportr.getScript('/script.js');

			expect(Reflect.get(globalThis, '__transportrScriptRan')).toBe(true);
			expect(document.head.querySelector('script[src^="blob:"]')).toBeNull();
		});

		it('should apply the stylesheet to the document', async () => {
			mockFetch.mockResolvedValue(new Response(
				'body { color: rgb(1, 2, 3); }',
				{ headers: { 'Content-Type': ContentType.CSS } }
			));

			await transportr.getStylesheet('/style.css');

			expect(getComputedStyle(document.body).color).toBe('rgb(1, 2, 3)');
		});

		it('should resolve to a decoded image element', async () => {
			// A real 1x1 transparent PNG.
			const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='), (character) => character.charCodeAt(0));
			mockFetch.mockResolvedValue(new Response(png, { headers: { 'Content-Type': ContentType.PNG } }));

			const image = await transportr.getImage('/image.png') as HTMLImageElement;

			expect(image).toBeInstanceOf(HTMLImageElement);
			expect(image.naturalWidth).toBe(1);
			expect(image.naturalHeight).toBe(1);
		});

		it('should reject when the payload cannot be decoded as an image', async () => {
			mockFetch.mockResolvedValue(new Response('not an image', { headers: { 'Content-Type': ContentType.PNG } }));

			await expect(transportr.getImage('/image.png')).rejects.toMatchObject({ cause: { message: 'Image failed to load' } });
		});
	});

	describe('getXml', () => {
		it('should preserve the XML vocabulary while stripping dangerous nodes', async () => {
			mockFetch.mockResolvedValue(new Response(
				'<?xml version="1.0" encoding="UTF-8"?><catalog xmlns="urn:example:catalog"><artist id="1" ref="a"><name>Miles Davis</name></artist><script>alert("XSS")</script><note onclick="alert(1)">hi</note></catalog>',
				{ headers: { 'Content-Type': ContentType.XML } }
			));

			const document_ = await transportr.getXml('/catalog.xml') as Document;

			expect(document_.querySelector('parsererror')).toBeNull();
			expect(document_.documentElement.nodeName).toBe('catalog');
			expect(document_.documentElement.namespaceURI).toBe('urn:example:catalog');
			expect(document_.querySelector('artist')?.getAttribute('ref')).toBe('a');
			expect(document_.querySelector('name')?.textContent).toBe('Miles Davis');
			expect(document_.querySelector('script')).toBeNull();
			expect(document_.querySelector('note')?.getAttribute('onclick')).toBeNull();
		});
	});
});
