import { describe, expect, it, vi } from 'vitest';
import { Transportr } from '../src/transportr.js';
import config from './scripts/config.js';

describe('Global Event Handler', () => {
	it('should trigger global event handlers for multiple requests', async () => {
		const transportr = new Transportr(`https://${config.apiKey}.mockapi.io/artists`);

		const globalConfiguredEventHandler = vi.fn();
		const registration = Transportr.register(Transportr.RequestEvents.CONFIGURED, globalConfiguredEventHandler);

		try {
			const data = await transportr.getJson('/33');

			expect(typeof(data)).toBe('object');
			expect(data).toHaveProperty('recordLabel');

			const data2 = await transportr.getJson('/14');

			expect(typeof(data2)).toBe('object');
			expect(data2).toHaveProperty('gender');

			expect(globalConfiguredEventHandler).toHaveBeenCalledTimes(2);
		} finally {
			Transportr.unregister(registration);
		}
	});
});