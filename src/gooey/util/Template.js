export default class Template {    
    static activate(id, element = document.body) {
        let clone, template;

        template = document.getElementById(id, element);
        if (template) {
            clone = document.importNode(template.content, true);
            element.appendChild(clone);
        }
    }

    static _loading = new Map();

    static load(templateName, templateId, retryCount = 0) {
        // Check if already loaded (race condition protection)
        if (document.getElementById(templateId)) {
            return Promise.resolve();
        }

        // Return existing promise if load in progress (deduplication)
        if (Template._loading.has(templateId)) {
            return Template._loading.get(templateId);
        }

        const maxRetries = 3;
        const retryDelay = 1000; // 1 second
        const timeoutMs = 10000; // 10 second timeout

        // Create AbortController to properly cancel fetch on timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, timeoutMs);

        const loadPromise = fetch(templateName, {
            method: 'GET',
            cache: 'default',
            headers: {
                'Accept': 'text/html,text/plain,*/*',
                'Cache-Control': 'max-age=3600'
            },
            signal: controller.signal
        })
            .then(response => {
                clearTimeout(timeoutId);
                if (!response.ok) {
                    throw new Error(`Failed to load template ${templateName}: ${response.status} ${response.statusText}`);
                }
                return response.text();
            })
            .then(html => {
                if (!html || html.trim().length === 0) {
                    throw new Error(`Template ${templateName} is empty or invalid`);
                }

                // Final check before DOM injection
                if (!document.getElementById(templateId)) {
                    // Extract template directory path for resolving relative URLs
                    const templateDir = templateName.substring(0, templateName.lastIndexOf('/') + 1);

                    // Rewrite relative URLs in media elements to be relative to template location
                    if (templateDir) {
                        html = Template._rewriteMediaUrls(html, templateDir);
                    }

                    // Add default slot to templates that don't have one (required for shadow DOM child projection)
                    html = Template._ensureSlot(html);

                    // Parse HTML in an inert context (CSP-safe, no script execution)
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');

                    // Extract only <template> elements
                    const templates = doc.querySelectorAll('template');
                    if (templates.length === 0) {
                        throw new Error(`Template ${templateName} contains no <template> elements`);
                    }

                    for (const template of templates) {
                        // Avoid duplicates
                        if (!document.getElementById(template.id)) {
                            document.body.appendChild(document.adoptNode(template));
                        }
                    }
                    console.info('TEMPLATE_LOADED', `Template loaded successfully: ${templateId}`);
                }
            })
            .catch(error => {
                clearTimeout(timeoutId);

                // Convert abort errors to timeout errors for clearer messaging
                const isTimeout = error.name === 'AbortError';
                const errorMessage = isTimeout
                    ? `Template loading timeout for ${templateName} (exceeded ${timeoutMs}ms)`
                    : error.message;

                console.error('TEMPLATE_LOAD_ERROR', `Template loading error for ${templateId}`, { error: errorMessage, templateId });

                // Retry logic for network errors and timeouts
                const isRetryable = error.name === 'TypeError' ||
                    error.message.includes('Failed to fetch') ||
                    isTimeout;

                if (retryCount < maxRetries && isRetryable) {
                    console.warn('TEMPLATE_RETRY', `Retrying template load for ${templateId} (attempt ${retryCount + 1}/${maxRetries})`);
                    return new Promise(resolve => {
                        setTimeout(() => {
                            resolve(Template.load(templateName, templateId, retryCount + 1));
                        }, retryDelay * (retryCount + 1)); // Exponential backoff
                    });
                }

                throw isTimeout ? new Error(errorMessage) : error;
            })
            .finally(() => {
                // Clean up loading state to allow future re-fetches
                Template._loading.delete(templateId);
            });

        Template._loading.set(templateId, loadPromise);

        return loadPromise;
    }

    /**
     * Ensures templates have a <slot> element for shadow DOM child projection
     * @param {string} html - The HTML content to process
     * @returns {string} - HTML with slot elements added where needed
     */
    static _ensureSlot(html) {
        // Check if any template already has a slot element
        // If not, add <slot></slot> before the closing </template> tag
        return html.replace(
            /(<template[^>]*>)([\s\S]*?)(<\/template>)/gi,
            (match, openTag, content, closeTag) => {
                // Check if content already has a slot element
                if (/<slot[\s>]/i.test(content)) {
                    return match;
                }
                // Add slot at the end of template content
                return `${openTag}${content}<slot></slot>${closeTag}`;
            }
        );
    }

    /**
     * Rewrites relative URLs in media elements (img, video, audio) to be relative to template location
     * @param {string} html - The HTML content to process
     * @param {string} templateDir - The directory path where the template is located
     * @returns {string} - HTML with rewritten URLs
     */
    static _rewriteMediaUrls(html, templateDir) {
        // Match src attributes in img, video, audio, and source tags
        // Only rewrite relative paths (not absolute, protocol-relative, or data URIs)
        return html.replace(
            /(<(?:img|video|audio|source)[^>]*\ssrc=["'])([^"']+)(["'][^>]*>)/gi,
            (match, before, url, after) => {
                // Skip absolute URLs, protocol-relative URLs, and data URIs
                if (url.startsWith('/') ||
                    url.startsWith('http://') ||
                    url.startsWith('https://') ||
                    url.startsWith('data:') ||
                    url.startsWith('//')) {
                    return match;
                }
                // Prepend template directory to relative URL
                return `${before}${templateDir}${url}${after}`;
            }
        );
    }

}