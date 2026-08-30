import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';

/** A request recorded by the test server. */
export type RecordedRequest = {
	method: string;
	pathname: string;
	query: Record<string, string>;
	headers: Record<string, string>;
	body: string;
};

/** A running test server instance. */
export type TestServer = {
	/** The origin the server is listening on, e.g. `http://127.0.0.1:47821`. */
	url: string;
	/** Every request the server has received, in order. */
	requests: RecordedRequest[];
	/** Clears recorded requests and the `/flaky` failure counters. */
	reset(): void;
	/** Stops the server and destroys any open connections. */
	close(): Promise<void>;
};

/** A real 1x1 transparent PNG. */
const onePixelPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

const htmlDocument = `<!DOCTYPE html>
<html><head><title>Test Page</title></head>
<body><h1 id="heading">Transportr</h1><p class="content">Hello</p>
<script id="inline-script">globalThis.__transportrScriptRan = true;</script>
<div id="clickable" onclick="globalThis.__transportrClicked = true">Click</div>
</body></html>`;

const xmlDocument = '<?xml version="1.0" encoding="UTF-8"?><catalog><artist id="1"><name>Miles Davis</name></artist></catalog>';

/**
 * Reads the full request body as a UTF-8 string.
 * @param request The incoming request.
 * @returns The request body.
 */
const readBody = async (request: IncomingMessage): Promise<string> => {
	const chunks: Buffer[] = [];
	for await (const chunk of request) { chunks.push(chunk as Buffer) }

	return Buffer.concat(chunks).toString('utf8');
};

/**
 * Sends a response with the given status, content type and body.
 * @param response The server response.
 * @param status The status code.
 * @param contentType The `content-type` header value.
 * @param body The response body.
 */
const send = (response: ServerResponse, status: number, contentType: string, body: string | Buffer): void => {
	response.writeHead(status, { 'content-type': contentType, 'content-length': Buffer.byteLength(body) });
	response.end(body);
};

/**
 * Starts a real HTTP server on an ephemeral port for use in tests.
 * @returns The running test server.
 */
export const startTestServer = async (): Promise<TestServer> => {
	const requests: RecordedRequest[] = [];
	const failureCounts = new Map<string, number>();
	const timers = new Set<NodeJS.Timeout>();

	/**
	 * Schedules work, tracking the timer so it can be cancelled on shutdown.
	 * @param callback The work to run.
	 * @param delay The delay in milliseconds.
	 */
	const schedule = (callback: () => void, delay: number): void => {
		const timer = setTimeout(() => {
			timers.delete(timer);
			callback();
		}, delay);
		timers.add(timer);
	};

	const server = createServer((request, response) => {
		void (async () => {
			const { pathname, searchParams } = new URL(request.url ?? '/', 'http://localhost');
			const body = await readBody(request);

			requests.push({
				method: request.method ?? 'GET',
				pathname,
				query: Object.fromEntries(searchParams),
				headers: Object.fromEntries(Object.entries(request.headers).map(([ name, value ]) => [ name, Array.isArray(value) ? value.join(', ') : value ?? '' ])),
				body
			});

			if (pathname === '/json') { return send(response, 200, 'application/json', JSON.stringify({ id: '1', firstName: 'Miles', lastName: 'Davis' })) }
			if (pathname === '/text') { return send(response, 200, 'text/plain', 'hello') }
			if (pathname === '/html') { return send(response, 200, 'text/html', htmlDocument) }
			if (pathname === '/xml') { return send(response, 200, 'application/xml', xmlDocument) }
			if (pathname === '/binary') { return send(response, 200, 'application/octet-stream', Buffer.from([ 1, 2, 3 ])) }
			if (pathname === '/script.js') { return send(response, 200, 'text/javascript', 'globalThis.__transportrScriptLoaded = true;') }
			if (pathname === '/style.css') { return send(response, 200, 'text/css', 'body { color: red; }') }
			if (pathname === '/image.png') { return send(response, 200, 'image/png', onePixelPng) }

			if (pathname === '/echo') {
				const { method = 'GET', headers } = request;
				const normalizedHeaders = Object.fromEntries(Object.entries(headers).map(([ name, value ]) => [ name, Array.isArray(value) ? value.join(', ') : value ?? '' ]));

				return send(response, 200, 'application/json', JSON.stringify({ method, pathname, query: Object.fromEntries(searchParams), headers: normalizedHeaders, body }));
			}

			if (pathname === '/upload') {
				return send(response, 200, 'application/json', JSON.stringify({ received: Buffer.byteLength(body) }));
			}

			if (pathname === '/no-content-type') {
				const payload = 'untyped payload';
				response.writeHead(200, { 'content-length': Buffer.byteLength(payload) });

				return response.end(payload);
			}

			if (pathname === '/set-cookie') {
				response.writeHead(200, { 'content-type': 'application/json', 'set-cookie': 'XSRF-TOKEN=server-token; Path=/' });

				return response.end('{"ok":true}');
			}

			if (pathname.startsWith('/delay/')) {
				const milliseconds = Number(pathname.slice('/delay/'.length)) || 0;

				return schedule(() => {
					if (!response.writableEnded) { send(response, 200, 'application/json', JSON.stringify({ delayed: milliseconds })) }
				}, milliseconds);
			}

			if (pathname.startsWith('/status/')) {
				const status = Number(pathname.slice('/status/'.length)) || 500;

				return send(response, status, 'application/json', JSON.stringify({ error: 'expected failure', status }));
			}

			if (pathname === '/retry-after') {
				response.writeHead(429, { 'content-type': 'application/json', 'retry-after': searchParams.get('after') ?? '1' });

				return response.end('{"error":"too many requests"}');
			}

			if (pathname === '/flaky') {
				const key = searchParams.get('key') ?? 'default';
				const failures = Number(searchParams.get('failures') ?? '1');
				const seen = failureCounts.get(key) ?? 0;
				failureCounts.set(key, seen + 1);

				if (seen < failures) { return send(response, 503, 'application/json', JSON.stringify({ error: 'service unavailable', attempt: seen + 1 })) }

				return send(response, 200, 'application/json', JSON.stringify({ ok: true, attempts: seen + 1 }));
			}

			if (pathname === '/stream' || pathname === '/no-length') {
				const chunks = [ 'chunk-1;', 'chunk-2;', 'chunk-3;' ];
				const headers: Record<string, string> = { 'content-type': 'text/plain' };
				// `/no-length` deliberately omits content-length so download progress cannot compute a ratio.
				if (pathname === '/stream') { headers['content-length'] = String(Buffer.byteLength(chunks.join(''))) }
				response.writeHead(200, headers);

				let index = 0;
				/** Writes the next chunk, ending the response once all chunks are sent. */
				const writeNext = (): void => {
					if (response.writableEnded) { return }
					if (index === chunks.length) {
						response.end();

						return;
					}
					response.write(chunks[index++]);
					schedule(writeNext, 5);
				};

				return writeNext();
			}

			return send(response, 404, 'application/json', JSON.stringify({ error: 'not found', pathname }));
		})();
	});

	server.listen(0, '127.0.0.1');
	await once(server, 'listening');

	const { port } = server.address() as AddressInfo;

	return {
		url: `http://127.0.0.1:${port}`,
		requests,
		reset() {
			requests.length = 0;
			failureCounts.clear();
		},
		async close() {
			for (const timer of timers) { clearTimeout(timer) }
			timers.clear();
			server.closeAllConnections();
			server.close();
			await once(server, 'close');
		}
	};
};
