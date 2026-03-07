/**
 * GooeyJS Element Reference Data
 *
 * Assembles the GooeyData object from per-folder data files.
 * Each file declares a top-level const loaded via script tags before this file.
 */
const GooeyData = {
    inheritedAttributes,
    root: {
        name: "Gooey Elements",
        subcategories: [
            dataCategory,
            graphicsCategory,
            i18nCategory,
            {
                name: "ui",
                subcategories: [
                    buttonCategory,
                    carouselCategory,
                    uiDataCategory,
                    formCategory,
                    menuCategory,
                    panelCategory,
                    toolbarCategory,
                    windowCategory,
                    mediaCategory,
                    navigationCategory,
                    notificationCategory
                ],
                elements: commonElements
            }
        ],
        elements: rootElements
    }
};
