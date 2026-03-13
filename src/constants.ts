import { MediaType } from '@d1g1tal/media-type';
import { HttpMediaType } from './http-media-type';
import { HttpRequestMethod } from './http-request-methods';
import { ResponseStatus } from './response-status';
import type { AbortEvent, TimeoutEvent, RequestMethod } from '@types';

const charset = { charset: 'utf-8' };
const endsWithSlashRegEx: RegExp = /\/$/;
/** Default XSRF cookie name */
const XSRF_COOKIE_NAME = 'XSRF-TOKEN';
/** Default XSRF header name */
const XSRF_HEADER_NAME = 'X-XSRF-TOKEN';

type MediaTypeKey = 'PNG' | 'TEXT' | 'JSON' | 'HTML' | 'JAVA_SCRIPT' | 'CSS' | 'XML' | 'BIN';

const mediaTypes: { [key in MediaTypeKey]: MediaType } = {
	PNG: new MediaType(HttpMediaType.PNG),
	TEXT: new MediaType(HttpMediaType.TEXT, charset),
	JSON: new MediaType(HttpMediaType.JSON, charset),
	HTML: new MediaType(HttpMediaType.HTML, charset),
	JAVA_SCRIPT: new MediaType(HttpMediaType.JAVA_SCRIPT, charset),
	CSS: new MediaType(HttpMediaType.CSS, charset),
	XML: new MediaType(HttpMediaType.XML, charset),
	BIN: new MediaType(HttpMediaType.BIN)
} as const;

const defaultMediaType: string = mediaTypes.JSON.toString();

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
const requestBodyMethods: ReadonlyArray<RequestMethod> = [ HttpRequestMethod.POST, HttpRequestMethod.PUT, HttpRequestMethod.PATCH, HttpRequestMethod.DELETE ];

/** Response status for internal server error */
const internalServerError: ResponseStatus = new ResponseStatus(500, 'Internal Server Error');

/** Response status for aborted request */
const aborted: ResponseStatus = new ResponseStatus(499, 'Aborted');

/** Response status for timed out request */
const timedOut: ResponseStatus = new ResponseStatus(504, 'Request Timeout');

/** Default HTTP status codes that trigger a retry */
const retryStatusCodes: ReadonlyArray<number> = [ 408, 413, 429, 500, 502, 503, 504 ];

/** Default HTTP methods allowed to retry (idempotent methods only) */
const retryMethods: ReadonlyArray<RequestMethod> = [ HttpRequestMethod.GET, HttpRequestMethod.PUT, HttpRequestMethod.HEAD, HttpRequestMethod.DELETE, HttpRequestMethod.OPTIONS ];

/** Default delay in ms before the first retry */
const retryDelay: number = 300;

/** Default backoff factor applied after each retry attempt */
const retryBackoffFactor: number = 2;

export { aborted, abortEvent, endsWithSlashRegEx, eventListenerOptions, internalServerError, mediaTypes, defaultMediaType, requestBodyMethods, RequestCachingPolicy, retryBackoffFactor, retryDelay, retryMethods, retryStatusCodes, SignalErrors, SignalEvents, timedOut, timeoutEvent, XSRF_COOKIE_NAME, XSRF_HEADER_NAME };
export type RequestEvent = (typeof RequestEvent)[keyof typeof RequestEvent];