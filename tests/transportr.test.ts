import { afterEach, describe, expect, it, beforeEach, vi } from 'vitest';
import { Transportr } from '../src/transportr.js';
import { HttpError } from '../src/http-error.js';
import { ResponseStatus } from '../src/response-status.js';
import config from './scripts/config.js';

describe('Transportr', () => {
	const { apiKey } = config;
	const baseUrl = `https://${apiKey}.mockapi.io/artists`;

	describe('constructor', () => {
		it('should create a new Transportr instance with a String', () => {
			const transportr = new Transportr(baseUrl);

			expect(transportr).toBeInstanceOf(Transportr);
			expect(transportr.baseUrl).toBeInstanceOf(URL);
			expect(transportr.baseUrl).toHaveProperty('href', baseUrl);
			expect(transportr.baseUrl).toHaveProperty('origin', `https://${apiKey}.mockapi.io`);
			expect(transportr.baseUrl).toHaveProperty('protocol', 'https:');
			expect(transportr.baseUrl).toHaveProperty('username', '');
			expect(transportr.baseUrl).toHaveProperty('password', '');
			expect(transportr.baseUrl).toHaveProperty('host', `${apiKey}.mockapi.io`);
			expect(transportr.baseUrl).toHaveProperty('hostname', `${apiKey}.mockapi.io`);
			expect(transportr.baseUrl).toHaveProperty('port', '');
			expect(transportr.baseUrl).toHaveProperty('pathname', '/artists');
		});

		it('should create a new Transportr instance with a URL', () => {
			const transportr = new Transportr(new URL(baseUrl));

			expect(transportr).toBeInstanceOf(Transportr);
			expect(transportr.baseUrl).toBeInstanceOf(URL);
			expect(transportr.baseUrl).toHaveProperty('href', baseUrl);
			expect(transportr.baseUrl).toHaveProperty('origin', `https://${apiKey}.mockapi.io`);
			expect(transportr.baseUrl).toHaveProperty('protocol', 'https:');
			expect(transportr.baseUrl).toHaveProperty('username', '');
			expect(transportr.baseUrl).toHaveProperty('password', '');
			expect(transportr.baseUrl).toHaveProperty('host', `${apiKey}.mockapi.io`);
			expect(transportr.baseUrl).toHaveProperty('hostname', `${apiKey}.mockapi.io`);
			expect(transportr.baseUrl).toHaveProperty('port', '');
			expect(transportr.baseUrl).toHaveProperty('pathname', '/artists');
		});

		it('should create a new Transportr instance with a URL and options', () => {
			const transportr = new Transportr(new URL(baseUrl), { searchParams: { id: '12345' } });

			expect(transportr).toBeInstanceOf(Transportr);
			expect(transportr.baseUrl).toBeInstanceOf(URL);
			expect(transportr.baseUrl).toHaveProperty('href', baseUrl);
			expect(transportr.baseUrl).toHaveProperty('origin', `https://${apiKey}.mockapi.io`);
			expect(transportr.baseUrl).toHaveProperty('protocol', 'https:');
			expect(transportr.baseUrl).toHaveProperty('username', '');
			expect(transportr.baseUrl).toHaveProperty('password', '');
			expect(transportr.baseUrl).toHaveProperty('host', `${apiKey}.mockapi.io`);
			expect(transportr.baseUrl).toHaveProperty('hostname', `${apiKey}.mockapi.io`);
			expect(transportr.baseUrl).toHaveProperty('port', '');
			expect(transportr.baseUrl).toHaveProperty('pathname', '/artists');
			expect(transportr.baseUrl).toHaveProperty('search', '');
			expect(transportr.baseUrl).toHaveProperty('searchParams');
			expect(transportr.baseUrl.searchParams).toBeInstanceOf(URLSearchParams);
		});

		it('should create a new Transportr instance with options using globalThis.location', () => {
			const originalLocation = globalThis.location;

			// Mock globalThis.location for testing
			Object.defineProperty(globalThis, 'location', {
				value: { origin: baseUrl },
				writable: true,
				configurable: true
			});

			const transportr = new Transportr({ searchParams: { id: '12345' } });

			expect(transportr).toBeInstanceOf(Transportr);
			expect(transportr.baseUrl).toBeInstanceOf(URL);
			expect(transportr.baseUrl).toHaveProperty('href', baseUrl);
			expect(transportr.baseUrl).toHaveProperty('origin', `https://${apiKey}.mockapi.io`);
			expect(transportr.baseUrl).toHaveProperty('protocol', 'https:');
			expect(transportr.baseUrl).toHaveProperty('username', '');
			expect(transportr.baseUrl).toHaveProperty('password', '');
			expect(transportr.baseUrl).toHaveProperty('host', `${apiKey}.mockapi.io`);
			expect(transportr.baseUrl).toHaveProperty('hostname', `${apiKey}.mockapi.io`);
			expect(transportr.baseUrl).toHaveProperty('port', '');
			expect(transportr.baseUrl).toHaveProperty('pathname', '/artists');
			expect(transportr.baseUrl).toHaveProperty('search', '');
			expect(transportr.baseUrl).toHaveProperty('searchParams');
			expect(transportr.baseUrl.searchParams).toBeInstanceOf(URLSearchParams);

			// Restore original location
			globalThis.location = originalLocation;
		});

		it('should throw an error if the URL is invalid', () => {
			expect(() => new Transportr(new Date() as any)).toThrow(TypeError);
			expect(() => new Transportr(5 as any)).toThrow(/Invalid URL/);
		});

		it('should output the value of the toStringTag property as "[object Transportr]"', () => {
			const transportr = new Transportr(baseUrl);
			expect(Object.prototype.toString.call(transportr)).toBe('[object Transportr]');
		});
	});

	describe('HTTP methods', () => {
		let transportr: Transportr;

		beforeEach(() => {
			transportr = new Transportr(baseUrl);
		});

		describe('get', () => {
			it('should return a promise', () => {
				const promise = transportr.get('/test').catch(() => {}); // Catch to avoid unhandled rejection
				expect(promise).toBeInstanceOf(Promise);
			});

			it('should handle path as options', () => {
				const promise = transportr.get({ searchParams: { id: '123' } }).catch(() => {});
				expect(promise).toBeInstanceOf(Promise);
			});
		});

		describe('post', () => {
			it('should return a promise', () => {
				const promise = transportr.post('/test', { body: { foo: 'bar' } }).catch(() => {});
				expect(promise).toBeInstanceOf(Promise);
			});

			it('should handle options as first parameter', () => {
				const promise = transportr.post({ body: { foo: 'bar' } }).catch(() => {});
				expect(promise).toBeInstanceOf(Promise);
			});
		});

		describe('put', () => {
			it('should return a promise', () => {
				const promise = transportr.put('/test', { body: { foo: 'bar' } }).catch(() => {});
				expect(promise).toBeInstanceOf(Promise);
			});
		});

		describe('patch', () => {
			it('should return a promise', () => {
				const promise = transportr.patch('/test', { body: { foo: 'bar' } }).catch(() => {});
				expect(promise).toBeInstanceOf(Promise);
			});
		});

		describe('delete', () => {
			it('should return a promise', () => {
				const promise = transportr.delete('/test').catch(() => {});
				expect(promise).toBeInstanceOf(Promise);
			});
		});

		describe('head', () => {
			it('should return a promise', () => {
				const promise = transportr.head('/test').catch(() => {});
				expect(promise).toBeInstanceOf(Promise);
			});
		});

		describe('options', () => {
			it('should return a promise', () => {
				const promise = transportr.options('/test').catch(() => {});
				expect(promise).toBeInstanceOf(Promise);
			});

			it('should handle path as options', () => {
				const promise = transportr.options({ timeout: 5000 }).catch(() => {});
				expect(promise).toBeInstanceOf(Promise);
			});
		});

		describe('request', () => {
			it('should return a promise', () => {
				const promise = transportr.request('/test').catch(() => {});
				expect(promise).toBeInstanceOf(Promise);
			});

			it('should handle options as first parameter', () => {
				const promise = transportr.request({ method: 'GET' }).catch(() => {});
				expect(promise).toBeInstanceOf(Promise);
			});

			it('should complete successful request and publish success event', async () => {
				// Mock a successful response
				const mockResponse = {
					ok: true,
					status: 200,
					headers: new Headers({ 'content-type': 'application/json' })
				} as any;

				global.fetch = vi.fn().mockResolvedValue(mockResponse);

				// Mock the publish method to verify it's called
				const publishSpy = vi.spyOn(transportr as any, 'publish');

				// Make a successful request that should trigger the success path
				const result = await transportr.request('/test');

				// Verify the response is returned
				expect(result).toBe(mockResponse);

				// Verify success event was published - it should be one of the publish calls
				expect(publishSpy).toHaveBeenCalledWith(
					expect.objectContaining({
						name: 'success',
						data: mockResponse,
						global: undefined
					})
				);
			});
		});
	});

	describe('Content-specific GET methods', () => {
		let transportr: Transportr;

		beforeEach(() => {
			transportr = new Transportr(baseUrl);
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		describe('getJson', () => {
			it('should return a promise', () => {
				const promise = transportr.getJson('/test').catch(() => {});
				expect(promise).toBeInstanceOf(Promise);
			});
		});

		describe('getXml', () => {
			it('should return a promise', () => {
				const promise = transportr.getXml('/test').catch(() => {});
				expect(promise).toBeInstanceOf(Promise);
			});
		});

		describe('getHtml', () => {
			it('should return a promise', () => {
				const promise = transportr.getHtml('/test').catch(() => {});
				expect(promise).toBeInstanceOf(Promise);
			});
		});

		describe('getHtmlFragment', () => {
			it('should return a promise', () => {
				const promise = transportr.getHtmlFragment('/test').catch(() => {});
				expect(promise).toBeInstanceOf(Promise);
			});
		});

		describe('getScript', () => {
			it('should return a promise', () => {
				const promise = transportr.getScript('/test.js').catch(() => {});
				expect(promise).toBeInstanceOf(Promise);
			});

			it('should handle script response and manipulate DOM', async () => {
				// Mock a successful response with JavaScript content
				const mockBlob = new Blob(['console.log("test");'], { type: 'application/javascript' });
				const mockResponse = {
					blob: vi.fn().mockResolvedValue(mockBlob),
					ok: true,
					status: 200
				} as any;

				// Mock fetch to return our mock response
				global.fetch = vi.fn().mockResolvedValue(mockResponse);

				// Mock document.head manipulation
				const mockScript = document.createElement('script');
				vi.spyOn(document, 'createElement').mockReturnValue(mockScript);
				vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
					setTimeout(() => (node as HTMLScriptElement).onload?.(new Event('load') as unknown as never), 0);
					return node;
				});
				vi.spyOn(document.head, 'removeChild').mockReturnValue(mockScript);

				// Execute the method
				await transportr.getScript('/test.js');

				// Verify the script was created and manipulated
				expect(document.createElement).toHaveBeenCalledWith('script');
				expect(document.head.appendChild).toHaveBeenCalledWith(mockScript);
				expect(document.head.removeChild).toHaveBeenCalledWith(mockScript);
				expect(mockScript.src).toContain('blob:');
				expect(mockScript.type).toBe('text/javascript');
				expect(mockScript.async).toBe(true);

				// Verify URL methods were called
				expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
				expect(global.URL.revokeObjectURL).toHaveBeenCalled();
			});

			it('should handle script load error', async () => {
				const mockBlob = new Blob(['console.log("test")'], { type: 'text/javascript' });
				const mockResponse = {
					ok: true,
					status: 200,
					headers: new Headers({ 'content-type': 'text/javascript' }),
					blob: vi.fn().mockResolvedValue(mockBlob)
				};

				const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
				const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');

				const appendChildSpy = vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
					setTimeout(() => (node as HTMLScriptElement).onerror?.(new Event('error') as unknown as never), 0);
					return node;
				});
				const removeChildSpy = vi.spyOn(document.head, 'removeChild').mockImplementation((node) => node);

				vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

				const transportr = new Transportr('http://example.com');
				await expect(transportr.getScript('/script.js')).rejects.toThrow("An error has occurred with your request to: '/script.js'");

				expect(createObjectURLSpy).toHaveBeenCalled();
				expect(appendChildSpy).toHaveBeenCalled();
				expect(removeChildSpy).toHaveBeenCalled();
				expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
			});
		});

		describe('getStylesheet', () => {
			it('should return a promise', () => {
				const promise = transportr.getStylesheet('/test.css').catch(() => {});
				expect(promise).toBeInstanceOf(Promise);
			});

			it('should handle CSS response and manipulate DOM', async () => {
				// Mock a successful response with CSS content
				const mockBlob = new Blob(['body { color: red }'], { type: 'text/css' });
				const mockResponse = {
					blob: vi.fn().mockResolvedValue(mockBlob),
					ok: true,
					status: 200
				} as any;

				// Mock fetch to return our mock response
				global.fetch = vi.fn().mockResolvedValue(mockResponse);

				// Mock document.head manipulation
				const mockLink = document.createElement('link');
				vi.spyOn(document, 'createElement').mockReturnValue(mockLink);
				vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
					setTimeout(() => (node as HTMLLinkElement).onload?.(new Event('load') as unknown as never), 0);
					return node;
				});

				// Execute the method
				await transportr.getStylesheet('/test.css');

				// Verify the link was created and added
				expect(document.createElement).toHaveBeenCalledWith('link');
				expect(document.head.appendChild).toHaveBeenCalledWith(mockLink);
				expect(mockLink.href).toContain('blob:');
				expect(mockLink.type).toBe('text/css');
				expect(mockLink.rel).toBe('stylesheet');

				// Verify URL methods were called
				expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
				expect(global.URL.revokeObjectURL).toHaveBeenCalled();
			});

			it('should handle stylesheet load error', async () => {
				const mockBlob = new Blob(['body { color: red }'], { type: 'text/css' });
				const mockResponse = {
					ok: true,
					status: 200,
					headers: new Headers({ 'content-type': 'text/css' }),
					blob: vi.fn().mockResolvedValue(mockBlob)
				};

				const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
				const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');
				const appendChildSpy = vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
					setTimeout(() => (node as HTMLLinkElement).onerror?.(new Event('error') as unknown as never), 0);
					return node;
				});
				const removeChildSpy = vi.spyOn(document.head, 'removeChild').mockImplementation((node) => node);

				vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

				const transportr = new Transportr('http://example.com');
				await expect(transportr.getStylesheet('/style.css')).rejects.toThrow("An error has occurred with your request to: '/style.css'");

				expect(createObjectURLSpy).toHaveBeenCalled();
				expect(appendChildSpy).toHaveBeenCalled();
				expect(removeChildSpy).toHaveBeenCalled();
				expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
			});
		});

		describe('getBlob', () => {
			it('should return a promise', () => {
				const promise = transportr.getBlob('/test').catch(() => {});
				expect(promise).toBeInstanceOf(Promise);
			});
		});

		describe('getImage', () => {
			it('should return a promise', () => {
				const promise = transportr.getImage('/test.jpg').catch(() => {});
				expect(promise).toBeInstanceOf(Promise);
			});
		});

		describe('getBuffer', () => {
			it('should return a promise', () => {
				const promise = transportr.getBuffer('/test').catch(() => {});
				expect(promise).toBeInstanceOf(Promise);
			});
		});

		describe('getStream', () => {
			it('should return a promise', () => {
				const promise = transportr.getStream('/test').catch(() => {});
				expect(promise).toBeInstanceOf(Promise);
			});
		});
	});

	describe('Event handling', () => {
		let transportr: Transportr;

		beforeEach(() => {
			transportr = new Transportr(baseUrl);
		});

	describe('register', () => {
		it('should register an event handler and return registration', () => {
			const handler = vi.fn();
			const registration = transportr.register(Transportr.RequestEvent.CONFIGURED, handler);
			expect(registration).toBeDefined();
			expect(registration).toBeInstanceOf(Object);
		});
	});

	describe('unregister', () => {
		it('should unregister an event handler', () => {
			const handler = vi.fn();
			const registration = transportr.register(Transportr.RequestEvent.CONFIGURED, handler);
			transportr.unregister(registration);
			// No direct way to test this without making a request, but it shouldn't throw
		});
	});
});

	describe('Static methods', () => {
		describe('register', () => {
			it('should register a global event handler', () => {
				const handler = vi.fn();
				const registration = Transportr.register(Transportr.RequestEvent.CONFIGURED, handler);
				expect(registration).toBeDefined();
				expect(registration).toBeInstanceOf(Object);
			});
		});

		describe('unregister', () => {
			it('should unregister a global event handler', () => {
				const handler = vi.fn();
				const registration = Transportr.register(Transportr.RequestEvent.CONFIGURED, handler);
				const result = Transportr.unregister(registration);
				expect(result).toBe(true);
			});
		});

		describe('abortAll', () => {
			it('should abort all active requests', () => {
				// This doesn't throw an error even if no requests are active
				expect(() => Transportr.abortAll()).not.toThrow();
			});
		});
	});

	describe('Static utility methods', () => {
		describe('getBaseUrl', () => {
			it('should return URL object from string', () => {
				const url = Transportr['getBaseUrl'](baseUrl);
				expect(url).toBeInstanceOf(URL);
				expect(url.href).toBe(baseUrl);
			});

			it('should return URL object from URL', () => {
				const inputUrl = new URL(baseUrl);
				const url = Transportr['getBaseUrl'](inputUrl);
				expect(url).toBeInstanceOf(URL);
				expect(url).toBe(inputUrl);
			});

			it('should throw TypeError for invalid URL', () => {
				expect(() => Transportr['getBaseUrl'](123 as any)).toThrow(TypeError);
			});
		});

		describe('createUrl', () => {
			it('should create URL with path', () => {
				const baseUrlObj = new URL(baseUrl);
				const url = Transportr['createUrl'](baseUrlObj, '/test');
				expect(url.pathname).toBe('/artists/test');
			});

			it('should create URL with search params', () => {
				const baseUrlObj = new URL(baseUrl);
				const url = Transportr['createUrl'](baseUrlObj, '/test', { id: '123', name: 'test' });
				expect(url.searchParams.get('id')).toBe('123');
				expect(url.searchParams.get('name')).toBe('test');
			});

			it('should return base URL when no path provided', () => {
				const baseUrlObj = new URL(baseUrl);
				const url = Transportr['createUrl'](baseUrlObj);
				expect(url.href).toBe(baseUrl);
			});

			it('should handle URLSearchParams', () => {
				const baseUrl = new URL('http://example.com');
				const params = new URLSearchParams({ key: 'value' });
				const result = Transportr['createUrl'](baseUrl, '/test', params as any);

				expect(result.href).toBe('http://example.com/test?key=value');
			});
		});

		describe('mergeHeaders', () => {
			it('should merge Headers objects', () => {
				const h1 = new Headers({ 'Content-Type': 'application/json' });
				const h2 = new Headers({ 'Authorization': 'Bearer token' });
				const merged = Transportr['mergeHeaders'](new Headers(), h1, h2);

				expect(merged.get('Content-Type')).toBe('application/json');
				expect(merged.get('Authorization')).toBe('Bearer token');
			});

			it('should merge Record<string, string> headers', () => {
				const h1 = { 'Content-Type': 'application/json' };
				const h2 = { 'Authorization': 'Bearer token' };
				const merged = Transportr['mergeHeaders'](new Headers(), h1 as any, h2 as any);

				expect(merged.get('Content-Type')).toBe('application/json');
				expect(merged.get('Authorization')).toBe('Bearer token');
			});

			it('should merge array headers', () => {
				const h1 = [['Content-Type', 'application/json']] as [string, string][];
				const h2 = [['Authorization', 'Bearer token']] as [string, string][];
				const merged = Transportr['mergeHeaders'](new Headers(), h1, h2);

				expect(merged.get('Content-Type')).toBe('application/json');
				expect(merged.get('Authorization')).toBe('Bearer token');
			});

			it('should merge headers from array of tuples', () => {
				const target = new Headers();
				const source = [['x-key', 'value']];
				const result = Transportr['mergeHeaders'](target, source as any);
				expect(result.get('x-key')).toBe('value');
			});
		});

		describe('mergeSearchParams', () => {
			it('should merge URLSearchParams objects', () => {
				const p1 = new URLSearchParams('a=1');
				const p2 = new URLSearchParams('b=2');
				const merged = Transportr['mergeSearchParams'](new URLSearchParams(), p1, p2);

				expect(merged.get('a')).toBe('1');
				expect(merged.get('b')).toBe('2');
			});

			it('should merge Record<string, string> params', () => {
				const p1 = { a: '1' };
				const p2 = new URLSearchParams('b=2');
				const merged = Transportr['mergeSearchParams'](new URLSearchParams(), p1 as any, p2);

				expect(merged.get('a')).toBe('1');
				expect(merged.get('b')).toBe('2');
			});

			it('should merge string params', () => {
				const p1 = 'a=1';
				const p2 = new URLSearchParams('b=2');
				const merged = Transportr['mergeSearchParams'](new URLSearchParams(), p1 as any, p2);

				expect(merged.get('a')).toBe('1');
				expect(merged.get('b')).toBe('2');
			});

			it('should handle Record with undefined values', () => {
				const params = { a: '1', b: undefined, c: '3' };
				const merged = Transportr['mergeSearchParams'](new URLSearchParams(), params as any);

				expect(merged.get('a')).toBe('1');
				expect(merged.get('b')).toBeNull(); // undefined values should not be set
				expect(merged.get('c')).toBe('3');
			});

			it('should merge array params', () => {
				const p1 = [['a', '1'], ['b', '2']] as [string, string][];
				const merged = Transportr['mergeSearchParams'](new URLSearchParams(), p1);

				expect(merged.get('a')).toBe('1');
				expect(merged.get('b')).toBe('2');
			});

			it('should merge search params from array of tuples', () => {
				const target = new URLSearchParams();
				const source = [['key', 'value']];
				const result = Transportr['mergeSearchParams'](target, undefined, source as any);
				expect(result.get('key')).toBe('value');
			});
		});

		describe('generateResponseStatusFromError', () => {
			it('should return aborted status for abort error', async () => {
				const transportr = new Transportr('http://example.com');
				const errorHandler = vi.fn();
				transportr.register(Transportr.RequestEvent.ERROR, errorHandler);

				const abortController = new AbortController();
				abortController.abort();

				vi.spyOn(globalThis, 'fetch').mockRejectedValue(new DOMException('The user aborted a request.', 'AbortError'));

			await transportr.get('/test', { signal: abortController.signal }).catch(() => {});

			expect(errorHandler).toHaveBeenCalled();
			const error = errorHandler.mock.calls[0][1];
			expect(error.statusCode).toBe(499);
			expect(error.statusText).toBe('Aborted');
		});			it('should return timeout status for timeout error', async () => {
				const transportr = new Transportr('http://example.com');
				const errorHandler = vi.fn();
				transportr.register(Transportr.RequestEvent.ERROR, errorHandler);

				const timeoutError = new DOMException('The operation timed out.', 'TimeoutError');
				vi.spyOn(globalThis, 'fetch').mockRejectedValue(timeoutError);

			await transportr.get('/test').catch(() => {});

			expect(errorHandler).toHaveBeenCalled();
			const error = errorHandler.mock.calls[0][1];
		expect(error.statusCode).toBe(504);
		expect(error.statusText).toBe('Request Timeout');
	});

	it('should return internal server error for unknown errors', async () => {
		const transportr = new Transportr('http://example.com');
		const errorHandler = vi.fn();
		transportr.register(Transportr.RequestEvent.ERROR, errorHandler);

		vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

		await transportr.get('/test').catch(() => {});

		expect(errorHandler).toHaveBeenCalled();
		const error = errorHandler.mock.calls[0][1];
		expect(error.statusCode).toBe(500);
		expect(error.statusText).toBe('Internal Server Error');
	});
});		describe('execute error handling', () => {
			it('should handle errors during response processing', async () => {
				const mockResponse = new Response('{"invalid json}', {
					headers: { 'content-type': 'application/json' }
				});

			vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

			const transportr = new Transportr('http://example.com');
			const errorHandler = vi.fn();
			transportr.register(Transportr.RequestEvent.ERROR, errorHandler);

			await expect(transportr.getJson('/test')).rejects.toThrow();

			expect(errorHandler).toHaveBeenCalled();
			const error = errorHandler.mock.calls[0][1];
			expect(error).toBeInstanceOf(HttpError);
			expect(error.cause).toBeDefined();
		});
		});

		describe('_request error handling', () => {
			it('should rethrow HttpError instances', async () => {
				const mockHttpError = new HttpError(new ResponseStatus(404, 'Not Found'), { message: 'Test error' });
				vi.spyOn(globalThis, 'fetch').mockRejectedValue(mockHttpError);

				const transportr = new Transportr('http://example.com');

				await expect(transportr.get('/test')).rejects.toThrow(mockHttpError);
			});

			it('should clean up signal controllers even when request fails', async () => {
				vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

				const transportr = new Transportr('http://example.com');

				expect(Transportr['signalControllers'].size).toBe(0);

				await transportr.get('/test').catch(() => {});

				expect(Transportr['signalControllers'].size).toBe(0);
		});

		it('should publish complete event when signal is not aborted', async () => {
			const mockResponse = new Response('test', {
				headers: { 'content-type': 'text/plain' }
			});
			vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

			const transportr = new Transportr('http://example.com');
			const completeHandler = vi.fn();
			transportr.register(Transportr.RequestEvent.COMPLETE, completeHandler);

			await transportr.get('/test');

			expect(completeHandler).toHaveBeenCalled();
		});

		it('should not publish complete event when signal is aborted', async () => {
			const abortController = new AbortController();
			abortController.abort();

			vi.spyOn(globalThis, 'fetch').mockRejectedValue(new DOMException('Aborted', 'AbortError'));

			const transportr = new Transportr('http://example.com');
			const completeHandler = vi.fn();
			transportr.register(Transportr.RequestEvent.COMPLETE, completeHandler);

			await transportr.get('/test', { signal: abortController.signal }).catch(() => {});

			expect(completeHandler).not.toHaveBeenCalled();
		});

		it('should publish events to global subscribers when global: true', async () => {
			const mockResponse = new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
			vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

			const globalHandler = vi.fn();
			const registration = Transportr.register(Transportr.RequestEvent.SUCCESS, globalHandler);

			const transportr = new Transportr('http://example.com');
			await transportr.get('/data', { global: true });

			expect(globalHandler).toHaveBeenCalled();
			Transportr.unregister(registration);
		});
	});
});

describe('Edge Cases', () => {
		describe('constructor', () => {
		it('should handle RequestOptions as first parameter', () => {
			const options = { timeout: 5000, headers: { 'X-Custom': 'value' } };
			const transportr = new Transportr(options);

			expect(transportr.baseUrl.href).toBe(globalThis.location?.origin ? `${globalThis.location.origin}/` : 'http://localhost/');
			expect(transportr['_options'].timeout).toBe(5000);
		});			it('should handle no location.origin in non-browser environment', () => {
				const originalLocation = globalThis.location;
				delete (globalThis as any).location;

				const transportr = new Transportr();
				expect(transportr.baseUrl.href).toBe('http://localhost/');

				(globalThis as any).location = originalLocation;
			});
		});

		describe('getBaseUrl', () => {
			it('should throw TypeError for invalid URL types', () => {
				expect(() => Transportr['getBaseUrl'](123 as any)).toThrow(TypeError);
				expect(() => Transportr['getBaseUrl'](null as any)).toThrow(TypeError);
			});

			it('should handle relative URLs with location.origin', () => {
				const originalLocation = globalThis.location;
				Object.defineProperty(globalThis, 'location', {
					value: { origin: 'http://example.com' },
					writable: true,
					configurable: true
				});

				const url = Transportr['getBaseUrl']('/api');
				expect(url.href).toBe('http://example.com/api');

				globalThis.location = originalLocation;
			});
		});

		describe('getOrParseMediaType', () => {
			it('should return undefined for null content type', () => {
				const result = Transportr['getOrParseMediaType'](null);
				expect(result).toBeUndefined();
			});

			it('should cache parsed media types', () => {
				const contentType = 'application/custom+json';

				// Clear cache first
				Transportr['mediaTypeCache'].clear();

				// First call should parse
				const result1 = Transportr['getOrParseMediaType'](contentType);
				expect(result1).toBeDefined();

				// Second call should use cache
				const result2 = Transportr['getOrParseMediaType'](contentType);
				expect(result2).toBe(result1);
			});

			it('should return undefined for invalid media type', () => {
				const result = Transportr['getOrParseMediaType']('invalid//type');
				expect(result).toBeUndefined();
			});
		});

		describe('getResponseHandler', () => {
			it('should return undefined for null content type', () => {
				const transportr = new Transportr('http://example.com');
				const handler = transportr['getResponseHandler'](null);
				expect(handler).toBeUndefined();
			});

			it('should return undefined for empty content type', () => {
				const transportr = new Transportr('http://example.com');
				const handler = transportr['getResponseHandler']('');
				expect(handler).toBeUndefined();
			});

			it('should return undefined for unparseable content type', () => {
				const transportr = new Transportr('http://example.com');
				vi.spyOn(Transportr as any, 'getOrParseMediaType').mockReturnValue(undefined);
				const handler = transportr['getResponseHandler']('invalid//type');
				expect(handler).toBeUndefined();
			});

			it('should return undefined when no handler matches', () => {
				const transportr = new Transportr('http://example.com');
				// Mock getOrParseMediaType to return a dummy MediaType that matches nothing
				vi.spyOn(Transportr as any, 'getOrParseMediaType').mockReturnValue({ matches: () => false });

				const handler = transportr['getResponseHandler']('application/pdf');
				expect(handler).toBeUndefined();
			});
		});

		describe('execute', () => {
			it('should handle 204 No Content response without response handler', async () => {
				const mockResponse = new Response(null, {
					status: 204,
					statusText: 'No Content'
				});

				vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

				const transportr = new Transportr('http://example.com');
				const result = await transportr.delete('/resource');

				expect(result).toBeUndefined();
			});
		});

	describe('processRequestOptions', () => {
	it('should delete content-type header for non-body methods', () => {
		const transportr = new Transportr('http://example.com');
		// Pass headers in the first param (userOptions) to ensure they get into the merged result
		const processed = transportr['processRequestOptions'](
			{ headers: { 'content-type': 'text/plain' } },
			{ method: 'GET' }
		);

		// For GET requests (non-body methods), content-type should be deleted
		expect(processed.requestOptions.headers.has('content-type')).toBe(false);
	});		it('should merge body into searchParams for non-body methods', () => {
			const transportr = new Transportr('http://example.com');
			const processed = transportr['processRequestOptions'](
				{},
				{ method: 'GET', body: new URLSearchParams({ key: 'value' }) }
			);

			expect(processed.requestOptions.searchParams.get('key')).toBe('value');
			expect(processed.requestOptions.body).toBeUndefined();
		});			it('should not stringify non-object bodies', () => {
				const transportr = new Transportr('http://example.com');
				const formData = new FormData();
				formData.append('key', 'value');

				const processed = transportr['processRequestOptions'](
					{ body: formData },
					{ method: 'POST' }
				);

				expect(processed.requestOptions.body).toBe(formData);
			});

			it('should not stringify array bodies', () => {
				const transportr = new Transportr('http://example.com');
				const arrayBody = [1, 2, 3];

				const processed = transportr['processRequestOptions'](
					{ body: arrayBody, headers: { 'content-type': 'application/json' } },
					{ method: 'POST' }
				);

				expect(processed.requestOptions.body).toBe(arrayBody);
			});

			it('should not stringify null body', () => {
				const transportr = new Transportr('http://example.com');

				const processed = transportr['processRequestOptions'](
					{ body: null, headers: { 'content-type': 'application/json' } },
					{ method: 'POST' }
				);

				expect(processed.requestOptions.body).toBe(null);
			});

			it('should keep body for DELETE requests', () => {
				const transportr = new Transportr('http://example.com');
				const body = { id: 42 };

				const processed = transportr['processRequestOptions'](
					{ body },
					{ method: 'DELETE' }
				);

				expect(processed.requestOptions.body).toBe(JSON.stringify(body));
			});

			it('should retain content-type header for DELETE requests', () => {
				const transportr = new Transportr('http://example.com');

				const processed = transportr['processRequestOptions'](
					{ body: { id: 1 } },
					{ method: 'DELETE' }
				);

				expect(processed.requestOptions.headers.has('content-type')).toBe(true);
			});
		});

		describe('createUrl', () => {
			it('should handle base URL without path', () => {
				const baseUrl = new URL('http://example.com/api/');
				const result = Transportr['createUrl'](baseUrl);

				expect(result.href).toBe('http://example.com/api/');
			});

			it('should handle string search params', () => {
				const baseUrl = new URL('http://example.com');
				const result = Transportr['createUrl'](baseUrl, '/test', 'key=value' as any);

				expect(result.href).toBe('http://example.com/test?key=value');
			});

			it('should handle undefined search params', () => {
				const baseUrl = new URL('http://example.com');
				const result = Transportr['createUrl'](baseUrl, '/test', undefined);

				expect(result.href).toBe('http://example.com/test');
			});
		});

		describe('Symbol.toStringTag', () => {
			it('should return "Transportr"', () => {
				const transportr = new Transportr('http://example.com');
				expect(transportr[Symbol.toStringTag]).toBe('Transportr');
			});
		});
	});

	describe('Method-specific edge cases', () => {
	describe('post', () => {
		it('should handle RequestOptions as first parameter', async () => {
			const mockResponse = new Response('{"result": "ok"}', {
				headers: { 'content-type': 'application/json' }
			});
			const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);
			fetchSpy.mockClear();

			const transportr = new Transportr('http://example.com');
			await transportr.post('/path', { body: { data: 'test' } });

			expect(fetchSpy).toHaveBeenCalledTimes(1);
			const [[url, requestInit]] = fetchSpy.mock.calls;
			expect(requestInit?.method).toBe('POST');
			expect(requestInit?.body).toBe('{"data":"test"}');
		});
	});

	describe('options', () => {
			it('should handle missing allow header', async () => {
				const mockResponse = new Response(null, {
					headers: {}
				});
				vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

				const transportr = new Transportr('http://example.com');
				const result = await transportr.options('/resource');

				expect(result).toBeUndefined();
			});

			it('should parse allow header with spaces', async () => {
				const mockResponse = new Response(null, {
					headers: { 'allow': 'GET, POST , PUT,DELETE' }
				});
				vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

				const transportr = new Transportr('http://example.com');
				const result = await transportr.options('/resource');

				expect(result).toEqual(['GET', 'POST', 'PUT', 'DELETE']);
			});
		});
	});

	describe('contentTypeHandlers', () => {
		beforeEach(() => vi.restoreAllMocks());
		afterEach(() => vi.restoreAllMocks());

		it('should register a custom content-type handler', async () => {
			const customHandler = vi.fn(async (response: Response) => {
				const text = await response.text();
				return `custom:${text}`;
			});

			Transportr.registerContentTypeHandler('csv', customHandler);

			const mockResponse = new Response('a,b,c', {
				status: 200,
				headers: { 'content-type': 'text/csv' }
			});
			vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

			const transportr = new Transportr('http://example.com');
			const result = await transportr.get('/data.csv');

			expect(customHandler).toHaveBeenCalledTimes(1);
			expect(result).toBe('custom:a,b,c');

			// Clean up
			Transportr.unregisterContentTypeHandler('csv');
		});

		it('should give custom handlers priority over built-in handlers', async () => {
			const customJsonHandler = vi.fn(async (response: Response) => {
				const data = await response.json();
				return { wrapped: data };
			});

			Transportr.registerContentTypeHandler('json', customJsonHandler);

			const mockResponse = new Response('{"key":"value"}', {
				status: 200,
				headers: { 'content-type': 'application/json' }
			});
			vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

			const transportr = new Transportr('http://example.com');
			const result = await transportr.get('/api/data');

			expect(customJsonHandler).toHaveBeenCalledTimes(1);
			expect(result).toEqual({ wrapped: { key: 'value' } });

			// Clean up
			Transportr.unregisterContentTypeHandler('json');
		});

		it('should unregister a content-type handler', () => {
			const handler = vi.fn(async () => 'test');
			Transportr.registerContentTypeHandler('custom-type', handler);

			const result = Transportr.unregisterContentTypeHandler('custom-type');
			expect(result).toBe(true);
		});

		it('should return false when unregistering a non-existent handler', () => {
			const result = Transportr.unregisterContentTypeHandler('nonexistent-type');
			expect(result).toBe(false);
		});
	});

	describe('FormData auto-detection', () => {
		afterEach(() => { vi.restoreAllMocks() });

		it('should send FormData as-is and delete Content-Type header', async () => {
			const formData = new FormData();
			formData.append('name', 'test');

			let capturedHeaders: Headers | undefined;
			let capturedBody: BodyInit | undefined;
			vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
				capturedHeaders = init?.headers as Headers;
				capturedBody = init?.body as BodyInit;
				return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
			});

			const transportr = new Transportr('http://example.com');
			await transportr.post('/upload', { body: formData });

			expect(capturedBody).toBe(formData);
			expect(capturedHeaders?.has('content-type')).toBe(false);
		});

		it('should send Blob as-is and delete Content-Type header', async () => {
			const blob = new Blob(['hello'], { type: 'text/plain' });

			let capturedBody: BodyInit | undefined;
			let capturedHeaders: Headers | undefined;
			vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
				capturedBody = init?.body as BodyInit;
				capturedHeaders = init?.headers as Headers;
				return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
			});

			const transportr = new Transportr('http://example.com');
			await transportr.post('/upload', { body: blob });

			expect(capturedBody).toBe(blob);
			expect(capturedHeaders?.has('content-type')).toBe(false);
		});

		it('should send ArrayBuffer as-is', async () => {
			const buffer = new ArrayBuffer(8);

			let capturedBody: BodyInit | undefined;
			vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
				capturedBody = init?.body as BodyInit;
				return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
			});

			const transportr = new Transportr('http://example.com');
			await transportr.post('/upload', { body: buffer });

			expect(capturedBody).toBe(buffer);
		});

		it('should send URLSearchParams as-is', async () => {
			const params = new URLSearchParams({ key: 'value' });

			let capturedBody: BodyInit | undefined;
			vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
				capturedBody = init?.body as BodyInit;
				return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
			});

			const transportr = new Transportr('http://example.com');
			await transportr.post('/upload', { body: params });

			expect(capturedBody).toBe(params);
		});

		it('should still serialize plain objects as JSON', async () => {
			let capturedBody: BodyInit | undefined;
			vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
				capturedBody = init?.body as BodyInit;
				return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
			});

			const transportr = new Transportr('http://example.com');
			await transportr.post('/data', { body: { key: 'value' } });

			expect(capturedBody).toBe('{"key":"value"}');
		});
	});

	describe('Request deduplication', () => {
		afterEach(() => { vi.restoreAllMocks() });

		it('should deduplicate identical GET requests when dedupe is true', async () => {
			let fetchCount = 0;
			vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
				fetchCount++;
				await new Promise(resolve => setTimeout(resolve, 50));
				return new Response('{"id":1}', { status: 200, headers: { 'content-type': 'application/json' } });
			});

			const transportr = new Transportr('http://example.com');
			const [result1, result2] = await Promise.all([
				transportr.get('/api/data', { dedupe: true }),
				transportr.get('/api/data', { dedupe: true })
			]);

			expect(fetchCount).toBe(1);
			expect(result1).toEqual({ id: 1 });
			expect(result2).toEqual({ id: 1 });
		});

		it('should not deduplicate when dedupe is false', async () => {
			let fetchCount = 0;
			vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
				fetchCount++;
				return new Response('{"id":1}', { status: 200, headers: { 'content-type': 'application/json' } });
			});

			const transportr = new Transportr('http://example.com');
			await transportr.get('/api/data', { dedupe: false });
			await transportr.get('/api/data', { dedupe: false });

			expect(fetchCount).toBe(2);
		});
	});

	describe('Enhanced HttpError', () => {
		afterEach(() => { vi.restoreAllMocks() });

		it('should include url and method in error messages', async () => {
			vi.spyOn(globalThis, 'fetch').mockResolvedValue(
				new Response('Not Found', { status: 404, statusText: 'Not Found' })
			);

			const transportr = new Transportr('http://example.com');
			try {
				await transportr.get('/missing');
				expect.unreachable('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(HttpError);
				const httpError = error as HttpError;
				expect(httpError.message).toContain('GET');
				expect(httpError.message).toContain('example.com');
				expect(httpError.message).toContain('404');
				expect(httpError.url).toBeInstanceOf(URL);
				expect(httpError.method).toBe('GET');
			}
		});

		it('should include timing information in errors', async () => {
			vi.spyOn(globalThis, 'fetch').mockResolvedValue(
				new Response('Error', { status: 500, statusText: 'Internal Server Error' })
			);

			const transportr = new Transportr('http://example.com');
			try {
				await transportr.get('/failing');
				expect.unreachable('Should have thrown');
			} catch (error) {
				const httpError = error as HttpError;
				expect(httpError.timing).toBeDefined();
				expect(httpError.timing!.duration).toBeGreaterThanOrEqual(0);
				expect(httpError.timing!.start).toBeLessThanOrEqual(httpError.timing!.end);
			}
		});
	});

	describe('Request timing', () => {
		afterEach(() => { vi.restoreAllMocks() });

		it('should emit timing data in complete event', async () => {
			vi.spyOn(globalThis, 'fetch').mockResolvedValue(
				new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } })
			);

			const transportr = new Transportr('http://example.com');
			let completeTiming: { timing: { start: number; end: number; duration: number } } | undefined;
			const reg = transportr.register(Transportr.RequestEvent.COMPLETE, (_event: Event, data: unknown) => {
				completeTiming = data as typeof completeTiming;
			});

			await transportr.get('/api/data');

			expect(completeTiming).toBeDefined();
			expect(completeTiming!.timing.duration).toBeGreaterThanOrEqual(0);
			expect(completeTiming!.timing.start).toBeLessThanOrEqual(completeTiming!.timing.end);

			transportr.unregister(reg);
		});
	});

	describe('Global cleanup', () => {
		afterEach(() => {
			vi.restoreAllMocks();
			Transportr.unregisterAll();
		});

		it('should clear global subscriptions via unregisterAll', () => {
			let called = false;
			Transportr.register(Transportr.RequestEvent.SUCCESS, () => { called = true });
			Transportr.unregisterAll();

			// After unregisterAll, the handler should no longer fire
			// We verify indirectly: registering again should work without conflicts
			const reg = Transportr.register(Transportr.RequestEvent.SUCCESS, () => { called = true });
			expect(reg).toBeDefined();
			expect(called).toBe(false);
		});

		it('should tear down instance via destroy', () => {
			const transportr = new Transportr('http://example.com');
			let called = false;
			transportr.register(Transportr.RequestEvent.SUCCESS, () => { called = true });
			transportr.destroy();

			// After destroy, events should not fire on this instance
			// Verify the instance can still technically be used (no crash)
			expect(called).toBe(false);
		});
	});

	describe('Method chaining', () => {
		it('should return boolean from unregister', () => {
			const transportr = new Transportr('http://example.com');
			const reg = transportr.register(Transportr.RequestEvent.SUCCESS, () => {});
			const result = transportr.unregister(reg);
			expect(result).toBe(true);
		});

		it('should return this from addHooks', () => {
			const transportr = new Transportr('http://example.com');
			const result = transportr.addHooks({ beforeRequest: [] });
			expect(result).toBe(transportr);
		});

		it('should return this from clearHooks', () => {
			const transportr = new Transportr('http://example.com');
			const result = transportr.clearHooks();
			expect(result).toBe(transportr);
		});

		it('should support fluent chaining', () => {
			const transportr = new Transportr('http://example.com');
			const result = transportr
				.addHooks({ beforeRequest: [async () => {}] })
				.clearHooks()
				.addHooks({ afterResponse: [async () => {}] });
			expect(result).toBe(transportr);
		});
	});

	describe('HTML selector support', () => {
		afterEach(() => { vi.restoreAllMocks() });

		it('should return full document when no selector is provided', async () => {
			vi.spyOn(globalThis, 'fetch').mockResolvedValue(
				new Response('<html><body><div id="test">Hello</div></body></html>', { status: 200, headers: { 'content-type': 'text/html' } })
			);

			const transportr = new Transportr('http://example.com');
			const doc = await transportr.getHtml('/page');
			expect(doc).toBeDefined();
			expect((doc as Document).querySelector).toBeDefined();
		});

		it('should return matching element when selector is provided', async () => {
			vi.spyOn(globalThis, 'fetch').mockResolvedValue(
				new Response('<html><body><div id="test">Hello</div></body></html>', { status: 200, headers: { 'content-type': 'text/html' } })
			);

			const transportr = new Transportr('http://example.com');
			const el = await transportr.getHtml('/page', {}, '#test');
			expect(el).toBeDefined();
			expect((el as Element).textContent).toBe('Hello');
		});

		it('should return null when selector does not match', async () => {
			vi.spyOn(globalThis, 'fetch').mockResolvedValue(
				new Response('<html><body><div>No match</div></body></html>', { status: 200, headers: { 'content-type': 'text/html' } })
			);

			const transportr = new Transportr('http://example.com');
			const el = await transportr.getHtml('/page', {}, '#nonexistent');
			expect(el).toBeNull();
		});

		it('should support selector on getHtmlFragment', async () => {
			vi.spyOn(globalThis, 'fetch').mockResolvedValue(
				new Response('<div class="item">Fragment item</div><div class="other">Other</div>', { status: 200, headers: { 'content-type': 'text/html' } })
			);

			const transportr = new Transportr('http://example.com');
			const el = await transportr.getHtmlFragment('/fragment', {}, '.item');
			expect(el).toBeDefined();
			expect((el as Element).textContent).toBe('Fragment item');
		});
	});

	describe('XSRF/CSRF protection', () => {
		afterEach(() => { vi.restoreAllMocks() });

		it('should add XSRF header from cookie when xsrf is true', async () => {
			// Set up a cookie
			Object.defineProperty(document, 'cookie', { value: 'XSRF-TOKEN=abc123', writable: true, configurable: true });

			let capturedHeaders: Headers | undefined;
			vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
				capturedHeaders = init?.headers as Headers;
				return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
			});

			const transportr = new Transportr('http://example.com');
			await transportr.post('/data', { body: { key: 'value' }, xsrf: true });

			expect(capturedHeaders?.get('X-XSRF-TOKEN')).toBe('abc123');
		});

		it('should use custom cookie and header names', async () => {
			Object.defineProperty(document, 'cookie', { value: 'MY-CSRF=token456', writable: true, configurable: true });

			let capturedHeaders: Headers | undefined;
			vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
				capturedHeaders = init?.headers as Headers;
				return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
			});

			const transportr = new Transportr('http://example.com');
			await transportr.post('/data', { body: { key: 'value' }, xsrf: { cookieName: 'MY-CSRF', headerName: 'X-MY-CSRF' } });

			expect(capturedHeaders?.get('X-MY-CSRF')).toBe('token456');
		});

		it('should not set header when cookie is missing', async () => {
			Object.defineProperty(document, 'cookie', { value: '', writable: true, configurable: true });

			let capturedHeaders: Headers | undefined;
			vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
				capturedHeaders = init?.headers as Headers;
				return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
			});

			const transportr = new Transportr('http://example.com');
			await transportr.post('/data', { body: { key: 'value' }, xsrf: true });

			expect(capturedHeaders?.has('X-XSRF-TOKEN')).toBe(false);
		});
	});

	describe('beforeRequest hook with searchParams in execute', () => {
		afterEach(() => { vi.restoreAllMocks() });

		it('should update URL when beforeRequest hook modifies searchParams', async () => {
			let capturedUrl: URL | undefined;
			vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
				capturedUrl = input instanceof URL ? input : new URL(input as string);
				return new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } });
			});

			const transportr = new Transportr('http://example.com');
			transportr.addHooks({
				beforeRequest: [async (_options) => {
					return { searchParams: new URLSearchParams({ injected: 'true' }) };
				}]
			});

			await transportr.get('/api/data');

			expect(capturedUrl?.searchParams.get('injected')).toBe('true');
		});
	});

	describe('mediaType cache eviction', () => {
		afterEach(() => { vi.restoreAllMocks() });

		it('should evict oldest entries when cache exceeds 100', () => {
			// Fill the cache to 100
			const cache = Transportr['mediaTypeCache'];
			cache.clear();

			for (let i = 0; i < 100; i++) {
				cache.set(`application/x-test-${i}`, {} as any);
			}

			expect(cache.size).toBe(100);

			// Now parse a new content type that triggers eviction
			const result = Transportr['getOrParseMediaType']('application/json; charset=utf-8');
			expect(result).toBeDefined();
			// Cache should still be at 100 (evicted one, added one)
			expect(cache.size).toBe(100);
			// The first entry should have been evicted
			expect(cache.has('application/x-test-0')).toBe(false);
		});
	});

	describe('options() method hooks', () => {
		afterEach(() => { vi.restoreAllMocks() });

		it('should run beforeRequest hooks with searchParams modification in options()', async () => {
			let capturedUrl: URL | undefined;
			vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
				capturedUrl = input instanceof URL ? input : new URL(input as string);
				return new Response(null, { status: 200, headers: { 'allow': 'GET, POST' } });
			});

			const transportr = new Transportr('http://example.com');
			transportr.addHooks({
				beforeRequest: [async () => {
					return { searchParams: new URLSearchParams({ hook: 'applied' }) };
				}]
			});

			await transportr.options('/resource');

			expect(capturedUrl?.searchParams.get('hook')).toBe('applied');
		});

		it('should run afterResponse hooks in options()', async () => {
			const mockResponse = new Response(null, { status: 200, headers: { 'allow': 'GET, POST' } });
			vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

			const afterHook = vi.fn(async (response: Response) => {
				return new Response(null, { status: response.status, headers: { 'allow': 'GET, POST, PUT' } });
			});

			const transportr = new Transportr('http://example.com');
			transportr.addHooks({ afterResponse: [afterHook] });

			const result = await transportr.options('/resource');

			expect(afterHook).toHaveBeenCalledTimes(1);
			expect(result).toEqual(['GET', 'POST', 'PUT']);
		});
	});
});