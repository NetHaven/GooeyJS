/**
 * PluginManager is the central registry managing plugin lifecycle for
 * the RichTextEditor.
 *
 * Responsibilities:
 *   - Register/unregister plugins with init/destroy lifecycle
 *   - Enable/disable plugins at runtime
 *   - Aggregate contributions (keymaps, input rules, paste rules,
 *     toolbar items, context menu items, schema extensions)
 *   - Run transaction filters and state-update hooks
 *   - Fire PLUGIN_LOADED / PLUGIN_ERROR events on the editor
 *
 * Error isolation: every plugin method call is wrapped in try/catch
 * so one broken plugin cannot break the editor.
 */
import RichTextEditorEvent from '../../../../../../events/form/text/RichTextEditorEvent.js';

export default class PluginManager {

    /**
     * @param {object} editor - RichTextEditor instance
     */
    constructor(editor) {
        /** @type {object} */
        this._editor = editor;

        /** @type {Map<string, object>} name -> plugin instance */
        this._plugins = new Map();

        /** @type {Set<string>} names of disabled plugins */
        this._disabledPlugins = new Set();
    }

    // =========================================================================
    // Registration / Lifecycle
    // =========================================================================

    /**
     * Register a plugin. Accepts a Plugin class (instantiated internally)
     * or an already-constructed instance.
     *
     * Calls plugin.init(editor) after registration. Fires PLUGIN_LOADED
     * on success, PLUGIN_ERROR on failure.
     *
     * @param {Function|object} PluginClassOrInstance - Plugin class or instance
     * @param {object} [options={}] - Options passed to constructor if class
     * @returns {object|null} The plugin instance, or null on failure
     */
    registerPlugin(PluginClassOrInstance, options = {}) {
        let plugin;
        let name;

        try {
            // Determine if we received a class or an instance
            if (typeof PluginClassOrInstance === 'function') {
                plugin = new PluginClassOrInstance(options);
                name = PluginClassOrInstance.pluginName;
            } else {
                plugin = PluginClassOrInstance;
                name = plugin.constructor.pluginName;
            }

            if (!name) {
                throw new Error('Plugin must have a static pluginName getter');
            }

            // Prevent duplicate registration
            if (this._plugins.has(name)) {
                console.warn(`PluginManager: plugin "${name}" is already registered. Skipping.`);
                return this._plugins.get(name);
            }

            // Initialize plugin with editor
            plugin.init(this._editor);

            // Store in registry
            this._plugins.set(name, plugin);

            // Fire success event
            this._fireEvent(RichTextEditorEvent.PLUGIN_LOADED, { pluginName: name });

            return plugin;
        } catch (err) {
            console.warn(`PluginManager: failed to register plugin "${name || 'unknown'}":`, err);
            this._fireEvent(RichTextEditorEvent.PLUGIN_ERROR, {
                pluginName: name || 'unknown',
                error: err
            });
            return null;
        }
    }

    /**
     * Unregister a plugin by name. Calls plugin.destroy().
     *
     * @param {string} name - Plugin name
     * @returns {boolean} true if the plugin was found and removed
     */
    unregisterPlugin(name) {
        const plugin = this._plugins.get(name);
        if (!plugin) return false;

        try {
            plugin.destroy();
        } catch (err) {
            console.warn(`PluginManager: error destroying plugin "${name}":`, err);
        }

        this._plugins.delete(name);
        this._disabledPlugins.delete(name);
        return true;
    }

    /**
     * Get a plugin instance by name.
     *
     * @param {string} name - Plugin name
     * @returns {object|null} Plugin instance or null
     */
    getPlugin(name) {
        return this._plugins.get(name) || null;
    }

    /**
     * Enable a previously disabled plugin.
     *
     * @param {string} name - Plugin name
     * @returns {boolean} true if the plugin exists and was enabled
     */
    enablePlugin(name) {
        if (!this._plugins.has(name)) return false;
        this._disabledPlugins.delete(name);
        return true;
    }

    /**
     * Disable a plugin (remains registered but excluded from aggregation).
     *
     * @param {string} name - Plugin name
     * @returns {boolean} true if the plugin exists and was disabled
     */
    disablePlugin(name) {
        if (!this._plugins.has(name)) return false;
        this._disabledPlugins.add(name);
        return true;
    }

    /**
     * Check if a plugin is registered and enabled.
     *
     * @param {string} name - Plugin name
     * @returns {boolean}
     */
    isEnabled(name) {
        return this._plugins.has(name) && !this._disabledPlugins.has(name);
    }

    /**
     * All registered plugin instances.
     * @returns {Array<object>}
     */
    get plugins() {
        return Array.from(this._plugins.values());
    }

    /**
     * Only enabled (not disabled) plugin instances.
     * @returns {Array<object>}
     */
    get activePlugins() {
        const result = [];
        for (const [name, plugin] of this._plugins) {
            if (!this._disabledPlugins.has(name)) {
                result.push(plugin);
            }
        }
        return result;
    }

    // =========================================================================
    // Aggregation Methods
    // =========================================================================

    /**
     * Collect keymaps from all active plugins, merged into one object.
     * Later-registered plugins get higher priority (their bindings override
     * earlier ones for the same key).
     *
     * @returns {object} Merged keymap object
     */
    collectKeymaps() {
        const merged = {};
        for (const plugin of this.activePlugins) {
            try {
                const km = plugin.keymap();
                if (km && typeof km === 'object') {
                    Object.assign(merged, km);
                }
            } catch (err) {
                this._warnPluginError('keymap', plugin, err);
            }
        }
        return merged;
    }

    /**
     * Collect input rules from all active plugins.
     *
     * @returns {Array} Flat array of input rules
     */
    collectInputRules() {
        const rules = [];
        for (const plugin of this.activePlugins) {
            try {
                const r = plugin.inputRules();
                if (Array.isArray(r)) {
                    rules.push(...r);
                }
            } catch (err) {
                this._warnPluginError('inputRules', plugin, err);
            }
        }
        return rules;
    }

    /**
     * Collect paste rules from all active plugins.
     *
     * @returns {Array} Flat array of paste rules
     */
    collectPasteRules() {
        const rules = [];
        for (const plugin of this.activePlugins) {
            try {
                const r = plugin.pasteRules();
                if (Array.isArray(r)) {
                    rules.push(...r);
                }
            } catch (err) {
                this._warnPluginError('pasteRules', plugin, err);
            }
        }
        return rules;
    }

    /**
     * Run filterTransaction across all active plugins in order.
     * Each plugin receives the transaction returned by the previous one.
     *
     * @param {object} tr - Transaction
     * @param {object} state - Current EditorState
     * @returns {object} The (possibly modified) transaction
     */
    runFilterTransaction(tr, state) {
        for (const plugin of this.activePlugins) {
            try {
                const result = plugin.filterTransaction(tr, state);
                if (result !== undefined && result !== null) {
                    tr = result;
                }
            } catch (err) {
                this._warnPluginError('filterTransaction', plugin, err);
            }
        }
        return tr;
    }

    /**
     * Call stateDidUpdate on all active plugins.
     * Errors are caught per-plugin to prevent one from breaking others.
     *
     * @param {object} newState - New EditorState
     * @param {object} oldState - Previous EditorState
     */
    runStateDidUpdate(newState, oldState) {
        for (const plugin of this.activePlugins) {
            try {
                plugin.stateDidUpdate(newState, oldState);
            } catch (err) {
                this._warnPluginError('stateDidUpdate', plugin, err);
            }
        }
    }

    /**
     * Collect toolbar item descriptors from all active plugins.
     *
     * @returns {Array} Flat array of toolbar item descriptors
     */
    collectToolbarItems() {
        const items = [];
        for (const plugin of this.activePlugins) {
            try {
                const t = plugin.toolbarItems();
                if (Array.isArray(t)) {
                    items.push(...t);
                }
            } catch (err) {
                this._warnPluginError('toolbarItems', plugin, err);
            }
        }
        return items;
    }

    /**
     * Collect context menu item descriptors from all active plugins.
     *
     * @param {object} context - { pos, node, selection, ... }
     * @returns {Array} Flat array of context menu item descriptors
     */
    collectContextMenuItems(context) {
        const items = [];
        for (const plugin of this.activePlugins) {
            try {
                const c = plugin.contextMenuItems(context);
                if (Array.isArray(c)) {
                    items.push(...c);
                }
            } catch (err) {
                this._warnPluginError('contextMenuItems', plugin, err);
            }
        }
        return items;
    }

    /**
     * Collect schema extensions from all active plugins, merging all
     * node types and mark types into one object.
     * Throws if duplicate node or mark types are detected.
     *
     * @returns {{ nodes: object, marks: object }}
     */
    collectSchemaExtensions() {
        const nodes = {};
        const marks = {};

        for (const plugin of this.activePlugins) {
            try {
                const ext = plugin.schemaExtensions();
                if (!ext) continue;

                if (ext.nodes && typeof ext.nodes === 'object') {
                    for (const [name, spec] of Object.entries(ext.nodes)) {
                        if (nodes[name]) {
                            throw new Error(
                                `Duplicate node type "${name}" contributed by multiple plugins`
                            );
                        }
                        nodes[name] = spec;
                    }
                }

                if (ext.marks && typeof ext.marks === 'object') {
                    for (const [name, spec] of Object.entries(ext.marks)) {
                        if (marks[name]) {
                            throw new Error(
                                `Duplicate mark type "${name}" contributed by multiple plugins`
                            );
                        }
                        marks[name] = spec;
                    }
                }
            } catch (err) {
                // Re-throw duplicate type errors (these are real problems)
                if (err.message && err.message.includes('Duplicate')) {
                    throw err;
                }
                this._warnPluginError('schemaExtensions', plugin, err);
            }
        }

        return { nodes, marks };
    }

    // =========================================================================
    // Batch Loading
    // =========================================================================

    /**
     * Batch-register plugins. Primary initialization path used by RichTextEditor.
     *
     * @param {Array} pluginConfigs - Array of plugin classes or
     *   { plugin: Class, options: {} } objects
     * @param {Array<string>} [disableList=[]] - Plugin names to pre-disable
     */
    loadPlugins(pluginConfigs, disableList = []) {
        const disableSet = new Set(disableList);

        for (const config of pluginConfigs) {
            let PluginClass;
            let options = {};

            if (typeof config === 'function') {
                PluginClass = config;
            } else if (config && config.plugin) {
                PluginClass = config.plugin;
                options = config.options || {};
            } else {
                console.warn('PluginManager: invalid plugin config, skipping:', config);
                continue;
            }

            // Check if this plugin should be pre-disabled
            let name;
            try {
                name = PluginClass.pluginName;
            } catch (err) {
                console.warn('PluginManager: plugin has no pluginName, skipping:', err);
                continue;
            }

            if (disableSet.has(name)) {
                // Register but immediately disable
                this.registerPlugin(PluginClass, options);
                this.disablePlugin(name);
            } else {
                this.registerPlugin(PluginClass, options);
            }
        }
    }

    // =========================================================================
    // Lifecycle
    // =========================================================================

    /**
     * Destroy all plugins and clear the registry.
     */
    destroy() {
        for (const [name, plugin] of this._plugins) {
            try {
                plugin.destroy();
            } catch (err) {
                console.warn(`PluginManager: error destroying plugin "${name}":`, err);
            }
        }
        this._plugins.clear();
        this._disabledPlugins.clear();
        this._editor = null;
    }

    // =========================================================================
    // Internal Helpers
    // =========================================================================

    /**
     * Fire an event on the editor instance, if the editor supports it.
     *
     * @param {string} eventName - Event constant
     * @param {object} data - Event data
     * @private
     */
    _fireEvent(eventName, data) {
        try {
            if (this._editor && typeof this._editor.fireEvent === 'function') {
                this._editor.fireEvent(eventName, data);
            }
        } catch (err) {
            // Swallow — event firing should never break plugin management
        }
    }

    /**
     * Log a warning for a plugin method error.
     *
     * @param {string} method - Method name that failed
     * @param {object} plugin - Plugin instance
     * @param {Error} err - Error thrown
     * @private
     */
    _warnPluginError(method, plugin, err) {
        const name = plugin.constructor.pluginName || 'unknown';
        console.warn(`PluginManager: plugin "${name}" threw in ${method}():`, err);
    }
}
