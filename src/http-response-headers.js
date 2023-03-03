/**
 * Defining a constant object with a bunch of properties.
 *
 * @module HttpResponseHeader
 * @constant {Object<string, string>}
 */
const HttpResponseHeader = {
	/**
	 * Implemented as a misunderstanding of the HTTP specifications. Common because of mistakes in implementations of early HTTP versions. Has exactly the same functionality as standard Connection field.
	 *
	 * @example
	 * proxy-connection: keep-alive
	 */
	PROXY_CONNECTION: 'proxy-connection',
	/**
	 * Server-side deep packet insertion of a unique ID identifying customers of Verizon Wireless, also known as "perma-cookie" or "supercookie"
	 *
	 * @example
	 * x-uidh: ...
	 */
	X_UIDH: 'x-uidh',
	/**
	 * Used to prevent cross-site request forgery. Alternative header names are: X-CSRFToken and X-XSRF-TOKEN
	 *
	 * @example
	 * x-csrf-token: i8XNjC4b8KVok4uw5RftR38Wgp2BFwql
	 */
	X_CSRF_TOKEN: 'x-csrf-token',
	/**
	 * Specifying which web sites can participate in cross-origin resource sharing
	 *
	 * @example
	 * access-control-allow-origin: *
	 * Provisional
	 */
	ACCESS_CONTROL_ALLOW_ORIGIN: 'access-control-allow-origin',
	/**
	 * Specifies which patch document formats this server supports
	 *
	 * @example
	 * accept-patch: text/example,charset=utf-8
	 * Permanent
	 */
	ACCEPT_PATCH: 'accept-patch',
	/**
	 * What partial content range types this server supports via byte serving
	 *
	 * @example
	 * accept-ranges: bytes
	 * Permanent
	 */
	ACCEPT_RANGES: 'accept-ranges',
	/**
	 * The age the object has been in a proxy cache in seconds
	 *
	 * @example
	 * age: 12
	 * Permanent
	 */
	AGE: 'age',
	/**
	 * Valid actions for a specified resource. To be used for a 405 Method not allowed
	 *
	 * @example
	 * allow: GET, HEAD
	 * Permanent
	 */
	ALLOW: 'allow',
	/**
	 * Tells all caching mechanisms from server to client whether they may cache this object. It is measured in seconds
	 *
	 * @example
	 * cache-control: max-age=3600
	 * Permanent
	 */
	CACHE_CONTROL: 'cache-control',
	/**
	 * Control options for the current connection and list of hop-by-hop response fields
	 *
	 * @example
	 * connection: close
	 * Permanent
	 */
	CONNECTION: 'connection',
	/**
	 * An opportunity to raise a "File Download" dialogue box for a known MIME type with binary format or suggest a filename for dynamic content. Quotes are necessary with special characters.
	 *
	 * @example
	 * content-disposition: attachment, filename="fname.ext"
	 * Permanent
	 */
	CONTENT_DISPOSITION: 'content-disposition',
	/**
	 * The type of encoding used on the data. See HTTP compression.
	 *
	 * @example
	 * content-encoding: gzip
	 * Permanent
	 */
	CONTENT_ENCODING: 'content-encoding',
	/**
	 * The natural language or languages of the intended audience for the enclosed content
	 *
	 * @example
	 * content-language: da
	 * Permanent
	 */
	CONTENT_LANGUAGE: 'content-language',
	/**
	 * The length of the response body in octets (8-bit bytes)
	 *
	 * @example
	 * content-length: 348
	 * Permanent
	 */
	CONTENT_LENGTH: 'content-length',
	/**
	 * An alternate location for the returned data
	 *
	 * @example
	 * content-location: /index.htm
	 * Permanent
	 */
	CONTENT_LOCATION: 'content-location',
	/**
	 * Where in a full body message this partial message belongs
	 *
	 * @example
	 * content-range: bytes 21010-47021/47022
	 * Permanent
	 */
	CONTENT_RANGE: 'content-range',
	/**
	 * The MIME type of this content
	 *
	 * @example
	 * content-type: text/html, charset=utf-8
	 * Permanent
	 */
	CONTENT_TYPE: 'content-type',
	/**
	 * The date and time that the message was sent (in "HTTP-date" format as defined by RFC 7231)
	 *
	 * @example
	 * date: Tue, 15 Nov 1994 08:12:31 GMT
	 * Permanent
	 */
	DATE: 'date',
	/**
	 * An identifier for a specific version of a resource, often a message digest
	 *
	 * @example
	 * etag: "737060cd8c284d8af7ad3082f209582d"
	 * Permanent
	 */
	ETAG: 'etag',
	/**
	 * Gives the date/time after which the response is considered stale (in "HTTP-date" format as defined by RFC 7231)
	 *
	 * @example
	 * expires: Thu, 01 Dec 1994 16:00:00 GMT
	 * Permanent
	 */
	EXPIRES: 'expires',
	/**
	 * The last modified date for the requested object (in "HTTP-date" format as defined by RFC 7231)
	 *
	 * @example
	 * last-modified: Tue, 15 Nov 1994 12:45:26 GMT
	 * Permanent
	 */
	LAST_MODIFIED: 'last-modified',
	/**
	 * Used to express a typed relationship with another resource, where the relation type is defined by RFC 5988
	 *
	 * @example
	 * link: </feed>, rel="alternate"
	 * Permanent
	 */
	LINK: 'link',
	/**
	 * Used in redirection, or when a new resource has been created.
	 *
	 * @example
	 * location: http://www.w3.org/pub/WWW/People.html
	 * Permanent
	 */
	LOCATION: 'location',
	/**
	 * This field is supposed to set P3P policy, in the form of P3P:CP="your_compact_policy". However, P3P did not take off, most browsers have never fully
	 * implemented it, a lot of websites set this field with fake policy text, that was enough to fool browsers the existence of P3P policy and grant permissions for third party cookies.
	 *
	 * @example
	 * p3p: CP="This is not a P3P policy! See http://www.google.com/support/accounts/bin/answer.py?hl=en&answer=151657 for more info."
	 * Permanent
	 */
	P3P: 'p3p',
	/**
	 * Implementation-specific fields that may have various effects anywhere along the request-response chain.
	 *
	 * @example
	 * pragma: no-cache
	 * Permanent
	 */
	PRAGMA: 'pragma',
	/**
	 * Request authentication to access the proxy.
	 *
	 * @example
	 * proxy-authenticate: Basic
	 * Permanent
	 */
	PROXY_AUTHENTICATION: 'proxy-authenticate',
	/**
	 * HTTP Public Key Pinning, announces hash of website's authentic TLS certificate
	 *
	 * @example
	 * public-key-pins: max-age=2592000, pin-sha256="E9CZ9INDbd+2eRQozYqqbQ2yXLVKB9+xcprMF+44U1g=",
	 * Permanent
	 */
	PUBLIC_KEY_PINS: 'public-key-pins',
	/**
	 * If an entity is temporarily unavailable, this instructs the client to try again later. Value could be a specified period of time (in seconds) or a HTTP-date.
	 *
	 * @example
	 * retry-after: 120
	 * retry-after: Fri, 07 Nov 2014 23:59:59 GMT
	 * Permanent
	 */
	RETRY_AFTER: 'retry-after',
	/**
	 * A name for the server
	 *
	 * @example
	 * server: Apache/2.4.1 (Unix)
	 * Permanent
	 */
	SERVER: 'server',
	/**
	 * An HTTP cookie
	 *
	 * @example
	 * set-cookie: UserID=JohnDoe, Max-Age=3600, Version=1
	 * Permanent
	 */
	SET_COOKIE: 'set-cookie',
	/**
	 * CGI header field specifying the status of the HTTP response. Normal HTTP responses use a separate "Status-Line" instead, defined by RFC 7230.
	 *
	 * @example
	 * status: 200 OK
	 */
	STATUS: 'status',
	/**
	 * A HSTS Policy informing the HTTP client how long to cache the HTTPS only policy and whether this applies to subdomains.
	 *
	 * @example
	 * strict-transport-security: max-age=16070400, includeSubDomains
	 * Permanent
	 */
	STRICT_TRANSPORT_SECURITY: 'strict-transport-security',
	/**
	 * The Trailer general field value indicates that the given set of header fields is present in the trailer of a message encoded with chunked transfer coding.
	 *
	 * @example
	 * trailer: Max-Forwards
	 * Permanent
	 */
	TRAILER: 'trailer',
	/**
	 * The form of encoding used to safely transfer the entity to the user. Currently defined methods are: chunked, compress, deflate, gzip, identity.
	 *
	 * @example
	 * transfer-encoding: chunked
	 * Permanent
	 */
	TRANSFER_ENCODING: 'transfer-encoding',
	/**
	 * Ask the client to upgrade to another protocol.
	 *
	 * @example
	 * upgrade: HTTP/2.0, SHTTP/1.3, IRC/6.9, RTA/x11
	 * Permanent
	 */
	UPGRADE: 'upgrade',
	/**
	 * Tells downstream proxies how to match future request headers to decide whether the cached response can be used rather than requesting a fresh one from the origin server.
	 *
	 * @example
	 * vary: *
	 * Permanent
	 */
	VARY: 'vary',
	/**
	 * Informs the client of proxies through which the response was sent.
	 *
	 * @example
	 * via: 1.0 fred, 1.1 example.com (Apache/1.1)
	 * Permanent
	 */
	VIA: 'via',
	/**
	 * A general warning about possible problems with the entity body.
	 *
	 * @example
	 * warning: 199 Miscellaneous warning
	 * Permanent
	 */
	WARNING: 'warning',
	/**
	 * Indicates the authentication scheme that should be used to access the requested entity.
	 *
	 * @example
	 * www-authenticate: Basic
	 * Permanent
	 */
	WWW_AUTHENTICATE: 'www-authenticate',
	/**
	 * Cross-site scripting (XSS) filter
	 *
	 * @example
	 * x-xss-protection: 1, mode=block
	 */
	X_XSS_PROTECTION: 'x-xss-protection',
	/**
	 * The HTTP Content-Security-Policy response header allows web site administrators to control resources the user agent is allowed
	 * to load for a given page. With a few exceptions, policies mostly involve specifying server origins and script endpoints.
	 * This helps guard against cross-site scripting attacks (Cross-site_scripting).
	 *
	 * @example
	 * content-security-policy: default-src
	 */
	CONTENT_SECURITY_POLICY: 'content-security-policy',
	/**
	 * The only defined value, "nosniff", prevents Internet Explorer from MIME-sniffing a response away from the declared content-type. This also applies to Google Chrome, when downloading extensions.
	 *
	 * @example
	 * x-content-type-options: nosniff
	 */
	X_CONTENT_TYPE_OPTIONS: 'x-content-type-options',
	/**
	 * specifies the technology (e.g. ASP.NET, PHP, JBoss) supporting the web application (version details are often in X-Runtime, X-Version, or X-AspNet-Version)
	 *
	 * @example
	 * x-powered-by: PHP/5.4.0
	 */
	X_POWERED_BY: 'x-powered-by'
};

export default HttpResponseHeader;