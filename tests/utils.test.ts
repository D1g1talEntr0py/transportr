import { describe, it, expect, vi, afterEach } from 'vitest';
import { isRequestBodyMethod, isRawBody, getCookieValue, isString, isObject, objectMerge, serialize } from '../src/utils.js';

describe('Utils', () => {
	describe('isRequestBodyMethod', () => {
		it('should return true for POST', () => {
			expect(isRequestBodyMethod('POST')).toBe(true);
		});

		it('should return true for PUT', () => {
			expect(isRequestBodyMethod('PUT')).toBe(true);
		});

		it('should return true for PATCH', () => {
			expect(isRequestBodyMethod('PATCH')).toBe(true);
		});

		it('should return true for DELETE', () => {
			expect(isRequestBodyMethod('DELETE')).toBe(true);
		});

		it('should return false for GET', () => {
			expect(isRequestBodyMethod('GET')).toBe(false);
		});

		it('should return false for HEAD', () => {
			expect(isRequestBodyMethod('HEAD')).toBe(false);
		});

		it('should return false for OPTIONS', () => {
			expect(isRequestBodyMethod('OPTIONS')).toBe(false);
		});

		it('should return false for undefined', () => {
			expect(isRequestBodyMethod(undefined)).toBe(false);
		});
	});

	describe('isRawBody', () => {
		it('should return true for FormData', () => {
			expect(isRawBody(new FormData())).toBe(true);
		});

		it('should return true for Blob', () => {
			expect(isRawBody(new Blob())).toBe(true);
		});

		it('should return true for ArrayBuffer', () => {
			expect(isRawBody(new ArrayBuffer(8))).toBe(true);
		});

		it('should return true for ReadableStream', () => {
			expect(isRawBody(new ReadableStream())).toBe(true);
		});

		it('should return true for URLSearchParams', () => {
			expect(isRawBody(new URLSearchParams())).toBe(true);
		});

		it('should return true for TypedArray (Uint8Array)', () => {
			expect(isRawBody(new Uint8Array(4))).toBe(true);
		});

		it('should return false for a plain object', () => {
			expect(isRawBody({ key: 'value' })).toBe(false);
		});

		it('should return false for a string', () => {
			expect(isRawBody('hello')).toBe(false);
		});

		it('should return false for null', () => {
			expect(isRawBody(null)).toBe(false);
		});
	});

	describe('getCookieValue', () => {
		afterEach(() => {
			Object.defineProperty(document, 'cookie', { value: '', writable: true, configurable: true });
		});

		it('should return undefined when document.cookie is empty', () => {
			Object.defineProperty(document, 'cookie', { value: '', writable: true, configurable: true });
			expect(getCookieValue('token')).toBeUndefined();
		});

		it('should return the cookie value when found', () => {
			Object.defineProperty(document, 'cookie', { value: 'token=abc123', writable: true, configurable: true });
			expect(getCookieValue('token')).toBe('abc123');
		});

		it('should return the correct cookie when multiple cookies exist', () => {
			Object.defineProperty(document, 'cookie', { value: 'a=1; token=xyz; b=2', writable: true, configurable: true });
			expect(getCookieValue('token')).toBe('xyz');
		});

		it('should return undefined when cookie is not found', () => {
			Object.defineProperty(document, 'cookie', { value: 'a=1; b=2', writable: true, configurable: true });
			expect(getCookieValue('token')).toBeUndefined();
		});

		it('should decode URI-encoded cookie values', () => {
			Object.defineProperty(document, 'cookie', { value: 'token=hello%20world', writable: true, configurable: true });
			expect(getCookieValue('token')).toBe('hello world');
		});

		it('should handle cookies with leading spaces', () => {
			Object.defineProperty(document, 'cookie', { value: '  token=abc', writable: true, configurable: true });
			expect(getCookieValue('token')).toBe('abc');
		});

		it('should not match partial cookie names', () => {
			Object.defineProperty(document, 'cookie', { value: 'mytoken=abc', writable: true, configurable: true });
			expect(getCookieValue('token')).toBeUndefined();
		});
	});

	describe('serialize', () => {
		it('should serialize an object to JSON string', () => {
			const data = { name: 'test', value: 42 };
			const result = serialize(data);
			expect(result).toBe('{"name":"test","value":42}');
		});

		it('should serialize a string value', () => {
			const result = serialize('hello');
			expect(result).toBe('"hello"');
		});

		it('should serialize a number', () => {
			const result = serialize(123);
			expect(result).toBe('123');
		});

		it('should serialize null', () => {
			const result = serialize(null);
			expect(result).toBe('null');
		});

		it('should serialize a boolean', () => {
			expect(serialize(true)).toBe('true');
			expect(serialize(false)).toBe('false');
		});

		it('should serialize nested objects', () => {
			const data = { a: { b: { c: 1 } } };
			expect(serialize(data)).toBe('{"a":{"b":{"c":1}}}');
		});
	});

	describe('isString', () => {
		it('should return true for a string', () => {
			expect(isString('hello')).toBe(true);
		});

		it('should return true for an empty string', () => {
			expect(isString('')).toBe(true);
		});

		it('should return false for null', () => {
			expect(isString(null)).toBe(false);
		});

		it('should return false for undefined', () => {
			expect(isString(undefined)).toBe(false);
		});

		it('should return false for a number', () => {
			expect(isString(42)).toBe(false);
		});

		it('should return false for an object', () => {
			expect(isString({})).toBe(false);
		});
	});

	describe('isObject', () => {
		it('should return true for a plain object', () => {
			expect(isObject({})).toBe(true);
		});

		it('should return true for an object with properties', () => {
			expect(isObject({ a: 1 })).toBe(true);
		});

		it('should return false for null', () => {
			expect(isObject(null)).toBe(false);
		});

		it('should return false for an array', () => {
			expect(isObject([1, 2, 3])).toBe(false);
		});

		it('should return false for a string', () => {
			expect(isObject('hello')).toBe(false);
		});

		it('should return false for a Date', () => {
			expect(isObject(new Date())).toBe(false);
		});

		it('should return false for a Map', () => {
			expect(isObject(new Map())).toBe(false);
		});

		it('should return false for undefined', () => {
			expect(isObject(undefined)).toBe(false);
		});
	});

	describe('objectMerge', () => {
		it('should return undefined for no arguments', () => {
			expect(objectMerge()).toBeUndefined();
		});

		it('should clone a single object', () => {
			const obj = { a: 1, b: 'hello' };
			const result = objectMerge(obj);
			expect(result).toEqual(obj);
			expect(result).not.toBe(obj);
		});

		it('should return the value as-is for a single non-object argument', () => {
			// When called with a non-object value (fails the isObject check), returns it directly
			const arr = [1, 2, 3] as unknown as Record<PropertyKey, unknown>;
			const result = objectMerge(arr);
			expect(result).toBe(arr);
		});

		it('should merge two objects', () => {
			const result = objectMerge({ a: 1 }, { b: 2 });
			expect(result).toEqual({ a: 1, b: 2 });
		});

		it('should override primitive values from later objects', () => {
			const result = objectMerge({ a: 1 }, { a: 2 });
			expect(result).toEqual({ a: 2 });
		});

		it('should deep merge nested objects', () => {
			const result = objectMerge(
				{ nested: { a: 1, b: 2 } },
				{ nested: { b: 3, c: 4 } }
			);
			expect(result).toEqual({ nested: { a: 1, b: 3, c: 4 } });
		});

		it('should merge arrays with unique values from target', () => {
			const result = objectMerge(
				{ items: [1, 2, 3] },
				{ items: [3, 4, 5] }
			);
			expect(result).toEqual({ items: [3, 4, 5, 1, 2] });
		});

		it('should handle source array overriding non-array target', () => {
			const result = objectMerge(
				{ items: 'not-an-array' },
				{ items: [1, 2] }
			);
			expect(result).toEqual({ items: [1, 2] });
		});

		it('should deep clone nested objects in source when target has no matching key', () => {
			const nested = { deep: { value: 42 } };
			const result = objectMerge({}, nested);
			expect(result).toEqual({ deep: { value: 42 } });
			// Ensure it's a deep clone
			expect((result as any).deep).not.toBe(nested.deep);
		});

		it('should return undefined when merging with a non-object source', () => {
			const result = objectMerge({ a: 1 }, [1, 2] as unknown as Record<PropertyKey, unknown>);
			expect(result).toBeUndefined();
		});

		it('should merge three objects', () => {
			const result = objectMerge({ a: 1 }, { b: 2 }, { c: 3 });
			expect(result).toEqual({ a: 1, b: 2, c: 3 });
		});

		it('should handle null/undefined values as primitives', () => {
			const result = objectMerge({ a: 'hello' }, { a: null as unknown as string });
			expect(result).toEqual({ a: null });
		});

		it('should deep clone when object source replaces non-object target', () => {
			const result = objectMerge(
				{ config: 'string-value' },
				{ config: { key: 'value' } }
			);
			expect(result).toEqual({ config: { key: 'value' } });
		});
	});

	describe('deepClone (via objectMerge)', () => {
		it('should deeply clone nested objects', () => {
			const original = { a: { b: { c: 1 } } };
			const cloned = objectMerge(original);
			expect(cloned).toEqual(original);
			expect((cloned as any).a).not.toBe(original.a);
			expect((cloned as any).a.b).not.toBe(original.a.b);
		});

		it('should handle objects with primitive values', () => {
			const original = { str: 'hello', num: 42, bool: true, nil: null };
			const cloned = objectMerge(original);
			expect(cloned).toEqual(original);
		});

		it('should handle empty objects', () => {
			const original = {};
			const cloned = objectMerge(original);
			expect(cloned).toEqual({});
			expect(cloned).not.toBe(original);
		});
	});
});
