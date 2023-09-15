import { expect, jest, test } from '@jest/globals';
import Transportr from '../src/transportr.js';

test('Global Event Listener', async () => {
	const imageTransportr = new Transportr('https://picsum.photos');

	const globalConfiguredEventHandler = jest.fn();
	Transportr.register(Transportr.RequestEvents.CONFIGURED, globalConfiguredEventHandler);

	const image = await imageTransportr.getImage('/320/240');

	expect(typeof (image)).toBe('string');
	expect(image).toMatch(/^blob:nodedata:([0-9a-fA-F]{8})-(([0-9a-fA-F]{4}-){3})([0-9a-fA-F]{12})$/i);

	const imageTransportr2 = new Transportr('https://picsum.photos');

	const image2 = await imageTransportr2.getImage('/240');

	expect(typeof (image2)).toBe('string');
	expect(image2).toMatch(/^blob:nodedata:([0-9a-fA-F]{8})-(([0-9a-fA-F]{4}-){3})([0-9a-fA-F]{12})$/i);

	expect(globalConfiguredEventHandler).toHaveBeenCalledTimes(2);
});