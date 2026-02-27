/**
 * Plugin is the base class that all RichTextEditor plugins extend.
 *
 * Defines the interface contract: plugins override only the methods they need.
 * All methods have no-op defaults. The static `pluginName` getter MUST be
 * overridden — it throws if not implemented, ensuring every plugin declares
 * a unique name.
 *
 * Lifecycle:
 *   - init(editor) is called when the plugin is registered with the PluginManager
 *   - destroy() is called when the plugin is unregistered
 *
 * Hook methods:
 *   - keymap()              — return keybindings
 *   - inputRules()          — return input rules (patterns that trigger transforms)
 *   - pasteRules()          — return paste rules (patterns that transform pasted content)
 *   - filterTransaction()   — inspect/modify transactions before state apply
 *   - stateDidUpdate()      — react after a new state is applied
 *   - toolbarItems()        — return toolbar item descriptors
 *   - contextMenuItems()    — return context menu item descriptors
 *   - schemaExtensions()    — return node/mark schema extensions
 */
export default class Plugin {

    /**
     * Unique name identifying this plugin. MUST be overridden by subclasses.
     * @returns {string}
     */
    static get pluginName() {
        throw new Error('Plugin must implement static pluginName getter');
    }

    /**
     * Called when plugin is registered with the editor.
     * @param {object} editor - RichTextEditor instance
     */
    init(editor) {
        this._editor = editor;
    }

    /**
     * Return keybindings: { "Mod-B": commandFn, ... }
     * Later-registered plugins override earlier ones for the same key.
     * @returns {object}
     */
    keymap() { return {}; }

    /**
     * Return input rules: patterns that trigger transforms while typing.
     * Each rule: { pattern: RegExp, handler: (state, match, start, end) => void }
     * @returns {Array}
     */
    inputRules() { return []; }

    /**
     * Return paste rules: patterns that transform pasted content.
     * Each rule: { pattern: RegExp, handler: (match) => string }
     * @returns {Array}
     */
    pasteRules() { return []; }

    /**
     * Inspect/modify transactions before they are applied.
     * Plugins receive the transaction in sequence; each can modify it
     * before passing it along.
     * @param {object} tr - Transaction
     * @param {object} state - Current EditorState
     * @returns {object} The transaction (possibly modified)
     */
    filterTransaction(tr, state) { return tr; }

    /**
     * React after a new state is applied.
     * @param {object} newState - New EditorState
     * @param {object} oldState - Previous EditorState
     */
    stateDidUpdate(newState, oldState) {}

    /**
     * Return toolbar item descriptors.
     * Each: { name, type, command, isActive, isEnabled, icon, label, group, order }
     * @returns {Array}
     */
    toolbarItems() { return []; }

    /**
     * Return context menu item descriptors.
     * Each: { name, label, command, isEnabled, group, order }
     * @param {object} context - { pos, node, selection, ... }
     * @returns {Array}
     */
    contextMenuItems(context) { return []; }

    /**
     * Return schema extensions to add node types/marks.
     * @returns {{ nodes: object, marks: object }}
     */
    schemaExtensions() { return { nodes: {}, marks: {} }; }

    /**
     * Cleanup when plugin is unregistered.
     */
    destroy() {
        this._editor = null;
    }
}
