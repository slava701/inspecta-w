// overview.js - Font and Color Management

let bgColorsArray;
let borderColorsArray;
let textColorsArray;
let fillColorsArray;
let btn_compare_colors_from_figma;

// Color change tracking system
let colorChangeHistory = [];
let currentChangeSet = null;

function startColorChangeSet(originalColor) {
    currentChangeSet = {
        originalColor: originalColor,
        changes: [],
        timestamp: Date.now()
    };
}

function addColorChange(element, property, originalValue, newValue) {
    if (!currentChangeSet) return;

    currentChangeSet.changes.push({
        element: element,
        property: property,
        originalValue: originalValue,
        newValue: newValue
    });
}

function commitColorChangeSet() {
    if (currentChangeSet && currentChangeSet.changes.length > 0) {
        colorChangeHistory.push(currentChangeSet);
        currentChangeSet = null;

        // Store in localStorage for persistence
        try {
            localStorage.setItem('inspecta_color_changes', JSON.stringify(colorChangeHistory));
        } catch (e) {
            console.warn('Could not save color changes to localStorage:', e);
        }
    }
}

function loadColorChangeHistory() {
    try {
        const saved = localStorage.getItem('inspecta_color_changes');
        if (saved) {
            colorChangeHistory = JSON.parse(saved);
        }
    } catch (e) {
        console.warn('Could not load color changes from localStorage:', e);
        colorChangeHistory = [];
    }
}

// Load saved changes on page load
loadColorChangeHistory();

function rgbToHex(color) {
    const rgbValues = color.match(/\d+/g);
    if (!rgbValues || rgbValues.length !== 3) {
        return color; // Return the color as-is if it's not in RGB format
    }
    const hexValues = rgbValues.map(value => {
        const hex = Number(value).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    });
    return '#' + hexValues.join('');
}
// Make initPageOverview a global function
window.initPageOverview = function () {
    clearAndRefreshOverview();
    btn_compare_colors_from_figma = shadow.getElementById('btn_compare_colors_from_figma');
    btn_compare_colors_from_figma.addEventListener('click', () => {
        compareColorsFromFigma();
    });

    // Add font comparison button event listener
    const btn_compare_fonts_from_figma = shadow.getElementById('btn_compare_fonts_from_figma');
    if (btn_compare_fonts_from_figma) {
        btn_compare_fonts_from_figma.addEventListener('click', () => {
            compareFontsFromFigma();
        });
    }
}
function populateColorPallets() {
    // Get all elements on the page
    const allElements = document.querySelectorAll('*');

    // Store unique colors, fonts, etc.
    const uniqueBgColors = new Map();
    const uniqueTextColors = new Map();
    const uniqueBorderColors = new Map();
    const uniqueFillColors = new Map();
    const uniqueFonts = new Set();
    const uniqueFontSettings = new Map();

    // Get all global color change rules to know which original colors have been overridden
    const overriddenColors = new Set();
    const newGlobalColors = new Set();
    const inspectaStylesheet = document.getElementById('inspectaStylesheet');
    if (inspectaStylesheet && inspectaStylesheet.sheet) {
        for (let i = 0; i < inspectaStylesheet.sheet.cssRules.length; i++) {
            const rule = inspectaStylesheet.sheet.cssRules[i];
            if (rule.selectorText.includes('inspecta-global-color-')) {
                // Extract the original color from the class name
                const match = rule.selectorText.match(/inspecta-global-color-([^-]+)-/);
                if (match) {
                    const originalColor = '#' + match[1];
                    overriddenColors.add(originalColor.toUpperCase());
                }

                // Extract the new color from the CSS rule
                const cssText = rule.cssText;
                const colorMatch = cssText.match(/color:\s*([^;]+)/);
                const bgMatch = cssText.match(/background-color:\s*([^;]+)/);
                const borderMatch = cssText.match(/border-color:\s*([^;]+)/);

                if (colorMatch) {
                    const newColor = colorMatch[1].trim();
                    if (newColor && newColor !== 'transparent') {
                        newGlobalColors.add(newColor);
                    }
                }
                if (bgMatch) {
                    const newColor = bgMatch[1].trim();
                    if (newColor && newColor !== 'transparent') {
                        newGlobalColors.add(newColor);
                    }
                }
                if (borderMatch) {
                    const newColor = borderMatch[1].trim();
                    if (newColor && newColor !== 'transparent') {
                        newGlobalColors.add(newColor);
                    }
                }
            }
        }
    }

    // Loop through each element
    allElements.forEach(element => {
        // --- Start Filtering ---
        if (!element.isConnected) return;

        // Exclude self and internal UI
        const elId = element.id || '';
        if (elId.startsWith('inspecta_') ||
            elId === 'inspecta-selected-label' ||
            elId === 'inspecta-hover-label' ||
            elId === 'inspecta-selected-overlay' ||
            elId === 'inspecta-hover-overlay' ||
            element.closest('#inspecta_app_container') ||
            element.classList.contains('inspecta-overlay-label')) {
            return;
        }


        // Get computed styles directly (original method)
        const styles = window.getComputedStyle(element);

        // Skip invisible elements
        const rect = element.getBoundingClientRect();
        if (styles.display === 'none' || styles.visibility === 'hidden' || parseFloat(styles.opacity) === 0 || rect.width === 0 || rect.height === 0) {
            return;
        }

        const tagName = element.tagName.toLowerCase();
        // Only exclude elements that definitely don't have borders, but keep <a> tags as they can have borders
        if (tagName === 'script' || tagName === 'style' || tagName === 'head' || tagName === 'noscript' || tagName === 'img') {
            return;
        }

        // Don't skip elements with box shadows - they can still have borders
        // const boxShadow = styles.boxShadow;
        // if (boxShadow && boxShadow !== 'none') {
        //     return;
        // }
        // --- End Filtering ---

        // --- Start Color & Font Collection ---

        // 1. Text Colors - only add if not overridden
        const textColor = styles.color;
        if (textColor && textColor !== 'rgba(0, 0, 0, 0)' && textColor !== 'transparent') {
            const textColorHex = rgba2hex(textColor, false);
            if (textColorHex && !overriddenColors.has(textColorHex.toUpperCase())) {
                addColor(textColor, uniqueTextColors);
            }
        }

        // Check ::before and ::after pseudo-elements for text color
        ['::before', '::after'].forEach(pseudo => {
            try {
                const pseudoStyles = getComputedStyle(element, pseudo);
                if (pseudoStyles.display !== 'none' && pseudoStyles.content && pseudoStyles.content !== 'none') {
                    const pseudoColor = pseudoStyles.color;
                    if (pseudoColor && pseudoColor !== 'rgba(0, 0, 0, 0)' && pseudoColor !== 'transparent') {
                        const pseudoColorHex = rgba2hex(pseudoColor, false);
                        if (pseudoColorHex && !overriddenColors.has(pseudoColorHex.toUpperCase())) {
                            addColor(pseudoColor, uniqueTextColors);
                        }
                    }
                }
            } catch (e) { /* Some elements do not support pseudo-elements */ }
        });

        // 2. Background, Border, and Fill/Stroke Colors - only add if not overridden
        const bgColor = styles.backgroundColor;
        if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
            const bgColorHex = rgba2hex(bgColor, false);
            if (bgColorHex && !overriddenColors.has(bgColorHex.toUpperCase())) {
                addColor(bgColor, uniqueBgColors);
            }
        }

        // Only check border color if element actually has a visible border
        const borderColor = styles.borderTopColor;
        const borderWidth = parseInt(styles.borderTopWidth) || 0;
        if (borderColor && borderColor !== 'rgba(0, 0, 0, 0)' && borderColor !== 'transparent' && borderWidth > 0) {
            const borderColorHex = rgba2hex(borderColor, false);
            if (borderColorHex && !overriddenColors.has(borderColorHex.toUpperCase())) {
                addColor(borderColor, uniqueBorderColors);
            }
        }

        const fillColor = styles.fill;
        if (fillColor && fillColor !== 'rgba(0, 0, 0, 0)' && fillColor !== 'transparent') {
            const fillColorHex = rgba2hex(fillColor, false);
            if (fillColorHex && !overriddenColors.has(fillColorHex.toUpperCase())) {
                addColor(fillColor, uniqueFillColors);
            }
        }

        const strokeColor = styles.stroke;
        if (strokeColor && strokeColor !== 'rgba(0, 0, 0, 0)' && strokeColor !== 'transparent') {
            const strokeColorHex = rgba2hex(strokeColor, false);
            if (strokeColorHex && !overriddenColors.has(strokeColorHex.toUpperCase())) {
                addColor(strokeColor, uniqueFillColors);
            }
        }

        // 3. Font Information
        const fontFamily = styles.fontFamily;
        if (fontFamily) {
            const currentFontSettingKey = styles.fontFamily + '    ' + styles.fontWeight + '   ' + styles.fontSize + '   ' + styles.lineHeight;
            const currentFontSetting = {
                fontFamily: styles.fontFamily,
                fontWeight: styles.fontWeight,
                fontSize: styles.fontSize,
                lineHeight: styles.lineHeight
            };
            let uniqueFontSettingsCurrentValue = uniqueFontSettings.get(styles.fontFamily);
            if (!uniqueFontSettingsCurrentValue) {
                uniqueFontSettingsCurrentValue = new Set();
            }
            uniqueFontSettingsCurrentValue.add(JSON.stringify(currentFontSetting));
            uniqueFontSettings.set(styles.fontFamily, uniqueFontSettingsCurrentValue);
            uniqueFonts.add(currentFontSettingKey);
        }
        // --- End Color & Font Collection ---
    });

    // Convert sets and maps to arrays for colors, fonts, etc.
    // Only include colors with count > 0
    bgColorsArray = Array.from(uniqueBgColors).filter(([color, count]) => count > 0);
    textColorsArray = Array.from(uniqueTextColors).filter(([color, count]) => count > 0);
    borderColorsArray = Array.from(uniqueBorderColors).filter(([color, count]) => count > 0);
    fillColorsArray = Array.from(uniqueFillColors).filter(([color, count]) => count > 0);

    const fontsArray = Array.from(uniqueFonts);
    const fontSettingsArray = Array.from(uniqueFontSettings);

    // Add new global colors to the appropriate arrays
    newGlobalColors.forEach(color => {
        // Normalize the color to hex format first
        let normalizedColor;
        if (color.startsWith('#')) {
            normalizedColor = color.toUpperCase();
        } else if (color.startsWith('rgb')) {
            normalizedColor = rgba2hex(color, false);
            if (normalizedColor) {
                normalizedColor = normalizedColor.toUpperCase();
            }
        } else {
            normalizedColor = rgba2hex(color, false);
            if (normalizedColor) {
                normalizedColor = normalizedColor.toUpperCase();
            }
        }

        // Only proceed if we have a valid hex color
        if (normalizedColor && normalizedColor !== '#NANANAN' && normalizedColor.match(/^#[0-9A-F]{6}$/) &&
            normalizedColor !== '#0000EE' && normalizedColor !== '#551A8B' && normalizedColor !== '#FF0000') {
            // Determine which type of color this is by checking if it's already in any array
            const isInBg = bgColorsArray.some(([c]) => {
                const existingColorHex = c.startsWith('#') ? c.toUpperCase() : (rgba2hex(c, false) || '').toUpperCase();
                return existingColorHex === normalizedColor;
            });
            const isInText = textColorsArray.some(([c]) => {
                const existingColorHex = c.startsWith('#') ? c.toUpperCase() : (rgba2hex(c, false) || '').toUpperCase();
                return existingColorHex === normalizedColor;
            });
            const isInBorder = borderColorsArray.some(([c]) => {
                const existingColorHex = c.startsWith('#') ? c.toUpperCase() : (rgba2hex(c, false) || '').toUpperCase();
                return existingColorHex === normalizedColor;
            });

            // Add to the appropriate array if not already present
            if (!isInBg && !isInText && !isInBorder) {
                // Default to text color if we can't determine the type
                textColorsArray.push([normalizedColor, 1]);
            }
        }
    });

    populateFonts(fontSettingsArray);

    // Ensure font mismatches and counters are recalculated after fonts are rendered
    if (typeof window.updateFontMismatchUI === 'function') {
        setTimeout(() => {
            window.updateFontMismatchUI();
        }, 50);
    }

    // Populate UI Panels

    populateColorPallet('colors-pallet-page-colors', getPageColorPalette(), 'page');
    populateColorPallet('pnl_bg_colors_values', bgColorsArray.map(([color]) => color), 'other');
    populateColorPallet('pnl_border_colors_values', borderColorsArray.map(([color]) => color), 'other');
    populateColorPallet('pnl_text_colors_values', textColorsArray.map(([color]) => color), 'other');
    populateColorPallet('colors-pallet-fill-colors', fillColorsArray.map(([color]) => color), 'other');


    $id('el_name').innerHTML = document.title;

    // Add color count to each category header
    const pageColorsCount = getPageColorPalette().length;
    const bgColorsCount = bgColorsArray.length;
    const borderColorsCount = borderColorsArray.length;
    const textColorsCount = textColorsArray.length;
    const iconColorsCount = fillColorsArray.length;

    // Page colors
    const pageColorsHeader = shadow.querySelector('#pnl_page_colors_header .group-title');
    if (pageColorsHeader) {
        pageColorsHeader.innerHTML = `Page colors <span style="color:#888;font-weight:400;">(${pageColorsCount})</span>`;
    }
    // Background colors
    const bgColorsHeader = shadow.querySelector('#pnl_bg_colors_header .group-title');
    if (bgColorsHeader) {
        bgColorsHeader.innerHTML = `Background colors <span style="color:#888;font-weight:400;">(${bgColorsCount})</span>`;
    }
    // Text colors
    const textColorsHeader = shadow.querySelector('#pnl_text_colors_header .group-title');
    if (textColorsHeader) {
        textColorsHeader.innerHTML = `Text colors <span style="color:#888;font-weight:400;">(${textColorsCount})</span>`;
    }
    // Border colors
    const borderColorsHeader = shadow.querySelector('#pnl_border_colors_header .group-title');
    if (borderColorsHeader) {
        borderColorsHeader.innerHTML = `Border colors <span style="color:#888;font-weight:400;">(${borderColorsCount})</span>`;
    }
    const iconColorsHeader = shadow.querySelector('#pnl_icon_colors_header .group-title');
    if (iconColorsHeader) {
        iconColorsHeader.innerHTML = `Icon & SVG colors <span style="color:#888;font-weight:400;">(${iconColorsCount})</span>`;
    }
}
function isRGBColor(color) {
    return color.match(/\d+/g)
}
function addColor(color, colorsList) {
    if (color && color !== 'transparent') {
        // Convert any color format to hex and normalize
        let hexColor;
        if (color.startsWith('#')) {
            // Already hex format - normalize to uppercase
            hexColor = color.toUpperCase();
        } else if (color.startsWith('rgb')) {
            // RGB/RGBA format - convert to hex
            hexColor = rgba2hex(color, false);
            if (hexColor) {
                hexColor = hexColor.toUpperCase();
            }
        } else {
            // Other formats - try to convert
            hexColor = rgba2hex(color, false);
            if (hexColor) {
                hexColor = hexColor.toUpperCase();
            }
        }

        // Validate the hex color and exclude default link colors
        if (hexColor && hexColor !== '#NANANAN' && hexColor.match(/^#[0-9A-F]{6}$/) &&
            hexColor !== '#0000EE' && hexColor !== '#551A8B' && hexColor !== '#FF0000') {
            // Use the normalized hex color as the key
            if (colorsList.has(hexColor)) {
                colorsList.set(hexColor, colorsList.get(hexColor) + 1);
            } else {
                colorsList.set(hexColor, 1);
            }
        }
    }
}

function populateColorPallet(colorPalletId, colorsArray, thumbnailType = 'page') {
    const palletPanel = shadow.querySelector('#' + colorPalletId);
    if (!palletPanel) return;

    palletPanel.innerHTML = '';
    colorsArray.forEach((color) => {
        palletPanel.appendChild(createColorThumbnail(color, thumbnailType));
    });
    addInThumbnailClickHandlers();
}

function createColorThumbnail(colorHEX, thumbnailType = 'page') {
    const thumbnail = document.createElement('div');
    const thmbnailColor = document.createElement('div');
    const thmbnailLabel = document.createElement('div');

    // Use different classes based on thumbnail type
    if (thumbnailType === 'page') {
        thumbnail.classList.add('in-thumbnail');
    } else {
        thumbnail.classList.add('in-thumbnail-horizontal');
    }

    thmbnailColor.classList.add('in-thumb-color');
    thmbnailLabel.classList.add('in-thumb-label');
    thmbnailLabel.innerText = colorHEX;
    thmbnailColor.style.backgroundColor = colorHEX;

    thumbnail.id = `thumbnail-${colorHEX.replace('#', '')}`;

    // Only make page colors clickable
    if (thumbnailType === 'page') {
        thumbnail.style.cursor = 'pointer';
        thumbnail.onclick = function () {
            showColorInstancesPopup(colorHEX);
        };
    }

    thumbnail.appendChild(thmbnailColor);
    thumbnail.appendChild(thmbnailLabel);
    return thumbnail;
}
function populateFonts(fontSettingsArray) {

    const fontsPanel = shadow.getElementById('pnl_fonts_groups');
    if (!fontsPanel) {
        console.error('Fonts panel not found');
        return;
    }
    fontsPanel.innerHTML = '';

    // Robust font family normalization
    function normalizeFontFamily(f) {
        return f
            .split(',')[0]
            .replace(/['"]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    // Group all font combinations by normalized family
    const familyGroups = new Map();
    fontSettingsArray.forEach(([fontFamily, fontSetting]) => {
        const normFamily = normalizeFontFamily(fontFamily);
        if (!familyGroups.has(normFamily)) {
            familyGroups.set(normFamily, { rawFamily: fontFamily, settings: [] });
        }
        const group = familyGroups.get(normFamily);
        Array.from(fontSetting).forEach(settingItem => {
            group.settings.push({
                rawFamily: fontFamily,
                setting: JSON.parse(settingItem)
            });
        });
    });

    // For each family group, render a single header and all unique combinations
    familyGroups.forEach(({ rawFamily, settings }, normFamily) => {
        // Create group container
        const fontFamilyDIV = document.createElement('div');
        fontFamilyDIV.className = 'font-group';
        // Extract only the first font, remove quotes
        let firstFont = rawFamily.split(',')[0].trim();
        if ((firstFont.startsWith('"') && firstFont.endsWith('"')) || (firstFont.startsWith("'") && firstFont.endsWith("'"))) {
            firstFont = firstFont.slice(1, -1);
        }
        // Create the group title
        const groupTitle = document.createElement('div');
        groupTitle.className = 'group-title';
        groupTitle.textContent = firstFont;
        groupTitle.style.fontFamily = 'Inter, sans-serif';
        fontFamilyDIV.appendChild(groupTitle);

        // Track unique combinations to avoid duplicates
        const uniqueCombos = new Set();
        let hasFontRows = false;
        settings.forEach(({ setting }) => {
            const comboKey = `${setting.fontSize}|${setting.lineHeight}|${setting.fontWeight}`;
            if (uniqueCombos.has(comboKey)) return;
            uniqueCombos.add(comboKey);

            // Count elements using this font combination (same logic as before)
            let count = 0;
            const allElements = document.querySelectorAll('body *');
            allElements.forEach(el => {
                // Skip invisible/hidden elements
                const rect = el.getBoundingClientRect();
                if (
                    el.style.display === 'none' ||
                    el.style.visibility === 'hidden' ||
                    el.style.opacity === '0' ||
                    rect.width === 0 || rect.height === 0 ||
                    (el.style.position === 'absolute' && parseInt(el.style.left) <= -9999)
                ) return;
                // Exclude non-text elements
                const nonTextTags = ['img', 'svg', 'canvas', 'video', 'audio', 'iframe', 'object', 'embed', 'picture', 'source', 'track', 'map', 'area', 'meta', 'link', 'script', 'style', 'br', 'hr', 'input', 'textarea', 'button', 'select', 'option'];
                if (nonTextTags.includes(el.tagName.toLowerCase())) return;
                // Exclude elements without direct visible text node
                let hasDirectText = false;
                for (let node of el.childNodes) {
                    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
                        hasDirectText = true;
                        break;
                    }
                }
                if (!hasDirectText) return;
                const styles = getComputedStyle(el);
                const elementFontFamily = styles.fontFamily.split(',')[0].trim().replace(/['"]/g, '');
                const elementFontSize = styles.fontSize;
                const elementLineHeight = styles.lineHeight;
                const elementFontWeight = styles.fontWeight;
                const targetFontFamily = rawFamily.split(',')[0].trim().replace(/['"]/g, '');
                const elementSize = normalizeSize(elementFontSize);
                const elementLH = normalizeLineHeight(elementLineHeight);
                const targetSize = normalizeSize(setting.fontSize);
                const targetLH = normalizeLineHeight(setting.lineHeight);
                const familyMatches = elementFontFamily.toLowerCase() === targetFontFamily.toLowerCase();
                const sizeMatches = elementSize === targetSize;
                const lineHeightMatches = elementLH === targetLH;
                const weightMatches = elementFontWeight === setting.fontWeight;
                if (familyMatches && sizeMatches && lineHeightMatches && weightMatches) {
                    count++;
                }
            });

            // Only create font row if count is greater than zero
            if (count > 0) {
                hasFontRows = true;
                const html2 = `<div class=\"thumbnail-container-row\" style=\"display:flex;align-items:center;justify-content:space-between;\">\n                         <div class=\"in-thumb-font\" style=\"display:flex;align-items:center;justify-content:space-between;width:100%;\">\n                             <div class=\"font-size-height\" style=\"display:flex;gap:4px;align-items:center;\">\n                                 <span id=\"in_overview_font_size\">${setting.fontSize}</span>\n                                 <span>/</span>\n                                 <span id=\"in_overview_line-height\">${setting.lineHeight}</span>\n                                 <span>/</span>\n                                 <span id=\"in_overview_font_weight\">${setting.fontWeight}</span>\n                             </div>\n                             <div class=\"font-thumb-counter\" style=\"margin-left:12px;font-size:11px;color:#888;min-width:18px;text-align:right;\">${count}</div>\n                         </div>\n                     </div>`;
                const fontsRowDIV = document.createElement('div');
                fontsRowDIV.innerHTML = html2;
                fontFamilyDIV.appendChild(fontsRowDIV);
            }
        });
        // Only append the group if it has at least one font row
        if (hasFontRows) {
            fontsPanel.appendChild(fontFamilyDIV);
        }
    });

    // Add click handlers to font thumbnails
    if (typeof addInFontThumbnailClickHandlers === 'function') {
        addInFontThumbnailClickHandlers();
    } else {
        console.error('addInFontThumbnailClickHandlers function not found');
    }
}

function getColorPallets() {

    return {
        bgColorsArray: bgColorsArray.map(([color]) => color),
        borderColorsArray: borderColorsArray.map(([color]) => color),
        textColorsArray: textColorsArray.map(([color]) => color)
        // fillColorsArray: fillColorsArray.map(([color, count]) => color)
    };
}
function getPageColorPalette() {
    const uniqueColors = [
        ...bgColorsArray.map(([color, count]) => color),
        ...borderColorsArray.map(([color, count]) => color),
        ...textColorsArray.map(([color, count]) => color)
        // ...fillColorsArray.map(([color, count]) => color)
    ];

    // Normalize all colors to hex format and remove duplicates
    const normalizedColors = new Set();
    uniqueColors.forEach(color => {
        let normalizedColor;
        if (color.startsWith('#')) {
            normalizedColor = color.toUpperCase();
        } else if (color.startsWith('rgb')) {
            normalizedColor = rgba2hex(color, false);
            if (normalizedColor) {
                normalizedColor = normalizedColor.toUpperCase();
            }
        } else {
            normalizedColor = rgba2hex(color, false);
            if (normalizedColor) {
                normalizedColor = normalizedColor.toUpperCase();
            }
        }

        if (normalizedColor && normalizedColor !== '#NANANAN' && normalizedColor.match(/^#[0-9A-F]{6}$/)) {
            normalizedColors.add(normalizedColor);
        }
    });

    return Array.from(normalizedColors);
}

// Expose getPageColorPalette globally for use in color picker
window.getPageColorPalette = getPageColorPalette;


function isJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

function showColorInstancesPopup(colorHEX) {
    const originalColorHex = colorHEX; // Store the original color hex for true revert

    // Get shadow root
    const shadow = document.querySelector('#inspecta_app_container')?.shadowRoot;
    if (!shadow) {
        console.error('Shadow root not found');
        return;
    }
    // Find all elements using this color
    const allElements = document.querySelectorAll('body *');
    let matches = [];
    allElements.forEach(el => {
        // Skip invisible/hidden elements
        const rect = el.getBoundingClientRect();
        if (
            el.style.display === 'none' ||
            el.style.visibility === 'hidden' ||
            el.style.opacity === '0' ||
            rect.width === 0 || rect.height === 0 ||
            (el.style.position === 'absolute' && parseInt(el.style.left) <= -9999)
        ) return;

        const styles = getComputedStyle(el);

        // Check background color
        if (styles.backgroundColor) {
            const bgColorHex = rgba2hex(styles.backgroundColor, false);
            if (bgColorHex && bgColorHex.toUpperCase() === colorHEX.toUpperCase()) {
                matches.push({ element: el, property: 'background-color' });
            }
        }

        // Check text color
        if (styles.color) {
            const textColorHex = rgba2hex(styles.color, false);
            if (textColorHex && textColorHex.toUpperCase() === colorHEX.toUpperCase()) {
                matches.push({ element: el, property: 'color' });
            }
        }

        // Check border colors
        if (styles.borderColor) {
            const borderColorHex = rgba2hex(styles.borderColor, false);
            if (borderColorHex && borderColorHex.toUpperCase() === colorHEX.toUpperCase()) {
                matches.push({ element: el, property: 'border-color' });
            }
        }
    });

    // Get the properties panel position
    const propertiesPanel = shadow.querySelector('#pnl_properties');
    if (!propertiesPanel) {
        console.error('Properties panel not found');
        return;
    }
    const panelRect = propertiesPanel.getBoundingClientRect();

    // Create or show popup
    const root = shadow.querySelector('#inspecta_app');//document.body;
    let popup = root.querySelector('#color-instances-popup');
    if (popup) {
        popup.remove(); // Always remove old popup to reset state
    }
    popup = document.createElement('div');
    popup.id = 'color-instances-popup';
    popup.style.display = 'block';
    let content = document.createElement('div');
    content.className = 'instances-popup';
    content.innerHTML = `
        <div class="popup-header">
            <span class="popup-elements-count"></span>
            <div class="popup-header-color">
                <div class="color-thumbnail"></div>
                <input type="text" class="popup-color-input" contentEditable="true" />
            </div>
            <div class="action_icon" id="close-color-instances-popup">
                <svg class="icon-16 icon-fill">
                    <use href="#ic_close"></use>
                </svg>
            </div>
        </div>
        <div id="color-instances-suggestion-row"></div>
        <div id="color-instances-list" class="color-instances-list"></div>
        <div class="popup-footer">
            <button class="btn-popup btn-popup-secondary">Cancel</button>
            <button class="btn-popup btn-popup-primary">Apply</button>
        </div>`;
    popup.appendChild(content);
    root.appendChild(popup);



    // Position popup
    popup.style.position = 'fixed';
    popup.style.top = `${panelRect.top}px`;
    popup.style.left = `${panelRect.left - 336}px`;
    popup.style.maxHeight = `${panelRect.height}px`;
    popup.style.zIndex = '2147483647';

    // Track applied inline styles for easy cleanup
    const appliedInlineStyles = new Map(); // element -> { property -> originalValue }
    let hasChanges = false;

    // Helper function to clean up inline styles
    function cleanupInlineStyles() {
        appliedInlineStyles.forEach((properties, element) => {
            Object.entries(properties).forEach(([property, originalValue]) => {
                if (originalValue) {
                    element.style.setProperty(property, originalValue);
                } else {
                    element.style.removeProperty(property);
                }
            });
        });
        appliedInlineStyles.clear();
        hasChanges = false;

        // Disable the Apply button when changes are reverted
        const acceptBtn = popup.querySelector('.btn-popup-primary');
        if (acceptBtn) {
            acceptBtn.disabled = true;
            acceptBtn.classList.add('btn_disabled');
        }
    }

    // Handle click outside to close
    const closePopup = () => {
        cleanupInlineStyles();
        if (popup && popup.parentNode) {
            popup.parentNode.removeChild(popup);
        }
        shadow.removeEventListener('click', handleOutsideClick);
    };

    const handleOutsideClick = (e) => {
        // Don't close if clicking inside the popup or on the popup itself
        if (popup && popup.contains(e.target)) {
            return;
        }
        closePopup();
    };

    // Add click outside listener with a small delay to prevent immediate closing
    setTimeout(() => {
        shadow.addEventListener('click', handleOutsideClick);
    }, 100);

    // --- SUGGESTED COLOR LOGIC ---
    let figmaColors = Array.isArray(window.inspectaFigmaColors) ? window.inspectaFigmaColors : [];
    let suggestedColor = null;
    if (figmaColors.length > 0 && typeof findClosestColor === 'function') {
        suggestedColor = findClosestColor(colorHEX, figmaColors);
    }
    // Render suggestion row if a suggestion exists and is different from the original
    if (suggestedColor && suggestedColor.toUpperCase() !== colorHEX.toUpperCase()) {
        const suggestionRow = document.createElement('div');
        suggestionRow.className = 'color-suggestion-row';
        suggestionRow.innerHTML = `
        <div class="color-suggestion-wrap">
            <svg class="icon-14">
                    <use href="#ic_figma"></use>
            </svg>
            <span class="color-suggestion-label">Suggested color</span>
            </div>
            <div class="color-suggestion-value-wrap">
                <div class="color-suggestion-swatch" style="background:${suggestedColor};"></div>
                <span class="color-suggestion-hex">${suggestedColor}</span>
            </div>
            <a href="#" class="color-suggestion-apply">USE</a>
        `;
        // Insert above the list
        const suggestionRowContainer = content.querySelector('#color-instances-suggestion-row');
        suggestionRowContainer.appendChild(suggestionRow);
        // Add click handler for Apply
        const applyLink = suggestionRow.querySelector('a');
        applyLink.addEventListener('click', function (e) {
            e.preventDefault();
            // Fill the color input and trigger the same logic as manual apply
            const colorInput = content.querySelector('.popup-color-input');
            colorInput.value = suggestedColor;
            // Guaranteed cross-context event dispatch
            let event;
            if (typeof colorInput.ownerDocument.createEvent === 'function') {
                event = colorInput.ownerDocument.createEvent('Event');
                event.initEvent('input', true, true);
            } else if (typeof Event === 'function') {
                event = new Event('input', { bubbles: true });
            }
            if (event) colorInput.dispatchEvent(event);
            // Optionally, scroll to the input
            colorInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }
    // --- END SUGGESTED COLOR LOGIC ---

    // Update content
    if (content) {
        // Update header
        content.querySelector('.popup-elements-count').textContent = `${matches.length} elements`;
        content.querySelector('.color-thumbnail').style.background = colorHEX;
        const colorInput = content.querySelector('.popup-color-input');
        colorInput.value = colorHEX;

        // Remove previous input event listeners by replacing the input element
        const newColorInput = colorInput.cloneNode(true);
        colorInput.parentNode.replaceChild(newColorInput, colorInput);

        // Prevent clicks on input from closing popup
        newColorInput.addEventListener('click', function (e) {
            e.stopPropagation();
        });

        // Add input handler for color changes
        newColorInput.addEventListener('input', function () {
            const newColor = this.value;
            // Validate color format
            if (!newColor.match(/^#[0-9A-Fa-f]{6}$/)) {
                return; // Invalid color format
            }

            // Update the color thumbnail
            content.querySelector('.color-thumbnail').style.background = newColor;

            // First, clean up any existing inline styles to start fresh
            appliedInlineStyles.forEach((properties, element) => {
                Object.entries(properties).forEach(([property, originalValue]) => {
                    if (originalValue) {
                        element.style.setProperty(property, originalValue);
                    } else {
                        element.style.removeProperty(property);
                    }
                });
            });

            // Now apply the new color to all matching elements
            matches.forEach(({ element, property }) => {
                // Store original value if not already stored
                if (!appliedInlineStyles.has(element)) {
                    appliedInlineStyles.set(element, {});
                }
                if (!appliedInlineStyles.get(element)[property]) {
                    appliedInlineStyles.get(element)[property] = element.style.getPropertyValue(property);
                }

                // Apply new color inline
                element.style.setProperty(property, newColor);
            });

            hasChanges = true;

            // Enable the Apply button when changes are made
            const acceptBtn = popup.querySelector('.btn-popup-primary');
            if (acceptBtn) {
                acceptBtn.disabled = false;
                acceptBtn.classList.remove('btn_disabled');
            }

            // Note: Don't update overview thumbnails until Accept is clicked
            // This keeps the original colors visible in the overview
        });

        // Update list
        const listDiv = content.querySelector('#color-instances-list');
        listDiv.innerHTML = '';
        if (matches.length === 0) {
            listDiv.innerHTML = `<div style="color:#888;font-size:11px;">No elements found using this color.</div>`;
        } else {
            matches.forEach(({ element, property }) => {
                const tag = element.tagName.toLowerCase();
                const className = element.className ? '.' + Array.from(element.classList).join('.') : '';
                const item = document.createElement('div');
                item.className = 'color-instance-item selector-ellipsis';
                item.innerHTML = `
                    <div class="selector-ellipsis">${tag}${className}</div>
                    <div style="color:#888;font-size:11px;">(${property})</div>
                `;
                // Add click handler
                item.style.cursor = 'pointer';
                item.addEventListener('click', function (e) {
                    e.stopPropagation();
                    e.preventDefault();
                    if (!(element instanceof Element)) return;
                    // Select element in DOM
                    if (typeof window.selectElementForInspecta === 'function') {
                        window.selectElementForInspecta(element);
                    }
                    closePopup();
                });
                // Add hover effects
                item.addEventListener('mouseover', function () {
                    if (typeof window.showHoverOverlay === 'function') {
                        window.showHoverOverlay(element);
                    }
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                });
                item.addEventListener('mouseout', function () {
                    if (typeof window.hideHoverOverlay === 'function') {
                        window.hideHoverOverlay();
                    }
                });
                listDiv.appendChild(item);
            });
        }



        // Add close handler
        const closeButton = popup.querySelector('#close-color-instances-popup');
        if (closeButton) {
            closeButton.onclick = function () {
                closePopup();
            };
        }

        // Add cancel button handler
        const cancelBtn = popup.querySelector('.btn-popup-secondary');
        if (cancelBtn) {
            cancelBtn.onclick = function () {
                closePopup();
            };
        }

        // Add accept button handler
        const acceptBtn = popup.querySelector('.btn-popup-primary');
        if (acceptBtn) {
            // Initially disable the button until changes are made
            acceptBtn.disabled = true;
            acceptBtn.classList.add('btn_disabled');

            acceptBtn.onclick = function () {
                const newColor = newColorInput.value;
                if (!newColor.match(/^#[0-9A-Fa-f]{6}$/)) {
                    return; // Invalid color format
                }

                // First, clean up inline styles to restore original state
                cleanupInlineStyles();

                // Now apply the global color change to the stylesheet
                if (typeof window.generateGlobalColorChange === 'function') {
                    window.generateGlobalColorChange(originalColorHex, newColor, 'all');
                }

                // Force UI update
                if (typeof window.generateInspectaFullCss === 'function') {
                    window.generateInspectaFullCss();
                }
                if (typeof window.generateCssChangesCounter === 'function') {
                    window.generateCssChangesCounter();
                }

                // Repopulate color pallets to show new colors
                if (typeof clearAndRefreshOverview === 'function') {
                    clearAndRefreshOverview();

                    // Wait for thumbnails to be created using MutationObserver
                    const overviewPanel = shadow.querySelector('#pnl-overview');
                    if (overviewPanel) {
                        const observer = new MutationObserver((mutations) => {
                            const thumbnails = overviewPanel.querySelectorAll('.in-thumbnail');
                            if (thumbnails.length > 0) {
                                observer.disconnect();
                                setTimeout(() => {
                                    if (typeof window.updateColorMismatchUI === 'function') {
                                        window.updateColorMismatchUI();
                                    }
                                }, 50);
                            }
                        });

                        observer.observe(overviewPanel, { childList: true, subtree: true });

                        // Fallback timeout in case observer doesn't trigger
                        setTimeout(() => {
                            observer.disconnect();
                            if (typeof window.updateColorMismatchUI === 'function') {
                                window.updateColorMismatchUI();
                            }
                        }, 500);
                    } else {
                        // Fallback if overview panel not found
                        setTimeout(() => {
                            if (typeof window.updateColorMismatchUI === 'function') {
                                window.updateColorMismatchUI();
                            }
                        }, 100);
                    }
                } else if (typeof window.updateColorMismatchUI === 'function') {
                    window.updateColorMismatchUI();
                }

                // Close the popup
                closePopup();
            };
        }
    }
}

// Add this function after the showColorInstancesPopup function
function showFontInstancesPopup(fontFamily, fontSize, lineHeight, fontWeight) {

    // Find all elements using this font combination
    const allElements = document.querySelectorAll('body *');
    let matches = [];

    allElements.forEach(el => {
        // Skip invisible/hidden elements
        const rect = el.getBoundingClientRect();
        if (
            el.style.display === 'none' ||
            el.style.visibility === 'hidden' ||
            el.style.opacity === '0' ||
            rect.width === 0 || rect.height === 0 ||
            (el.style.position === 'absolute' && parseInt(el.style.left) <= -9999)
        ) return;

        // Exclude non-text elements
        const nonTextTags = ['img', 'svg', 'canvas', 'video', 'audio', 'iframe', 'object', 'embed', 'picture', 'source', 'track', 'map', 'area', 'meta', 'link', 'script', 'style', 'br', 'hr', 'input', 'textarea', 'button', 'select', 'option'];
        if (nonTextTags.includes(el.tagName.toLowerCase())) return;

        // Exclude elements without direct visible text node
        let hasDirectText = false;
        for (let node of el.childNodes) {
            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
                hasDirectText = true;
                break;
            }
        }
        if (!hasDirectText) return;

        const styles = getComputedStyle(el);

        // Check if this element uses the specified font combination
        const elementFontFamily = styles.fontFamily.split(',')[0].trim().replace(/['"]/g, '');
        const elementFontSize = styles.fontSize;
        const elementLineHeight = styles.lineHeight;
        const elementFontWeight = styles.fontWeight;

        // Clean up the target font family for comparison
        const targetFontFamily = fontFamily.split(',')[0].trim().replace(/['"]/g, '');

        // Normalize values for comparison

        const elementSize = normalizeSize(elementFontSize);
        const elementLH = normalizeLineHeight(elementLineHeight);
        const targetSize = normalizeSize(fontSize);
        const targetLH = normalizeLineHeight(lineHeight);

        // Check if font properties match
        const familyMatches = elementFontFamily.toLowerCase() === targetFontFamily.toLowerCase();
        const sizeMatches = elementSize === targetSize;
        const lineHeightMatches = elementLH === targetLH;
        const weightMatches = elementFontWeight === fontWeight;

        if (familyMatches && sizeMatches && lineHeightMatches && weightMatches) {
            matches.push({
                element: el,
                fontFamily: elementFontFamily,
                fontSize: elementFontSize,
                lineHeight: elementLineHeight,
                fontWeight: elementFontWeight
            });
        }
    });

    // Use computed style from the first match if available
    let initialFontSize = fontSize;
    let initialLineHeight = lineHeight;
    let initialFontWeight = fontWeight;

    if (matches.length > 0) {
        const styles = getComputedStyle(matches[0].element);
        initialFontSize = styles.fontSize;
        initialLineHeight = styles.lineHeight;
        initialFontWeight = styles.fontWeight;
    } else {
        // Fallback: Find any element using the same font family and use its computed values
        const targetFontFamily = fontFamily.split(',')[0].trim().replace(/['"]/g, '');
        const fallbackElement = Array.from(document.querySelectorAll('body *')).find(el => {
            const styles = getComputedStyle(el);
            const elementFontFamily = styles.fontFamily.split(',')[0].trim().replace(/['"]/g, '');
            return elementFontFamily.toLowerCase() === targetFontFamily.toLowerCase();
        });

        if (fallbackElement) {
            const styles = getComputedStyle(fallbackElement);
            initialFontSize = styles.fontSize;
            initialLineHeight = styles.lineHeight;
            initialFontWeight = styles.fontWeight;
        }
    }

    // Get the properties panel position
    const propertiesPanel = shadow.querySelector('#pnl_properties');
    if (!propertiesPanel) {
        console.error('Properties panel not found');
        return;
    }
    const panelRect = propertiesPanel.getBoundingClientRect();

    // Create or show popup
    const root = shadow.querySelector('#inspecta_app');
    let popup = root.querySelector('#font-instances-popup');
    if (popup) {
        popup.remove(); // Always remove old popup to reset state
    }
    popup = document.createElement('div');
    popup.id = 'font-instances-popup';
    popup.style.display = 'block';
    let content = document.createElement('div');
    content.className = 'instances-popup';

    content.innerHTML = `
        <div class="popup-header">
            <span class="popup-elements-count"></span>
            <div class="popup-header-font">
                <div class="font-preview">${fontFamily}</div>
                <div class="font-details">
                    <div class="input_dd">
                        <input name="fontSize" type="text" class="m_input inspecta_input" id="font-size-input" value="${initialFontSize}" />
                    </div>
                    <div class="input_dd">
                        <svg class="icon-16 icon-fill" style="position: absolute; left: 6px; top: 50%; transform: translateY(-50%); z-index: 1; pointer-events: none;">
                            <use href="#ic_line_h"></use>
                        </svg>
                        <input name="lineHeight" type="text" class="m_input inspecta_input" id="font-line-height-input" value="${initialLineHeight}" style="padding-left: 28px;" />
                    </div>
                    <div class="select-wrapper">
                        <select name="fontWeight" id="font-weight-input" class="select-box">
                            <option value="100" ${initialFontWeight === '100' ? 'selected' : ''}>Thin : 100</option>
                            <option value="200" ${initialFontWeight === '200' ? 'selected' : ''}>Extra Light : 200</option>
                            <option value="300" ${initialFontWeight === '300' ? 'selected' : ''}>Light : 300</option>
                            <option value="400" ${initialFontWeight === '400' ? 'selected' : ''}>Regular : 400</option>
                            <option value="500" ${initialFontWeight === '500' ? 'selected' : ''}>Medium : 500</option>
                            <option value="600" ${initialFontWeight === '600' ? 'selected' : ''}>Semi Bold : 600</option>
                            <option value="700" ${initialFontWeight === '700' ? 'selected' : ''}>Bold : 700</option>
                            <option value="800" ${initialFontWeight === '800' ? 'selected' : ''}>Extra Bold : 800</option>
                            <option value="900" ${initialFontWeight === '900' ? 'selected' : ''}>Black : 900</option>
                        </select>
                        <svg class="icon-16 icon-fill select-arrow">
                            <use href="#ic_dd"></use>
                        </svg>
                    </div>
                </div>
            </div>
            <div class="action_icon" id="close-font-instances-popup">
                <svg class="icon-16 icon-fill">
                    <use href="#ic_close"></use>
                </svg>
            </div>
        </div>
        <div id="font-instances-suggestion-row"></div>
        <div id="font-instances-list" class="font-instances-list"></div>
        <div class="popup-footer">
            <button class="btn-popup btn-popup-secondary">Cancel</button>
            <button class="btn-popup btn-popup-primary">Apply</button>
        </div>`;
    popup.appendChild(content);
    root.appendChild(popup);

    // Position popup
    popup.style.position = 'fixed';
    popup.style.top = `${panelRect.top}px`;
    popup.style.left = `${panelRect.left - 336}px`;
    popup.style.maxHeight = `${panelRect.height}px`;
    popup.style.zIndex = '2147483647';

    // Track applied inline styles for easy cleanup
    const appliedInlineStyles = new Map(); // element -> { property -> originalValue }
    let hasChanges = false;

    // --- SUGGESTED FONT LOGIC WITH STRICT PRIORITY ---
    let figmaFonts = Array.isArray(window.inspectaFigmaFonts) ? window.inspectaFigmaFonts : [];
    let suggestedFont = null;

    // Helper to parse Figma font string (e.g., 'Plus Jakarta Sans: 14px/ 21px/ 400')
    function parseFigmaFontString(str) {
        const [familyPart, rest] = str.split(':');
        if (!rest) return { family: familyPart.trim() };
        const [size, lineHeight, weight] = rest.split('/').map(s => s.trim());
        return {
            family: familyPart.trim(),
            size: size,
            lineHeight: lineHeight,
            weight: weight
        };
    }

    // Normalize helpers
    function norm(val) {
        if (val === undefined || val === null) return null;
        if (typeof val === 'string' && val.endsWith('px')) return parseFloat(val);
        if (typeof val === 'string' && val !== 'normal' && val !== 'auto') return parseFloat(val);
        return val;
    }
    function normWeight(val) {
        return parseInt(val) || 400;
    }

    // Robust font family normalization (copied from figmaIntegration.js)
    function normalizeFontFamily(f) {
        return f
            .split(',')[0]
            .replace(/['"]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    if (figmaFonts.length > 0) {
        // Parse all Figma fonts
        const parsedFigmaFonts = figmaFonts.map(parseFigmaFontString);
        const currentFont = {
            family: fontFamily.trim(),
            size: norm(fontSize),
            lineHeight: norm(lineHeight),
            weight: normWeight(fontWeight)
        };
        // 1. Filter by same family (robust normalization)
        let sameFamilyFonts = parsedFigmaFonts.filter(f => normalizeFontFamily(f.family) === normalizeFontFamily(currentFont.family));
        let candidates = sameFamilyFonts.length > 0 ? sameFamilyFonts : parsedFigmaFonts;
        // 2. Find closest by size, then weight, then line height
        let bestMatch = null;
        let bestScore = Infinity;
        candidates.forEach(f => {
            let score = 0;
            // Only penalize family if not matching
            if (f.family.toLowerCase() !== currentFont.family.toLowerCase()) score += 10000;
            // Size difference (high priority)
            score += Math.abs(norm(f.size) - currentFont.size) * 100;
            // Weight difference
            score += Math.abs(normWeight(f.weight) - currentFont.weight) * 10;
            // Line height difference
            if (f.lineHeight && currentFont.lineHeight && f.lineHeight !== 'normal' && currentFont.lineHeight !== 'normal') {
                score += Math.abs(norm(f.lineHeight) - currentFont.lineHeight);
            }
            if (score < bestScore) {
                bestScore = score;
                bestMatch = f;
            }
        });
        // Add 20% size difference threshold
        if (bestMatch && currentFont.size && norm(bestMatch.size)) {
            const percentDiff = Math.abs(norm(bestMatch.size) - currentFont.size) / currentFont.size;
            if (percentDiff <= 0.2) {
                suggestedFont = bestMatch;
            } else {
                suggestedFont = null; // Don't suggest if >20% different
            }
        }
    }

    // Render simple suggestion row if a suggestion exists and is different from the current font combination
    if (suggestedFont) {
        // Compare all properties (family, size, lineHeight, weight)
        const isSameCombo = (
            normalizeFontFamily(suggestedFont.family) === normalizeFontFamily(fontFamily) &&
            norm(suggestedFont.size) === norm(fontSize) &&
            norm(suggestedFont.lineHeight) === norm(lineHeight) &&
            normWeight(suggestedFont.weight) === normWeight(fontWeight)
        );
        if (!isSameCombo) {
            const suggestionRow = document.createElement('div');
            suggestionRow.className = 'font-suggestion-row';
            suggestionRow.innerHTML = `
                <div class="font-suggestion-wrap">
                   <svg class="icon-14">
                                <use href="#ic_figma"></use>
                            </svg>
                    <span class="font-suggestion-label">Suggested font</span>
                    <a href="#" class="font-suggestion-apply">USE</a>
                </div>
                <span class="font-suggestion-value">${suggestedFont.family} ${suggestedFont.size}/${suggestedFont.lineHeight}/${suggestedFont.weight}</span>
            `;
            // Insert above the list
            const suggestionRowContainer = content.querySelector('#font-instances-suggestion-row');
            suggestionRowContainer.appendChild(suggestionRow);
            // Add click handler for Apply
            const applyLink = suggestionRow.querySelector('a');
            applyLink.addEventListener('click', function (e) {
                e.preventDefault();
                // Update popup header to show new values
                const fontPreview = content.querySelector('.font-preview');
                const sizeInput = content.querySelector('#font-size-input');
                const lineHeightInput = content.querySelector('#font-line-height-input');
                const weightInput = content.querySelector('#font-weight-input');

                if (fontPreview) fontPreview.textContent = suggestedFont.family;
                if (sizeInput) sizeInput.value = suggestedFont.size;
                if (lineHeightInput) lineHeightInput.value = suggestedFont.lineHeight;
                if (weightInput) weightInput.value = suggestedFont.weight;
                // Apply the suggested font to all matching elements
                matches.forEach(({ element }) => {
                    if (!appliedInlineStyles.has(element)) {
                        appliedInlineStyles.set(element, {});
                    }
                    // Store original values
                    const originalFontFamily = element.style.fontFamily;
                    const originalFontWeight = element.style.fontWeight;
                    const originalFontSize = element.style.fontSize;
                    const originalLineHeight = element.style.lineHeight;
                    if (!appliedInlineStyles.get(element)['font-family']) {
                        appliedInlineStyles.get(element)['font-family'] = originalFontFamily;
                    }
                    if (!appliedInlineStyles.get(element)['font-weight']) {
                        appliedInlineStyles.get(element)['font-weight'] = originalFontWeight;
                    }
                    if (!appliedInlineStyles.get(element)['font-size']) {
                        appliedInlineStyles.get(element)['font-size'] = originalFontSize;
                    }
                    if (!appliedInlineStyles.get(element)['line-height']) {
                        appliedInlineStyles.get(element)['line-height'] = originalLineHeight;
                    }
                    // Apply all four properties as inline styles for preview
                    element.style.setProperty('font-family', suggestedFont.family);
                    element.style.setProperty('font-size', suggestedFont.size);
                    element.style.setProperty('line-height', suggestedFont.lineHeight);
                    element.style.setProperty('font-weight', suggestedFont.weight);
                });
                hasChanges = true;
                // Enable the Apply button
                const acceptBtn = popup.querySelector('.btn-popup-primary');
                if (acceptBtn) {
                    acceptBtn.disabled = false;
                    acceptBtn.classList.remove('btn_disabled');
                }
                // Do NOT refresh overview or update red dots here
            });
        }
    }
    // --- END SUGGESTED FONT LOGIC WITH STRICT PRIORITY ---



    // Update content
    if (content) {
        // Update header
        content.querySelector('.popup-elements-count').textContent = `${matches.length} elements`;
        content.querySelector('.font-preview').textContent = fontFamily;

        // Get input elements in outer scope so they can be accessed by the accept button handler
        const sizeInput = content.querySelector('#font-size-input');
        const lineHeightInput = content.querySelector('#font-line-height-input');
        const weightInput = content.querySelector('#font-weight-input');

        // Add input change handlers for manual font editing
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {

            if (sizeInput && lineHeightInput && weightInput) {
                // Function to apply font changes to all matching elements
                function applyFontChanges() {
                    let newSize = sizeInput.value.trim();
                    let newLineHeight = lineHeightInput.value.trim();
                    let newWeight = weightInput.value.trim();

                    // Validate and format font size (reuse properties panel logic)
                    if (newSize) {
                        if (!isNaN(newSize) && !newSize.includes('px') && !newSize.includes('em') && !newSize.includes('rem')) {
                            newSize = newSize + 'px';
                        }
                    }

                    // Validate and format line height (reuse properties panel logic)
                    if (newLineHeight) {
                        if (!isNaN(newLineHeight) && !newLineHeight.includes('px') && !newLineHeight.includes('em') && !newLineHeight.includes('rem')) {
                            newLineHeight = newLineHeight + 'px';
                        }
                    }

                    // Font weight is already validated by the select dropdown
                    if (!newWeight) {
                        newWeight = '400'; // Default to normal weight
                    }

                    // Check if at least one input has a value
                    if (!newSize && !newLineHeight && !newWeight) {
                        return;
                    }

                    // Apply changes to all matching elements
                    matches.forEach(({ element }) => {
                        if (!appliedInlineStyles.has(element)) {
                            appliedInlineStyles.set(element, {});
                        }

                        // Store original values if not already stored
                        const originalFontSize = element.style.fontSize;
                        const originalLineHeight = element.style.lineHeight;
                        const originalFontWeight = element.style.fontWeight;

                        if (!appliedInlineStyles.get(element)['font-size']) {
                            appliedInlineStyles.get(element)['font-size'] = originalFontSize;
                        }
                        if (!appliedInlineStyles.get(element)['line-height']) {
                            appliedInlineStyles.get(element)['line-height'] = originalLineHeight;
                        }
                        if (!appliedInlineStyles.get(element)['font-weight']) {
                            appliedInlineStyles.get(element)['font-weight'] = originalFontWeight;
                        }

                        // Apply new values as inline styles for preview
                        if (newSize) {
                            element.style.setProperty('font-size', newSize);
                        }
                        if (newLineHeight) {
                            element.style.setProperty('line-height', newLineHeight);
                        }
                        if (newWeight) {
                            element.style.setProperty('font-weight', newWeight);
                        }
                    });

                    hasChanges = true;

                    // Enable the Apply button
                    const acceptBtn = popup.querySelector('.btn-popup-primary');
                    if (acceptBtn) {
                        acceptBtn.disabled = false;
                        acceptBtn.classList.remove('btn_disabled');
                    }
                }

                // Add input event listeners (reuse properties panel logic)
                let debounceTimer;
                function debouncedApplyChanges() {
                    clearTimeout(debounceTimer);
                    debounceTimer = setTimeout(applyFontChanges, 100);
                }

                // Font size input (reuse properties panel event handling)
                sizeInput.addEventListener('input', debouncedApplyChanges);
                sizeInput.addEventListener('keypress', function (e) {
                    if (e.key === 'Enter') {
                        lineHeightInput.focus();
                        lineHeightInput.select();
                    }
                });

                // Line height input (reuse properties panel event handling)
                lineHeightInput.addEventListener('input', debouncedApplyChanges);
                lineHeightInput.addEventListener('keypress', function (e) {
                    if (e.key === 'Enter') {
                        weightInput.focus();
                    }
                });

                // Font weight select (reuse properties panel event handling)
                weightInput.addEventListener('change', debouncedApplyChanges);
                weightInput.addEventListener('keypress', function (e) {
                    if (e.key === 'Enter') {
                        const acceptBtn = popup.querySelector('.btn-popup-primary');
                        if (acceptBtn && !acceptBtn.disabled) {
                            acceptBtn.click();
                        }
                    }
                });

                // Add Escape key handler to cancel
                [sizeInput, lineHeightInput, weightInput].forEach(input => {
                    input.addEventListener('keydown', function (e) {
                        if (e.key === 'Escape') {
                            const cancelBtn = popup.querySelector('.btn-popup-secondary');
                            if (cancelBtn) {
                                cancelBtn.click();
                            }
                        }
                    });
                });
            }
        }, 10); // Close setTimeout



        // Update list
        const listDiv = content.querySelector('#font-instances-list');
        listDiv.innerHTML = '';
        if (matches.length === 0) {
            listDiv.innerHTML = `<div style="color:#888;font-size:11px;">No elements found using this font combination.</div>`;
        } else {
            matches.forEach(({ element, fontFamily: elementFontFamily, fontSize: elementFontSize, lineHeight: elementLineHeight, fontWeight: elementFontWeight }) => {
                const tag = element.tagName.toLowerCase();
                const className = element.className ? '.' + Array.from(element.classList).join('.') : '';
                const item = document.createElement('div');
                item.className = 'font-instance-item selector-ellipsis';
                item.innerHTML = `
                    <div class="selector-ellipsis">${tag}${className}</div>
                    <div class="font-instance-type" style="color:#888;font-size:11px;margin-top:2px;">${tag}</div>
                `;
                // Add click handler
                item.style.cursor = 'pointer';
                item.addEventListener('click', function (e) {
                    e.stopPropagation();
                    e.preventDefault();
                    if (!(element instanceof Element)) return;
                    // Select element in DOM
                    if (typeof window.selectElementForInspecta === 'function') {
                        window.selectElementForInspecta(element);
                    }
                    popup.style.display = 'none';
                });
                // Add hover effects
                item.addEventListener('mouseover', function () {
                    if (typeof window.showHoverOverlay === 'function') {
                        window.showHoverOverlay(element);
                    }
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                });
                item.addEventListener('mouseout', function () {
                    if (typeof window.hideHoverOverlay === 'function') {
                        window.hideHoverOverlay();
                    }
                });
                listDiv.appendChild(item);
            });
        }

        // Helper function to clean up inline styles
        function cleanupInlineStyles() {
            appliedInlineStyles.forEach((properties, element) => {
                Object.entries(properties).forEach(([property, originalValue]) => {
                    if (originalValue) {
                        element.style.setProperty(property, originalValue);
                    } else {
                        element.style.removeProperty(property);
                    }
                });
            });
            appliedInlineStyles.clear();
            hasChanges = false;

            // Reset input values to original values
            const sizeInput = content.querySelector('#font-size-input');
            const lineHeightInput = content.querySelector('#font-line-height-input');
            const weightInput = content.querySelector('#font-weight-input');
            if (sizeInput) sizeInput.value = initialFontSize || fontSize;
            if (lineHeightInput) lineHeightInput.value = initialLineHeight || lineHeight;
            if (weightInput) weightInput.value = initialFontWeight || fontWeight;

            // Disable the Apply button when changes are reverted
            const acceptBtn = popup.querySelector('.btn-popup-primary');
            if (acceptBtn) {
                acceptBtn.disabled = true;
                acceptBtn.classList.add('btn_disabled');
            }
        }

        // Add close handler
        const closeButton = popup.querySelector('#close-font-instances-popup');
        if (closeButton) {
            closeButton.onclick = function () {
                cleanupInlineStyles();
                popup.style.display = 'none';
            };
        }

        // Add cancel button handler
        const cancelBtn = popup.querySelector('.btn-popup-secondary');
        if (cancelBtn) {
            cancelBtn.onclick = function () {
                cleanupInlineStyles();
                popup.style.display = 'none';
            };
        }

        // Add accept button handler
        const acceptBtn = popup.querySelector('.btn-popup-primary');
        if (acceptBtn) {
            // Initially disable the button until changes are made
            acceptBtn.disabled = true;
            acceptBtn.classList.add('btn_disabled');

            acceptBtn.onclick = function () {
                // Get current input values
                const newFontSize = sizeInput.value.trim();
                const newLineHeight = lineHeightInput.value.trim();
                const newFontWeight = weightInput.value.trim();

                // Get the current font family from the popup header (this may have changed due to Figma suggestions)
                const currentFontFamily = content.querySelector('.font-preview')?.textContent || fontFamily;

                // Clean up all inline styles before applying CSS rules

                matches.forEach(({ element }) => {
                    if (element.style) {
                        element.style.removeProperty('font-family');
                        element.style.removeProperty('font-size');
                        element.style.removeProperty('line-height');
                        element.style.removeProperty('font-weight');
                    }
                });

                // Now apply the global font change to the stylesheet
                if (typeof window.generateGlobalFontChange === 'function') {
                    window.generateGlobalFontChange(fontFamily, fontSize, lineHeight, fontWeight, currentFontFamily, newFontSize, newLineHeight, newFontWeight, 'all');

                    // Debug: Check the element state after applying the change
                    setTimeout(() => {

                        const allElements = document.querySelectorAll('body *');
                        allElements.forEach(el => {
                            const styles = getComputedStyle(el);
                            const elementFontFamily = styles.fontFamily.split(',')[0].trim().replace(/['"]/g, '');
                            const elementFontSize = styles.fontSize;

                            // Check if this element matches the original font
                            if (elementFontFamily.toLowerCase() === fontFamily.toLowerCase() &&
                                elementFontSize === fontSize) {
                                // Check if it has the global font class
                                const globalClass = `inspecta-global-font-${fontFamily.replace(/[^a-zA-Z0-9]/g, '')}-${fontSize.replace(/[^a-zA-Z0-9]/g, '')}-${lineHeight.replace(/[^a-zA-Z0-9]/g, '')}-${fontWeight}`;
                                if (el.classList.contains(globalClass)) {
                                    // Element has global font class
                                } else {
                                    // Element does NOT have global font class
                                }
                            }
                        });
                    }, 500);
                }

                // Force UI update
                if (typeof window.generateInspectaFullCss === 'function') {
                    window.generateInspectaFullCss();
                }
                if (typeof window.generateCssChangesCounter === 'function') {
                    window.generateCssChangesCounter();
                }

                // Repopulate font pallets to show new fonts
                if (typeof clearAndRefreshOverview === 'function') {
                    clearAndRefreshOverview();

                    // Wait for thumbnails to be created using MutationObserver
                    const overviewPanel = shadow.querySelector('#pnl-overview');
                    if (overviewPanel) {
                        const observer = new MutationObserver((mutations) => {
                            const fontItems = overviewPanel.querySelectorAll('.in-thumb-font');
                            if (fontItems.length > 0) {
                                observer.disconnect();
                                setTimeout(() => {
                                    if (typeof window.updateFontMismatchUI === 'function') {
                                        window.updateFontMismatchUI();
                                    }
                                }, 50);
                            }
                        });

                        observer.observe(overviewPanel, { childList: true, subtree: true });

                        // Fallback timeout in case observer doesn't trigger
                        setTimeout(() => {
                            observer.disconnect();
                            if (typeof window.updateFontMismatchUI === 'function') {
                                window.updateFontMismatchUI();
                            }
                        }, 500);
                    } else {
                        // Fallback if overview panel not found
                        setTimeout(() => {
                            if (typeof window.updateFontMismatchUI === 'function') {
                                window.updateFontMismatchUI();
                            }
                        }, 100);
                    }
                } else {
                    if (typeof window.updateFontMismatchUI === 'function') {
                        window.updateFontMismatchUI();
                    }
                }

                // Close the popup
                if (popup && popup.style) {
                    popup.style.display = 'none';
                }
                if (popup && popup.parentNode) {
                    popup.parentNode.removeChild(popup);
                }
                const popupById = shadow.querySelector('#font-instances-popup');
                if (popupById) {
                    popupById.style.display = 'none';
                    if (popupById.parentNode) {
                        popupById.parentNode.removeChild(popupById);
                    }
                }
            };
        }
    }
}

// Add event listener to .in-thumbnail elements after they are created (only page colors are clickable)
function addInThumbnailClickHandlers() {
    const thumbnails = shadow.querySelectorAll('.in-thumbnail');
    thumbnails.forEach(thumbnail => {
        thumbnail.style.cursor = 'pointer';
        thumbnail.onclick = function () {
            const label = thumbnail.querySelector('.in-thumb-label');
            if (label) {
                showColorInstancesPopup(label.innerText.trim());
            }
        };
    });
}

// Add event listener to .in-thumb-font elements after they are created
function addInFontThumbnailClickHandlers() {
    const fontThumbnails = shadow.querySelectorAll('.in-thumb-font');

    fontThumbnails.forEach(thumbnail => {
        thumbnail.style.cursor = 'pointer';
        thumbnail.onclick = function () {
            // Get the font family from the parent container
            const fontGroup = thumbnail.closest('.font-group');
            if (!fontGroup) {
                return;
            }

            const fontFamilyElement = fontGroup.querySelector('.group-title');
            if (!fontFamilyElement) {
                return;
            }

            const fontFamily = fontFamilyElement.textContent.trim();

            // Get font properties from the thumbnail
            const fontSizeElement = thumbnail.querySelector('#in_overview_font_size');
            const lineHeightElement = thumbnail.querySelector('#in_overview_line-height');
            const fontWeightElement = thumbnail.querySelector('#in_overview_font_weight');

            if (fontSizeElement && lineHeightElement && fontWeightElement) {
                const fontSize = fontSizeElement.textContent.trim();
                const lineHeight = lineHeightElement.textContent.trim();
                const fontWeight = fontWeightElement.textContent.trim();

                showFontInstancesPopup(fontFamily, fontSize, lineHeight, fontWeight);
            }
        };
    });
}

// Add this function at the top of the file, after the existing functions
function clearAndRefreshOverview() {
    // Clear all cached color arrays
    bgColorsArray = [];
    textColorsArray = [];
    borderColorsArray = [];
    fillColorsArray = [];

    // Force a complete refresh of the overview
    if (typeof populateColorPallets === 'function') {
        populateColorPallets();
    }

    // Update mismatch counters after refresh
    if (typeof updateMismatchCounters === 'function') {
        setTimeout(() => {
            updateMismatchCounters();
        }, 100);
    }

    // Update bulk buttons after refresh
    setTimeout(() => {
        if (typeof window.updateBulkColorButton === 'function') {
            window.updateBulkColorButton();
        }
        if (typeof window.updateBulkFontButton === 'function') {
            window.updateBulkFontButton();
        }
    }, 200);

    // Update mismatch indicators after refresh using MutationObserver (original logic)
    const overviewPanel = shadow.querySelector('#pnl-overview');
    if (overviewPanel) {
        const observer = new MutationObserver((mutations) => {
            const thumbnails = overviewPanel.querySelectorAll('.in-thumbnail');
            if (thumbnails.length > 0) {
                observer.disconnect();
                setTimeout(() => {
                    if (typeof window.updateColorMismatchUI === 'function') {
                        window.updateColorMismatchUI();
                    }
                }, 50);
            }
        });

        observer.observe(overviewPanel, { childList: true, subtree: true });

        // Fallback timeout in case observer doesn't trigger
        setTimeout(() => {
            observer.disconnect();
            if (typeof window.updateColorMismatchUI === 'function') {
                window.updateColorMismatchUI();
            }
        }, 500);
    } else {
        // Fallback if overview panel not found
        setTimeout(() => {
            if (typeof window.updateColorMismatchUI === 'function') {
                window.updateColorMismatchUI();
            }
        }, 100);
    }
}

// Add this function to update mismatch indicators for all page colors
function updateAllColorMismatchIndicators() {
    const figmaColors = window.inspectaFigmaColors || [];
    const thumbnails = shadow.querySelectorAll('#pnl-overview .in-thumbnail');
    thumbnails.forEach(thumbnail => {
        const label = thumbnail.querySelector('.in-thumb-label');
        if (!label) return;
        const color = label.innerText.trim();
        // Remove any existing red dot
        const existingDot = thumbnail.querySelector('.red-dot');
        if (existingDot) existingDot.remove();
        // Add red dot if not in Figma colors
        if (!figmaColors.includes(color)) {
            const redCircle = document.createElement('span');
            redCircle.classList.add('red-dot');
            thumbnail.appendChild(redCircle);
        }
    });
}

function showBulkColorSuggestionsPopup() {
    // Get Figma colors
    let figmaColors = Array.isArray(window.inspectaFigmaColors) ? window.inspectaFigmaColors : [];
    if (figmaColors.length === 0) {
        alert('No Figma colors available. Please paste Figma colors first.');
        return;
    }

    // Get all page color thumbnails and find mismatched ones
    const thumbnails = shadow.querySelectorAll('#pnl-overview .in-thumbnail');
    const mismatchedColors = [];

    thumbnails.forEach(thumbnail => {
        const label = thumbnail.querySelector('.in-thumb-label');
        if (!label) return;

        const color = label.innerText.trim();
        const redDot = thumbnail.querySelector('.red-dot');

        // If there's a red dot, this color is mismatched
        if (redDot) {
            let suggestedColor = null;
            if (figmaColors.length > 0 && typeof findClosestColor === 'function') {
                suggestedColor = findClosestColor(color, figmaColors);
            }

            // Only add colors that have a valid suggested color that's different from the original
            if (suggestedColor && suggestedColor.toUpperCase() !== color.toUpperCase()) {
                mismatchedColors.push({
                    originalColor: color,
                    suggestedColor: suggestedColor,
                });
            }
        }
    });

    if (mismatchedColors.length === 0) {
        alert('No colors with close suggestions found. All mismatched colors don\'t have close matches in Figma colors.');
        return;
    }

    // Get the properties panel position (same as color instances popup)
    const propertiesPanel = shadow.querySelector('#pnl_properties');
    if (!propertiesPanel) {
        console.error('Properties panel not found');
        return;
    }
    const panelRect = propertiesPanel.getBoundingClientRect();

    // Create popup using existing popup structure
    const root = shadow.querySelector('#inspecta_app');
    let popup = root.querySelector('#color-instances-popup');
    if (popup) {
        popup.remove();
    }
    popup = document.createElement('div');
    popup.id = 'color-instances-popup';
    popup.style.display = 'block';

    let content = document.createElement('div');
    content.className = 'instances-popup';
    content.innerHTML = `
        <div class="popup-header">
            <div class="popup-title">Figma suggested colors</div>
            <div class="action_icon" id="close-color-instances-popup">
                <svg class="icon-16 icon-fill">
                    <use href="#ic_close"></use>
                </svg>
            </div>
        </div>
        <div id="bulk-color-suggestions-list" class="color-instances-list"></div>
        <div class="popup-footer">
            <button class="btn-popup btn-popup-secondary">Cancel</button>
                            <button class="btn-popup btn-popup-primary" id="apply-bulk-suggestions">Apply</button>
        </div>`;
    popup.appendChild(content);
    root.appendChild(popup);

    // Position popup (same as color instances popup)
    popup.style.position = 'fixed';
    popup.style.top = `${panelRect.top}px`;
    popup.style.left = `${panelRect.left - 336}px`;
    popup.style.maxHeight = `${panelRect.height}px`;
    popup.style.zIndex = '2147483647';

    // Populate the suggestions list
    const listDiv = content.querySelector('#bulk-color-suggestions-list');
    listDiv.innerHTML = '';

    mismatchedColors.forEach(({ originalColor, suggestedColor }, idx) => {
        const item = document.createElement('div');
        item.className = 'bulk-color-suggestion-row color-instance-item selector-ellipsis';
        item.innerHTML = `
            <div class="custom-checkbox">
                <input type="checkbox" checked>
                <div class="custom-checkbox-box"></div>
            </div>
            <div class="bulk-color-row-content">
                <div class="color-suggestion-swatch" style="background: ${originalColor};"></div>
                <span class="bulk-original-hex">${originalColor}</span>
                <span class="bulk-arrow">→</span>
                <div class="figma-suggestion">
                    <div class="color-suggestion-swatch" style="background: ${suggestedColor || '#fff'}"></div>
                    <span class="figma-hex">${suggestedColor || ''}</span>
                </div>
            </div>
        `;
        listDiv.appendChild(item);
    });

    // Add click event listeners to make checkboxes functional
    content.querySelectorAll('#bulk-color-suggestions-list .custom-checkbox').forEach(checkboxContainer => {
        const checkbox = checkboxContainer.querySelector('input[type="checkbox"]');
        const checkboxBox = checkboxContainer.querySelector('.custom-checkbox-box');
        checkboxBox.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            checkbox.click();
            updateBulkApplyButtonCount();
        });
        checkboxContainer.addEventListener('click', (e) => {
            if (e.target !== checkbox && e.target !== checkboxBox) {
                e.preventDefault();
                e.stopPropagation();
                checkbox.click();
                updateBulkApplyButtonCount();
            }
        });
    });

    // Update apply button count
    function updateBulkApplyButtonCount() {
        const checkedCount = content.querySelectorAll('#bulk-color-suggestions-list .custom-checkbox input[type="checkbox"]:checked').length;
        const applyButton = content.querySelector('#apply-bulk-suggestions');
        applyButton.textContent = `Apply (${checkedCount})`;
        applyButton.disabled = checkedCount === 0;
    }
    updateBulkApplyButtonCount();
    content.querySelectorAll('#bulk-color-suggestions-list .custom-checkbox input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', updateBulkApplyButtonCount);
    });

    // Add close handler
    const closeButton = popup.querySelector('#close-color-instances-popup');
    if (closeButton) {
        closeButton.onclick = function () {
            popup.style.display = 'none';
        };
    }
    // Add cancel button handler
    const cancelBtn = popup.querySelector('.btn-popup-secondary');
    if (cancelBtn) {
        cancelBtn.onclick = function () {
            popup.style.display = 'none';
        };
    }
    // Add apply button handler
    const applyBtn = popup.querySelector('#apply-bulk-suggestions');
    if (applyBtn) {
        // Set initial text with count
        const checkedCount = content.querySelectorAll('#bulk-color-suggestions-list .custom-checkbox input[type="checkbox"]:checked').length;
        applyBtn.textContent = `Apply (${checkedCount})`;
        applyBtn.onclick = function () {
            const checkedItems = content.querySelectorAll('#bulk-color-suggestions-list .custom-checkbox input[type="checkbox"]:checked');
            if (checkedItems.length === 0) {
                return;
            }
            // Gather all changes
            const changes = [];
            checkedItems.forEach(checkbox => {
                const item = checkbox.closest('.color-instance-item');
                const colorSpans = item.querySelectorAll('span.bulk-original-hex');
                const originalColor = colorSpans[0].textContent.trim();
                const figmaHex = item.querySelector('.figma-hex');
                const newColor = figmaHex ? figmaHex.textContent.trim() : '';
                if (/^#[0-9A-Fa-f]{6}$/.test(newColor) && originalColor.toUpperCase() !== newColor.toUpperCase()) {
                    changes.push({ originalColor, newColor });
                }
            });
            if (changes.length === 0) return;
            // Apply all changes
            changes.forEach(({ originalColor, newColor }) => {
                if (typeof window.generateGlobalColorChange === 'function') {
                    window.generateGlobalColorChange(originalColor, newColor, 'all');
                }
            });
            if (typeof window.generateInspectaFullCss === 'function') {
                window.generateInspectaFullCss();
            }
            if (typeof window.generateCssChangesCounter === 'function') {
                window.generateCssChangesCounter();
            }
            // Use the same MutationObserver logic as the single popup
            if (typeof clearAndRefreshOverview === 'function') {
                clearAndRefreshOverview();
                const overviewPanel = shadow.querySelector('#pnl-overview');
                if (overviewPanel) {
                    const observer = new MutationObserver((mutations) => {
                        const thumbnails = overviewPanel.querySelectorAll('.in-thumbnail');
                        if (thumbnails.length > 0) {
                            observer.disconnect();
                            setTimeout(() => {
                                if (typeof window.updateColorMismatchUI === 'function') {
                                    window.updateColorMismatchUI();
                                }
                            }, 50);
                        }
                    });
                    observer.observe(overviewPanel, { childList: true, subtree: true });
                    setTimeout(() => {
                        observer.disconnect();
                        if (typeof window.updateColorMismatchUI === 'function') {
                            window.updateColorMismatchUI();
                        }
                    }, 500);
                } else {
                    setTimeout(() => {
                        if (typeof window.updateColorMismatchUI === 'function') {
                            window.updateColorMismatchUI();
                        }
                    }, 100);
                }
            } else if (typeof window.updateColorMismatchUI === 'function') {
                window.updateColorMismatchUI();
            }
            // Close the popup
            if (popup && popup.parentNode) {
                popup.parentNode.removeChild(popup);
            }
        };
    }
}

function showBulkFontSuggestionsPopup() {
    // Get Figma fonts
    let figmaFonts = Array.isArray(window.inspectaFigmaFonts) ? window.inspectaFigmaFonts : [];
    if (figmaFonts.length === 0) {
        alert('No Figma fonts available. Please paste Figma fonts first.');
        return;
    }

    // Get all font thumbnails and find mismatched ones
    const thumbnails = shadow.querySelectorAll('#pnl-overview .in-thumb-font');
    const mismatchedFonts = [];

    thumbnails.forEach(thumbnail => {
        const redDot = thumbnail.querySelector('.red-dot');

        // If there's a red dot, this font is mismatched
        if (redDot) {
            // Extract font info from the thumbnail
            const fontSizeSpan = thumbnail.querySelector('#in_overview_font_size');
            const lineHeightSpan = thumbnail.querySelector('#in_overview_line-height');
            const fontWeightSpan = thumbnail.querySelector('#in_overview_font_weight');

            if (fontSizeSpan && lineHeightSpan && fontWeightSpan) {
                // Get font family from parent font-group
                const fontGroup = thumbnail.closest('.font-group');
                const fontFamilyLabel = fontGroup ? fontGroup.querySelector('.group-title') : null;
                const fontFamily = fontFamilyLabel ? fontFamilyLabel.textContent.trim() : '';

                const fontSize = fontSizeSpan.textContent.trim();
                const lineHeight = lineHeightSpan.textContent.trim();
                const fontWeight = fontWeightSpan.textContent.trim();

                if (fontFamily && fontSize && lineHeight && fontWeight) {
                    // Use the same font suggestion logic as the button function
                    let suggestedFont = null;

                    // Helper to parse Figma font string (e.g., 'Plus Jakarta Sans: 14px/ 21px/ 400')
                    function parseFigmaFontString(str) {
                        const [familyPart, rest] = str.split(':');
                        if (!rest) return { family: familyPart.trim() };
                        const [size, lineHeight, weight] = rest.split('/').map(s => s.trim());
                        return {
                            family: familyPart.trim(),
                            size: size,
                            lineHeight: lineHeight,
                            weight: weight
                        };
                    }

                    // Normalize helpers
                    function norm(val) {
                        if (val === undefined || val === null) return null;
                        if (typeof val === 'string' && val.endsWith('px')) return parseFloat(val);
                        if (typeof val === 'string' && val !== 'normal' && val !== 'auto') return parseFloat(val);
                        return val;
                    }
                    function normWeight(val) {
                        return parseInt(val) || 400;
                    }

                    // Robust font family normalization
                    function normalizeFontFamily(f) {
                        return f
                            .split(',')[0]
                            .replace(/['"]/g, '')
                            .replace(/\s+/g, ' ')
                            .trim()
                            .toLowerCase();
                    }

                    // Parse all Figma fonts
                    const parsedFigmaFonts = figmaFonts.map(parseFigmaFontString);
                    const currentFont = {
                        family: fontFamily.trim(),
                        size: norm(fontSize),
                        lineHeight: norm(lineHeight),
                        weight: normWeight(fontWeight)
                    };

                    // 1. Filter by same family (robust normalization)
                    let sameFamilyFonts = parsedFigmaFonts.filter(f => normalizeFontFamily(f.family) === normalizeFontFamily(currentFont.family));
                    let candidates = sameFamilyFonts.length > 0 ? sameFamilyFonts : parsedFigmaFonts;

                    // 2. Find closest by size, then weight, then line height
                    let bestMatch = null;
                    let bestScore = Infinity;
                    candidates.forEach(f => {
                        let score = 0;
                        // Only penalize family if not matching
                        if (f.family.toLowerCase() !== currentFont.family.toLowerCase()) score += 10000;
                        // Size difference (high priority)
                        score += Math.abs(norm(f.size) - currentFont.size) * 100;
                        // Weight difference
                        score += Math.abs(normWeight(f.weight) - currentFont.weight) * 10;
                        // Line height difference
                        if (f.lineHeight && currentFont.lineHeight && f.lineHeight !== 'normal' && currentFont.lineHeight !== 'normal') {
                            score += Math.abs(norm(f.lineHeight) - currentFont.lineHeight);
                        }
                        if (score < bestScore) {
                            bestScore = score;
                            bestMatch = f;
                        }
                    });

                    // Add 20% size difference threshold
                    if (bestMatch && currentFont.size && norm(bestMatch.size)) {
                        const percentDiff = Math.abs(norm(bestMatch.size) - currentFont.size) / currentFont.size;
                        if (percentDiff <= 0.2) {
                            suggestedFont = bestMatch;
                        }
                    }

                    // Check if the suggested font is different from the current font
                    if (suggestedFont) {
                        // Special line-height comparison that handles "normal" values
                        function compareLineHeights(lh1, lh2, fontSize) {
                            // If both are the same, they match
                            if (lh1 === lh2) return true;

                            // If one is "normal" and the other is a pixel value, check if they're equivalent
                            if (lh1 === 'normal' && lh2.includes('px')) {
                                const pixelValue = parseFloat(lh2);
                                const fontSizeNum = parseFloat(fontSize);
                                // "normal" is typically 1.2-1.4 times font size, so check if pixel value is close
                                const normalRange = fontSizeNum * 1.2;
                                return Math.abs(pixelValue - normalRange) < 2; // Allow 2px tolerance
                            }

                            if (lh2 === 'normal' && lh1.includes('px')) {
                                const pixelValue = parseFloat(lh1);
                                const fontSizeNum = parseFloat(fontSize);
                                const normalRange = fontSizeNum * 1.2;
                                return Math.abs(pixelValue - normalRange) < 2; // Allow 2px tolerance
                            }

                            // For other cases, use numeric comparison
                            return norm(lh1) === norm(lh2);
                        }

                        // Check if any property is different (not just line-height)
                        const familyDifferent = normalizeFontFamily(suggestedFont.family) !== normalizeFontFamily(fontFamily);
                        const sizeDifferent = norm(suggestedFont.size) !== norm(fontSize);
                        const lineHeightDifferent = !compareLineHeights(suggestedFont.lineHeight, lineHeight, fontSize);
                        const weightDifferent = normWeight(suggestedFont.weight) !== normWeight(fontWeight);

                        // Show suggestion if ANY property is different
                        if (familyDifferent || sizeDifferent || lineHeightDifferent || weightDifferent) {
                            // Construct the original and suggested font strings for display
                            const originalFontString = `${fontFamily} ${fontSize}/${lineHeight}/${fontWeight}`;
                            const suggestedFontString = `${suggestedFont.family} ${suggestedFont.size}/${suggestedFont.lineHeight}/${suggestedFont.weight}`;

                            mismatchedFonts.push({
                                originalFont: originalFontString,
                                suggestedFont: suggestedFontString,
                            });
                        }
                    }
                }
            }
        }
    });

    if (mismatchedFonts.length === 0) {
        alert('No fonts with close suggestions found. All mismatched fonts don\'t have close matches in Figma fonts.');
        return;
    }

    // Get the properties panel position (same as font instances popup)
    const propertiesPanel = shadow.querySelector('#pnl_properties');
    if (!propertiesPanel) {
        console.error('Properties panel not found');
        return;
    }
    const panelRect = propertiesPanel.getBoundingClientRect();

    // Create popup using existing popup structure
    const root = shadow.querySelector('#inspecta_app');
    let popup = root.querySelector('#font-instances-popup');
    if (popup) {
        popup.remove();
    }
    popup = document.createElement('div');
    popup.id = 'font-instances-popup';
    popup.style.display = 'block';

    let content = document.createElement('div');
    content.className = 'instances-popup';
    content.innerHTML = `
        <div class="popup-header">
            <div class="popup-title">Figma suggested fonts</div>
            <div class="action_icon" id="close-font-instances-popup">
                <svg class="icon-16 icon-fill">
                    <use href="#ic_close"></use>
                </svg>
            </div>
        </div>
        <div id="bulk-font-suggestions-list" class="font-instances-list"></div>
        <div class="popup-footer">
            <button class="btn-popup btn-popup-secondary">Cancel</button>
            <button class="btn-popup btn-popup-primary" id="apply-bulk-font-suggestions">Apply</button>
        </div>`;
    popup.appendChild(content);
    root.appendChild(popup);

    // Position popup (same as font instances popup)
    popup.style.position = 'fixed';
    popup.style.top = `${panelRect.top}px`;
    popup.style.left = `${panelRect.left - 336}px`;
    popup.style.maxHeight = `${panelRect.height}px`;
    popup.style.zIndex = '2147483647';

    // Populate the suggestions list
    const listDiv = content.querySelector('#bulk-font-suggestions-list');
    listDiv.innerHTML = '';

    mismatchedFonts.forEach(({ originalFont, suggestedFont }, idx) => {
        const item = document.createElement('div');
        item.className = 'bulk-font-suggestion-row font-instance-item selector-ellipsis';
        item.innerHTML = `
            <div class="custom-checkbox">
                <input type="checkbox" checked>
                <div class="custom-checkbox-box"></div>
            </div>
            <div class="bulk-font-row-content">
                <div class="font-change-entry">
                    <div class="font-change-original">Original: ${originalFont}</div>
                    <div class="font-change-new">Suggested: ${suggestedFont}</div>
                </div>
            </div>
        `;
        listDiv.appendChild(item);
    });

    // Add click event listeners to make checkboxes functional
    content.querySelectorAll('#bulk-font-suggestions-list .custom-checkbox').forEach(checkboxContainer => {
        const checkbox = checkboxContainer.querySelector('input[type="checkbox"]');
        const checkboxBox = checkboxContainer.querySelector('.custom-checkbox-box');
        checkboxBox.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            checkbox.click();
            updateBulkFontApplyButtonCount();
        });
        checkboxContainer.addEventListener('click', (e) => {
            if (e.target !== checkbox && e.target !== checkboxBox) {
                e.preventDefault();
                e.stopPropagation();
                checkbox.click();
                updateBulkFontApplyButtonCount();
            }
        });
    });

    // Update apply button count
    function updateBulkFontApplyButtonCount() {
        const checkedCount = content.querySelectorAll('#bulk-font-suggestions-list .custom-checkbox input[type="checkbox"]:checked').length;
        const applyButton = content.querySelector('#apply-bulk-font-suggestions');
        applyButton.textContent = `Apply (${checkedCount})`;
        applyButton.disabled = checkedCount === 0;
    }
    updateBulkFontApplyButtonCount();
    content.querySelectorAll('#bulk-font-suggestions-list .custom-checkbox input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', updateBulkFontApplyButtonCount);
    });

    // Add close handler
    const closeButton = popup.querySelector('#close-font-instances-popup');
    if (closeButton) {
        closeButton.onclick = function () {
            popup.style.display = 'none';
        };
    }
    // Add cancel button handler
    const cancelBtn = popup.querySelector('.btn-popup-secondary');
    if (cancelBtn) {
        cancelBtn.onclick = function () {
            popup.style.display = 'none';
        };
    }
    // Add apply button handler
    const applyBtn = popup.querySelector('#apply-bulk-font-suggestions');
    if (applyBtn) {
        // Set initial text with count
        const checkedCount = content.querySelectorAll('#bulk-font-suggestions-list .custom-checkbox input[type="checkbox"]:checked').length;
        applyBtn.textContent = `Apply (${checkedCount})`;
        applyBtn.onclick = function () {
            const checkedItems = content.querySelectorAll('#bulk-font-suggestions-list .custom-checkbox input[type="checkbox"]:checked');
            if (checkedItems.length === 0) {
                return;
            }
            // Gather all changes
            const changes = [];
            checkedItems.forEach((checkbox, index) => {
                const item = checkbox.closest('.font-instance-item');
                const originalElement = item.querySelector('.font-change-original');
                const newElement = item.querySelector('.font-change-new');

                if (originalElement && newElement) {
                    const originalFont = originalElement.textContent.replace('Original: ', '').trim();
                    const newFont = newElement.textContent.replace('Suggested: ', '').trim();

                    if (newFont && originalFont !== newFont) {
                        changes.push({ originalFont, newFont });
                    }
                }
            });
            if (changes.length === 0) {
                return;
            }
            // Apply all changes
            changes.forEach(({ originalFont, newFont }, index) => {
                if (typeof window.generateGlobalFontChange === 'function') {
                    // Parse the font strings to extract individual properties
                    // Format: "FontFamily fontSize/lineHeight/fontWeight"
                    const originalParts = originalFont.split(' ');
                    const newParts = newFont.split(' ');

                    // Extract font family (everything before the size)
                    const originalFontFamily = originalParts.slice(0, -1).join(' ');
                    const newFontFamily = newParts.slice(0, -1).join(' ');

                    // Extract size/lineHeight/weight from the last part
                    const originalSizeLineWeight = originalParts[originalParts.length - 1].split('/');
                    const newSizeLineWeight = newParts[newParts.length - 1].split('/');

                    const originalFontSize = originalSizeLineWeight[0];
                    const originalLineHeight = originalSizeLineWeight[1];
                    const originalFontWeight = originalSizeLineWeight[2];

                    const newFontSize = newSizeLineWeight[0];
                    const newLineHeight = newSizeLineWeight[1];
                    const newFontWeight = newSizeLineWeight[2];

                    window.generateGlobalFontChange(
                        originalFontFamily, originalFontSize, originalLineHeight, originalFontWeight,
                        newFontFamily, newFontSize, newLineHeight, newFontWeight, 'all'
                    );
                }
            });
            if (typeof window.generateInspectaFullCss === 'function') {
                window.generateInspectaFullCss();
            }
            if (typeof window.generateCssChangesCounter === 'function') {
                window.generateCssChangesCounter();
            }
            // Use the same MutationObserver logic as the single popup
            if (typeof clearAndRefreshOverview === 'function') {
                clearAndRefreshOverview();
                const overviewPanel = shadow.querySelector('#pnl-overview');
                if (overviewPanel) {
                    const observer = new MutationObserver((mutations) => {
                        const thumbnails = overviewPanel.querySelectorAll('.in-thumbnail');
                        if (thumbnails.length > 0) {
                            observer.disconnect();
                            setTimeout(() => {
                                if (typeof window.updateFontMismatchUI === 'function') {
                                    window.updateFontMismatchUI();
                                }
                            }, 50);
                        }
                    });
                    observer.observe(overviewPanel, { childList: true, subtree: true });
                    setTimeout(() => {
                        observer.disconnect();
                        if (typeof window.updateFontMismatchUI === 'function') {
                            window.updateFontMismatchUI();
                        }
                    }, 500);
                } else {
                    setTimeout(() => {
                        if (typeof window.updateFontMismatchUI === 'function') {
                            window.updateFontMismatchUI();
                        }
                    }, 100);
                }
            } else if (typeof window.updateFontMismatchUI === 'function') {
                window.updateFontMismatchUI();
            }
            // Close the popup
            if (popup && popup.parentNode) {
                popup.parentNode.removeChild(popup);
            }
        };
    }
}

// Function to update the bulk color suggestions button
function updateBulkColorButton() {
    if (typeof shadow !== 'undefined') {
        const colorsHeader = shadow.getElementById('pnl_colors_header');
        let btnBulk = shadow.getElementById('btn_bulk_color_suggestions');

        // Get Figma colors
        let figmaColors = Array.isArray(window.inspectaFigmaColors) ? window.inspectaFigmaColors : [];

        // Check for mismatched colors (red dots) - try multiple selectors
        const pageColorsThumbnails1 = shadow.querySelectorAll('#colors-pallet-page-colors .in-thumbnail');
        const pageColorsThumbnails2 = shadow.querySelectorAll('#pnl-overview .in-thumbnail');
        const pageColorsThumbnails3 = shadow.querySelectorAll('.in-thumbnail');

        // Use the selector that finds the most thumbnails
        const pageColorsThumbnails = pageColorsThumbnails2.length > 0 ? pageColorsThumbnails2 :
            pageColorsThumbnails1.length > 0 ? pageColorsThumbnails1 :
                pageColorsThumbnails3;

        let hasValidSuggestions = false;

        // Check if there are any mismatched colors with valid suggestions
        pageColorsThumbnails.forEach((thumbnail, index) => {
            const redDot = thumbnail.querySelector('.red-dot');
            if (redDot) {
                const label = thumbnail.querySelector('.in-thumb-label');
                if (label) {
                    const color = label.innerText.trim();

                    // Check if this color has a valid suggestion
                    if (figmaColors.length > 0 && typeof findClosestColor === 'function') {
                        const suggestedColor = findClosestColor(color, figmaColors);
                        if (suggestedColor && suggestedColor.toUpperCase() !== color.toUpperCase()) {
                            hasValidSuggestions = true;
                        }
                    }
                }
            }
        });

        if (colorsHeader) {
            if (!btnBulk && hasValidSuggestions) {
                btnBulk = document.createElement('button');
                btnBulk.id = 'btn_bulk_color_suggestions';
                btnBulk.textContent = 'Auto fix colors';
                btnBulk.className = 'btn-inspecta-primary-small';
                btnBulk.onclick = function (e) {
                    e.stopPropagation();
                    showBulkColorSuggestionsPopup();
                };

                // Find the chevron icon and insert the button before it
                const chevron = colorsHeader.querySelector('.expand');
                if (chevron) {
                    colorsHeader.insertBefore(btnBulk, chevron);
                } else {
                    colorsHeader.appendChild(btnBulk);
                }
            } else if (btnBulk && !hasValidSuggestions) {
                btnBulk.remove();
            }
        }
    }
}

// Make the function globally available
window.updateBulkColorButton = updateBulkColorButton;

// Function to update the bulk font suggestions button
function updateBulkFontButton() {
    if (typeof shadow !== 'undefined') {
        const fontsHeader = shadow.getElementById('pnl_fonts_header');
        let btnBulkFont = shadow.getElementById('btn_bulk_font_suggestions');

        // Get Figma fonts
        let figmaFonts = Array.isArray(window.inspectaFigmaFonts) ? window.inspectaFigmaFonts : [];

        // Check for mismatched fonts (red dots) - try multiple selectors
        const fontThumbnails1 = shadow.querySelectorAll('#pnl_fonts_groups .in-thumb-font');
        const fontThumbnails2 = shadow.querySelectorAll('#pnl-overview .in-thumb-font');
        const fontThumbnails3 = shadow.querySelectorAll('.in-thumb-font');

        // Use the selector that finds the most thumbnails
        const fontThumbnails = fontThumbnails2.length > 0 ? fontThumbnails2 :
            fontThumbnails1.length > 0 ? fontThumbnails1 :
                fontThumbnails3;

        let hasValidSuggestions = false;

        // Check if there are any mismatched fonts with valid suggestions
        fontThumbnails.forEach((thumbnail, index) => {
            const redDot = thumbnail.querySelector('.red-dot');
            if (redDot) {
                // Extract font information from the correct elements
                const fontSize = thumbnail.querySelector('#in_overview_font_size')?.innerText.trim() || '';
                const lineHeight = thumbnail.querySelector('#in_overview_line-height')?.innerText.trim() || '';
                const fontWeight = thumbnail.querySelector('#in_overview_font_weight')?.innerText.trim() || '';

                // Get font family from parent font group
                const fontGroup = thumbnail.closest('.font-group');
                const groupTitle = fontGroup ? fontGroup.querySelector('.group-title') : null;
                const fontFamily = groupTitle ? groupTitle.innerText.trim() : '';

                if (fontFamily && fontSize && lineHeight && fontWeight) {
                    // Use the same font suggestion logic as the individual popup
                    let suggestedFont = null;

                    if (figmaFonts.length > 0) {
                        // Helper to parse Figma font string (e.g., 'Plus Jakarta Sans: 14px/ 21px/ 400')
                        function parseFigmaFontString(str) {
                            const [familyPart, rest] = str.split(':');
                            if (!rest) return { family: familyPart.trim() };
                            const [size, lineHeight, weight] = rest.split('/').map(s => s.trim());
                            return {
                                family: familyPart.trim(),
                                size: size,
                                lineHeight: lineHeight,
                                weight: weight
                            };
                        }

                        // Normalize helpers
                        function norm(val) {
                            if (val === undefined || val === null) return null;
                            if (typeof val === 'string' && val.endsWith('px')) return parseFloat(val);
                            if (typeof val === 'string' && val !== 'normal' && val !== 'auto') return parseFloat(val);
                            return val;
                        }
                        function normWeight(val) {
                            return parseInt(val) || 400;
                        }

                        // Robust font family normalization
                        function normalizeFontFamily(f) {
                            return f
                                .split(',')[0]
                                .replace(/['"]/g, '')
                                .replace(/\s+/g, ' ')
                                .trim()
                                .toLowerCase();
                        }

                        // Parse all Figma fonts
                        const parsedFigmaFonts = figmaFonts.map(parseFigmaFontString);
                        const currentFont = {
                            family: fontFamily.trim(),
                            size: norm(fontSize),
                            lineHeight: norm(lineHeight),
                            weight: normWeight(fontWeight)
                        };

                        // 1. Filter by same family (robust normalization)
                        let sameFamilyFonts = parsedFigmaFonts.filter(f => normalizeFontFamily(f.family) === normalizeFontFamily(currentFont.family));
                        let candidates = sameFamilyFonts.length > 0 ? sameFamilyFonts : parsedFigmaFonts;

                        // 2. Find closest by size, then weight, then line height
                        let bestMatch = null;
                        let bestScore = Infinity;
                        candidates.forEach(f => {
                            let score = 0;
                            // Only penalize family if not matching
                            if (f.family.toLowerCase() !== currentFont.family.toLowerCase()) score += 10000;
                            // Size difference (high priority)
                            score += Math.abs(norm(f.size) - currentFont.size) * 100;
                            // Weight difference
                            score += Math.abs(normWeight(f.weight) - currentFont.weight) * 10;
                            // Line height difference
                            if (f.lineHeight && currentFont.lineHeight && f.lineHeight !== 'normal' && currentFont.lineHeight !== 'normal') {
                                score += Math.abs(norm(f.lineHeight) - currentFont.lineHeight);
                            }
                            if (score < bestScore) {
                                bestScore = score;
                                bestMatch = f;
                            }
                        });

                        // Add 20% size difference threshold
                        if (bestMatch && currentFont.size && norm(bestMatch.size)) {
                            const percentDiff = Math.abs(norm(bestMatch.size) - currentFont.size) / currentFont.size;
                            if (percentDiff <= 0.2) {
                                suggestedFont = bestMatch;
                            }
                        }
                    }

                    // Check if the suggested font is different from the current font
                    if (suggestedFont) {
                        const isSameCombo = (
                            normalizeFontFamily(suggestedFont.family) === normalizeFontFamily(fontFamily) &&
                            norm(suggestedFont.size) === norm(fontSize) &&
                            norm(suggestedFont.lineHeight) === norm(lineHeight) &&
                            normWeight(suggestedFont.weight) === normWeight(fontWeight)
                        );

                        if (!isSameCombo) {
                            hasValidSuggestions = true;
                        }
                    }
                }
            }
        });

        if (fontsHeader) {
            if (!btnBulkFont && hasValidSuggestions) {
                btnBulkFont = document.createElement('button');
                btnBulkFont.id = 'btn_bulk_font_suggestions';
                btnBulkFont.textContent = 'Auto fix fonts';
                btnBulkFont.className = 'btn-inspecta-primary-small';
                btnBulkFont.onclick = function (e) {
                    e.stopPropagation();
                    showBulkFontSuggestionsPopup();
                };

                // Find the chevron icon and insert the button before it
                const chevron = fontsHeader.querySelector('.expand');
                if (chevron) {
                    fontsHeader.insertBefore(btnBulkFont, chevron);
                } else {
                    fontsHeader.appendChild(btnBulkFont);
                }
            } else if (btnBulkFont && !hasValidSuggestions) {
                btnBulkFont.remove();
            }
        }
    }
}

// Make the function globally available
window.updateBulkFontButton = updateBulkFontButton;