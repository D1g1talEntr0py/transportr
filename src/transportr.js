import { _objectMerge } from '@d1g1tal/chrysalis';
import SetMultiMap from '@d1g1tal/collections/set-multi-map.js';
import { MediaType } from '@d1g1tal/media-type';
import HttpMediaType from './http-media-type.js';
import HttpRequestHeader from './http-request-headers.js';
import HttpRequestMethod from './http-request-methods.js';
import HttpResponseHeader from './http-response-headers.js';

/**
 * @template T extends ResponseBody
 * @typedef {function(Response): Promise<T>} ResponseHandler<T>
 */

/** @typedef {Object<string, (boolean|string|number|Array)>} JsonObject */
/** @typedef {Blob|ArrayBuffer|TypedArray|DataView|FormData|URLSearchParams|string|ReadableStream} RequestBody */
/** @typedef {Blob|ArrayBuffer|FormData|string|ReadableStream} ResponseBody */
/** @typedef {'default'|'force-cache'|'no-cache'|'no-store'|'only-if-cached'|'reload'} RequestCache */
/** @typedef {'include'|'omit'|'same-origin'} RequestCredentials */
/** @typedef {Headers|Object<string, string>} RequestHeaders */
/** @typedef {'GET'|'POST'|'PUT'|'PATCH'|'DELETE'|'HEAD'|'OPTIONS'} RequestMethod */
/** @typedef {'cors'|'navigate'|'no-cors'|'same-origin'} RequestMode */
/** @typedef {'error'|'follow'|'manual'} RequestRedirect */
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

/** @extends Error */
class HttpError extends Error {}

/** @type {RegExp} */
const endsWithSlashRegEx = /\/$/;

/** @type {ResponseHandler<string>} */
const _handleText = async (response) => await response.text();

/** @type {ResponseHandler<JsonObject>} */
const _handleJson = async (response) => await response.json();

/** @type {ResponseHandler<Blob>} */
const _handleBlob = async (response) => await response.blob();

/** @type {ResponseHandler<ArrayBuffer>} */
const _handleBuffer = async (response) => await response.arrayBuffer();

/** @type {ResponseHandler<ReadableStream<Uint8Array>} */
const _handleReadableStream = async (response) => response.body;

/** @type {ResponseHandler<Document>} */
const _handleXml = async (response) => new DOMParser().parseFromString(await response.text(), Transportr.MediaType.XML.essence);

/** @type {ResponseHandler<DocumentFragment>} */
const _handleHtmlFragment = async (response) => document.createRange().createContextualFragment(await response.text());

export default class Transportr {
	#baseUrl;
	/**
	 * @static
	 * @constant {Object<string, MediaType>}
	 */
	static #MediaType = {
		JSON: new MediaType(HttpMediaType.JSON),
		XML: new MediaType(HttpMediaType.XML),
		HTML: new MediaType(HttpMediaType.HTML),
		SCRIPT: new MediaType(HttpMediaType.JAVA_SCRIPT),
		TEXT: new MediaType(HttpMediaType.TEXT),
		CSS: new MediaType(HttpMediaType.CSS),
		WEBP: new MediaType(HttpMediaType.WEBP),
		PNG: new MediaType(HttpMediaType.PNG),
		GIF: new MediaType(HttpMediaType.GIF),
		JPG: new MediaType(HttpMediaType.JPEG),
		OTF: new MediaType(HttpMediaType.OTF),
		WOFF: new MediaType(HttpMediaType.WOFF),
		WOFF2: new MediaType(HttpMediaType.WOFF2),
		TTF: new MediaType(HttpMediaType.TTF),
		PDF: new MediaType(HttpMediaType.PDF)
	};
	/**
	 * @static
	 * @type {SetMultiMap<ResponseHandler<ResponseBody>, string>}
	 */
	static #contentTypeHandlers = new SetMultiMap([
		[_handleJson, Transportr.#MediaType.JSON.subtype],
		[_handleText, Transportr.#MediaType.HTML.subtype],
		[_handleText, Transportr.#MediaType.SCRIPT.subtype],
		[_handleText, Transportr.#MediaType.CSS.subtype],
		[_handleText, Transportr.#MediaType.TEXT.subtype],
		[_handleXml, Transportr.#MediaType.XML.subtype],
		[_handleBlob, Transportr.#MediaType.GIF.subtype],
		[_handleBlob, Transportr.#MediaType.JPG.subtype],
		[_handleBlob, Transportr.#MediaType.PNG.subtype]
	]);

	/**
	 * Create a new Transportr instance with the provided location or origin and context path.
	 *
	 * @param {URL | string} [url = location.origin] The URL for {@link fetch} requests.
	 */
	constructor(url = location.origin) {
		/** @type {URL} */
		this.#baseUrl = url instanceof URL ? url : url.startsWith('/') ? new URL(url, location.origin) : new URL(url);
	}

	/**
	 * @static
	 * @constant {Object<string, 'GET'|'POST'|'PUT'|'PATCH'|'DELETE'|'HEAD'|'OPTIONS'|'TRACE'|'CONNECT'>}
	 */
	static Method = Object.freeze(HttpRequestMethod);

	/**
	 * @static
	 * @constant {Object<string, string>}
	 */
	static MediaType = HttpMediaType;

	/**
	 * @static
	 * @constant {Object<string, string>}
	 */
	static RequestHeader = HttpRequestHeader;

	/**
	 * @static
	 * @constant {Object<string, string>}
	 */
	static ResponseHeader = Object.freeze(HttpResponseHeader);

	static CachingPolicy = {
		DEFAULT: 'default',
		FORCE_CACHE: 'force-cache',
		NO_CACHE: 'no-cache',
		NO_STORE: 'no-store',
		ONLY_IF_CACHED: 'only-if-cached',
		RELOAD: 'reload'
	};

	/**
	 * @static
	 * @type {Object<string, string>}
	 */
	static CredentialsPolicy = {
		INCLUDE: 'include',
		OMIT: 'omit',
		SAME_ORIGIN: 'same-origin'
	};

	/** @type {RequestOptions} */
	#defaultRequestOptions = {
		body: null,
		cache: Transportr.CachingPolicy.NO_STORE,
		credentials: 'same-origin',
		headers: {},
		integrity: undefined,
		keepalive: undefined,
		method: undefined,
		mode: 'cors',
		redirect: 'follow',
		referrer: 'about:client',
		referrerPolicy: 'strict-origin-when-cross-origin',
		signal: null,
		window: null
	};

	/**
	 *
	 * @returns {URL} The base URL used for requests
	 */
	get baseUrl() {
		return this.#baseUrl;
	}

	/**
	 *
	 * @async
	 * @param {string} path
	 * @param {RequestOptions} [options = {}]
	 * @returns {Promise<*>}
	 */
	async get(path, options = {}) {
		return this.#request(path, _objectMerge(options, { method: HttpRequestMethod.GET }));
	}

	/**
	 *
	 * @async
	 * @param {string} path
	 * @param {Object} body
	 * @param {RequestOptions} [options = {}]
	 * @returns {Promise<*>}
	 */
	async post(path, body, options = {}) {
		return this.#request(path, _objectMerge(options, { body, method: HttpRequestMethod.POST }));
	}

	/**
	 *
	 * @async
	 * @param {string} path
	 * @param {RequestOptions} [options = {}]
	 * @returns {Promise<*>}
	 */
	async put(path, options = {}) {
		return this.#request(path, _objectMerge(options, { method: HttpRequestMethod.PUT }));
	}

	/**
	 *
	 * @async
	 * @param {string} path
	 * @param {RequestOptions} [options = {}]
	 * @returns {Promise<*>}
	 */
	async patch(path, options = {}) {
		return this.#request(path, _objectMerge(options, { method: HttpRequestMethod.PATCH }));
	}

	/**
	 *
	 * @async
	 * @param {string} path
	 * @param {RequestOptions} [options = {}]
	 * @returns {Promise<*>}
	 */
	async delete(path, options = {}) {
		return this.#request(path, _objectMerge(options, { method: HttpRequestMethod.DELETE }));
	}

	/**
	 *
	 * @async
	 * @param {string} path
	 * @param {RequestOptions} [options = {}]
	 * @returns {Promise<*>}
	 */
	async head(path, options = {}) {
		return this.#request(path, _objectMerge(options, { method: HttpRequestMethod.HEAD }));
	}

	/**
	 *
	 * @async
	 * @param {string} path
	 * @param {RequestOptions} [options = {}]
	 * @returns {Promise<*>}
	 */
	async options(path, options = {}) {
		return this.#request(path, _objectMerge(options, { method: HttpRequestMethod.OPTIONS }));
	}

	/**
	 *
	 * @async
	 * @param {string} path
	 * @param {RequestOptions} [options = {}]
	 * @returns {Promise<*>}
	 */
	async request(path, options = {}) {
		return this.#request(path, options);
	}

	/**
	 *
	 * @async
	 * @param {string} path
	 * @param {RequestOptions} [options = {}]
	 * @returns {Promise<JsonObject>}
	 */
	async getJson(path, options = {}) {
		return this.#get(path, _objectMerge(options, { headers: { [HttpRequestHeader.ACCEPT]: Transportr.MediaType.JSON } }), _handleJson);
	}

	/**
	 *
	 * @async
	 * @param {string} path
	 * @param {RequestOptions} [options = {}]
	 * @returns {Promise<Document>}
	 */
	async getXml(path, options = {}) {
		return new DOMParser().parseFromString(await this.#get(path, _objectMerge(options, { headers: { [HttpRequestHeader.ACCEPT]: Transportr.MediaType.XML } }), _handleBlob), HttpMediaType.XML);
	}

	/**
	 * TODO - Add way to return portion of the retrieved HTML using a selector. Like jQuery.
	 *
	 * @async
	 * @param {string} path
	 * @param {RequestOptions} [options = {}]
	 * @returns {Promise<string>}
	 */
	async getHtml(path, options = {}) {
		return this.#get(path, _objectMerge(options, { headers: { [HttpRequestHeader.ACCEPT]: HttpMediaType.HTML } }), _handleText);
	}

	/**
	 * TODO - Add way to return portion of the retrieved HTML using a selector. Like jQuery.
	 *
	 * @async
	 * @param {string} path
	 * @param {RequestOptions} [options = {}]
	 * @returns {Promise<DocumentFragment>}
	 */
	async getHtmlFragment(path, options = {}) {
		return this.#get(path, _objectMerge(options, { headers: { [HttpRequestHeader.ACCEPT]: HttpMediaType.HTML } }), _handleHtmlFragment);
	}

	/**
	 * TODO - Do I need this? What special handling might this need??
	 *
	 * @async
	 * @param {string} path
	 * @param {RequestOptions} [options = {}]
	 * @returns {Promise<string>}
	 */
	async getScript(path, options = {}) {
		return this.#get(path, _objectMerge(options, { headers: { [HttpRequestHeader.ACCEPT]: HttpMediaType.JAVA_SCRIPT } }), _handleText);
	}

	/**
	 *
	 * @async
	 * @param {string} path
	 * @param {RequestOptions} [options = {}]
	 * @returns {Promise<Blob>}
	 */
	async getBlob(path, options = {}) {
		return await this.#get(path, _objectMerge(options, { headers: { [HttpRequestHeader.ACCEPT]: HttpMediaType.BIN } }), _handleBlob);
	}

	/**
	 *
	 * @async
	 * @param {string} path
	 * @param {RequestOptions} [options = {}]
	 * @returns {Promise<string>}
	 */
	async getImage(path, options = {}) {
		return URL.createObjectURL(await this.#get(path, _objectMerge(options, { headers: { [HttpRequestHeader.ACCEPT]: 'image/*' } }), _handleBlob));
	}

	/**
	 *
	 * @async
	 * @param {string} path
	 * @param {RequestOptions} [options = {}]
	 * @returns {Promise<ArrayBuffer>}
	 */
	async getBuffer(path, options = {}) {
		return await this.#get(path, _objectMerge(options, { headers: { [HttpRequestHeader.ACCEPT]: HttpMediaType.BIN } }), _handleBuffer);
	}

	/**
	 *
	 * @async
	 * @param {string} path
	 * @param {RequestOptions} [options = {}]
	 * @returns {Promise<ReadableStream<Uint8Array>}
	 */
	async getStream(path, options = {}) {
		return await this.#get(path, _objectMerge(options, { headers: { [HttpRequestHeader.ACCEPT]: HttpMediaType.BIN } }), _handleReadableStream);
	}

	/**
	 *
	 * @param {string} path
	 * @param {RequestOptions} options
	 * @param {ResponseHandler} responseHandler
	 * @returns
	 */
	async #get(path, options, responseHandler) {
		return this.#request(path, _objectMerge(options, { method: Transportr.Method.GET }), responseHandler);
	}

	/**
	 *
	 * @private
	 * @async
	 * @param {string} path
	 * @param {RequestInit} options
	 * @param {ResponseHandler<ResponseBody>} [responseHandler]
	 * @returns {Promise<ResponseBody|Response>}
	 */
	async #request(path, options, responseHandler) {
		console.debug(`Calling '${path}'`);

		/** @type {RequestOptions} */
		const requestOptions = _objectMerge(this.#defaultRequestOptions, options);
		const headers = new Headers(requestOptions.headers);

		if (headers.get(Transportr.RequestHeader.CONTENT_TYPE) == Transportr.MediaType.JSON) {
			requestOptions.body = JSON.stringify(requestOptions.body);
		}

		let response;
		try {
			response = await fetch(Transportr.#createUrl(this.#baseUrl, path, requestOptions.searchParams), requestOptions);
		} catch (error) {
			console.error(error);
			// Need to ensure that the process terminates since an error occurred.
			process.exit(1);
		}

		if (!response.ok) {
			throw new HttpError(`An error has occurred with your request: ${response.status} - ${await response.text()}`);
		}

		try {
			return await (responseHandler ? responseHandler(response) : Transportr.#processResponse(response));
		} catch (error) {
			console.error(error);
			// Need to ensure that the process terminates since an error occurred.
			process.exit(1);
		}
	}

	/**
	 *
	 * @private
	 * @static
	 * @param {URL} url
	 * @param {string} path
	 * @param {Object} [searchParams = {}]
	 * @returns {URL}
	 */
	static #createUrl(url, path, searchParams = {}) {
		url = new URL(`${url.pathname.replace(endsWithSlashRegEx, '')}${path}`, url.origin);

		for (const [ name, value ] of Object.entries(searchParams)) {
			if (url.searchParams.has(name)) {
				url.searchParams.set(name, value);
			} else {
				url.searchParams.append(name, value);
			}
		}

		return url;
	}

	/**
	 *
	 * @private
	 * @static
	 * @async
	 * @param {Response} response
	 * @returns {Promise<ResponseBody|Response>}
	 */
	static async #processResponse(response) {
		const mediaType = new MediaType(response.headers.get(HttpResponseHeader.CONTENT_TYPE));

		for (const [responseHandler, contentTypes] of Transportr.#contentTypeHandlers.entries()) {
			if (contentTypes.has(mediaType.subtype)) {
				return await responseHandler(response);
			}
		}

		console.warn('Unable to process response. Unknown content-type or no response handler defined.');

		return response;
	}
}