import type { Json, ResponseHandler, ServerSentEvent } from '@types';

/** Cached promise for lazy jsdom initialization — resolved once, reused thereafter */
let domReady: Promise<void> | undefined;

/** Cached promise for lazy DOMPurify initialization — resolved once, reused thereafter */
let purifyReady: Promise<(dirty: string) => string> | undefined;

/**
 * Returns a bound sanitize function, lazily loading DOMPurify on first invocation.
 * Must be called after ensureDom() to ensure the DOM environment is ready.
 * @returns A Promise resolving to the sanitize function.
 */
const getSanitize = (): Promise<(dirty: string) => string> =>
	purifyReady ??= import('dompurify').then(({ default: p }) => (dirty: string): string => p.sanitize(dirty));

/**
 * Ensures a DOM environment is available (document, DOMParser, DocumentFragment).
 * In browser environments this is a no-op. In Node.js it lazily imports jsdom on first call.
 * @returns A Promise that resolves when the DOM environment is ready.
 */
const ensureDom = async (): Promise<void> => {
	if (typeof document !== 'undefined' && typeof DOMParser !== 'undefined' && typeof DocumentFragment !== 'undefined') { return Promise.resolve() }

	return domReady ??= import('jsdom').then(({ JSDOM }) => {
		const { window } = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', { url: 'http://localhost' });
		globalThis.window = window as unknown as Window & typeof globalThis;
		Object.assign(globalThis, { document: window.document, DOMParser: window.DOMParser, DocumentFragment: window.DocumentFragment });
	}).catch(() => {
		domReady = undefined;
		throw new Error('jsdom is required for HTML/XML/DOM features in Node.js environments. Install it with: npm install jsdom');
	});
};

/**
 * Handles a text response.
 * @param response The response object from the fetch request.
 * @returns A Promise that resolves to a string
 */
const handleText: ResponseHandler<string> = async (response) => await response.text();

/**
 * Handles a script response by appending it to the Document HTMLHeadElement
 * Only available in browser environments with DOM support.
 *
 * **Security Warning:** This handler executes arbitrary JavaScript from the server response.
 * Only use with fully trusted content sources. No sanitization is applied to script content.
 * Consider using a Content Security Policy (CSP) nonce for additional protection.
 * @param response The response object from the fetch request.
 * @returns A Promise that resolves to void
 */
const handleScript: ResponseHandler<void> = async (response) => {
	await ensureDom();
	const objectURL = URL.createObjectURL(await response.blob());

	return new Promise((resolve, reject) => {
		const script = document.createElement('script');
		Object.assign(script, { src: objectURL, type: 'text/javascript', async: true });

		/**
		 * Revoke the object URL and resolve the promise once the script has loaded.
		 */
		script.onload = () => {
			URL.revokeObjectURL(objectURL);
			document.head.removeChild(script);
			resolve();
		};

		/**
		 * Revoke the object URL and reject the promise if the script fails to load.
		 */
		script.onerror = () => {
			URL.revokeObjectURL(objectURL);
			document.head.removeChild(script);
			reject(new Error('Script failed to load'));
		};

		document.head.appendChild(script);
	});
};

/**
 * Handles a CSS response by appending it to the Document HTMLHeadElement.
 * Only available in browser environments with DOM support.
 * @param response The response object from the fetch request.
 * @returns A Promise that resolves to void
 */
const handleCss: ResponseHandler<void> = async (response) => {
	await ensureDom();
	const objectURL = URL.createObjectURL(await response.blob());

	return new Promise((resolve, reject) => {
		const link = document.createElement('link');
		Object.assign(link, { href: objectURL, type: 'text/css', rel: 'stylesheet' });

		/**
		 * Revoke the object URL and resolve the promise once the stylesheet has loaded.
		 * @returns A Promise that resolves to void
		 */
		link.onload = () => resolve(URL.revokeObjectURL(objectURL));

		/**
		 * Revoke the object URL, remove the link element, and reject the promise if the stylesheet fails to load.
		 */
		link.onerror = () => {
			URL.revokeObjectURL(objectURL);
			document.head.removeChild(link);
			reject(new Error('Stylesheet load failed'));
		};

		document.head.appendChild(link);
	});
};

/**
 * Handles a JSON response.
 * @param response The response object from the fetch request.
 * @returns A Promise that resolves to a JsonObject
 */
const handleJson: ResponseHandler<Json> = async (response) => await response.json() as Json;

/**
 * Handles a Blob response.
 * @param response The response object from the fetch request.
 * @returns A Promise that resolves to a Blob
 */
const handleBlob: ResponseHandler<Blob> = async (response) => await response.blob();

/**
 * Handles an image response by creating an object URL and returning an HTMLImageElement.
 * The object URL is revoked once the image is loaded to prevent memory leaks.
 * Works in both browser and Node.js (via JSDOM) environments.
 * @param response The response object from the fetch request.
 * @returns A Promise that resolves to an HTMLImageElement
 */
const handleImage: ResponseHandler<HTMLImageElement> = async (response) => {
	await ensureDom();
	const objectURL = URL.createObjectURL(await response.blob());

	return new Promise((resolve, reject) => {
		const img = new Image();

		/**
		 * Revoke the object URL once the image has loaded to free up memory and resolve with the image.
		 */
		img.onload = () => {
			URL.revokeObjectURL(objectURL);
			resolve(img);
		};

		/**
		 * Revoke the object URL and reject the promise if the image fails to load.
		 */
		img.onerror = () => {
			URL.revokeObjectURL(objectURL);
			reject(new Error('Image failed to load'));
		};

		img.src = objectURL;
	});
};

/**
 * Handles a buffer response.
 * @param response The response object from the fetch request.
 * @returns A Promise that resolves to an ArrayBuffer
 */
const handleBuffer: ResponseHandler<ArrayBuffer> = async (response) => await response.arrayBuffer();

/**
 * Handles a ReadableStream response.
 * @param response The response object from the fetch request.
 * @returns A Promise that resolves to a ReadableStream
 */
const handleReadableStream: ResponseHandler<ReadableStream<Uint8Array> | null> = async (response) => Promise.resolve(response.body);

/**
 * Handles an XML response.
 * Only available in environments with DOM support.
 * @param response The response object from the fetch request.
 * @returns A Promise that resolves to a Document
 */
const handleXml: ResponseHandler<Document> = async (response) => {
	await ensureDom();
	const sanitize = await getSanitize();
	return new DOMParser().parseFromString(sanitize(await response.text()), 'application/xml');
};

/**
 * Handles an HTML response.
 * Only available in environments with DOM support.
 * @param response The response object from the fetch request.
 * @returns A Promise that resolves to a Document
 */
const handleHtml: ResponseHandler<Document> = async (response) => {
	await ensureDom();
	const sanitize = await getSanitize();
	return new DOMParser().parseFromString(sanitize(await response.text()), 'text/html');
};

/**
 * Handles an HTML fragment response.
 * Only available in environments with DOM support.
 * @param response The response object from the fetch request.
 * @returns A Promise that resolves to a DocumentFragment
 */
const handleHtmlFragment: ResponseHandler<DocumentFragment> = async (response) => {
	await ensureDom();
	const sanitize = await getSanitize();
	return document.createRange().createContextualFragment(sanitize(await response.text()));
};

/**
 * Parses a text/event-stream response into an AsyncIterable of ServerSentEvent objects.
 * Follows the EventStream specification for field parsing (event, data, id, retry).
 * The returned iterable respects abort signals — iteration ends when the stream closes or is aborted.
 * @param response The response object from the fetch request.
 * @returns An AsyncIterable of parsed ServerSentEvent objects.
 */
const handleEventStream = (response: Response): AsyncIterable<ServerSentEvent> => {
	return {
		/** @returns An async iterator for SSE events. */
		[Symbol.asyncIterator](): AsyncIterator<ServerSentEvent> {
			const reader = response.body!.getReader();
			const decoder = new TextDecoder();
			let buffer = '';
			let done = false;

			return {
				/** @returns The next parsed SSE event or done signal. */
				async next(): Promise<IteratorResult<ServerSentEvent>> {
					while (!done) {
						// Try to extract a complete event from the buffer
						const eventEnd = buffer.indexOf('\n\n');
						if (eventEnd !== -1) {
							const rawEvent = buffer.slice(0, eventEnd);
							buffer = buffer.slice(eventEnd + 2);

							const sse: ServerSentEvent = { event: 'message', data: '', id: '', retry: undefined };
							const dataLines: string[] = [];

							const lines = rawEvent.split('\n');
							for (let i = 0; i < lines.length; i++) {
								const line = lines[i]!;
								// comment line, ignore
								if (line.startsWith(':')) { continue }

								const colonIndex = line.indexOf(':');
								let field: string;
								let value: string;
								if (colonIndex === -1) {
									field = line;
									value = '';
								} else {
									field = line.slice(0, colonIndex);
									value = line.slice(colonIndex + 1);
									// strip leading space
									if (value.charCodeAt(0) === 32) { value = value.slice(1) }
								}

								switch (field) {
									case 'event': sse.event = value; break;
									case 'data': dataLines.push(value); break;
									case 'id': sse.id = value; break;
									case 'retry': {
										const n = parseInt(value, 10);
										if (!isNaN(n)) sse.retry = n;
										break;
									}
								}
							}

							sse.data = dataLines.join('\n');
							if (sse.data || sse.event !== 'message') {
								return { value: sse, done: false };
							}
							continue; // empty event, skip
						}

						// Read more data from the stream
						const result = await reader.read();
						if (result.done) {
							done = true;
							break;
						}
						buffer += decoder.decode(result.value, { stream: true });
					}

					return { value: undefined as unknown as ServerSentEvent, done: true };
				},

				/** @returns Done signal after cancelling the reader. */
				async return(): Promise<IteratorResult<ServerSentEvent>> {
					await reader.cancel();
					done = true;
					return { value: undefined as unknown as ServerSentEvent, done: true };
				}
			};
		}
	};
};

/**
 * Parses an NDJSON (Newline Delimited JSON) response into an AsyncIterable of typed JSON values.
 * Each line of the response is parsed as an independent JSON object.
 * The returned iterable respects abort signals — iteration ends when the stream closes or is aborted.
 * @param response The response object from the fetch request.
 * @returns An AsyncIterable of parsed JSON values.
 */
const handleNdjsonStream = <T = Json>(response: Response): AsyncIterable<T> => {
	return {
		/** @returns An async iterator for NDJSON lines. */
		[Symbol.asyncIterator](): AsyncIterator<T> {
			const reader = response.body!.getReader();
			const decoder = new TextDecoder();
			let buffer = '';
			let done = false;

			return {
				/** @returns The next parsed JSON value or done signal. */
				async next(): Promise<IteratorResult<T>> {
					while (!done) {
						const lineEnd = buffer.indexOf('\n');
						if (lineEnd !== -1) {
							const line = buffer.slice(0, lineEnd).trim();
							buffer = buffer.slice(lineEnd + 1);
							if (line) {
								return { value: JSON.parse(line) as T, done: false };
							}
							continue; // empty line, skip
						}

						const result = await reader.read();
						if (result.done) {
							done = true;
							// Process remaining buffer
							const remaining = (buffer + decoder.decode()).trim();
							buffer = '';
							if (remaining) {
								return { value: JSON.parse(remaining) as T, done: false };
							}
							break;
						}
						buffer += decoder.decode(result.value, { stream: true });
					}

					return { value: undefined as unknown as T, done: true };
				},

				/** @returns Done signal after cancelling the reader. */
				async return(): Promise<IteratorResult<T>> {
					await reader.cancel();
					done = true;
					return { value: undefined as unknown as T, done: true };
				}
			};
		}
	};
};

export { handleText, handleScript, handleCss, handleJson, handleBlob, handleImage, handleBuffer, handleReadableStream, handleXml, handleHtml, handleHtmlFragment, handleEventStream, handleNdjsonStream };
