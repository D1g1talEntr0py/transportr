import { MediaType } from '@d1g1tal/media-type';
import { expect, test } from '@jest/globals';
import HttpMediaType from '../src/http-media-type.js';

test('HttpMediaType', () => {
	for (const [key, value] of Object.entries(HttpMediaType)) {
		expect(typeof key === 'string').toBe(true);
		expect(typeof value === 'string').toBe(true);
	}

	const mediaType = new MediaType(HttpMediaType.JSON);
	expect(mediaType.type).toBe('application');
	expect(mediaType.subtype).toBe('json');
	expect(mediaType.toString()).toBe('application/json');
});