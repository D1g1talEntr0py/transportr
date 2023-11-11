import Subscribr from '@d1g1tal/subscribr';
import AbortSignal from './abort-signal.js';
import HttpError from './http-error.js';
import HttpMediaType from './http-media-type.js';
import HttpRequestHeader from './http-request-headers.js';
import HttpRequestMethod from './http-request-methods.js';
import HttpResponseHeader from './http-response-headers.js';
import ParameterMap from './parameter-map.js';
import ResponseStatus from './response-status.js';
import MediaType from '@d1g1tal/media-type';
import { _objectMerge, _type } from '@d1g1tal/chrysalis';
import { RequestEvents, abortEvent, abortSignalProxyHandler, endsWithSlashRegEx, eventResponseStatuses, internalServerError, mediaTypes, requestBodyMethods } from './constants.js';

/**
 * @template T extends ResponseBody
 * @typedef {function(Response): Promise<T>} ResponseHandler<T>
 */

/**
 * @typedef {Object} ContextEventHandler
 * @property {*} context The context object.
 * @property {function(*): void} eventHandler The event handler.
 */

/**
 * @typedef {Object} EventRegistration
 * @property {string} eventName The name of the event to subscribe to.
 * @property {ContextEventHandler} contextEventHandler The context event handler.
 */

/** @typedef {Object.prototype.constructor} Type */
/** @typedef {Object<string, (boolean|string|number|Array)>} JsonObject */
/** @typedef {'configured'|'success'|'error'|'aborted'|'timeout'|'complete'} TransportrEvent */
/** @typedef {Blob|ArrayBuffer|TypedArray|DataView|FormData|URLSearchParams|string|ReadableStream} RequestBody */
/** @typedef {JsonObject|Document|DocumentFragment|Blob|ArrayBuffer|FormData|string|ReadableStream<Uint8Array>} ResponseBody */
/** @typedef {'default'|'force-cache'|'no-cache'|'no-store'|'only-if-cached'|'reload'} RequestCache */
/** @typedef {'include'|'omit'|'same-origin'} RequestCredentials */
/** @typedef {Headers|Object<string, string>} RequestHeaders */
/** @typedef {'GET'|'POST'|'PUT'|'PATCH'|'DELETE'|'HEAD'|'OPTIONS'} RequestMethod */
/** @typedef {'cors'|'navigate'|'no-cors'|'same-origin'} RequestMode */
/** @typedef {'error'|'follow'|'manual'} RequestRedirect */
/** @typedef {URLSearchParams|FormData|Object<string, string>|string} SearchParameters */
/** @typedef {''|'no-referrer'|'no-referrer-when-downgrade'|'origin'|'origin-when-cross-origin'|'same-origin'|'strict-origin'|'strict-origin-when-cross-origin'|'unsafe-url'} ReferrerPolicy */
/** @typedef {Int8Array|Uint8Array|Uint8ClampedArray|Int16Array|Uint16Array|Int32Array|Uint32Array|Float32Array|Float64Array|BigInt64Array|BigUint64Array} TypedArray */

/**
 * The options for a {@link Request} object or the second parameter of a {@link fetch} request
 *
 * @typedef {Object} RequestOptions
 * @property {RequestBody} body A RequestInit object or null to set request's body.
 * @property {RequestCache} cache A string indicating how the request will interact with the browser's cache to set request's cache.
 * @property {RequestCredentials} credentials A string indicating whether credentials will be sent with the request always, never, or only when sent to a same-origin URL. Sets request's credentials.
 * @property {RequestHeaders} headers A Headers object, an object literal, or an array of two-item arrays to set request's headers.
 * @property {SearchParameters} searchParams The parameters to be added to the URL for the request.
 * @property {string} integrity A cryptographic hash of the resource to be fetched by request. Sets request's integrity.
 * @property {boolean} keepalive A boolean to set request's keepalive.
 * @property {RequestMethod} method A string to set request's method.
 * @property {RequestMode} mode A string to indicate whether the request will use CORS, or will be restricted to same-origin URLs. Sets request's mode.
 * @property {RequestRedirect} redirect A string indicating whether request follows redirects, results in an error upon encountering a redirect, or returns the redirect (in an opaque fashion). Sets request's redirect.
 * @property {string} referrer A string whose value is a same-origin URL, "about:client", or the empty string, to set request's referrer.
 * @property {ReferrerPolicy} referrerPolicy A referrer policy to set request's referrerPolicy.
 * @property {AbortSignal} signal An AbortSignal to set request's signal.
 * @property {number} timeout A number representing a timeout in milliseconds for request.
 * @property {boolean} global If true, it will trigger the global event handlers. Defaults to true.
 * @property {null} window Can only be null. Used to disassociate request from any Window.
 */

/** @type {ResponseHandler<string>} */
const _handleText = async (response) => await response.text();

/** @type {ResponseHandler<void>} */
const _handleScript = async (response) => {
	const objectURL = URL.createObjectURL(await response.blob());

	document.head.removeChild(document.head.appendChild(Object.assign(document.createElement('script'), { src: objectURL, type: HttpMediaType.JAVA_SCRIPT, async: true })));

	URL.revokeObjectURL(objectURL);

	return Promise.resolve();
};

/** @type {ResponseHandler<void>} */
const _handleCss = async (response) => {
	const objectURL = URL.createObjectURL(await response.blob());

	document.head.appendChild(Object.assign(document.createElement('link'), { href: objectURL, type: HttpMediaType.CSS, rel: 'stylesheet' }));

	URL.revokeObjectURL(objectURL);

	return Promise.resolve();
};

/** @type {ResponseHandler<JsonObject>} */
const _handleJson = async (response) => await response.json();

/** @type {ResponseHandler<Blob>} */
const _handleBlob = async (response) => await response.blob();

/** @type {ResponseHandler<string>} */
const _handleImage = async (response) => URL.createObjectURL(await response.blob());

/** @type {ResponseHandler<ArrayBuffer>} */
const _handleBuffer = async (response) => await response.arrayBuffer();

/** @type {ResponseHandler<ReadableStream<Uint8Array>>} */
const _handleReadableStream = async (response) => response.body;

/** @type {ResponseHandler<Document>} */
const _handleXml = async (response) => new DOMParser().parseFromString(await response.text(), HttpMediaType.XML);

/** @type {ResponseHandler<Document>} */
const _handleHtml = async (response) => new DOMParser().parseFromString(await response.text(), HttpMediaType.HTML);

/** @type {ResponseHandler<DocumentFragment>} */
const _handleHtmlFragment = async (response) => document.createRange().createContextualFragment(await response.text());

/**
 * A wrapper around the fetch API that makes it easier to make HTTP requests.
 *
 * @module {Transportr} transportr
 * @author D1g1talEntr0py <jason.dimeo@gmail.com>
 */
export default class Transportr {
	/** @type {URL} */
	#baseUrl;
	/** @type {RequestOptions} */
	#options;
	/** @type {Subscribr} */
	#subscribr;
	/** @type {Subscribr} */
	static #globalSubscribr = new Subscribr();
	/** @type {Set<AbortSignal>} */
	static #activeRequests = new Set();
	/** @type {Map<ResponseHandler<ResponseBody>, string>} */
	static #contentTypeHandlers = new Map([
		[_handleImage, mediaTypes.get(HttpMediaType.PNG).type],
		[_handleText, mediaTypes.get(HttpMediaType.TEXT).type],
		[_handleJson, mediaTypes.get(HttpMediaType.JSON).subtype],
		[_handleHtml, mediaTypes.get(HttpMediaType.HTML).subtype],
		[_handleScript, mediaTypes.get(HttpMediaType.JAVA_SCRIPT).subtype],
		[_handleCss, mediaTypes.get(HttpMediaType.CSS).subtype],
		[_handleXml, mediaTypes.get(HttpMediaType.XML).subtype],
		[_handleReadableStream, mediaTypes.get(HttpMediaType.BIN).subtype]
	]);

	/**
	 * Create a new Transportr instance with the provided location or origin and context path.
	 *
	 * @param {URL|string|RequestOptions} [url=location.origin] The URL for {@link fetch} requests.
	 * @param {RequestOptions} [options={}] The default {@link RequestOptions} for this instance.
	 */
	constructor(url = globalThis.location.origin, options = {}) {
		if (_type(url) == Object) { [ url, options ] = [ globalThis.location.origin, url ] }

		this.#baseUrl = Transportr.#getBaseUrl(url);
		this.#options = Transportr.#createOptions(options, Transportr.#defaultRequestOptions);
		this.#subscribr = new Subscribr();
	}

	/**
	 * @static
	 * @constant {Object<string, HttpRequestMethod>}
	 */
	static Method = Object.freeze(HttpRequestMethod);

	/**
	 * @static
	 * @constant {Object<string, HttpMediaType>}
	 */
	static MediaType = Object.freeze(HttpMediaType);

	/**
	 * @static
	 * @see {@link HttpRequestHeader}
	 * @constant {Object<string, HttpRequestHeader>}
	 */
	static RequestHeader = Object.freeze(HttpRequestHeader);

	/**
	 * @static
	 * @constant {Object<string, HttpResponseHeader>}
	 */
	static ResponseHeader = Object.freeze(HttpResponseHeader);

	/**
	 * @static
	 * @constant {Object<string, RequestCache>}
	 */
	static CachingPolicy = Object.freeze({
		DEFAULT: 'default',
		FORCE_CACHE: 'force-cache',
		NO_CACHE: 'no-cache',
		NO_STORE: 'no-store',
		ONLY_IF_CACHED: 'only-if-cached',
		RELOAD: 'reload'
	});

	/**
	 * @static
	 * @constant {Object<string, RequestCredentials>}
	 */
	static CredentialsPolicy = Object.freeze({
		INCLUDE: 'include',
		OMIT: 'omit',
		SAME_ORIGIN: 'same-origin'
	});

	/**
	 * @static
	 * @constant {Object<string, RequestMode>}
	 */
	static RequestMode = Object.freeze({
		CORS: 'cors',
		NAVIGATE: 'navigate',
		NO_CORS: 'no-cors',
		SAME_ORIGIN: 'same-origin'
	});

	/**
	 * @static
	 * @constant {Object<string, RequestRedirect>}
	 */
	static RedirectPolicy = Object.freeze({
		ERROR: 'error',
		FOLLOW: 'follow',
		MANUAL: 'manual'
	});

	/**
	 * @static
	 * @constant {Object<string, ReferrerPolicy>}
	 */
	static ReferrerPolicy = Object.freeze({
		NO_REFERRER: 'no-referrer',
		NO_REFERRER_WHEN_DOWNGRADE: 'no-referrer-when-downgrade',
		ORIGIN: 'origin',
		ORIGIN_WHEN_CROSS_ORIGIN: 'origin-when-cross-origin',
		SAME_ORIGIN: 'same-origin',
		STRICT_ORIGIN: 'strict-origin',
		STRICT_ORIGIN_WHEN_CROSS_ORIGIN: 'strict-origin-when-cross-origin',
		UNSAFE_URL: 'unsafe-url'
	});

	/**
	 * @static
	 * @constant {Object<string, TransportrEvent>}
	 */
	static Events = RequestEvents;

	/**
	 * @private
	 * @static
	 * @type {RequestOptions}
	 */
	static #defaultRequestOptions = Object.freeze({
		body: null,
		cache: Transportr.CachingPolicy.NO_STORE,
		credentials: Transportr.CredentialsPolicy.SAME_ORIGIN,
		headers: { [HttpRequestHeader.CONTENT_TYPE]: `${mediaTypes.get(HttpMediaType.JSON)}`, [HttpRequestHeader.ACCEPT]: `${mediaTypes.get(HttpMediaType.JSON)}` },
		searchParams: {},
		integrity: undefined,
		keepalive: undefined,
		method: HttpRequestMethod.GET,
		mode: Transportr.RequestMode.CORS,
		redirect: Transportr.RedirectPolicy.FOLLOW,
		referrer: 'about:client',
		referrerPolicy: Transportr.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
		signal: undefined,
		timeout: 30000,
		global: true,
		window: null
	});

	/**
	 * Returns a {@link EventRegistration} used for subscribing to global events.
	 *
	 * @static
	 * @param {TransportrEvent} event The event to subscribe to.
	 * @param {function(Event, *): void} handler The event handler.
	 * @param {*} context The context to bind the handler to.
	 * @returns {EventRegistration} A new {@link EventRegistration} instance.
	 */
	static register(event, handler, context) {
		return Transportr.#globalSubscribr.subscribe(event, handler, context);
	}

	/**
	 * Removes a {@link EventRegistration} from the global event handler.
	 *
	 * @static
	 * @param {EventRegistration} eventRegistration The {@link EventRegistration} to remove.
	 * @returns {boolean} True if the {@link EventRegistration} was removed, false otherwise.
	 */
	static unregister(eventRegistration) {
		return Transportr.#globalSubscribr.unsubscribe(eventRegistration);
	}

	/**
	 * Aborts all active requests.
	 * This is useful for when the user navigates away from the current page.
	 * This will also clear the {@link Transportr#activeRequests} set.
	 *
	 * @static
	 * @returns {void}
	 */
	static abortAll() {
		for (const abortSignal of this.#activeRequests) {
			abortSignal.abort(abortEvent);
		}

		// Clear the array after aborting all requests
		this.#activeRequests.clear();
	}

	/**
	 * It returns the base {@link URL} for the API.
	 *
	 * @returns {URL} The baseUrl property.
	 */
	get baseUrl() {
		return this.#baseUrl;
	}

	/**
	 * Registers an event handler with a {@link Transportr} instance.
	 *
	 * @param {TransportrEvent} event The name of the event to listen for.
	 * @param {function(Event, *): void} handler The function to call when the event is triggered.
	 * @param {*} [context] The context to bind to the handler.
	 * @returns {EventRegistration} An object that can be used to remove the event handler.
	 */
	register(event, handler, context) {
		return this.#subscribr.subscribe(event, handler, context);
	}

	/**
	 * Unregisters an event handler from a {@link Transportr} instance.
	 *
	 * @param {EventRegistration} eventRegistration The event registration to remove.
	 * @returns {void}
	 */
	unregister(eventRegistration) {
		this.#subscribr.unsubscribe(eventRegistration);
	}

	/**
	 * This function returns a promise that resolves to the result of a request to the specified path with
	 * the specified options, where the method is GET.
	 *
	 * @async
	 * @param {string} [path] The path to the resource you want to get.
	 * @param {RequestOptions} [options] The options for the request.
	 * @returns {Promise<ResponseBody>} A promise that resolves to the response of the request.
	 */
	async get(path, options) {
		return this.#get(path, options);
	}

	/**
	 * This function makes a POST request to the given path with the given body and options.
	 *
	 * @async
	 * @param {string} [path] The path to the endpoint you want to call.
	 * @param {RequestBody} body The body of the request.
	 * @param {RequestOptions} [options] The options for the request.
	 * @returns {Promise<ResponseBody>} A promise that resolves to the response body.
	 */
	async post(path, body = {}, options = {}) {
		if (_type(path) != String) { [ path, body, options ] = [ undefined, path, body ] }

		return this.#request(path, Object.assign(options, { body }), { method: HttpRequestMethod.POST });
	}

	/**
	 * This function returns a promise that resolves to the result of a request to the specified path with
	 * the specified options, where the method is PUT.
	 *
	 * @async
	 * @param {string} [path] The path to the endpoint you want to call.
	 * @param {RequestOptions} [options] The options for the request.
	 * @returns {Promise<ResponseBody>} The return value of the #request method.
	 */
	async put(path, options) {
		return this.#request(path, options, { method: HttpRequestMethod.PUT });
	}

	/**
	 * It takes a path and options, and returns a request with the method set to PATCH.
	 *
	 * @async
	 * @param {string} [path] The path to the endpoint you want to hit.
	 * @param {RequestOptions} [options] The options for the request.
	 * @returns {Promise<ResponseBody>} A promise that resolves to the response of the request.
	 */
	async patch(path, options) {
		return this.#request(path, options, { method: HttpRequestMethod.PATCH });
	}

	/**
	 * It takes a path and options, and returns a request with the method set to DELETE.
	 *
	 * @async
	 * @param {string} [path] The path to the resource you want to access.
	 * @param {RequestOptions} [options] The options for the request.
	 * @returns {Promise<ResponseBody>} The result of the request.
	 */
	async delete(path, options) {
		return this.#request(path, options, { method: HttpRequestMethod.DELETE });
	}

	/**
	 * Returns the response headers of a request to the given path.
	 *
	 * @async
	 * @param {string} [path] The path to the resource you want to access.
	 * @param {RequestOptions} [options] The options for the request.
	 * @returns {Promise<ResponseBody>} A promise that resolves to the response object.
	 */
	async head(path, options) {
		return this.#request(path, options, { method: HttpRequestMethod.HEAD });
	}

	/**
	 * It returns a promise that resolves to the allowed request methods for the given resource path.
	 *
	 * @async
	 * @param {string} [path] The path to the resource.
	 * @param {RequestOptions} [options] The options for the request.
	 * @returns {Promise<string[]>} A promise that resolves to an array of allowed request methods for this resource.
	 */
	async options(path, options) {
		const response = await this.#request(path, options, { method: HttpRequestMethod.OPTIONS });

		return response.headers.get('allow').split(',').map((method) => method.trim());
	}

	/**
	 * It takes a path and options, and makes a request to the server.
	 *
	 * @async
	 * @param {string} [path] The path to the endpoint you want to hit.
	 * @param {RequestOptions} [userOptions] The options for the request.
	 * @returns {Promise<ResponseBody>} The return value of the function is the return value of the function that is passed to the `then` method of the promise returned by the `fetch` method.
	 */
	async request(path, userOptions) {
		return this.#request(path, userOptions, {}, (response) => response);
	}

	/**
	 * It gets a JSON resource from the server.
	 *
	 * @async
	 * @param {string} [path] The path to the resource.
	 * @param {RequestOptions} [options] The options object to pass to the request.
	 * @returns {Promise<JsonObject>} A promise that resolves to the response body as a JSON object.
	 */
	async getJson(path, options) {
		return this.#get(path, options, { headers: { [HttpRequestHeader.ACCEPT]: `${mediaTypes.get(HttpMediaType.JSON)}` } }, _handleJson);
	}

	/**
	 * It gets the XML representation of the resource at the given path.
	 *
	 * @async
	 * @param {string} [path] The path to the resource you want to get.
	 * @param {RequestOptions} [options] The options for the request.
	 * @returns {Promise<Document>} The result of the function call to #get.
	 */
	async getXml(path, options) {
		return this.#get(path, options, { headers: { [HttpRequestHeader.ACCEPT]: `${mediaTypes.get(HttpMediaType.XML)}` } }, _handleXml);
	}

	/**
	 * Get the HTML content of the specified path.
	 *
	 * @todo Add way to return portion of the retrieved HTML using a selector. Like jQuery.
	 * @async
	 * @param {string} [path] The path to the resource.
	 * @param {RequestOptions} [options] The options for the request.
	 * @returns {Promise<Document>} The return value of the function is the return value of the function passed to the `then`
	 * method of the promise returned by the `#get` method.
	 */
	async getHtml(path, options) {
		return this.#get(path, options, { headers: { [HttpRequestHeader.ACCEPT]: `${mediaTypes.get(HttpMediaType.HTML)}` } }, _handleHtml);
	}

	/**
	 * It returns a promise that resolves to the HTML fragment at the given path.
	 *
	 * @todo Add way to return portion of the retrieved HTML using a selector. Like jQuery.
	 * @async
	 * @param {string} [path] The path to the resource.
	 * @param {RequestOptions} [options] The options for the request.
	 * @returns {Promise<DocumentFragment>} A promise that resolves to an HTML fragment.
	 */
	async getHtmlFragment(path, options) {
		return this.#get(path, options, { headers: { [HttpRequestHeader.ACCEPT]: `${mediaTypes.get(HttpMediaType.HTML)}` } }, _handleHtmlFragment);
	}

	/**
	 * It gets a script from the server, and appends the script to the {@link Document} {@link HTMLHeadElement}
	 * CORS is enabled by default.
	 *
	 * @async
	 * @param {string} [path] The path to the script.
	 * @param {RequestOptions} [options] The options for the request.
	 * @returns {Promise<void>} A promise that has been resolved.
	 */
	async getScript(path, options) {
		return this.#get(path, options, { headers: { [HttpRequestHeader.ACCEPT]: `${mediaTypes.get(HttpMediaType.JAVA_SCRIPT)}` } }, _handleScript);
	}

	/**
	 * Gets a stylesheet from the server, and adds it as a {@link Blob} {@link URL}.
	 *
	 * @async
	 * @param {string} [path] The path to the stylesheet.
	 * @param {RequestOptions} [options] The options for the request.
	 * @returns {Promise<void>} A promise that has been resolved.
	 */
	async getStylesheet(path, options) {
		return this.#get(path, options, { headers: { [HttpRequestHeader.ACCEPT]: `${mediaTypes.get(HttpMediaType.CSS)}` } }, _handleCss);
	}

	/**
	 * It returns a blob from the specified path.
	 *
	 * @async
	 * @param {string} [path] The path to the resource.
	 * @param {RequestOptions} [options] The options for the request.
	 * @returns {Promise<Blob>} A promise that resolves to a blob.
	 */
	async getBlob(path, options) {
		return this.#get(path, options, { headers: { [HttpRequestHeader.ACCEPT]: HttpMediaType.BIN } }, _handleBlob);
	}

	/**
	 * It returns a promise that resolves to an object URL.
	 *
	 * @async
	 * @param {string|RequestOptions} [path] The path to the resource.
	 * @param {RequestOptions} [options] The options for the request.
	 * @returns {Promise<string>} A promise that resolves to an object URL.
	 */
	async getImage(path, options) {
		return this.#get(path, options, { headers: { [HttpRequestHeader.ACCEPT]: 'image/*' } }, _handleImage);
	}

	/**
	 * It gets a buffer from the specified path
	 *
	 * @async
	 * @param {string} [path] The path to the resource.
	 * @param {RequestOptions} [options] The options for the request.
	 * @returns {Promise<ArrayBuffer>} A promise that resolves to a buffer.
	 */
	async getBuffer(path, options) {
		return this.#get(path, options, { headers: { [HttpRequestHeader.ACCEPT]: HttpMediaType.BIN } }, _handleBuffer);
	}

	/**
	 * It returns a readable stream of the response body from the specified path.
	 *
	 * @async
	 * @param {string} [path] The path to the resource.
	 * @param {RequestOptions} [options] The options for the request.
	 * @returns {Promise<ReadableStream<Uint8Array>>} A readable stream.
	 */
	async getStream(path, options) {
		return this.#get(path, options, { headers: { [HttpRequestHeader.ACCEPT]: HttpMediaType.BIN } }, _handleReadableStream);
	}

	/**
	 * Makes a GET request to the given path, using the given options, and then calls the
	 * given response handler with the response.
	 *
	 * @private
	 * @async
	 * @param {string} [path] The path to the endpoint you want to call.
	 * @param {RequestOptions} [userOptions] The options passed to the public function to use for the request.
	 * @param {RequestOptions} [options={}] The options for the request.
	 * @param {ResponseHandler<ResponseBody>} [responseHandler] A function that will be called with the response object.
	 * @returns {Promise<ResponseBody>} The result of the #request method.
	 */
	async #get(path, userOptions, options = {}, responseHandler) {
		return this.#request(path, userOptions, Object.assign(options, { method: HttpRequestMethod.GET }), responseHandler);
	}

	/**
	 * It takes a path, options, and a response handler, and returns a promise that resolves to the
	 * response entity.
	 *
	 * @private
	 * @async
	 * @param {string} [path] The path to the resource you want to access.
	 * @param {RequestOptions} [userOptions={}] The options passed to the public function to use for the request.
	 * @param {RequestOptions} [options={}] The options to use for the request.
	 * @param {ResponseHandler<ResponseBody>} [responseHandler] A function that will be called with the response body as a parameter. This
	 * is useful if you want to do something with the response body before returning it.
	 * @returns {Promise<ResponseBody>} The response from the API call.
	 */
	async #request(path, userOptions = {}, options = {}, responseHandler) {
		if (_type(path) == Object) { [ path, userOptions ] = [ undefined, path ] }

		options = this.#processRequestOptions(userOptions, options);

		let response;
		const url = Transportr.#createUrl(this.#baseUrl, path, options.searchParams);
		try {
			Transportr.#activeRequests.add(options.signal);
			// Proxy the options and trap for the `signal` to be accessed to start the timeout timer
			response = await fetch(url, new Proxy(options, abortSignalProxyHandler));

			if (!responseHandler && response.status != 204) {
				responseHandler = this.#getResponseHandler(response.headers.get(HttpResponseHeader.CONTENT_TYPE));
			}

			const result = await responseHandler?.(response) ?? response;

			if (!response.ok) {
				return Promise.reject(this.#handleError(url, { status: Transportr.#generateResponseStatusFromError('ResponseError', response), entity: result }));
			}

			this.#publish({ name: RequestEvents.SUCCESS, data: result, global: options.global });

			return result;
		} catch (cause) {
			return Promise.reject(this.#handleError(url, { cause, status: Transportr.#generateResponseStatusFromError(cause.name, response) }));
		} finally {
			options.signal.clearTimeout();
			if (!options.signal.aborted) {
				this.#publish({ name: RequestEvents.COMPLETE, data: response, global: options.global });

				Transportr.#activeRequests.delete(options.signal);

				if (Transportr.#activeRequests.size == 0) {
					this.#publish({ name: RequestEvents.ALL_COMPLETE, global: options.global });
				}
			}
		}
	}

	/**
	 * Creates the options for a {@link Transportr} instance.
	 *
	 * @private
	 * @static
	 * @param {RequestOptions} userOptions The {@link RequestOptions} to convert.
	 * @param {RequestOptions} options The default {@link RequestOptions}.
	 * @returns {RequestOptions} The converted {@link RequestOptions}.
	 */
	static #createOptions({ body, headers: userHeaders, searchParams: userSearchParams, ...userOptions }, { headers, searchParams, ...options }) {
		return _objectMerge(options, userOptions, {
			body: [FormData, URLSearchParams, Object].includes(_type(body)) ? new ParameterMap(body) : body,
			headers: Transportr.#mergeOptions(new Headers(), userHeaders, headers),
			searchParams: Transportr.#mergeOptions(new URLSearchParams(), userSearchParams, searchParams)
		});
	}

	/**
	 * Merge the user options and request options into the target.
	 *
	 * @private
	 * @static
	 * @param {Headers|URLSearchParams|FormData} target The target to merge the options into.
	 * @param {Headers|URLSearchParams|FormData|Object} userOption The user options to merge into the target.
	 * @param {Headers|URLSearchParams|FormData|Object} requestOption The request options to merge into the target.
	 * @returns {Headers|URLSearchParams} The target.
	 */
	static #mergeOptions(target, userOption = {}, requestOption = {}) {
		for (const option of [userOption, requestOption]) {
			for (const [name, value] of option.entries?.() ?? Object.entries(option)) {	target.set(name, value) }
		}

		return target;
	}

	/**
	 * Merges the user options and request options with the instance options into a new object that is used for the request.
	 *
	 * @private
	 * @param {RequestOptions} userOptions The user options to merge into the request options.
	 * @param {RequestOptions} options The request options to merge into the user options.
	 * @returns {RequestOptions} The merged options.
	 */
	#processRequestOptions({ body: userBody, headers: userHeaders, searchParams: userSearchParams, ...userOptions }, { headers, searchParams, ...options }) {
		const requestOptions = _objectMerge(this.#options, userOptions, options, {
			headers: Transportr.#mergeOptions(new Headers(this.#options.headers), userHeaders, headers),
			searchParams: Transportr.#mergeOptions(new URLSearchParams(this.#options.searchParams), userSearchParams, searchParams)
		});

		if (requestBodyMethods.includes(requestOptions.method)) {
			if ([ParameterMap, FormData, URLSearchParams, Object].includes(_type(userBody))) {
				const contentType = requestOptions.headers.get(HttpRequestHeader.CONTENT_TYPE);
				const mediaType = (mediaTypes.get(contentType) ?? MediaType.parse(contentType))?.subtype;
				if (mediaType == HttpMediaType.MULTIPART_FORM_DATA) {
					requestOptions.body = Transportr.#mergeOptions(new FormData(requestOptions.body), userBody);
				} else if (mediaType == HttpMediaType.FORM) {
					requestOptions.body = Transportr.#mergeOptions(new URLSearchParams(requestOptions.body), userBody);
				} else if (mediaType.includes('json')) {
					requestOptions.body = JSON.stringify(Transportr.#mergeOptions(new ParameterMap(requestOptions.body), userBody));
				} else {
					requestOptions.body = Transportr.#mergeOptions(new ParameterMap(requestOptions.body), userBody);
				}
			} else {
				requestOptions.body = userBody;
			}
		} else {
			requestOptions.headers.delete(HttpRequestHeader.CONTENT_TYPE);
			if (requestOptions.body) {
				Transportr.#mergeOptions(requestOptions.searchParams, requestOptions.body);
			}
			requestOptions.body = undefined;
		}

		requestOptions.signal = new AbortSignal(requestOptions.signal)
			.onAbort((event) => this.#publish({ name: RequestEvents.ABORTED, event, global: requestOptions.global }))
			.onTimeout((event) => this.#publish({ name: RequestEvents.TIMEOUT, event, global: requestOptions.global }));

		this.#publish({ name: RequestEvents.CONFIGURED, data: requestOptions, global: requestOptions.global });

		return requestOptions;
	}

	/**
	 * It takes a url or a string, and returns a {@link URL} instance.
	 * If the url is a string and starts with a slash, then the origin of the current page is used as the base url.
	 *
	 * @private
	 * @static
	 * @param {URL|string} url The URL to convert to a {@link URL} instance.
	 * @returns {URL} A {@link URL} instance.
	 * @throws {TypeError} If the url is not a string or {@link URL} instance.
	 */
	static #getBaseUrl(url) {
		switch (_type(url)) {
			case URL: return url;
			case String: return new URL(url, url.startsWith('/') ? globalThis.location.origin : undefined);
			default: throw new TypeError('Invalid URL');
		}
	}

	/**
	 * It takes a URL, a path, and a set of search parameters, and returns a new URL with the path and
	 * search parameters applied.
	 *
	 * @private
	 * @static
	 * @param {URL} url The URL to use as a base.
	 * @param {string} [path] The optional, relative path to the resource. This MUST be a relative path, otherwise, you should create a new {@link Transportr} instance.
	 * @param {URLSearchParams} [searchParams] The optional search parameters to append to the URL.
	 * @returns {URL} A new URL object with the pathname and origin of the url parameter, and the path parameter appended to the end of the pathname.
	 */
	static #createUrl(url, path, searchParams) {
		const requestUrl = path ? new URL(`${url.pathname.replace(endsWithSlashRegEx, '')}${path}`, url.origin) : new URL(url);

		searchParams?.forEach((value, name) => requestUrl.searchParams.append(name, value));

		return requestUrl;
	}

	/**
	 * Generates a ResponseStatus object based on the error name and the response.
	 *
	 * @private
	 * @static
	 * @param {string} errorName The name of the error.
	 * @param {Response} response The response object returned by the fetch API.
	 * @returns {ResponseStatus} The response status object.
	 */
	static #generateResponseStatusFromError(errorName, response) {
		switch (errorName) {
			case 'AbortError': return eventResponseStatuses[RequestEvents.ABORTED];
			case 'TimeoutError': return eventResponseStatuses[RequestEvents.TIMEOUT];
			default: return response ? new ResponseStatus(response.status, response.statusText) : internalServerError;
		}
	}

	/**
	 * Handles an error by logging it and throwing it.
	 *
	 * @private
	 * @param {URL} url The path to the resource you want to access.
	 * @param {import('./http-error.js').HttpErrorOptions} options The options for the HttpError.
	 * @returns {HttpError} The HttpError.
	 */
	#handleError(url, options) {
		const error = new HttpError(`An error has occurred with your request to: '${url}'`, options);
		this.#publish({ name: RequestEvents.ERROR, data: error });

		return error;
	}

	/**
	 * Publishes an event to the global and instance subscribers.
	 *
	 * @private
	 * @param {Object} options The options for the event.
	 * @param {string} options.name The name of the event.
	 * @param {Event} [options.event] The event object.
	 * @param {*} [options.data] The data to pass to the subscribers.
	 * @param {boolean} [options.global=true] Whether or not to publish the event to the global subscribers.
	 * @returns {void}
	 */
	#publish({ name, event = new CustomEvent(name), data, global = true } = {}) {
		if (global) {	Transportr.#globalSubscribr.publish(name, event, data) }
		this.#subscribr.publish(name, event, data);
	}

	/**
	 * Returns a response handler for the given content type.
	 *
	 * @private
	 * @param {string} contentType The content type of the response.
	 * @returns {ResponseHandler<ResponseBody>} The response handler.
	 */
	#getResponseHandler(contentType) {
		const mediaType = MediaType.parse(contentType);

		if (mediaType) {
			for (const [responseHandler, contentType] of Transportr.#contentTypeHandlers) {
				if (mediaType.matches(contentType)) {	return responseHandler }
			}
		}

		return undefined;
	}

	/**
	 * A String value that is used in the creation of the default string
	 * description of an object. Called by the built-in method {@link Object.prototype.toString}.
	 *
	 * @returns {string} The default string description of this object.
	 */
	get [Symbol.toStringTag]() {
		return 'Transportr';
	}
}