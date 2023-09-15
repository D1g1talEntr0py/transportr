import HttpRequestMethod from './http-request-methods.js';
import { MediaType } from '@d1g1tal/media-type';
import HttpMediaType from './http-media-type.js';

/** @typedef {'configured'|'success'|'error'|'aborted'|'timeout'|'complete'} RequestEvent */

/** @type {string} */
const defaultCharset = 'utf-8';

/** @type {RegExp} */
const endsWithSlashRegEx = /\/$/;

/** @typedef {Map<string, MediaType>} MediaTypeMap A map of media types. */

/** @type {MediaTypeMap} */
const mediaTypes = new Map([
	[HttpMediaType.PNG, new MediaType(HttpMediaType.PNG)],
	[HttpMediaType.TEXT, new MediaType(HttpMediaType.TEXT, { defaultCharset })],
	[HttpMediaType.JSON, new MediaType(HttpMediaType.JSON, { defaultCharset })],
	[HttpMediaType.HTML, new MediaType(HttpMediaType.HTML, { defaultCharset })],
	[HttpMediaType.JAVA_SCRIPT, new MediaType(HttpMediaType.JAVA_SCRIPT, { defaultCharset })],
	[HttpMediaType.CSS, new MediaType(HttpMediaType.CSS, { defaultCharset })],
	[HttpMediaType.XML, new MediaType(HttpMediaType.XML, { defaultCharset })],
	[HttpMediaType.BIN, new MediaType(HttpMediaType.BIN)]
]);

/**
 * @static
 * @constant {Object<string, RequestEvent>}
 */
const RequestEvents = Object.freeze({
	CONFIGURED: 'configured',
	SUCCESS: 'success',
	ERROR: 'error',
	ABORTED: 'aborted',
	TIMEOUT: 'timeout',
	COMPLETE: 'complete',
	ALL_COMPLETE: 'all-complete'
});

const SignalEvents = Object.freeze({
	ABORT: 'abort',
	TIMEOUT: 'timeout'
});

const _abortEvent = new CustomEvent(SignalEvents.ABORT, { detail: { cause: new DOMException('The request was aborted', 'AbortError') } });

const requestBodyMethods = [ HttpRequestMethod.POST, HttpRequestMethod.PUT, HttpRequestMethod.PATCH ];

export { defaultCharset, endsWithSlashRegEx, mediaTypes, RequestEvents, SignalEvents, _abortEvent as abortEvent, requestBodyMethods };