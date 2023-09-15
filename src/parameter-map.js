/**
 * @typedef {Map<string, Array<*>>} ParameterMap
 * @extends Map
 */

/**
 * A {@link Map} that can contain multiple, unique, values for the same key.
 *
 * @type {ParameterMap<string, Array<*>>}
 */
export default class ParameterMap extends Map {
	/**
	 * @param {Iterable<[string, *]>|Object} parameters The initial parameters to set.
	 * @returns {ParameterMap<string, *>} The ParameterMap with the updated key and value.
	 */
	constructor(parameters = {}) {
		super();
		for (const [key, value] of ParameterMap.#entries(parameters)) {
			this.append(key, value);
		}
	}

	/**
	 * Adds a new element with a specified key and value to the ParameterMap.
	 * If an element with the same key already exists, the value will be replaced in the underlying {@link Set}.
	 *
	 * @override
	 * @param {string} key The key to set.
	 * @param {*} value The value to add to the ParameterMap
	 * @returns {ParameterMap<string, *>} The ParameterMap with the updated key and value.
	 */
	set(key, value) {
		const array = super.get(key);
		if (array?.length > 0) {
			array.length = 0;
			array[0] = value;
		} else {
			super.set(key, [value]);
		}

		return this;
	}

	/**
	 * Adds all key-value pairs from an iterable or object to the ParameterMap.
	 * If a key already exists, the value will be replaced in the underlying {@link Array}.
	 *
	 * @param {Iterable<[string, *]>|Object} parameters The parameters to set.
	 * @returns {ParameterMap<string, *>} The ParameterMap with the updated key and value.
	 */
	setAll(parameters) {
		for (const [key, value] of ParameterMap.#entries(parameters)) {
			this.set(key, value);
		}

		return this;
	}

	/**
	 * Returns the value associated to the key, or undefined if there is none.
	 * If the key has multiple values, the first value will be returned.
	 * If the key has no values, undefined will be returned.
	 *
	 * @override
	 * @param {string} key The key to get.
	 * @returns {*} The value associated to the key, or undefined if there is none.
	 */
	get(key) {
		return super.get(key)?.[0];
	}

	/**
	 * Returns an array of all values associated to the key, or undefined if there are none.
	 *
	 * @param {string} key The key to get.
	 * @returns {Array<*>} An array of all values associated to the key, or undefined if there are none.
	 */
	getAll(key) {
		return super.get(key);
	}

	/**
	 * Appends a new value to an existing key inside a ParameterMap, or adds the new key if it does not exist.
	 *
	 * @param {string} key The key to append.
	 * @param {*} value The value to append.
	 * @returns {ParameterMap<string, *>} The ParameterMap with the updated key and value to allow chaining.
	 */
	append(key, value) {
		const array = super.get(key);
		if (array?.length > 0) {
			array.push(value);
		} else {
			super.set(key, [value]);
		}

		return this;
	}

	/**
	 * Appends all key-value pairs from an iterable or object to the ParameterMap.
	 * If a key already exists, the value will be appended to the underlying {@link Array}.
	 * If a key does not exist, the key and value will be added to the ParameterMap.
	 *
	 * @param {Iterable<[string, *]>|Object} parameters The parameters to append.
	 * @returns {ParameterMap<string, *>} The ParameterMap with the updated key and value.
	 */
	appendAll(parameters) {
		for (const [key, value] of ParameterMap.#entries(parameters)) {
			this.append(key, value);
		}

		return this;
	}

	/**
	 * Checks if a specific key has a specific value.
	 *
	 * @param {*} value The value to check.
	 * @returns {boolean} True if the key has the value, false otherwise.
	 */
	hasValue(value) {
		for (const array of super.values()) {
			if (array.includes(value)) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Removes a specific value from a specific key.
	 *
	 * @param {*} value The value to remove.
	 * @returns {boolean} True if the value was removed, false otherwise.
	 */
	deleteValue(value) {
		for (const array of this.values()) {
			if (array.includes(value)) {
				return array.splice(array.indexOf(value), 1).length > 0;
			}
		}

		return false;
	}

	/**
	 * Determines whether the ParameterMap contains anything.
	 *
	 * @returns {boolean} True if the ParameterMap size is greater than 0, false otherwise.
	 */
	isEmpty() {
		return this.size === 0;
	}

	/**
	 * Returns an Object that can be serialized to JSON.
	 * If a key has only one value, the value will be a single value.
	 * If a key has multiple values, the value will be an array of values.
	 * If a key has no values, the value will be undefined.
	 *
	 * @override
	 * @returns {Object} The Object to be serialized to JSON.
	 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#toJSON_behavior}
	 */
	toJSON() {
		const obj = Object.create(null);

		for (const [key, values] of super.entries()) {
			obj[key] = values.length === 1 ? values[0] : values;
		}

		return obj;
	}

	/**
	 * Returns an iterator that yields all key-value pairs in the map as arrays in their insertion order.
	 *
	 * @override
	 * @yields {[string, *]} An iterator for the key-value pairs in the map.
	 */
	*entries() {
		for (const [key, array] of super.entries()) {
			for (const value of array) { yield [key, value] }
		}
	}

	/**
	 * Returns an iterator that yields all key-value pairs in the map as arrays in their insertion order.
	 *
	 * @override
	 * @yields {[string, *]} An iterator for the key-value pairs in the map.
	 */
	*[Symbol.iterator]() {
		yield* this.entries();
	}

	/**
	 * Returns an iterable of key, value pairs for every entry in the parameters object.
	 *
	 * @private
	 * @static
	 * @param {Iterable<[string, *]>|Object} parameters The parameters to set.
	 * @returns {Iterable<[string, *]>} An iterable of key, value pairs for every entry in the parameters object.
	 */
	static #entries(parameters) {
		return parameters[Symbol.iterator] ? parameters : Object.entries(parameters);
	}

	/**
	 * A String value that is used in the creation of the default string description of an object.
	 * Called by the built-in method {@link Object.prototype.toString}.
	 *
	 * @override
	 * @returns {string} The default string description of this object.
	 */
	get [Symbol.toStringTag]() {
		return 'ParameterMap';
	}
}