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

	it('should include browser-specific content type handlers when browser environment is available', async () => {
		// Re-import Transportr after setting up the browser environment mocks
		const { Transportr } = await import('../src/transportr.js');

		// Access the private contentTypeHandlers property
		const contentTypeHandlers = (Transportr as any).contentTypeHandlers;
		const handlerTypes = contentTypeHandlers.map(([type]: [string, any]) => type);

		// Should have basic handlers
		expect(handlerTypes).toContain('text');
		expect(handlerTypes).toContain('json');
		expect(handlerTypes).toContain('octet-stream');

		// Should have DOM-specific handlers
		expect(handlerTypes).toContain('html');
		expect(handlerTypes).toContain('xml');

		// Should have browser-specific handlers (these are the lines 166-168 we want to cover)
		expect(handlerTypes).toContain('image'); // PNG handler
		expect(handlerTypes).toContain('javascript'); // JS handler
		expect(handlerTypes).toContain('css'); // CSS handler

		// Should have more handlers than just the basic 3
		expect(contentTypeHandlers.length).toBeGreaterThan(3);
	});

	it('should properly detect browser environment when all APIs are available', async () => {
		const { Transportr } = await import('../src/transportr.js');

		// Create an instance to ensure all initialization code runs
		const transportr = new Transportr('http://localhost');

		// Verify the instance was created successfully
		expect(transportr).toBeInstanceOf(Transportr);
		expect(transportr.baseUrl).toBeInstanceOf(URL);

		// The fact that we can create an instance means the browser environment
		// detection worked and the contentTypeHandlers were properly initialized
		const contentTypeHandlers = (Transportr as any).contentTypeHandlers;
		expect(Array.isArray(contentTypeHandlers)).toBe(true);
		expect(contentTypeHandlers.length).toBeGreaterThanOrEqual(6); // 3 basic + 2 DOM + 3 browser = 8 total
	});

	it('should have all expected content type handlers in browser environment', async () => {
		const { Transportr } = await import('../src/transportr.js');

		const contentTypeHandlers = (Transportr as any).contentTypeHandlers;

		// Verify we have the expected number of handlers (3 basic + 2 DOM + 3 browser = 8)
		expect(contentTypeHandlers).toHaveLength(8);

		// Verify each handler is a valid [string, function] pair
		contentTypeHandlers.forEach(([type, handler]: [string, Function]) => {
			expect(typeof type).toBe('string');
			expect(typeof handler).toBe('function');
			expect(type.length).toBeGreaterThan(0);
		});
	});
});