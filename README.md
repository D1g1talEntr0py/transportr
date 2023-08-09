# transportr
JavaScript wrapper for Fetch API
## Installation
```bash
npm install @d1g1tal/transportr
```
## Usage
```javascript
import Transportr from '@d1g1tal/transportr';

// Creates default instance configured for JSON requests using UTF-8 encoding.
const transportr = new Transportr('https://jsonplaceholder.typicode.com', { headers: { [Transportr.RequestHeader.CONTENT_TYPE]: Transportr.MediaType.JSON }, encoding: 'utf-8', });

transportr.get('/todos/1')
  .then(json => console.log(json))
  .catch(error => console.error(error.message));
```
Or

```javascript
const transportr = new Transportr('https://jsonplaceholder.typicode.com');

try {
  const todo1 = await transportr.getJson('/todos/1');
  console.log(todo1);

  const todo2 = await transportr.getJson('/todos/2');
  console.log(todo2);
} catch (error) {
  console.error(error.message);
}
```

## API
### Transportr
#### constructor(options)
##### options
Type: `Object`

###### options.baseURL
Type: `String`
Base URL for all requests.

###### options.headers
Type: `Object`
Default headers for all requests.

###### options.timeout
Type: `Number`
Default timeout for all requests.

###### options.credentials
Type: `String`
Default credentials for all requests.

###### options.mode
Type: `String`
Default mode for all requests.

###### options.cache
Type: `String`
Default cache for all requests.

###### options.redirect
Type: `String`
Default redirect for all requests.

###### options.referrer
Type: `String`
Default referrer for all requests.

###### options.integrity
Type: `String`
Default integrity for all requests.

###### options.keepalive
Type: `Boolean`
Default keepalive for all requests.

###### options.signal
Type: `AbortSignal`
Default signal for all requests.

###### options.encoding
Type: `String`
Default encoding for all requests.

###### options.body
Type: `Object|String|FormData|URLSearchParams|Blob|BufferSource|ReadableStream`
Default body for all requests.