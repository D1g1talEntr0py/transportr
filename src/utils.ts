import { requestBodyMethods } from './constants';
import type { JsonString, JsonValue, RequestBodyMethod, RequestMethod } from '@types';

/**
 * Type guard to check if a request method accepts a body.
 * @param method The request method to check.
 * @returns True if the method accepts a body, false otherwise.
 */
export const isRequestBodyMethod = (method: RequestMethod | undefined): method is RequestBodyMethod =>
	method !== undefined && requestBodyMethods.includes(method);

/**
 * Checks whether a body value is a raw BodyInit type that should be sent as-is
 * (no JSON serialization) and should have its Content-Type deleted so the runtime
 * can set it automatically (e.g. multipart/form-data boundary for FormData).
 * @param body The request body to check.
 * @returns True if the body is a FormData, Blob, ArrayBuffer, TypedArray, DataView, ReadableStream, or URLSearchParams.
 */
export const isRawBody = (body: unknown): body is Exclude<BodyInit, string> =>
	body instanceof FormData || body instanceof Blob || body instanceof ArrayBuffer || body instanceof ReadableStream || body instanceof URLSearchParams || ArrayBuffer.isView(body);

/**
 * Reads a cookie value by name from document.cookie.
 * Returns undefined in non-browser environments or when the cookie is not found.
 * @param name The cookie name to look up.
 * @returns The cookie value or undefined.
 */
export const getCookieValue = (name: string): string | undefined => {
	if (typeof document === 'undefined') { return }
	const cookieStr = document.cookie;
	if (!cookieStr) { return }

	const prefix = `${name}=`;
	const prefixLength = prefix.length;
	const cookieLength = cookieStr.length;
	let start = 0;

	while (start < cookieLength) {
		// Skip leading whitespace (cookies are separated by '; ').
		while (start < cookieLength && cookieStr.charCodeAt(start) === 32) { start++ }

		let end = cookieStr.indexOf(';', start);
		if (end === -1) { end = cookieLength }

		if (end - start >= prefixLength && cookieStr.startsWith(prefix, start)) {
			return decodeURIComponent(cookieStr.slice(start + prefixLength, end));
		}

		start = end + 1;
	}

	return undefined;
};

/**
 * Serialize an object of type T into a JSON string.
 * The type system ensures only JSON-serializable values can be passed.
 * @template T The type of data to serialize (will be validated for JSON compatibility)
 * @param data The object to serialize - must be JSON-serializable.
 * @returns The serialized JSON string.
 */
export const serialize = <const T>(data: JsonValue<T>): JsonString<T> => JSON.stringify(data) as JsonString<T>;

/**
 * Type predicate to check if a value is a string
 * @param value The value to check
 * @returns True if value is a string, with type narrowing
 */
export const isString = (value: unknown): value is string => value !== null && typeof value === 'string';

/**
 * Type predicate to check if a value is an ArrayBuffer (cross-realm safe).
 * @param value The value to check.
 * @returns True if value is an ArrayBuffer, with type narrowing.
 */
export const isArrayBuffer = (value: unknown): value is ArrayBuffer =>
	value instanceof ArrayBuffer || Object.prototype.toString.call(value) === '[object ArrayBuffer]';

/**
 * Type predicate to check if a value is an object (not array or null)
 * @param value The value to check
 * @returns True if value is an object, with type narrowing
 */
export const isObject = <T = object>(value: unknown): value is T extends object ? T : never => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;

/**
 * Performs a deep merge of multiple objects
 * @param objects The objects to merge
 * @returns The merged object
 */
export const objectMerge = (...objects: Record<string, unknown>[]): Record<string, unknown> | undefined => {
	// Early return for empty input
	const length = objects.length;
	if (length === 0) { return undefined }

	// Early return for single object - just clone it
	if (length === 1) {
		const [ obj ] = objects;
		if (!isObject(obj)) { return obj }
		return deepClone(obj);
	}

	const target = {} as Record<string, unknown>;

	for (let s = 0, sLength = objects.length; s < sLength; s++) {
		const source = objects[s]!;
		if (!isObject(source)) { return undefined }

		const keys = Object.keys(source);
		for (let i = 0, length = keys.length; i < length; i++) {
			const property = keys[i]!;
			const sourceValue = source[property];
			const targetValue = target[property];
			if (Array.isArray(sourceValue)) {
				// Handle arrays — source values come first, then unique target values.
				if (Array.isArray(targetValue)) {
					const merged: unknown[] = sourceValue.slice();
					for (let j = 0, tLength = (targetValue as unknown[]).length; j < tLength; j++) {
						const item = (targetValue as unknown[])[j];
						if (!sourceValue.includes(item)) { merged.push(item) }
					}
					target[property] = merged;
				} else {
					target[property] = sourceValue.slice();
				}
			} else if (isObject<Record<string, unknown>>(sourceValue)) {
				// Handle plain objects using the isObject function — we already test targetValue.
				target[property] = isObject<Record<string, unknown>>(targetValue) ? objectMerge(targetValue, sourceValue)! : deepClone(sourceValue);
			} else {
				// Primitive values and null/undefined.
				target[property] = sourceValue;
			}
		}
	}

	return target;
};

/**
 * Creates a deep clone of an object for better performance than spread operator in merge scenarios
 * @param object The object to clone
 * @returns The cloned object
 */
function deepClone<T = Record<PropertyKey, unknown>>(object: T): T {
	if (isObject<Record<PropertyKey, unknown>>(object)) {
		const cloned: Record<PropertyKey, unknown> = {};
		const keys = Object.keys(object);
		for (let i = 0, length = keys.length, key; i < length; i++) {
			key = keys[i]!;
			cloned[key] = deepClone(object[key]);
		}

		return cloned as T;
	}

	// For other object types (Date, RegExp, etc.), return as-is
	return object;
}
