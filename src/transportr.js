import { _objectIsEmpty, _objectMerge, _type } from '@d1g1tal/chrysalis';
import SetMultiMap from '@d1g1tal/collections/set-multi-map.js';
import { MediaType } from '@d1g1tal/media-type';
import Subscribr from '@d1g1tal/subscribr';
import HttpError from './http-error.js';
import HttpMediaType from './http-media-type.js';
import HttpRequestHeader from './http-request-headers.js';
import HttpRequestMethod from './http-request-methods.js';
import HttpResponseHeader from './http-response-headers.js';
import ResponseStatus from './response-status.js';
import SignalController from './signal-controller.js';

/**
 * @template T extends ResponseBody
 * @typedef {function(Response): Promise<T>} ResponseHandler<T>
 */

/**
 * @template T
 * @typedef {function(T): Object<string, *>} TypeConverter<T>
 */

/**
 * @typedef {Object} PropertyTypeConverter
 * @property {string} property The name of the property on the {@link RequestOptions} object.
 * @property {Type} type The type of the property on the {@link RequestOptions} object.
 * @property {TypeConverter<FormData|URLSearchParams|Headers>} converter A function that converts the property on the {@link RequestOptions} object to the type T.
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

/** @type {RegExp} */
const endsWithSlashRegEx = /\/$/;
/** @type {string} */
const charset = 'utf-8';

const _mediaTypes = new Map([
	[HttpMediaType.PNG, new MediaType(HttpMediaType.PNG)],
	[HttpMediaType.TEXT, new MediaType(HttpMediaType.TEXT, { charset })],
	[HttpMediaType.JSON, new MediaType(HttpMediaType.JSON, { charset })],
	[HttpMediaType.HTML, new MediaType(HttpMediaType.HTML, { charset })],
	[HttpMediaType.JAVA_SCRIPT, new MediaType(HttpMediaType.JAVA_SCRIPT, { charset })],
	[HttpMediaType.CSS, new MediaType(HttpMediaType.CSS, { charset })],
	[HttpMediaType.XML, new MediaType(HttpMediaType.XML, { charset })],
	[HttpMediaType.BIN, new MediaType(HttpMediaType.BIN)]
]);

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

/** @type {TypeConverter<FormData|URLSearchParams>} */
const _typeConverter = (data) => Object.fromEntries(Array.from(data.keys()).map((key, index, keys, value = data.getAll(key)) => [key, value.length > 1 ? value : value[0]]));

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
	/** @type {Array<SignalController>} */
	static #activeRequests = [];
	/**
	 * @private
	 * @static
	 * @type {SetMultiMap<ResponseHandler<ResponseBody>, string>}
	 */
	static #contentTypeHandlers = new SetMultiMap([
		[_handleImage, _mediaTypes.get(HttpMediaType.PNG).type],
		[_handleText, _mediaTypes.get(HttpMediaType.TEXT).type],
		[_handleJson, _mediaTypes.get(HttpMediaType.JSON).subtype],
		[_handleHtml, _mediaTypes.get(HttpMediaType.HTML).subtype],
		[_handleScript, _mediaTypes.get(HttpMediaType.JAVA_SCRIPT).subtype],
		[_handleCss, _mediaTypes.get(HttpMediaType.CSS).subtype],
		[_handleXml, _mediaTypes.get(HttpMediaType.XML).subtype],
		[_handleReadableStream, _mediaTypes.get(HttpMediaType.BIN).subtype]
	]);
	/**
	 * @private
	 * @static
	 * @type {Set<PropertyTypeConverter>}
	 */
	static #propertyTypeConverters = new Set([
		[{ property: 'body', type: FormData, converter: _typeConverter }],
		[{ property: 'searchParams', type: URLSearchParams, converter: _typeConverter }],
		[{ property: 'headers', type: Headers, converter: Object.fromEntries }]
	]);

	/**
	 * Create a new Transportr instance with the provided location or origin and context path.
	 *
	 * @param {URL|string|RequestOptions} [url=location.origin] The URL for {@link fetch} requests.
	 * @param {RequestOptions} [options={}] The default {@link RequestOptions} for this instance.
	 */
	constructor(url = location.origin, options = {}) {
		const type = _type(url);
		if (type == Object) {
			options = url;
			url = location.origin;
		} else if (type != URL) {
			url = url.startsWith('/') ? new URL(url, location.origin) : new URL(url);
		}

		this.#baseUrl = url;
		// Merge the default options with the provided options.
		this.#options = _objectMerge(Transportr.#defaultRequestOptions, Transportr.#convertRequestOptions(options));
		this.#subscribr = new Subscribr();
	}

	/**
	 * Returns a {@link SignalController} used for aborting requests.
	 *
	 * @static
	 * @param {AbortSignal} [signal] The optional {@link AbortSignal} to used for chaining.
	 * @returns {SignalController} A new {@link SignalController} instance.
	 */
	static signalController(signal) {
		return new SignalController(signal);
	}

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
	 * This will also clear the {@link Transportr#activeRequests} array.
	 * This is called automatically when the {@link Transportr#abort} method is called.
	 *
	 * @static
	 * @returns {void}
	 */
	static abortAll() {
		for (const signalController of this.#activeRequests) {
			signalController.abort();
		}

		// Clear the array after aborting all requests
		this.#activeRequests = [];
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
	static Events = Object.freeze({
		CONFIGURED: 'configured',
		SUCCESS: 'success',
		ERROR: 'error',
		ABORTED: 'aborted',
		TIMEOUT: 'timeout',
		COMPLETE: 'complete',
		ALL_COMPLETE: 'all-complete'
	});

	/**
	 * @private
	 * @static
	 * @type {RequestOptions}
	 */
	static #defaultRequestOptions = Object.freeze({
		body: null,
		cache: Transportr.CachingPolicy.NO_STORE,
		credentials: Transportr.CredentialsPolicy.SAME_ORIGIN,
		headers: { [HttpRequestHeader.CONTENT_TYPE]: _mediaTypes.get(HttpMediaType.JSON).toString(), [HttpRequestHeader.ACCEPT]: _mediaTypes.get(HttpMediaType.JSON).toString() },
		searchParams: {},
		integrity: undefined,
		keepalive: undefined,
		method: HttpRequestMethod.GET,
		mode: Transportr.RequestMode.CORS,
		redirect: Transportr.RedirectPolicy.FOLLOW,
		referrer: 'about:client',
		referrerPolicy: Transportr.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
		signal: undefined,
		timeout: 10000,
		global: true,
		window: null
	});

	/**
	 * @private
	 * @static
	 * @type {Map<TransportrEvent, ResponseStatus>}
	 */
	static #eventResponseStatuses = new Map([
		[Transportr.Events.ABORTED, new ResponseStatus(499, 'Aborted')],
		[Transportr.Events.TIMEOUT, new ResponseStatus(504, 'Gateway Timeout')]
	]);

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
	 * @param {string} path - The path to the resource you want to get.
	 * @param {RequestOptions} [options] - The options for the request.
	 * @returns {Promise<ResponseBody>} A promise that resolves to the response of the request.
	 */
	async get(path, options) {
		return this.#get(path, options);
	}

	/**
	 * This function makes a POST request to the given path with the given body and options.
	 *
	 * @async
	 * @param {string} path - The path to the endpoint you want to call.
	 * @param {RequestBody} body - The body of the request.
	 * @param {RequestOptions} [options] - The options for the request.
	 * @returns {Promise<ResponseBody>} A promise that resolves to the response body.
	 */
	async post(path, body, options) {
		return this.#request(path, { ...options, body }, { method: HttpRequestMethod.POST });
	}

	/**
	 * This function returns a promise that resolves to the result of a request to the specified path with
	 * the specified options, where the method is PUT.
	 *
	 * @async
	 * @param {string} path - The path to the endpoint you want to call.
	 * @param {RequestOptions} [options] - The options for the request.
	 * @returns {Promise<ResponseBody>} The return value of the #request method.
	 */
	async put(path, options) {
		return this.#request(path, options, { method: HttpRequestMethod.PUT });
	}

	/**
	 * It takes a path and options, and returns a request with the method set to PATCH.
	 *
	 * @async
	 * @param {string} path - The path to the endpoint you want to hit.
	 * @param {RequestOptions} [options] - The options for the request.
	 * @returns {Promise<ResponseBody>} A promise that resolves to the response of the request.
	 */
	async patch(path, options) {
		return this.#request(path, options, { method: HttpRequestMethod.PATCH });
	}

	/**
	 * It takes a path and options, and returns a request with the method set to DELETE.
	 *
	 * @async
	 * @param {string} path - The path to the resource you want to access.
	 * @param {RequestOptions} [options] - The options for the request.
	 * @returns {Promise<ResponseBody>} The result of the request.
	 */
	async delete(path, options) {
		return this.#request(path, options, { method: HttpRequestMethod.DELETE });
	}

	/**
	 * Returns the response headers of a request to the given path.
	 *
	 * @async
	 * @param {string} path - The path to the resource you want to access.
	 * @param {RequestOptions} [options] - The options for the request.
	 * @returns {Promise<ResponseBody>} A promise that resolves to the response object.
	 */
	async head(path, options) {
		return this.#request(path, options, { method: HttpRequestMethod.HEAD });
	}

	/**
	 * It takes a path and options, and returns a request with the method set to OPTIONS.
	 *
	 * @async
	 * @param {string} path - The path to the resource.
	 * @param {RequestOptions} [options] - The options for the request.
	 * @returns {Promise<ResponseBody>} The return value of the #request method.
	 */
	async options(path, options) {
		return this.#request(path, options, { method: HttpRequestMethod.OPTIONS });
	}

	/**
	 * It takes a path and options, and makes a request to the server.
	 *
	 * @async
	 * @param {string} path - The path to the endpoint you want to hit.
	 * @param {RequestOptions} [options] - The options for the request.
	 * @returns {Promise<ResponseBody>} The return value of the function is the return value of the function that is passed to the `then` method of the promise returned by the `fetch` method.
	 */
	async request(path, options) {
		return this.#request(path, options);
	}

	/**
	 * It gets a JSON resource from the server.
	 *
	 * @async
	 * @param {string} path - The path to the resource.
	 * @param {RequestOptions} [options] - The options object to pass to the request.
	 * @returns {Promise<JsonObject>} A promise that resolves to the response body as a JSON object.
	 */
	async getJson(path, options) {
		return this.#get(path, options, { headers: { [HttpRequestHeader.ACCEPT]: _mediaTypes.get(HttpMediaType.JSON).toString() } }, _handleJson);
	}

	/**
	 * It gets the XML representation of the resource at the given path.
	 *
	 * @async
	 * @param {string} path - The path to the resource you want to get.
	 * @param {RequestOptions} [options] - The options for the request.
	 * @returns {Promise<Document>} The result of the function call to #get.
	 */
	async getXml(path, options) {
		return this.#get(path, options, { headers: { [HttpRequestHeader.ACCEPT]: _mediaTypes.get(HttpMediaType.XML).toString() } }, _handleXml);
	}

	/**
	 * Get the HTML content of the specified path.
	 *
	 * @todo Add way to return portion of the retrieved HTML using a selector. Like jQuery.
	 * @async
	 * @param {string} path - The path to the resource.
	 * @param {RequestOptions} [options] - The options for the request.
	 * @returns {Promise<Document>} The return value of the function is the return value of the function passed to the `then`
	 * method of the promise returned by the `#get` method.
	 */
	async getHtml(path, options) {
		return this.#get(path, options, { headers: { [HttpRequestHeader.ACCEPT]: _mediaTypes.get(HttpMediaType.HTML).toString() } }, _handleHtml);
	}

	/**
	 * It returns a promise that resolves to the HTML fragment at the given path.
	 *
	 * @todo - Add way to return portion of the retrieved HTML using a selector. Like jQuery.
	 * @async
	 * @param {string} path - The path to the resource.
	 * @param {RequestOptions} [options] - The options for the request.
	 * @returns {Promise<DocumentFragment>} A promise that resolves to an HTML fragment.
	 */
	async getHtmlFragment(path, options) {
		return this.#get(path, options, { headers: { [HttpRequestHeader.ACCEPT]: _mediaTypes.get(HttpMediaType.HTML).toString() } }, _handleHtmlFragment);
	}

	/**
	 * It gets a script from the server, and appends the script to the {@link Document} {@link HTMLHeadElement}
	 * CORS is enabled by default.
	 *
	 * @async
	 * @param {string} path - The path to the script.
	 * @param {RequestOptions} [options] - The options for the request.
	 * @returns {Promise<void>} A promise that has been resolved.
	 */
	async getScript(path, options) {
		return this.#get(path, options, { headers: { [HttpRequestHeader.ACCEPT]: _mediaTypes.get(HttpMediaType.JAVA_SCRIPT).toString() } }, _handleScript);
	}

	/**
	 * Gets a stylesheet from the server, and adds it as a {@link Blob} {@link URL}.
	 *
	 * @async
	 * @param {string} path - The path to the stylesheet.
	 * @param {RequestOptions} [options] - The options for the request.
	 * @returns {Promise<void>} A promise that has been resolved.
	 */
	async getStylesheet(path, options) {
		return this.#get(path, options, { headers: { [HttpRequestHeader.ACCEPT]: _mediaTypes.get(HttpMediaType.CSS).toString() } }, _handleCss);
	}

	/**
	 * It returns a blob from the specified path.
	 *
	 * @async
	 * @param {string} path - The path to the resource.
	 * @param {RequestOptions} [options] - The options for the request.
	 * @returns {Promise<Blob>} A promise that resolves to a blob.
	 */
	async getBlob(path, options) {
		return this.#get(path, options, { headers: { [HttpRequestHeader.ACCEPT]: HttpMediaType.BIN } }, _handleBlob);
	}

	/**
	 * It returns a promise that resolves to an object URL.
	 *
	 * @async
	 * @param {string} path - The path to the resource.
	 * @param {RequestOptions} [options] - The options for the request.
	 * @returns {Promise<string>} A promise that resolves to an object URL.
	 */
	async getImage(path, options) {
		return this.#get(path, options, { headers: { [HttpRequestHeader.ACCEPT]: 'image/*' } }, _handleImage);
	}

	/**
	 * It gets a buffer from the specified path
	 *
	 * @async
	 * @param {string} path - The path to the resource.
	 * @param {RequestOptions} [options] - The options for the request.
	 * @returns {Promise<ArrayBuffer>} A promise that resolves to a buffer.
	 */
	async getBuffer(path, options) {
		return this.#get(path, options, { headers: { [HttpRequestHeader.ACCEPT]: HttpMediaType.BIN } }, _handleBuffer);
	}

	/**
	 * It returns a readable stream of the response body from the specified path.
	 *
	 * @async
	 * @param {string} path - The path to the resource.
	 * @param {RequestOptions} [options] - The options for the request.
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
	 * @param {string} path - The path to the endpoint you want to call.
	 * @param {RequestOptions} [userOptions] - The options passed to the public function to use for the request.
	 * @param {RequestOptions} [options] - The options for the request.
	 * @param {ResponseHandler<ResponseBody>} [responseHandler] - A function that will be called with the response object.
	 * @returns {Promise<ResponseBody>} The result of the #request method.
	 */
	async #get(path, userOptions, options, responseHandler) {
		return this.#request(path, userOptions, options, responseHandler);
	}

	/**
	 * It takes a path, options, and a response handler, and returns a promise that resolves to the
	 * response entity.
	 *
	 * @private
	 * @async
	 * @param {string} path - The path to the resource you want to access.
	 * @param {RequestOptions} [userOptions={}] - The options passed to the public function to use for the request.
	 * @param {RequestOptions} [options={}] - The options to use for the request.
	 * @param {ResponseHandler<ResponseBody>} [responseHandler] - A function that will be called with the response body as a parameter. This
	 * is useful if you want to do something with the response body before returning it.
	 * @returns {Promise<ResponseBody>} The response from the API call.
	 */
	async #request(path, userOptions = {}, options = {}, responseHandler) {
		const requestOptions = _objectMerge(this.#options, Transportr.#convertRequestOptions(userOptions), options);
		const url = Transportr.#createUrl(this.#baseUrl, path, requestOptions.searchParams);
		const signalController = new SignalController(requestOptions.signal);

		Transportr.#activeRequests.push(signalController);
		requestOptions.signal = signalController.signal;

		if (Transportr.#needsSerialization(requestOptions.method, requestOptions.headers[HttpRequestHeader.CONTENT_TYPE])) {
			try {
				requestOptions.body = JSON.stringify(requestOptions.body);
			} catch (error) {
				return Promise.reject(new HttpError(url, { cause: error })); // reject a promise instead of throwing error
			}
		} else if (requestOptions.method == HttpRequestMethod.GET && requestOptions.headers[HttpRequestHeader.CONTENT_TYPE] != '') {
			delete requestOptions.headers[HttpRequestHeader.CONTENT_TYPE];
			delete requestOptions.body;
		}

		requestOptions.signal.addEventListener('abort', (event) => this.#publish(Transportr.Events.ABORTED, requestOptions.global, event));
		requestOptions.signal.addEventListener('timeout', (event) => this.#publish(Transportr.Events.TIMEOUT, requestOptions.global, event));

		this.#publish(Transportr.Events.CONFIGURED, requestOptions.global, requestOptions);

		let result, timeoutId, response;

		try {
			timeoutId = setTimeout(() => {
				const cause = new DOMException(`The call to '${url}' timed-out after ${requestOptions.timeout / 1000} seconds`, 'TimeoutError');
				signalController.abort(cause);
				requestOptions.signal.dispatchEvent(new CustomEvent(Transportr.Events.TIMEOUT, { detail: { url, options: requestOptions, cause } }));
			}, requestOptions.timeout);

			response = await fetch(url, requestOptions);

			if (!response.ok) {
				// reject a promise instead of throwing error
				return Promise.reject(this.#handleError(url, { status: Transportr.#generateResponseStatusFromError('ResponseError', response), entity: await this.#processResponse(response, url) }));
			}

			result = await this.#processResponse(response, url, responseHandler);
			this.#publish(Transportr.Events.SUCCESS, requestOptions.global, result);
		} catch (error) {
			return Promise.reject(this.#handleError(url, { cause: error, status: Transportr.#generateResponseStatusFromError(error.name, response) }));
		} finally {
			clearTimeout(timeoutId);
			if (!requestOptions.signal.aborted) {
				this.#publish(Transportr.Events.COMPLETE, requestOptions.global, response);

				// Remove the completed request's signalController from the array
				const index = Transportr.#activeRequests.indexOf(signalController);
				if (index > -1) {
					Transportr.#activeRequests.splice(index, 1);
				}

				if (Transportr.#activeRequests.length === 0) {
					this.#publish(Transportr.Events.ALL_COMPLETE, requestOptions.global, response);
				}
			}
		}

		return result;
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
		this.#publish(Transportr.Events.ERROR, true, error);

		return error;
	}

	/**
	 * Publishes an event to the global and instance subscribers.
	 *
	 * @private
	 * @param {string} eventName The name of the event.
	 * @param {boolean} global Whether or not to publish the event to the global subscribers.
	 * @param {Event} [event] The event object.
	 * @param {*} [data] The data to pass to the subscribers.
	 * @returns {void}
	 */
	#publish(eventName, global, event, data) {
		if (global) {
			Transportr.#globalSubscribr.publish(eventName, event, data);
		}
		this.#subscribr.publish(eventName, event, data);
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
			case 'AbortError': return Transportr.#eventResponseStatuses.get(Transportr.Events.ABORTED);
			case 'TimeoutError': return Transportr.#eventResponseStatuses.get(Transportr.Events.TIMEOUT);
			default: return response ? new ResponseStatus(response.status, response.statusText) : new ResponseStatus(500, 'Internal Server Error');
		}
	}

	/**
	 * It takes a response and a handler, and if the handler is not defined, it tries to find a handler
	 * based on the response's content type
	 *
	 * @private
	 * @static
	 * @async
	 * @param {Response} response - The response object returned by the fetch API.
	 * @param {URL} url - The path to the resource you want to access. Used for error handling.
	 * @param {ResponseHandler<ResponseBody>} [handler] - The handler to use for processing the response.
	 * @returns {Promise<ResponseBody>} The response is being returned.
	 */
	async #processResponse(response, url, handler) {
		try {
			let mediaType;
			if (!handler) {
				mediaType = MediaType.parse(response.headers.get(HttpResponseHeader.CONTENT_TYPE));

				if (mediaType) {
					for (const [responseHandler, contentTypes] of Transportr.#contentTypeHandlers) {
						if (contentTypes.has(mediaType.type) || contentTypes.has(mediaType.subtype)) {
							handler = responseHandler;
							break;
						}
					}
				}
			}

			return (handler ?? _handleText)(response);
		} catch (error) {
			console.error('Unable to process response.', error, response);
			return Promise.reject(this.#handleError(url, { cause: error }));
		}
	}

	/**
	 * It takes a URL, a path, and a set of search parameters, and returns a new URL with the path and
	 * search parameters applied.
	 *
	 * @private
	 * @static
	 * @param {URL} url - The URL to use as a base.
	 * @param {string} path - The path to the resource. This can be a relative path or a full URL.
	 * @param {Object<string, string>} [searchParams={}] - An object containing the query parameters to be added to the URL.
	 * @returns {URL} A new URL object with the pathname and origin of the url parameter, and the path parameter
	 * appended to the end of the pathname.
	 */
	static #createUrl(url, path, searchParams = {}) {
		if (path) {
			// Create the object URL with a relative or absolute path
			url = path.startsWith('/') ? new URL(`${url.pathname.replace(endsWithSlashRegEx, '')}${path}`, url.origin) : new URL(path);
		}

		Object.entries(searchParams).forEach(([key, value]) => url.searchParams.append(key, value));

		return url;
	}

	/**
	 * If the request method is POST, PUT, or PATCH, and the content type is JSON, then the request body
	 * needs to be serialized.
	 *
	 * @private
	 * @static
	 * @param {RequestMethod} method - The HTTP request method.
	 * @param {HttpMediaType} contentType - The headers of the request.
	 * @returns {boolean} `true` if the request body needs to be serialized, `false` otherwise.
	 */
	static #needsSerialization(method, contentType) {
		return (_mediaTypes.get(contentType) ?? new MediaType(contentType)).essence == HttpMediaType.JSON && [HttpRequestMethod.POST, HttpRequestMethod.PUT, HttpRequestMethod.PATCH].includes(method);
	}

	/**
	 *
	 * @param {RequestOptions} options - The options passed to the public function to use for the request.
	 * @returns {RequestOptions} The options to use for the request.
	 */
	static #convertRequestOptions(options) {
		if (!_objectIsEmpty(options)) {
			for (const [{ property, type, converter }, option = options[property]] of Transportr.#propertyTypeConverters) {
				if (option instanceof type) {
					options[property] = converter(option);
				}
			}
		}

		return options;
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