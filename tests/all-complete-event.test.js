import { expect, jest, test } from '@jest/globals';
import Transportr from '../src/transportr.js';

test('All Complete Event', async () => {
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

	try {
		const results = await Promise.allSettled([transportr.getImage('/240'), transportr.getImage('/360'), transportr.getImage('/480')]);

		results.forEach((result, index) => {
			if (result.status === 'fulfilled') {
				const image = result.value;
				expect(typeof (image)).toBe('string');
				expect(image).toMatch(/^blob:nodedata:([0-9a-fA-F]{8})-(([0-9a-fA-F]{4}-){3})([0-9a-fA-F]{12})$/i);
				expect(configuredEventListener).toHaveBeenCalledTimes(3);
				expect(successEventListener).toHaveBeenCalledTimes(3);
				expect(errorEventListener).toHaveBeenCalledTimes(0);
				expect(abortEventListener).toHaveBeenCalledTimes(0);
				expect(timeoutEventListener).toHaveBeenCalledTimes(0);
				expect(completeEventListener).toHaveBeenCalledTimes(3);
			} else {
				console.log(`Promise ${index + 1} rejected with reason: ${result.reason.message}`);
			}
		});
	} finally {
		expect(allCompleteEventListener).toHaveBeenCalledTimes(1);
	}
});