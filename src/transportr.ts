import { MediaType } from '@d1g1tal/media-type';
import { Subscribr } from '@d1g1tal/subscribr';
import { HttpError } from './http-error';
import { ResponseStatus } from './response-status';
import { SignalController } from './signal-controller.js';
import { handleText, handleScript, handleCss, handleJson, handleBlob, handleImage, handleBuffer, handleReadableStream, handleXml, handleHtml, handleHtmlFragment, handleEventStream, handleNdjsonStream } from './response-handlers';
import { isRequestBodyMethod, isRawBody, getCookieValue, isString, isArrayBuffer, isObject, objectMerge, serialize } from './utils';
import { RequestCachingPolicy, RequestEvent, SignalErrors, XSRF_COOKIE_NAME, XSRF_HEADER_NAME, abortEvent, aborted, defaultMediaType, defaultOrigin, endsWithSlashRegEx, internalServerError, mediaTypes, retryBackoffFactor, retryDelay, retryMethods, retryStatusCodes, timedOut } from './constants';
import type {	RequestOptions, ResponseBody, RequestEventHandler, SearchParameters, EventRegistration, ResponseHandler, RequestHeaders, TypedResponse, Json, Entries, HookOptions, HttpErrorOptions, NormalizedRetryOptions, PublishOptions, RetryOptions, RequestTiming, XsrfOptions, ServerSentEvent, RequestEventDataMap, TypedRequestEventHandler, Result } from '@types';

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
	private readonly _baseUrl: URL;
	private readonly _options: RequestOptions;
	private readonly subscribr: Subscribr;
	private readonly hooks: Required<HookOptions> = { beforeRequest: [], afterResponse: [], beforeError: [] };
	private static globalSubscribr = new Subscribr();
	private static globalHooks: Required<HookOptions> = { beforeRequest: [], afterResponse: [], beforeError: [] };
	private static signalControllers = new Set<SignalController>();
	/** Map of in-flight deduplicated requests keyed by URL + method */
	private static inflightRequests = new Map<string, Promise<Response>>();
	/** Cache for parsed MediaType instances to avoid re-parsing the same content-type strings */
	private static mediaTypeCache = new Map(Object.values(mediaTypes).map((mediaType) => [ mediaType.toString(), mediaType ]));
	private static contentTypeHandlers: Entries<string, ResponseHandler<ResponseBody>> = [
		[ mediaTypes.TEXT.type, handleText ],
		[ mediaTypes.JSON.subtype, handleJson ],
		[ mediaTypes.BIN.subtype, handleReadableStream ],
		[ mediaTypes.HTML.subtype, handleHtml ],
		[ mediaTypes.XML.subtype, handleXml ],
		[ mediaTypes.PNG.type, handleImage as ResponseHandler<ResponseBody> ],
		[ mediaTypes.JAVA_SCRIPT.subtype, handleScript as ResponseHandler<ResponseBody> ],
		[ mediaTypes.CSS.subtype, handleCss as ResponseHandler<ResponseBody> ]
	];

	/**
	 * Create a new Transportr instance with the provided location or origin and context path.
	 *
	 * @param url The URL for {@link fetch} requests.
	 * @param options The default {@link RequestOptions} for this instance.
	 */
	constructor(url: URL | string | RequestOptions = globalThis.location?.origin ?? 'http://localhost', options: RequestOptions = {}) {
		if (isObject(url)) { [ url, options ] = [ globalThis.location?.origin ?? 'http://localhost', url ] }

		this._baseUrl = Transportr.getBaseUrl(url);
		this._options = Transportr.createOptions(options, Transportr.defaultRequestOptions);
		this.subscribr = new Subscribr();
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
	private static readonly defaultRequestOptions: RequestOptions = {
		body: undefined,
		cache: RequestCachingPolicy.NO_STORE,
		credentials: Transportr.CredentialsPolicy.SAME_ORIGIN,
		headers: new Headers({ 'content-type': defaultMediaType, 'accept': defaultMediaType }),
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
		return Transportr.globalSubscribr.subscribe(event, handler, context);
	}

	/**
	 * Removes a {@link EventRegistration} from the global event handler.
	 *
	 * @param eventRegistration The {@link EventRegistration} to remove.
	 * @returns True if the {@link EventRegistration} was removed, false otherwise.
	 */
	static unregister(eventRegistration: EventRegistration): boolean {
		return Transportr.globalSubscribr.unsubscribe(eventRegistration);
	}

	/**
	 * Aborts all active requests.
	 * This is useful for when the user navigates away from the current page.
	 * This will also clear the {@link Transportr#signalControllers} set.
	 */
	static abortAll(): void {
		for (const signalController of this.signalControllers) {
			signalController.abort(abortEvent());
		}

		// Clear the set after aborting all requests
		this.signalControllers.clear();
	}

	/**
	 * Executes multiple requests concurrently and resolves when all complete.
	 * @param requests An array of promises from Transportr request methods.
	 * @returns A promise resolving to an array of all results.
	 */
	static all<T extends readonly Promise<unknown>[]>(requests: T): Promise<{ -readonly [K in keyof T]: Awaited<T[K]> }> {
		return Promise.all(requests) as Promise<{ -readonly [K in keyof T]: Awaited<T[K]> }>;
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
		Transportr.contentTypeHandlers.unshift([ contentType, handler ]);
	}

	/**
	 * Removes a previously registered content-type response handler.
	 *
	 * @param contentType The content-type string to remove.
	 * @returns True if the handler was found and removed, false otherwise.
	 */
	static unregisterContentTypeHandler(contentType: string): boolean {
		const index = Transportr.contentTypeHandlers.findIndex(([ type ]) => type === contentType);
		if (index === -1) { return false }

		Transportr.contentTypeHandlers.splice(index, 1);

		return true;
	}

	/**
	 * Registers global lifecycle hooks that run on all requests from all instances.
	 * Global hooks execute before instance and per-request hooks.
	 *
	 * @param hooks The hooks to register globally.
	 */
	static addHooks(hooks: HookOptions): void {
		if (hooks.beforeRequest) { Transportr.globalHooks.beforeRequest.push(...hooks.beforeRequest) }
		if (hooks.afterResponse) { Transportr.globalHooks.afterResponse.push(...hooks.afterResponse) }
		if (hooks.beforeError) { Transportr.globalHooks.beforeError.push(...hooks.beforeError) }
	}

	/**
	 * Removes all global lifecycle hooks.
	 */
	static clearHooks(): void {
		Transportr.globalHooks = { beforeRequest: [], afterResponse: [], beforeError: [] };
	}

	/**
	 * Tears down all global state: aborts in-flight requests, clears global event subscriptions,
	 * hooks, in-flight deduplication map, and media type cache (retaining built-in entries).
	 */
	static unregisterAll(): void {
		Transportr.abortAll();
		Transportr.globalSubscribr = new Subscribr();
		Transportr.clearHooks();
		Transportr.inflightRequests.clear();
	}

	/**
	 * It returns the base {@link URL} for the API.
	 *
	 * @returns The baseUrl property.
	 */
	get baseUrl(): URL {
		return this._baseUrl;
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
		return this.subscribr.subscribe(event, handler, context);
	}

	/**
	 * Unregisters an event handler from a {@link Transportr} instance.
	 *
	 * @param eventRegistration The event registration to remove.
	 * @returns True if the {@link EventRegistration} was removed, false otherwise.
	 */
	unregister(eventRegistration: EventRegistration): boolean {
		return this.subscribr.unsubscribe(eventRegistration);
	}

	/**
	 * Registers instance-level lifecycle hooks that run on all requests from this instance.
	 * Instance hooks execute after global hooks but before per-request hooks.
	 *
	 * @param hooks The hooks to register on this instance.
	 * @returns This instance for method chaining.
	 */
	addHooks(hooks: HookOptions): this {
		if (hooks.beforeRequest) { this.hooks.beforeRequest.push(...hooks.beforeRequest) }
		if (hooks.afterResponse) { this.hooks.afterResponse.push(...hooks.afterResponse) }
		if (hooks.beforeError) { this.hooks.beforeError.push(...hooks.beforeError) }
		return this;
	}

	/**
	 * Removes all instance-level lifecycle hooks.
	 * @returns This instance for method chaining.
	 */
	clearHooks(): this {
		this.hooks.beforeRequest.length = 0;
		this.hooks.afterResponse.length = 0;
		this.hooks.beforeError.length = 0;
		return this;
	}

	/**
	 * Tears down this instance: clears all instance subscriptions and hooks.
	 * The instance should not be used after calling this method.
	 */
	destroy(): void {
		this.clearHooks();
		this.subscribr.destroy();
	}

	/**
	 * This function returns a promise that resolves to the result of a request to the specified path with
	 * the specified options, where the method is GET.
	 *
	 * @async
	 * @param path The path to the resource you want to get.
	 * @param options The options for the request.
	 * @returns A promise that resolves to the response of the request.
	 */
	async get<T extends ResponseBody = ResponseBody>(path?: string | RequestOptions, options?: RequestOptions): Promise<T | undefined> {
		return this._get<T>(path, options);
	}

	/**
	 * This function makes a POST request to the given path with the given body and options.
	 *
	 * @async
	 * @template T The expected response type (defaults to ResponseBody)
	 * @param path The path to the endpoint you want to call.
	 * @param options The options for the request.
	 * @returns A promise that resolves to the response body.
	 */
	async post<T extends ResponseBody = ResponseBody>(path?: string | RequestOptions, options?: RequestOptions): Promise<T | undefined> {
		if (typeof(path) !== 'string') { [ path, options ] = [ undefined, path as RequestOptions ] }

		return this.execute<T>(path, options, { method: 'POST' });
	}

	/**
	 * This function returns a promise that resolves to the result of a request to the specified path with
	 * the specified options, where the method is PUT.
	 *
	 * @async
	 * @template T The expected response type (defaults to ResponseBody)
	 * @param path The path to the endpoint you want to call.
	 * @param options The options for the request.
	 * @returns The return value of the #request method.
	 */
	async put<T extends ResponseBody = ResponseBody>(path?: string | RequestOptions, options?: RequestOptions): Promise<T | undefined> {
		return this.execute<T>(path, options, { method: 'PUT' });
	}

	/**
	 * It takes a path and options, and returns a request with the method set to PATCH.
	 *
	 * @async
	 * @template T The expected response type (defaults to ResponseBody)
	 * @param path The path to the endpoint you want to hit.
	 * @param options The options for the request.
	 * @returns A promise that resolves to the response of the request.
	 */
	async patch<T extends ResponseBody = ResponseBody>(path?: string | RequestOptions, options?: RequestOptions): Promise<T | undefined> {
		return this.execute<T>(path, options, { method: 'PATCH' });
	}

	/**
	 * It takes a path and options, and returns a request with the method set to DELETE.
	 *
	 * @async
	 * @param path The path to the resource you want to access.
	 * @param options The options for the request.
	 * @returns The result of the request.
	 */
	async delete<T extends ResponseBody = ResponseBody>(path?: string | RequestOptions, options?: RequestOptions): Promise<T | undefined> {
		return this.execute<T>(path, options, { method: 'DELETE' });
	}

	/**
	 * Returns the response headers of a request to the given path.
	 *
	 * @async
	 * @param path The path to the resource you want to access.
	 * @param options The options for the request.
	 * @returns A promise that resolves to the response object.
	 */
	async head<T extends ResponseBody = ResponseBody>(path?: string | RequestOptions, options?: RequestOptions): Promise<T | undefined> {
		return this.execute<T>(path, options, { method: 'HEAD' });
	}

	/**
	 * It returns a promise that resolves to the allowed request methods for the given resource path.
	 *
	 * @async
	 * @param path The path to the resource.
	 * @param options The options for the request.
	 * @returns A promise that resolves to an array of allowed request methods for this resource.
	 */
	async options(path?: string | RequestOptions, options: RequestOptions = {}): Promise<string[] | undefined> {
		if (isObject(path)) { [ path, options ] = [ undefined, path ] }

		const requestConfig = this.processRequestOptions(options, { method: 'OPTIONS' });
		const { requestOptions } = requestConfig;
		const requestHooks = requestOptions.hooks;

		// Run beforeRequest hooks: global → instance → per-request
		let url = Transportr.createUrl(this._baseUrl, path, requestOptions.searchParams);
		const beforeRequestHookSets = [ Transportr.globalHooks.beforeRequest, this.hooks.beforeRequest, requestHooks?.beforeRequest ];
		for (const hooks of beforeRequestHookSets) {
			if (!hooks) { continue }
			for (const hook of hooks) {
				const result = await hook(requestOptions, url);
				if (result) {
					Object.assign(requestOptions, result);
					if (result.searchParams !== undefined) { url = Transportr.createUrl(this._baseUrl, path, requestOptions.searchParams) }
				}
			}
		}

		let response: Response = await this._request(path, requestConfig);

		// Run afterResponse hooks: global → instance → per-request
		const afterResponseHookSets = [ Transportr.globalHooks.afterResponse, this.hooks.afterResponse, requestHooks?.afterResponse ];
		for (const hooks of afterResponseHookSets) {
			if (!hooks) { continue }
			for (const hook of hooks) {
				const result = await hook(response, requestOptions);
				if (result) { response = result }
			}
		}

		const allowedMethods = response.headers.get('allow')?.split(',').map((method: string) => method.trim());

		this.publish({ name: RequestEvent.SUCCESS, data: allowedMethods, global: options.global });

		return allowedMethods;
	}

	/**
	 * It takes a path and options, and makes a request to the server
	 * @async
	 * @param path The path to the endpoint you want to hit.
	 * @param options The options for the request.
	 * @returns The return value of the function is the return value of the function that is passed to the `then` method of the promise returned by the `fetch` method.
	 * @throws {HttpError} If an error occurs during the request.
	 */
	async request<T = unknown>(path?: string | RequestOptions, options: RequestOptions = {}): Promise<TypedResponse<T>> {
		if (isObject(path)) { [ path, options ] = [ undefined, path ] }

		const response = await this._request<T>(path, this.processRequestOptions(options, {}));

		this.publish({ name: RequestEvent.SUCCESS, data: response, global: options.global });

		return response;
	}

	/**
	 * It gets the JSON representation of the resource at the given path.
	 *
	 * @async
	 * @template T The expected JSON response type (defaults to JsonObject)
	 * @param path The path to the resource.
	 * @param options The options object to pass to the request.
	 * @returns A promise that resolves to the response body as a typed JSON value.
	 */
	async getJson(path?: string | RequestOptions, options?: RequestOptions): Promise<Json | undefined> {
		return this._get(path, options, { headers: { accept: `${mediaTypes.JSON}` } }, handleJson);
	}

	/**
	 * It gets the XML representation of the resource at the given path.
	 *
	 * @async
	 * @param path The path to the resource you want to get.
	 * @param options The options for the request.
	 * @returns The result of the function call to #get.
	 */
	async getXml(path?: string | RequestOptions, options?: RequestOptions): Promise<Document | undefined> {
		return this._get(path, options, { headers: { accept: `${mediaTypes.XML}` } }, handleXml);
	}

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
	async getHtml(path?: string | RequestOptions, options?: RequestOptions, selector?: string): Promise<Document | Element | null | undefined> {
		const doc = await this._get(path, options, { headers: { accept: `${mediaTypes.HTML}` } }, handleHtml);
		return selector && doc ? doc.querySelector(selector) : doc;
	}

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
	async getHtmlFragment(path?: string | RequestOptions, options?: RequestOptions, selector?: string): Promise<DocumentFragment | Element | null | undefined> {
		const fragment = await this._get(path, options, { headers: { accept: `${mediaTypes.HTML}` } }, handleHtmlFragment);
		return selector && fragment ? fragment.querySelector(selector) : fragment;
	}
	/**
	 * It gets a script from the server, and appends the script to the Document HTMLHeadElement
	 * @param path The path to the script.
	 * @param options The options for the request.
	 * @returns A promise that resolves to void.
	 */
	async getScript(path?: string | RequestOptions, options?: RequestOptions): Promise<void> {
		return this._get(path, options, { headers: { accept: `${mediaTypes.JAVA_SCRIPT}` } }, handleScript);
	}

	/**
	 * Gets a stylesheet from the server, and adds it as a Blob URL.
	 * @param path The path to the stylesheet.
	 * @param options The options for the request.
	 * @returns A promise that resolves to void.
	 */
	async getStylesheet(path?: string | RequestOptions, options?: RequestOptions): Promise<void> {
		return this._get(path, options, { headers: { accept: `${mediaTypes.CSS}` } }, handleCss);
	}

	/**
	 * It returns a blob from the specified path.
	 * @param path The path to the resource.
	 * @param options The options for the request.
	 * @returns A promise that resolves to a Blob or void.
	 */
	async getBlob(path?: string | RequestOptions, options?: RequestOptions): Promise<Blob | undefined> {
		return this._get(path, options, { headers: { accept: 'application/octet-stream' } }, handleBlob);
	}

	/**
	 * It returns a promise that resolves to an `HTMLImageElement`.
	 * The object URL created to load the image is automatically revoked to prevent memory leaks.
	 * Works in both browser and Node.js (via JSDOM) environments.
	 * @param path The path to the image.
	 * @param options The options for the request.
	 * @returns A promise that resolves to an `HTMLImageElement` or `void`.
	 */
	async getImage(path?: string, options?: RequestOptions): Promise<HTMLImageElement | undefined> {
		return this._get(path, options, { headers: { accept: 'image/*' } }, handleImage);
	}

	/**
	 * It gets a buffer from the specified path
	 * @param path The path to the resource.
	 * @param options The options for the request.
	 * @returns A promise that resolves to an ArrayBuffer or void.
	 */
	async getBuffer(path?: string | RequestOptions, options?: RequestOptions): Promise<ArrayBuffer | undefined> {
		return this._get(path, options, { headers: { accept: 'application/octet-stream' } }, handleBuffer);
	}

	/**
	 * It returns a readable stream of the response body from the specified path.
	 * @param path The path to the resource.
	 * @param options The options for the request.
	 * @returns A promise that resolves to a ReadableStream, null, or void.
	 */
	async getStream(path?: string | RequestOptions, options?: RequestOptions): Promise<ReadableStream<Uint8Array> | null | undefined> {
		return this._get(path, options, { headers: { accept: 'application/octet-stream' } }, handleReadableStream);
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
	private async _get<T extends ResponseBody>(path?: string | RequestOptions, userOptions?: RequestOptions, options: RequestOptions = {}, responseHandler?: ResponseHandler<T>): Promise<T | undefined | Result<T | undefined>> {
		return this.execute<T>(path, userOptions, { ...options, method: 'GET', body: undefined }, responseHandler);
	}

	/**
	 * It processes the request options and returns a new object with the processed options.
	 * @param path The path to the resource.
	 * @param processedRequestOptions The user options for the request.
	 * @returns A new object with the processed options.
	 */
	private async _request<T = unknown>(path: string | undefined, { signalController, requestOptions, global }: RequestConfiguration): Promise<TypedResponse<T>> {
		Transportr.signalControllers.add(signalController);

		const retryConfig = Transportr.normalizeRetryOptions(requestOptions.retry);
		const method = requestOptions.method ?? 'GET';
		const canRetry = retryConfig.limit > 0 && retryConfig.methods.includes(method);
		const canDedupe = requestOptions.dedupe === true && (method === 'GET' || method === 'HEAD');
		let attempt = 0;
		const startTime = performance.now();

		/**
		 * Creates a RequestTiming snapshot from the start time to now.
		 * @returns Timing information for the request.
		 */
		const getTiming = (): RequestTiming => {
			const end = performance.now();
			return { start: startTime, end, duration: end - startTime };
		};

		try {
			const url = Transportr.createUrl(this._baseUrl, path, requestOptions.searchParams);
			const dedupeKey = canDedupe ? `${method}:${url.href}` : '';

			// If deduplication is enabled and an in-flight request exists, clone its response
			if (canDedupe) {
				const inflight = Transportr.inflightRequests.get(dedupeKey);
				if (inflight) { return (await inflight).clone() as TypedResponse<T> }
			}

			/**
			 * Performs the fetch with retry logic.
			 * @returns A promise resolving to the typed response.
			 */
			const doFetch = async (): Promise<TypedResponse<T>> => {
				while (true) {
					try {
						const response = await fetch<T>(url, requestOptions);
						if (!response.ok) {
							if (canRetry && attempt < retryConfig.limit && retryConfig.statusCodes.includes(response.status)) {
								attempt++;
								this.publish({ name: RequestEvent.RETRY, data: { attempt, status: response.status, method, path, timing: getTiming() }, global });
								await Transportr.retryDelay(retryConfig, attempt);
								continue;
							}
							// Capture response body for error diagnostics
							let entity: ResponseBody | undefined;
							try { entity = await response.text() } catch { /* body may be unavailable */ }
							throw await this.handleError(path, response, { entity, url, method, timing: getTiming() }, requestOptions);
						}

						return response;
					} catch (cause) {
						if (cause instanceof HttpError) { throw cause }

						// Network error — retry if allowed
						if (canRetry && attempt < retryConfig.limit) {
							attempt++;
							this.publish({ name: RequestEvent.RETRY, data: { attempt, error: (cause as Error).message, method, path, timing: getTiming() }, global });
							await Transportr.retryDelay(retryConfig, attempt);
							continue;
						}

						throw await this.handleError(path, undefined, { cause: cause as Error, url, method, timing: getTiming() }, requestOptions);
					}
				}
			};

			if (canDedupe) {
				const promise = doFetch();
				Transportr.inflightRequests.set(dedupeKey, promise as Promise<Response>);
				try {
					const response = await promise;
					return response;
				} finally {
					Transportr.inflightRequests.delete(dedupeKey);
				}
			}

			return await doFetch();
		} finally {
			Transportr.signalControllers.delete(signalController.destroy());
			if (!requestOptions.signal?.aborted) {
				const timing = getTiming();
				this.publish({ name: RequestEvent.COMPLETE, data: { timing }, global });
				if (Transportr.signalControllers.size === 0) {
					this.publish({ name: RequestEvent.ALL_COMPLETE, global });
				}
			}
		}
	}

	/**
	 * Normalizes a retry option into a full RetryOptions object.
	 * @param retry The retry option from request options.
	 * @returns Normalized retry configuration.
	 */
	private static normalizeRetryOptions(retry?: number | RetryOptions): NormalizedRetryOptions {
		if (retry === undefined) { return { limit: 0, statusCodes: [], methods: [], delay: retryDelay, backoffFactor: retryBackoffFactor } }
		if (typeof retry === 'number') { return { limit: retry, statusCodes: [ ...retryStatusCodes ], methods: [ ...retryMethods ], delay: retryDelay, backoffFactor: retryBackoffFactor } }

		return {
			limit: retry.limit ?? 0,
			statusCodes: retry.statusCodes ?? [ ...retryStatusCodes ],
			methods: retry.methods ?? [ ...retryMethods ],
			delay: retry.delay ?? retryDelay,
			backoffFactor: retry.backoffFactor ?? retryBackoffFactor
		};
	}

	/**
	 * Waits for the appropriate delay before a retry attempt.
	 * @param config The retry configuration.
	 * @param attempt The current attempt number (1-based).
	 * @returns A promise that resolves after the delay.
	 */
	private static retryDelay(config: NormalizedRetryOptions, attempt: number): Promise<void> {
		const ms = typeof config.delay === 'function' ? config.delay(attempt) : config.delay * (config.backoffFactor ** (attempt - 1));
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * It returns a response handler based on the content type of the response.
	 * @param path The path to the resource.
	 * @param userOptions The user options for the request.
	 * @param options The options for the request.
	 * @param responseHandler The response handler for the request.
	 * @returns A response handler function.
	 */
	private async execute<T extends ResponseBody>(path?: string | RequestOptions, userOptions: RequestOptions = {}, options: RequestOptions = {}, responseHandler?: ResponseHandler<NoInfer<T>>): Promise<T | undefined> {
		if (isObject(path)) { [ path, userOptions ] = [ undefined, path ] }

		const requestConfig = this.processRequestOptions(userOptions, options);
		const { requestOptions } = requestConfig;
		const requestHooks = requestOptions.hooks;

		// Run beforeRequest hooks: global → instance → per-request
		let url = Transportr.createUrl(this._baseUrl, path, requestOptions.searchParams);

		const beforeRequestHookSets = [ Transportr.globalHooks.beforeRequest, this.hooks.beforeRequest, requestHooks?.beforeRequest ];
		for (const hooks of beforeRequestHookSets) {
			if (!hooks) { continue }
			for (const hook of hooks) {
				const result = await hook(requestOptions, url);
				if (result) {
					Object.assign(requestOptions, result);
					if (result.searchParams !== undefined) { url = Transportr.createUrl(this._baseUrl, path, requestOptions.searchParams) }
				}
			}
		}

		let response = await this._request<T>(path, requestConfig);

		// Run afterResponse hooks: global → instance → per-request
		const afterResponseHookSets = [ Transportr.globalHooks.afterResponse, this.hooks.afterResponse, requestHooks?.afterResponse ];
		for (const hooks of afterResponseHookSets) {
			if (!hooks) { continue }
			for (const hook of hooks) {
				const result = await hook(response, requestOptions);
				if (result) { response = result as TypedResponse<T> }
			}
		}

		try {
			if (!responseHandler && response.status !== 204) {
				responseHandler = this.getResponseHandler<T>(response.headers.get('content-type'));
			}

			const data = await responseHandler?.(response);

			this.publish({ name: RequestEvent.SUCCESS, data, global: requestConfig.global });

			return data;
		} catch (cause) {
			throw await this.handleError(path as string, response, { cause: cause as Error }, requestOptions);
		}
	}

	/**
	 * Creates a new set of options for a request.
	 * @param options The user options for the request.
	 * @param userOptions The default options for the request.
	 * @returns A new set of options for the request.
	 */
	private static createOptions({ headers: userHeaders, searchParams: userSearchParams, ...userOptions }: RequestOptions, { headers, searchParams, ...options }: RequestOptions): RequestOptions {
		headers = Transportr.mergeHeaders(new Headers(), userHeaders, headers);
		searchParams = Transportr.mergeSearchParams(new URLSearchParams(), userSearchParams, searchParams);

		return { ...objectMerge(options, userOptions)!, headers, searchParams };
	}

	/**
	 * Merges user and request headers into the target Headers object.
	 * @param target The target Headers object.
	 * @param headerSources Variable number of header sources to merge.
	 * @returns The merged Headers object.
	 */
	private static mergeHeaders(target: Headers, ...headerSources: (RequestHeaders | undefined)[]): Headers {
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
				// Handle Record<string, string> format - use Object.keys() for better performance
				const record = headers as Record<string, string | undefined>;
				const keys = Object.keys(record);
				for (let i = 0; i < keys.length; i++) {
					const name = keys[i]!;
					const value = record[name];
					if (value !== undefined) { target.set(name, String(value)) }
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
	private static mergeSearchParams(target: URLSearchParams, ...sources: (SearchParameters | undefined)[]): URLSearchParams {
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
					if (value !== undefined) { target.set(name, String(value)) }
				}
			}
		}

		return target;
	}

	/**
	 * Processes request options by merging user, instance, and method-specific options.
	 * This method optimizes performance by using cached instance options and performing
	 * shallow merges where possible instead of deep object cloning.
	 * @param userOptions The user-provided options for the request.
	 * @param options Additional method-specific options.
	 * @returns Processed request options with signal controller and global flag.
	 */
	private processRequestOptions({ body: userBody, headers: userHeaders, searchParams: userSearchParams, ...userOptions }: RequestOptions, { headers, searchParams, ...options }: RequestOptions): RequestConfiguration {
		// Optimize: Use shallow merge for non-nested properties instead of deep objectMerge
		// The instance _options are already merged with defaults in the constructor
		const requestOptions = {
			// Spread instance options (already merged with defaults)
			...this._options,
			// Spread user options (shallow merge, sufficient for flat properties)
			...userOptions,
			// Spread method-specific options (e.g., method: 'POST')
			...options,
			// Deep merge required for headers and searchParams
			headers: Transportr.mergeHeaders(new Headers(), this._options.headers, userHeaders, headers),
			searchParams: Transportr.mergeSearchParams(new URLSearchParams(), this._options.searchParams, userSearchParams, searchParams)
		};

		if (isRequestBodyMethod(requestOptions.method)) {
			if (isRawBody(userBody)) {
				// Raw BodyInit — send as-is, delete Content-Type so the runtime sets it automatically
				requestOptions.body = userBody;
				requestOptions.headers.delete('content-type');
			} else {
				const isJson = requestOptions.headers.get('content-type')?.includes('json') ?? false;
				requestOptions.body = isJson && isObject(userBody) ? serialize(userBody) : userBody;
			}
		} else {
			requestOptions.headers.delete('content-type');
			if (requestOptions.body instanceof URLSearchParams) {
				Transportr.mergeSearchParams(requestOptions.searchParams, requestOptions.body);
			}
			requestOptions.body = undefined;
		}

		const { signal, timeout, global = false, xsrf } = requestOptions;

		// XSRF/CSRF protection: read token from cookie and set as request header
		if (xsrf) {
			const xsrfConfig: XsrfOptions = typeof xsrf === 'object' ? xsrf : {};
			const token = getCookieValue(xsrfConfig.cookieName ?? XSRF_COOKIE_NAME);
			if (token) { requestOptions.headers.set(xsrfConfig.headerName ?? XSRF_HEADER_NAME, token) }
		}

		const signalController = new SignalController({ signal, timeout })
			.onAbort((event) => this.publish({ name: RequestEvent.ABORTED, event, global }))
			.onTimeout((event) => this.publish({ name: RequestEvent.TIMEOUT, event, global }));

		requestOptions.signal = signalController.signal;
		this.publish({ name: RequestEvent.CONFIGURED, data: requestOptions, global });

		return { signalController, requestOptions, global } as RequestConfiguration;
	}

	/**
	 * Gets the base URL from a URL or string.
	 * @param url The URL or string to parse.
	 * @returns The base URL.
	 */
	private static getBaseUrl(url: URL | string): URL {
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
	private static getOrParseMediaType(contentType: string | null): MediaType | undefined {
		if (contentType === null) { return }

		// Check the predefined mediaTypes map first (fastest lookup) or the cache
		let mediaType = Transportr.mediaTypeCache.get(contentType);

		if (mediaType !== undefined) { return mediaType }

		// Parse and cache the new MediaType
		mediaType = MediaType.parse(contentType) ?? undefined;

		if (mediaType !== undefined) {
			// Evict oldest entries when cache exceeds limit to prevent unbounded growth
			if (Transportr.mediaTypeCache.size >= 100) {
				const oldestEntry = Transportr.mediaTypeCache.keys().next();

				if (!oldestEntry.done) {
					Transportr.mediaTypeCache.delete(oldestEntry.value);
				}
			}
			Transportr.mediaTypeCache.set(contentType, mediaType);
		}

		return mediaType;
	}

	/**
	 * Creates a new URL with the given path and search parameters.
	 * @param url The base URL.
	 * @param path The path to append to the base URL.
	 * @param searchParams The search parameters to append to the URL.
	 * @returns A new URL with the given path and search parameters.
	 */
	private static createUrl(url: URL, path?: string, searchParams?: SearchParameters): URL {
		const requestUrl = path ? new URL(`${url.pathname.replace(endsWithSlashRegEx, '')}${path}`, url.origin) : new URL(url);

		if (searchParams) {
			Transportr.mergeSearchParams(requestUrl.searchParams, searchParams);
		}

		return requestUrl;
	}

	/**
	 * It generates a ResponseStatus object from an error name and a Response object.
	 * @param errorName The name of the error.
	 * @param response The Response object.
	 * @returns A ResponseStatus object.
	 */
	private static generateResponseStatusFromError(errorName?: string, { status, statusText }: Response = new Response()): ResponseStatus {
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
	private async handleError(path?: string, response?: Response, { cause, entity, url, method, timing }: Omit<HttpErrorOptions, 'message'> = {}, requestOptions?: RequestOptions): Promise<HttpError> {
		const message = method && url	? `${method} ${url.href} failed${response ? ` with status ${response.status}` : ''}` : `An error has occurred with your request to: '${path}'`;
		let error = new HttpError(Transportr.generateResponseStatusFromError(cause?.name, response), { message, cause, entity, url, method, timing });

		// Run beforeError hooks: global → instance → per-request
		const beforeErrorHookSets = [ Transportr.globalHooks.beforeError, this.hooks.beforeError, requestOptions?.hooks?.beforeError ];
		for (const hooks of beforeErrorHookSets) {
			if (!hooks) { continue }
			for (const hook of hooks) {
				const result = await hook(error);
				if (result instanceof HttpError) { error = result }
			}
		}

		this.publish({ name: RequestEvent.ERROR, data: error });

		return error;
	}

	/**
	 * Publishes an event to the global and instance event handlers.
	 * @param eventObject The event object to publish.
	 */
	private publish({ name, event = new CustomEvent(name), data, global = true }: PublishOptions): void {
		if (global) { Transportr.globalSubscribr.publish(name, event, data) }
		this.subscribr.publish(name, event, data);
	}

	/**
	 * It returns a response handler based on the content type of the response.
	 * @param contentType The content type of the response.
	 * @returns A response handler function.
	 */
	private getResponseHandler<T extends ResponseBody>(contentType?: string | null): ResponseHandler<T> | undefined {
		if (!contentType) { return }

		const mediaType = Transportr.getOrParseMediaType(contentType);

		if (!mediaType) { return }

		for (const [ contentType, responseHandler ] of Transportr.contentTypeHandlers) {
			if (mediaType.matches(contentType)) { return responseHandler as ResponseHandler<T> }
		}

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
