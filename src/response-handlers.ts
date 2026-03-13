import DOMPurify from 'dompurify';
import { HttpMediaType } from './http-media-type';
import type { Json, ResponseHandler } from '@types';

/** Cached promise for lazy jsdom initialization — resolved once, reused thereafter */
let domReady: Promise<void> | undefined;

/**
 * Ensures a DOM environment is available (document, DOMParser, DocumentFragment).
 * In browser environments this is a no-op. In Node.js it lazily imports jsdom on first call.
 * @returns A Promise that resolves when the DOM environment is ready.
 */
const ensureDom = async (): Promise<void> => {
	if (typeof document !== 'undefined' && typeof DOMParser !== 'undefined' && typeof DocumentFragment !== 'undefined') { return Promise.resolve() }

	return domReady ??= import('jsdom').then(({ JSDOM }) => {
		const { window } = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
		globalThis.window = window as unknown as Window & typeof globalThis;
		Object.assign(globalThis, { document: window.document, DOMParser: window.DOMParser, DocumentFragment: window.DocumentFragment });
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
		Object.assign(script, { src: objectURL, type: HttpMediaType.JAVA_SCRIPT, async: true });

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
		Object.assign(link, { href: objectURL, type: HttpMediaType.CSS, rel: 'stylesheet' });

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
	return new DOMParser().parseFromString(DOMPurify.sanitize(await response.text()), HttpMediaType.XML);
};

/**
 * Handles an HTML response.
 * Only available in environments with DOM support.
 * @param response The response object from the fetch request.
 * @returns A Promise that resolves to a Document
 */
const handleHtml: ResponseHandler<Document> = async (response) => {
	await ensureDom();
	return new DOMParser().parseFromString(DOMPurify.sanitize(await response.text()), HttpMediaType.HTML);
};

/**
 * Handles an HTML fragment response.
 * Only available in environments with DOM support.
 * @param response The response object from the fetch request.
 * @returns A Promise that resolves to a DocumentFragment
 */
const handleHtmlFragment: ResponseHandler<DocumentFragment> = async (response) => {
	await ensureDom();
	return document.createRange().createContextualFragment(DOMPurify.sanitize(await response.text()));
};

export { handleText, handleScript, handleCss, handleJson, handleBlob, handleImage, handleBuffer, handleReadableStream, handleXml, handleHtml, handleHtmlFragment };
