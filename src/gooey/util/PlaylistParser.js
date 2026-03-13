import URLSanitizer from './URLSanitizer.js';

/**
 * Utility class for parsing various playlist formats.
 * Supports M3U, PLS, and XSPF playlist files.
 */
export default class PlaylistParser {
    /** Default allowed protocols for track URL validation */
    static DEFAULT_ALLOWED_PROTOCOLS = new Set(['https:', 'http:']);

    /**
     * Validate a track URL against the protocol allowlist.
     * @param {string} url - The URL to validate
     * @param {Set<string>} [allowedProtocols] - Allowed protocols (default: https:, http:)
     * @returns {{valid: boolean, url: string, error?: string}}
     */
    static validateTrackUrl(url, allowedProtocols = PlaylistParser.DEFAULT_ALLOWED_PROTOCOLS) {
        try {
            const parsed = new URL(url);
            if (!allowedProtocols.has(parsed.protocol)) {
                return { valid: false, url, error: `Disallowed protocol: ${parsed.protocol}` };
            }
            return { valid: true, url: parsed.href };
        } catch {
            return { valid: false, url, error: `Invalid URL: ${url}` };
        }
    }

    /**
     * Filter tracks against protocol and origin allowlists.
     * @param {Array<{src: string, title?: string}>} tracks - Parsed tracks
     * @param {Set<string>} allowedProtocols - Allowed URL protocols
     * @param {Array<string>|null} originAllowlist - Allowed origins (null = any origin)
     * @returns {Array<{src: string, title?: string}>}
     */
    /**
     * Filter tracks against protocol, URLSanitizer, and origin allowlists.
     * @param {Array<{src: string, title?: string}>} tracks - Parsed tracks
     * @param {Set<string>} allowedProtocols - Allowed URL protocols
     * @param {Array<string>|null} originAllowlist - Allowed origins (null = any origin)
     * @param {boolean} [sameOriginOnly=true] - Enforce same-origin policy on track URLs
     * @returns {Array<{src: string, title?: string}>}
     */
    static _filterTracks(tracks, allowedProtocols, originAllowlist, sameOriginOnly = true) {
        return tracks.filter(track => {
            // First validate with URLSanitizer to reject dangerous schemes
            const sanitized = URLSanitizer.sanitizeURL(track.src, { sameOriginOnly });
            if (sanitized === null) return false;

            const result = PlaylistParser.validateTrackUrl(sanitized, allowedProtocols);
            if (!result.valid) return false;
            track.src = result.url; // Use normalized URL
            if (originAllowlist) {
                try {
                    const parsed = new URL(track.src);
                    if (!originAllowlist.includes(parsed.origin)) return false;
                } catch { return false; }
            }
            return true;
        });
    }

    /**
     * Parse playlist from URL
     * @param {string} url - Playlist URL
     * @param {Object} [options] - Parse options
     * @param {Set<string>} [options.allowedProtocols] - Allowed URL protocols (default: https:, http:)
     * @param {Array<string>|null} [options.originAllowlist] - Allowed origins (null = any origin)
     * @returns {Promise<Array<{src: string, title?: string}>>}
     */
    static async parse(url, options = {}) {
        const allowedProtocols = options.allowedProtocols || PlaylistParser.DEFAULT_ALLOWED_PROTOCOLS;
        const originAllowlist = options.originAllowlist || null;
        const sameOriginOnly = options.sameOriginOnly !== false;

        // Validate playlist URL before fetch using URLSanitizer
        const safeUrl = URLSanitizer.sanitizeURL(url, { sameOriginOnly });
        if (safeUrl === null) {
            throw new Error(`Blocked unsafe or disallowed playlist URL: ${url}`);
        }

        const response = await fetch(safeUrl);
        if (!response.ok) {
            throw new Error(`Failed to load playlist: ${response.status} ${response.statusText}`);
        }
        const content = await response.text();
        const extension = url.split('.').pop().toLowerCase();

        let tracks;
        switch (extension) {
            case 'm3u':
                tracks = this.#parseM3U(content, url);
                break;
            case 'pls':
                tracks = this.#parsePLS(content, url);
                break;
            case 'xspf':
                tracks = this.#parseXSPF(content);
                break;
            default:
                throw new Error(`Unsupported playlist format: ${extension}`);
        }

        return this._filterTracks(tracks, allowedProtocols, originAllowlist, sameOriginOnly);
    }

    /**
     * Parse M3U playlist format
     * @param {string} content - Playlist content
     * @param {string} baseUrl - Base URL for resolving relative paths
     * @returns {Array<{src: string, title: string}>}
     */
    static #parseM3U(content, baseUrl) {
        const lines = content.split('\n').filter(line =>
            line.trim() && !line.startsWith('#EXTM3U')
        );

        const tracks = [];
        let currentTitle = '';

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('#EXTINF:')) {
                const match = trimmedLine.match(/#EXTINF:[^,]*,(.+)/);
                currentTitle = match ? match[1].trim() : '';
            } else if (!trimmedLine.startsWith('#') && trimmedLine.length > 0) {
                let src;
                try {
                    src = new URL(trimmedLine, baseUrl).href;
                } catch {
                    src = trimmedLine;
                }
                tracks.push({ src, title: currentTitle });
                currentTitle = '';
            }
        }

        return tracks;
    }

    /**
     * Parse PLS playlist format
     * @param {string} content - Playlist content
     * @param {string} [baseUrl] - Base URL for resolving relative paths
     * @returns {Array<{src: string, title: string}>}
     */
    static #parsePLS(content, baseUrl) {
        const lines = content.split('\n');
        const entries = {};

        for (const line of lines) {
            const trimmedLine = line.trim();
            const fileMatch = trimmedLine.match(/^File(\d+)=(.+)$/i);
            const titleMatch = trimmedLine.match(/^Title(\d+)=(.+)$/i);

            if (fileMatch) {
                const index = fileMatch[1];
                entries[index] = entries[index] || {};
                entries[index].src = fileMatch[2].trim();
            }
            if (titleMatch) {
                const index = titleMatch[1];
                entries[index] = entries[index] || {};
                entries[index].title = titleMatch[2].trim();
            }
        }

        return Object.values(entries).filter(e => e.src).map(e => {
            let src = e.src;
            if (baseUrl) {
                try {
                    src = new URL(src, baseUrl).href;
                } catch {
                    // Keep original src if URL resolution fails (e.g., malformed path)
                }
            }
            return { src, title: e.title || '' };
        });
    }

    /**
     * Parse XSPF playlist format
     * @param {string} content - Playlist content
     * @returns {Array<{src: string, title: string}>}
     */
    static #parseXSPF(content) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'application/xml');

        const parserError = doc.querySelector('parsererror');
        if (parserError) {
            throw new Error('Invalid XSPF playlist: XML parsing error');
        }

        const trackElements = doc.querySelectorAll('track');

        return Array.from(trackElements).map(track => ({
            src: track.querySelector('location')?.textContent?.trim() || '',
            title: track.querySelector('title')?.textContent?.trim() || ''
        })).filter(t => t.src);
    }
}
