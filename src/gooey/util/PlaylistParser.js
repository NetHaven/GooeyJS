/**
 * Utility class for parsing various playlist formats.
 * Supports M3U, PLS, and XSPF playlist files.
 */
export default class PlaylistParser {
    /**
     * Parse playlist from URL
     * @param {string} url - Playlist URL
     * @returns {Promise<Array<{src: string, title?: string}>>}
     */
    static async parse(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load playlist: ${response.status} ${response.statusText}`);
        }
        const content = await response.text();
        const extension = url.split('.').pop().toLowerCase();

        switch (extension) {
            case 'm3u':
                return this.#parseM3U(content, url);
            case 'pls':
                return this.#parsePLS(content);
            case 'xspf':
                return this.#parseXSPF(content);
            default:
                throw new Error(`Unsupported playlist format: ${extension}`);
        }
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
     * @returns {Array<{src: string, title: string}>}
     */
    static #parsePLS(content) {
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

        return Object.values(entries).filter(e => e.src).map(e => ({
            src: e.src,
            title: e.title || ''
        }));
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
