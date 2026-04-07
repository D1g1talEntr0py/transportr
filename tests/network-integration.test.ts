import { describe, expect, it, vi } from 'vitest';
import { Transportr } from '../src/transportr';
import config from './scripts/config';

describe('Network Tests', () => {
	it('should successfully make HTTP requests to real API', async () => {
		const transportr = new Transportr(`https://${config.apiKey}.mockapi.io/artists`);

		const configuredEventListener = vi.fn();
		const configuredRegistration = Transportr.register(Transportr.RequestEvent.CONFIGURED, configuredEventListener);

		const successEventListener = vi.fn();
		const successRegistration = Transportr.register(Transportr.RequestEvent.SUCCESS, successEventListener);

		const errorEventListener = vi.fn();
		const errorRegistration = Transportr.register(Transportr.RequestEvent.ERROR, errorEventListener);

		try {
			// Test basic JSON API call
			const data = await transportr.getJson('/1');

			expect(typeof(data)).toBe('object');
			expect(data).toHaveProperty('id');
			expect(data).toHaveProperty('firstName');
			expect(data).toHaveProperty('lastName');

			// Give time for events to be processed
			await new Promise(resolve => setTimeout(resolve, 50));

			// Verify events were fired
			expect(configuredEventListener).toHaveBeenCalledTimes(1);
			expect(successEventListener).toHaveBeenCalledTimes(1);
			expect(errorEventListener).toHaveBeenCalledTimes(0);
		} finally {
			// Clean up event listeners
			Transportr.unregister(configuredRegistration);
			Transportr.unregister(successRegistration);
			Transportr.unregister(errorRegistration);
		}
	});

	it('should test POST request functionality', async () => {
		const transportr = new Transportr(`https://${config.apiKey}.mockapi.io/artists`);

		const postData = {
			firstName: 'Test',
			lastName: 'User',
			gender: 'Male',
			recordLabel: 'Test Records'
		};

		const result = await transportr.post(postData);

		expect(typeof(result)).toBe('object');
		expect(result).toHaveProperty('id'); // Check for ID which the API should return
		// Note: Mock API might return different data than what we sent
		// so let's just verify the response structure
		expect(result).toHaveProperty('firstName');
		expect(result).toHaveProperty('lastName');
	});

	it('should test global event handler registration', async () => {
		const globalConfiguredEventHandler = vi.fn();
		const registration = Transportr.register(Transportr.RequestEvent.CONFIGURED, globalConfiguredEventHandler);

		try {
			const transportr = new Transportr(`https://${config.apiKey}.mockapi.io/artists`);

			const data = await transportr.getJson('/33');
			expect(typeof(data)).toBe('object');
			expect(data).toHaveProperty('recordLabel');

			const data2 = await transportr.getJson('/14');
			expect(typeof(data2)).toBe('object');
			expect(data2).toHaveProperty('gender');

			// Give time for events to be processed
			await new Promise(resolve => setTimeout(resolve, 50));

			expect(globalConfiguredEventHandler).toHaveBeenCalledTimes(2);
		} finally {
			// Clean up event listener
			Transportr.unregister(registration);
		}
	});
});
