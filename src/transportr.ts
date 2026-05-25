import { MediaType } from '@d1g1tal/media-type';
import { Subscribr } from '@d1g1tal/subscribr';
import { HttpError } from './http-error';
import { ResponseStatus } from './response-status';
import { SignalController } from './signal-controller.js';
import { handleText, handleScript, handleCss, handleJson, handleBlob, handleImage, handleBuffer, handleReadableStream, handleXml, handleHtml, handleHtmlFragment, handleHtmlFragmentWithScripts, handleEventStream, handleNdjsonStream } from './response-handlers';
import { isRequestBodyMethod, isRawBody, getCookieValue, isString, isArrayBuffer, isObject, objectMerge, serialize } from './utils';
import { RequestCachingPolicy, RequestEvent, SignalErrors, XSRF_COOKIE_NAME, XSRF_HEADER_NAME, abortEvent, aborted, defaultMediaType, defaultOrigin, internalServerError, mediaTypes, retryBackoffFactor, retryDelay, retryMethods, retryStatusCodes, timedOut } from './constants';
import type {	RequestBody, RequestBodyMethod, RequestOptions, ResponseBody, RequestEventHandler, SearchParameters, EventRegistration, ResponseHandler, RequestHeaders, TypedResponse, Json, Entries, HookOptions, HttpErrorOptions, NormalizedRetryOptions, PublishOptions, RetryOptions, RequestTiming, XsrfOptions, ServerSentEvent, RequestEventDataMap, TypedRequestEventHandler, Result, BeforeRequestHook, AfterResponseHook, BeforeErrorHook } from '@types';

/** A handler-set for the three lifecycle phases. Used to skip empty hook loops without allocating a transient array per phase. */
type HookCount = { beforeRequest: number, afterResponse: number, beforeError: number };

declare function fetch<R = unknown>(input: RequestInfo | URL, requestOptions?: RequestOptions): Promise<TypedResponse<R>>;

type RequestConfiguration = {
	signalController: NonNullable<SignalController>,
	requestOptions: RequestOptions,
	global: boolean
};

/**
 * A wrapper around the fetch API that makes it easier to make HTTP requests.
 * @author D1g1talEntr0py <jason.dimeo@gmail.com>
 */
export class Transportr {
	readonly #baseUrl: URL;
	readonly #origin: string;
	/** Pre-normalized base pathname with any trailing slash stripped — reused per request to avoid repeated regex/replace work. */
	readonly #basePath: string;
	readonly #options: RequestOptions;
	/** Pre-built Headers template for methods that strip Content-Type (GET/HEAD/OPTIONS/etc.). Cloned per request. Rebuilt by `configure()` when defaults change. */
	#noBodyHeadersTemplate: Headers;
	readonly #subscribr: Subscribr;
	readonly #hooks: Required<HookOptions> = { beforeRequest: [], afterResponse: [], beforeError: [] };
	/** Aggregate count of hooks registered on this instance — zero phases are skipped without array allocation. */
	readonly #hookCount: HookCount = { beforeRequest: 0, afterResponse: 0, beforeError: 0 };
	/** Per-event subscription counts on this instance — used to skip publish() entirely when no listeners exist. */
	readonly #subCounts: Record<string, number> = Object.create(null) as Record<string, number>;
	static #globalSubscribr = new Subscribr();
	static #globalHooks: Required<HookOptions> = { beforeRequest: [], afterResponse: [], beforeError: [] };
	/** Aggregate count of registered global hooks — zero means we skip the entire global-hook loop. */
	static #globalHookCount: HookCount = { beforeRequest: 0, afterResponse: 0, beforeError: 0 };
	/** Per-event subscription counts on the global subscribr — mirrors `subCounts` per instance. */
	static #globalSubCounts: Record<string, number> = Object.create(null) as Record<string, number>;
	static #signalControllers = new Set<SignalController>();
	/** Map of in-flight deduplicated requests keyed by URL + method */
	static #inflightRequests = new Map<string, Promise<Response>>();
	/** Cached config for the common "no retry" case (retry === undefined) */
	static readonly #noRetryConfig: NormalizedRetryOptions = { limit: 0, statusCodes: [], methods: [], delay: retryDelay, backoffFactor: retryBackoffFactor };
	/** Memoized normalized retry options keyed by the user-provided RetryOptions object (reference identity). */
	static readonly #retryConfigCache = new WeakMap<object, NormalizedRetryOptions>();
	/** Cache for parsed MediaType instances to avoid re-parsing the same content-type strings */
	static #mediaTypeCache = new Map([[ defaultMediaType.toString(), defaultMediaType ]]);
	/** Cache mapping raw response Content-Type header strings to their resolved ResponseHandler (or null when no handler matches). */
	static readonly #handlerResolutionCache = new Map<string, ResponseHandler<ResponseBody> | null>();
	static #contentTypeHandlers: Entries<string, ResponseHandler<ResponseBody>> = [
		[ mediaTypes.TEXT, handleText ],
		[ mediaTypes.JSON, handleJson ],
		[ mediaTypes.BIN, handleReadableStream ],
		[ mediaTypes.HTML, handleHtml ],
		[ mediaTypes.XML, handleXml ],
		[ mediaTypes.PNG, handleImage ],
		[ mediaTypes.JAVA_SCRIPT, handleScript ],
		[ mediaTypes.CSS, handleCss ]
	];

	/**
	 * Create a new Transportr instance with the provided location or origin and context path.
	 *
	 * @param url The URL for {@link fetch} requests.
	 * @param options The default {@link RequestOptions} for this instance.
	 */
	constructor(url: URL | string | RequestOptions = defaultOrigin, options: RequestOptions = {}) {
		if (isObject(url)) { [ url, options ] = [ defaultOrigin, url ] }

		this.#baseUrl = Transportr.#getBaseUrl(url);
		this.#origin = this.#baseUrl.origin;
		// Normalize once: strip a single trailing '/' so per-request URL building is plain string concatenation.
		const basePath = this.#baseUrl.pathname;
		this.#basePath = basePath.length > 0 && basePath.charCodeAt(basePath.length - 1) === 47 ? basePath.slice(0, -1) : basePath;
		this.#options = Transportr.#createOptions(options, Transportr.#defaultRequestOptions);
		// Pre-build a Headers template for methods that drop Content-Type (GET/HEAD/OPTIONS/etc.).
		this.#noBodyHeadersTemplate = new Headers(this.#options.headers);
		this.#noBodyHeadersTemplate.delete('content-type');
		this.#subscribr = new Subscribr();
	}

	/** Credentials Policy */
	static readonly CredentialsPolicy = {
		INCLUDE: 'include',
		OMIT: 'omit',
		SAME_ORIGIN: 'same-origin'
	} as const;

	/** Request Mode */
	static readonly RequestMode = {
		CORS: 'cors',
		NAVIGATE: 'navigate',
		NO_CORS: 'no-cors',
		SAME_ORIGIN: 'same-origin'
	} as const;

	/** Request Priority */
	static readonly RequestPriority = {
		HIGH: 'high',
		LOW: 'low',
		AUTO: 'auto'
	} as const;

	/** Redirect Policy */
	static readonly RedirectPolicy = {
		ERROR: 'error',
		FOLLOW: 'follow',
		MANUAL: 'manual'
	} as const;

	/** Referrer Policy */
	static readonly ReferrerPolicy = {
		NO_REFERRER: 'no-referrer',
		NO_REFERRER_WHEN_DOWNGRADE: 'no-referrer-when-downgrade',
		ORIGIN: 'origin',
		ORIGIN_WHEN_CROSS_ORIGIN: 'origin-when-cross-origin',
		SAME_ORIGIN: 'same-origin',
		STRICT_ORIGIN: 'strict-origin',
		STRICT_ORIGIN_WHEN_CROSS_ORIGIN: 'strict-origin-when-cross-origin',
		UNSAFE_URL: 'unsafe-url'
	} as const;

	/** Request Event */
	static readonly RequestEvent: typeof RequestEvent = RequestEvent;

	/** Default Request Options */
	static readonly #defaultRequestOptions: RequestOptions = {
		body: undefined,
		cache: RequestCachingPolicy.NO_STORE,
		credentials: Transportr.CredentialsPolicy.SAME_ORIGIN,
		headers: new Headers({ 'content-type': defaultMediaType.toString(), accept: defaultMediaType.toString() }),
		searchParams: undefined,
		integrity: undefined,
		keepalive: undefined,
		method: 'GET',
		mode: Transportr.RequestMode.CORS,
		priority: Transportr.RequestPriority.AUTO,
		redirect: Transportr.RedirectPolicy.FOLLOW,
		referrer: 'about:client',
		referrerPolicy: Transportr.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
		signal: undefined,
		timeout: 30000,
		global: true
	};

	/**
	 * Returns a {@link EventRegistration} used for subscribing to global events with typed data.
	 *
	 * @param event The event to subscribe to.
	 * @param handler The event handler with typed data parameter.
	 * @param context The context to bind the handler to.
	 * @returns A new {@link EventRegistration} instance.
	 */
	static register<E extends keyof RequestEventDataMap>(event: E, handler: TypedRequestEventHandler<E>, context?: unknown): EventRegistration;

	/**
	 * @internal
	 * @param event The event to subscribe to.
	 * @param handler The event handler.
	 * @param context The context to bind the handler to.
	 * @returns A new {@link EventRegistration} instance.
	 */
	static register(event: RequestEvent, handler: RequestEventHandler, context?: unknown): EventRegistration {
		const registration = Transportr.#globalSubscribr.subscribe(event, handler, context);
		Transportr.#globalSubCounts[event] = (Transportr.#globalSubCounts[event] ?? 0) + 1;
		return registration;
	}

	/**
	 * Removes a {@link EventRegistration} from the global event handler.
	 *
	 * @param eventRegistration The {@link EventRegistration} to remove.
	 * @returns True if the {@link EventRegistration} was removed, false otherwise.
	 */
	static unregister(eventRegistration: EventRegistration): boolean {
		const removed = Transportr.#globalSubscribr.unsubscribe(eventRegistration);
		if (removed) {
			const event = eventRegistration.eventName;
			const next = (Transportr.#globalSubCounts[event] ?? 1) - 1;
			if (next <= 0) { delete Transportr.#globalSubCounts[event] } else { Transportr.#globalSubCounts[event] = next }
		}
		return removed;
	}

	/**
	 * Aborts all active requests.
	 * This is useful for when the user navigates away from the current page.
	 * This will also clear the {@link Transportr#signalControllers} set.
	 */
	static abortAll(): void {
		for (const signalController of this.#signalControllers) {
			signalController.abort(abortEvent());
		}

		// Clear the set after aborting all requests
		this.#signalControllers.clear();
	}

	/**
	 * Executes multiple requests concurrently and resolves when all complete.
	 * @param requests An array of promises from Transportr request methods.
	 * @returns A promise resolving to an array of all results.
	 */
	static all<T extends readonly Promise<unknown>[]>(requests: T): Promise<{ -readonly [K in keyof T]: Awaited<T[K]> }> {
		return Promise.all(requests);
	}

	/**
	 * Races multiple requests concurrently. The first to settle wins; all others are aborted.
	 * Each factory receives an AbortSignal that the caller should pass to the request options.
	 * @template T The expected result type.
	 * @param requests An array of functions that accept an AbortSignal and return a promise.
	 * @returns A promise resolving to the first settled result.
	 * @example
	 * ```typescript
	 * const result = await Transportr.race([
	 *   (signal) => api.getJson('/primary', { signal }),
	 *   (signal) => api.getJson('/fallback', { signal })
	 * ]);
	 * ```
	 */
	static async race<T>(requests: ReadonlyArray<(signal: AbortSignal) => Promise<T>>): Promise<T> {
		const controllers: AbortController[] = [];

		const promises = new Array<Promise<T>>(requests.length);
		for (let i = 0; i < requests.length; i++) {
			const controller = new AbortController();
			controllers.push(controller);
			promises[i] = requests[i]!(controller.signal);
		}

		try {
			return await Promise.race(promises);
		} finally {
			for (const controller_1 of controllers) { controller_1.abort() }
		}
	}

	/**
	 * Registers a custom content-type response handler.
	 * The handler will be matched against response content-type headers using MediaType matching.
	 * New handlers are prepended so they take priority over built-in handlers.
	 *
	 * @param contentType The content-type string to match (e.g. 'application/pdf', 'text', 'csv').
	 * @param handler The response handler function.
	 */
	static registerContentTypeHandler(contentType: string, handler: ResponseHandler): void {
		// Prepend so custom handlers take priority over built-in ones
		Transportr.#contentTypeHandlers.unshift([ contentType, handler ]);
		// Invalidate the resolution cache so previously cached lookups can pick up the new handler.
		Transportr.#handlerResolutionCache.clear();
	}

	/**
	 * Removes a previously registered content-type response handler.
	 *
	 * @param contentType The content-type string to remove.
	 * @returns True if the handler was found and removed, false otherwise.
	 */
	static unregisterContentTypeHandler(contentType: string): boolean {
		const index = Transportr.#contentTypeHandlers.findIndex(([ type ]) => type === contentType);
		if (index === -1) { return false }

		Transportr.#contentTypeHandlers.splice(index, 1);
		Transportr.#handlerResolutionCache.clear();

		return true;
	}

	/**
	 * Registers global lifecycle hooks that run on all requests from all instances.
	 * Global hooks execute before instance and per-request hooks.
	 *
	 * @param hooks The hooks to register globally.
	 */
	static addHooks(hooks: HookOptions): void {
		const { beforeRequest, afterResponse, beforeError } = hooks;
		if (beforeRequest) { Transportr.#globalHooks.beforeRequest.push(...beforeRequest); Transportr.#globalHookCount.beforeRequest += beforeRequest.length }
		if (afterResponse) { Transportr.#globalHooks.afterResponse.push(...afterResponse); Transportr.#globalHookCount.afterResponse += afterResponse.length }
		if (beforeError) { Transportr.#globalHooks.beforeError.push(...beforeError); Transportr.#globalHookCount.beforeError += beforeError.length }
	}

	/**
	 * Removes all global lifecycle hooks.
	 */
	static clearHooks(): void {
		Transportr.#globalHooks = { beforeRequest: [], afterResponse: [], beforeError: [] };
		Transportr.#globalHookCount.beforeRequest = 0;
		Transportr.#globalHookCount.afterResponse = 0;
		Transportr.#globalHookCount.beforeError = 0;
	}

	/**
	 * Tears down all global state: aborts in-flight requests, clears global event subscriptions,
	 * hooks, in-flight deduplication map, and media type cache (retaining built-in entries).
	 */
	static unregisterAll(): void {
		Transportr.abortAll();
		Transportr.#globalSubscribr = new Subscribr();
		Transportr.#globalSubCounts = Object.create(null) as Record<string, number>;
		Transportr.clearHooks();
		Transportr.#inflightRequests.clear();
	}

	/**
	 * It returns the base {@link URL} for the API.
	 *
	 * @returns The baseUrl property.
	 */
	get baseUrl(): URL {
		return this.#baseUrl;
	}

	/**
	 * Registers an event handler with a {@link Transportr} instance with typed data.
	 *
	 * @param event The name of the event to listen for.
	 * @param handler The function to call when the event is triggered.
	 * @param context The context to bind to the handler.
	 * @returns An object that can be used to remove the event handler.
	 */
	register<E extends keyof RequestEventDataMap>(event: E, handler: TypedRequestEventHandler<E>, context?: unknown): EventRegistration;

	/**
	 * @internal
	 * @param event The event to subscribe to.
	 * @param handler The event handler.
	 * @param context The context to bind the handler to.
	 * @returns An object that can be used to remove the event handler.
	 */
	register(event: RequestEvent, handler: RequestEventHandler, context?: unknown): EventRegistration {
		const registration = this.#subscribr.subscribe(event, handler, context);
		this.#subCounts[event] = (this.#subCounts[event] ?? 0) + 1;
		return registration;
	}

	/**
	 * Unregisters an event handler from a {@link Transportr} instance.
	 *
	 * @param eventRegistration The event registration to remove.
	 * @returns True if the {@link EventRegistration} was removed, false otherwise.
	 */
	unregister(eventRegistration: EventRegistration): boolean {
		const removed = this.#subscribr.unsubscribe(eventRegistration);
		if (removed) {
			const event = eventRegistration.eventName;
			const next = (this.#subCounts[event] ?? 1) - 1;
			if (next <= 0) { delete this.#subCounts[event] } else { this.#subCounts[event] = next }
		}
		return removed;
	}

	/**
	 * Registers instance-level lifecycle hooks that run on all requests from this instance.
	 * Instance hooks execute after global hooks but before per-request hooks.
	 *
	 * @param hooks The hooks to register on this instance.
	 * @returns This instance for method chaining.
	 */
	addHooks(hooks: HookOptions): this {
		const { beforeRequest, afterResponse, beforeError } = hooks;
		if (beforeRequest) { this.#hooks.beforeRequest.push(...beforeRequest); this.#hookCount.beforeRequest += beforeRequest.length }
		if (afterResponse) { this.#hooks.afterResponse.push(...afterResponse); this.#hookCount.afterResponse += afterResponse.length }
		if (beforeError) { this.#hooks.beforeError.push(...beforeError); this.#hookCount.beforeError += beforeError.length }
		return this;
	}

	/**
	 * Removes all instance-level lifecycle hooks.
	 * @returns This instance for method chaining.
	 */
	clearHooks(): this {
		this.#hooks.beforeRequest.length = 0;
		this.#hooks.afterResponse.length = 0;
		this.#hooks.beforeError.length = 0;
		this.#hookCount.beforeRequest = 0;
		this.#hookCount.afterResponse = 0;
		this.#hookCount.beforeError = 0;
		return this;
	}

	/**
	 * Updates the instance's default options after construction.
	 * Mirrors what the constructor accepts: headers and searchParams are merged onto
	 * the existing defaults; all other options overwrite the current value; hooks
	 * are appended via {@link addHooks}.
	 *
	 * @param options The options to apply. Accepts the same shape as the constructor.
	 * @returns This instance for method chaining.
	 */
	configure({ headers, searchParams, hooks, ...options }: RequestOptions): this {
		if (headers) {
			Transportr.#mergeHeaders(this.#options.headers as Headers, headers);
			// Header defaults changed — rebuild the no-body Content-Type-stripped template used by the fast path.
			this.#noBodyHeadersTemplate = new Headers(this.#options.headers);
			this.#noBodyHeadersTemplate.delete('content-type');
		}
		if (searchParams) { Transportr.#mergeSearchParams(this.#options.searchParams as URLSearchParams, searchParams) }
		// `options` is a fresh rest object; Object.assign is a no-op if it has no own keys, so skip the count check.
		Object.assign(this.#options, options);
		if (hooks) { this.addHooks(hooks) }
		return this;
	}

	/**
	 * Tears down this instance: clears all instance subscriptions and hooks.
	 * The instance should not be used after calling this method.
	 */
	destroy(): void {
		this.clearHooks();
		this.#subscribr.destroy();
		for (const k in this.#subCounts) { delete this.#subCounts[k] }
	}

	/** Returns a Result tuple instead of throwing. */
	get<T extends ResponseBody = ResponseBody>(path: string | undefined, options: RequestOptions & { unwrap: false }): Promise<Result<T | undefined>>;
	/** Returns a Result tuple instead of throwing. */
	get<T extends ResponseBody = ResponseBody>(path: RequestOptions & { unwrap: false }): Promise<Result<T | undefined>>;
	/** Throws on failure and resolves to the response body (default behavior). */
	get<T extends ResponseBody = ResponseBody>(path?: string | RequestOptions, options?: RequestOptions): Promise<T | undefined>;
	/**
	 * This function returns a promise that resolves to the result of a request to the specified path with
	 * the specified options, where the method is GET.
	 *
	 * @async
	 * @param path The path to the resource you want to get.
	 * @param options The options for the request.
	 * @returns A promise that resolves to the response of the request.
	 */
	async get<T extends ResponseBody = ResponseBody>(path?: string | RequestOptions, options?: RequestOptions): Promise<T | undefined | Result<T | undefined>> {
		return this.#get<T>(path, options);
	}

	/** Returns a Result tuple instead of throwing. */
	post<T extends ResponseBody = ResponseBody>(path: string | undefined, body: RequestBody, options: RequestOptions & { unwrap: false }): Promise<Result<T | undefined>>;
	/** Returns a Result tuple instead of throwing. */
	post<T extends ResponseBody = ResponseBody>(body: RequestBody, options: RequestOptions & { unwrap: false }): Promise<Result<T | undefined>>;
	/** Throws on failure and resolves to the response body (default behavior). */
	post<T extends ResponseBody = ResponseBody>(path: string | undefined, body?: RequestBody, options?: RequestOptions): Promise<T | undefined>;
	/** Throws on failure and resolves to the response body (default behavior). */
	post<T extends ResponseBody = ResponseBody>(body: RequestBody, options?: RequestOptions): Promise<T | undefined>;
	/**
	 * This function makes a POST request to the given path with the given body and options.
	 *
	 * @async
	 * @template T The expected response type (defaults to ResponseBody)
	 * @param path The path to the endpoint you want to call.
	 * @param body The body of the request.
	 * @param options The options for the request.
	 * @returns A promise that resolves to the response body.
	 */
	async post<T extends ResponseBody = ResponseBody>(path?: string | RequestBody, body?: RequestBody | RequestOptions, options?: RequestOptions): Promise<T | undefined | Result<T | undefined>> {
		return this.#executeBodyMethod<T>('POST', path, body, options);
	}

	/** Returns a Result tuple instead of throwing. */
	put<T extends ResponseBody = ResponseBody>(path: string | undefined, body: RequestBody, options: RequestOptions & { unwrap: false }): Promise<Result<T | undefined>>;
	/** Returns a Result tuple instead of throwing. */
	put<T extends ResponseBody = ResponseBody>(body: RequestBody, options: RequestOptions & { unwrap: false }): Promise<Result<T | undefined>>;
	/** Throws on failure and resolves to the response body (default behavior). */
	put<T extends ResponseBody = ResponseBody>(path: string | undefined, body?: RequestBody, options?: RequestOptions): Promise<T | undefined>;
	/** Throws on failure and resolves to the response body (default behavior). */
	put<T extends ResponseBody = ResponseBody>(body: RequestBody, options?: RequestOptions): Promise<T | undefined>;
	/**
	 * This function returns a promise that resolves to the result of a request to the specified path with
	 * the specified options, where the method is PUT.
	 *
	 * @async
	 * @template T The expected response type (defaults to ResponseBody)
	 * @param path The path to the endpoint you want to call.
	 * @param body The body of the request.
	 * @param options The options for the request.
	 * @returns The return value of the #request method.
	 */
	async put<T extends ResponseBody = ResponseBody>(path?: string | RequestBody, body?: RequestBody | RequestOptions, options?: RequestOptions): Promise<T | undefined | Result<T | undefined>> {
		return this.#executeBodyMethod<T>('PUT', path, body, options);
	}

	/** Returns a Result tuple instead of throwing. */
	patch<T extends ResponseBody = ResponseBody>(path: string | undefined, body: RequestBody, options: RequestOptions & { unwrap: false }): Promise<Result<T | undefined>>;
	/** Returns a Result tuple instead of throwing. */
	patch<T extends ResponseBody = ResponseBody>(body: RequestBody, options: RequestOptions & { unwrap: false }): Promise<Result<T | undefined>>;
	/** Throws on failure and resolves to the response body (default behavior). */
	patch<T extends ResponseBody = ResponseBody>(path: string | undefined, body?: RequestBody, options?: RequestOptions): Promise<T | undefined>;
	/** Throws on failure and resolves to the response body (default behavior). */
	patch<T extends ResponseBody = ResponseBody>(body: RequestBody, options?: RequestOptions): Promise<T | undefined>;
	/**
	 * It takes a path and options, and returns a request with the method set to PATCH.
	 *
	 * @async
	 * @template T The expected response type (defaults to ResponseBody)
	 * @param path The path to the endpoint you want to hit.
	 * @param body The body of the request.
	 * @param options The options for the request.
	 * @returns A promise that resolves to the response of the request.
	 */
	async patch<T extends ResponseBody = ResponseBody>(path?: string | RequestBody, body?: RequestBody | RequestOptions, options?: RequestOptions): Promise<T | undefined | Result<T | undefined>> {
		return this.#executeBodyMethod<T>('PATCH', path, body, options);
	}

	/** Returns a Result tuple instead of throwing. */
	delete<T extends ResponseBody = ResponseBody>(path: string | undefined, body: RequestBody, options: RequestOptions & { unwrap: false }): Promise<Result<T | undefined>>;
	/** Returns a Result tuple instead of throwing. */
	delete<T extends ResponseBody = ResponseBody>(body: RequestBody, options: RequestOptions & { unwrap: false }): Promise<Result<T | undefined>>;
	/** Throws on failure and resolves to the response body (default behavior). */
	delete<T extends ResponseBody = ResponseBody>(path?: string | RequestBody, body?: RequestBody | RequestOptions, options?: RequestOptions): Promise<T | undefined>;
	/**
	 * It takes a path and options, and returns a request with the method set to DELETE.
	 *
	 * @async
	 * @param path The path to the resource you want to access.
	 * @param body The body of the request.
	 * @param options The options for the request.
	 * @returns The result of the request.
	 */
	async delete<T extends ResponseBody = ResponseBody>(path?: string | RequestBody, body?: RequestBody | RequestOptions, options?: RequestOptions): Promise<T | undefined | Result<T | undefined>> {
		return this.#executeBodyMethod<T>('DELETE', path, body, options);
	}

	/** Returns a Result tuple instead of throwing. */
	head<T extends ResponseBody = ResponseBody>(path: string | undefined, options: RequestOptions & { unwrap: false }): Promise<Result<T | undefined>>;
	/** Returns a Result tuple instead of throwing. */
	head<T extends ResponseBody = ResponseBody>(path: RequestOptions & { unwrap: false }): Promise<Result<T | undefined>>;
	/** Throws on failure and resolves to the response body (default behavior). */
	head<T extends ResponseBody = ResponseBody>(path?: string | RequestOptions, options?: RequestOptions): Promise<T | undefined>;
	/**
	 * Returns the response headers of a request to the given path.
	 *
	 * @async
	 * @param path The path to the resource you want to access.
	 * @param options The options for the request.
	 * @returns A promise that resolves to the response object.
	 */
	async head<T extends ResponseBody = ResponseBody>(path?: string | RequestOptions, options?: RequestOptions): Promise<T | undefined | Result<T | undefined>> {
		return this.#execute<T>(path, options, { method: 'HEAD' });
	}

	/** Returns a Result tuple instead of throwing. */
	options(path: string | undefined, options: RequestOptions & { unwrap: false }): Promise<Result<string[] | undefined>>;
	/** Returns a Result tuple instead of throwing. */
	options(path: RequestOptions & { unwrap: false }): Promise<Result<string[] | undefined>>;
	/** Throws on failure and resolves to allowed methods (default behavior). */
	options(path?: string | RequestOptions, options?: RequestOptions): Promise<string[] | undefined>;
	/**
	 * It returns a promise that resolves to the allowed request methods for the given resource path.
	 *
	 * @async
	 * @param path The path to the resource.
	 * @param options The options for the request.
	 * @returns A promise that resolves to an array of allowed request methods for this resource.
	 */
	async options(path?: string | RequestOptions, options: RequestOptions = {}): Promise<string[] | undefined | Result<string[] | undefined>> {
		if (isObject(path)) { [ path, options ] = [ undefined, path ] }

		const requestConfig = this.#processRequestOptions(options, { method: 'OPTIONS' });
		const { requestOptions } = requestConfig;
		const unwrap = requestOptions.unwrap !== false;
		const requestHooks = requestOptions.hooks;

		try {
			// Run beforeRequest hooks: global → instance → per-request
			const url = Transportr.#createUrl(this, path, requestOptions.searchParams);
			await this.#runBeforeRequestHooks(requestOptions, url, path, requestHooks?.beforeRequest);

			let response: Response = await this.#request(path, requestConfig);

			// Run afterResponse hooks: global → instance → per-request
			response = await this.#runAfterResponseHooks(response, requestOptions, requestHooks?.afterResponse);

			const allowHeader = response.headers.get('allow');
			let allowedMethods: string[] | undefined;
			if (allowHeader) {
				const parts = allowHeader.split(',');
				allowedMethods = new Array(parts.length);
				for (let i = 0, length = parts.length; i < length; i++) {
					allowedMethods[i] = parts[i]!.trim();
				}
			}

			this.#publish({ name: RequestEvent.SUCCESS, data: allowedMethods, global: options.global });

			return unwrap ? allowedMethods : [ true, allowedMethods ];
		} catch (error) {
			if (!unwrap) { return [ false, error as HttpError ] }
			throw error;
		}
	}

	/** Returns a Result tuple instead of throwing. */
	request<T = unknown>(path: string | undefined, options: RequestOptions & { unwrap: false }): Promise<Result<TypedResponse<T>>>;
	/** Returns a Result tuple instead of throwing. */
	request<T = unknown>(path: RequestOptions & { unwrap: false }): Promise<Result<TypedResponse<T>>>;
	/** Throws on failure and resolves to the typed response (default behavior). */
	request<T = unknown>(path?: string | RequestOptions, options?: RequestOptions): Promise<TypedResponse<T>>;
	/**
	 * It takes a path and options, and makes a request to the server
	 * @async
	 * @param path The path to the endpoint you want to hit.
	 * @param options The options for the request.
	 * @returns The return value of the function is the return value of the function that is passed to the `then` method of the promise returned by the `fetch` method.
	 * @throws {HttpError} If an error occurs during the request.
	 */
	async request<T = unknown>(path?: string | RequestOptions, options: RequestOptions = {}): Promise<TypedResponse<T> | Result<TypedResponse<T>>> {
		if (isObject(path)) { [ path, options ] = [ undefined, path ] }

		const requestConfig = this.#processRequestOptions(options, {});
		const unwrap = requestConfig.requestOptions.unwrap !== false;

		try {
			const response = await this.#request<T>(path, requestConfig);

			this.#publish({ name: RequestEvent.SUCCESS, data: response, global: options.global });

			return unwrap ? response : [true, response] as Result<TypedResponse<T>>;
		} catch (error) {
			if (!unwrap) return [false, error as HttpError] as Result<TypedResponse<T>>;
			throw error;
		}
	}

	/** Returns a Result tuple instead of throwing. */
	getJson(path: string | undefined, options: RequestOptions & { unwrap: false }): Promise<Result<Json | undefined>>;
	/** Returns a Result tuple instead of throwing. */
	getJson(path: RequestOptions & { unwrap: false }): Promise<Result<Json | undefined>>;
	/** Throws on failure and resolves to JSON content (default behavior). */
	getJson(path?: string | RequestOptions, options?: RequestOptions): Promise<Json | undefined>;
	/**
	 * It gets the JSON representation of the resource at the given path.
	 *
	 * @async
	 * @template T The expected JSON response type (defaults to JsonObject)
	 * @param path The path to the resource.
	 * @param options The options object to pass to the request.
	 * @returns A promise that resolves to the response body as a typed JSON value.
	 */
	async getJson(path?: string | RequestOptions, options?: RequestOptions): Promise<Json | undefined | Result<Json | undefined>> {
		return this.#get(path, options, { headers: { accept: `${mediaTypes.JSON}` } }, handleJson);
	}

	/** Returns a Result tuple instead of throwing. */
	getXml(path: string | undefined, options: RequestOptions & { unwrap: false }): Promise<Result<Document | undefined>>;
	/** Returns a Result tuple instead of throwing. */
	getXml(path: RequestOptions & { unwrap: false }): Promise<Result<Document | undefined>>;
	/** Throws on failure and resolves to XML content (default behavior). */
	getXml(path?: string | RequestOptions, options?: RequestOptions): Promise<Document | undefined>;
	/**
	 * It gets the XML representation of the resource at the given path.
	 *
	 * @async
	 * @param path The path to the resource you want to get.
	 * @param options The options for the request.
	 * @returns The result of the function call to #get.
	 */
	async getXml(path?: string | RequestOptions, options?: RequestOptions): Promise<Document | undefined | Result<Document | undefined>> {
		return this.#get(path, options, { headers: { accept: `${mediaTypes.XML}` } }, handleXml);
	}

	/** Returns a Result tuple instead of throwing. */
	getHtml(path: string | undefined, options: RequestOptions & { unwrap: false }, selector?: string): Promise<Result<Document | Element | null | undefined>>;
	/** Returns a Result tuple instead of throwing. */
	getHtml(path: RequestOptions & { unwrap: false }): Promise<Result<Document | Element | null | undefined>>;
	/** Throws on failure and resolves to parsed HTML (default behavior). */
	getHtml(path?: string | RequestOptions, options?: RequestOptions, selector?: string): Promise<Document | Element | null | undefined>;
	/**
	 * Get the HTML content of the specified path.
	 * When a selector is provided, returns only the first matching element from the parsed document.
	 *
	 * @async
	 * @param path The path to the resource.
	 * @param options The options for the request.
	 * @param selector An optional CSS selector to extract a specific element from the parsed HTML.
	 * @returns A promise that resolves to a Document, an Element (if selector matched), or void.
	 */
	async getHtml(path?: string | RequestOptions, options?: RequestOptions, selector?: string): Promise<Document | Element | null | undefined | Result<Document | Element | null | undefined>> {
		const doc = await this.#get(path, options, { headers: { accept: `${mediaTypes.HTML}` } }, handleHtml);
		if (Array.isArray(doc)) return doc;
		return selector && doc ? doc.querySelector(selector) : doc;
	}

	/** Returns a Result tuple instead of throwing. */
	getHtmlFragment(path: string | undefined, options: RequestOptions & { unwrap: false }, selector?: string): Promise<Result<DocumentFragment | Element | null | undefined>>;
	/** Returns a Result tuple instead of throwing. */
	getHtmlFragment(path: RequestOptions & { unwrap: false }): Promise<Result<DocumentFragment | Element | null | undefined>>;
	/** Throws on failure and resolves to parsed HTML fragment (default behavior). */
	getHtmlFragment(path?: string | RequestOptions, options?: RequestOptions, selector?: string): Promise<DocumentFragment | Element | null | undefined>;
	/**
	 * It returns a promise that resolves to the HTML fragment at the given path.
	 * When a selector is provided, returns only the first matching element from the parsed fragment.
	 *
	 * @async
	 * @param path The path to the resource.
	 * @param options The options for the request.
	 * @param selector An optional CSS selector to extract a specific element from the parsed fragment.
	 * @returns A promise that resolves to a DocumentFragment, an Element (if selector matched), or void.
	 */
	async getHtmlFragment(path?: string | RequestOptions, options?: RequestOptions, selector?: string): Promise<DocumentFragment | Element | null | undefined | Result<DocumentFragment | Element | null | undefined>> {
		const allowScripts = (isObject(path) ? path : options)?.allowScripts === true;
		const fragment = await this.#get(path, options, { headers: { accept: `${mediaTypes.HTML}` } }, allowScripts ? handleHtmlFragmentWithScripts : handleHtmlFragment);
		if (Array.isArray(fragment)) return fragment;
		return selector && fragment ? fragment.querySelector(selector) : fragment;
	}
	/** Returns a Result tuple instead of throwing. */
	getScript(path: string | undefined, options: RequestOptions & { unwrap: false }): Promise<Result<void>>;
	/** Returns a Result tuple instead of throwing. */
	getScript(path: RequestOptions & { unwrap: false }): Promise<Result<void>>;
	/** Throws on failure and resolves when the script is loaded (default behavior). */
	getScript(path?: string | RequestOptions, options?: RequestOptions): Promise<void>;
	/**
	 * It gets a script from the server, and appends the script to the Document HTMLHeadElement
	 * @param path The path to the script.
	 * @param options The options for the request.
	 * @returns A promise that resolves to void.
	 */
	async getScript(path?: string | RequestOptions, options?: RequestOptions): Promise<void | Result<void>> {
		return this.#get(path, options, { headers: { accept: `${mediaTypes.JAVA_SCRIPT}` } }, handleScript);
	}

	/** Returns a Result tuple instead of throwing. */
	getStylesheet(path: string | undefined, options: RequestOptions & { unwrap: false }): Promise<Result<void>>;
	/** Returns a Result tuple instead of throwing. */
	getStylesheet(path: RequestOptions & { unwrap: false }): Promise<Result<void>>;
	/** Throws on failure and resolves when the stylesheet is loaded (default behavior). */
	getStylesheet(path?: string | RequestOptions, options?: RequestOptions): Promise<void>;
	/**
	 * Gets a stylesheet from the server, and adds it as a Blob URL.
	 * @param path The path to the stylesheet.
	 * @param options The options for the request.
	 * @returns A promise that resolves to void.
	 */
	async getStylesheet(path?: string | RequestOptions, options?: RequestOptions): Promise<void | Result<void>> {
		return this.#get(path, options, { headers: { accept: `${mediaTypes.CSS}` } }, handleCss);
	}

	/** Returns a Result tuple instead of throwing. */
	getBlob(path: string | undefined, options: RequestOptions & { unwrap: false }): Promise<Result<Blob | undefined>>;
	/** Returns a Result tuple instead of throwing. */
	getBlob(path: RequestOptions & { unwrap: false }): Promise<Result<Blob | undefined>>;
	/** Throws on failure and resolves to Blob data (default behavior). */
	getBlob(path?: string | RequestOptions, options?: RequestOptions): Promise<Blob | undefined>;
	/**
	 * It returns a blob from the specified path.
	 * @param path The path to the resource.
	 * @param options The options for the request.
	 * @returns A promise that resolves to a Blob or void.
	 */
	async getBlob(path?: string | RequestOptions, options?: RequestOptions): Promise<Blob | undefined | Result<Blob | undefined>> {
		return this.#get(path, options, { headers: { accept: 'application/octet-stream' } }, handleBlob);
	}

	/** Returns a Result tuple instead of throwing. */
	getImage(path: string | undefined, options: RequestOptions & { unwrap: false }): Promise<Result<HTMLImageElement | undefined>>;
	/** Throws on failure and resolves to an image element (default behavior). */
	getImage(path?: string | RequestOptions, options?: RequestOptions): Promise<HTMLImageElement | undefined>;
	/**
	 * It returns a promise that resolves to an `HTMLImageElement`.
	 * The object URL created to load the image is automatically revoked to prevent memory leaks.
	 * Works in both browser and Node.js (via JSDOM) environments.
	 * @param path The path to the image.
	 * @param options The options for the request.
	 * @returns A promise that resolves to an `HTMLImageElement` or `void`.
	 */
	async getImage(path?: string | RequestOptions, options?: RequestOptions): Promise<HTMLImageElement | undefined | Result<HTMLImageElement | undefined>> {
		return this.#get(path, options, { headers: { accept: 'image/*' } }, handleImage);
	}

	/** Returns a Result tuple instead of throwing. */
	getBuffer(path: string | undefined, options: RequestOptions & { unwrap: false }): Promise<Result<ArrayBuffer | undefined>>;
	/** Returns a Result tuple instead of throwing. */
	getBuffer(path: RequestOptions & { unwrap: false }): Promise<Result<ArrayBuffer | undefined>>;
	/** Throws on failure and resolves to ArrayBuffer data (default behavior). */
	getBuffer(path?: string | RequestOptions, options?: RequestOptions): Promise<ArrayBuffer | undefined>;
	/**
	 * It gets a buffer from the specified path
	 * @param path The path to the resource.
	 * @param options The options for the request.
	 * @returns A promise that resolves to an ArrayBuffer or void.
	 */
	async getBuffer(path?: string | RequestOptions, options?: RequestOptions): Promise<ArrayBuffer | undefined | Result<ArrayBuffer | undefined>> {
		return this.#get(path, options, { headers: { accept: 'application/octet-stream' } }, handleBuffer);
	}

	/** Returns a Result tuple instead of throwing. */
	getStream(path: string | undefined, options: RequestOptions & { unwrap: false }): Promise<Result<ReadableStream<Uint8Array> | null | undefined>>;
	/** Returns a Result tuple instead of throwing. */
	getStream(path: RequestOptions & { unwrap: false }): Promise<Result<ReadableStream<Uint8Array> | null | undefined>>;
	/** Throws on failure and resolves to a readable stream (default behavior). */
	getStream(path?: string | RequestOptions, options?: RequestOptions): Promise<ReadableStream<Uint8Array> | null | undefined>;
	/**
	 * It returns a readable stream of the response body from the specified path.
	 * @param path The path to the resource.
	 * @param options The options for the request.
	 * @returns A promise that resolves to a ReadableStream, null, or void.
	 */
	async getStream(path?: string | RequestOptions, options?: RequestOptions): Promise<ReadableStream<Uint8Array> | null | undefined | Result<ReadableStream<Uint8Array> | null | undefined>> {
		return this.#get(path, options, { headers: { accept: 'application/octet-stream' } }, handleReadableStream);
	}

	/** Returns a Result tuple instead of throwing. */
	getEventStream(path: string | undefined, options: RequestOptions & { unwrap: false }): Promise<Result<AsyncIterable<ServerSentEvent>>>;
	/** Returns a Result tuple instead of throwing. */
	getEventStream(path: RequestOptions & { unwrap: false }): Promise<Result<AsyncIterable<ServerSentEvent>>>;
	/** Throws on failure and resolves to an SSE async iterable (default behavior). */
	getEventStream(path?: string | RequestOptions, options?: RequestOptions): Promise<AsyncIterable<ServerSentEvent>>;
	/**
	 * Opens a Server-Sent Events stream and returns an AsyncIterable of typed events.
	 * Follows the EventStream specification for parsing event, data, id, and retry fields.
	 * Iteration ends when the server closes the stream or the request is aborted.
	 *
	 * @async
	 * @param path The path to the SSE endpoint.
	 * @param options The options for the request.
	 * @returns An AsyncIterable of parsed ServerSentEvent objects.
	 * @example
	 * ```typescript
	 * for await (const event of api.getEventStream('/chat/completions', { body: { prompt } })) {
	 *   console.log(event.event, event.data);
	 * }
	 * ```
	 */
	async getEventStream(path?: string | RequestOptions, options?: RequestOptions): Promise<AsyncIterable<ServerSentEvent> | Result<AsyncIterable<ServerSentEvent>>> {
		if (isObject(path)) { [ path, options ] = [ undefined, path ] }

		const requestConfig = this.#processRequestOptions(options ?? {}, { method: options?.body ? 'POST' : 'GET', headers: { accept: `${mediaTypes.EVENT_STREAM}` } });
		const { requestOptions } = requestConfig;
		const unwrap = requestOptions.unwrap !== false;
		const requestHooks = requestOptions.hooks;

		try {
			const url = Transportr.#createUrl(this, path, requestOptions.searchParams);
			await this.#runBeforeRequestHooks(requestOptions, url, path, requestHooks?.beforeRequest);

			const response = await this.#request(path, requestConfig);

			const afterResponse: Response = await this.#runAfterResponseHooks(response, requestOptions, requestHooks?.afterResponse);

			this.#publish({ name: RequestEvent.SUCCESS, data: afterResponse, global: requestConfig.global });

			const stream = handleEventStream(afterResponse);
			return unwrap ? stream : [true, stream] as Result<AsyncIterable<ServerSentEvent>>;
		} catch (error) {
			if (!unwrap) return [false, error as HttpError] as Result<AsyncIterable<ServerSentEvent>>;
			throw error;
		}
	}

	/** Returns a Result tuple instead of throwing. */
	getJsonStream<T = Json>(path: string | undefined, options: RequestOptions & { unwrap: false }): Promise<Result<AsyncIterable<T>>>;
	/** Returns a Result tuple instead of throwing. */
	getJsonStream<T = Json>(path: RequestOptions & { unwrap: false }): Promise<Result<AsyncIterable<T>>>;
	/** Throws on failure and resolves to an NDJSON async iterable (default behavior). */
	getJsonStream<T = Json>(path?: string | RequestOptions, options?: RequestOptions): Promise<AsyncIterable<T>>;
	/**
	 * Opens an NDJSON (Newline Delimited JSON) stream and returns an AsyncIterable of typed JSON values.
	 * Each line is independently parsed as JSON, making it suitable for streaming large datasets
	 * or real-time JSON feeds.
	 *
	 * @async
	 * @template T The expected type of each JSON line (defaults to Json).
	 * @param path The path to the NDJSON endpoint.
	 * @param options The options for the request.
	 * @returns An AsyncIterable of parsed JSON values.
	 * @example
	 * ```typescript
	 * for await (const user of api.getJsonStream<User>('/users/export')) {
	 *   processUser(user);
	 * }
	 * ```
	 */
	async getJsonStream<T = Json>(path?: string | RequestOptions, options?: RequestOptions): Promise<AsyncIterable<T> | Result<AsyncIterable<T>>> {
		if (isObject(path)) { [ path, options ] = [ undefined, path ] }

		const requestConfig = this.#processRequestOptions(options ?? {}, { method: 'GET', headers: { accept: `${mediaTypes.NDJSON}` } });
		const { requestOptions } = requestConfig;
		const unwrap = requestOptions.unwrap !== false;
		const requestHooks = requestOptions.hooks;

		try {
			const url = Transportr.#createUrl(this, path, requestOptions.searchParams);
			await this.#runBeforeRequestHooks(requestOptions, url, path, requestHooks?.beforeRequest);

			const response = await this.#request(path, requestConfig);

			const afterResponse: Response = await this.#runAfterResponseHooks(response, requestOptions, requestHooks?.afterResponse);

			this.#publish({ name: RequestEvent.SUCCESS, data: afterResponse, global: requestConfig.global });

			const stream = handleNdjsonStream<T>(afterResponse);
			return unwrap ? stream : [ true, stream ] as Result<AsyncIterable<T>>;
		} catch (error) {
			if (!unwrap) return [ false, error as HttpError ] as Result<AsyncIterable<T>>;
			throw error;
		}
	}

	/**
	 * Handles a GET request.
	 * @async
	 * @param path The path to the resource.
	 * @param userOptions The user options for the request.
	 * @param options The options for the request.
	 * @param responseHandler The response handler for the request.
	 * @returns A promise that resolves to the response body or void.
	 */
	async #get<T extends ResponseBody>(path?: string | RequestOptions, userOptions?: RequestOptions, options: RequestOptions = {}, responseHandler?: ResponseHandler<T>): Promise<T | undefined | Result<T | undefined>> {
		options.method = 'GET';
		options.body = undefined;
		return this.#execute<T>(path, userOptions, options, responseHandler);
	}

	/**
	 * It processes the request options and returns a new object with the processed options.
	 * Hot path: when no retry, no dedupe, and no upload/download progress tracking, this is essentially
	 * `fetch(url, options)` with two `Set` operations and one event publish bracket — all inner closures have been hoisted
	 * to private static helpers to avoid per-request allocations.
	 * @param path The path to the resource.
	 * @param config The processed request configuration produced by `processRequestOptions`.
	 * @returns A promise resolving to the typed response.
	 */
	async #request<T = unknown>(path: string | undefined, config: RequestConfiguration): Promise<TypedResponse<T>> {
		const { signalController, requestOptions, global } = config;
		Transportr.#signalControllers.add(signalController);

		const retryConfig = Transportr.#normalizeRetryOptions(requestOptions.retry);
		const method = requestOptions.method ?? 'GET';
		const canRetry = retryConfig.limit > 0 && retryConfig.methods.includes(method);
		const canDedupe = requestOptions.dedupe === true && (method === 'GET' || method === 'HEAD');
		const startTime = performance.now();

		try {
			const url = Transportr.#createUrl(this, path, requestOptions.searchParams);
			let dedupeKey: string | undefined;

			// If deduplication is enabled and an in-flight request exists, clone its response.
			if (canDedupe) {
				dedupeKey = `${method}:${url.href}`;
				const inflight = Transportr.#inflightRequests.get(dedupeKey);
				if (inflight) { return (await inflight).clone() }
			}

			const onUploadProgress = requestOptions.onUploadProgress;
			const originalBody = requestOptions.body;
			// Set duplex once (it's static for this request) — avoids redundant Object.assign in retry loop.
			if (onUploadProgress && originalBody != null) {
				(requestOptions as RequestOptions & { duplex?: string }).duplex = 'half';
			}

			const responsePromise = this.#doFetch<T>(url, requestOptions, path, method, canRetry, retryConfig, originalBody, onUploadProgress, startTime, global);

			if (canDedupe) {
				Transportr.#inflightRequests.set(dedupeKey!, responsePromise);
				try {
					return Transportr.#wrapDownloadProgress(await responsePromise, requestOptions);
				} finally {
					Transportr.#inflightRequests.delete(dedupeKey!);
				}
			}

			return Transportr.#wrapDownloadProgress(await responsePromise, requestOptions);
		} finally {
			Transportr.#signalControllers.delete(signalController.destroy());
			if (!requestOptions.signal?.aborted) {
				const end = performance.now();
				this.#publish({ name: RequestEvent.COMPLETE, data: { timing: { start: startTime, end, duration: end - startTime } }, global });
				if (Transportr.#signalControllers.size === 0) {
					this.#publish({ name: RequestEvent.ALL_COMPLETE, global });
				}
			}
		}
	}

	/**
	 * Performs the underlying fetch with retry logic. Hoisted out of `_request` so the function body
	 * does not allocate a closure per request.
	 * @param url The fully-resolved request URL.
	 * @param requestOptions The processed request options.
	 * @param path The original request path (used in error/retry events).
	 * @param method The HTTP method.
	 * @param canRetry Whether the request is eligible for retry.
	 * @param retryConfig Normalized retry configuration.
	 * @param originalBody The original (pre-upload-wrap) body, needed to rebuild the upload stream on retry.
	 * @param onUploadProgress Optional upload progress callback.
	 * @param startTime The performance.now() timestamp captured at request start (for timing reporting).
	 * @param global Whether this request publishes to global event subscribers.
	 * @returns The typed response.
	 */
	async #doFetch<T>(url: URL, requestOptions: RequestOptions, path: string | undefined, method: string, canRetry: boolean, retryConfig: NormalizedRetryOptions, originalBody: RequestBody | undefined, onUploadProgress: RequestOptions['onUploadProgress'], startTime: number, global: boolean): Promise<TypedResponse<T>> {
		let attempt = 0;
		while (true) {
			try {
				if (onUploadProgress) { await Transportr.#wrapUploadBody(requestOptions, originalBody, onUploadProgress) }
				const response = await fetch<T>(url, requestOptions);
				if (!response.ok) {
					if (canRetry && attempt < retryConfig.limit && retryConfig.statusCodes.includes(response.status)) {
						attempt++;
						this.#publish({ name: RequestEvent.RETRY, data: { attempt, status: response.status, method, path, timing: Transportr.#snapshotTiming(startTime) }, global });
						await Transportr.#retryDelay(retryConfig, attempt);
						continue;
					}
					// Capture response body for error diagnostics (subject to consumer opt-out via captureErrorBody=false).
					let entity: ResponseBody | undefined;
					if ((requestOptions as RequestOptions & { captureErrorBody?: boolean }).captureErrorBody !== false) {
						try { entity = await response.text() } catch { /* body may be unavailable */ }
					}
					throw await this.#handleError(path, response, { entity, url, method, timing: Transportr.#snapshotTiming(startTime) }, requestOptions);
				}

				return response;
			} catch (cause) {
				if (cause instanceof HttpError) { throw cause }

				// Network error — retry if allowed.
				if (canRetry && attempt < retryConfig.limit) {
					attempt++;
					this.#publish({ name: RequestEvent.RETRY, data: { attempt, error: (cause as Error).message, method, path, timing: Transportr.#snapshotTiming(startTime) }, global });
					await Transportr.#retryDelay(retryConfig, attempt);
					continue;
				}

				throw await this.#handleError(path, undefined, { cause: cause as Error, url, method, timing: Transportr.#snapshotTiming(startTime) }, requestOptions);
			}
		}
	}

	/**
	 * Wraps the request body with a progress-tracking TransformStream.
	 * Re-creates the stream from the original body on each call so retries get a fresh stream.
	 * @param requestOptions Mutable request options whose `body` will be replaced with the wrapped stream.
	 * @param originalBody The original body before any wrapping.
	 * @param onUploadProgress The progress callback (already validated as defined by the caller).
	 */
	static async #wrapUploadBody(requestOptions: RequestOptions, originalBody: RequestBody | undefined, onUploadProgress: NonNullable<RequestOptions['onUploadProgress']>): Promise<void> {
		if (originalBody == null) { return }

		let bytes: Uint8Array | null = null;
		if (typeof originalBody === 'string') {
			bytes = new TextEncoder().encode(originalBody);
		} else if (originalBody instanceof Blob) {
			bytes = new Uint8Array(await originalBody.arrayBuffer());
		} else if (isArrayBuffer(originalBody)) {
			bytes = new Uint8Array(originalBody);
		} else if (ArrayBuffer.isView(originalBody)) {
			bytes = new Uint8Array(originalBody.buffer, originalBody.byteOffset, originalBody.byteLength);
		} else if (!(originalBody instanceof ReadableStream)) {
			return;
		}

		const total = bytes ? bytes.byteLength : null;
		const readable: ReadableStream<Uint8Array> = bytes
			? new ReadableStream<Uint8Array>({
				/** @param controller The stream controller. */
				start(controller) { controller.enqueue(bytes); controller.close() }
			})
			: originalBody as ReadableStream<Uint8Array>;

		let loaded = 0;
		const transform = new TransformStream<Uint8Array, Uint8Array>({
			/**
			 * Tracks bytes and invokes upload progress callback.
			 * @param chunk The data chunk.
			 * @param controller The transform controller.
			 */
			transform(chunk, controller) {
				loaded += chunk.byteLength;
				onUploadProgress({
					loaded,
					total,
					percentage: total !== null && total > 0 ? Math.round((loaded / total) * 100) : null
				});
				controller.enqueue(chunk);
			}
		});

		requestOptions.body = readable.pipeThrough(transform);
	}

	/**
	 * Wraps the response body with a progress-tracking TransformStream when onDownloadProgress is set.
	 * @param response The response to potentially wrap.
	 * @param requestOptions The request options carrying the optional onDownloadProgress callback.
	 * @returns The original response or a new response with progress tracking.
	 */
	static #wrapDownloadProgress<T>(response: TypedResponse<T>, requestOptions: RequestOptions): TypedResponse<T> {
		const onDownloadProgress = requestOptions.onDownloadProgress;
		if (!onDownloadProgress || !response.body) return response;

		const contentLength = response.headers.get('content-length');
		const total = contentLength ? parseInt(contentLength, 10) : null;
		let loaded = 0;

		const transform = new TransformStream<Uint8Array, Uint8Array>({
			/**
			 * Tracks bytes and invokes progress callback.
			 * @param chunk The data chunk.
			 * @param controller The transform controller.
			 */
			transform(chunk, controller) {
				loaded += chunk.byteLength;
				onDownloadProgress({ loaded, total, percentage: total !== null && total > 0 ? Math.round((loaded / total) * 100) : null });
				controller.enqueue(chunk);
			}
		});

		return new Response(response.body.pipeThrough(transform), { status: response.status, statusText: response.statusText, headers: response.headers });
	}

	/**
	 * Captures a RequestTiming snapshot from a start timestamp to now.
	 * @param startTime The start timestamp from `performance.now()`.
	 * @returns Timing information for the request.
	 */
	static #snapshotTiming(startTime: number): RequestTiming {
		const end = performance.now();
		return { start: startTime, end, duration: end - startTime };
	}

	/**
	 * Normalizes a retry option into a full RetryOptions object.
	 * @param retry The retry option from request options.
	 * @returns Normalized retry configuration.
	 */
	static #normalizeRetryOptions(retry?: number | RetryOptions): NormalizedRetryOptions {
		if (retry === undefined) { return Transportr.#noRetryConfig }
		if (typeof retry === 'number') { return { limit: retry, statusCodes: retryStatusCodes, methods: retryMethods, delay: retryDelay, backoffFactor: retryBackoffFactor } }

		// Object identity cache: most consumers reuse the same options object across requests.
		const cached = Transportr.#retryConfigCache.get(retry);
		if (cached !== undefined) { return cached }

		const normalized: NormalizedRetryOptions = {
			limit: retry.limit ?? 0,
			statusCodes: retry.statusCodes ?? retryStatusCodes,
			methods: retry.methods ?? retryMethods,
			delay: retry.delay ?? retryDelay,
			backoffFactor: retry.backoffFactor ?? retryBackoffFactor
		};
		Transportr.#retryConfigCache.set(retry, normalized);
		return normalized;
	}

	/**
	 * Waits for the appropriate delay before a retry attempt.
	 * @param config The retry configuration.
	 * @param attempt The current attempt number (1-based).
	 * @returns A promise that resolves after the delay.
	 */
	static #retryDelay(config: NormalizedRetryOptions, attempt: number): Promise<void> {
		const ms = typeof config.delay === 'function' ? config.delay(attempt) : config.delay * (config.backoffFactor ** (attempt - 1));

		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * Shared implementation for body-accepting HTTP methods (POST, PUT, PATCH, DELETE).
	 * @param method The HTTP method to use.
	 * @param path The request path, or the request body when called without a path.
	 * @param body The request body, or options when called without a path.
	 * @param options Additional request options.
	 * @param responseHandler Optional response handler override.
	 * @returns A promise that resolves to the response body.
	 */
	#executeBodyMethod<T extends ResponseBody>(method: RequestBodyMethod, path: string | RequestBody | undefined, body?: RequestBody | RequestOptions, options?: RequestOptions, responseHandler?: ResponseHandler<NoInfer<T>>): Promise<T | undefined | Result<T | undefined>> {
		const [ resolvedPath, resolvedBody, resolvedOptions ] = isString(path) ? [ path, body as RequestBody, options ] : [ undefined, path, body as RequestOptions ];

		// Important: do NOT mutate `resolvedOptions` here — callers may reuse the same options reference across requests.
		// Build a fresh options object that overlays method/body via Object.assign on a new target (one allocation).
		const merged = resolvedOptions !== undefined
			? Object.assign({} as RequestOptions, resolvedOptions, { body: resolvedBody, method })
			: { body: resolvedBody, method } as RequestOptions;
		return this.#execute<T>(resolvedPath, merged, {}, responseHandler);
	}

	/**
	 * Runs the beforeRequest hook chain (global → instance → per-request).
	 * Returns immediately if no hooks of any kind are registered, allocating nothing.
	 * @param requestOptions Mutable request options (hooks may patch via Object.assign).
	 * @param url The current request URL.
	 * @param path The original path argument (used to rebuild the URL when hooks update searchParams).
	 * @param perRequest Per-request beforeRequest hooks, if any.
	 * @returns The (possibly rebuilt) request URL.
	 */
	async #runBeforeRequestHooks(requestOptions: RequestOptions, url: URL, path: string | undefined, perRequest: BeforeRequestHook[] | undefined): Promise<URL> {
		const globalHooks = Transportr.#globalHooks.beforeRequest;
		const instanceHooks = this.#hooks.beforeRequest;
		const perRequestLength = perRequest === undefined ? 0 : perRequest.length;
		if (globalHooks.length === 0 && instanceHooks.length === 0 && perRequestLength === 0) { return url }

		for (let i = 0, length = globalHooks.length; i < length; i++) {
			const result = await globalHooks[i]!(requestOptions, url);
			if (result) { Object.assign(requestOptions, result); if (result.searchParams !== undefined) { url = Transportr.#createUrl(this, path, requestOptions.searchParams) } }
		}
		for (let i = 0, length = instanceHooks.length; i < length; i++) {
			const result = await instanceHooks[i]!(requestOptions, url);
			if (result) { Object.assign(requestOptions, result); if (result.searchParams !== undefined) { url = Transportr.#createUrl(this, path, requestOptions.searchParams) } }
		}
		for (let i = 0; i < perRequestLength; i++) {
			const result = await perRequest![i]!(requestOptions, url);
			if (result) { Object.assign(requestOptions, result); if (result.searchParams !== undefined) { url = Transportr.#createUrl(this, path, requestOptions.searchParams) } }
		}
		return url;
	}

	/**
	 * Runs the afterResponse hook chain (global → instance → per-request).
	 * Returns the input response untouched when no hooks are registered.
	 * @param response The current response.
	 * @param requestOptions The original request options passed to each hook.
	 * @param perRequest Per-request afterResponse hooks, if any.
	 * @returns The (possibly replaced) response.
	 */
	async #runAfterResponseHooks(response: Response, requestOptions: RequestOptions, perRequest: AfterResponseHook[] | undefined): Promise<Response> {
		const globalHooks = Transportr.#globalHooks.afterResponse;
		const instanceHooks = this.#hooks.afterResponse;
		const perRequestLength = perRequest === undefined ? 0 : perRequest.length;
		if (globalHooks.length === 0 && instanceHooks.length === 0 && perRequestLength === 0) { return response }

		for (let i = 0, length = globalHooks.length; i < length; i++) {
			const result = await globalHooks[i]!(response, requestOptions);
			if (result) { response = result }
		}
		for (let i = 0, length = instanceHooks.length; i < length; i++) {
			const result = await instanceHooks[i]!(response, requestOptions);
			if (result) { response = result }
		}
		for (let i = 0; i < perRequestLength; i++) {
			const result = await perRequest![i]!(response, requestOptions);
			if (result) { response = result }
		}
		return response;
	}

	/**
	 * Runs the beforeError hook chain (global → instance → per-request).
	 * Returns the input error untouched when no hooks are registered.
	 * @param error The current HttpError.
	 * @param perRequest Per-request beforeError hooks, if any.
	 * @returns The (possibly transformed) error.
	 */
	async #runBeforeErrorHooks(error: HttpError, perRequest: BeforeErrorHook[] | undefined): Promise<HttpError> {
		const globalHooks = Transportr.#globalHooks.beforeError;
		const instanceHooks = this.#hooks.beforeError;
		const perRequestLength = perRequest === undefined ? 0 : perRequest.length;
		if (globalHooks.length === 0 && instanceHooks.length === 0 && perRequestLength === 0) { return error }

		for (let i = 0, length = globalHooks.length; i < length; i++) {
			const result = await globalHooks[i]!(error);
			if (result instanceof HttpError) { error = result }
		}
		for (let i = 0, length = instanceHooks.length; i < length; i++) {
			const result = await instanceHooks[i]!(error);
			if (result instanceof HttpError) { error = result }
		}
		for (let i = 0; i < perRequestLength; i++) {
			const result = await perRequest![i]!(error);
			if (result instanceof HttpError) { error = result }
		}
		return error;
	}

	/**
	 * It returns a response handler based on the content type of the response.
	 * @param path The path to the resource.
	 * @param userOptions The user options for the request.
	 * @param options The options for the request.
	 * @param responseHandler The response handler for the request.
	 * @returns A response handler function.
	 */
	async #execute<T extends ResponseBody>(path?: string | RequestOptions, userOptions: RequestOptions = {}, options: RequestOptions = {}, responseHandler?: ResponseHandler<NoInfer<T>>): Promise<T | undefined | Result<T | undefined>> {
		if (isObject(path)) { [ path, userOptions ] = [ undefined, path ] }

		const requestConfig = this.#processRequestOptions(userOptions, options);
		const { requestOptions } = requestConfig;
		const unwrap = requestOptions.unwrap !== false;
		const requestHooks = requestOptions.hooks;

		try {
			const url = Transportr.#createUrl(this, path, requestOptions.searchParams);
			await this.#runBeforeRequestHooks(requestOptions, url, path, requestHooks?.beforeRequest);

			let response = await this.#request<T>(path, requestConfig);
			response = await this.#runAfterResponseHooks(response, requestOptions, requestHooks?.afterResponse);

			try {
				if (!responseHandler && response.status !== 204) {
					responseHandler = this.#getResponseHandler<T>(response.headers.get('content-type'));
				}

				const data = await responseHandler?.(response);

				this.#publish({ name: RequestEvent.SUCCESS, data, global: requestConfig.global });

				return unwrap ? data : [ true, data ];
			} catch (cause) {
				throw await this.#handleError(path, response, { cause: cause as Error }, requestOptions);
			}
		} catch (error) {
			if (!unwrap) { return [ false, error as HttpError ] }
			throw error;
		}
	}

	/**
	 * Creates a new set of options for a request.
	 * @param options The user options for the request.
	 * @param userOptions The default options for the request.
	 * @returns A new set of options for the request.
	 */
	static #createOptions({ headers: userHeaders, searchParams: userSearchParams, ...userOptions }: RequestOptions, { headers, searchParams, ...options }: RequestOptions): RequestOptions {
		headers = Transportr.#mergeHeaders(new Headers(), userHeaders, headers);
		searchParams = Transportr.#mergeSearchParams(new URLSearchParams(), userSearchParams, searchParams);

		return { ...objectMerge(options, userOptions)!, headers, searchParams };
	}

	/**
	 * Merges user and request headers into the target Headers object.
	 * @param target The target Headers object.
	 * @param headerSources Variable number of header sources to merge.
	 * @returns The merged Headers object.
	 */
	static #mergeHeaders(target: Headers, ...headerSources: (RequestHeaders | undefined)[]): Headers {
		for (const headers of headerSources) {
			if (headers === undefined) { continue }

			// Handle different input types
			if (headers instanceof Headers) {
				// Use the native forEach method for Headers
				headers.forEach((value, name) => target.set(name, value));
			} else if (Array.isArray(headers)) {
				// Handle array of tuples format
				for (const [ name, value ] of headers) { target.set(name, value) }
			} else {
				// Handle Record<string, string> format - use Object.keys() to avoid intermediate tuple array
				const keys = Object.keys(headers);
				for (let i = 0, length = keys.length; i < length; i++) {
					const name = keys[i]!;
					const value = (headers as Record<string, string | undefined>)[name];
					if (value !== undefined) { target.set(name, value) }
				}
			}
		}

		return target;
	}

	/**
	 * Merges user and request search parameters into the target URLSearchParams object.
	 * @param target The target URLSearchParams object.
	 * @param sources The search parameters to merge.
	 * @returns The merged URLSearchParams object.
	 */
	static #mergeSearchParams(target: URLSearchParams, ...sources: (SearchParameters | undefined)[]): URLSearchParams {
		for (const searchParams of sources) {
			if (searchParams === undefined) { continue }

			// Handle different input types
			if (searchParams instanceof URLSearchParams) {
				// Use the native forEach method for URLSearchParams
				searchParams.forEach((value, name) => target.set(name, value));
			} else if (isString(searchParams) || Array.isArray(searchParams)) {
				for (const [name, value] of new URLSearchParams(searchParams)) { target.set(name, value) }
			} else {
				// Handle Record<string, string> format - use Object.keys() for better performance
				const keys = Object.keys(searchParams);
				for (let i = 0; i < keys.length; i++) {
					const name = keys[i]!;
					const value = searchParams[name];
					if (value !== undefined) { target.set(name, typeof value === 'string' ? value : String(value)) }
				}
			}
		}

		return target;
	}

	/**
	 * Processes request options by merging user, instance, and method-specific options.
	 *
	 * Hot path optimizations:
	 *  - No parameter destructuring (avoids two transient rest objects per call).
	 *  - Skips Headers/URLSearchParams construction entirely when neither user nor method overrides supply them.
	 *  - Reuses the pre-stripped `_noBodyHeadersTemplate` for non-body methods so we never have to delete `content-type` per request.
	 *  - Builds `requestOptions` via `Object.assign` with a stable property order to keep V8 hidden classes monomorphic.
	 * @param userOptions The user-provided options for the request.
	 * @param options Additional method-specific options.
	 * @returns Processed request options with signal controller and global flag.
	 */
	#processRequestOptions(userOptions: RequestOptions, options: RequestOptions): RequestConfiguration {
		const userHeaders = userOptions.headers;
		const userSearchParams = userOptions.searchParams;
		const userBody = userOptions.body;
		const optHeaders = options.headers;
		const optSearchParams = options.searchParams;

		const method = (options.method ?? userOptions.method ?? this.#options.method ?? 'GET');
		const isBodyMethod = isRequestBodyMethod(method);
		// Headers fast path: when the method strips Content-Type AND there are no overrides, clone the pre-stripped template.
		let headers: Headers;
		if (!isBodyMethod && userHeaders === undefined && optHeaders === undefined) {
			headers = new Headers(this.#noBodyHeadersTemplate);
		} else {
			headers = new Headers(this.#options.headers);
			if (userHeaders !== undefined || optHeaders !== undefined) {
				Transportr.#mergeHeaders(headers, userHeaders, optHeaders);
			}
		}

		// SearchParams fast path: skip construction entirely when both inputs and instance defaults are empty.
		const instanceSearchParams = this.#options.searchParams as URLSearchParams | undefined;
		const hasInstanceSearchParams = instanceSearchParams !== undefined && instanceSearchParams.size > 0;
		let searchParams: URLSearchParams;
		if (!hasInstanceSearchParams && userSearchParams === undefined && optSearchParams === undefined) {
			searchParams = new URLSearchParams();
		} else {
			searchParams = new URLSearchParams(instanceSearchParams);
			if (userSearchParams !== undefined || optSearchParams !== undefined) {
				Transportr.#mergeSearchParams(searchParams, userSearchParams, optSearchParams);
			}
		}

		// Build requestOptions via Object.assign to avoid the rest-object allocations the spread/destructure pattern produces.
		// Object.assign copies explicit `undefined` properties, so a user-passed `{ method: undefined }` correctly overrides
		// the instance default for the value handed to fetch — we only use the local `method` var for retry/dedupe routing.
		const requestOptions = Object.assign({} as RequestOptions, this.#options, userOptions, options);
		requestOptions.headers = headers;
		requestOptions.searchParams = searchParams;

		if (isBodyMethod) {
			if (isRawBody(userBody)) {
				// Raw BodyInit — send as-is, delete Content-Type so the runtime sets it automatically (e.g. multipart boundary).
				requestOptions.body = userBody;
				headers.delete('content-type');
			} else {
				const instanceBody = this.#options.body;
				const body = isObject<Record<string, unknown>>(instanceBody) && isObject<Record<string, unknown>>(userBody) ? objectMerge(instanceBody, userBody) : (userBody !== undefined ? userBody : instanceBody);
				const contentType = headers.get('content-type');
				const isJson = contentType !== null && contentType.includes('json');
				requestOptions.body = (isJson && isObject(body) ? serialize(body) : body) as RequestOptions['body'];
			}
		} else {
			if (requestOptions.body instanceof URLSearchParams) {
				Transportr.#mergeSearchParams(searchParams, requestOptions.body);
			}
			requestOptions.body = undefined;
			// Headers were already built without Content-Type via the fast path; only need to strip when overrides reintroduced it.
			if (userHeaders !== undefined || optHeaders !== undefined) { headers.delete('content-type') }
		}

		const signal = requestOptions.signal;
		const timeout = requestOptions.timeout;
		const global = requestOptions.global ?? false;
		const xsrf = requestOptions.xsrf;

		// XSRF/CSRF protection: read token from cookie and set as request header.
		if (xsrf) {
			const { cookieName, headerName }: XsrfOptions = typeof xsrf === 'object' ? xsrf : {};
			const token = getCookieValue(cookieName ?? XSRF_COOKIE_NAME);
			if (token) { headers.set(headerName ?? XSRF_HEADER_NAME, token) }
		}

		const signalController = new SignalController({ signal, timeout })
			.onAbort((event) => this.#publish({ name: RequestEvent.ABORTED, event, global }))
			.onTimeout((event) => this.#publish({ name: RequestEvent.TIMEOUT, event, global }));

		requestOptions.signal = signalController.signal;
		this.#publish({ name: RequestEvent.CONFIGURED, data: requestOptions, global });

		return { signalController, requestOptions, global };
	}

	/**
	 * Gets the base URL from a URL or string.
	 * @param url The URL or string to parse.
	 * @returns The base URL.
	 */
	static #getBaseUrl(url: URL | string): URL {
		if (url instanceof URL) { return url }

		if (!isString(url)) { throw new TypeError('Invalid URL') }

		return new URL(url, url.startsWith('/') ? globalThis.location.origin : undefined);
	}

	/**
	 * Parses a content-type string into a MediaType instance with caching.
	 * This method caches parsed MediaType instances to avoid re-parsing the same content-type strings,
	 * which significantly improves performance for repeated requests with the same content types.
	 * @param contentType The content-type string to parse.
	 * @returns The parsed MediaType instance, or undefined if parsing fails.
	 */
	static #getOrParseMediaType(contentType: string | null): MediaType | undefined {
		if (contentType === null) { return }

		// Check the predefined mediaTypes map first (fastest lookup) or the cache
		let mediaType = Transportr.#mediaTypeCache.get(contentType);

		if (mediaType !== undefined) { return mediaType }

		// Parse and cache the new MediaType
		mediaType = MediaType.parse(contentType) ?? undefined;

		if (mediaType !== undefined) {
			// Evict oldest entry when cache exceeds limit to prevent unbounded growth
			if (Transportr.#mediaTypeCache.size >= 100) {
				Transportr.#mediaTypeCache.delete(Transportr.#mediaTypeCache.keys().next().value!);
			}
			Transportr.#mediaTypeCache.set(contentType, mediaType);
		}

		return mediaType;
	}

	/**
	 * Creates a new URL with the given path and search parameters.
	 * Uses the pre-normalized base pathname/origin to avoid per-request regex work.
	 * Polymorphic on the first arg to preserve the legacy direct-URL test API.
	 * @param source A Transportr instance (preferred) or a base URL.
	 * @param path The path to append to the base URL.
	 * @param searchParams The search parameters to append to the URL.
	 * @returns A new URL with the given path and search parameters.
	 */
	static #createUrl(source: Transportr | URL, path?: string, searchParams?: SearchParameters): URL {
		let requestUrl: URL;
		if (source instanceof URL) {
			// Legacy/direct-call path \u2014 strip a single trailing slash from pathname.
			const basePath = source.pathname;
			const normalizedBase = basePath.charCodeAt(basePath.length - 1) === 47 ? basePath.slice(0, -1) : basePath;
			requestUrl = path ? new URL(`${normalizedBase}${path}`, source.origin) : new URL(source);
		} else {
			requestUrl = path ? new URL(`${source.#basePath}${path}`, source.#origin) : new URL(source.#baseUrl);
		}

		if (searchParams) {
			Transportr.#mergeSearchParams(requestUrl.searchParams, searchParams);
		}

		return requestUrl;
	}

	/**
	 * It generates a ResponseStatus object from an error name and a Response object.
	 * @param errorName The name of the error.
	 * @param response The Response object.
	 * @returns A ResponseStatus object.
	 */
	static #generateResponseStatusFromError(errorName?: string, { status, statusText }: Response = new Response()): ResponseStatus {
		switch (errorName) {
			case SignalErrors.ABORT: return aborted;
			case SignalErrors.TIMEOUT: return timedOut;
			default: return status >= 400 ? new ResponseStatus(status, statusText) : internalServerError;
		}
	}

	/**
	 * Handles an error that occurs during a request.
	 * @param path The path of the request.
	 * @param response The Response object.
	 * @param options Additional error context including cause, entity, url, method, and timing.
	 * @param requestOptions The original request options that led to the error, used for hooks context.
	 * @returns An HttpError object.
	 */
	async #handleError(path?: string, response?: Response, { cause, entity, url, method, timing }: Omit<HttpErrorOptions, 'message'> = {}, requestOptions?: RequestOptions): Promise<HttpError> {
		const message = method && url	? `${method} ${url.href} failed${response ? ` with status ${response.status}` : ''}` : `An error has occurred with your request to: '${path}'`;
		let error = new HttpError(Transportr.#generateResponseStatusFromError(cause?.name, response), { message, cause, entity, url, method, timing });

		error = await this.#runBeforeErrorHooks(error, requestOptions?.hooks?.beforeError);

		this.#publish({ name: RequestEvent.ERROR, data: error });

		return error;
	}

	/**
	 * Publishes an event to the global and instance event handlers.
	 * Skips entirely when no subscribers are registered for the event — the common case in production —
	 * which avoids both the CustomEvent allocation and the validateEventName/forEach overhead inside Subscribr.
	 * @param eventObject The event object to publish.
	 */
	#publish({ name, event, data, global = true }: PublishOptions): void {
		const hasGlobal = global && (Transportr.#globalSubCounts[name] ?? 0) > 0;
		const hasLocal = (this.#subCounts[name] ?? 0) > 0;
		if (!hasGlobal && !hasLocal) { return }

		// Lazily allocate the CustomEvent only when at least one subscriber exists.
		const evt = event ?? new CustomEvent(name);
		if (hasGlobal) { Transportr.#globalSubscribr.publish(name, evt, data) }
		if (hasLocal) { this.#subscribr.publish(name, evt, data) }
	}

	/**
	 * It returns a response handler based on the content type of the response.
	 * @param contentType The content type of the response.
	 * @returns A response handler function.
	 */
	#getResponseHandler<T extends ResponseBody>(contentType?: string | null): ResponseHandler<T> | undefined {
		if (!contentType) { return }

		// Fast path: result already resolved for this exact Content-Type string.
		const cached = Transportr.#handlerResolutionCache.get(contentType);
		if (cached !== undefined) { return cached === null ? undefined : cached as ResponseHandler<T> }

		const mediaType = Transportr.#getOrParseMediaType(contentType);
		if (!mediaType) {
			Transportr.#handlerResolutionCache.set(contentType, null);
			return;
		}

		const handlers = Transportr.#contentTypeHandlers;
		for (let i = 0, length = handlers.length; i < length; i++) {
			const entry = handlers[i]!;
			if (mediaType.matches(entry[0])) {
				const resolved = entry[1];
				Transportr.#handlerResolutionCache.set(contentType, resolved);
				return resolved as ResponseHandler<T>;
			}
		}

		// Structured syntax suffix fallback for types like application/*+json and application/*+xml.
		const subtype = mediaType.subtype;
		if (subtype.endsWith('+json')) {
			Transportr.#handlerResolutionCache.set(contentType, handleJson);
			return handleJson as ResponseHandler<T>;
		}

		if (subtype.endsWith('+xml')) {
			Transportr.#handlerResolutionCache.set(contentType, handleXml);
			return handleXml as ResponseHandler<T>;
		}

		Transportr.#handlerResolutionCache.set(contentType, null);

		return undefined;
	}

	/**
	 * A string representation of the Transportr instance.
	 * @returns The string 'Transportr'.
	 */
	get [Symbol.toStringTag](): string {
		return 'Transportr';
	}
}
