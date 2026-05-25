import { describe, expect, it, beforeAll, vi } from 'vitest';

describe('Browser Environment Content Handlers', () => {
	beforeAll(() => {
		// Mock browser environment globals that might not be available in jsdom
		if (typeof global.Image === 'undefined') {
			global.Image = vi.fn().mockImplementation(() => ({
				onload: null,
				onerror: null,
				src: ''
			}));
		}

		// Ensure URL.createObjectURL is available (should already be mocked in setup)
		if (!global.URL.createObjectURL) {
			global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
		}

		if (!global.URL.revokeObjectURL) {
			global.URL.revokeObjectURL = vi.fn();
		}
	});

	it('should handle text/plain content type', async () => {
		const { Transportr } = await import('../src/transportr.js');
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response('hello world', { status: 200, headers: { 'content-type': 'text/plain' } })
		);
		const transportr = new Transportr('http://localhost');
		const result = await transportr.get('/test');
		expect(result).toBe('hello world');
		vi.restoreAllMocks();
	});

	it('should handle application/json content type', async () => {
		const { Transportr } = await import('../src/transportr.js');
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } })
		);
		const transportr = new Transportr('http://localhost');
		const result = await transportr.get('/test');
		expect(result).toEqual({ ok: true });
		vi.restoreAllMocks();
	});

	it('should handle application/octet-stream content type', async () => {
		const { Transportr } = await import('../src/transportr.js');
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(new Uint8Array([1, 2, 3]).buffer, { status: 200, headers: { 'content-type': 'application/octet-stream' } })
		);
		const transportr = new Transportr('http://localhost');
		const result = await transportr.get('/file');
		expect(result).toBeDefined();
		vi.restoreAllMocks();
	});

	it('should handle text/html content type', async () => {
		const { Transportr } = await import('../src/transportr.js');
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response('<html><body>hello</body></html>', { status: 200, headers: { 'content-type': 'text/html' } })
		);
		const transportr = new Transportr('http://localhost');
		const result = await transportr.get('/page');
		expect(result).toBeDefined();
		vi.restoreAllMocks();
	});

	it('should handle application/xml content type', async () => {
		const { Transportr } = await import('../src/transportr.js');
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response('<root><item>1</item></root>', { status: 200, headers: { 'content-type': 'application/xml' } })
		);
		const transportr = new Transportr('http://localhost');
		const result = await transportr.get('/data.xml');
		expect(result).toBeDefined();
		vi.restoreAllMocks();
	});

	it('should properly detect browser environment when all APIs are available', async () => {
		const { Transportr } = await import('../src/transportr.js');

		// Create an instance to ensure all initialization code runs
		const transportr = new Transportr('http://localhost');

		// Verify the instance was created successfully
		expect(transportr).toBeInstanceOf(Transportr);
		expect(transportr.baseUrl).toBeInstanceOf(URL);
	});

	it('should have registered content type handlers in browser environment', async () => {
		const { Transportr } = await import('../src/transportr.js');
		// Behavioral: verify a custom handler can be registered and invoked
		const handler = vi.fn(async () => 'test');
		Transportr.registerContentTypeHandler('application/x-test-browser', handler);
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response('test', { status: 200, headers: { 'content-type': 'application/x-test-browser' } })
		);
		const transportr = new Transportr('http://localhost');
		const result = await transportr.get('/test');
		expect(result).toBe('test');
		Transportr.unregisterContentTypeHandler('application/x-test-browser');
		vi.restoreAllMocks();
	});
});
