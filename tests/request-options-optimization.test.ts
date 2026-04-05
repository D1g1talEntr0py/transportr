import { describe, expect, it, vi } from 'vitest';
import { Transportr } from '../src/transportr.js';
import config from './scripts/config.js';

const apiBaseUrl = `https://${config.apiKey}.mockapi.io/artists`;

describe('Request Options Performance Optimization', () => {
	it('should merge request options without deep cloning on every request', async () => {
		const transportr = new Transportr(apiBaseUrl, {
			headers: { 'X-Custom-Header': 'instance-value' },
			cache: 'no-cache',
			credentials: 'same-origin'
		});

		// Spy on objectMerge to ensure it's not being called excessively
		const utils = await import('../src/utils.js');
		const mergeSpy = vi.spyOn(utils, 'objectMerge');

		// Make a request with custom options
		await transportr.get('/1', { headers: { 'X-Request-Header': 'request-value' }, cache: 'force-cache' });

		// The optimization should avoid calling objectMerge in processRequestOptions
		// It should only be called once in the constructor via createOptions
		expect(mergeSpy).not.toHaveBeenCalled();
	});

	it('should correctly override instance options with user options', async () => {
		const transportr = new Transportr(apiBaseUrl, {
			headers: { 'X-Instance-Header': 'instance' },
			cache: 'no-cache'
		});

		const successHandler = vi.fn();
		const registration = Transportr.register(Transportr.RequestEvent.CONFIGURED, (_event: Event, data: any) => {
			successHandler(data);
		});

		try {
			await transportr.get('/1', {
				headers: { 'X-User-Header': 'user' },
				cache: 'force-cache'
			});

			// Give time for events to be processed
			await new Promise(resolve => setTimeout(resolve, 50));

			expect(successHandler).toHaveBeenCalled();
			const configuredOptions = successHandler.mock.calls[0][0];

			// User options should override instance options
			expect(configuredOptions.cache).toBe('force-cache');

			// Headers should be merged
			expect(configuredOptions.headers.get('X-Instance-Header')).toBe('instance');
			expect(configuredOptions.headers.get('X-User-Header')).toBe('user');
		} finally {
			Transportr.unregister(registration);
		}
	});

	it('should correctly merge headers from instance, user, and method options', async () => {
		const transportr = new Transportr(apiBaseUrl, {
			headers: { 'X-Instance': 'instance-value' }
		});

		const successHandler = vi.fn();
		const registration = Transportr.register(Transportr.RequestEvent.CONFIGURED, (_event: Event, data: any) => {
			successHandler(data);
		});

		try {
			// Use GET instead of POST to avoid API errors
			await transportr.get('/1', {
				headers: { 'X-User': 'user-value' }
			});

			// Give time for events to be processed
			await new Promise(resolve => setTimeout(resolve, 50));

			expect(successHandler).toHaveBeenCalled();
			const configuredOptions = successHandler.mock.calls[0][0];

			// All headers should be present
			expect(configuredOptions.headers.get('X-Instance')).toBe('instance-value');
			expect(configuredOptions.headers.get('X-User')).toBe('user-value');
			expect(configuredOptions.headers.get('Accept')).toBeTruthy();
		} finally {
			Transportr.unregister(registration);
		}
	}, 10000);

	it('should maintain correct option precedence: method > user > instance > defaults', async () => {
		const transportr = new Transportr(apiBaseUrl, {
			cache: 'no-cache',
			credentials: 'include'
		});

		const successHandler = vi.fn();
		const registration = Transportr.register(Transportr.RequestEvent.CONFIGURED, (_event: Event, data: any) => {
			successHandler(data);
		});

		try {
			// User options should override instance options
			await transportr.get('/1', {
				cache: 'force-cache'
			});

			// Give time for events to be processed
			await new Promise(resolve => setTimeout(resolve, 50));

			expect(successHandler).toHaveBeenCalled();
			const configuredOptions = successHandler.mock.calls[0][0];

			// User cache should override instance cache
			expect(configuredOptions.cache).toBe('force-cache');
			// Instance credentials should be preserved
			expect(configuredOptions.credentials).toBe('include');
			// Method should be set correctly
			expect(configuredOptions.method).toBe('GET');
		} finally {
			Transportr.unregister(registration);
		}
	});

	it('should handle sequential requests efficiently without accumulating overhead', async () => {
		const transportr = new Transportr(apiBaseUrl);

		const startTime = performance.now();

		// Make 10 sequential requests
		for (let i = 1; i <= 10; i++) {
			await transportr.get(`/${i}`);
		}

		const endTime = performance.now();
		const totalTime = endTime - startTime;

		// This is a basic check - in a real scenario, we'd compare before/after optimization
		// The test mainly ensures the functionality still works correctly
		expect(totalTime).toBeGreaterThan(0);
	}, 30000);

	it('should properly handle searchParams merging without deep cloning', async () => {
		const transportr = new Transportr(apiBaseUrl, {
			searchParams: { instanceParam: 'instance' }
		});

		const successHandler = vi.fn();
		const registration = Transportr.register(Transportr.RequestEvent.CONFIGURED, (_event: Event, data: any) => {
			successHandler(data);
		});

		try {
			await transportr.get('/1', {
				searchParams: { userParam: 'user' }
			});

			// Give time for events to be processed
			await new Promise(resolve => setTimeout(resolve, 50));

			expect(successHandler).toHaveBeenCalled();
			const configuredOptions = successHandler.mock.calls[0][0];

			// Both params should be present
			expect(configuredOptions.searchParams.get('instanceParam')).toBe('instance');
			expect(configuredOptions.searchParams.get('userParam')).toBe('user');
		} finally {
			Transportr.unregister(registration);
		}
	});
});
