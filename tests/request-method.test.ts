import { describe, expect, it } from 'vitest';
import { RequestMethod } from '../src/request-method.js';

describe('RequestMethod', () => {
	it('should have valid string entries for all method names', () => {
		for (const [key, value] of Object.entries(RequestMethod)) {
			expect(typeof key).toBe('string');
			expect(typeof value).toBe('string');
		}
	});

	it('should export common HTTP method constants', () => {
		expect(RequestMethod.GET).toBe('GET');
		expect(RequestMethod.POST).toBe('POST');
		expect(RequestMethod.PUT).toBe('PUT');
		expect(RequestMethod.OPTIONS).toBe('OPTIONS');
	});
});
