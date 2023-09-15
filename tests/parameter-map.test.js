import ParameterMap from '../src/parameter-map.js';
import { jest, describe, it, expect } from '@jest/globals';

describe('ParameterMap', () => {
	describe('constructor', () => {
		it('should create an empty map', () => {
			const params = new ParameterMap();
			expect(params.size).toBe(0);
		});

		it('should create a map from an iterable', () => {
			const params = new ParameterMap([['foo', 'bar'], ['baz', 'qux']]);
			expect(params.get('foo')).toBe('bar');
			expect(params.get('baz')).toBe('qux');
		});

		it('should create a map from an object', () => {
			const params = new ParameterMap({ foo: 'bar', baz: 'qux' });
			expect(params.get('foo')).toBe('bar');
			expect(params.get('baz')).toBe('qux');
		});

		it('should create a map from a ParameterMap', () => {
			const params = new ParameterMap({ foo: 'bar', baz: 'qux' });
			params.append('baz', 'quux');
			const params2 = new ParameterMap(params);
			expect(params2.get('foo')).toBe('bar');
			expect(params2.get('baz')).toBe('qux');
			expect(params2.getAll('baz')).toStrictEqual(['qux', 'quux']);
		});

		it('should create a map from a URLSearchParams', () => {
			const params = new URLSearchParams({ foo: 'bar', baz: 'qux' });
			params.append('baz', 'quux');
			const params2 = new ParameterMap(params);
			expect(params2.get('foo')).toBe('bar');
			expect(params2.get('baz')).toBe('qux');
			expect(params2.get('baz')).toBe(params.get('baz'));
		});

		it('should create a map from a FormData', () => {
			const params = new FormData();
			params.append('foo', 'bar');
			params.append('baz', 'qux');
			params.append('baz', 'quux');
			const params2 = new ParameterMap(params);
			expect(params2.get('foo')).toBe('bar');
			expect(params2.get('baz')).toBe('qux');
			expect(params2.getAll('baz')).toEqual(['qux', 'quux']);
		});
	});

	describe('set', () => {
		it('should set a single value', () => {
			const params = new ParameterMap();
			params.set('foo', 'bar');
			expect(params.get('foo')).toBe('bar');
		});

		it('set should replace multiple values', () => {
			const params = new ParameterMap();
			params.set('foo', 'bar');
			params.set('baz', 'qux');
			params.set('baz', 'quux');
			expect(params.getAll('baz')).toEqual(['quux']);
		});
	});

	describe('setAll', () => {
		it('should set multiple values', () => {
			const params = new ParameterMap();
			params.setAll({ foo: 'bar', baz: 'qux' });
			expect(params.get('foo')).toBe('bar');
			expect(params.get('baz')).toBe('qux');
		});

		it('should set multiple values from an iterable', () => {
			const params = new ParameterMap();
			params.setAll([['foo', 'bar'], ['baz', 'qux']]);
			expect(params.get('foo')).toBe('bar');
			expect(params.get('baz')).toBe('qux');
		});
	});

	describe('append', () => {
		it('should append a single value', () => {
			const params = new ParameterMap();
			params.append('foo', 'bar');
			expect(params.get('foo')).toBe('bar');
		});

		it('should append multiple values', () => {
			const params = new ParameterMap();
			params.append('foo', 'bar');
			params.append('baz', 'qux');
			params.append('baz', 'quux');
			expect(params.getAll('baz')).toEqual(['qux', 'quux']);
		});
	});

	describe('appendAll', () => {
		it('should append multiple values', () => {
			const params = new ParameterMap();
			params.appendAll({ foo: 'bar', baz: 'qux' });
			expect(params.get('foo')).toBe('bar');
			expect(params.get('baz')).toBe('qux');
		});

		it('should append multiple values from an iterable', () => {
			const params = new ParameterMap();
			params.appendAll([['foo', 'bar'], ['baz', 'qux']]);
			expect(params.get('foo')).toBe('bar');
			expect(params.get('baz')).toBe('qux');
		});
	});

	describe('hasValue', () => {
		it('should return true if the value exists', () => {
			const params = new ParameterMap();
			params.set('foo', 'bar');
			expect(params.hasValue('bar')).toBe(true);
		});

		it('should return false if the value does not exist and the map is empty', () => {
			const params = new ParameterMap();
			expect(params.hasValue('bar')).toBe(false);
		});

		it('should return false if the value does not exist and the map is not empty', () => {
			const params = new ParameterMap();
			params.set('foo', 'bar');
			expect(params.hasValue('baz')).toBe(false);
		});
	});

	describe('deleteValue', () => {
		it('should delete a single value', () => {
			const params = new ParameterMap();
			params.set('baz', 'qux');
			params.set('foo', 'bar');
			params.append('baz', 'quux');
			expect(params.deleteValue('bar')).toBe(true);
			expect(params.get('foo')).toBeUndefined();
		});

		it('should delete all values', () => {
			const params = new ParameterMap();
			params.set('foo', 'bar');
			params.append('baz', 'qux');
			params.append('baz', 'quux');
			params.delete('baz');
			expect(params.getAll('baz')).toBeUndefined();
		});

		it('should return false if the value does not exist', () => {
			const params = new ParameterMap();
			expect(params.deleteValue('bar')).toBe(false);
		});
	});

	describe('isEmpty', () => {
		it('should return true if the map is empty', () => {
			const params = new ParameterMap();
			expect(params.isEmpty()).toBe(true);
		});

		it('should return false if the map is not empty', () => {
			const params = new ParameterMap();
			params.set('foo', 'bar');
			expect(params.isEmpty()).toBe(false);
		});
	});

	describe('entries', () => {
		it('should return an iterator of key-value pairs', () => {
			const params = new ParameterMap();
			params.set('foo', 'bar');
			params.append('baz', 'qux');
			params.append('baz', 'quux');
			const entries = [...params.entries()];
			expect(entries).toEqual([
				['foo', 'bar'],
				['baz', 'qux'],
				['baz', 'quux']
			]);
		});
	});

	describe('forEach', () => {
		it('should call a function for each key-value pair', () => {
			const params = new ParameterMap();
			params.set('foo', 'bar');
			params.append('baz', 'qux');
			params.append('baz', 'quux');
			const callback = jest.fn();
			params.forEach(callback);
			expect(callback).toHaveBeenCalledTimes(2);
			expect(callback).toHaveBeenCalledWith(['bar'], 'foo', params);
			expect(callback).toHaveBeenCalledWith(['qux', 'quux'], 'baz', params);
		});
	});

	describe('get', () => {
		it('should return the first value for a key', () => {
			const params = new ParameterMap();
			params.set('foo', 'bar');
			params.append('baz', 'qux');
			params.append('baz', 'quux');
			expect(params.get('foo')).toBe('bar');
			expect(params.get('baz')).toBe('qux');
		});

		it('should return undefined if the key does not exist', () => {
			const params = new ParameterMap();
			expect(params.get('foo')).toBeUndefined();
		});
	});

	describe('getAll', () => {
		it('should return an array of all values for a key', () => {
			const params = new ParameterMap();
			params.set('foo', 'bar');
			params.append('baz', 'qux');
			params.append('baz', 'quux');
			expect(params.getAll('foo')).toEqual(['bar']);
			expect(params.getAll('baz')).toEqual(['qux', 'quux']);
		});

		it('should return undefined if the key does not exist', () => {
			const params = new ParameterMap();
			expect(params.getAll('foo')).toBeUndefined();
		});
	});

	describe('has', () => {
		it('should return true if the key exists', () => {
			const params = new ParameterMap();
			params.set('foo', 'bar');
			expect(params.has('foo')).toBe(true);
		});

		it('should return false if the key does not exist', () => {
			const params = new ParameterMap();
			expect(params.has('foo')).toBe(false);
		});
	});

	describe('delete', () => {
		it('should delete a key', () => {
			const params = new ParameterMap();
			params.set('foo', 'bar');
			params.append('baz', 'qux');
			params.append('baz', 'quux');
			params.delete('baz');
			expect(params.get('baz')).toBeUndefined();
		});

		it('should return true if the key exists', () => {
			const params = new ParameterMap();
			params.set('foo', 'bar');
			expect(params.delete('foo')).toBe(true);
		});

		it('should return false if the key does not exist', () => {
			const params = new ParameterMap();
			expect(params.delete('foo')).toBe(false);
		});
	});

	describe('clear', () => {
		it('should clear the map', () => {
			const params = new ParameterMap();
			params.set('foo', 'bar');
			params.append('baz', 'qux');
			params.append('baz', 'quux');
			params.clear();
			expect(params.size).toBe(0);
		});
	});

	describe('keys', () => {
		it('should return an iterator of keys', () => {
			const params = new ParameterMap();
			params.set('foo', 'bar');
			params.append('baz', 'qux');
			params.append('baz', 'quux');
			const keys = [...params.keys()];
			expect(keys).toEqual(['foo', 'baz']);
		});
	});

	describe('values', () => {
		it('should return an iterator of values', () => {
			const params = new ParameterMap();
			params.set('foo', 'bar');
			params.append('baz', 'qux');
			params.append('baz', 'quux');
			const values = [...params.values()];
			expect(values).toEqual([['bar'], ['qux', 'quux']]);
		});
	});

	describe('toJSON', () => {
		it('should return an object with single-value entries as a single value', () => {
			const params = new ParameterMap();
			params.set('foo', 'bar');
			params.append('baz', 'qux');
			params.append('baz', 'quux');
			params.append('baz', 'wuz');
			const json = JSON.stringify(params);
			expect(json).toBe('{"foo":"bar","baz":["qux","quux","wuz"]}');
		});
	});
});