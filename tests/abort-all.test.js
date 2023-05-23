import { describe, beforeAll, expect, jest } from '@jest/globals';
import Transportr from '../src/transportr.js';
import SignalController from '../src/signal-controller.js';

describe('Transportr', () => {
	/** @type {Transportr} */
	let transportr;

	beforeAll(() => {
		// Mock fetch function
		globalThis.fetch = jest.fn(() =>
			new Promise((resolve, reject) => {
				// Promise will reject after 50ms to prevent open handle
				setTimeout(() => reject(new Error('Fetch error')), 500);
			})
		);
	});

	beforeEach(() => {
		transportr = new Transportr('https://picsum.photos');
	});

	it('should cancel all requests when abortAll is called', async () => {
		// Spy on SignalController.abort
		const abortSpy = jest.spyOn(SignalController.prototype, 'abort');

		// Initiate multiple requests
		transportr.getImage('/320/240');
		transportr.getImage('/320/240');
		transportr.getImage('/320/240');

		// Call abortAll
		Transportr.abortAll();

		// Ensure all requests have been cancelled
		expect(abortSpy).toHaveBeenCalledTimes(3);

		// Clean up the spy
		abortSpy.mockRestore();
	});

	afterAll(() => {
		globalThis.fetch.mockClear();
		delete global.fetch;
	});
});
