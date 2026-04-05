import { describe, expect, it } from 'vitest';
import { MediaType } from '@d1g1tal/media-type';
import { ContentType } from '../src/content-type.js';

describe('ContentType', () => {
	it('should have valid string entries for all media types', () => {
		for (const [key, value] of Object.entries(ContentType)) {
			expect(typeof key === 'string').toBe(true);
			expect(typeof value === 'string').toBe(true);
		}
	});

	it('should work with MediaType class', () => {
		const mediaType = new MediaType(ContentType.JSON, { charset: 'utf-8' });

		expect(mediaType.type).toBe('application');
		expect(mediaType.subtype).toBe('json');
		expect(mediaType.toString()).toBe('application/json;charset=utf-8');
		expect(mediaType.parameters.get('charset')).toBe('utf-8');
	});
});