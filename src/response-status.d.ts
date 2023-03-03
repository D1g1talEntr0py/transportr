/**
 * A class that holds a status code and a status text
 *
 * @module ResponseStatus
 * @author D1g1talEntr0py
 */
export default class ResponseStatus {
    /**
     *
     * @param {number} code The status code from the {@link Response}
     * @param {string} text The status text from the {@link Response}
     */
    constructor(code: number, text: string);
    /**
     * Returns the status code from the {@link Response}
     *
     * @returns {number} The status code.
     */
    get code(): number;
    /**
     * Returns the status text from the {@link Response}.
     *
     * @returns {string} The status text.
     */
    get text(): string;
    #private;
}
//# sourceMappingURL=response-status.d.ts.map