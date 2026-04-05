import { describe, expect, it } from 'vitest';
import { ResponseHeader } from '../src/response-header.js';

describe('ResponseHeader', () => {
	it('should have valid string entries for all header names', () => {
		for (const [key, value] of Object.entries(ResponseHeader)) {
			expect(typeof key).toBe('string');
			expect(typeof value).toBe('string');
		}
	});

	it('should export common response header constants', () => {
		expect(ResponseHeader.CONTENT_TYPE).toBe('content-type');
		expect(ResponseHeader.ETAG).toBe('etag');
		expect(ResponseHeader.LOCATION).toBe('location');
	});
});
