import { describe, expect, it, jest, test } from '@jest/globals';
import { DOMParser } from '@xmldom/xmldom';
import HttpError from '../src/http-error.js';
import HttpMediaType from '../src/http-media-type.js';
import HttpRequestHeader from '../src/http-request-headers.js';
import HttpRequestMethod from '../src/http-request-methods.js';
import HttpResponseHeader from '../src/http-response-headers.js';
import Transportr from '../src/transportr.js';
import config from './config.js';

describe('Transportr', () => {
	beforeEach(async () => await new Promise((_) => setTimeout(_, 1500)));

	describe('Transportr.prototype.constructor', () => {
		const baseUrl = 'https://mockend.com/api/D1g1talEntr0py/music-api';

		it('should create a new Transportr instance with a String', () => {
			const transportr = new Transportr(baseUrl);

			expect(transportr).toBeInstanceOf(Transportr);
			expect(transportr.baseUrl).toBeInstanceOf(URL);
			expect(transportr.baseUrl).toHaveProperty('href', baseUrl);
			expect(transportr.baseUrl).toHaveProperty('origin', 'https://mockend.com');
			expect(transportr.baseUrl).toHaveProperty('protocol', 'https:');
			expect(transportr.baseUrl).toHaveProperty('username', '');
			expect(transportr.baseUrl).toHaveProperty('password', '');
			expect(transportr.baseUrl).toHaveProperty('host', 'mockend.com');
			expect(transportr.baseUrl).toHaveProperty('hostname', 'mockend.com');
			expect(transportr.baseUrl).toHaveProperty('port', '');
			expect(transportr.baseUrl).toHaveProperty('pathname', '/api/D1g1talEntr0py/music-api');
		});

		it('should create a new Transportr instance with a URL', () => {
			const transportr = new Transportr(new URL(baseUrl));

			expect(transportr).toBeInstanceOf(Transportr);
			expect(transportr.baseUrl).toBeInstanceOf(URL);
			expect(transportr.baseUrl).toHaveProperty('href', baseUrl);
			expect(transportr.baseUrl).toHaveProperty('origin', 'https://mockend.com');
			expect(transportr.baseUrl).toHaveProperty('protocol', 'https:');
			expect(transportr.baseUrl).toHaveProperty('username', '');
			expect(transportr.baseUrl).toHaveProperty('password', '');
			expect(transportr.baseUrl).toHaveProperty('host', 'mockend.com');
			expect(transportr.baseUrl).toHaveProperty('hostname', 'mockend.com');
			expect(transportr.baseUrl).toHaveProperty('port', '');
			expect(transportr.baseUrl).toHaveProperty('pathname', '/api/D1g1talEntr0py/music-api');
		});

		it('should create a new Transportr instance with a URL and options', () => {
			const transportr = new Transportr(new URL(baseUrl), { searchParams: { id: 12345 } });

			expect(transportr).toBeInstanceOf(Transportr);
			expect(transportr.baseUrl).toBeInstanceOf(URL);
			expect(transportr.baseUrl).toHaveProperty('href', baseUrl);
			expect(transportr.baseUrl).toHaveProperty('origin', 'https://mockend.com');
			expect(transportr.baseUrl).toHaveProperty('protocol', 'https:');
			expect(transportr.baseUrl).toHaveProperty('username', '');
			expect(transportr.baseUrl).toHaveProperty('password', '');
			expect(transportr.baseUrl).toHaveProperty('host', 'mockend.com');
			expect(transportr.baseUrl).toHaveProperty('hostname', 'mockend.com');
			expect(transportr.baseUrl).toHaveProperty('port', '');
			expect(transportr.baseUrl).toHaveProperty('pathname', '/api/D1g1talEntr0py/music-api');
			expect(transportr.baseUrl).toHaveProperty('search', '');
			expect(transportr.baseUrl).toHaveProperty('searchParams');
			expect(transportr.baseUrl.searchParams).toBeInstanceOf(URLSearchParams);
			// expect(transportr.baseUrl.searchParams).toHaveProperty('id', '12345');
		});

		it('should create a new Transportr instance options', () => {
			let originalLocation;

			delete globalThis.location;
			globalThis.location = {	origin: baseUrl };

			const transportr = new Transportr({ searchParams: { id: 12345 } });

			expect(transportr).toBeInstanceOf(Transportr);
			expect(transportr.baseUrl).toBeInstanceOf(URL);
			expect(transportr.baseUrl).toHaveProperty('href', baseUrl);
			expect(transportr.baseUrl).toHaveProperty('origin', 'https://mockend.com');
			expect(transportr.baseUrl).toHaveProperty('protocol', 'https:');
			expect(transportr.baseUrl).toHaveProperty('username', '');
			expect(transportr.baseUrl).toHaveProperty('password', '');
			expect(transportr.baseUrl).toHaveProperty('host', 'mockend.com');
			expect(transportr.baseUrl).toHaveProperty('hostname', 'mockend.com');
			expect(transportr.baseUrl).toHaveProperty('port', '');
			expect(transportr.baseUrl).toHaveProperty('pathname', '/api/D1g1talEntr0py/music-api');
			expect(transportr.baseUrl).toHaveProperty('search', '');
			expect(transportr.baseUrl).toHaveProperty('searchParams');
			expect(transportr.baseUrl.searchParams).toBeInstanceOf(URLSearchParams);
			// expect(transportr.baseUrl.searchParams).toHaveProperty('id', '12345');

			globalThis.location = originalLocation;
		});

		it('should throw an error if the URL is invalid', () => {
			expect(() => new Transportr(new Date())).toThrow(TypeError);
			expect(() => new Transportr(5)).toThrow(/Invalid URL/);
		});
	});

	describe.only('Transportr.prototype.request', () => {
		const transportr = new Transportr('https://mockend.com/api/D1g1talEntr0py/music-api/artists', { headers: { 'X-Mockend-Key': config.mockendKey }});

		it.concurrent('should make a POST request', async () => {
			const options = { method: HttpRequestMethod.POST, body: { name: 'Sam Heart', age: 19 } };

			const response = await transportr.request(options);
			expect(response).toBeInstanceOf(Response);
			expect(response.status).toBe(201);
			// expect(response.headers.get(HttpResponseHeader.CONTENT_LOCATION)).toBe('/artists/16');

			const apiEntries = await response.json();
			expect(typeof(apiEntries)).toBe('object');
			expect(apiEntries).toHaveProperty('name', options.body.name);

			const entries = await transportr.post(options.body);
			expect(typeof(entries)).toBe('object');
			expect(entries).toHaveProperty('name', options.body.name);
		});

		it.concurrent('should make a GET request', async () => {
			const options = { method: HttpRequestMethod.GET };

			const response = await transportr.request(options);
			expect(response).toBeInstanceOf(Response);

			const apiEntries = await response.json();
			expect(Array.isArray(apiEntries)).toBe(true);
			expect(apiEntries).toHaveLength(15);
			expect(apiEntries[0]).toHaveProperty('id');
			expect(apiEntries[0]).toHaveProperty('name');
			expect(apiEntries[0]).toHaveProperty('age');

			const entries = await transportr.get();
			expect(Array.isArray(entries)).toBe(true);
			expect(entries).toHaveLength(15);
			expect(entries[0]).toHaveProperty('id');
			expect(entries[0]).toHaveProperty('name');
			expect(entries[0]).toHaveProperty('age');
			expect(entries).toEqual(apiEntries);

			const entries2 = await transportr.getJson();
			expect(Array.isArray(entries2)).toBe(true);
			expect(entries2[0]).toHaveProperty('id');
			expect(entries2[0]).toHaveProperty('name');
			expect(entries2[0]).toHaveProperty('age');
			expect(entries2).toEqual(apiEntries);
		});

		it.only('should make an XML GET request', async () => {
			globalThis.DOMParser = DOMParser;

			const transportr = new Transportr('https://jsonplaceholder.typicode.com', { headers: { [HttpRequestHeader.CONTENT_TYPE]: HttpMediaType.XML, [HttpRequestHeader.ACCEPT]: HttpMediaType.XML } });

			const json = await transportr.getJson('/json/1');

			const response = await transportr.request('/json/1');
			expect(response).toBeInstanceOf(Response);

			const xml = new DOMParser().parseFromString(await response.text(), HttpMediaType.XML);
			expect(typeof(xml)).toBe('object');
			Array.from(xml.documentElement.childNodes).filter((node) => node.nodeType == 1).forEach((element, index) => {
				expect(element).toHaveProperty('tagName', Object.keys(json)[index]);
				expect(element).toHaveProperty('textContent', Object.values(json)[index].toString());
			});

			const xml2 = await transportr.get('/json/1');
			expect(typeof (xml2)).toBe('object');
			expect(xml2).toEqual(xml);
			Array.from(xml2.documentElement.childNodes).filter((node) => node.nodeType == 1).forEach((element, index) => {
				expect(element).toHaveProperty('tagName', Object.keys(json)[index]);
				expect(element).toHaveProperty('textContent', Object.values(json)[index].toString());
			});

			const xml3 = await transportr.getXml('/json/1');
			expect(typeof(xml3)).toBe('object');
			expect(xml3).toEqual(xml2);
			expect(xml3).toEqual(xml);
			Array.from(xml3.documentElement.childNodes).filter((node) => node.nodeType == 1).forEach((element, index) => {
				expect(element).toHaveProperty('tagName', Object.keys(json)[index]);
				expect(element).toHaveProperty('textContent', Object.values(json)[index].toString());
			});
		});

		it.concurrent('should load a script from a URL', async () => {
			globalThis.DOMParser = DOMParser;
			globalThis.document = new DOMParser().parseFromString('<!DOCTYPE html><html></html>', HttpMediaType.HTML);

			document.head = document.createElement('head');

			const createElementSpy = jest.spyOn(document, 'createElement');
			const appendChildSpy = jest.spyOn(document.head, 'appendChild');
			const removeChildSpy = jest.spyOn(document.head, 'removeChild');

			await transportr.getScript('/script/1');

			expect(createElementSpy).toHaveBeenCalledWith('script');
			expect(createElementSpy.mock.results[0].value.src).toMatch(/^blob:/);
			expect(appendChildSpy).toHaveBeenCalled();
			expect(removeChildSpy).toHaveBeenCalled();

			createElementSpy.mockRestore();
			appendChildSpy.mockRestore();
			removeChildSpy.mockRestore();
		});

		it.concurrent('should make a PUT request', async () => {
			const body = { id: 678910, value: 'jkl-mno-pqr' };
			const options = { method: HttpRequestMethod.PUT, body };

			const response = await transportr.request('/json/2', options);
			const result = await response.json();

			expect(typeof(result)).toBe('object');
			expect(result).toHaveProperty('result', 'success');

			const result2 = await transportr.put('/json/2', { body });
			expect(typeof(result2)).toBe('object');
			expect(result2).toHaveProperty('result', 'success');
			expect(result2).toEqual(result);
		});

		it.concurrent('should make a PATCH request', async () => {
			const body = { id: 67890 };
			const headers = { [HttpRequestHeader.CONTENT_TYPE]: HttpMediaType.JSON_MERGE_PATCH, [HttpRequestHeader.IF_MATCH]: 'e0023aa4e' };
			const options = {	method: HttpRequestMethod.PATCH, body, headers };

			const response = await transportr.request('/json/2', options);

			expect(response).toBeInstanceOf(Response);
			expect(response.status).toBe(204);
			expect(response.headers.get('ETag')).toBe('e0023aa4f');
			expect(response.headers.get(HttpResponseHeader.CONTENT_LOCATION)).toBe('/json/2');

			const response2 = await transportr.patch('/json/2', { body, headers });
			expect(response2).toBeInstanceOf(Response);
			expect(response2.status).toBe(204);
			expect(response2.headers.get('ETag')).toBe('e0023aa4f');
			expect(response2.headers.get(HttpResponseHeader.CONTENT_LOCATION)).toBe('/json/2');
		});

		it.concurrent('should make a DELETE request', async () => {
			const headers = { [HttpRequestHeader.IF_MATCH]: 'e0023aa4f' };
			const options = { method: HttpRequestMethod.DELETE, headers };

			const response = await transportr.request('/json/2', options);

			expect(response).toBeInstanceOf(Response);
			expect(response.status).toBe(200);

			const result = await response.json();
			expect(typeof(result)).toBe('object');
			expect(result).toHaveProperty('result', 'success');

			const result2 = await transportr.delete('/json/2', { headers });
			expect(typeof(result2)).toBe('object');
			expect(result2).toHaveProperty('result', 'success');
			expect(result2).toEqual(result);
		});

		it.concurrent('should make a OPTIONS request', async () => {
			const options = { method: HttpRequestMethod.OPTIONS };

			const response = await transportr.request('/json/1', options);

			expect(response).toBeInstanceOf(Response);
			expect(response.status).toBe(204);
			expect(response.headers.get(HttpResponseHeader.ALLOW)).toBe('GET,HEAD,OPTIONS');

			const allowedMethods = await transportr.options('/json/1');
			expect(allowedMethods).toStrictEqual(['GET', 'HEAD', 'OPTIONS']);
		});
	});

	test.concurrent('Transportr Image', async () => {
		const _url = new URL('https://picsum.photos/240');
		const imageTransportr = new Transportr(_url, { searchParams: { blur: 2 } });

		const image = await imageTransportr.getImage({ searchParams: { blur: 5, greyscale: true } });
		expect(imageTransportr.baseUrl).toEqual(_url);
		expect(typeof(image)).toBe('string');
		expect(image).toMatch(/^blob:nodedata:([0-9a-fA-F]{8})-(([0-9a-fA-F]{4}-){3})([0-9a-fA-F]{12})$/i);

		const image2 = await imageTransportr.getImage({ searchParams: { blur: 1, greyscale: false } });

		expect(imageTransportr.baseUrl).toEqual(_url);
		expect(typeof(image2)).toBe('string');
		expect(image2).toMatch(/^blob:nodedata:([0-9a-fA-F]{8})-(([0-9a-fA-F]{4}-){3})([0-9a-fA-F]{12})$/i);
	});

	test.concurrent('Transportr Add Event Listeners', async () => {
		const transportr = new Transportr('https://picsum.photos');

		const configuredEventListener = jest.fn();
		transportr.register(Transportr.Events.CONFIGURED, configuredEventListener);

		const successEventListener = jest.fn();
		transportr.register(Transportr.Events.SUCCESS, successEventListener);

		const errorEventListener = jest.fn();
		transportr.register(Transportr.Events.ERROR, errorEventListener);

		const abortEventListener = jest.fn();
		transportr.register(Transportr.Events.ABORTED, abortEventListener);

		const timeoutEventListener = jest.fn();
		transportr.register(Transportr.Events.TIMEOUT, timeoutEventListener);

		const completeEventListener = jest.fn();
		transportr.register(Transportr.Events.COMPLETE, completeEventListener);

		const allCompleteEventListener = jest.fn();
		transportr.register(Transportr.Events.ALL_COMPLETE, allCompleteEventListener);

		const image = await transportr.getImage('/240');
		expect(typeof (image)).toBe('string');
		expect(image).toMatch(/^blob:nodedata:([0-9a-fA-F]{8})-(([0-9a-fA-F]{4}-){3})([0-9a-fA-F]{12})$/i);
		expect(configuredEventListener).toHaveBeenCalledTimes(1);
		expect(successEventListener).toHaveBeenCalledTimes(1);
		expect(errorEventListener).toHaveBeenCalledTimes(0);
		expect(abortEventListener).toHaveBeenCalledTimes(0);
		expect(timeoutEventListener).toHaveBeenCalledTimes(0);
		expect(completeEventListener).toHaveBeenCalledTimes(1);
		expect(allCompleteEventListener).toHaveBeenCalledTimes(0);
	});

	test.concurrent('AbortController Abort', async () => {
		const controller = new AbortController();
		const transportr = new Transportr('https://picsum.photos');

		const configuredEventListener = jest.fn();
		transportr.register(Transportr.Events.CONFIGURED, configuredEventListener);

		const successEventListener = jest.fn();
		transportr.register(Transportr.Events.SUCCESS, successEventListener);

		const errorEventListener = jest.fn();
		transportr.register(Transportr.Events.ERROR, errorEventListener);

		const abortedEventListener = jest.fn();
		transportr.register(Transportr.Events.ABORTED, abortedEventListener);

		const timeoutEventListener = jest.fn();
		transportr.register(Transportr.Events.TIMEOUT, timeoutEventListener);

		const completeEventListener = jest.fn();
		transportr.register(Transportr.Events.COMPLETE, completeEventListener);

		const abortListener = jest.fn();
		// Test adding an event listener to the signal
		controller.signal.addEventListener('abort', abortListener);

		const imagePromise = transportr.getImage('/320/240', { signal: controller.signal });
		controller.abort();

		await expect(async () => await imagePromise).rejects.toThrow(HttpError);
		await expect(async () => await imagePromise).rejects.toThrow(/[AbortError]/);

		expect(controller.signal.aborted).toBe(true);
		expect(configuredEventListener).toHaveBeenCalledTimes(1);
		expect(successEventListener).toHaveBeenCalledTimes(0);
		expect(errorEventListener).toHaveBeenCalledTimes(1);
		expect(abortedEventListener).toHaveBeenCalledTimes(1);
		expect(timeoutEventListener).toHaveBeenCalledTimes(0);
		expect(completeEventListener).toHaveBeenCalledTimes(0);
		expect(abortListener).toHaveBeenCalledTimes(1);
	});

	test.concurrent('Request Timeout', async () => {
		const timeout = 1;
		const url = new URL('https://picsum.photos/320/240');
		const transportr = new Transportr(url, { timeout });

		const configuredEventListener = jest.fn();
		transportr.register(Transportr.Events.CONFIGURED, configuredEventListener);

		const successEventListener = jest.fn();
		transportr.register(Transportr.Events.SUCCESS, successEventListener);

		const errorEventListener = jest.fn();
		transportr.register(Transportr.Events.ERROR, errorEventListener);

		const abortedEventListener = jest.fn();
		transportr.register(Transportr.Events.ABORTED, abortedEventListener);

		const timeoutEventListener = jest.fn();
		transportr.register(Transportr.Events.TIMEOUT, timeoutEventListener);

		const completeEventListener = jest.fn();
		transportr.register(Transportr.Events.COMPLETE, completeEventListener);

		transportr.register(Transportr.Events.TIMEOUT, (event) => {
			expect(event).toBeInstanceOf(CustomEvent);
			expect(event.target).toBeInstanceOf(globalThis.AbortSignal);
			expect(event.target.aborted).toBe(true);
			expect(event.detail).toHaveProperty('timeout', timeout);
			expect(event.detail).toHaveProperty('cause');
			expect(event.detail.cause).toBeInstanceOf(DOMException);
			expect(event.detail.cause).toHaveProperty('name', 'TimeoutError');
		});

		const imagePromise = transportr.getImage('/320/240');

		await expect(async () => await imagePromise).rejects.toThrow(HttpError);
		await expect(async () => await imagePromise).rejects.toThrow(/[TimeoutError]/);

		expect(configuredEventListener).toHaveBeenCalledTimes(1);
		expect(successEventListener).toHaveBeenCalledTimes(0);
		expect(errorEventListener).toHaveBeenCalledTimes(1);
		expect(abortedEventListener).toHaveBeenCalledTimes(1);
		expect(timeoutEventListener).toHaveBeenCalledTimes(1);
		expect(completeEventListener).toHaveBeenCalledTimes(0);
	});

	test.concurrent('No Timeout', async () => {
		const transportr = new Transportr('https://transportr.wiremockapi.cloud', { timeout: Infinity });

		const configuredEventListener = jest.fn();
		transportr.register(Transportr.Events.CONFIGURED, configuredEventListener);

		const successEventListener = jest.fn();
		transportr.register(Transportr.Events.SUCCESS, successEventListener);

		const errorEventListener = jest.fn();
		transportr.register(Transportr.Events.ERROR, errorEventListener);

		const abortedEventListener = jest.fn();
		transportr.register(Transportr.Events.ABORTED, abortedEventListener);

		const timeoutEventListener = jest.fn();
		transportr.register(Transportr.Events.TIMEOUT, timeoutEventListener);

		const completeEventListener = jest.fn();
		transportr.register(Transportr.Events.COMPLETE, completeEventListener);

		const json = await transportr.getJson('/delayed');

		expect(typeof (json)).toBe('object');
		expect(json).toEqual({ 'text': 'This will appear after about 2 seconds!' });

		expect(configuredEventListener).toHaveBeenCalledTimes(1);
		expect(successEventListener).toHaveBeenCalledTimes(1);
		expect(errorEventListener).toHaveBeenCalledTimes(0);
		expect(abortedEventListener).toHaveBeenCalledTimes(0);
		expect(timeoutEventListener).toHaveBeenCalledTimes(0);
		expect(completeEventListener).toHaveBeenCalledTimes(1);
	});
});