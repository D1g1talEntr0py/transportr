const HttpRequestHeader = {
	/**
	 * Content-Types that are acceptable for the response. See Content negotiation. Permanent.
	 *
	 * @example
	 * <code>Accept: text/plain</code>
	 */
	ACCEPT: 'accept',
	/**
	 * Character sets that are acceptable. Permanent.
	 *
	 * @example
	 * <code>Accept-Charset: utf-8</code>
	 */
	ACCEPT_CHARSET: 'accept-charset',
	/**
	 * List of acceptable encodings. See HTTP compression. Permanent.
	 *
	 * @example
	 * <code>Accept-Encoding: gzip, deflate</code>
	 */
	ACCEPT_ENCODING: 'accept-encoding',
	/**
	 * List of acceptable human languages for response. See Content negotiation. Permanent.
	 *
	 * @example
	 * <code>Accept-Language: en-US</code>
	 */
	ACCEPT_LANGUAGE: 'accept-language',
	/**
	 * Authentication credentials for HTTP authentication. Permanent.
	 *
	 * @example
	 * <code>Authorization: Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==</code>
	 */
	AUTHORIZATION: 'authorization',
	/**
	 * Used to specify directives that must be obeyed by all caching mechanisms along the request-response chain.
	 * Permanent.
	 *
	 * @example
	 * <code>Cache-Control: no-cache</code>
	 */
	CACHE_CONTROL: 'cache-control',
	/**
	 * Control options for the current connection and list of hop-by-hop request fields. Permanent.
	 *
	 * @example
	 * <code>Connection: keep-alive</code>
	 * <code>Connection: Upgrade</code>
	 */
	CONNECTION: 'connection',
	/**
	 * An HTTP cookie previously sent by the server with Set-Cookie (below). Permanent: standard.
	 *
	 * @example
	 * <code>Cookie: $Version=1, Skin=new,</code>
	 */
	COOKIE: 'cookie',
	/**
	 * The length of the request body in octets (8-bit bytes). Permanent.
	 *
	 * @example
	 * <code>Content-Length: 348</code>
	 */
	CONTENT_LENGTH: 'content-length',
	/**
	 * A Base64-encoded binary MD5 sum of the content of the request body. Obsolete.
	 *
	 * @example
	 * <code>Content-MD5: Q2hlY2sgSW50ZWdyaXR5IQ==</code>
	 */
	CONTENT_MD5: 'content-md5',
	/**
	 * The MIME type of the body of the request (used with POST and PUT requests). Permanent.
	 * <code>Content-Type: application/x-www-form-urlencoded</code>
	 */
	CONTENT_TYPE: 'content-type',
	/**
	 * The date and time that the message was sent (in "HTTP-date" format as defined by RFC 7231 Date/Time Formats).
	 * Permanent.
	 *
	 * @example
	 * <code>Date: Tue, 15 Nov 1994 08:12:31 GMT</code>
	 */
	DATE: 'date',
	/**
	 * Indicates that particular server behaviors are required by the client. Permanent.
	 *
	 * @example
	 * <code>Expect: 100-continue</code>
	 */
	EXPECT: 'expect',
	/**
	 * The email address of the user making the request. Permanent.
	 *
	 * @example
	 * <code>From: user@example.com</code>
	 */
	FROM: 'from',
	/**
	 * The domain name of the server (for virtual hosting), and the TCP port number on which the server is listening. The
	 * port number may be omitted if the port is the standard port for the service requested. Permanent. Mandatory since
	 * HTTP/1.1.
	 *
	 * @example
	 * <code>Host: en.wikipedia.org:80</code>
	 * <code>Host: en.wikipedia.org</code>
	 */
	HOST: 'host',
	/**
	 * Only perform the action if the client supplied entity matches the same entity on the server. This is mainly for
	 * methods like PUT to only update a resource if it has not been modified since the user last updated it. Permanent.
	 *
	 * @example
	 * <code>If-Match: "737060cd8c284d8af7ad3082f209582d"</code>
	 */
	IF_MATCH: 'if-match',
	/**
	 * Allows a 304 Not Modified to be returned if content is unchanged. Permanent.
	 *
	 * @example
	 * <code>If-Modified-Since: Sat, 29 Oct 1994 19:43:31 GMT</code>
	 */
	IF_MODIFIED_SINCE: 'if-modified-since',
	/**
	 * Allows a 304 Not Modified to be returned if content is unchanged, see HTTP ETag. Permanent.
	 *
	 * @example
	 * <code>If-None-Match: "737060cd8c284d8af7ad3082f209582d"</code>
	 */
	IF_NONE_MATCH: 'if-none-match',
	/**
	 * If the entity is unchanged, send me the part(s) that I am missing, otherwise, send me the entire new entity.
	 * Permanent.
	 *
	 * @example
	 * <code>If-Range: "737060cd8c284d8af7ad3082f209582d"</code>
	 */
	IF_RANGE: 'if-range',
	/**
	 * Only send the response if the entity has not been modified since a specific time. Permanent.
	 *
	 * @example
	 * <code>If-Unmodified-Since: Sat, 29 Oct 1994 19:43:31 GMT</code>
	 */
	IF_UNMODIFIED_SINCE: 'if-unmodified-since',
	/**
	 * Limit the number of times the message can be forwarded through proxies or gateways. Permanent.
	 *
	 * @example
	 * <code>Max-Forwards: 10</code>
	 */
	MAX_FORWARDS: 'max-forwards',
	/**
	 * Initiates a request for cross-origin resource sharing (asks server for an 'Access-Control-Allow-Origin' response
	 * field). Permanent: standard.
	 *
	 * @example
	 * <code>Origin: http://www.example-social-network.com</code>
	 */
	ORIGIN: 'origin',
	/**
	 * Implementation-specific fields that may have various effects anywhere along the request-response chain. Permanent.
	 *
	 * @example
	 * <code>Pragma: no-cache</code>
	 */
	PRAGMA: 'pragma',
	/**
	 * Authorization credentials for connecting to a proxy. Permanent.
	 *
	 * @example
	 * <code>Proxy-Authorization: Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==</code>
	 */
	PROXY_AUTHORIZATION: 'proxy-authorization',
	/**
	 * Request only part of an entity. Bytes are numbered from 0. See Byte serving. Permanent.
	 *
	 * @example
	 * <code>Range: bytes=500-999</code>
	 */
	RANGE: 'range',
	/**
	 * This is the address of the previous web page from which a link to the currently requested page was followed. (The
	 * word "referrer" has been misspelled in the RFC as well as in most implementations to the point that it has become
	 * standard usage and is considered correct terminology). Permanent.
	 *
	 * @example
	 * <code>Referer: http://en.wikipedia.org/wiki/Main_Page</code>
	 */
	REFERER: 'referer',
	/**
	 * The transfer encodings the user agent is willing to accept: the same values as for the response header field
	 * Transfer-Encoding can be used, plus the "trailers" value (related to the "chunked" transfer method) to notify the
	 * server it expects to receive additional fields in the trailer after the last, zero-sized, chunk. Permanent.
	 *
	 * @example
	 * <code>TE: trailers, deflate</code>
	 */
	TE: 'te',
	/**
	 * The user agent string of the user agent. Permanent.
	 *
	 * @example
	 * <code>User-Agent: Mozilla/5.0 (X11, Linux x86_64, rv:12.0) Gecko/20100101 Firefox/21.0</code>
	 */
	USER_AGENT: 'user-agent',
	/**
	 * Ask the server to upgrade to another protocol. Permanent.
	 *
	 * @example
	 * <code>Upgrade: HTTP/2.0, SHTTP/1.3, IRC/6.9, RTA/x11</code>
	 */
	UPGRADE: 'upgrade',
	/**
	 * Informs the server of proxies through which the request was sent. Permanent.
	 *
	 * @example
	 * <code>Via: 1.0 fred, 1.1 example.com (Apache/1.1)</code>
	 */
	VIA: 'via',
	/**
	 * A general warning about possible problems with the entity body. Permanent.
	 *
	 * @example
	 * <code>Warning: 199 Miscellaneous warning</code>
	 */
	WARNING: 'warning',
	/**
	 * mainly used to identify Ajax requests. Most JavaScript frameworks send this field with value of XMLHttpRequest.
	 *
	 * @example
	 * <code>X-Requested-With: XMLHttpRequest</code>
	 */
	X_REQUESTED_WITH: 'x-requested-with',
	/**
	 * Requests a web application to disable their tracking of a user. This is Mozilla's version of the X-Do-Not-Track
	 * header field (since Firefox 4.0 Beta 11). Safari and IE9 also have support for this field. On March 7, 2011, a
	 * draft proposal was submitted to IETF. The W3C Tracking Protection Working Group is producing a specification.
	 *
	 * @example
	 * <code>DNT: 1 (Do Not Track Enabled)</code>
	 * <code>DNT: 0 (Do Not Track Disabled)</code>
	 */
	DNT: 'dnt',
	/**
	 * A de facto standard for identifying the originating IP address of a client connecting to a web server through an
	 * HTTP proxy or load balancer.
	 *
	 * @example
	 * <code>X-Forwarded-For: client1, proxy1, proxy2</code>
	 * <code>X-Forwarded-For: 129.78.138.66, 129.78.64.103</code>
	 */
	X_FORWARDED_FOR: 'x-forwarded-for',
	/**
	 * A de facto standard for identifying the original host requested by the client in the Host HTTP request header, since
	 * the host name and/or port of the reverse proxy (load balancer) may differ from the origin server handling the
	 * request.
	 *
	 * @example
	 * <code>X-Forwarded-Host: en.wikipedia.org:80</code>
	 * <code>X-Forwarded-Host: en.wikipedia.org</code>
	 */
	X_FORWARDED_HOST: 'x-forwarded-host',
	/**
	 * A de facto standard for identifying the originating protocol of an HTTP request, since a reverse proxy (load
	 * balancer) may communicate with a web server using HTTP even if the request to the reverse proxy is HTTPS. An
	 * alternative form of the header (X-ProxyUser-Ip) is used by Google clients talking to Google servers.
	 *
	 * @example
	 * <code>X-Forwarded-Proto: https</code>
	 */
	X_FORWARDED_PROTO: 'x-forwarded-proto',
	/**
	 * Non-standard header field used by Microsoft applications and load-balancers.
	 *
	 * @example
	 * <code>Front-End-Https: on</code>
	 */
	FRONT_END_HTTPS: 'front-end-https',
	/**
	 * Requests a web application override the method specified in the request (typically POST) with the method given in
	 * the header field (typically PUT or DELETE). Can be used when a user agent or firewall prevents PUT or DELETE methods
	 * from being sent directly (note that this either a bug in the software component, which ought to be fixed, or an
	 * intentional configuration, in which case bypassing it may be the wrong thing to do).
	 *
	 * @example
	 * <code>X-HTTP-Method-Override: DELETE</code>
	 */
	X_HTTP_METHOD_OVERRIDE: 'x-http-method-override',
	/**
	 * Allows easier parsing of the MakeModel/Firmware that is usually found in the User-Agent String of AT&T Devices.
	 *
	 * @example
	 * <code>X-Att-Deviceid: GT-P7320/P7320XXLPG</code>
	 */
	X_ATT_DEVICE_ID: 'x-att-deviceid',
	/**
	 * Links to an XML file on the Internet with a full description and details about the device currently connecting. In the example to the right is an XML file for an AT&T Samsung Galaxy S2.
	 * x-wap-profile: http://wap.samsungmobile.com/uaprof/SGH-I777.xml
	 */
	X_WAP_PROFILE: 'x-wap-profile',
};

export default HttpRequestHeader;