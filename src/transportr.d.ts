/**
 * A wrapper around the fetch API that makes it easier to make HTTP requests.
 *
 * @module Transportr
 * @author D1g1talEntr0py
 */
export default class Transportr {
    /**
     * @private
     * @static
     * @type {SetMultiMap<ResponseHandler<ResponseBody>, string>}
     */
    private static "__#3@#contentTypeHandlers";
    /**
     * @static
     * @constant {Object<string, RequestMethod>}
     */
    static Method: Readonly<{
        OPTIONS: string;
        GET: string;
        HEAD: string;
        POST: string;
        PUT: string;
        DELETE: string;
        TRACE: string;
        CONNECT: string;
        PATCH: string;
    }>;
    /**
     * @static
     * @constant {Object<string, string>}
     */
    static MediaType: {
        AAC: string;
        ABW: string;
        ARC: string;
        AVIF: string;
        AVI: string;
        AZW: string;
        BIN: string;
        BMP: string;
        BZIP: string;
        BZIP2: string;
        CDA: string;
        CSH: string;
        CSS: string;
        CSV: string;
        DOC: string;
        DOCX: string;
        EOT: string;
        EPUB: string;
        GZIP: string;
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
         * @property {string} integrity A cryptographic hash of the resource to be fetched by request. Sets request's integrity.
         * @property {boolean} keepalive A boolean to set request's keepalive.
         * @property {RequestMethod} method A string to set request's method.
         * @property {RequestMode} mode A string to indicate whether the request will use CORS, or will be restricted to same-origin URLs. Sets request's mode.
         * @property {RequestRedirect} redirect A string indicating whether request follows redirects, results in an error upon encountering a redirect, or returns the redirect (in an opaque fashion). Sets request's redirect.
         * @property {string} referrer A string whose value is a same-origin URL, "about:client", or the empty string, to set request's referrer.
         * @property {ReferrerPolicy} referrerPolicy A referrer policy to set request's referrerPolicy.
         * @property {AbortSignal} signal An AbortSignal to set request's signal.
         * @property {null} window Can only be null. Used to disassociate request from any Window.
         * @property {SearchParameters} searchParams The parameters to be added to the URL for the request.
         */
        /**
         * @typedef {Object} ResponseStatus
         * @property {number} code The status code.
         * @property {string} text The status text.
         */
        /** @type {RegExp} */
        GIF: string;
        HTML: string;
        ICO: string;
        ICS: string;
        JAR: string;
        JPEG: string;
        JAVA_SCRIPT: string;
        JSON: string;
        JSON_LD: string;
        MID: string;
        X_MID: string;
        MP3: string;
        MP4A: string;
        MP4: string;
        MPEG: string;
        MPKG: string;
        ODP: string;
        ODS: string;
        ODT: string;
        OGA: string;
        OGV: string;
        OGX: string;
        OPUS: string;
        OTF: string;
        PNG: string;
        PDF: string;
        PHP: string;
        PPT: string;
        PPTX: string;
        RAR: string;
        RTF: string;
        SH: string;
        SVG: string;
        TAR: string;
        TIFF: string;
        TRANSPORT_STREAM: string;
        TTF: string;
        TEXT: string;
        VSD: string;
        WAV: string;
        WEBA: string;
        WEBM: string;
        WEBP: string;
        WOFF: string;
        WOFF2: string;
        XHTML: string;
        XLS: string;
        XLSX: string;
        XML: string;
        XUL: string;
        ZIP: string;
        '3GP': string;
        '3G2': string;
        '7Z': string;
    };
    /**
     * @static
     * @constant {Object<string, string>}
     */
    static RequestHeader: {
        ACCEPT: string;
        ACCEPT_CHARSET: string;
        ACCEPT_ENCODING: string;
        ACCEPT_LANGUAGE: string;
        AUTHORIZATION: string;
        CACHE_CONTROL: string;
        CONNECTION: string;
        COOKIE: string;
        CONTENT_LENGTH: string;
        CONTENT_MD5: string;
        CONTENT_TYPE: string;
        DATE: string;
        EXPECT: string;
        FROM: string;
        HOST: string;
        IF_MATCH: string;
        IF_MODIFIED_SINCE: string;
        IF_NONE_MATCH: string;
        IF_RANGE: string;
        IF_UNMODIFIED_SINCE: string;
        MAX_FORWARDS: string;
        ORIGIN: string;
        PRAGMA: string;
        PROXY_AUTHORIZATION: string;
        RANGE: string;
        REFERER: string;
        TE: string;
        USER_AGENT: string;
        UPGRADE: string;
        VIA: string;
        WARNING: string;
        X_REQUESTED_WITH: string;
        DNT: string;
        X_FORWARDED_FOR: string;
        X_FORWARDED_HOST: string;
        X_FORWARDED_PROTO: string;
        FRONT_END_HTTPS: string;
        X_HTTP_METHOD_OVERRIDE: string;
        X_ATT_DEVICE_ID: string;
        X_WAP_PROFILE: string;
    };
    /**
     * @static
     * @constant {Object<string, string>}
     */
    static ResponseHeader: Readonly<{
        PROXY_CONNECTION: string;
        X_UIDH: string;
        X_CSRF_TOKEN: string;
        ACCESS_CONTROL_ALLOW_ORIGIN: string;
        ACCEPT_PATCH: string;
        ACCEPT_RANGES: string;
        AGE: string;
        ALLOW: string;
        CACHE_CONTROL: string;
        CONNECTION: string;
        CONTENT_DISPOSITION: string;
        CONTENT_ENCODING: string;
        CONTENT_LANGUAGE: string;
        CONTENT_LENGTH: string;
        CONTENT_LOCATION: string;
        CONTENT_RANGE: string;
        CONTENT_TYPE: string;
        DATE: string;
        ETAG: string;
        EXPIRES: string;
        LAST_MODIFIED: string;
        LINK: string;
        LOCATION: string;
        P3P: string;
        PRAGMA: string;
        PROXY_AUTHENTICATION: string;
        PUBLIC_KEY_PINS: string;
        RETRY_AFTER: string;
        SERVER: string;
        SET_COOKIE: string;
        STATUS: string;
        STRICT_TRANSPORT_SECURITY: string;
        TRAILER: string;
        TRANSFER_ENCODING: string;
        UPGRADE: string;
        VARY: string;
        VIA: string;
        WARNING: string;
        WWW_AUTHENTICATE: string;
        X_XSS_PROTECTION: string;
        CONTENT_SECURITY_POLICY: string;
        X_CONTENT_TYPE_OPTIONS: string;
        X_POWERED_BY: string;
    }>;
    /**
     * @static
     * @constant {Object<string, RequestCache>}
     */
    static CachingPolicy: {
        DEFAULT: string;
        FORCE_CACHE: string;
        NO_CACHE: string;
        NO_STORE: string;
        ONLY_IF_CACHED: string;
        RELOAD: string;
    };
    /**
     * @static
     * @constant {Object<string, RequestCredentials>}
     */
    static CredentialsPolicy: {
        INCLUDE: string;
        OMIT: string;
        SAME_ORIGIN: string;
    };
    /**
     * @static
     * @constant {Object<string, RequestMode>}
     */
    static RequestMode: {
        CORS: string;
        NAVIGATE: string;
        NO_CORS: string;
        SAME_ORIGIN: string;
    };
    /**
     * @static
     * @constant {Object<string, RequestRedirect>}
     */
    static RedirectPolicy: {
        ERROR: string;
        FOLLOW: string;
        MANUAL: string;
    };
    /**
     * @static
     * @constant {Object<string, ReferrerPolicy>}
     */
    static ReferrerPolicy: {
        NO_REFERRER: string;
        NO_REFERRER_WHEN_DOWNGRADE: string;
        ORIGIN: string;
        ORIGIN_WHEN_CROSS_ORIGIN: string;
        SAME_ORIGIN: string;
        STRICT_ORIGIN: string;
        STRICT_ORIGIN_WHEN_CROSS_ORIGIN: string;
        UNSAFE_URL: string;
    };
    /**
     * @static
     * @type {RequestOptions}
     */
    static "__#3@#defaultRequestOptions": RequestOptions;
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
    private static "__#3@#createUrl";
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
    private static "__#3@#processResponse";
    /**
     * If the request method is POST, PUT, or PATCH, and the content type is JSON, then the request body
     * needs to be serialized.
     *
     * @private
     * @static
     * @param {RequestMethod} method - The HTTP request method.
     * @param {RequestHeaders} headers - The headers of the request.
     * @returns {boolean} `true` if the request body needs to be serialized, `false` otherwise.
     */
    private static "__#3@#needsSerialization";
    /**
     * Create a new Transportr instance with the provided location or origin and context path.
     *
     * @param {URL | string | RequestOptions} [url = location.origin] The URL for {@link fetch} requests.
     * @param {RequestOptions} [options = Transportr.#defaultRequestOptions] The default {@link RequestOptions} for this instance.
     */
    constructor(url?: URL | string | RequestOptions, options?: RequestOptions);
    /**
     * It returns the base {@link URL} for the API.
     *
     * @returns {URL} The baseUrl property.
     */
    get baseUrl(): URL;
    /**
     * This function returns a promise that resolves to the result of a request to the specified path with
     * the specified options, where the method is GET.
     *
     * @async
     * @param {string} path - The path to the resource you want to get.
     * @param {RequestOptions} [options={}] - The options for the request.
     * @returns {Promise<ResponseBody>} A promise that resolves to the response of the request.
     */
    get(path: string, options?: RequestOptions): Promise<ResponseBody>;
    /**
     * This function makes a POST request to the given path with the given body and options.
     *
     * @async
     * @param {string} path - The path to the endpoint you want to call.
     * @param {Object} body - The body of the request.
     * @param {RequestOptions} [options={}] - The options for the request.
     * @returns {Promise<ResponseBody>} A promise that resolves to the response body.
     */
    post(path: string, body: any, options?: RequestOptions): Promise<ResponseBody>;
    /**
     * This function returns a promise that resolves to the result of a request to the specified path with
     * the specified options, where the method is PUT.
     *
     * @async
     * @param {string} path - The path to the endpoint you want to call.
     * @param {RequestOptions} [options={}] - The options for the request.
     * @returns {Promise<ResponseBody>} The return value of the #request method.
     */
    put(path: string, options?: RequestOptions): Promise<ResponseBody>;
    /**
     * It takes a path and options, and returns a request with the method set to PATCH.
     *
     * @async
     * @param {string} path - The path to the endpoint you want to hit.
     * @param {RequestOptions} [options={}] - The options for the request.
     * @returns {Promise<ResponseBody>} A promise that resolves to the response of the request.
     */
    patch(path: string, options?: RequestOptions): Promise<ResponseBody>;
    /**
     * It takes a path and options, and returns a request with the method set to DELETE.
     *
     * @async
     * @param {string} path - The path to the resource you want to access.
     * @param {RequestOptions} [options={}] - The options for the request.
     * @returns {Promise<ResponseBody>} The result of the request.
     */
    delete(path: string, options?: RequestOptions): Promise<ResponseBody>;
    /**
     * Returns the response headers of a request to the given path.
     *
     * @async
     * @param {string} path - The path to the resource you want to access.
     * @param {RequestOptions} [options={}] - The options for the request.
     * @returns {Promise<ResponseBody>} A promise that resolves to the response object.
     */
    head(path: string, options?: RequestOptions): Promise<ResponseBody>;
    /**
     * It takes a path and options, and returns a request with the method set to OPTIONS.
     *
     * @async
     * @param {string} path - The path to the resource.
     * @param {RequestOptions} [options={}] - The options for the request.
     * @returns {Promise<ResponseBody>} The return value of the #request method.
     */
    options(path: string, options?: RequestOptions): Promise<ResponseBody>;
    /**
     * It takes a path and options, and makes a request to the server.
     *
     * @async
     * @param {string} path - The path to the endpoint you want to hit.
     * @param {RequestOptions} [options={}] - The options for the request.
     * @returns {Promise<ResponseBody>} The return value of the function is the return value of the function that is passed to the `then` method of the promise returned by the `fetch` method.
     */
    request(path: string, options?: RequestOptions): Promise<ResponseBody>;
    /**
     * It gets a JSON resource from the server.
     *
     * @async
     * @param {string} path - The path to the resource.
     * @param {RequestOptions} [options={}] - The options object to pass to the request.
     * @returns {Promise<JsonObject>} A promise that resolves to the response body as a JSON object.
     */
    getJson(path: string, options?: RequestOptions): Promise<JsonObject>;
    /**
     * It gets the XML representation of the resource at the given path.
     *
     * @async
     * @param {string} path - The path to the resource you want to get.
     * @param {RequestOptions} [options={}] - The options for the request.
     * @returns {Promise<Document>} The result of the function call to #get.
     */
    getXml(path: string, options?: RequestOptions): Promise<Document>;
    /**
     * TODO - Add way to return portion of the retrieved HTML using a selector. Like jQuery.
     *
     * @async
     * @param {string} path
     * @param {RequestOptions} [options = {}]
     * @returns {Promise<Document>}
     */
    /**
     * Get the HTML content of the specified path.
     *
     * @todo Add way to return portion of the retrieved HTML using a selector. Like jQuery.
     * @async
     * @param {string} path - The path to the resource.
     * @param {RequestOptions} [options={}] - The options for the request.
     * @returns {Promise<Document>} The return value of the function is the return value of the function passed to the `then`
     * method of the promise returned by the `#get` method.
     */
    getHtml(path: string, options?: RequestOptions): Promise<Document>;
    /**
     * It returns a promise that resolves to the HTML fragment at the given path.
     *
     * @todo - Add way to return portion of the retrieved HTML using a selector. Like jQuery.
     * @async
     * @param {string} path - The path to the resource.
     * @param {RequestOptions} [options={}] - The options for the request.
     * @returns {Promise<DocumentFragment>} A promise that resolves to an HTML fragment.
     */
    getHtmlFragment(path: string, options?: RequestOptions): Promise<DocumentFragment>;
    /**
     * It gets a script from the server, and appends the script to the {@link Document} {@link HTMLHeadElement}
     * CORS is enabled by default.
     *
     * @async
     * @param {string} path - The path to the script.
     * @param {RequestOptions} [options={}] - The options for the request.
     * @returns {Promise<void>} A promise that has been resolved.
     */
    getScript(path: string, options?: RequestOptions): Promise<void>;
    /**
     * Gets a stylesheet from the server, and adds it as a {@link Blob} {@link URL}.
     *
     * @async
     * @param {string} path - The path to the stylesheet.
     * @param {RequestOptions} [options={}] - The options for the request.
     * @returns {Promise<void>} A promise that has been resolved.
     */
    getStylesheet(path: string, options?: RequestOptions): Promise<void>;
    /**
     * It returns a blob from the specified path.
     *
     * @async
     * @param {string} path - The path to the resource.
     * @param {RequestOptions} [options={}] - The options for the request.
     * @returns {Promise<Blob>} A promise that resolves to a blob.
     */
    getBlob(path: string, options?: RequestOptions): Promise<Blob>;
    /**
     * It returns a promise that resolves to an object URL.
     *
     * @async
     * @param {string} path - The path to the resource.
     * @param {RequestOptions} [options={}] - The options for the request.
     * @returns {Promise<string>} A promise that resolves to an object URL.
     */
    getImage(path: string, options?: RequestOptions): Promise<string>;
    /**
     * It gets a buffer from the specified path
     *
     * @async
     * @param {string} path - The path to the resource.
     * @param {RequestOptions} [options={}] - The options for the request.
     * @returns {Promise<ArrayBuffer>} A promise that resolves to a buffer.
     */
    getBuffer(path: string, options?: RequestOptions): Promise<ArrayBuffer>;
    /**
     * It returns a readable stream of the response body from the specified path.
     *
     * @async
     * @param {string} path - The path to the resource.
     * @param {RequestOptions} [options={}] - The options for the request.
     * @returns {Promise<ReadableStream<Uint8Array>>} A readable stream.
     */
    getStream(path: string, options?: RequestOptions): Promise<ReadableStream<Uint8Array>>;
    #private;
}
/**
 * <T>
 */
export type ResponseHandler<T> = (arg0: Response) => Promise<T>;
export type JsonObject = {
    [x: string]: (boolean | string | number | any[]);
};
export type RequestBody = Blob | ArrayBuffer | TypedArray | DataView | FormData | URLSearchParams | string | ReadableStream;
export type ResponseBody = JsonObject | Document | DocumentFragment | Blob | ArrayBuffer | FormData | string | ReadableStream<Uint8Array>;
export type RequestCache = 'default' | 'force-cache' | 'no-cache' | 'no-store' | 'only-if-cached' | 'reload';
export type RequestCredentials = 'include' | 'omit' | 'same-origin';
export type RequestHeaders = Headers | {
    [x: string]: string;
};
export type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
export type RequestMode = 'cors' | 'navigate' | 'no-cors' | 'same-origin';
export type RequestRedirect = 'error' | 'follow' | 'manual';
export type SearchParameters = URLSearchParams | FormData | {
    [x: string]: string;
} | string;
export type ReferrerPolicy = '' | 'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'origin-when-cross-origin' | 'same-origin' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url';
export type TypedArray = Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array | BigInt64Array | BigUint64Array;
/**
 * The options for a {@link Request } object or the second parameter of a {@link fetch } request
 */
export type RequestOptions = {
    /**
     * A RequestInit object or null to set request's body.
     */
    body: RequestBody;
    /**
     * A string indicating how the request will interact with the browser's cache to set request's cache.
     */
    cache: RequestCache;
    /**
     * A string indicating whether credentials will be sent with the request always, never, or only when sent to a same-origin URL. Sets request's credentials.
     */
    credentials: RequestCredentials;
    /**
     * A Headers object, an object literal, or an array of two-item arrays to set request's headers.
     */
    headers: RequestHeaders;
    /**
     * A cryptographic hash of the resource to be fetched by request. Sets request's integrity.
     */
    integrity: string;
    /**
     * A boolean to set request's keepalive.
     */
    keepalive: boolean;
    /**
     * A string to set request's method.
     */
    method: RequestMethod;
    /**
     * A string to indicate whether the request will use CORS, or will be restricted to same-origin URLs. Sets request's mode.
     */
    mode: RequestMode;
    /**
     * A string indicating whether request follows redirects, results in an error upon encountering a redirect, or returns the redirect (in an opaque fashion). Sets request's redirect.
     */
    redirect: RequestRedirect;
    /**
     * A string whose value is a same-origin URL, "about:client", or the empty string, to set request's referrer.
     */
    referrer: string;
    /**
     * A referrer policy to set request's referrerPolicy.
     */
    referrerPolicy: ReferrerPolicy;
    /**
     * An AbortSignal to set request's signal.
     */
    signal: AbortSignal;
    /**
     * Can only be null. Used to disassociate request from any Window.
     */
    window: null;
    /**
     * The parameters to be added to the URL for the request.
     */
    searchParams: SearchParameters;
};
export type ResponseStatus = {
    /**
     * The status code.
     */
    code: number;
    /**
     * The status text.
     */
    text: string;
};
//# sourceMappingURL=transportr.d.ts.map