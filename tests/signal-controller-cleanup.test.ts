import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { Transportr } from '../src/transportr.js';
import config from './scripts/config.js';

const apiBaseUrl = `https://${config.apiKey}.mockapi.io/artists`;

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

// Make a request
await transportr.get('/1');

// Clear any previous calls (though there shouldn't be any for success)
abortSpy.mockClear();

// Call abortAll - should not find any controllers to abort
Transportr.abortAll();

expect(abortSpy).not.toHaveBeenCalled();
});

it('should remove signal controller from Set after failed request', async () => {
const abortSpy = vi.spyOn(AbortController.prototype, 'abort');

// Make a request that will fail (invalid endpoint)
try {
await transportr.get('/nonexistent-endpoint-12345');
} catch (error) {
// Expected to fail
}

abortSpy.mockClear();

// Call abortAll - should not find any controllers to abort
Transportr.abortAll();

expect(abortSpy).not.toHaveBeenCalled();
}, 10000);

it('should remove signal controller from Set after aborted request', async () => {
const abortSpy = vi.spyOn(AbortController.prototype, 'abort');
const abortController = new AbortController();

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
Transportr.abortAll();

expect(abortSpy).not.toHaveBeenCalled();
});

it('should remove signal controller from Set after timeout', async () => {
const abortSpy = vi.spyOn(AbortController.prototype, 'abort');

// Make a request with very short timeout
try {
await transportr.get('/1', { timeout: 1 });
} catch (error) {
// Expected to timeout
}

abortSpy.mockClear();

// Call abortAll - should not find any controllers to abort
Transportr.abortAll();

expect(abortSpy).not.toHaveBeenCalled();
});

it('should handle multiple concurrent requests and clean up all signal controllers', async () => {
const abortSpy = vi.spyOn(AbortController.prototype, 'abort');

// Make multiple concurrent requests
await Promise.all([
transportr.get('/1'),
transportr.get('/2'),
transportr.get('/3')
]);

abortSpy.mockClear();

// Call abortAll - should not find any controllers to abort
Transportr.abortAll();

expect(abortSpy).not.toHaveBeenCalled();
}, 10000);

it('should handle mixed success and failure requests and clean up all signal controllers', async () => {
const abortSpy = vi.spyOn(AbortController.prototype, 'abort');

// Make mixed requests
const requests = [
transportr.get('/1'), // Success
transportr.get('/nonexistent-endpoint').catch(() => {}), // Failure
transportr.get('/2') // Success
];

await Promise.all(requests);

abortSpy.mockClear();

// Call abortAll - should not find any controllers to abort
Transportr.abortAll();

expect(abortSpy).not.toHaveBeenCalled();
}, 10000);

it('should not accumulate signal controllers over multiple sequential requests', async () => {
const abortSpy = vi.spyOn(AbortController.prototype, 'abort');

// Make sequential requests
for (let i = 1; i <= 5; i++) {
await transportr.get(`/${i}`);
}

abortSpy.mockClear();

// Call abortAll - should not find any controllers to abort
Transportr.abortAll();

expect(abortSpy).not.toHaveBeenCalled();
}, 30000);
});
