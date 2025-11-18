let figma_compare_panel;
let compare_hint_content_image;
let figma_compare_hint_icon;
let figma_compare_hint_popup;

// Font comparison elements
let figma_compare_fonts_panel;
let compare_fonts_hint_content_image;
let figma_compare_fonts_hint_icon;
let figma_compare_fonts_hint_popup;

// Store Figma colors globally for suggestions
window.inspectaFigmaColors = [];

// Add normalization helpers at the top of the function
function normalizeFontFamily(f) {
    return f
        .split(',')[0]
        .replace(/['"]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}
function normalizeFontWeight(w) {
    if (typeof w === 'string') {
        const wl = w.toLowerCase();
        if (wl === 'regular') return '400';
        if (wl === 'bold') return '700';
        if (wl === 'medium') return '500';
        if (wl === 'semibold' || wl === 'demibold') return '600';
        if (wl === 'light') return '300';
        if (wl === 'thin') return '100';
        if (wl === 'extralight' || wl === 'ultralight') return '200';
        if (wl === 'extrabold' || wl === 'heavy' || wl === 'black') return '800';
        // fallback
        return w;
    }
    return w ? w.toString() : '';
}

// Helper function to check if string is valid JSON
function isJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

function initFigmaIntegration() {

    initFigmaIntegrationElements();
    registerFigmaIntegrationEvents();
}

function initFigmaIntegrationElements() {
    // Colors panel elements
    figma_compare_panel = shadow.getElementById('figma_compare_colors_panel');
    compare_hint_content_image = shadow.getElementById('compare_hint_content_image');
    if (compare_hint_content_image) {
        compare_hint_content_image.src = chrome.runtime.getURL('assets/figma-plugin-hint.png');
    }
    figma_compare_hint_icon = shadow.getElementById('figma_compare_hint_icon');
    figma_compare_hint_popup = shadow.getElementById('figma_compare_hint_popup');

    // Fonts panel elements
    figma_compare_fonts_panel = shadow.getElementById('figma_compare_fonts_panel');
    compare_fonts_hint_content_image = shadow.getElementById('compare_fonts_hint_content_image');
    if (compare_fonts_hint_content_image) {
        compare_fonts_hint_content_image.src = chrome.runtime.getURL('assets/figma-plugin-font-hint.png');
    }
    figma_compare_fonts_hint_icon = shadow.getElementById('figma_compare_fonts_hint_icon');
    figma_compare_fonts_hint_popup = shadow.getElementById('figma_compare_fonts_hint_popup');
}
function registerFigmaIntegrationEvents() {
    // Colors panel events
    if (figma_compare_hint_icon) {
        figma_compare_hint_icon.addEventListener('mouseenter', figmaCompareHintMouseEnter);
        figma_compare_hint_icon.addEventListener('mouseleave', figmaCompareHintMouseLeave);
    }

    // Fonts panel events
    if (figma_compare_fonts_hint_icon && figma_compare_fonts_hint_popup) {
        figma_compare_fonts_hint_icon.addEventListener('mouseenter', () => {
            figma_compare_fonts_hint_popup.style.opacity = 0;
            figma_compare_fonts_hint_popup.style.transition = 'opacity 0.5s';
            setTimeout(() => {
                figma_compare_fonts_hint_popup.style.opacity = 1;
            }, 100);
            figma_compare_fonts_hint_popup.style.display = 'block';
        });

        figma_compare_fonts_hint_icon.addEventListener('mouseleave', () => {
            figma_compare_fonts_hint_popup.style.opacity = 1;
            figma_compare_fonts_hint_popup.style.transition = 'opacity 0.5s';
            setTimeout(() => {
                figma_compare_fonts_hint_popup.style.opacity = 0;
            }, 100);
            figma_compare_fonts_hint_popup.style.display = 'none';
        });
    }
}
function figmaCompareHintMouseEnter() {
    figma_compare_hint_popup.style.opacity = 0;
    figma_compare_hint_popup.style.transition = 'opacity 0.5s';
    setTimeout(() => {
        figma_compare_hint_popup.style.opacity = 1;
    }, 100);
    figma_compare_hint_popup.style.display = 'block';
}
function figmaCompareHintMouseLeave() {
    figma_compare_hint_popup.style.opacity = 1;
    figma_compare_hint_popup.style.transition = 'opacity 0.5s';
    setTimeout(() => {
        figma_compare_hint_popup.style.opacity = 0;
    }, 100);
    figma_compare_hint_popup.style.display = 'none';
}
function compareColorsFromFigma() {
    navigator.clipboard.readText().then((text) => {
        if (isJsonString(text) && JSON.parse(text).colors) {
            // Show toast for comparing status
            if (typeof showToast === 'function') {
                showToast('Comparing colors...', 2000);
            }

            const thumbnails = shadow.querySelectorAll('#pnl-overview .in-thumbnail');
            thumbnails.forEach(thumbnail => thumbnail.remove());
            if (typeof populateColorPallets === 'function') {
                populateColorPallets();
            }
            const pageColorPallet = typeof getPageColorPalette === 'function' ? getPageColorPalette() : [];
            const figmaColors = JSON.parse(text);
            // Store globally for suggestions
            window.inspectaFigmaColors = Array.isArray(figmaColors.colors) ? figmaColors.colors : [];
            const noneFigmaColors = pageColorPallet.filter(color => !figmaColors.colors.includes(color));
            for (const color of noneFigmaColors) {
                const thumbnailsWithSameId = shadow.querySelectorAll(`#pnl-overview #thumbnail-${color.replace('#', '')}`);
                thumbnailsWithSameId.forEach(thumbnail => {
                    thumbnail.style.position = 'relative';
                    const redCircle = document.createElement('span');
                    redCircle.classList.add('red-dot');
                    thumbnail.appendChild(redCircle);
                });
            }

            setTimeout(() => {
                if (noneFigmaColors.length > 0) {
                    if (typeof showToast === 'function') {
                        showToast(`Found ${noneFigmaColors.length} mismatched colors`, 3000);
                    }
                } else {
                    if (typeof showToast === 'function') {
                        showToast('All colors are matching!', 3000);
                    }
                }

                // Call updateColorMismatchUI to handle button logic
                if (typeof window.updateColorMismatchUI === 'function') {
                    window.updateColorMismatchUI();
                }

                // Update mismatch counters in headers
                updateMismatchCounters();
            }, 1000);
        }
        else {
            if (typeof showToast === 'function') {
                showToast('Clipboard is empty or has invalid data', 3000);
            }
        }
    });
}

// Convert hex to RGB
function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
}

// Convert RGB to XYZ
function rgbToXyz({ r, g, b }) {
    [r, g, b] = [r, g, b].map(c => {
        c /= 255;
        return c > 0.04045
            ? Math.pow((c + 0.055) / 1.055, 2.4)
            : c / 12.92;
    });

    return {
        x: r * 0.4124 + g * 0.3576 + b * 0.1805,
        y: r * 0.2126 + g * 0.7152 + b * 0.0722,
        z: r * 0.0193 + g * 0.1192 + b * 0.9505,
    };
}

// Convert XYZ to LAB
function xyzToLab({ x, y, z }) {
    const ref = { x: 0.95047, y: 1.00000, z: 1.08883 };
    [x, y, z] = [x / ref.x, y / ref.y, z / ref.z].map(v => {
        return v > 0.008856 ? Math.pow(v, 1 / 3) : (7.787 * v) + 16 / 116;
    });

    return {
        l: (116 * y) - 16,
        a: 500 * (x - y),
        b: 200 * (y - z)
    };
}

// Delta E (CIE76)
function deltaE(lab1, lab2) {
    return Math.sqrt(
        Math.pow(lab1.l - lab2.l, 2) +
        Math.pow(lab1.a - lab2.a, 2) +
        Math.pow(lab1.b - lab2.b, 2)
    );
}

// Find the closest color using LAB/DeltaE
function findClosestColor(color, figmaColors) {
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) return null;

    const targetLab = xyzToLab(rgbToXyz(hexToRgb(color)));

    let closestColor = null;
    let minDelta = Infinity;

    figmaColors.forEach(figmaColor => {
        if (!/^#[0-9A-Fa-f]{6}$/.test(figmaColor)) return;
        const lab = xyzToLab(rgbToXyz(hexToRgb(figmaColor)));
        const dE = deltaE(targetLab, lab);

        if (dE < minDelta) {
            minDelta = dE;
            closestColor = figmaColor;
        }
    });

    return minDelta > 50 ? null : closestColor; // Lower threshold for stricter matching
}

function findClosestFont(fontInfo, figmaFonts) {
    if (!fontInfo || !figmaFonts || figmaFonts.length === 0) return null;

    // Parse the font info string (format: "FontFamily 14px/21px/400")
    const fontParts = fontInfo.split(' ');
    if (fontParts.length < 2) return null;

    // Extract font properties
    const fontFamily = fontParts[0];
    const sizeLineHeightWeight = fontParts.slice(1).join(' '); // Handle multi-word font names
    const [size, lineHeight, weight] = sizeLineHeightWeight.split('/').map(s => s.trim());

    // Helper to parse Figma font string (e.g., 'Plus Jakarta Sans: 14px/ 21px/ 400')
    function parseFigmaFontString(str) {
        const [familyPart, rest] = str.split(':');
        if (!rest) return { family: familyPart.trim() };
        const [figmaSize, figmaLineHeight, figmaWeight] = rest.split('/').map(s => s.trim());
        return {
            family: familyPart.trim(),
            size: figmaSize,
            lineHeight: figmaLineHeight,
            weight: figmaWeight
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

    // Parse all Figma fonts
    const parsedFigmaFonts = figmaFonts.map(parseFigmaFontString);
    const currentFont = {
        family: fontFamily.trim(),
        size: norm(size),
        lineHeight: norm(lineHeight),
        weight: normWeight(weight)
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
            // Return the font in the format expected by the bulk popup
            return `${bestMatch.family} ${bestMatch.size}/${bestMatch.lineHeight}/${bestMatch.weight}`;
        }
    }

    return null;
}

// Make the function globally available
window.findClosestFont = findClosestFont;

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

function updateColorMismatchUI() {
    // Only run if Figma colors are present
    if (!window.inspectaFigmaColors || window.inspectaFigmaColors.length === 0) {
        // Remove all red dots
        const thumbnails = shadow.querySelectorAll('#pnl-overview .in-thumbnail, #pnl-overview .in-thumbnail-horizontal');
        thumbnails.forEach(thumbnail => {
            const existingDot = thumbnail.querySelector('.red-dot');
            if (existingDot) existingDot.remove();
        });
        // Remove bulk button if no Figma colors
        const btnBulk = shadow.getElementById('btn_bulk_color_suggestions');
        if (btnBulk) {
            btnBulk.remove();
        }
        return;
    }
    const figmaColors = (window.inspectaFigmaColors || []).map(normalizeColorValue);
    const thumbnails = shadow.querySelectorAll('#pnl-overview .in-thumbnail, #pnl-overview .in-thumbnail-horizontal');
    let mismatchCount = 0;
    const uniqueMismatchedColors = new Set();

    thumbnails.forEach((thumbnail, index) => {
        const label = thumbnail.querySelector('.in-thumb-label');
        if (!label) {
            return;
        }
        const color = normalizeColorValue(label.innerText.trim());
        // Remove any existing red dot
        const existingDot = thumbnail.querySelector('.red-dot');
        if (existingDot) existingDot.remove();
        // Add red dot if not in Figma colors
        if (!figmaColors.includes(color)) {
            const redCircle = document.createElement('span');
            redCircle.classList.add('red-dot');
            thumbnail.appendChild(redCircle);
            uniqueMismatchedColors.add(color);
        }
    });

    mismatchCount = uniqueMismatchedColors.size;

    // Update bulk color suggestions button
    if (typeof window.updateBulkColorButton === 'function') {
        window.updateBulkColorButton();
    }

    // Update mismatch counters in headers
    updateMismatchCounters();
}
window.updateColorMismatchUI = updateColorMismatchUI;

// Store Figma fonts globally for suggestions
window.inspectaFigmaFonts = [];

function compareFontsFromFigma() {
    navigator.clipboard.readText().then((text) => {
        if (isJsonString(text) && JSON.parse(text).fonts) {
            // Show toast for comparing status
            if (typeof showToast === 'function') {
                showToast('Comparing fonts...', 2000);
            }

            // Remove existing red dots from font items
            const fontItems = shadow.querySelectorAll('#pnl-overview .in-thumb-font');
            fontItems.forEach(item => {
                const existingDot = item.querySelector('.red-dot');
                if (existingDot) existingDot.remove();
            });

            // Get page fonts and Figma fonts
            let pageFonts = getPageFontList();
            const figmaFonts = JSON.parse(text);

            // If no fonts found, try to populate them first
            if (pageFonts.length === 0) {
                // Trigger font population if available
                if (typeof window.populateFonts === 'function' && window.fontSettingsArray) {
                    window.populateFonts(window.fontSettingsArray);
                    // Wait a bit for fonts to be populated
                    setTimeout(() => {
                        pageFonts = getPageFontList();
                    }, 100);
                }
            }

            // Store globally for suggestions
            window.inspectaFigmaFonts = Array.isArray(figmaFonts.fonts) ? figmaFonts.fonts : [];

            // Find font combinations that are not in Figma
            const noneFigmaFonts = pageFonts.filter(pageFont => {
                // Check if any Figma font matches this combination
                return !figmaFonts.fonts.some(figmaFont => {
                    // Parse Figma font (format: "FontFamily-Style")
                    const figmaFontParts = figmaFont.split('-');
                    const figmaFontFamily = figmaFontParts[0];
                    const figmaFontStyle = figmaFontParts.slice(1).join('-'); // Handle multi-word styles like "Extra Bold"

                    // Extract font weight from style
                    let figmaFontWeight = '400'; // Default
                    if (figmaFontStyle) {
                        const styleLower = figmaFontStyle.toLowerCase();
                        if (styleLower.includes('thin')) figmaFontWeight = '100';
                        else if (styleLower.includes('extralight') || styleLower.includes('ultralight')) figmaFontWeight = '200';
                        else if (styleLower.includes('light')) figmaFontWeight = '300';
                        else if (styleLower.includes('regular') || styleLower.includes('normal')) figmaFontWeight = '400';
                        else if (styleLower.includes('medium')) figmaFontWeight = '500';
                        else if (styleLower.includes('semibold') || styleLower.includes('demibold')) figmaFontWeight = '600';
                        else if (styleLower.includes('bold')) figmaFontWeight = '700';
                        else if (styleLower.includes('extrabold') || styleLower.includes('heavy')) figmaFontWeight = '800';
                        else if (styleLower.includes('black') || styleLower.includes('heavy')) figmaFontWeight = '900';
                    }

                    // Normalize font sizes for comparison (remove 'px' and convert to number)
                    const normalizeSize = (size) => {
                        if (!size) return null;
                        const numSize = parseFloat(size.replace('px', ''));
                        return isNaN(numSize) ? null : numSize;
                    };

                    // Normalize line heights for comparison
                    const normalizeLineHeight = (lh) => {
                        if (!lh) return null;
                        if (lh === 'auto') return 'auto';
                        const numLH = parseFloat(lh.replace('px', ''));
                        return isNaN(numLH) ? null : numLH;
                    };

                    const pageFontSize = normalizeSize(pageFont.fontSize);
                    const pageLineHeight = normalizeLineHeight(pageFont.lineHeight);

                    // If we have detailed font data from Figma, use it for more accurate comparison
                    if (figmaFonts.fontDetails) {
                        const figmaFontDetail = figmaFonts.fontDetails.find(detail =>
                            detail.family === figmaFontFamily && detail.style === figmaFontStyle
                        );

                        if (figmaFontDetail) {
                            // Compare all available properties - ALL must match
                            const familyMatches = normalizeFontFamily(figmaFontDetail.family) === normalizeFontFamily(pageFont.fontFamily);
                            const weightMatches = normalizeFontWeight(figmaFontDetail.fontWeight) === normalizeFontWeight(pageFont.fontWeight);

                            // Compare size - must match if both are available
                            let sizeMatches = true;
                            if (figmaFontDetail.fontSize !== undefined && pageFontSize !== null) {
                                sizeMatches = Math.abs(figmaFontDetail.fontSize - pageFontSize) < 0.1; // Allow small rounding differences
                            }

                            // Compare line height - must match if both are available
                            let lineHeightMatches = true;
                            if (figmaFontDetail.lineHeight !== undefined && pageLineHeight !== null) {
                                if (figmaFontDetail.lineHeight === 'auto' && pageLineHeight === 'auto') {
                                    lineHeightMatches = true;
                                } else if (typeof figmaFontDetail.lineHeight === 'number' && typeof pageLineHeight === 'number') {
                                    lineHeightMatches = Math.abs(figmaFontDetail.lineHeight - pageLineHeight) < 0.1;
                                } else {
                                    lineHeightMatches = false; // Different types (auto vs number)
                                }
                            }

                            // ALL properties must match for a green result
                            return familyMatches && weightMatches && sizeMatches && lineHeightMatches;
                        }
                    }

                    // Fallback to basic comparison (family and weight only)
                    const familyMatches = normalizeFontFamily(figmaFontFamily) === normalizeFontFamily(pageFont.fontFamily);
                    const weightMatches = normalizeFontWeight(figmaFontWeight) === normalizeFontWeight(pageFont.fontWeight);

                    return familyMatches && weightMatches;
                });
            });

            // Add red dots to mismatched font items
            noneFigmaFonts.forEach(pageFont => {
                pageFont.element.style.position = 'relative';
                const redCircle = document.createElement('span');
                redCircle.classList.add('red-dot');
                pageFont.element.appendChild(redCircle);
            });

            setTimeout(() => {
                if (noneFigmaFonts.length > 0) {
                    if (typeof showToast === 'function') {
                        showToast(`Found ${noneFigmaFonts.length} mismatched font combinations`, 3000);
                    }
                } else {
                    if (typeof showToast === 'function') {
                        showToast('All font combinations are matching!', 3000);
                    }
                }

                // Call updateFontMismatchUI to handle button logic
                if (typeof window.updateFontMismatchUI === 'function') {
                    window.updateFontMismatchUI();
                }

                // Update mismatch counters in headers
                updateMismatchCounters();
            }, 1000);
        }
        else {
            if (typeof showToast === 'function') {
                showToast('Clipboard is empty or has invalid data', 3000);
            }
        }
    });
}

// Add this helper at the top (after normalization helpers)
function parseFigmaFontString(str) {
    // Example: 'Plus Jakarta Sans: 32px/ 48px/ 500'
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

// Add normalization helpers for size and line height:
function normalizeFontSize(size) {
    if (!size) return '';
    return parseFloat(size.replace('px', '').trim()).toString();
}
function normalizeLineHeight(lh) {
    if (!lh) return '';
    if (lh === 'normal' || lh === 'auto') return lh;
    return parseFloat(lh.replace('px', '').trim()).toString();
}

// Add this new function to parse the actual Figma font format
function parseFigmaFontFormat(figmaFontString) {
    // Format: 'Plus Jakarta Sans: 32px/ 48px/ 500' or 'Poppins: 9.2px/ / 500'
    const [familyPart, rest] = figmaFontString.split(':');
    if (!rest) return { family: familyPart.trim(), size: '', lineHeight: '', weight: '' };

    const parts = rest.split('/').map(s => s.trim());
    const size = parts[0] || '';
    const lineHeight = parts[1] || '';
    const weight = parts[2] || '';

    return {
        family: familyPart.trim(),
        size: size,
        lineHeight: lineHeight,
        weight: weight
    };
}

// Add function to map Figma style to weight
function figmaStyleToWeight(style) {
    if (!style) return '400';
    const styleLower = style.toLowerCase();
    if (styleLower.includes('thin')) return '100';
    if (styleLower.includes('extralight') || styleLower.includes('ultralight')) return '200';
    if (styleLower.includes('light')) return '300';
    if (styleLower.includes('regular') || styleLower.includes('normal')) return '400';
    if (styleLower.includes('medium')) return '500';
    if (styleLower.includes('semibold') || styleLower.includes('demibold')) return '600';
    if (styleLower.includes('bold')) return '700';
    if (styleLower.includes('extrabold') || styleLower.includes('heavy')) return '800';
    if (styleLower.includes('black') || styleLower.includes('heavy')) return '900';
    return '400'; // Default
}

// Helper function to get page font list with detailed font combinations
function getPageFontList() {
    // Check if we're in the overview panel
    const overviewPanel = shadow.querySelector('#pnl-overview');
    if (!overviewPanel) {
        console.log('Overview panel not found');
        return [];
    }

    // Check if fonts are in the overview panel or fonts panel
    let fontItems = shadow.querySelectorAll('#pnl-overview .in-thumb-font');
    if (fontItems.length === 0) {
        // Try fonts panel
        fontItems = shadow.querySelectorAll('#pnl_fonts_groups .in-thumb-font');

    }

    const pageFonts = [];

    fontItems.forEach(item => {
        // Try to get font information directly from the item
        const fontSize = item.querySelector('#in_overview_font_size')?.innerText || '';
        const lineHeight = item.querySelector('#in_overview_line-height')?.innerText || '';
        const fontWeight = item.querySelector('#in_overview_font_weight')?.innerText || '';

        // Try to get font family from different possible sources
        let fontFamily = '';

        // Method 1: Look for group title in parent elements
        const fontGroup = item.closest('.font-group');
        const groupTitle = fontGroup ? fontGroup.querySelector('.group-title') : null;
        if (groupTitle) {
            fontFamily = groupTitle.innerText.trim();
        }

        // Method 2: Look for font family in the item itself or nearby elements
        if (!fontFamily) {
            const fontFamilyElement = item.querySelector('.font-family') ||
                item.querySelector('[data-font-family]') ||
                item.querySelector('.group-title');
            if (fontFamilyElement) {
                fontFamily = fontFamilyElement.innerText.trim();
            }
        }

        // Method 3: Try to get from parent container or sibling elements
        if (!fontFamily) {
            const parent = item.parentElement;
            if (parent) {
                const siblingTitle = parent.querySelector('.group-title') ||
                    parent.querySelector('.font-family') ||
                    parent.querySelector('[data-font-family]');
                if (siblingTitle) {
                    fontFamily = siblingTitle.innerText.trim();
                }
            }
        }

        // Method 4: Look for font family in the entire font group structure
        if (!fontFamily) {
            // Look for font group container that contains this item
            let currentParent = item.parentElement;
            while (currentParent && !fontFamily) {
                // Check if this parent has a group title
                const groupTitle = currentParent.querySelector('.group-title');
                if (groupTitle) {
                    fontFamily = groupTitle.innerText.trim();
                    break;
                }

                // Check if this parent is a font group
                if (currentParent.classList.contains('font-group')) {
                    const title = currentParent.querySelector('.group-title');
                    if (title) {
                        fontFamily = title.innerText.trim();
                        break;
                    }
                }

                // Move up to next parent
                currentParent = currentParent.parentElement;
            }
        }

        // Method 5: Look for font family in the overview panel structure
        if (!fontFamily) {
            const overviewPanel = shadow.querySelector('#pnl-overview');
            if (overviewPanel) {
                // Look for any font group titles in the overview panel
                const allGroupTitles = overviewPanel.querySelectorAll('.group-title');
                if (allGroupTitles.length > 0) {
                    // Use the first group title as the font family
                    fontFamily = allGroupTitles[0].innerText.trim();
                }
            }
        }

        if (fontFamily && (fontSize || fontWeight)) {
            // Create a unique font combination string
            const fontCombination = `${fontFamily}-${fontSize}-${lineHeight}-${fontWeight}`;
            pageFonts.push({
                element: item,
                fontFamily: fontFamily,
                fontSize: fontSize,
                lineHeight: lineHeight,
                fontWeight: fontWeight,
                combination: fontCombination
            });
        }
    });

    return pageFonts;
}

function updateFontMismatchUI() {
    // Only run if Figma fonts are present
    if (!window.inspectaFigmaFonts || window.inspectaFigmaFonts.length === 0) {
        // Remove all red dots from font items
        const fontRows = shadow.querySelectorAll('.in-thumb-font');
        fontRows.forEach(row => {
            const existingDot = row.querySelector('.red-dot');
            if (existingDot) existingDot.remove();
        });
        return;
    }

    const figmaFonts = window.inspectaFigmaFonts || [];
    const fontRows = shadow.querySelectorAll('.in-thumb-font');
    let mismatchCount = 0;


    fontRows.forEach((row, index) => {
        // Extract font info from child spans
        const fontGroup = row.closest('.font-group');
        const groupTitle = fontGroup ? fontGroup.querySelector('.group-title') : null;
        const fontFamily = groupTitle ? groupTitle.innerText.trim() : '';
        const fontSize = row.querySelector('#in_overview_font_size')?.innerText.trim() || '';
        const lineHeight = row.querySelector('#in_overview_line-height')?.innerText.trim() || '';
        const fontWeight = row.querySelector('#in_overview_font_weight')?.innerText.trim() || '';

        // Only add red dot if all font info is present
        if (!fontFamily || !fontSize || !lineHeight || !fontWeight) {
            const existingDot = row.querySelector('.red-dot');
            if (existingDot) existingDot.remove();
            return;
        }

        // Check if this font combination is in Figma fonts
        const isInFigma = figmaFonts.some(figmaFont => {
            const figmaParsed = parseFigmaFontFormat(figmaFont);

            // Normalize values for comparison
            const pageFamily = normalizeFontFamily(fontFamily);
            const figmaFamily = normalizeFontFamily(figmaParsed.family);
            const pageWeight = normalizeFontWeight(fontWeight);
            const pageSize = normalizeFontSize(fontSize);
            const pageLineHeight = normalizeLineHeight(lineHeight);
            const figmaSize = normalizeFontSize(figmaParsed.size);
            const figmaLineHeight = normalizeLineHeight(figmaParsed.lineHeight);
            const figmaWeight = normalizeFontWeight(figmaParsed.weight);

            return pageFamily === figmaFamily &&
                pageSize === figmaSize &&
                pageLineHeight === figmaLineHeight &&
                pageWeight === figmaWeight;
        });

        // Always remove existing red dot first
        const existingDot = row.querySelector('.red-dot');
        if (existingDot) existingDot.remove();

        // Add red dot only if not in Figma fonts
        if (!isInFigma) {
            const redCircle = document.createElement('span');
            redCircle.classList.add('red-dot');
            row.style.position = 'relative';
            row.appendChild(redCircle);
        }
    });

    // Update mismatch counters in headers
    updateMismatchCounters();

    // Update bulk font button
    if (typeof window.updateBulkFontButton === 'function') {
        window.updateBulkFontButton();
    }
}
window.updateFontMismatchUI = updateFontMismatchUI;

// Add this function to update mismatch counters in the overview headers
function updateMismatchCounters() {
    // Update Colors counter
    const colorsHeader = shadow.querySelector('#pnl_colors_header .item_label');
    if (colorsHeader) {
        // Remove existing counter
        const existingCounter = colorsHeader.querySelector('.mismatch-counter');
        if (existingCounter) existingCounter.remove();

        if (window.inspectaFigmaColors && window.inspectaFigmaColors.length > 0) {
            // Count mismatched colors
            const colorThumbnails = shadow.querySelectorAll('#pnl-overview .in-thumbnail');
            let colorMismatchCount = 0;
            colorThumbnails.forEach(thumbnail => {
                const redDot = thumbnail.querySelector('.red-dot');
                if (redDot) colorMismatchCount++;
            });
            // Add counter if there are mismatches
            if (colorMismatchCount > 0) {
                const counter = document.createElement('span');
                counter.className = 'mismatch-counter';
                counter.innerHTML = `<span class="badge">${colorMismatchCount}</span>`;
                colorsHeader.appendChild(counter);
            }
        }
    }
    // Update Fonts counter
    const fontsHeader = shadow.querySelector('#pnl_fonts_header .item_label');
    if (fontsHeader) {
        // Remove existing counter
        const existingCounter = fontsHeader.querySelector('.mismatch-counter');
        if (existingCounter) existingCounter.remove();

        if (window.inspectaFigmaFonts && window.inspectaFigmaFonts.length > 0) {
            // Count mismatched fonts
            const fontRows = shadow.querySelectorAll('.in-thumb-font');
            let fontMismatchCount = 0;
            fontRows.forEach(row => {
                const redDot = row.querySelector('.red-dot');
                if (redDot) fontMismatchCount++;
            });
            // Add counter if there are mismatches
            if (fontMismatchCount > 0) {
                const counter = document.createElement('span');
                counter.className = 'mismatch-counter';
                counter.innerHTML = `<span class="badge">${fontMismatchCount}</span>`;
                fontsHeader.appendChild(counter);
            }
        }
    }
}
window.updateMismatchCounters = updateMismatchCounters;


