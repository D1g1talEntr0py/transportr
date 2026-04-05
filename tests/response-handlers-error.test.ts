import { beforeEach, describe, expect, it, vi } from 'vitest';

// This file tests the ensureDom error path in response-handlers.ts.
// It must run in a Node.js environment where `document` is not globally available,
// and where jsdom is mocked to fail so we can test the catch() branch.

vi.mock('jsdom', () => { throw new Error('Cannot find module "jsdom"') });

describe('response-handlers ensureDom error path', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('should throw a helpful error when jsdom is unavailable in Node.js', async () => {
		// Temporarily remove document to simulate bare Node.js env
		const savedDocument = globalThis.document;
		const savedDOMParser = globalThis.DOMParser;
		const savedDocumentFragment = globalThis.DocumentFragment;

		try {
			delete (globalThis as any).document;
			delete (globalThis as any).DOMParser;
			delete (globalThis as any).DocumentFragment;

			// Re-import with fresh module state (vi.mock above will intercept jsdom import)
			const { handleHtml } = await import('../src/response-handlers.js');

			await expect(
				handleHtml(new Response('<p>test</p>', { headers: { 'content-type': 'text/html' } }))
			).rejects.toThrow('jsdom is required for HTML/XML/DOM features in Node.js environments');
		} finally {
			if (savedDocument !== undefined) { globalThis.document = savedDocument }
			if (savedDOMParser !== undefined) { globalThis.DOMParser = savedDOMParser }
			if (savedDocumentFragment !== undefined) { globalThis.DocumentFragment = savedDocumentFragment }
		}
	});
});
