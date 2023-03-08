import ResponseStatus from '../src/response-status.js';
import { test, expect } from '@jest/globals';

test('ResponseStatus', () => {
	const status = new ResponseStatus(404, 'Not Found');

	expect(status).toBeInstanceOf(ResponseStatus);
	expect(Object.prototype.toString.call(status)).toBe('[object ResponseStatus]');
	expect(status.code).toBe(404);
	expect(status.text).toBe('Not Found');
	expect(status.toString()).toBe('404 Not Found');
});