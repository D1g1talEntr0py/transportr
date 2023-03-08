import HttpError from '../src/http-error.js';
import { test, expect } from '@jest/globals';

test('HttpError', () => {
	const error = new HttpError('The resource requested was not found', { status: { code: 404, text: 'Not Found' } });

	expect(error).toBeInstanceOf(Error);
	expect(error).toBeInstanceOf(HttpError);
	expect(error.message).toBe('The resource requested was not found');
	expect(error.statusCode).toBe(404);
	expect(error.statusText).toBe('Not Found');
	expect(error.entity).toBeUndefined();
	expect(error.toString()).toBe('HttpError: The resource requested was not found');
	expect(Object.prototype.toString.call(error)).toBe('[object HttpError]');
});