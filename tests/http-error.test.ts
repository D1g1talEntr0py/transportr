import { describe, expect, it } from 'vitest';
import { HttpError } from '../src/http-error.js';
import { ResponseStatus } from '../src/response-status.js';

describe('HttpError', () => {
	it('should create an HttpError instance with correct properties', () => {
		const error = new HttpError(new ResponseStatus(404, 'Not Found'), { message: 'The resource requested was not found' });

		expect(error).toBeInstanceOf(Error);
		expect(error).toBeInstanceOf(HttpError);
		expect(error.message).toBe('The resource requested was not found');
		expect(error.statusCode).toBe(404);
		expect(error.statusText).toBe('Not Found');
		expect(error.entity).toBeUndefined();
		expect(error.toString()).toBe('HttpError: The resource requested was not found');
		expect(Object.prototype.toString.call(error)).toBe('[object HttpError]');
	});
});