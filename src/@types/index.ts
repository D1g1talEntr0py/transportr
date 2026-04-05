import type { Subscription } from '@d1g1tal/subscribr';
import type { ResponseStatus } from '@src/response-status';
import type { RequestHeader } from '@src/request-header';
import type { ContentType } from '@src/content-type';
import type { HttpError } from '@src/http-error';
import type { HttpErrorOptions, Json, JsonPrimitive, JsonArray, JsonObject, JsonValue, JsonString, ResponseBody, RequestTiming, ServerSentEvent, DownloadProgress, Result, RetryInfo } from '@src/@types/core';

type Prettify<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;
type LiteralUnion<T> = T | (string & {});

interface TypedResponse<T> extends Response {
	json: () => Promise<T>;
}

type RequestBody = BodyInit | JsonObject;
type TypedArray = Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array | BigInt64Array | BigUint64Array;
type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'CONNECT' | 'TRACE';
type RequestBodyMethod = Extract<RequestMethod, 'POST' | 'PUT' | 'PATCH' | 'DELETE'>;
type RequestNoBodyMethod = Exclude<RequestMethod, RequestBodyMethod>;
type RequestHeaders = Prettify<TypedHeaders & { [K in Exclude<typeof RequestHeader[keyof typeof RequestHeader], keyof TypedHeaders>]?: string; } & HeadersInit>;
type SearchParameters = URLSearchParams | string | string[][] | Record<string, string | number | boolean>;
type AuthorizationScheme = 'Basic' | 'Bearer' | 'Digest' | 'HOBA' | 'Mutual' | 'Negotiate' | 'OAuth' | 'SCRAM-SHA-1' | 'SCRAM-SHA-256' | 'vapid';
type ResponseHandler<T extends ResponseBody = ResponseBody> = (response: Response) => Promise<T>;
type RequestLifecycleEvent = 'configured' | 'success' | 'error' | 'aborted' | 'timeout' | 'retry' | 'complete' | 'all-complete';
type RequestEventHandler = (event: Event, data: unknown) => void;
type Entry<K, V> = [K, V];
type Entries<K, V> = Entry<K, V>[];
type ReadOnlyEntries<K, V> = readonly Entry<K, V>[];

type AbortSignalEvent = Event & { target: AbortSignal };
type AbortEvent = CustomEvent<{ cause: 'AbortError' }>;
type TimeoutEvent = CustomEvent<{ cause: 'TimeoutError' }>;

type AbortConfiguration = {
	signal?: AbortSignal | null;
	timeout?: number;
};

type MediaTypeValues = LiteralUnion<typeof ContentType[keyof typeof ContentType]>;
type TypedHeaders = {
	[RequestHeader.AUTHORIZATION]?: `${AuthorizationScheme} ${string}` | AuthorizationScheme;
	[RequestHeader.ACCEPT]?: MediaTypeValues;
	[RequestHeader.CONTENT_TYPE]?: MediaTypeValues;
};

type EventRegistration = Subscription;

type MethodBody = {
	method?: RequestBodyMethod;
	body?: RequestBody;
} | {
	method?: RequestNoBodyMethod;
	body?: never;
};

type RequestOptions = Prettify<{
	/** A Headers object, an object literal, or an array of two-item arrays to set request's headers. */
	headers?: RequestHeaders;
	searchParams?: SearchParameters;
	timeout?: number;
	global?: boolean;
	/** Lifecycle hooks for this request. Instance and global hooks run first, then per-request hooks. */
	hooks?: HookOptions;
	/** Retry configuration. A number sets the retry limit; an object provides fine-grained control. */
	retry?: number | RetryOptions;
	/** When true, identical in-flight GET/HEAD requests share a single fetch. Defaults to false. */
	dedupe?: boolean;
	/** XSRF/CSRF protection. When set (or true), reads a cookie and sets a request header. */
	xsrf?: boolean | XsrfOptions;
} & Omit<RequestInit, 'headers'> & MethodBody>;

/** Configuration for retry behavior on failed requests. */
type RetryOptions = {
	/** Maximum number of retry attempts. Defaults to 0 (no retries). */
	limit?: number;
	/** HTTP status codes that trigger a retry. Defaults to [408, 413, 429, 500, 502, 503, 504]. */
	statusCodes?: number[];
	/** HTTP methods allowed to retry. Defaults to ['GET', 'PUT', 'HEAD', 'DELETE', 'OPTIONS']. */
	methods?: RequestMethod[];
	/** Delay in ms before the first retry, or a function receiving the attempt number (1-based) returning ms. Defaults to 300. */
	delay?: number | ((attempt: number) => number);
	/** Multiplier applied to delay after each attempt. Defaults to 2. */
	backoffFactor?: number;
};

/** Configuration for XSRF/CSRF token handling. */
type XsrfOptions = {
	/** The name of the cookie to read the token from. Defaults to 'XSRF-TOKEN'. */
	cookieName?: string;
	/** The request header name to set the token on. Defaults to 'X-XSRF-TOKEN'. */
	headerName?: string;
};

/** Hook called before each request. Can modify the request options. */
type BeforeRequestHook = (options: RequestOptions, url: URL) => RequestOptions | void | Promise<RequestOptions | void>;
/** Hook called after each successful response. Can modify or replace the response. */
type AfterResponseHook = (response: Response, options: RequestOptions) => Response | void | Promise<Response | void>;
/** Hook called before an error is thrown. Can transform the error. */
type BeforeErrorHook = (error: HttpError) => HttpError | void | Promise<HttpError | void>;

/** Configuration for request lifecycle hooks. */
type HookOptions = {
	beforeRequest?: BeforeRequestHook[];
	afterResponse?: AfterResponseHook[];
	beforeError?: BeforeErrorHook[];
};

/** Fully resolved retry configuration with all defaults applied. */
type NormalizedRetryOptions = Required<RetryOptions>;

/** Maps request event names to their typed data payloads. */
type RequestEventDataMap = {
	configured: RequestOptions;
	success: ResponseBody;
	error: import('@src/http-error').HttpError;
	aborted: undefined;
	timeout: undefined;
	retry: RetryInfo;
	complete: { timing: RequestTiming };
	'all-complete': undefined;
};

/** A typed event handler where the data parameter matches the event name. */
type TypedRequestEventHandler<E extends keyof RequestEventDataMap> = (event: Event, data: RequestEventDataMap[E]) => void;

/** Options for the internal publish helper. */
type PublishOptions = { name: string; event?: Event; data?: unknown; global?: boolean };

export type {
	Json,
	JsonString,
	JsonPrimitive,
	JsonArray,
	JsonObject,
	JsonValue,
	AbortEvent,
	TimeoutEvent,
	AbortSignalEvent,
	AbortConfiguration,
	AfterResponseHook,
	BeforeErrorHook,
	BeforeRequestHook,
	DownloadProgress,
	EventRegistration,
	HookOptions,
	HttpErrorOptions,
	RequestBody,
	RequestBodyMethod,
	RequestEventHandler,
	RequestEventDataMap,
	RetryInfo,
	Entries,
	ReadOnlyEntries,
	RequestHeaders,
	RequestLifecycleEvent,
	RequestMethod,
	RequestOptions,
	RequestTiming,
	NormalizedRetryOptions,
	PublishOptions,
	RetryOptions,
	TypedResponse,
	ResponseBody,
	ResponseHandler,
	ResponseStatus,
	SearchParameters,
	TypedArray,
	XsrfOptions
};
