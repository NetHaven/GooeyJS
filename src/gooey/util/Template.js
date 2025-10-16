export default class Template {    
    static activate(id) {
        let clone, template;

        template = document.getElementById(id, element = document.body);
        if (template) {
            clone = document.importNode(template.content, true);
            element.appendChild(clone);
        }
    }

    static load(templateName, templateId, retryCount = 0) {
        // Check if already loaded (race condition protection)
        if (document.getElementById(templateId)) {
            return Promise.resolve();
        }

        // Add loading flag to prevent concurrent loads
        if (GooeyJS._loadingTemplates?.has(templateId)) {
            return GooeyJS._loadingTemplates.get(templateId);
        }

        const maxRetries = 3;
        const retryDelay = 1000; // 1 second

        // Create timeout-wrapped fetch with proper async error handling
        const timeoutMs = 10000; // 10 second timeout
        const loadPromise = Template._timeoutPromise(
            fetch(templateName, {
                method: 'GET',
                cache: 'default',
                headers: {
                    'Accept': 'text/html,text/plain,*/*',
                    'Cache-Control': 'max-age=3600'
                }
            }),
            timeoutMs,
            `Template loading timeout for ${templateName}`
        )
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load template ${templateName}: ${response.status} ${response.statusText}`);
                }
                return response.text();
            })
            .then(html => {
                if (!html || html.trim().length === 0) {
                    throw new Error(`Template ${templateName} is empty or invalid`);
                }
                
                try {
                    // Final check before DOM injection
                    if (!document.getElementById(templateId)) {
                        const fragment = document.createRange().createContextualFragment(html);
                        document.body.appendChild(fragment);
                        console.info('TEMPLATE_LOADED', `Template loaded successfully: ${templateId}`);
                    }
                } catch (domError) {
                    throw new Error(`Failed to inject template ${templateId} into DOM: ${domError.message}`);
                }
            })
            .catch(error => {
                console.error('TEMPLATE_LOAD_ERROR', `Template loading error for ${templateId}`, { error: error.message, templateId });
                
                // Retry logic for network errors
                if (retryCount < maxRetries && (error.name === 'TypeError' || error.message.includes('Failed to fetch'))) {
                    console.warn('TEMPLATE_RETRY', `Retrying template load for ${templateId} (attempt ${retryCount + 1}/${maxRetries})`);
                    return new Promise(resolve => {
                        setTimeout(() => {
                            resolve(Template.loadT(templateName, templateId, retryCount + 1));
                        }, retryDelay * (retryCount + 1)); // Exponential backoff
                    });
                }     
            });

        // Track loading state
        if (!Template._loading) {
            Template._loading = new Map();
        }
        Template._loading.set(templateId, loadPromise);

        return loadPromise;
    }

     /**
     * Creates a timeout-wrapped promise for async operations
     * @param {Promise} promise - The promise to wrap with timeout
     * @param {number} timeoutMs - Timeout in milliseconds
     * @param {string} errorMessage - Error message for timeout
     * @returns {Promise} - Promise that rejects if timeout is reached
     */
    static _timeoutPromise(promise, timeoutMs, errorMessage) {
        return new Promise((resolve, reject) => {
            // Create timeout promise that rejects after specified time
            const timeoutPromise = new Promise((_, timeoutReject) => {
                setTimeout(() => {
                    timeoutReject(new Error(errorMessage || `Operation timed out after ${timeoutMs}ms`));
                }, timeoutMs);
            });

            // Race between the original promise and timeout
            Promise.race([promise, timeoutPromise])
                .then(resolve)
                .catch(reject);
        });
    }
}