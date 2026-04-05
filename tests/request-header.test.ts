import { describe, expect, it } from 'vitest';
import { RequestHeader } from '../src/request-header.js';

describe('RequestHeader', () => {
	it('should have valid string entries for all header names', () => {
		for (const [key, value] of Object.entries(RequestHeader)) {
			expect(typeof key).toBe('string');
			expect(typeof value).toBe('string');
		}
	});

	it('should export common header constants', () => {
		expect(RequestHeader.ACCEPT).toBe('accept');
		expect(RequestHeader.CONTENT_TYPE).toBe('content-type');
		expect(RequestHeader.AUTHORIZATION).toBe('authorization');
	});
});
