import type { DOMPurify, Config as SanitizerOptions } from 'dompurify';
import type { Json, ResponseHandler, SanitizationPreset, SanitizationPolicy, ServerSentEvent } from '@types';

const assertNever = (value: never): never => { throw new Error(`Unhandled sanitization preset: ${value}`) };

const balancedSanitizerOptions: SanitizerOptions = {
	ALLOW_ARIA_ATTR: true,
	ALLOW_DATA_ATTR: true,
	KEEP_CONTENT: true
};

const relaxedSanitizerOptions: SanitizerOptions = {
	...balancedSanitizerOptions,
	ALLOW_UNKNOWN_PROTOCOLS: true
};

const defaultTemplateScriptTypes = [
	'text/x-jquery-tmpl',
	'text/x-jquery-template',
	'text/template',
	'text/ng-template',
	'text/x-handlebars-template',
	'text/x-mustache-template'
];

type PreservedScript = { attributes: Array<[name: string, value: string]>; content: string };

const normalizeSanitizationPolicy = (policy: SanitizationPreset | SanitizationPolicy) => {
	return typeof policy === 'string' ?
		{ preset: policy, preserveTemplateScripts: false, templateScriptTypes: [], allowScripts: false } :
		{ preset: policy.preset ?? 'strict', preserveTemplateScripts: policy.preserveTemplateScripts === true, templateScriptTypes: policy.templateScriptTypes ?? [], allowScripts: policy.allowScripts === true };
};

const normalizeScriptType = (type: string): string => type.trim().toLowerCase();

const buildTemplateScriptTypeSet = (policy: Required<SanitizationPolicy>) => {
	const types = policy.preserveTemplateScripts ? [ ...defaultTemplateScriptTypes, ...policy.templateScriptTypes ] : policy.templateScriptTypes;

	return new Set(types.map(normalizeScriptType).filter(Boolean));
};

const extractTemplateScriptsFromMarkup = (markup: string, allowedTemplateTypes: Set<string>): { markup: string, placeholders: Map<string, PreservedScript> } => {
	if (allowedTemplateTypes.size === 0) { return { markup, placeholders: new Map() } }

	const fragment = document.createRange().createContextualFragment(markup);
	const scripts = Array.from(fragment.querySelectorAll('script[type]'));
	if (scripts.length === 0) { return { markup, placeholders: new Map() } }

	// Per-call random token so placeholders can't be guessed and pre-embedded by attacker-controlled content.
	const nonce = Math.random().toString(36).slice(2);
	const preservedScripts = new Map<string, PreservedScript>();
	for (let i = 0, length = scripts.length; i < length; i++) {
		const script = scripts[i]!;

		if (!allowedTemplateTypes.has(normalizeScriptType(script.getAttribute('type') ?? ''))) { continue }

		const placeholder = `__TRANSPORTR_TEMPLATE_SCRIPT_${nonce}_${i}_${preservedScripts.size}__`;
		preservedScripts.set(placeholder, {
			attributes: Array.from(script.attributes, ({ name, value }) => [ name, value ]),
			content: script.textContent ?? ''
		});
		script.replaceWith(document.createTextNode(placeholder));
	}

	if (preservedScripts.size === 0) { return { markup, placeholders: preservedScripts } }

	const container = document.createElement('div');
	container.append(fragment);

	return { markup: container.innerHTML, placeholders: preservedScripts };
};

const restoreTemplateScriptsInMarkup = (markup: string, placeholders: Map<string, PreservedScript>): string => {
	if (placeholders.size === 0) { return markup }

	const container = document.createElement('div');
	container.innerHTML = markup;

	// Collect text nodes up front and replace each node in a single pass.
	const pending: Text[] = [];
	const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
	let node: Node | null;
	while ((node = walker.nextNode())) { pending.push(node as Text) }

	for (let i = 0, length = pending.length; i < length; i++) {
		const textNode = pending[i]!;
		if (!textNode.parentNode) { continue }

		const text = textNode.nodeValue;
		if (text === null) { continue }

		let cursor = 0;
		let foundPlaceholder = false;
		const replacement = document.createDocumentFragment();

		for (let nextIndex = -1, nextPlaceholder = '', nextScript;; nextScript = undefined) {
			for (const [ placeholder, script ] of placeholders) {
				const placeholderIndex = text.indexOf(placeholder, cursor);
				if (placeholderIndex === -1) { continue }

				if (nextIndex === -1 || placeholderIndex < nextIndex) {
					nextIndex = placeholderIndex;
					nextPlaceholder = placeholder;
					nextScript = script;
				}
			}

			if (nextIndex === -1 || !nextScript) { break }

			foundPlaceholder = true;
			if (nextIndex > cursor) { replacement.append(document.createTextNode(text.slice(cursor, nextIndex))) }

			const script = document.createElement('script');
			for (let j = 0, attrLength = nextScript.attributes.length; j < attrLength; j++) {
				const [ name, value ] = nextScript.attributes[j]!;
				script.setAttribute(name, value);
			}
			script.textContent = nextScript.content;
			replacement.append(script);

			cursor = nextIndex + nextPlaceholder.length;
		}

		if (!foundPlaceholder) { continue }

		if (cursor < text.length) { replacement.append(document.createTextNode(text.slice(cursor))) }

		textNode.parentNode.replaceChild(replacement, textNode);
	}

	return container.innerHTML;
};


/**
 * Manages lazy initialization of DOM and sanitization environments.
 * Unifies initialization state and provides typed access to resources.
 */
class EnvironmentManager {
	#domReady: Promise<void> | undefined;
	#purifyReady: Promise<DOMPurify> | undefined;

	/**
	 * Ensures a DOM environment is available (document, DOMParser, DocumentFragment).
	 * In browser environments the DOM is already present and this resolves immediately.
	 * In Node.js, jsdom is lazily imported and set up on first call.
	 * @returns A Promise that resolves when the DOM environment is ready.
	 */
	domReady = (): Promise<void> => {
		if (this.#domReady) { return this.#domReady }

		const isDOMAvailable = typeof document !== 'undefined' && typeof DOMParser !== 'undefined' && typeof DocumentFragment !== 'undefined';

		return this.#domReady = isDOMAvailable ? Promise.resolve() : import(/* @vite-ignore */ 'jsdom').then(({ JSDOM }) => {
			const { window } = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', { url: 'http://localhost' });

			globalThis.window = window as unknown as Window & typeof globalThis;

			Object.assign(globalThis, { document: window.document, DOMParser: window.DOMParser, DocumentFragment: window.DocumentFragment });
		}).catch(() => {
			this.#domReady = undefined;
			throw new Error('jsdom is required for HTML/XML/DOM features in Node.js environments. Install it with: npm install jsdom');
		});
	};

	/**
	 * Ensures a DOM environment and DOMPurify instance are available.
	 * @returns A Promise that resolves to the DOMPurify instance.
	 */
	getSanitizer = (): Promise<DOMPurify> => {
		if (this.#purifyReady) { return this.#purifyReady }

		const purifyReady = (async () => {
			await this.domReady();
			const { default: purify } = await import('dompurify');

			return purify;
		})();

		return this.#purifyReady = purifyReady.catch((e) => {
			this.#purifyReady = undefined;
			throw e;
		});
	};
}

const env = new EnvironmentManager();

/**
 * Sanitizes the response text and parses it as a DOM Document using DOMParser.
 * @param response The response to parse.
 * @param mimeType The MIME type to use when parsing the document.
 * @returns A Promise that resolves to a parsed Document.
 */
const parseSanitizedDocument = async (response: Response, mimeType: DOMParserSupportedType): Promise<Document> => {
	return parseDocumentWithPreset(response, mimeType, 'strict');
};

/**
 * Returns DOMPurify options for the resolved policy. When `allowScripts` is set, `script` is
 * added to DOMPurify's own allowed-tags list (`ADD_TAGS`) so real, executable `<script>` elements
 * of any `type` — including a remote `src` — survive natively.
 * @param policy The resolved sanitization policy.
 * @returns DOMPurify options, or undefined to use DOMPurify defaults.
 */
const getSanitizerOptionsForPreset = (policy: Required<SanitizationPolicy>): SanitizerOptions | undefined => {
	let baseOptions: SanitizerOptions | undefined;
	switch (policy.preset) {
		case 'bypass': case 'strict': baseOptions = undefined; break;
		case 'balanced': baseOptions = balancedSanitizerOptions; break;
		case 'relaxed': baseOptions = relaxedSanitizerOptions; break;
		default: assertNever(policy.preset);
	}

	return policy.allowScripts ? { ...baseOptions, ADD_TAGS: [ 'script' ], ALLOW_UNKNOWN_PROTOCOLS: true } : baseOptions;
};

/**
 * Runs DOMPurify while preserving all inline event-handler attributes.
 * @param sanitizer The DOMPurify instance.
 * @param markup The markup to sanitize.
 * @param sanitizerOptions The DOMPurify configuration for this sanitization pass.
 * @returns Sanitized markup with inline event-handler attributes preserved.
 */
const sanitizeWithAllowedJavaScriptAttributes = (sanitizer: DOMPurify, markup: string, sanitizerOptions: SanitizerOptions | undefined): string => {
	const hook = (_node: Node, data: { attrName?: string; attrValue?: string; forceKeepAttr?: boolean; forceKeep?: boolean }) => {
		if (data.attrName?.startsWith('on')) {
			data.forceKeepAttr = true;
			data.forceKeep = true;
			return;
		}

		if (data.attrValue?.trim().toLowerCase().startsWith('javascript:')) {
			data.forceKeepAttr = true;
			data.forceKeep = true;
		}
	};

	sanitizer.addHook('uponSanitizeAttribute', hook);
	try {
		const sanitized = sanitizer.sanitize(markup, sanitizerOptions);

		return typeof sanitized === 'string' ? sanitized : String(sanitized);
	} finally {
		sanitizer.removeAllHooks();
	}
};

/**
 * Sanitizes markup for a preset, or returns raw markup when bypassing sanitization.
 * When `allowScripts` is set, script tags and JavaScript-bearing attributes are preserved,
 * while the rest of DOMPurify sanitization remains active.
 * @param markup The source markup.
	* @param policy The sanitization policy.
 * @returns Sanitized (or raw) markup as a string.
 */
const sanitizeMarkupForPreset = async (markup: string, policy: SanitizationPreset | SanitizationPolicy): Promise<string> => {
	const resolvedPolicy = normalizeSanitizationPolicy(policy);
	if (resolvedPolicy.preset === 'bypass') { return markup }

	const sanitizerOptions = getSanitizerOptionsForPreset(resolvedPolicy);
	const sanitizer = await env.getSanitizer();
	sanitizer.clearConfig();
	if (resolvedPolicy.allowScripts) {
		return sanitizeWithAllowedJavaScriptAttributes(sanitizer, markup, sanitizerOptions);
	}

	const { markup: extractedMarkup, placeholders } = extractTemplateScriptsFromMarkup(markup, buildTemplateScriptTypeSet(resolvedPolicy));
	const sanitized = sanitizer.sanitize(extractedMarkup, sanitizerOptions);
	const sanitizedMarkup = typeof sanitized === 'string' ? sanitized : String(sanitized);

	return restoreTemplateScriptsInMarkup(sanitizedMarkup, placeholders);
};

/**
 * Parses response markup into a Document based on the given preset.
 * @param response The response to parse.
 * @param mimeType The target mime type for DOMParser.
	* @param policy The sanitization policy.
 * @returns A parsed document.
 */
const parseDocumentWithPreset = async (response: Response, mimeType: DOMParserSupportedType, policy: SanitizationPreset | SanitizationPolicy): Promise<Document> => {
	await env.domReady();

	const markup = await sanitizeMarkupForPreset(await response.text(), policy);

	return new DOMParser().parseFromString(markup, mimeType);
};

/**
 * Parses response markup into a DocumentFragment based on the given preset.
 * @param response The response to parse.
	* @param policy The sanitization policy.
 * @returns A parsed fragment.
 */
const parseFragmentWithPreset = async (response: Response, policy: SanitizationPreset | SanitizationPolicy): Promise<DocumentFragment> => {
	await env.domReady();

	const markup = await sanitizeMarkupForPreset(await response.text(), policy);

	return document.createRange().createContextualFragment(markup);
};

/**
 * Creates an object URL from the response blob, constructs a Promise with the given executor,
 * and ensures the URL is revoked after the promise settles.
 * @param response The response to create the object URL from.
 * @param executor A function receiving the object URL, resolve, and reject callbacks.
 * @returns A Promise that resolves to the value produced by the executor.
 */
const withObjectURL = async <T>(response: Response, executor: (objectURL: string, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void): Promise<T> => {
	await env.domReady();

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
const handleText: ResponseHandler<string> = (response) => response.text();

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
		const script = Object.assign(document.createElement('script'), { src: objectURL, type: 'text/javascript', async: true });

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
		const link = Object.assign(document.createElement('link'), { href: objectURL, type: 'text/css', rel: 'stylesheet' });

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
const handleJson: ResponseHandler<Json> = (response) => response.json() as Promise<Json>;

/**
 * Handles a Blob response.
 * @param response The response object from the fetch request.
 * @returns A Promise that resolves to a Blob
 */
const handleBlob: ResponseHandler<Blob> = (response) => response.blob();

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
const handleBuffer: ResponseHandler<ArrayBuffer> = (response) => response.arrayBuffer();

/**
 * Handles a ReadableStream response.
 * @param response The response object from the fetch request.
 * @returns A Promise that resolves to a ReadableStream
 */
const handleReadableStream: ResponseHandler<ReadableStream<Uint8Array> | null> = (response) => Promise.resolve(response.body);

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
	return parseFragmentWithPreset(response, 'strict');
};

/**
 * Handles an HTML fragment response, bypassing DOMPurify entirely.
 * Only available in environments with DOM support.
 *
 * **Security Warning:** DOMPurify is bypassed entirely — all content is preserved
 * as-is, including script tags of any type (e.g. `text/javascript`, `text/x-template`,
 * `text/x-jquery-tmpl`), inline event handlers, and `javascript:` URLs.
 * Only use with fully trusted same-origin content. The caller accepts full
 * responsibility for the safety of the HTML by opting in with `sanitizePreset: 'bypass'`.
 *
 * Note: for the narrower case of allowing only `<script>` elements through while still
 * sanitizing everything else (event handlers, `javascript:` URLs, `<iframe>`, etc.), use
 * `sanitization: { allowScripts: true }` instead — DOMPurify supports this natively via
 * `ADD_TAGS`. Full bypass remains necessary only when non-script constructs must also
 * survive unsanitized.
 * @param response The response object from the fetch request.
 * @returns A Promise that resolves to a DocumentFragment
 */
const handleHtmlFragmentBypass: ResponseHandler<DocumentFragment> = async (response) => {
	await env.domReady();

	return document.createRange().createContextualFragment(await response.text());
};

/**
 * Resolves the HTML handler for a sanitization preset.
	* @param policy The sanitization policy.
 * @returns A response handler for HTML documents.
 */
const getHtmlHandlerForPreset = (policy: SanitizationPreset | SanitizationPolicy): ResponseHandler<Document> => {
	const resolvedPolicy = normalizeSanitizationPolicy(policy);
	if (resolvedPolicy.preset === 'strict' && !resolvedPolicy.allowScripts && buildTemplateScriptTypeSet(resolvedPolicy).size === 0) { return handleHtml }

	return async (response) => parseDocumentWithPreset(response, 'text/html', resolvedPolicy);
};

/**
 * Resolves the XML handler for a sanitization preset.
	* @param policy The sanitization policy.
 * @returns A response handler for XML documents.
 */
const getXmlHandlerForPreset = (policy: SanitizationPreset | SanitizationPolicy): ResponseHandler<Document> => {
	const resolvedPolicy = normalizeSanitizationPolicy(policy);
	if (resolvedPolicy.preset === 'strict' && !resolvedPolicy.allowScripts && buildTemplateScriptTypeSet(resolvedPolicy).size === 0) { return handleXml }

	return async (response) => parseDocumentWithPreset(response, 'application/xml', resolvedPolicy);
};

/**
 * Resolves the HTML fragment handler for a sanitization preset.
	* @param policy The sanitization policy.
 * @returns A response handler for HTML fragments.
 */
const getHtmlFragmentHandlerForPreset = (policy: SanitizationPreset | SanitizationPolicy): ResponseHandler<DocumentFragment> => {
	const resolvedPolicy = normalizeSanitizationPolicy(policy);
	if (resolvedPolicy.preset === 'strict' && !resolvedPolicy.allowScripts && buildTemplateScriptTypeSet(resolvedPolicy).size === 0) { return handleHtmlFragment }
	if (resolvedPolicy.preset === 'bypass') { return handleHtmlFragmentBypass }

	return async (response) => parseFragmentWithPreset(response, resolvedPolicy);
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
	const delimLength = delimiter.length;
	let buffer = '';
	let cursor = 0;

	try {
		for (;;) {
			let index: number;
			while ((index = buffer.indexOf(delimiter, cursor)) !== -1) {
				yield buffer.slice(cursor, index);
				cursor = index + delimLength;
			}

			// Compact the buffer when the unread region is small relative to the consumed prefix.
			if (cursor > 0 && cursor >= buffer.length - cursor) {
				buffer = cursor < buffer.length ? buffer.slice(cursor) : '';
				cursor = 0;
			}

			const { done, value } = await reader.read();

			if (done) { break }

			buffer += decoder.decode(value, { stream: true });
		}

		if (flushRemaining) {
			const tail = (cursor < buffer.length ? buffer.slice(cursor) : '') + decoder.decode();
			const remaining = tail.trim();
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
	// Lazy data accumulation: most SSE events contain exactly one `data:` line, so avoid the array allocation in that case.
	let firstData: string | undefined;
	let extraData: string[] | undefined;

	const lines = rawEvent.split('\n');
	for (let i = 0, line, length = lines.length; i < length; i++) {
		line = lines[i]!;

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
			case 'event': {
				event = value;
				break;
			}
			case 'data': {
				if (firstData === undefined) {
					firstData = value;
				} else {
					(extraData ??= []).push(value);
				}
				break;
			}
			case 'id': {
				id = value;
				break;
			}
			case 'retry': {
				const n = parseInt(value, 10);
				if (!isNaN(n)) { retry = n }
				break;
			}
		}
	}

	if (firstData === undefined && event === 'message') { return undefined }

	const data = extraData === undefined ? (firstData ?? '') : `${firstData}\n${extraData.join('\n')}`;

	return { event, data, id, retry };
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
	handleHtmlFragmentBypass,
	getXmlHandlerForPreset,
	getHtmlHandlerForPreset,
	getHtmlFragmentHandlerForPreset,
	handleEventStream,
	handleNdjsonStream
};
