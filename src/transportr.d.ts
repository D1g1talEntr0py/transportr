export default class Transportr {
    /**
     * @static
     * @constant {Object<string, MediaType>}
     */
    static "__#2@#MediaType": {
        JSON: MediaType;
        XML: MediaType;
        HTML: MediaType;
        SCRIPT: MediaType;
        TEXT: MediaType;
        CSS: MediaType;
        WEBP: MediaType;
        PNG: MediaType;
        GIF: MediaType;
        JPG: MediaType;
        OTF: MediaType;
        WOFF: MediaType;
        WOFF2: MediaType;
        TTF: MediaType;
        PDF: MediaType;
    };
    /**
     * @static
     * @type {SetMultiMap<ResponseHandler<ResponseBody>, string>}
     */
    static "__#2@#contentTypeHandlers": SetMultiMap<ResponseHandler<ResponseBody>, string>;
    /**
     * @static
     * @constant {Object<string, 'GET'|'POST'|'PUT'|'PATCH'|'DELETE'|'HEAD'|'OPTIONS'|'TRACE'|'CONNECT'>}
     */
    static Method: Readonly<{
        OPTIONS: string;
        GET: string;
        HEAD: string;
        POST: string;
        PUT: string; /**
         * TODO - Do I need this? What special handling might this need??
         *
         * @async
         * @param {string} path
         * @param {RequestOptions} [options = {}]
         * @returns {Promise<string>}
         */
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
        BIN: string;
        BMP: string; /** @typedef {Object<string, (boolean|string|number|Array)>} JsonObject */
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
     * @type {Object<string, string>}
     */
    static CredentialsPolicy: {
        [x: string]: string;
    };
    /**
     *
     * @private
     * @static
     * @param {URL} url
     * @param {string} path
     * @param {Object} [searchParams = {}]
     * @returns {URL}
     */
    private static "__#2@#createUrl";
    /**
     *
     * @private
     * @static
     * @async
     * @param {Response} response
     * @returns {Promise<ResponseBody|Response>}
     */
    private static "__#2@#processResponse";
    /**
     * Create a new Transportr instance with the provided location or origin and context path.
     *
     * @param {URL | string} [url = location.origin] The URL for {@link fetch} requests.
     */
    constructor(url?: URL | string);
    /**
     *
     * @returns {URL} The base URL used for requests
     */
    get baseUrl(): URL;
    /**
     *
     * @async
     * @param {string} path
     * @param {RequestOptions} [options = {}]
     * @returns {Promise<*>}
     */
    get(path: string, options?: RequestOptions): Promise<any>;
    /**
     *
     * @async
     * @param {string} path
     * @param {Object} body
     * @param {RequestOptions} [options = {}]
     * @returns {Promise<*>}
     */
    post(path: string, body: any, options?: RequestOptions): Promise<any>;
    /**
     *
     * @async
     * @param {string} path
     * @param {RequestOptions} [options = {}]
     * @returns {Promise<*>}
     */
    put(path: string, options?: RequestOptions): Promise<any>;
    /**
     *
     * @async
     * @param {string} path
     * @param {RequestOptions} [options = {}]
     * @returns {Promise<*>}
     */
    patch(path: string, options?: RequestOptions): Promise<any>;
    /**
     *
     * @async
     * @param {string} path
     * @param {RequestOptions} [options = {}]
     * @returns {Promise<*>}
     */
    delete(path: string, options?: RequestOptions): Promise<any>;
    /**
     *
     * @async
     * @param {string} path
     * @param {RequestOptions} [options = {}]
     * @returns {Promise<*>}
     */
    head(path: string, options?: RequestOptions): Promise<any>;
    /**
     *
     * @async
     * @param {string} path
     * @param {RequestOptions} [options = {}]
     * @returns {Promise<*>}
     */
    options(path: string, options?: RequestOptions): Promise<any>;
    /**
     *
     * @async
     * @param {string} path
     * @param {RequestOptions} [options = {}]
     * @returns {Promise<*>}
     */
    request(path: string, options?: RequestOptions): Promise<any>;
    /**
     *
     * @async
     * @param {string} path
     * @param {RequestOptions} [options = {}]
     * @returns {Promise<JsonObject>}
     */
    getJson(path: string, options?: RequestOptions): Promise<JsonObject>;
    /**
     *
     * @async
     * @param {string} path
     * @param {RequestOptions} [options = {}]
     * @returns {Promise<Document>}
     */
    getXml(path: string, options?: RequestOptions): Promise<Document>;
    /**
     * TODO - Add way to return portion of the retrieved HTML using a selector. Like jQuery.
     *
     * @async
     * @param {string} path
     * @param {RequestOptions} [options = {}]
     * @returns {Promise<string>}
     */
    getHtml(path: string, options?: RequestOptions): Promise<string>;
    /**
     * TODO - Do I need this? What special handling might this need??
     *
     * @async
     * @param {string} path
     * @param {RequestOptions} [options = {}]
     * @returns {Promise<string>}
     */
    getScript(path: string, options?: RequestOptions): Promise<string>;
    /**
     *
     * @async
     * @param {string} path
     * @param {RequestOptions} [options = {}]
     * @returns {Promise<Blob>}
     */
    getBlob(path: string, options?: RequestOptions): Promise<Blob>;
    /**
     *
     * @async
     * @param {string} path
     * @param {RequestOptions} [options = {}]
     * @returns {Promise<string>}
     */
    getImage(path: string, options?: RequestOptions): Promise<string>;
    /**
     *
     * @async
     * @param {string} path
     * @param {RequestOptions} [options = {}]
     * @returns {Promise<ArrayBuffer>}
     */
    getBuffer(path: string, options?: RequestOptions): Promise<ArrayBuffer>;
    /**
     *
     * @async
     * @param {string} path
     * @param {RequestOptions} [options = {}]
     * @returns {Promise<ReadableStream<Uint8Array>}
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
export type ResponseBody = Blob | ArrayBuffer | FormData | string | ReadableStream;
export type RequestCache = 'default' | 'force-cache' | 'no-cache' | 'no-store' | 'only-if-cached' | 'reload';
export type RequestCredentials = 'include' | 'omit' | 'same-origin';
export type RequestHeaders = Headers | {
    [x: string]: string;
};
export type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
export type RequestMode = 'cors' | 'navigate' | 'no-cors' | 'same-origin';
export type RequestRedirect = 'error' | 'follow' | 'manual';
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
};
import { MediaType } from "@d1g1tal/media-type";
import { SetMultiMap } from "@d1g1tal/collections";
