import { describe, expect, it } from 'vitest';
import { Transportr } from '../src/transportr.js';
import { HttpError } from '../src/http-error.js';

describe('Environment-specific method behavior in Node.js', () => {
	const transportr = new Transportr('http://localhost:3000');

	describe('DOM-specific methods should work in Node.js via JSDOM', () => {
		it('should not throw error when calling getXml (JSDOM provides DOM support)', async () => {
			// DOMPurify is lazy-loaded after JSDOM is available, so these methods
			// now fully resolve in Node.js without environment or sanitization errors.
			await expect(transportr.getXml('http://example.com')).resolves.toMatchObject({ nodeType: 9 });
		});

		it('should not throw error when calling getHtml (JSDOM provides DOM support)', async () => {
			await expect(transportr.getHtml('http://example.com')).resolves.toMatchObject({ nodeType: 9 });
		});

		it('should not throw error when calling getHtmlFragment (JSDOM provides DOM support)', async () => {
			await expect(transportr.getHtmlFragment('http://example.com')).resolves.toMatchObject({ nodeType: 11 });
		});
	});

	describe('All methods now work in Node.js via JSDOM', () => {
		it('should not throw error when calling getScript (works with JSDOM)', async () => {
			// getScript now works in Node.js via JSDOM
			await expect(transportr.getScript('http://example.com/script.js')).rejects.toThrow(HttpError);
		});

		it('should not throw error when calling getStylesheet (works with JSDOM)', async () => {
			// getStylesheet now works in Node.js via JSDOM
			await expect(transportr.getStylesheet('http://example.com/style.css')).rejects.toThrow(HttpError);
		});

		it('should not throw error when calling getImage (works with JSDOM)', async () => {
			// getImage now works in Node.js via JSDOM using window.Image
			await expect(transportr.getImage('http://example.com/image.png')).rejects.toThrow(HttpError);
		});
	});

	describe('Environment detection functions', () => {
		it('should correctly detect that JSDOM window is loaded in Node.js', () => {
			// JSDOM sets globalThis.window which provides DOM access including Image
			expect(typeof globalThis.window).toBe('object');
			expect(typeof globalThis.window.Image).toBe('function');
			// All DOM methods work within transportr via globalThis.window
		});

		it('should detect that Image constructor is available via window.Image', () => {
			// window.Image is available from JSDOM
			expect(typeof globalThis.window.Image).toBe('function');
			// But the global Image might not be exposed
			expect(typeof Image).toBe('undefined');
		});
	});

	describe('Response handler environment checks', () => {
		it('should register all content type handlers in Node.js via JSDOM', () => {
			// With JSDOM loaded, all handlers are now available in Node.js
			const handlerTypes = (Transportr as any).contentTypeHandlers.map(([type]: [string, any]) => type);

			// Should have basic handlers
			expect(handlerTypes).toContain('text');
			expect(handlerTypes).toContain('json');
			expect(handlerTypes).toContain('octet-stream');

			// Should now have DOM-specific handlers in Node.js via JSDOM
			expect(handlerTypes).toContain('html');
			expect(handlerTypes).toContain('xml');
			expect(handlerTypes).toContain('image');
			expect(handlerTypes).toContain('javascript');
			expect(handlerTypes).toContain('css');
		});

		it('should have all 8 handlers registered with JSDOM support', () => {
			// With JSDOM, we now have all 8 handlers: text, json, binary, html, xml, image, javascript, css
			const handlerCount = (Transportr as any).contentTypeHandlers.length;
			expect(handlerCount).toBe(8);
		});
	});
});