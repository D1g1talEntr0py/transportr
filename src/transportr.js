import { _isIterable, _objectMerge, _type, _construct } from '@d1g1tal/chrysalis';
import SetMultiMap from '@d1g1tal/collections/set-multi-map.js';
import { MediaType } from '@d1g1tal/media-type';
import HttpError from './http-error.js';
import HttpMediaType from './http-media-type.js';
import HttpRequestHeader from './http-request-headers.js';
import HttpRequestMethod from './http-request-methods.js';
import HttpResponseHeader from './http-response-headers.js';
import ResponseStatus from './response-status.js';

/**
 * @template T extends ResponseBody
 * @typedef {function(Response): Promise<T>} ResponseHandler<T>
 */

/** @typedef {Object.prototype.constructor} Type */
/** @typedef {Object<string, (boolean|string|number|Array)>} JsonObject */
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
 * @property {null} window Can only be null. Used to disassociate request from any Window.
 */

/** @type {RegExp} */
const endsWithSlashRegEx = /\/$/;

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
const _handleXml = async (response) => new DOMParser().parseFromString(await response.text(), HttpMediaType.XML.essence);

/** @type {ResponseHandler<Document>} */
const _handleHtml = async (response) => new DOMParser().parseFromString(await response.text(), HttpMediaType.HTML.essence);

/** @type {ResponseHandler<DocumentFragment>} */
const _handleHtmlFragment = async (response) => document.createRange().createContextualFragment(await response.text());

/**
 * A wrapper around the fetch API that makes it easier to make HTTP requests.
 *
 * @module {Transportr} transportr
 * @author D1g1talEntr0py
 */
export default class Transportr {
	/** @type {URL} */
	#baseUrl;
	/** @type {RequestOptions} */
	#options;

	/**
	 * @private
	 * @static
	 * @type {SetMultiMap<ResponseHandler<ResponseBody>, string>}
	 */
	static #contentTypeHandlers = new SetMultiMap([
		[_handleImage, new MediaType(HttpMediaType.PNG).type],
		[_handleText, new MediaType(HttpMediaType.TEXT).type],
		[_handleJson, new MediaType(HttpMediaType.JSON).subtype],
		[_handleHtml, new MediaType(HttpMediaType.HTML).subtype],
		[_handleScript, new MediaType(HttpMediaType.JAVA_SCRIPT).subtype],
		[_handleCss, new MediaType(HttpMediaType.CSS).subtype],
		[_handleXml, new MediaType(HttpMediaType.XML).subtype],
		[_handleReadableStream, new MediaType(HttpMediaType.BIN).subtype]
	]);

	/**
	 * Create a new Transportr instance with the provided location or origin and context path.
	 *
	 * @param {URL | string | RequestOptions} [url=location.origin] The URL for {@link fetch} requests.
	 * @param {RequestOptions} [options=Transportr.#defaultRequestOptions] The default {@link RequestOptions} for this instance.
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
		this.#options = _objectMerge(Transportr.#defaultRequestOptions, Transportr.#convertRequestOptions(options, { headers: Object, searchParams: Object }));
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
	 * @private
	 * @static
	 * @type {RequestOptions}
	 */
	static #defaultRequestOptions = Object.freeze({
		body: null,
		cache: Transportr.CachingPolicy.NO_STORE,
		credentials: Transportr.CredentialsPolicy.SAME_ORIGIN,
		headers: { [HttpRequestHeader.CONTENT_TYPE]: Transportr.MediaType.JSON, [HttpRequestHeader.ACCEPT]: Transportr.MediaType.JSON },
		searchParams: {},
		integrity: undefined,
		keepalive: undefined,
		method: HttpRequestMethod.GET,
		mode: Transportr.RequestMode.CORS,
		redirect: Transportr.RedirectPolicy.FOLLOW,
		referrer: 'about:client',
		referrerPolicy: Transportr.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
		signal: null,
		window: null
	});

	/**
	 * It returns the base {@link URL} for the API.
	 *
	 * @returns {URL} The baseUrl property.
	 */
	get baseUrl() {
		return this.#baseUrl;
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
		return this.#request(path, options, { body: body, method: HttpRequestMethod.POST });
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
		return this.#get(path, options, { headers: { [HttpRequestHeader.ACCEPT]: HttpMediaType.JSON } }, _handleJson);
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
		return this.#get(path, options, { headers: { [HttpRequestHeader.ACCEPT]: HttpMediaType.XML } }, _handleXml);
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
		return this.#get(path, options, { headers: { [HttpRequestHeader.ACCEPT]: HttpMediaType.HTML } }, _handleHtml);
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
		return this.#get(path, options, { headers: { [HttpRequestHeader.ACCEPT]: HttpMediaType.HTML } }, _handleHtmlFragment);
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
		return this.#get(path, options, { headers: { [HttpRequestHeader.ACCEPT]: HttpMediaType.JAVA_SCRIPT } }, _handleScript);
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
		return this.#get(path, options, { headers: { [HttpRequestHeader.ACCEPT]: HttpMediaType.CSS } }, _handleCss);
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
		/** @type {RequestOptions} */
		const requestOptions = Transportr.#convertRequestOptions(_objectMerge(this.#options, userOptions, options), { headers: Headers, searchParams: URLSearchParams });
		const errorMessage = `An error has occurred with your Request: ${path}`;

		if (Transportr.#needsSerialization(requestOptions.method, requestOptions.headers.get(HttpRequestHeader.CONTENT_TYPE))) {
			requestOptions.body = JSON.stringify(requestOptions.body);
		}

		let response;
		try {
			response = await fetch(Transportr.#createUrl(this.#baseUrl, path, requestOptions.searchParams), requestOptions);
		} catch (error) {
			console.error(errorMessage, error);
			throw new HttpError(errorMessage, { cause: error, status: new ResponseStatus(response.status, response.statusText) });
		}

		if (!response.ok) {
			// The API call returned an error, check for a reponse entity and return it in the HttpError
			throw new HttpError(errorMessage, { status: new ResponseStatus(response.status, response.statusText), entity: await Transportr.#processResponse(response) });
		}

		return await Transportr.#processResponse(response, responseHandler);
	}

	/**
	 * It takes a response and a handler, and if the handler is not defined, it tries to find a handler
	 * based on the response's content type
	 *
	 * @private
	 * @static
	 * @async
	 * @param {Response} response - The response object returned by the fetch API.
	 * @param {ResponseHandler<ResponseBody>} [handler] - The handler to use for processing the response.
	 * @returns {Promise<ResponseBody>} The response is being returned.
	 */
	static async #processResponse(response, handler) {
		try {
			if (!handler) {
				const mediaType = new MediaType(response.headers.get(HttpResponseHeader.CONTENT_TYPE));

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
			const errorMessage = 'Unable to process response.';
			console.error(errorMessage, error, response);
			throw new HttpError(errorMessage, { cause: error });
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
	 * @param {URLSearchParams} [searchParams=new URLSearchParams()] - An object containing the query parameters to be added to the URL.
	 * @returns {URL} A new URL object with the pathname and origin of the url parameter, and the path parameter
	 * appended to the end of the pathname.
	 */
	static #createUrl(url, path, searchParams = new URLSearchParams()) {
		// Create the object URL with a relative or absolute path
		url = path.startsWith('/') ? new URL(`${url.pathname.replace(endsWithSlashRegEx, '')}${path}`, url.origin) : new URL(path);

		searchParams.forEach((value, key) => url.searchParams.append(key, value));

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
		return contentType == HttpMediaType.JSON && [HttpRequestMethod.POST, HttpRequestMethod.PUT, HttpRequestMethod.PATCH].includes(method);
	}

	/**
	 *
	 * @param {RequestOptions} options - The options passed to the public function to use for the request.
	 * @param {Object<string, Type>} typeConversionMap - A map of properties to convert to the specified type.
	 * @returns {RequestOptions} The options to use for the request.
	 */
	static #convertRequestOptions(options, typeConversionMap) {
		let object;
		for (const [property, type, option = options[property]] of Object.entries(typeConversionMap)) {
			if (option) {
				object = _isIterable(option) ? Object.fromEntries(option.entries()) : option;
				options[property] = type == Object ? object : _construct(type, [object]);
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