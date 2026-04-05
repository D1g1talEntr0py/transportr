import { MediaType } from '@d1g1tal/media-type';
import { ResponseStatus } from './response-status';
import type { AbortEvent, TimeoutEvent, RequestMethod } from '@types';

const charset = { charset: 'utf-8' };
const endsWithSlashRegEx: RegExp = /\/$/;
/** Default XSRF cookie name */
const XSRF_COOKIE_NAME = 'XSRF-TOKEN';
/** Default XSRF header name */
const XSRF_HEADER_NAME = 'X-XSRF-TOKEN';

type MediaTypeKey = 'PNG' | 'TEXT' | 'JSON' | 'HTML' | 'JAVA_SCRIPT' | 'CSS' | 'XML' | 'BIN' | 'EVENT_STREAM' | 'NDJSON';

const mediaTypes: { [key in MediaTypeKey]: MediaType } = {
	PNG: new MediaType('image/png'),
	TEXT: new MediaType('text/plain', charset),
	JSON: new MediaType('application/json', charset),
	HTML: new MediaType('text/html', charset),
	JAVA_SCRIPT: new MediaType('text/javascript', charset),
	CSS: new MediaType('text/css', charset),
	XML: new MediaType('application/xml', charset),
	BIN: new MediaType('application/octet-stream'),
	EVENT_STREAM: new MediaType('text/event-stream', charset),
	NDJSON: new MediaType('application/x-ndjson', charset)
} as const;

const defaultMediaType: string = mediaTypes.JSON.toString();
const defaultOrigin = globalThis.location?.origin ?? 'http://localhost';

/** Constant object for caching policies */
const RequestCachingPolicy = {
	DEFAULT: 'default',
	FORCE_CACHE: 'force-cache',
	NO_CACHE: 'no-cache',
	NO_STORE: 'no-store',
	ONLY_IF_CACHED: 'only-if-cached',
	RELOAD: 'reload'
} as const;

/** Constant object for request events */
export const RequestEvent = {
	CONFIGURED: 'configured',
	SUCCESS: 'success',
	ERROR: 'error',
	ABORTED: 'aborted',
	TIMEOUT: 'timeout',
	RETRY: 'retry',
	COMPLETE: 'complete',
	ALL_COMPLETE: 'all-complete'
} as const;

/** Constant object for signal events */
const SignalEvents = {
	ABORT: 'abort',
	TIMEOUT: 'timeout'
} as const;

/** Constant object for signal errors */
const SignalErrors = {
	ABORT: 'AbortError',
	TIMEOUT: 'TimeoutError'
} as const;

/** Options for adding event listeners */
const eventListenerOptions: AddEventListenerOptions = { once: true, passive: true };

/**
 * Creates a new custom abort event.
 * @returns A new AbortEvent instance.
 */
const abortEvent = (): AbortEvent => new CustomEvent(SignalEvents.ABORT, { detail: { cause: SignalErrors.ABORT } });

/**
 * Creates a new custom timeout event.
 * @returns A new TimeoutEvent instance.
 */
const timeoutEvent = (): TimeoutEvent => new CustomEvent(SignalEvents.TIMEOUT, { detail: { cause: SignalErrors.TIMEOUT } });

/** Array of request body methods */
const requestBodyMethods: ReadonlyArray<RequestMethod> = [ 'POST', 'PUT', 'PATCH', 'DELETE' ];

/** Response status for internal server error */
const internalServerError: ResponseStatus = new ResponseStatus(500, 'Internal Server Error');

/** Response status for aborted request */
const aborted: ResponseStatus = new ResponseStatus(499, 'Aborted');

/** Response status for timed out request */
const timedOut: ResponseStatus = new ResponseStatus(504, 'Request Timeout');

/** Default HTTP status codes that trigger a retry */
const retryStatusCodes: ReadonlyArray<number> = [ 408, 413, 429, 500, 502, 503, 504 ];

/** Default HTTP methods allowed to retry (idempotent methods only) */
const retryMethods: ReadonlyArray<RequestMethod> = [ 'GET', 'PUT', 'HEAD', 'DELETE', 'OPTIONS' ];

/** Default delay in ms before the first retry */
const retryDelay: number = 300;

/** Default backoff factor applied after each retry attempt */
const retryBackoffFactor: number = 2;

export { aborted, abortEvent, endsWithSlashRegEx, eventListenerOptions, internalServerError, mediaTypes, defaultMediaType, defaultOrigin, requestBodyMethods, RequestCachingPolicy, retryBackoffFactor, retryDelay, retryMethods, retryStatusCodes, SignalErrors, SignalEvents, timedOut, timeoutEvent, XSRF_COOKIE_NAME, XSRF_HEADER_NAME };
export type RequestEvent = (typeof RequestEvent)[keyof typeof RequestEvent];