import Transportr from '../src/transportr.js';
import { DOMParser } from '@xmldom/xmldom';
import { expect, test } from '@jest/globals';

test.concurrent('Transportr JSON', async () => {
	const transportr = new Transportr('https://mockend.com/D1g1talEntr0py/music-api');

	expect(transportr).toBeInstanceOf(Transportr);

	const json = await transportr.get('/albums', { searchParams: { 'genre_eq': 'Rock' } });
	expect(typeof(json)).toBe('object');

	const json2 = await transportr.getJson('/albums', { searchParams: new URLSearchParams({ 'genre_eq': 'Rock' }) });
	expect(typeof(json2)).toBe('object');
	expect(json2).toStrictEqual(json);

	const post = await transportr.post('/artists', { name: 'The Receiving End of Sirens', age: 3 });
	expect(typeof(post)).toBe('object');
	expect(post).toHaveProperty('id');
	expect(post).toHaveProperty('name');

	const formData = new FormData();
	formData.set('name', 'Point North');
	formData.set('age', 5);

	const post2 = await transportr.post('/artists', formData);
	expect(typeof (post2)).toBe('object');
	expect(post2).toHaveProperty('id');
	expect(post2).toHaveProperty('name');
});

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
	globalThis.location = new URL('https://loremflickr.com');

	const imageTransportr = new Transportr();
	const image = await imageTransportr.getImage('/320/240');
	expect(typeof(image)).toBe('string');
	expect(image).toMatch(/^blob:nodedata:([0-9a-fA-F]{8})-(([0-9a-fA-F]{4}-){3})([0-9a-fA-F]{12})$/i);
});