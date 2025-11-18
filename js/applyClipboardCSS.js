/**
 * Converts a CSS property name from kebab-case to camelCase.
 * @param {string} str
 * @returns {string}
 */
function toCamelCase(str) {
    return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

/**
 * Rounds long decimal values in a CSS string to 1 decimal place.
 * e.g. "26.666666px" becomes "26.7px"
 * @param {string} value The CSS value string.
 * @returns {string} The rounded CSS value string.
 */
function roundLongDecimalValues(value) {
    if (typeof value !== 'string') return value;
    // Finds numbers with more than 1 decimal place and rounds them.
    return value.replace(/(\d+\.\d{2,})/g, (match) => parseFloat(match).toFixed(1));
}

/**
 * Extracts CSS rules from Figma plugin template format.
 * @param {Object} input - The Figma plugin template object
 * @returns {string} - CSS rules as a string
 */
function extractCssRules(input) {
    return Object.entries(input)
        .filter(([key, value]) => key !== "additionalInfo" && value?.enabled && value?.value != null)
        .map(([key, value]) => `${key}: ${value.value};`)
        .join('\n');
}

/**
 * Gets the default computed style for a given HTML tag.
 * @param {string} tagName - The HTML tag name (e.g., 'div', 'span')
 * @returns {Object} - Object containing default computed styles
 */
function getDefaultComputedStyle(tagName) {
    // Create a temporary element of the specified tag type
    const temp = document.createElement(tagName);
    document.body.appendChild(temp);

    // Get computed styles
    const styles = window.getComputedStyle(temp);
    const defaults = {};

    // Copy all computed styles to our defaults object
    for (let i = 0; i < styles.length; i++) {
        const prop = styles[i];
        defaults[prop] = styles.getPropertyValue(prop);
    }

    // Clean up
    document.body.removeChild(temp);

    return defaults;
}

/**
 * Default CSS values that should be filtered out when pasting from Figma
 */
const CSS_DEFAULT_VALUES = {
    'justify-content': 'flex-start',
    'align-items': 'stretch',
    'align-self': 'auto',
    'flex-direction': 'row',
    'flex-wrap': 'nowrap',
    'flex-grow': '0',
    'flex-shrink': '1',
    'flex-basis': 'auto',
    'text-align': 'start',
    'vertical-align': 'baseline',
    'font-weight': 'normal',
    'font-style': 'normal',
    'text-decoration': 'none',
    'text-transform': 'none',
    'overflow': 'visible',
    'overflow-x': 'visible',
    'overflow-y': 'visible',
    'position': 'static',
    'display': 'block',
    'float': 'none',
    'clear': 'none',
    'visibility': 'visible',
    'opacity': '1',
    'z-index': 'auto',
    'direction': 'ltr',
    'unicode-bidi': 'normal',
    'writing-mode': 'horizontal-tb',
    'text-orientation': 'mixed',
    'text-combine-upright': 'none',
    'text-underline-position': 'auto',
    'text-decoration-skip': 'objects',
    'text-decoration-skip-ink': 'auto',
    'text-emphasis': 'none',
    'text-emphasis-position': 'over right',
    'text-emphasis-style': 'filled',
    'text-emphasis-color': 'currentcolor',
    'text-shadow': 'none',
    'white-space': 'normal',
    'word-spacing': 'normal',
    'letter-spacing': 'normal',
    'word-break': 'normal',
    'word-wrap': 'normal',
    'overflow-wrap': 'normal',
    'hyphens': 'manual',
    'text-align-last': 'auto',
    'text-justify': 'auto',
    'text-indent': '0',
    'line-height': 'normal',
    'list-style': 'disc outside none',
    'list-style-type': 'disc',
    'list-style-position': 'outside',
    'list-style-image': 'none',
    'outline': 'none',
    'outline-width': 'medium',
    'outline-style': 'none',
    'outline-color': 'invert',
    'outline-offset': '0',
    'border-collapse': 'separate',
    'border-spacing': '0',
    'empty-cells': 'show',
    'caption-side': 'top',
    'table-layout': 'auto',
    'vertical-align': 'baseline',
    'text-anchor': 'start',
    'dominant-baseline': 'auto',
    'alignment-baseline': 'baseline',
    'baseline-shift': 'baseline',
    'glyph-orientation-vertical': 'auto',
    'glyph-orientation-horizontal': '0deg',
    'kerning': 'auto',
    'color-interpolation': 'sRGB',
    'color-interpolation-filters': 'linearRGB',
    'color-rendering': 'auto',
    'image-rendering': 'auto',
    'shape-rendering': 'auto',
    'text-rendering': 'auto',
    'buffered-rendering': 'auto',
    'clip-rule': 'nonzero',
    'fill-rule': 'nonzero',
    'stroke-linecap': 'butt',
    'stroke-linejoin': 'miter',
    'stroke-miterlimit': '4',
    'stroke-dasharray': 'none',
    'stroke-dashoffset': '0',
    'marker': 'none',
    'marker-start': 'none',
    'marker-mid': 'none',
    'marker-end': 'none',
    'paint-order': 'normal',
    'vector-effect': 'none',
    'mask': 'none',
    'clip-path': 'none',
    'clip': 'auto',
    'filter': 'none',
    'backdrop-filter': 'none',
    'mix-blend-mode': 'normal',
    'isolation': 'auto',
    'object-fit': 'auto',
    'object-position': '50% 50%',
    'object-view-box': 'none',
    'resize': 'none',
    'cursor': 'auto',
    'caret-color': 'auto',
    'nav-up': 'auto',
    'nav-right': 'auto',
    'nav-down': 'auto',
    'nav-left': 'auto',
    'scroll-behavior': 'auto',
    'scroll-margin': '0',
    'scroll-margin-top': '0',
    'scroll-margin-right': '0',
    'scroll-margin-bottom': '0',
    'scroll-margin-left': '0',
    'scroll-padding': 'auto',
    'scroll-padding-top': 'auto',
    'scroll-padding-right': 'auto',
    'scroll-padding-bottom': 'auto',
    'scroll-padding-left': 'auto',
    'scroll-snap-type': 'none',
    'scroll-snap-align': 'none',
    'scroll-snap-stop': 'normal',
    'scrollbar-gutter': 'auto',
    'scrollbar-width': 'auto',
    'scrollbar-color': 'auto',
    'overscroll-behavior': 'auto',
    'overscroll-behavior-x': 'auto',
    'overscroll-behavior-y': 'auto',
    'overscroll-behavior-block': 'auto',
    'overscroll-behavior-inline': 'auto',
    'contain': 'none',
    'contain-intrinsic-size': 'none',
    'contain-intrinsic-width': 'none',
    'contain-intrinsic-height': 'none',
    'contain-intrinsic-block-size': 'none',
    'contain-intrinsic-inline-size': 'none',
    'content-visibility': 'visible',
    'will-change': 'auto',
    'transform': 'none',
    'transform-origin': '50% 50% 0',
    'transform-style': 'flat',
    'perspective': 'none',
    'perspective-origin': '50% 50%',
    'backface-visibility': 'visible',
    'transition': 'all 0s ease 0s',
    'transition-property': 'all',
    'transition-duration': '0s',
    'transition-timing-function': 'ease',
    'transition-delay': '0s',
    'animation': 'none 0s ease 0s 1 normal none running',
    'animation-name': 'none',
    'animation-duration': '0s',
    'animation-timing-function': 'ease',
    'animation-delay': '0s',
    'animation-iteration-count': '1',
    'animation-direction': 'normal',
    'animation-fill-mode': 'none',
    'animation-play-state': 'running',
    'appearance': 'none',
    'accent-color': 'auto',
    'caret-shape': 'auto',
    'caret': 'auto',
    'user-select': 'auto',
    'user-modify': 'read-only',
    'user-focus': 'none',
    'user-input': 'auto',
    'user-drag': 'auto',
    'user-zoom': 'auto',
    'zoom': '1',
    'pointer-events': 'auto',
    'touch-action': 'auto',
    'touch-callout': 'default',
    'touch-select': 'text',
    'user-callout': 'none',
    'user-drag': 'auto',
    'user-select': 'auto',
    'user-zoom': 'auto',
    'zoom': '1',
    'speak': 'normal',
    'speak-as': 'normal',
    'speak-header': 'once',
    'speak-numeral': 'continuous',
    'speak-punctuation': 'none',
    'speak-rate': 'medium',
    'speak-stress': 'moderate',
    'speak-volume': 'medium',
    'voice-balance': 'center',
    'voice-duration': 'auto',
    'voice-family': 'inherit',
    'voice-pitch': 'medium',
    'voice-pitch-range': '50',
    'voice-rate': 'medium',
    'voice-stress': 'moderate',
    'voice-volume': 'medium',
    'volume': 'medium',
    'elevation': 'level',
    'azimuth': 'center',
    'cue': 'none',
    'cue-after': 'none',
    'cue-before': 'none',
    'pause': 'none',
    'pause-after': 'none',
    'pause-before': 'none',
    'play-during': 'auto',
    'richness': '50',
    'speak': 'normal',
    'speak-as': 'normal',
    'speak-header': 'once',
    'speak-numeral': 'continuous',
    'speak-punctuation': 'none',
    'speak-rate': 'medium',
    'speak-stress': 'moderate',
    'speak-volume': 'medium',
    'voice-balance': 'center',
    'voice-duration': 'auto',
    'voice-family': 'inherit',
    'voice-pitch': 'medium',
    'voice-pitch-range': '50',
    'voice-rate': 'medium',
    'voice-stress': 'moderate',
    'voice-volume': 'medium',
    'volume': 'medium',
    'elevation': 'level',
    'azimuth': 'center',
    'cue': 'none',
    'cue-after': 'none',
    'cue-before': 'none',
    'pause': 'none',
    'pause-after': 'none',
    'pause-before': 'none',
    'play-during': 'auto',
    'richness': '50'
};

/**
 * CSS properties that can have multiple default values depending on context
 * These are computed defaults that Figma might export even when not explicitly set
 */
const CSS_COMPUTED_DEFAULTS = {
    'align-self': ['auto', 'flex-start', 'stretch'],
    'justify-content': ['flex-start', 'normal'],
    'align-items': ['stretch', 'normal'],
    'flex-direction': ['row', 'normal'],
    'flex-wrap': ['nowrap', 'normal'],
    'position': ['static', 'relative'],
    'display': ['block', 'inline', 'inline-block']
};

/**
 * Checks if a CSS property value is a default value that should be filtered out
 * @param {string} prop - The CSS property name
 * @param {string} value - The CSS property value
 * @returns {boolean} - True if the value is a default that should be filtered
 */
function isDefaultValue(prop, value) {
    // Convert camelCase to kebab-case for lookup
    const kebabProp = prop.replace(/[A-Z]/g, m => '-' + m.toLowerCase());

    // Check regular default values
    const defaultValue = CSS_DEFAULT_VALUES[kebabProp];
    if (defaultValue) {
        const normalizedValue = value.toLowerCase().trim();
        const normalizedDefault = defaultValue.toLowerCase().trim();
        if (normalizedValue === normalizedDefault) {
            return true;
        }
    }

    // Check computed default values (multiple possible defaults)
    const computedDefaults = CSS_COMPUTED_DEFAULTS[kebabProp];
    if (computedDefaults) {
        const normalizedValue = value.toLowerCase().trim();
        return computedDefaults.some(defaultVal =>
            normalizedValue === defaultVal.toLowerCase().trim()
        );
    }

    return false;
}

/**
 * Parses a CSS string into an object with camelCase keys.
 * Only uses 'background' for background color, ignores 'background-color'.
 * Filters out default CSS values that weren't explicitly set in Figma.
 * @param {string} css
 * @returns {Object}
 */
function parseCssStringToStyles(css) {
    return css
        .split(';')
        .map(rule => rule.trim())
        .filter(Boolean)
        .reduce((acc, rule) => {
            const [prop, value] = rule.split(':').map(s => s.trim());
            if (!prop || !value) return acc;

            // Filter out default values
            if (isDefaultValue(prop, value)) {
                return acc;
            }

            const lowerProp = prop.toLowerCase();
            if (lowerProp.startsWith('margin')) return acc;
            if (lowerProp === 'background-color' || lowerProp === 'background') {
                acc['background'] = value;
                return acc;
            }
            // Handle background-image for gradients
            if (lowerProp === 'background-image') {
                acc['background'] = value;
                return acc;
            }
            acc[toCamelCase(prop)] = value;
            return acc;
        }, {});
}

/**
 * Checks if a CSS value is a gradient.
 * @param {string} value - The CSS value to check
 * @returns {boolean} - True if the value is a gradient
 */
function isGradient(value) {
    if (typeof value !== 'string') return false;
    return value.includes('linear-gradient') ||
        value.includes('radial-gradient') ||
        value.includes('conic-gradient');
}

/**
 * Extracts the gradient type from a gradient CSS value.
 * @param {string} value - The gradient CSS value
 * @returns {string} - The gradient type (e.g., 'linear-gradient', 'radial-gradient')
 */
function getGradientType(value) {
    if (value.includes('linear-gradient')) {
        return 'linear-gradient';
    } else if (value.includes('radial-gradient')) {
        return 'radial-gradient';
    } else if (value.includes('conic-gradient')) {
        return 'conic-gradient';
    }
    return value; // Fallback to original value
}

/**
 * Helper for special reset logic
 * @param {string} cssProp - The CSS property
 * @param {string} computedValue - The computed value of the property
 * @param {string} defaultValue - The default value of the property
 * @param {CSSStyleDeclaration} computedStyles - The computed styles object
 * @returns {string|null} - The reset value if the property needs to be reset, null otherwise
 */
function needsSpecialReset(cssProp, computedValue, defaultValue, computedStyles) {
    const specialProps = [
        'align-items', 'justify-content', 'align-self', 'text-align', 'vertical-align',
        'font-weight', 'font-style', 'font-family', 'display', 'position', 'overflow',
        'background', 'background-color', 'background-image', 'color'
    ];
    if (!specialProps.includes(cssProp)) return null;

    // Special case for align-items: only reset if display is flex or grid and value is not default
    if (cssProp === 'align-items') {
        const display = computedStyles.getPropertyValue('display');
        if (display === 'flex' || display === 'inline-flex') {
            // For flex, default is 'stretch'
            if (
                computedValue &&
                computedValue !== 'unset' &&
                computedValue !== 'initial' &&
                computedValue !== 'stretch' // treat 'stretch' as default for flex
            ) {
                return 'stretch';
            }
            return null;
        }
        if (display === 'grid' || display === 'inline-grid') {
            // For grid, default is 'stretch' as well
            if (
                computedValue &&
                computedValue !== 'unset' &&
                computedValue !== 'initial' &&
                computedValue !== 'stretch'
            ) {
                return 'stretch';
            }
            return null;
        }
        // Not flex/grid: never reset
        return null;
    }

    if (
        computedValue &&
        computedValue !== 'unset' &&
        computedValue !== 'initial' &&
        defaultValue &&
        computedValue !== defaultValue
    ) {
        return defaultValue;
    }
    return null;
}

function isValidCss(cssString) {
    // Basic check: at least one property: value; pair
    return /[a-zA-Z\-]+\s*:\s*[^;]+;/.test(cssString);
}

/**
 * Merges border sides into a single border property if all sides are present and equal.
 * @param {Object} styles - The parsed Figma styles object
 * @returns {Object} - The normalized styles object
 */
function mergeBorderSides(styles) {
    const top = styles.borderTop?.value;
    const right = styles.borderRight?.value;
    const bottom = styles.borderBottom?.value;
    const left = styles.borderLeft?.value;
    // Only merge if all four sides are present and equal
    if (top && right && bottom && left && top === right && top === bottom && top === left) {
        styles.border = { value: top, enabled: true };
        delete styles.borderTop;
        delete styles.borderRight;
        delete styles.borderBottom;
        delete styles.borderLeft;
    }
    return styles;
}

// Helper to normalize color values to hex for comparison
function normalizeColorValue(value) {
    if (!value) return value;

    // Check if it's a gradient (linear-gradient, radial-gradient, etc.)
    if (value.includes('gradient(')) {
        return value.toLowerCase().trim();
    }

    // If value is already hex
    if (/^#([0-9a-f]{3,8})$/i.test(value)) return value.toLowerCase();
    // If value is rgb/rgba
    if (value.startsWith('rgb')) {
        // Convert to hex
        const rgb = value.match(/\d+/g);
        if (rgb) {
            let hex = '#';
            for (let i = 0; i < 3; i++) {
                hex += (+rgb[i]).toString(16).padStart(2, '0');
            }
            if (rgb[3]) {
                hex += Math.round(parseFloat(rgb[3]) * 255).toString(16).padStart(2, '0');
            }
            return hex.toLowerCase();
        }
    }
    // Named colors or other formats: let browser resolve
    const temp = document.createElement('div');
    temp.style.color = value;
    document.body.appendChild(temp);
    const computed = getComputedStyle(temp).color;
    document.body.removeChild(temp);
    if (computed.startsWith('rgb')) {
        const rgb = computed.match(/\d+/g);
        if (rgb) {
            let hex = '#';
            for (let i = 0; i < 3; i++) {
                hex += (+rgb[i]).toString(16).padStart(2, '0');
            }
            return hex.toLowerCase();
        }
    }
    return value;
}

// Helper to check if a value is a simple color (not a gradient or image)
function isSimpleColor(value) {
    if (!value) return false;
    return !value.includes('gradient(') && !value.includes('url(');
}

/**
 * Reads CSS from clipboard, parses, applies, resets defaults, and logs changes.
 * @param {HTMLElement} element - The DOM element to apply styles to.
 * @returns {Promise<Object>} - Resolves to the change log.
 */
async function applyClipboardCSS(element) {
    if (!element || typeof element.style !== 'object') return { applied: {}, reset: {} };

    // Get shadow root
    const shadow = document.querySelector('#inspecta_app_container')?.shadowRoot;
    if (!shadow) {
        console.error('Shadow root not found');
        return { applied: {}, reset: {} };
    }

    let cssString = '';
    try {
        const clipboardText = await navigator.clipboard.readText();
        let isFigmaJson = false;
        let colorArray = null;
        // Try to parse as JSON (Figma plugin format)
        try {
            const jsonData = JSON.parse(clipboardText);
            if (Array.isArray(jsonData.colors)) {
                colorArray = jsonData.colors;
            }
            // Merge border sides if possible (legacy logic)
            const mergedJsonData = mergeBorderSides(jsonData);
            cssString = extractCssRules(mergedJsonData);
            isFigmaJson = true;
        } catch {
            // If not valid JSON, use as plain CSS
            cssString = clipboardText;
        }
        // If colorArray is set, handle bulk color change logic here and return
        if (colorArray) {
            colorArray.forEach(colorHex => {
                // Only use the string color value for CSS logic
                if (typeof colorHex === 'string') {
                    // Example: applyCssRule(selector, property, colorHex);
                    // Example: generateGlobalColorChange(oldColor, colorHex, property);
                    // Insert your color application logic here
                }
            });
            // Optionally show a success message or update UI
            return { applied: {}, reset: {} };
        }
        if (!cssString || cssString.trim() === '' || (!isFigmaJson && !isValidCss(cssString))) {
            if (typeof window.showToast === 'function') {
                window.showToast('Clipboard is empty or has invalid data', 2000);
            }
            return { applied: {}, reset: {} };
        }
    } catch (err) {
        console.error('Failed to read clipboard:', err);
        return { applied: {}, reset: {} };
    }

    // Parse CSS string to figmaStyles object
    const figmaStyles = parseCssStringToStyles(cssString);

    // Round long decimal values from Figma
    for (const prop in figmaStyles) {
        if (typeof figmaStyles[prop] === 'string') {
            figmaStyles[prop] = roundLongDecimalValues(figmaStyles[prop]);
        }
    }

    // If no valid styles, show invalid data toast
    if (!figmaStyles || Object.keys(figmaStyles).length === 0) {
        if (typeof window.showToast === 'function') {
            window.showToast('Clipboard is empty or has invalid data', 2000);
        }
        return { applied: {}, reset: {} };
    }

    // Get computed styles for the element
    const computed = window.getComputedStyle(element);
    const tagName = element.tagName.toLowerCase();
    const defaultComputed = getDefaultComputedStyle(tagName);

    // Properties to check for reset
    const propertiesToCheck = [
        'border', 'box-shadow', 'background', 'text-decoration', 'padding', 'font-weight',
        'margin', 'color', 'font-family', 'font-size', 'font-style', 'font-variant', 'text-transform',
        'border-radius', 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius',
        'text-align', 'line-height', 'align-items', 'gap', 'align-self', 'flex-direction', 'display'
    ];

    // Track which properties are in the pasted CSS (figmaStyles)
    const pastedCssProps = new Set(Object.keys(figmaStyles).map(prop => prop.replace(/[A-Z]/g, m => '-' + m.toLowerCase())));

    // Process each property in the pasted CSS
    const applied = {};
    const reset = {};
    const similar = {}; // New object to track similar styles

    for (const [prop, valueObj] of Object.entries(figmaStyles)) {
        // If valueObj is an object with a .value property, use it
        const value = typeof valueObj === 'object' && valueObj.value !== undefined ? valueObj.value : valueObj;
        const cssProp = prop.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
        const cleanValue = value.replace(/\s*!important\s*/i, '');
        const computedValue = computed.getPropertyValue(cssProp);

        // Special handling for background/background-color
        if ((cssProp === 'background' || cssProp === 'background-color')) {
            // Check if the value contains a gradient
            if (cleanValue.includes('gradient(')) {
                // For gradients, compare directly without normalization
                const computedBg = computed.getPropertyValue('background');
                const computedBgImage = computed.getPropertyValue('background-image');
                if (cleanValue === computedBg || cleanValue === computedBgImage) {
                    similar[cssProp] = cleanValue;
                    continue;
                }
            } else {
                // For colors, use the existing color normalization logic
                const computedBg = computed.getPropertyValue('background');
                const computedBgColor = computed.getPropertyValue('background-color');
                const normClipboard = normalizeColorValue(cleanValue);
                const normComputedBg = normalizeColorValue(computedBg);
                const normComputedBgColor = normalizeColorValue(computedBgColor);
                if (normClipboard === normComputedBg || normClipboard === normComputedBgColor) {
                    similar[cssProp] = cleanValue;
                    continue;
                }
            }
        }
        // Special handling for color
        if (cssProp === 'color') {
            const normClipboard = normalizeColorValue(cleanValue);
            const normComputed = normalizeColorValue(computedValue);
            if (normClipboard === normComputed) {
                similar[cssProp] = cleanValue;
                continue;
            }
        }
        // Check if the style is similar to current computed style (default for other properties)
        if (computedValue === cleanValue) {
            similar[cssProp] = cleanValue;
            continue; // Skip adding to applied styles
        }

        // Skip individual border-radius properties if we have the shorthand
        if (cssProp === 'border-radius') {
            element.style.setProperty(cssProp, cleanValue);
            applied[cssProp] = cleanValue;
        } else if (cssProp.startsWith('border-') && cssProp.endsWith('-radius')) {
            // Skip individual border-radius properties
            continue;
        } else {
            element.style.setProperty(cssProp, cleanValue);
            applied[cssProp] = cleanValue;
        }
    }

    // Check for properties that need to be reset
    for (const prop of propertiesToCheck) {
        const cssProp = prop.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
        if (pastedCssProps.has(cssProp)) continue;
        if (cssProp === 'text-decoration' || cssProp === 'display') continue;
        if (cssProp === 'border-radius' || cssProp.startsWith('border-') && cssProp.endsWith('-radius')) continue;

        // --- Special handling for shorthands ---
        // 1. Border
        if (cssProp === 'border') {
            // Only reset border if neither border nor any border sides are present in pastedCssProps
            const borderSides = ['border-top', 'border-right', 'border-bottom', 'border-left'];
            const hasAnyBorderSide = borderSides.some(side => pastedCssProps.has(side));
            if (pastedCssProps.has('border') || hasAnyBorderSide) continue;
            const borderStyles = [
                computed.getPropertyValue('border-top-style'),
                computed.getPropertyValue('border-right-style'),
                computed.getPropertyValue('border-bottom-style'),
                computed.getPropertyValue('border-left-style')
            ];
            const borderWidths = [
                computed.getPropertyValue('border-top-width'),
                computed.getPropertyValue('border-right-width'),
                computed.getPropertyValue('border-bottom-width'),
                computed.getPropertyValue('border-left-width')
            ];
            const borderIsDefault = borderStyles.every(s => s === 'none') && borderWidths.every(w => w === '0px');
            if (!borderIsDefault) {
                reset['border'] = 'none';
                // Apply reset immediately for preview
                element.style.setProperty('border', 'none');
            }
            continue;
        }
        // 2. Background
        if (cssProp === 'background') {
            const bgProps = ['background-color', 'background-image', 'background-position', 'background-size', 'background-repeat', 'background-attachment', 'background-clip', 'background-origin'];
            let needsReset = false;
            for (const bgProp of bgProps) {
                if (computed.getPropertyValue(bgProp) !== defaultComputed[bgProp]) {
                    needsReset = true;
                    break;
                }
            }
            if (needsReset) {
                reset['background'] = 'none';
                // Apply reset immediately for preview
                element.style.setProperty('background', 'none');
            }
            continue;
        }
        // 3. Font
        if (cssProp === 'font') {
            const fontProps = ['font-style', 'font-variant', 'font-weight', 'font-size', 'line-height', 'font-family'];
            let needsReset = false;
            for (const fontProp of fontProps) {
                if (computed.getPropertyValue(fontProp) !== defaultComputed[fontProp]) {
                    needsReset = true;
                    break;
                }
            }
            if (needsReset) {
                reset['font'] = 'initial';
                // Apply reset immediately for preview
                element.style.setProperty('font', 'initial');
            }
            continue;
        }
        // 4. Outline
        if (cssProp === 'outline') {
            const outlineProps = ['outline-color', 'outline-style', 'outline-width'];
            let needsReset = false;
            for (const outlineProp of outlineProps) {
                if (computed.getPropertyValue(outlineProp) !== defaultComputed[outlineProp]) {
                    needsReset = true;
                    break;
                }
            }
            if (needsReset) {
                reset['outline'] = 'none';
                // Apply reset immediately for preview
                element.style.setProperty('outline', 'none');
            }
            continue;
        }
        // 5. Margin
        if (cssProp === 'margin') {
            continue;
        }
        // 6. Padding
        if (cssProp === 'padding') {
            const paddingProps = ['padding-top', 'padding-right', 'padding-bottom', 'padding-left'];
            let needsReset = false;
            for (const paddingProp of paddingProps) {
                if (computed.getPropertyValue(paddingProp) !== defaultComputed[paddingProp]) {
                    needsReset = true;
                    break;
                }
            }
            if (needsReset) {
                reset['padding'] = '0';
                // Apply reset immediately for preview
                element.style.setProperty('padding', '0');
            }
            continue;
        }
        // 7. Text-decoration
        if (cssProp === 'text-decoration') {
            const tdProps = ['text-decoration-line', 'text-decoration-style', 'text-decoration-color'];
            let needsReset = false;
            for (const tdProp of tdProps) {
                if (computed.getPropertyValue(tdProp) !== defaultComputed[tdProp]) {
                    needsReset = true;
                    break;
                }
            }
            if (needsReset) {
                reset['text-decoration'] = 'none';
                // Apply reset immediately for preview
                element.style.setProperty('text-decoration', 'none');
            }
            continue;
        }
        // --- End special handling ---

        // For non-shorthand properties, check if they need to be reset
        const computedValue = computed.getPropertyValue(cssProp);
        const defaultValue = defaultComputed[cssProp];
        // Use special reset logic for certain properties
        const specialReset = needsSpecialReset(cssProp, computedValue, defaultValue, computed);
        if (specialReset !== null && specialReset !== computedValue) {
            reset[cssProp] = specialReset;
            element.style.setProperty(cssProp, specialReset);
            continue;
        }
        if (computedValue && defaultValue && computedValue !== defaultValue) {
            reset[cssProp] = defaultValue;
            // Apply reset immediately for preview
            element.style.setProperty(cssProp, defaultValue);
        }
    }

    // Create popup container
    const popup = document.createElement('div');
    popup.className = 'popup';

    // Create header
    const header = document.createElement('div');
    header.className = 'popup-header';
    const title = document.createElement('span');
    title.className = 'popup-title';
    title.textContent = 'Pasted Styles';
    header.appendChild(title);

    // Create toggle container
    const toggleContainer = document.createElement('div');
    toggleContainer.className = 'popup-toggle-container';

    // Create toggle switch
    const toggleSwitch = document.createElement('div');
    toggleSwitch.className = 'custom-switch';

    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.checked = true; // Default to showing styles
    toggleInput.id = 'paste-popup-toggle';

    const toggleSlider = document.createElement('span');
    toggleSlider.className = 'in_slider';

    const toggleLabel = document.createElement('span');
    toggleLabel.className = 'toggle-label';
    toggleLabel.textContent = 'Preview';

    toggleSwitch.appendChild(toggleInput);
    toggleSwitch.appendChild(toggleSlider);
    toggleContainer.appendChild(toggleSwitch);
    toggleContainer.appendChild(toggleLabel);

    header.appendChild(toggleContainer);

    // Create content container
    const content = document.createElement('div');
    content.className = 'paste-popup-content';
    content.setAttribute('data-simplebar', '');

    // Toggle state management
    let isPreviewEnabled = true;
    let originalElementStyles = {};

    // Store original element styles before applying any pasted styles
    Object.keys(applied).forEach(prop => {
        originalElementStyles[prop] = element.style.getPropertyValue(prop);
    });
    Object.keys(reset).forEach(prop => {
        originalElementStyles[prop] = element.style.getPropertyValue(prop);
    });

    // Function to apply all pasted styles
    function applyAllPastedStyles() {
        console.log('Applying all pasted styles');

        // Only apply styles that are currently checked
        Object.entries(applied).forEach(([prop, value]) => {
            const checkbox = content.querySelector(`input[type="checkbox"][data-prop="${prop}"]`);
            if (checkbox && checkbox.checked) {
                element.style.setProperty(prop, value);
            }
        });

        Object.entries(reset).forEach(([prop, value]) => {
            const checkbox = content.querySelector(`input[type="checkbox"][data-prop="${prop}"]`);
            if (checkbox && checkbox.checked) {
                element.style.setProperty(prop, value);
            }
        });
    }

    // Function to remove all pasted styles
    function removeAllPastedStyles() {
        console.log('Removing styles, original styles:', originalElementStyles);

        // Remove inline styles and restore original
        Object.keys(applied).forEach(prop => {
            console.log('Removing applied style:', prop, 'Original value:', originalElementStyles[prop]);
            if (originalElementStyles[prop] !== undefined && originalElementStyles[prop] !== '') {
                element.style.setProperty(prop, originalElementStyles[prop]);
            } else {
                element.style.removeProperty(prop);
            }
        });
        Object.keys(reset).forEach(prop => {
            console.log('Removing reset style:', prop, 'Original value:', originalElementStyles[prop]);
            if (originalElementStyles[prop] !== undefined && originalElementStyles[prop] !== '') {
                element.style.setProperty(prop, originalElementStyles[prop]);
            } else {
                element.style.removeProperty(prop);
            }
        });
    }

    // Prevent toggle click from closing the popup and ensure toggle works
    toggleSwitch.addEventListener('click', (e) => {
        console.log('Toggle clicked!', e.target);
        e.stopPropagation();
        e.preventDefault();

        // Simply toggle the input state
        toggleInput.checked = !toggleInput.checked;
        isPreviewEnabled = toggleInput.checked;

        console.log('Toggle state:', isPreviewEnabled);
        console.log('Applied styles:', applied);
        console.log('Reset styles:', reset);

        if (isPreviewEnabled) {
            console.log('Applying all pasted styles');
            applyAllPastedStyles();
        } else {
            console.log('Removing all pasted styles');
            removeAllPastedStyles();

            // Force remove all pasted styles from element
            Object.keys(applied).forEach(prop => {
                element.style.removeProperty(prop);
            });
            Object.keys(reset).forEach(prop => {
                element.style.removeProperty(prop);
            });
        }
    });

    // Also add click handler to the input itself
    toggleInput.addEventListener('click', (e) => {
        console.log('Toggle input clicked!');
        e.stopPropagation();
    });

    // Create accept button early so it can be referenced
    const acceptBtn = document.createElement('button');
    acceptBtn.className = 'btn-popup btn-popup-primary';
    acceptBtn.textContent = 'Apply';
    acceptBtn.disabled = true;

    // Update accept button state based on checkbox changes
    const updateAcceptButtonState = () => {
        const anyChecked = content.querySelector('input[type="checkbox"]:checked');
        acceptBtn.disabled = !anyChecked;
    };

    // Add new styles section (from 'applied')
    const newStylesTitle = document.createElement('span');
    newStylesTitle.className = 'paste-popup-section-title';
    newStylesTitle.textContent = 'New or updated';
    content.appendChild(newStylesTitle);

    const newStylesSection = document.createElement('div');
    newStylesSection.className = 'paste-popup-section';

    // Populate checkboxes for new styles
    Object.entries(applied).forEach(([prop, value]) => {
        const container = document.createElement('div');
        container.className = 'paste-popup-checkbox-container';

        // Create custom checkbox using the reusable function
        const { label, input } = createCustomCheckbox({
            checked: true,
            onChange: () => {
                if (input.checked) {
                    element.style.setProperty(prop, value);
                } else {
                    element.style.setProperty(prop, '');
                }
            },
            dataset: { prop: prop, value: value }
        });

        // Prevent click event from bubbling up and closing the popup
        label.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // --- NEW LOGIC: Display 'background-color' for solid colors ---
        let displayProp = prop;
        if (prop === 'background' && isSimpleColor(value)) {
            displayProp = 'background-color';
        }

        // --- NEW LOGIC: Display gradient type for gradients ---
        let displayValue = value;
        if (isGradient(value)) {
            displayValue = getGradientType(value);
        }

        const propName = document.createElement('span');
        propName.className = 'paste-popup-checkbox-prop';
        propName.textContent = displayProp;

        const propValue = document.createElement('span');
        propValue.className = 'paste-popup-checkbox-value';
        propValue.textContent = displayValue;

        const propContainer = document.createElement('div');
        propContainer.className = 'paste-popup-property-container';
        propContainer.appendChild(propName);
        propContainer.appendChild(propValue);

        label.appendChild(propContainer);
        container.appendChild(label);
        newStylesSection.appendChild(container);
    });

    content.appendChild(newStylesSection);

    // Add reset styles section if there are any (from 'reset')
    if (Object.keys(reset).length > 0) {
        const resetStylesTitle = document.createElement('span');
        resetStylesTitle.className = 'paste-popup-section-title';
        resetStylesTitle.textContent = 'Reset (to be removed in production) ';
        content.appendChild(resetStylesTitle);

        const resetStylesSection = document.createElement('div');
        resetStylesSection.className = 'paste-popup-section reset-styles';

        // Populate checkboxes for reset styles
        Object.entries(reset).forEach(([prop, value]) => {
            const container = document.createElement('div');
            container.className = 'paste-popup-checkbox-container';

            // Create custom checkbox using the reusable function
            const { label, input } = createCustomCheckbox({
                checked: true,
                onChange: () => {
                    if (input.checked) {
                        element.style.setProperty(prop, value);
                    } else {
                        element.style.setProperty(prop, '');
                    }
                },
                dataset: { prop: prop, value: value }
            });

            // Prevent click event from bubbling up and closing the popup
            label.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            // --- NEW LOGIC: Display gradient type for gradients ---
            let displayValue = value;
            if (isGradient(value)) {
                displayValue = getGradientType(value);
            }

            const propName = document.createElement('span');
            propName.className = 'paste-popup-checkbox-prop';
            propName.textContent = prop;

            const propValue = document.createElement('span');
            propValue.className = 'paste-popup-checkbox-value';
            propValue.textContent = displayValue;

            const propContainer = document.createElement('div');
            propContainer.className = 'paste-popup-property-container';
            propContainer.appendChild(propName);
            propContainer.appendChild(propValue);

            label.appendChild(propContainer);
            container.appendChild(label);
            resetStylesSection.appendChild(container);
        });

        content.appendChild(resetStylesSection);
    }

    // Add similar styles section if there are any (from 'similar')
    if (Object.keys(similar).length > 0) {
        const similarStylesTitle = document.createElement('span');
        similarStylesTitle.className = 'paste-popup-section-title';
        similarStylesTitle.textContent = 'Similar (unchanged)';
        content.appendChild(similarStylesTitle);

        const similarStylesSection = document.createElement('div');
        similarStylesSection.className = 'paste-popup-section similar-styles';

        // Populate similar styles (without checkboxes)
        Object.entries(similar).forEach(([prop, value]) => {
            // Use div instead of label
            const label = document.createElement('div');
            label.className = 'paste-popup-similar-label';

            // --- NEW LOGIC: Display gradient type for gradients ---
            let displayValue = value;
            if (isGradient(value)) {
                displayValue = getGradientType(value);
            }

            const propName = document.createElement('span');
            propName.className = 'paste-popup-similar-prop';
            propName.textContent = prop;

            const propValue = document.createElement('span');
            propValue.className = 'paste-popup-similar-value';
            propValue.textContent = displayValue;

            label.appendChild(propName);
            label.appendChild(propValue);
            // No wrapper div, just append label
            similarStylesSection.appendChild(label);
        });

        content.appendChild(similarStylesSection);
    }

    // Create footer with buttons
    const footer = document.createElement('div');
    footer.className = 'popup-footer';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-popup btn-popup-secondary';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = () => {
        // Remove all styles that were added
        for (const [prop, value] of Object.entries(applied)) {
            element.style.setProperty(prop, '');
        }
        for (const [prop, value] of Object.entries(reset)) {
            element.style.setProperty(prop, '');
        }
        closePopup();
    };

    footer.appendChild(cancelBtn);

    // Add change event listeners to all checkboxes
    content.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', updateAcceptButtonState);
    });

    // Initial state
    updateAcceptButtonState();

    footer.appendChild(acceptBtn);

    // Assemble popup
    popup.appendChild(header);
    popup.appendChild(content);
    popup.appendChild(footer);

    // Position popup relative to the selected element
    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    // Position popup below the element
    popup.style.top = `${rect.bottom + scrollTop + 20}px`;
    popup.style.left = `${rect.left + scrollLeft}px`;

    // Add to document
    const inspectaApp = shadow.querySelector('#inspecta_app');
    if (inspectaApp) {
        inspectaApp.appendChild(popup);
    } else {
        shadow.appendChild(popup);
    }

    // Handle click outside to close
    const closePopup = () => {
        // Remove all styles that were added (same as Cancel)
        for (const [prop, value] of Object.entries(applied)) {
            element.style.setProperty(prop, '');
        }
        for (const [prop, value] of Object.entries(reset)) {
            element.style.setProperty(prop, '');
        }
        if (popup.parentNode) {
            popup.parentNode.removeChild(popup);
        }
        document.removeEventListener('click', handleOutsideClick);
    };

    const handleOutsideClick = (e) => {
        if (!popup.contains(e.target)) {
            closePopup();
        }
    };

    document.addEventListener('click', handleOutsideClick);

    // Function to remove property from CSS changes panel
    const removePropertyFromCssChanges = (prop) => {
        const cssChangesPanel = document.querySelector('.css-changes-panel');
        if (cssChangesPanel) {
            const propertyItem = cssChangesPanel.querySelector(`[data-property="${prop}"]`);
            if (propertyItem) {
                propertyItem.remove();
            }
        }
    };

    // Initialize SimpleBar on the content container
    if (typeof SimpleBar !== 'undefined') {
        new SimpleBar(content);
    }

    // Create a promise to handle the popup interaction
    return new Promise((resolve) => {
        // Set the acceptBtn handler here!
        acceptBtn.onclick = () => {
            // Set the global target variable to the current element
            if (typeof window !== 'undefined' && window.target !== undefined) {
                window.target = element;
            }

            // Check if stylesheet exists
            const stylesheet = document.getElementById('inspectaStylesheet');

            // Apply new styles
            Object.entries(figmaStyles).forEach(([prop, value]) => {
                const cssProp = prop.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
                const cleanValue = value.replace(/\s*!important\s*/i, '');
                // Skip similar styles
                if (similar[cssProp]) {
                    return;
                }

                // Look for checkbox using the kebab-case property name (cssProp) instead of camelCase (prop)
                const checkbox = content.querySelector(`input[type="checkbox"][data-prop="${cssProp}"]`);

                if (checkbox && checkbox.checked) {
                    // Move to stylesheet
                    if (typeof window.generateInspectaCss === 'function') {
                        window.generateInspectaCss(cssProp, cleanValue);
                    }
                }
            });

            // Apply reset styles
            Object.entries(reset).forEach(([prop, value]) => {
                const checkbox = content.querySelector(`input[type="checkbox"][data-prop="${prop}"]`);
                if (checkbox && checkbox.checked) {
                    if (typeof window.generateInspectaCss === 'function') {
                        window.generateInspectaCss(prop, value);
                    }
                }
            });

            // Remove ALL inline styles (both new and reset)
            for (const [prop, value] of Object.entries(applied)) {
                element.style.setProperty(prop, '');
            }
            for (const [prop, value] of Object.entries(reset)) {
                element.style.setProperty(prop, '');
            }

            // Force UI refresh
            if (typeof window.generateInspectaFullCss === 'function') {
                window.generateInspectaFullCss();
            }

            if (typeof window.generateCssChangesCounter === 'function') {
                window.generateCssChangesCounter();
            }

            closePopup();
            resolve({ applied, reset });
        };

        // Handle cancel - revert all changes
        cancelBtn.onclick = () => {
            // Remove all inline styles (both new and reset)
            for (const [prop, value] of Object.entries(applied)) {
                element.style.setProperty(prop, '');
                removePropertyFromCssChanges(prop);
            }
            for (const [prop, value] of Object.entries(reset)) {
                element.style.setProperty(prop, '');
                removePropertyFromCssChanges(prop);
            }
            closePopup();
            resolve({ applied: {}, reset: {} });
        };
    });
}

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = applyClipboardCSS;
}

// Expose to global scope for use in other scripts
if (typeof window !== 'undefined') {
    window.applyClipboardCSS = applyClipboardCSS;
} 