// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Function<P = any, R = unknown> = (...args: P[]) => R;

// JSON types
type JsonPrimitive = string | number | boolean | null;
type JsonArray<T = any> = T extends any ? Array<JsonValue<T>> : never;
type JsonObject<T = any> = T extends any ? { [K in keyof T as JsonValue<T[K]> extends never ? never : K]: JsonValue<T[K]> } : Record<string, any>;
type JsonValue<T = any> = T extends JsonPrimitive ? T : T extends { toJSON: () => infer R } ? R	: T extends Function | undefined ? never : T extends Array<infer U>	? JsonArray<U> : T extends Record<string, any> ? JsonObject<T> : Json;
type Json = JsonPrimitive | JsonObject | JsonArray;
type JsonString<T = unknown> = string & { source: T };

/** The expected response body types returned from a fetch handler. */
type ResponseBody = Json | Document | DocumentFragment | HTMLImageElement | Blob | ArrayBuffer | FormData | string | ReadableStream<Uint8Array> | void | null;

/** Timing information for a request lifecycle. */
type RequestTiming = {
	/** Timestamp when the request started (ms since epoch). */
	start: number;
	/** Timestamp when the response was received (ms since epoch). */
	end: number;
	/** Total duration in milliseconds. */
	duration: number;
};

/** Options for constructing an {@link HttpError}. */
type HttpErrorOptions = {
	message?: string;
	cause?: Error;
	entity?: ResponseBody;
	/** The request URL. */
	url?: URL;
	/** The HTTP method used. */
	method?: string;
	/** Request timing information. */
	timing?: RequestTiming;
};

export type { Json, JsonPrimitive, JsonArray, JsonObject, JsonValue, JsonString, ResponseBody, RequestTiming, HttpErrorOptions };
