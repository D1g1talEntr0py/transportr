import type { DOMPurify } from 'dompurify';
import type { Json, ResponseHandler, ServerSentEvent } from '@types';

/** Cached promise for lazy DOM + DOMPurify initialization — resolved once, reused thereafter */
let domReady: Promise<void> | undefined;
/** DOMPurify instance — set once domReady resolves */
let purify: DOMPurify | undefined;

/**
 * Ensures a DOM environment is available (document, DOMParser, DocumentFragment) and
 * initializes DOMPurify. In browser environments the DOM is already present so only
 * DOMPurify is imported. In Node.js jsdom is lazily set up first.
 * @returns A Promise that resolves when the DOM environment and DOMPurify are ready.
 */
const ensureDom = (): Promise<void> => {
	if (domReady) { return domReady }

	const domSetup: Promise<void> = typeof document === 'undefined' || typeof DOMParser === 'undefined' || typeof DocumentFragment === 'undefined' ?
		import('jsdom').then(({ JSDOM }) => {
			const { window } = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', { url: 'http://localhost' });

			globalThis.window = window as unknown as Window & typeof globalThis;

			Object.assign(globalThis, { document: window.document, DOMParser: window.DOMParser, DocumentFragment: window.DocumentFragment });
		}).catch(() => {
			domReady = undefined;
			throw new Error('jsdom is required for HTML/XML/DOM features in Node.js environments. Install it with: npm install jsdom');
		}) : Promise.resolve();

	return domReady = domSetup.then(() => import('dompurify')).then(({ default: p }) => { purify = p });
};

/**
 * Sanitizes the response text and parses it as a DOM Document using DOMParser.
 * @param response The response to parse.
 * @param mimeType The MIME type to use when parsing the document.
 * @returns A Promise that resolves to a parsed Document.
 */
const parseSanitizedDocument = async (response: Response, mimeType: DOMParserSupportedType): Promise<Document> => {
	await ensureDom();

	return new DOMParser().parseFromString(purify!.sanitize(await response.text()), mimeType);
};

/**
 * Creates an object URL from the response blob, constructs a Promise with the given executor,
 * and ensures the URL is revoked after the promise settles.
 * @param response The response to create the object URL from.
 * @param executor A function receiving the object URL, resolve, and reject callbacks.
 * @returns A Promise that resolves to the value produced by the executor.
 */
const withObjectURL = async <T>(response: Response, executor: (objectURL: string, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void): Promise<T> => {
	await ensureDom();

	const objectURL = URL.createObjectURL(await response.blob());
	try {
		return new Promise<T>((res, rej) => executor(objectURL, res, rej));
	} finally {
		URL.revokeObjectURL(objectURL);
	}
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
const handleScript: ResponseHandler<void> = (response) => {
	return withObjectURL(response, (objectURL, resolve, reject) => {
		const script = document.createElement('script');
		Object.assign(script, { src: objectURL, type: 'text/javascript', async: true });

		/** Resolve the promise once the script has loaded. */
		script.onload = () => {
			document.head.removeChild(script);
			resolve();
		};

		/** Reject the promise if the script fails to load. */
		script.onerror = () => {
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
const handleCss: ResponseHandler<void> = (response) => {
	return withObjectURL(response, (objectURL, resolve, reject) => {
		const link = document.createElement('link');
		Object.assign(link, { href: objectURL, type: 'text/css', rel: 'stylesheet' });

		link.onload = () => resolve();

		/** Remove the link element and reject the promise if the stylesheet fails to load. */
		link.onerror = () => {
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
const handleImage: ResponseHandler<HTMLImageElement> = (response) => withObjectURL(response, (objectURL, resolve, reject) => {
	const img = new Image();

	img.onload = () => resolve(img);
	img.onerror = () => reject(new Error('Image failed to load'));

	img.src = objectURL;
});

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
const handleXml: ResponseHandler<Document> = async (response) => parseSanitizedDocument(response, 'application/xml');

/**
 * Handles an HTML response.
 * Only available in environments with DOM support.
 * @param response The response object from the fetch request.
 * @returns A Promise that resolves to a Document
 */
const handleHtml: ResponseHandler<Document> = async (response) => parseSanitizedDocument(response, 'text/html');

/**
 * Handles an HTML fragment response.
 * Only available in environments with DOM support.
 * @param response The response object from the fetch request.
 * @returns A Promise that resolves to a DocumentFragment
 */
const handleHtmlFragment: ResponseHandler<DocumentFragment> = async (response) => {
	await ensureDom();

	return document.createRange().createContextualFragment(purify!.sanitize(await response.text()));
};

/**
 * Handles an HTML fragment response without sanitization.
 * Only available in environments with DOM support.
 *
 * **Security Warning:** DOMPurify is bypassed entirely. Scripts, inline event handlers,
 * and all other content are preserved as-is. Only use with fully trusted same-origin content.
 * @param response The response object from the fetch request.
 * @returns A Promise that resolves to a DocumentFragment
 */
const handleHtmlFragmentWithScripts: ResponseHandler<DocumentFragment> = async (response) => {
	await ensureDom();

	return document.createRange().createContextualFragment(await response.text());
};

/**
 * Reads delimited segments from a ReadableStream, yielding each segment as a string.
 * Handles buffering, decoding, and automatic reader cancellation on early exit or error.
 * @param body The ReadableStream to read from.
 * @param delimiter The delimiter string that separates segments.
 * @param flushRemaining Whether to yield remaining buffered content when the stream ends.
 * @yields {string} Each delimited segment as a raw string.
 */
async function* readDelimited(body: ReadableStream<Uint8Array>, delimiter: string, flushRemaining: boolean): AsyncGenerator<string> {
	const reader = body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';

	try {
		for (;;) {
			let index: number;
			while ((index = buffer.indexOf(delimiter)) !== -1) {
				yield buffer.slice(0, index);
				buffer = buffer.slice(index + delimiter.length);
			}

			const { done, value } = await reader.read();
			if (done) { break }
			buffer += decoder.decode(value, { stream: true });
		}

		if (flushRemaining) {
			const remaining = (buffer + decoder.decode()).trim();
			if (remaining) { yield remaining }
		}
	} finally {
		await reader.cancel();
	}
}

/**
 * Parses a raw SSE event block into a ServerSentEvent object.
 * Follows the EventStream specification for field parsing (event, data, id, retry).
 * @param rawEvent The raw event text (lines separated by \n, without the trailing \n\n delimiter).
 * @returns A parsed ServerSentEvent, or undefined for empty dispatch events.
 */
const parseServerSentEvent = (rawEvent: string): ServerSentEvent | undefined => {
	let event = 'message';
	let id = '';
	let retry: number | undefined;
	const dataLines: string[] = [];

	const lines = rawEvent.split('\n');
	for (let i = 0, length = lines.length; i < length; i++) {
		const line = lines[i]!;
		// comment line
		if (line.charCodeAt(0) === 58) { continue }

		const colonIndex = line.indexOf(':');
		let field: string;
		let value: string;
		if (colonIndex === -1) {
			field = line;
			value = '';
		} else {
			field = line.slice(0, colonIndex);
			// strip single leading space after colon per spec
			value = line.charCodeAt(colonIndex + 1) === 32	? line.slice(colonIndex + 2)	: line.slice(colonIndex + 1);
		}

		switch (field) {
			case 'event': event = value; break;
			case 'data': dataLines.push(value); break;
			case 'id': id = value; break;
			case 'retry': {
				const n = parseInt(value, 10);
				if (!isNaN(n)) { retry = n }
				break;
			}
		}
	}

	return (dataLines.length > 0 || event !== 'message') ? { event, data: dataLines.join('\n'), id, retry } : undefined;
};

/**
 * Parses a text/event-stream response into an AsyncIterable of ServerSentEvent objects.
 * Follows the EventStream specification for field parsing (event, data, id, retry).
 * The returned iterable respects abort signals — iteration ends when the stream closes or is aborted.
 * @param response The response object from the fetch request.
 * @returns An AsyncIterable of parsed ServerSentEvent objects.
 */
const handleEventStream = (response: Response): AsyncIterable<ServerSentEvent> => ({
	/** @yields {ServerSentEvent} Parsed ServerSentEvent objects from the stream. */
	async *[Symbol.asyncIterator]() {
		for await (const rawEvent of readDelimited(response.body!, '\n\n', false)) {
			if (!rawEvent) { continue }
			const sse = parseServerSentEvent(rawEvent);
			if (sse) { yield sse }
		}
	}
});

/**
 * Parses an NDJSON (Newline Delimited JSON) response into an AsyncIterable of typed JSON values.
 * Each line of the response is parsed as an independent JSON object.
 * The returned iterable respects abort signals — iteration ends when the stream closes or is aborted.
 * @param response The response object from the fetch request.
 * @returns An AsyncIterable of parsed JSON values.
 */
const handleNdjsonStream = <T = Json>(response: Response): AsyncIterable<T> => ({
	/** @yields {T} Parsed JSON values from the NDJSON stream. */
	async *[Symbol.asyncIterator]() {
		for await (const line of readDelimited(response.body!, '\n', true)) {
			const trimmed = line.trim();
			if (trimmed) { yield JSON.parse(trimmed) as T }
		}
	}
});

export {
	handleText,
	handleScript,
	handleCss,
	handleJson,
	handleBlob,
	handleImage,
	handleBuffer,
	handleReadableStream,
	handleXml,
	handleHtml,
	handleHtmlFragment,
	handleHtmlFragmentWithScripts,
	handleEventStream,
	handleNdjsonStream
};
