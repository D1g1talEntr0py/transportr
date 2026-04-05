import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { Transportr } from '../src/transportr';
import { ContentType } from '../src/content-type';

// Helper to read blob content for tests
const readBlobAsText = (blob: Blob): Promise<string> => {
	return new Promise((resolve, reject) => {
		// In Node.js test environment, we can directly convert the blob to text
		// since it's actually a Node.js Blob with a text() method
		if ('text' in blob && typeof (blob as any).text === 'function') {
			(blob as any).text().then(resolve).catch(reject);
		} else {
			// Fallback to FileReader approach
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = reject;
			reader.readAsText(blob);
		}
	});
};

describe('Response Handlers', () => {
	const transportr = new Transportr('https://example.com');

	// Mock native fetch
	const mockFetch = vi.fn();
	beforeEach(() => {
		global.fetch = mockFetch;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should handle and sanitize HTML responses', async () => {
		const maliciousHtml = '<h1>Hello</h1><script>alert("XSS")</script>';
		const mockResponse = new Response(maliciousHtml, {
			headers: { 'Content-Type': ContentType.HTML }
		});
		mockFetch.mockResolvedValue(mockResponse);

		const doc = await transportr.getHtml('/test') as Document;

		expect(doc).toBeInstanceOf(Document);
		// The h1 should be present
		expect(doc.querySelector('h1')).not.toBeNull();
		expect(doc.querySelector('h1')?.textContent).toBe('Hello');
		// The script tag should have been removed by DOMPurify
		expect(doc.querySelector('script')).toBeNull();
	});

	it('should handle and sanitize XML responses', async () => {
		// JSDOM's DOMParser + DOMPurify might not perfectly handle XML, but it should prevent script injection.
		const maliciousXml = '<root><user>test</user><script>alert("XSS")</script></root>';
		const mockResponse = new Response(maliciousXml, {
			headers: { 'Content-Type': ContentType.XML }
		});
		mockFetch.mockResolvedValue(mockResponse);

		const doc = await transportr.getXml('/test') as Document;

		expect(doc).toBeInstanceOf(Document);
		// After sanitization, the script tag should be gone.
		// Note: Depending on the strictness of the parser in this env, other tags might be affected.
		// The primary goal is ensuring the script is removed.
		expect(doc.querySelector('script')).toBeNull();
		// We can check if the 'user' tag survived, but the main point is security.
		const userTag = doc.querySelector('user');
		if (userTag) {
			expect(userTag.textContent).toBe('test');
		}
	});

	it('should handle and sanitize HTML fragments', async () => {
		const maliciousFragment = '<b>Bold</b><img src="x" onerror="alert(\'XSS\')">';
		const mockResponse = new Response(maliciousFragment, {
			headers: { 'Content-Type': ContentType.HTML }
		});
		mockFetch.mockResolvedValue(mockResponse);

		const fragment = await transportr.getHtmlFragment('/test') as DocumentFragment;

		expect(fragment).toBeInstanceOf(DocumentFragment);
		expect(fragment.querySelector('b')).not.toBeNull();
		// DOMPurify removes the onerror attribute
		const img = fragment.querySelector('img');
		expect(img).not.toBeNull();
		expect(img?.hasAttribute('onerror')).toBe(false);
	});

	it('should handle blob responses', async () => {
		const expectedBlob = new Blob(['test data'], { type: 'application/octet-stream' });
		const mockResponse = {
			ok: true,
			status: 200,
			headers: new Headers({ 'Content-Type': 'application/octet-stream' }),
			blob: vi.fn().mockResolvedValue(expectedBlob)
		};
		mockFetch.mockResolvedValue(mockResponse);

		const blob = await transportr.getBlob('/test') as Blob;

		expect(blob.size).toBe(9);
		expect(await readBlobAsText(blob)).toBe('test data');
	});

	it('should handle image responses', async () => {
		// Create a dummy 1x1 pixel PNG blob
		const pixel = atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
		const buffer = new Uint8Array(pixel.length);
		for (let i = 0; i < pixel.length; i++) {
			buffer[i] = pixel.charCodeAt(i);
		}
		const blobData = new Blob([buffer], { type: 'image/png' });

		const mockResponse = {
			ok: true,
			status: 200,
			headers: new Headers({ 'Content-Type': 'image/png' }),
			blob: vi.fn().mockResolvedValue(blobData)
		};
		mockFetch.mockResolvedValue(mockResponse);

		// jsdom doesn't fire onload for Image elements, so we simulate it
		// by patching HTMLImageElement.prototype.src descriptor to trigger onload
		const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src')!;
		Object.defineProperty(HTMLImageElement.prototype, 'src', {
			set(value: string) {
				originalDescriptor.set!.call(this, value);
				queueMicrotask(() => (this as HTMLImageElement).onload?.(new Event('load') as unknown as never));
			},
			get() { return originalDescriptor.get!.call(this) as string },
			configurable: true
		});

		const image = await transportr.getImage('/test.png') as HTMLImageElement;

		// Restore original descriptor
		Object.defineProperty(HTMLImageElement.prototype, 'src', originalDescriptor);

		expect(image).toBeInstanceOf(HTMLImageElement);
		expect(image.src).toBe('blob:mock-url');
	});

	it('should handle image load error', async () => {
		const blobData = new Blob([new Uint8Array([0])], { type: 'image/png' });
		const mockResponse = {
			ok: true,
			status: 200,
			headers: new Headers({ 'Content-Type': 'image/png' }),
			blob: vi.fn().mockResolvedValue(blobData)
		};
		mockFetch.mockResolvedValue(mockResponse);

		// Patch src setter to trigger onerror instead of onload
		const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src')!;
		Object.defineProperty(HTMLImageElement.prototype, 'src', {
			set(value: string) {
				originalDescriptor.set!.call(this, value);
				queueMicrotask(() => (this as HTMLImageElement).onerror?.('Image failed to load', '', 0, 0, new Error('Image failed to load')));
			},
			get() { return originalDescriptor.get!.call(this) as string },
			configurable: true
		});

		await expect(transportr.getImage('/bad.png')).rejects.toThrow("An error has occurred with your request to: '/bad.png'");

		// Restore original descriptor
		Object.defineProperty(HTMLImageElement.prototype, 'src', originalDescriptor);
	});
});