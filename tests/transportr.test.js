import Transportr from '../src/transportr.js';
import { DOMParser } from '@xmldom/xmldom';
import { expect, test } from '@jest/globals';

test('Transportr', async () => {
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

	// Convert FormData to Object
	var formDataObject = Object.fromEntries(Array.from(formData.keys()).map((key) => [key, formData.getAll(key).length > 1 ? formData.getAll(key) : formData.get(key)]));

	const post2 = await transportr.post('/artists', formDataObject);
	expect(typeof (post2)).toBe('object');
	expect(post2).toHaveProperty('id');
	expect(post2).toHaveProperty('name');

	globalThis.DOMParser = DOMParser;

	const xmlTransportr = new Transportr(new URL('/api', 'http://restapi.adequateshop.com'));
	const /** @type {Node} */ xml = await xmlTransportr.getXml('/Traveler?page=1');
	expect(typeof(xml)).toBe('object');

	globalThis.location = new URL('https://loremflickr.com');

	const imageTransportr = new Transportr();
	const image = await imageTransportr.getImage('/320/240');
	expect(typeof(image)).toBe('string');
	expect(image).toMatch(/^blob:nodedata:([0-9a-fA-F]{8})-(([0-9a-fA-F]{4}-){3})([0-9a-fA-F]{12})$/i);
});