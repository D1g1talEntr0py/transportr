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
});
