import { afterEach, describe, expect, it, vi } from 'vitest';
import { Transportr } from '../src/transportr';

describe('Network Tests', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should successfully make HTTP requests to real API', async () => {
		const artist = { id: '1', firstName: 'Miles', lastName: 'Davis' };
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify(artist), { headers: { 'content-type': 'application/json' } })
		);

		const transportr = new Transportr('https://example.mockapi.io/artists');

		const configuredEventListener = vi.fn();
		const configuredRegistration = Transportr.register(Transportr.RequestEvent.CONFIGURED, configuredEventListener);

		const successEventListener = vi.fn();
		const successRegistration = Transportr.register(Transportr.RequestEvent.SUCCESS, successEventListener);

		const errorEventListener = vi.fn();
		const errorRegistration = Transportr.register(Transportr.RequestEvent.ERROR, errorEventListener);

		try {
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
			Transportr.unregister(configuredRegistration);
			Transportr.unregister(successRegistration);
			Transportr.unregister(errorRegistration);
		}
	});

	it('should test POST request functionality', async () => {
		const createdArtist = { id: '42', firstName: 'Test', lastName: 'User', gender: 'Male', recordLabel: 'Test Records' };
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify(createdArtist), { headers: { 'content-type': 'application/json' } })
		);

		const transportr = new Transportr('https://example.mockapi.io/artists');

		const postData = {
			firstName: 'Test',
			lastName: 'User',
			gender: 'Male',
			recordLabel: 'Test Records'
		};

		const result = await transportr.post(postData);

		expect(typeof(result)).toBe('object');
		expect(result).toHaveProperty('id');
		expect(result).toHaveProperty('firstName');
		expect(result).toHaveProperty('lastName');
	});

	it('should test global event handler registration', async () => {
		const artist33 = { id: '33', recordLabel: 'Blue Note' };
		const artist14 = { id: '14', gender: 'Female' };

		const fetchSpy = vi.spyOn(globalThis, 'fetch')
			.mockResolvedValueOnce(new Response(JSON.stringify(artist33), { headers: { 'content-type': 'application/json' } }))
			.mockResolvedValueOnce(new Response(JSON.stringify(artist14), { headers: { 'content-type': 'application/json' } }));

		const globalConfiguredEventHandler = vi.fn();
		const registration = Transportr.register(Transportr.RequestEvent.CONFIGURED, globalConfiguredEventHandler);

		try {
			const transportr = new Transportr('https://example.mockapi.io/artists');

			const data = await transportr.getJson('/33');
			expect(typeof(data)).toBe('object');
			expect(data).toHaveProperty('recordLabel');

			const data2 = await transportr.getJson('/14');
			expect(typeof(data2)).toBe('object');
			expect(data2).toHaveProperty('gender');

			// Give time for events to be processed
			await new Promise(resolve => setTimeout(resolve, 50));

			expect(globalConfiguredEventHandler).toHaveBeenCalledTimes(2);
			expect(fetchSpy).toHaveBeenCalledTimes(2);
		} finally {
			Transportr.unregister(registration);
		}
	});
});
