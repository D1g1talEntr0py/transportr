export default HttpError;
export type ResponseBody = import('./transportr.js').ResponseBody;
export type ResponseStatus = import('./transportr.js').ResponseStatus;
export type HttpErrorOptions = {
    /**
     * The cause of the error.
     */
    cause: any;
    /**
     * The response status.
     */
    status: ResponseStatus;
    /**
     * The error entity from the server, if any.
     */
    entity: ResponseBody;
};
/** @typedef {import('./transportr.js').ResponseBody} ResponseBody */
/** @typedef {import('./transportr.js').ResponseStatus} ResponseStatus */
/**
 * @typedef {Object} HttpErrorOptions
 * @property {any} cause The cause of the error.
 * @property {ResponseStatus} status The response status.
 * @property {ResponseBody} entity The error entity from the server, if any.
 */
/**
 * @module HttpError
 * @extends Error
 * @author D1g1talEntr0py
 */
declare class HttpError extends Error {
    /**
     * @param {string} [message] The error message.
     * @param {HttpErrorOptions} [options] The error options.
     * @param {Error} [options.cause] The cause of the error.
     * @param {ResponseStatus} [options.status] The response status.
     * @param {ResponseBody} [options.entity] The error entity from the server, if any.
     */
    constructor(message?: string, { cause, status, entity }?: HttpErrorOptions);
    /**
     * It returns the value of the private variable #entity.
     *
     * @returns {ResponseBody} The entity property of the class.
     */
    get entity(): any;
    /**
     * It returns the status code of the {@link Response}.
     *
     * @returns {number} The status code of the {@link Response}.
     */
    get statusCode(): number;
    /**
     * It returns the status text of the {@link Response}.
     *
     * @returns {string} The status code and status text of the {@link Response}.
     */
    get statusText(): string;
    #private;
}
//# sourceMappingURL=http-error.d.ts.map