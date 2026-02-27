/**
 * DefaultPlugins — ordered registry of all built-in RichTextEditor plugins.
 *
 * This file is the single source of truth for which plugins are loaded
 * by default. Order matters: later plugins' keymaps take priority over
 * earlier ones (PluginManager.collectKeymaps uses Object.assign order).
 *
 * Notable ordering:
 * - TablePlugin is registered AFTER ListKeymapPlugin so that table
 *   cell navigation (Tab/Shift-Tab) takes priority over list indentation.
 * - HistoryPlugin keybindings are registered late so they are not
 *   accidentally overridden by earlier plugins.
 */

// Core Formatting (13)
import BoldPlugin from './formatting/BoldPlugin.js';
import ItalicPlugin from './formatting/ItalicPlugin.js';
import UnderlinePlugin from './formatting/UnderlinePlugin.js';
import StrikethroughPlugin from './formatting/StrikethroughPlugin.js';
import SubscriptPlugin from './formatting/SubscriptPlugin.js';
import SuperscriptPlugin from './formatting/SuperscriptPlugin.js';
import CodePlugin from './formatting/CodePlugin.js';
import LinkPlugin from './formatting/LinkPlugin.js';
import TextColorPlugin from './formatting/TextColorPlugin.js';
import BackgroundColorPlugin from './formatting/BackgroundColorPlugin.js';
import FontSizePlugin from './formatting/FontSizePlugin.js';
import FontFamilyPlugin from './formatting/FontFamilyPlugin.js';
import ClearFormattingPlugin from './formatting/ClearFormattingPlugin.js';

// Block Structure (5)
import HeadingPlugin from './blocks/HeadingPlugin.js';
import BlockquotePlugin from './blocks/BlockquotePlugin.js';
import CodeBlockPlugin from './blocks/CodeBlockPlugin.js';
import HorizontalRulePlugin from './blocks/HorizontalRulePlugin.js';
import ParagraphPlugin from './blocks/ParagraphPlugin.js';

// Lists (4)
import BulletListPlugin from './lists/BulletListPlugin.js';
import OrderedListPlugin from './lists/OrderedListPlugin.js';
import ChecklistPlugin from './lists/ChecklistPlugin.js';
import ListKeymapPlugin from './lists/ListKeymapPlugin.js';

// Table (1)
import TablePlugin from './table/TablePlugin.js';

// Media (3)
import ImagePlugin from './media/ImagePlugin.js';
import VideoPlugin from './media/VideoPlugin.js';
import EmbedPlugin from './media/EmbedPlugin.js';

// Alignment/Indentation (3)
import AlignmentPlugin from './alignment/AlignmentPlugin.js';
import IndentPlugin from './alignment/IndentPlugin.js';
import LineHeightPlugin from './alignment/LineHeightPlugin.js';

// History (1)
import HistoryPlugin from './HistoryPlugin.js';

// Clipboard (1)
import ClipboardPlugin from './ClipboardPlugin.js';

// Search (1)
import SearchPlugin from './SearchPlugin.js';

// Utility (8)
import PlaceholderPlugin from './utility/PlaceholderPlugin.js';
import CharacterCountPlugin from './utility/CharacterCountPlugin.js';
import AutoformatPlugin from './utility/AutoformatPlugin.js';
import AutolinkPlugin from './utility/AutolinkPlugin.js';
import DragHandlePlugin from './utility/DragHandlePlugin.js';
import DropCursorPlugin from './utility/DropCursorPlugin.js';
import TrailingNodePlugin from './utility/TrailingNodePlugin.js';
import SpecialCharactersPlugin from './utility/SpecialCharactersPlugin.js';

// Source Editing (1)
import SourceEditPlugin from './source/SourceEditPlugin.js';

/**
 * Default plugins for the RichTextEditor.
 * Order matters: later plugins' keymaps take priority over earlier ones.
 * TablePlugin and ListKeymapPlugin are ordered so TablePlugin's Tab binding
 * takes priority for cell navigation (handled via chainCommands in integration).
 */
export const DEFAULT_PLUGINS = [
    // Formatting plugins (lowest priority for keymaps)
    BoldPlugin,
    ItalicPlugin,
    UnderlinePlugin,
    StrikethroughPlugin,
    SubscriptPlugin,
    SuperscriptPlugin,
    CodePlugin,
    LinkPlugin,
    TextColorPlugin,
    BackgroundColorPlugin,
    FontSizePlugin,
    FontFamilyPlugin,
    ClearFormattingPlugin,

    // Block structure
    HeadingPlugin,
    BlockquotePlugin,
    CodeBlockPlugin,
    HorizontalRulePlugin,
    ParagraphPlugin,

    // Lists
    BulletListPlugin,
    OrderedListPlugin,
    ChecklistPlugin,
    ListKeymapPlugin,

    // Alignment
    AlignmentPlugin,
    IndentPlugin,
    LineHeightPlugin,

    // Media
    ImagePlugin,
    VideoPlugin,
    EmbedPlugin,

    // Table (after ListKeymapPlugin so Tab takes priority for cell nav)
    TablePlugin,

    // History
    HistoryPlugin,

    // Clipboard
    ClipboardPlugin,

    // Search
    SearchPlugin,

    // Utility
    PlaceholderPlugin,
    CharacterCountPlugin,
    AutoformatPlugin,
    AutolinkPlugin,
    DragHandlePlugin,
    DropCursorPlugin,
    TrailingNodePlugin,
    SpecialCharactersPlugin,

    // Source editing
    SourceEditPlugin
];

export default DEFAULT_PLUGINS;
