/**
 * A constant object that contains all the media types that are supported by the browser.
 *
 * @module HttpMediaType
 * @constant {Object<string, string>}
 */
const HttpMediaType = {
	/** Advanced Audio Coding (AAC) */
	AAC: 'audio/aac',
	/** AbiWord */
	ABW: 'application/x-abiword',
	/** Archive document (multiple files embedded) */
	ARC: 'application/x-freearc',
	/** AVIF image */
	AVIF: 'image/avif',
	/** Audio Video Interleave (AVI) */
	AVI: 'video/x-msvideo',
	/** Amazon Kindle eBook format */
	AZW: 'application/vnd.amazon.ebook',
	/** Binary Data */
	BIN: 'application/octet-stream',
	/** Windows OS/2 Bitmap Graphics */
	BMP: 'image/bmp',
	/** Bzip Archive */
	BZIP: 'application/x-bzip',
	/** Bzip2 Archive */
	BZIP2: 'application/x-bzip2',
	/** CD audio */
	CDA: 'application/x-cdf',
	/** C Shell Script */
	CSH: 'application/x-csh',
	/** Cascading Style Sheets (CSS) */
	CSS: 'text/css',
	/** Comma-Separated Values */
	CSV: 'text/csv',
	/** Microsoft Office Word Document */
	DOC: 'application/msword',
	/** Microsoft Office Word Document (OpenXML) */
	DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	/** Microsoft Embedded OpenType */
	EOT: 'application/vnd.ms-fontobject',
	/** Electronic Publication (EPUB) */
	EPUB: 'application/epub+zip',
	/** GZip Compressed Archive */
	GZIP: 'application/gzip',
	/** Graphics Interchange Format */
	GIF: 'image/gif',
	/** HyperText Markup Language (HTML) */
	HTML: 'text/html',
	/** Icon Format */
	ICO: 'image/vnd.microsoft.icon',
	/** iCalendar Format */
	ICS: 'text/calendar',
	/** Java Archive (JAR) */
	JAR: 'application/java-archive',
	/** JPEG Image */
	JPEG: 'image/jpeg',
	/** JavaScript */
	JAVA_SCRIPT: 'text/javascript',
	/** JavaScript Object Notation Format (JSON) */
	JSON: 'application/json',
	/** JavaScript Object Notation LD Format */
	JSON_LD: 'application/ld+json',
	/** JavaScript Object Notation (JSON) Merge Patch */
	JSON_MERGE_PATCH: 'application/merge-patch+json',
	/** Musical Instrument Digital Interface (MIDI) */
	MID: 'audio/midi',
	/** Musical Instrument Digital Interface (MIDI) */
	X_MID: 'audio/x-midi',
	/** MP3 Audio */
	MP3: 'audio/mpeg',
	/** MPEG-4 Audio */
	MP4A: 'audio/mp4',
	/** MPEG-4 Video */
	MP4: 'video/mp4',
	/** MPEG Video */
	MPEG: 'video/mpeg',
	/** Apple Installer Package */
	MPKG: 'application/vnd.apple.installer+xml',
	/** OpenDocument Presentation Document */
	ODP: 'application/vnd.oasis.opendocument.presentation',
	/** OpenDocument Spreadsheet Document */
	ODS: 'application/vnd.oasis.opendocument.spreadsheet',
	/** OpenDocument Text Document */
	ODT: 'application/vnd.oasis.opendocument.text',
	/** Ogg Audio */
	OGA: 'audio/ogg',
	/** Ogg Video */
	OGV: 'video/ogg',
	/** Ogg */
	OGX: 'application/ogg',
	/** Opus audio */
	OPUS: 'audio/opus',
	/** OpenType Font File */
	OTF: 'font/otf',
	/** Portable Network Graphics (PNG) */
	PNG: 'image/png',
	/** Adobe Portable Document Format */
	PDF: 'application/pdf',
	/** Hypertext Preprocessor (Personal Home Page) */
	PHP: 'application/x-httpd-php',
	/** Microsoft PowerPoint */
	PPT: 'application/vnd.ms-powerpoint',
	/** Microsoft Office Presentation (OpenXML) */
	PPTX: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
	/** RAR Archive */
	RAR: 'application/vnd.rar',
	/** Rich Text Format */
	RTF: 'application/rtf',
	/** Bourne Shell Script */
	SH: 'application/x-sh',
	/** Scalable Vector Graphics (SVG) */
	SVG: 'image/svg+xml',
	/** Tape Archive (TAR) */
	TAR: 'application/x-tar',
	/** Tagged Image File Format (TIFF) */
	TIFF: 'image/tiff',
	/** MPEG transport stream */
	TRANSPORT_STREAM: 'video/mp2t',
	/** TrueType Font */
	TTF: 'font/ttf',
	/** Text, (generally ASCII or ISO 8859-n) */
	TEXT: 'text/plain',
	/** Microsoft Visio */
	VSD: 'application/vnd.visio',
	/** Waveform Audio Format (WAV) */
	WAV: 'audio/wav',
	/** Open Web Media Project - Audio */
	WEBA: 'audio/webm',
	/** Open Web Media Project - Video */
	WEBM: 'video/webm',
	/** WebP Image */
	WEBP: 'image/webp',
	/** Web Open Font Format */
	WOFF: 'font/woff',
	/** Web Open Font Format */
	WOFF2: 'font/woff2',
	/** Form - Encoded */
	FORM: 'application/x-www-form-urlencoded',
	/** Multipart FormData */
	MULTIPART_FORM_DATA: 'multipart/form-data',
	/** XHTML - The Extensible HyperText Markup Language */
	XHTML: 'application/xhtml+xml',
	/** Microsoft Excel Document */
	XLS: 'application/vnd.ms-excel',
	/** Microsoft Office Spreadsheet Document (OpenXML) */
	XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	/** Extensible Markup Language (XML) */
	XML: 'application/xml',
	/** XML User Interface Language (XUL) */
	XUL: 'application/vnd.mozilla.xul+xml',
	/** Zip Archive */
	ZIP: 'application/zip',
	/** 3GPP audio/video container */
	'3GP': 'video/3gpp',
	/** 3GPP2 audio/video container */
	'3G2': 'video/3gpp2',
	/** 7-Zip Archive */
	'7Z': 'application/x-7z-compressed',
};

export default HttpMediaType;