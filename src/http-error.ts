import type { ResponseStatus } from '@src/response-status';
import type { ResponseBody, RequestTiming, HttpErrorOptions } from '@src/@types/core';

/**
 * An error that represents an HTTP error response.
 * @author D1g1talEntr0py <jason.dimeo@gmail.com>
 */
class HttpError extends Error {
	private readonly _entity: ResponseBody;
	private readonly responseStatus: ResponseStatus;
	private readonly _url: URL | undefined;
	private readonly _method: string | undefined;
	private readonly _timing: RequestTiming | undefined;

	/**
	 * Creates an instance of HttpError.
	 * @param status The status code and status text of the {@link Response}.
	 * @param httpErrorOptions The http error options.
	 */
	constructor(status: ResponseStatus, { message, cause, entity, url, method, timing }: HttpErrorOptions = {}) {
		super(message, { cause });
		this._entity = entity;
		this.responseStatus = status;
		this._url = url;
		this._method = method;
		this._timing = timing;
	}

	/**
	 * It returns the value of the private variable #entity.
	 * @returns The entity property of the class.
	 */
	get entity(): ResponseBody {
		return this._entity;
	}

	/**
	 * It returns the status code of the {@link Response}.
	 * @returns The status code of the {@link Response}.
	 */
	get statusCode(): number {
		return this.responseStatus.code;
	}

	/**
	 * It returns the status text of the {@link Response}.
	 * @returns The status code and status text of the {@link Response}.
	 */
	get statusText(): string {
		return this.responseStatus?.text;
	}

	/**
	 * The request URL that caused the error.
	 * @returns The URL or undefined.
	 */
	get url(): URL | undefined {
		return this._url;
	}

	/**
	 * The HTTP method that was used for the failed request.
	 * @returns The method string or undefined.
	 */
	get method(): string | undefined {
		return this._method;
	}

	/**
	 * Timing information for the failed request.
	 * @returns The timing object or undefined.
	 */
	get timing(): RequestTiming | undefined {
		return this._timing;
	}

	/**
	 * A String value representing the name of the error.
	 * @returns The name of the error.
	 */
	override get name(): string {
		return 'HttpError';
	}

	/**
	 * A String value that is used in the creation of the default string
	 * description of an object. Called by the built-in method {@link Object.prototype.toString}.
	 * @returns The default string description of this object.
	 */
	get [Symbol.toStringTag](): string {
		return this.name;
	}
}

export { HttpError };
export type { ResponseBody, RequestTiming, HttpErrorOptions };