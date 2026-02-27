/**
 * Inline SVG icon constants for all toolbar buttons.
 *
 * Each icon is a 16x16 SVG string using `currentColor` for theme adaptation.
 * Keys match toolbar item names from the spec (Section 4.2.6.1).
 */
export const ICONS = Object.freeze({
    undo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h7a3 3 0 0 1 0 6H9"/><polyline points="6 4 3 7 6 10"/></svg>',

    redo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 7H6a3 3 0 0 0 0 6h1"/><polyline points="10 4 13 7 10 10"/></svg>',

    bold: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 3h5a3 3 0 0 1 0 6H4V3z"/><path d="M4 9h6a3 3 0 0 1 0 6H4V9z"/></svg>',

    italic: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="10" y1="3" x2="6" y2="13"/><line x1="7" y1="3" x2="11" y2="3"/><line x1="5" y1="13" x2="9" y2="13"/></svg>',

    underline: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 3v5a4 4 0 0 0 8 0V3"/><line x1="3" y1="14" x2="13" y2="14"/></svg>',

    strikethrough: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="8" x2="14" y2="8"/><path d="M10.5 4.5C10 3.5 9 3 8 3c-2 0-3.5 1-3.5 2.5S6 8 8 8c2 0 3.5 1 3.5 2.5S10 13 8 13c-1 0-2-.5-2.5-1.5"/></svg>',

    subscript: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l5 7"/><path d="M8 3L3 10"/><path d="M11 11c0-1 1-1.5 2-1.5s2 .5 2 1.5c0 .7-.5 1.2-2 2.5h2"/></svg>',

    superscript: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6l5 7"/><path d="M8 6L3 13"/><path d="M11 2c0-1 1-1.5 2-1.5s2 .5 2 1.5c0 .7-.5 1.2-2 2.5h2"/></svg>',

    code: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 4 1 8 5 12"/><polyline points="11 4 15 8 11 12"/></svg>',

    link: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 9.5a3 3 0 0 0 4.2.3l2-2a3 3 0 0 0-4.2-4.3l-1.2 1.1"/><path d="M9.5 6.5a3 3 0 0 0-4.2-.3l-2 2a3 3 0 0 0 4.2 4.3l1.2-1.1"/></svg>',

    textColor: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12L8 2l5 10"/><line x1="5" y1="8" x2="11" y2="8"/><line x1="2" y1="15" x2="14" y2="15" stroke-width="2.5"/></svg>',

    backgroundColor: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="12" height="10" rx="1"/><path d="M5 7l2 2 4-4"/><rect x="2" y="13" width="12" height="2" fill="currentColor" stroke="none"/></svg>',

    fontFamily: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13V4c0-.6.4-1 1-1h4"/><path d="M3 8h4"/><path d="M9 13l2.5-9L14 13"/><line x1="10" y1="10" x2="14" y2="10"/></svg>',

    fontSize: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" stroke="none"><text x="1" y="13" font-size="14" font-family="serif" font-weight="bold">A</text><text x="10" y="13" font-size="9" font-family="serif">A</text></svg>',

    heading: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="3" x2="3" y2="13"/><line x1="13" y1="3" x2="13" y2="13"/><line x1="3" y1="8" x2="13" y2="8"/></svg>',

    paragraph: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 13V3h3m3 0H7"/><line x1="10" y1="3" x2="10" y2="13"/><path d="M7 3a3 3 0 0 0 0 6"/></svg>',

    blockquote: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="2" x2="3" y2="14" stroke-width="2.5"/><line x1="7" y1="5" x2="14" y2="5"/><line x1="7" y1="8" x2="14" y2="8"/><line x1="7" y1="11" x2="11" y2="11"/></svg>',

    codeBlock: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="2" width="14" height="12" rx="1"/><polyline points="5 6 3 8 5 10"/><polyline points="11 6 13 8 11 10"/><line x1="9" y1="5" x2="7" y2="11"/></svg>',

    horizontalRule: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="2" y1="8" x2="14" y2="8"/></svg>',

    bulletList: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="3" cy="4" r="1" fill="currentColor" stroke="none"/><circle cx="3" cy="8" r="1" fill="currentColor" stroke="none"/><circle cx="3" cy="12" r="1" fill="currentColor" stroke="none"/><line x1="7" y1="4" x2="14" y2="4"/><line x1="7" y1="8" x2="14" y2="8"/><line x1="7" y1="12" x2="14" y2="12"/></svg>',

    orderedList: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" stroke="none"><text x="1" y="5.5" font-size="5" font-family="sans-serif">1.</text><text x="1" y="9.5" font-size="5" font-family="sans-serif">2.</text><text x="1" y="13.5" font-size="5" font-family="sans-serif">3.</text><line x1="7" y1="4" x2="14" y2="4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="7" y1="8" x2="14" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="7" y1="12" x2="14" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',

    checklist: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="2" width="4" height="4" rx="0.5"/><polyline points="2 4.5 3 5.5 4.5 3"/><rect x="1" y="10" width="4" height="4" rx="0.5"/><line x1="7" y1="4" x2="14" y2="4"/><line x1="7" y1="12" x2="14" y2="12"/></svg>',

    alignLeft: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="2" y1="3" x2="14" y2="3"/><line x1="2" y1="6" x2="10" y2="6"/><line x1="2" y1="9" x2="14" y2="9"/><line x1="2" y1="12" x2="10" y2="12"/></svg>',

    alignCenter: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="2" y1="3" x2="14" y2="3"/><line x1="4" y1="6" x2="12" y2="6"/><line x1="2" y1="9" x2="14" y2="9"/><line x1="4" y1="12" x2="12" y2="12"/></svg>',

    alignRight: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="2" y1="3" x2="14" y2="3"/><line x1="6" y1="6" x2="14" y2="6"/><line x1="2" y1="9" x2="14" y2="9"/><line x1="6" y1="12" x2="14" y2="12"/></svg>',

    alignJustify: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="2" y1="3" x2="14" y2="3"/><line x1="2" y1="6" x2="14" y2="6"/><line x1="2" y1="9" x2="14" y2="9"/><line x1="2" y1="12" x2="14" y2="12"/></svg>',

    indent: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="3" x2="14" y2="3"/><line x1="7" y1="6" x2="14" y2="6"/><line x1="7" y1="9" x2="14" y2="9"/><line x1="2" y1="12" x2="14" y2="12"/><polyline points="2 6 4.5 7.5 2 9"/></svg>',

    outdent: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="3" x2="14" y2="3"/><line x1="7" y1="6" x2="14" y2="6"/><line x1="7" y1="9" x2="14" y2="9"/><line x1="2" y1="12" x2="14" y2="12"/><polyline points="5 6 2.5 7.5 5 9"/></svg>',

    lineHeight: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="3" x2="14" y2="3"/><line x1="7" y1="8" x2="14" y2="8"/><line x1="7" y1="13" x2="14" y2="13"/><line x1="3" y1="3" x2="3" y2="13"/><polyline points="1.5 5 3 3 4.5 5"/><polyline points="1.5 11 3 13 4.5 11"/></svg>',

    image: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="2" width="14" height="12" rx="1"/><circle cx="5" cy="6" r="1.5"/><polyline points="15 10 11 6 4 13"/></svg>',

    video: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="10" height="10" rx="1"/><polyline points="11 6 15 4 15 12 11 10"/></svg>',

    embed: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="2" width="14" height="12" rx="1"/><line x1="1" y1="5" x2="15" y2="5"/><circle cx="3" cy="3.5" r="0.5" fill="currentColor" stroke="none"/><circle cx="5" cy="3.5" r="0.5" fill="currentColor" stroke="none"/><circle cx="7" cy="3.5" r="0.5" fill="currentColor" stroke="none"/></svg>',

    table: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="2" width="14" height="12" rx="1"/><line x1="1" y1="6" x2="15" y2="6"/><line x1="1" y1="10" x2="15" y2="10"/><line x1="6" y1="2" x2="6" y2="14"/><line x1="11" y1="2" x2="11" y2="14"/></svg>',

    clearFormatting: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h7l-3 10"/><line x1="5" y1="8" x2="11" y2="8"/><line x1="2" y1="13" x2="14" y2="3"/></svg>',

    searchReplace: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="7" r="4"/><line x1="10" y1="10" x2="14" y2="14"/></svg>',

    specialCharacters: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" stroke="none"><text x="2" y="13" font-size="14" font-family="serif">&Omega;</text></svg>',

    sourceEdit: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 4 1 8 4 12"/><polyline points="12 4 15 8 12 12"/><line x1="10" y1="3" x2="6" y2="13"/></svg>'
});
