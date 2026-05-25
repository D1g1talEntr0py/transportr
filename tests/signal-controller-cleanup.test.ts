import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { Transportr } from '../src/transportr.js';
const apiBaseUrl = 'https://example.mockapi.io/artists';

describe('SignalController Memory Management', () => {
let transportr: Transportr;

beforeEach(() => {
transportr = new Transportr(apiBaseUrl);
Transportr.abortAll();
});

afterEach(() => {
Transportr.abortAll();
vi.restoreAllMocks();
});

it('should remove signal controller from Set after successful request', async () => {
const abortSpy = vi.spyOn(AbortController.prototype, 'abort');
vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }));

// Make a request
await transportr.get('/1');

// Clear any previous calls (though there shouldn't be any for success)
abortSpy.mockClear();

// Call abortAll - should not find any controllers to abort
const callsBefore = abortSpy.mock.calls.length;
Transportr.abortAll();

expect(abortSpy.mock.calls.length - callsBefore).toBe(0);
});

it('should remove signal controller from Set after failed request', async () => {
const abortSpy = vi.spyOn(AbortController.prototype, 'abort');
vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Not Found', { status: 404, headers: { 'content-type': 'text/plain' } }));

// Make a request that will fail (invalid endpoint)
try {
await transportr.get('/nonexistent-endpoint-12345');
} catch (error) {
// Expected to fail
}

abortSpy.mockClear();

// Call abortAll - should not find any controllers to abort
const callsBefore = abortSpy.mock.calls.length;
Transportr.abortAll();

expect(abortSpy.mock.calls.length - callsBefore).toBe(0);
}, 10000);

it('should remove signal controller from Set after aborted request', async () => {
const abortSpy = vi.spyOn(AbortController.prototype, 'abort');
const abortController = new AbortController();
vi.spyOn(globalThis, 'fetch').mockImplementation((_input, init) => new Promise((_resolve, reject) => {
	if (init?.signal?.aborted) {
		reject(new DOMException('Aborted', 'AbortError'));
		return;
	}
	init?.signal?.addEventListener('abort', () => {
		reject(new DOMException('Aborted', 'AbortError'));
	}, { once: true });
}));

// Start a request
const requestPromise = transportr.get('/1', { signal: abortController.signal });

// Abort the request
abortController.abort();

// Wait for the request to fail
try {
await requestPromise;
} catch (error) {
// Expected to fail
}

abortSpy.mockClear();

// Call abortAll - should not find any controllers to abort
const callsBefore = abortSpy.mock.calls.length;
Transportr.abortAll();

expect(abortSpy.mock.calls.length - callsBefore).toBe(0);
});

it('should remove signal controller from Set after timeout', async () => {
const abortSpy = vi.spyOn(AbortController.prototype, 'abort');
vi.spyOn(globalThis, 'fetch').mockImplementation((_input, init) => new Promise((_resolve, reject) => {
	init?.signal?.addEventListener('abort', () => {
		reject(new DOMException('Timeout', 'TimeoutError'));
	}, { once: true });
}));

// Make a request with very short timeout
try {
await transportr.get('/1', { timeout: 1 });
} catch (error) {
// Expected to timeout
}

abortSpy.mockClear();

// Call abortAll - should not find any controllers to abort
const callsBefore = abortSpy.mock.calls.length;
Transportr.abortAll();

expect(abortSpy.mock.calls.length - callsBefore).toBe(0);
});

it('should handle multiple concurrent requests and clean up all signal controllers', async () => {
const abortSpy = vi.spyOn(AbortController.prototype, 'abort');
vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
	const url = new URL(String(input));
	const id = url.pathname.split('/').filter(Boolean).at(-1) ?? '1';
	return new Response(JSON.stringify({ id }), { status: 200, headers: { 'content-type': 'application/json' } });
});

// Make multiple concurrent requests
await Promise.all([
transportr.get('/1'),
transportr.get('/2'),
transportr.get('/3')
]);

abortSpy.mockClear();

// Call abortAll - should not find any controllers to abort
const callsBefore = abortSpy.mock.calls.length;
Transportr.abortAll();

expect(abortSpy.mock.calls.length - callsBefore).toBe(0);
}, 10000);

it('should handle mixed success and failure requests and clean up all signal controllers', async () => {
const abortSpy = vi.spyOn(AbortController.prototype, 'abort');
vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
	const url = new URL(String(input));
	if (url.pathname.includes('nonexistent-endpoint')) {
		return new Response('Not Found', { status: 404, headers: { 'content-type': 'text/plain' } });
	}
	const id = url.pathname.split('/').filter(Boolean).at(-1) ?? '1';
	return new Response(JSON.stringify({ id }), { status: 200, headers: { 'content-type': 'application/json' } });
});

// Make mixed requests
const requests = [
transportr.get('/1'), // Success
transportr.get('/nonexistent-endpoint').catch(() => {}), // Failure
transportr.get('/2') // Success
];

await Promise.all(requests);

abortSpy.mockClear();

// Call abortAll - should not find any controllers to abort
const callsBefore = abortSpy.mock.calls.length;
Transportr.abortAll();

expect(abortSpy.mock.calls.length - callsBefore).toBe(0);
}, 10000);

it('should not accumulate signal controllers over multiple sequential requests', async () => {
const abortSpy = vi.spyOn(AbortController.prototype, 'abort');
vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
	const url = new URL(String(input));
	const id = url.pathname.split('/').filter(Boolean).at(-1) ?? '1';
	return new Response(JSON.stringify({ id }), { status: 200, headers: { 'content-type': 'application/json' } });
});

// Make sequential requests
for (let i = 1; i <= 5; i++) {
await transportr.get(`/${i}`);
}

abortSpy.mockClear();

// Call abortAll - should not find any controllers to abort
const callsBefore = abortSpy.mock.calls.length;
Transportr.abortAll();

expect(abortSpy.mock.calls.length - callsBefore).toBe(0);
}, 30000);
});
