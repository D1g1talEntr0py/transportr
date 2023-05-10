import { expect, jest, test } from '@jest/globals';
import { DOMParser } from '@xmldom/xmldom';
import HttpError from '../src/http-error.js';
import Transportr from '../src/transportr.js';

// test.concurrent('Transportr JSON', async () => {
// 	const transportr = new Transportr('https://mockend.com/D1g1talEntr0py/music-api');

// 	expect(transportr).toBeInstanceOf(Transportr);

// 	const json = await transportr.get('/albums', { searchParams: { 'genre_eq': 'Rock' } });
// 	expect(typeof(json)).toBe('object');

// 	const json2 = await transportr.getJson('/albums', { searchParams: new URLSearchParams({ 'genre_eq': 'Rock' }) });
// 	expect(typeof(json2)).toBe('object');
// 	expect(json2).toStrictEqual(json);

// 	const post = await transportr.post('/artists', { name: 'The Receiving End of Sirens', age: 3 });
// 	expect(typeof(post)).toBe('object');
// 	expect(post).toHaveProperty('id');
// 	expect(post).toHaveProperty('name');

// 	const formData = new FormData();
// 	formData.set('name', 'Point North');
// 	formData.set('age', 5);

// 	const post2 = await transportr.post('/artists', formData);
// 	expect(typeof (post2)).toBe('object');
// 	expect(post2).toHaveProperty('id');
// 	expect(post2).toHaveProperty('name');
// });

test.concurrent('Transportr XML', async () => {
	globalThis.DOMParser = DOMParser;

	const url = new URL('/api', 'http://restapi.adequateshop.com');
	let transportr = new Transportr(url);
	const /** @type {Node} */ xml = await transportr.getXml('/Traveler?page=1');
	expect(typeof(xml)).toBe('object');

	const xmlHeaders = new Headers();
	xmlHeaders.set([Transportr.RequestHeader.ACCEPT], Transportr.MediaType.XML);
	xmlHeaders.set([Transportr.RequestHeader.CONTENT_TYPE], Transportr.MediaType.XML);

	transportr = new Transportr(url, { headers: xmlHeaders });
	const /** @type {Node} */ xml2 = await transportr.get('/Traveler?page=1');
	expect(typeof(xml2)).toBe('object');
	// expect(xml2).toStrictEqual(xml);
});

test.concurrent('Transportr Image', async () => {
	globalThis.location = new URL('https://picsum.photos');

	const imageTransportr = new Transportr();
	const image = await imageTransportr.getImage('/240');
	expect(typeof(image)).toBe('string');
	expect(image).toMatch(/^blob:nodedata:([0-9a-fA-F]{8})-(([0-9a-fA-F]{4}-){3})([0-9a-fA-F]{12})$/i);
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

	const image = await transportr.getImage('/240');
	expect(typeof (image)).toBe('string');
	expect(image).toMatch(/^blob:nodedata:([0-9a-fA-F]{8})-(([0-9a-fA-F]{4}-){3})([0-9a-fA-F]{12})$/i);
	expect(configuredEventListener).toHaveBeenCalledTimes(1);
	expect(successEventListener).toHaveBeenCalledTimes(1);
	expect(errorEventListener).toHaveBeenCalledTimes(0);
	expect(abortEventListener).toHaveBeenCalledTimes(0);
	expect(timeoutEventListener).toHaveBeenCalledTimes(0);
	expect(completeEventListener).toHaveBeenCalledTimes(1);
});

test.concurrent('SignalController Abort', async () => {
	const controller = Transportr.signalController();
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

	expect(configuredEventListener).toHaveBeenCalledTimes(1);
	expect(successEventListener).toHaveBeenCalledTimes(0);
	expect(errorEventListener).toHaveBeenCalledTimes(1);
	expect(abortedEventListener).toHaveBeenCalledTimes(1);
	expect(timeoutEventListener).toHaveBeenCalledTimes(0);
	expect(completeEventListener).toHaveBeenCalledTimes(0);
	expect(abortListener).toHaveBeenCalledTimes(1);
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
	const transportr = new Transportr(url.origin, { timeout });

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
		expect(event.detail).toHaveProperty('url', url);
		expect(event.detail).toHaveProperty('options');
		expect(event.detail.options).toHaveProperty('timeout', timeout);
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