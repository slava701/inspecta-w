// info-popover.js
(function () {
    // --- CONFIG ---
    // List of properties to show in the popover (can be extended)
    const PROPERTIES = [
        'display', 'position', 'width', 'height', 'margin', 'padding', 'font-family', 'font-size', 'font-weight', 'color', 'background-color', 'border', 'opacity', 'z-index'
    ];

    // Helper to get the shadow root or fallback to document.body
    function getPopoverRoot() {
        if (window.shadow && window.shadow.host) return window.shadow;
        return document.body;
    }

    // Helper to get a readable element name (like in properties panel)
    function getElementName(el) {
        if (!el) return '';
        let name = el.nodeName.toLowerCase();
        if (el.id) name += `#${el.id}`;
        if (el.className && typeof el.className === 'string') {
            let classStr = el.className
                .replace(/inspecta-inspect-active|inspecta-inspect|inspecta-inspect-isolated/g, '')
                .trim()
                .replace(/\s+/g, '.');
            if (classStr) name += `.${classStr}`;
        }
        return name;
    }

    // Helper to get computed styles as a property-value object
    function getComputedProperties(el) {
        // Use the same method as the properties panel to get default styles (without hover state)
        const parent = el.parentNode;
        const nextSibling = el.nextSibling;

        // Remove element from DOM to get default styles without hover state
        parent.removeChild(el);

        // Get computed styles while element is not in DOM (no hover possible)
        const styles = window.getComputedStyle(el);

        // Put element back in its original position
        if (nextSibling) {
            parent.insertBefore(el, nextSibling);
        } else {
            parent.appendChild(el);
        }

        const result = {};
        PROPERTIES.forEach(prop => {
            // Convert JS property to CSS property (e.g., fontSize -> font-size)
            const cssProp = prop.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
            result[prop] = styles.getPropertyValue(cssProp);
        });
        return result;
    }

    // Helper to get hover styles by temporarily simulating hover state
    function getHoverStyles(el) {
        try {
            // Get default styles first using the same method as main popup
            const defaultStyles = getComputedProperties(el);

            // Create a temporary style element to force hover state
            const tempStyle = document.createElement('style');
            tempStyle.id = 'temp-force-hover';
            tempStyle.textContent = `
                *:hover {
                    pointer-events: auto !important;
                }
            `;
            document.head.appendChild(tempStyle);

            // Temporarily add a class to the element to simulate hover
            const originalClasses = el.className;
            el.classList.add('temp-hover-simulation');

            // Create a CSS rule that applies hover styles to our temporary class
            const hoverRule = document.createElement('style');
            hoverRule.id = 'temp-hover-rule';

            // Get all CSS rules that might affect this element on hover
            const allRules = [];
            for (let i = 0; i < document.styleSheets.length; i++) {
                try {
                    const sheet = document.styleSheets[i];
                    if (sheet.cssRules) {
                        for (let j = 0; j < sheet.cssRules.length; j++) {
                            const rule = sheet.cssRules[j];
                            if (rule.type === CSSRule.STYLE_RULE && rule.selectorText && rule.selectorText.includes(':hover')) {
                                allRules.push(rule);
                            }
                        }
                    }
                } catch (e) {
                    // Skip stylesheets that can't be accessed (cross-origin)
                }
            }

            // Apply hover styles to our temporary class
            let hoverCSS = '';
            allRules.forEach(rule => {
                if (rule.selectorText) {
                    // Handle different types of hover selectors
                    let baseSelector = rule.selectorText.replace(':hover', '');

                    // Handle comma-separated selectors
                    if (rule.selectorText.includes(',')) {
                        const selectors = rule.selectorText.split(',');
                        let matches = false;
                        for (const selector of selectors) {
                            const cleanSelector = selector.trim().replace(':hover', '');
                            if (cleanSelector && el.matches(cleanSelector)) {
                                matches = true;
                                break;
                            }
                        }
                        if (matches) {
                            hoverCSS += `.temp-hover-simulation { ${rule.style.cssText} }`;
                        }
                    } else {
                        // Handle single selector
                        if (baseSelector && el.matches(baseSelector)) {
                            hoverCSS += `.temp-hover-simulation { ${rule.style.cssText} }`;
                        }
                    }
                }
            });

            hoverRule.textContent = hoverCSS;
            document.head.appendChild(hoverRule);

            // Force a reflow to apply the styles
            el.offsetHeight;

            // Get hover styles using the same method as default styles
            const hoverStyles = getComputedProperties(el);
            const result = {};

            // Compare with default styles to find differences
            PROPERTIES.forEach(prop => {
                const hoverValue = hoverStyles[prop];
                const defaultValue = defaultStyles[prop];

                // Only include properties that are different in hover state
                if (hoverValue !== defaultValue && hoverValue && hoverValue.trim() !== '') {
                    result[prop] = hoverValue;
                }
            });

            // Clean up
            el.className = originalClasses;
            if (document.head.contains(tempStyle)) {
                document.head.removeChild(tempStyle);
            }
            if (document.head.contains(hoverRule)) {
                document.head.removeChild(hoverRule);
            }

            return result;
        } catch (error) {
            console.error('Error in getHoverStyles:', error);
            return {};
        }
    }

    // Helper: Convert rgb/rgba/hex to hex (copied from properties.js)
    function rgba2hexAdvanced(orig) {
        let a, isPercent;
        if (!orig) return { color: '', opacity: 100 };
        if (orig.startsWith('#')) {
            // Already hex
            return { color: orig, opacity: 100 };
        }
        if (orig.startsWith('rgb')) {
            let rgb = orig.replace(/\s/g, '').match(/^rgba?\((\d+),(\d+),(\d+)(?:,(\d*\.?\d+))?\)$/i);
            if (!rgb) return { color: orig, opacity: 100 };
            let r = parseInt(rgb[1], 10), g = parseInt(rgb[2], 10), b = parseInt(rgb[3], 10);
            a = rgb[4] === undefined ? 1 : parseFloat(rgb[4]);
            let hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
            let opacity = Math.round(a * 100);
            return { color: hex, opacity };
        }
        return { color: orig, opacity: 100 };
    }

    // Create the popover element
    function createPopover(el) {
        const popover = document.createElement('div');
        popover.className = 'info-popover';
        // Element name
        const nameDiv = document.createElement('div');
        nameDiv.className = 'info-popover-name';
        nameDiv.textContent = getElementName(el);
        popover.appendChild(nameDiv);
        // Width x Height line (rounded, no decimals) - use default styles
        const defaultStyles = getComputedProperties(el);
        let width = defaultStyles.width;
        let height = defaultStyles.height;
        // Extract numeric value and round
        const widthNum = Math.round(parseFloat(width));
        const heightNum = Math.round(parseFloat(height));
        if (width && height && width !== 'auto' && height !== 'auto' && width !== '0px' && height !== '0px') {
            const sizeDiv = document.createElement('div');
            sizeDiv.className = 'info-popover-size info-popover-dimensions';
            sizeDiv.textContent = `${widthNum} x ${heightNum}`;
            popover.appendChild(sizeDiv);
        }
        // Properties list (excluding width and height)
        const propList = document.createElement('dl');
        propList.className = 'info-popover-list';
        const props = defaultStyles; // Use the default styles we already calculated
        Object.entries(props).forEach(([key, value]) => {
            if (!value || value.trim() === '' || key === 'width' || key === 'height') return;
            // Hide values that are 0, 0px, none, or only whitespace
            const v = value.trim();
            if (v === '0' || v === '0px' || v === 'none') return;
            // Hide position: static
            if (key === 'position' && (v === 'static')) return;
            // Hide opacity: 1 or 1.0
            if (key === 'opacity' && (v === '1' || v === '1.0')) return;
            // Hide background-color for text elements if transparent/none
            if (key === 'background-color') {
                if (v === 'transparent' || v === 'rgba(0, 0, 0, 0)') {
                    const display = window.getComputedStyle(el).display;
                    const isText = (el.childNodes.length === 1 && el.firstChild.nodeType === Node.TEXT_NODE) ||
                        ['inline', 'inline-block', 'inline-flex', 'inline-grid'].includes(display);
                    if (isText) return;
                }
            }
            // Hide z-index: auto
            if (key === 'z-index' && v === 'auto') return;
            // Hide border if value is none and width is 0 (any order, any color)
            if (key === 'border') {
                const borderVal = v.toLowerCase();
                if (/^(0(px)?\s+none|none\s+0(px)?)(\s+.+)?$/.test(borderVal) ||
                    /^(none|0(px)?)(\s+none|\s+0(px)?)+(\s+.+)?$/.test(borderVal)) {
                    return;
                }
            }
            // Convert color and background-color to hex
            let displayValue = value;
            if (key === 'color' || key === 'background-color' || key === 'border') {
                if (key === 'border') {
                    // Use regex to extract and replace the color part
                    const colorMatch = value.match(/(rgba?\([^\)]+\)|hsla?\([^\)]+\)|#[0-9a-fA-F]{3,8})/);
                    if (colorMatch) {
                        const colorPart = colorMatch[0];
                        const hexObj = rgba2hexAdvanced(colorPart);
                        displayValue = value.replace(colorPart, hexObj.color);
                    } else {
                        displayValue = value;
                    }
                } else {
                    const hexObj = rgba2hexAdvanced(value);
                    displayValue = hexObj.color;
                }
            }
            // For font-family, show only the first font
            if (key === 'font-family' && value) {
                displayValue = value.split(',')[0].replace(/['"]/g, '').trim();
            }
            const dt = document.createElement('dt');
            dt.textContent = key === 'background-color' ? 'Background' : key;
            const dd = document.createElement('dd');
            // Add color swatch for color, background-color, and border
            if (key === 'color' || key === 'background-color' || key === 'border') {
                const swatch = document.createElement('span');
                swatch.className = 'info-popover-color-swatch';
                let swatchColor = '';
                if (key === 'border') {
                    // Try to extract the color part from the border value
                    const colorMatch = value.match(/(rgba?\([^)]+\)|hsla?\([^)]+\)|#[0-9a-fA-F]{3,8})/);
                    if (colorMatch) {
                        swatchColor = colorMatch[0];
                    }
                } else {
                    swatchColor = value;
                }
                swatch.style.background = swatchColor;
                dd.appendChild(swatch);
                dd.appendChild(document.createTextNode(displayValue));
            } else {
                dd.textContent = displayValue;
            }
            const propWrapper = document.createElement('div');
            propWrapper.className = 'info-popover-prop';
            propWrapper.appendChild(dt);
            propWrapper.appendChild(dd);
            propList.appendChild(propWrapper);
        });
        popover.appendChild(propList);

        // Add hover styles section
        try {
            const hoverStyles = getHoverStyles(el);
            // console.log('Hover styles detected:', hoverStyles);
            if (hoverStyles && Object.keys(hoverStyles).length > 0) {
                const hoverSection = document.createElement('div');
                hoverSection.className = 'info-popover-hover';
                hoverSection.innerHTML = '<div class="hover-section-title">Hover</div>';

                const hoverPropList = document.createElement('dl');
                hoverPropList.className = 'info-popover-list';

                Object.entries(hoverStyles).forEach(([key, value]) => {
                    if (!value || value.trim() === '') return;
                    const v = value.trim();
                    if (v === '0' || v === '0px' || v === 'none') return;
                    // Don't show initial values
                    if (v.toLowerCase() === 'initial') return;

                    // Convert color values to hex
                    let displayValue = value;
                    if (key === 'color' || key === 'background-color' || key === 'border' || key === 'outline-color') {
                        if (key === 'border') {
                            const colorMatch = value.match(/(rgba?\([^\)]+\)|hsla?\([^\)]+\)|#[0-9a-fA-F]{3,8})/);
                            if (colorMatch) {
                                const colorPart = colorMatch[0];
                                const hexObj = rgba2hexAdvanced(colorPart);
                                displayValue = value.replace(colorPart, hexObj.color);
                            }
                        } else {
                            // Convert all color values to hex (including RGB values)
                            const hexObj = rgba2hexAdvanced(value);
                            displayValue = hexObj.color;
                        }
                    }

                    const dt = document.createElement('dt');
                    // Use same property names as main popup
                    if (key === 'background-color') {
                        dt.textContent = 'Background';
                    } else if (key === 'outline-color') {
                        dt.textContent = 'Outline';
                    } else {
                        dt.textContent = key;
                    }
                    const dd = document.createElement('dd');

                    // Add color swatch for color properties
                    if (key === 'color' || key === 'background-color' || key === 'border' || key === 'outline-color') {
                        const swatch = document.createElement('span');
                        swatch.className = 'info-popover-color-swatch';
                        let swatchColor = '';
                        if (key === 'border') {
                            const colorMatch = value.match(/(rgba?\([^)]+\)|hsla?\([^)]+\)|#[0-9a-fA-F]{3,8})/);
                            if (colorMatch) {
                                swatchColor = colorMatch[0];
                            }
                        } else {
                            swatchColor = value;
                        }
                        swatch.style.background = swatchColor;
                        dd.appendChild(swatch);
                        dd.appendChild(document.createTextNode(displayValue));
                    } else {
                        dd.textContent = displayValue;
                    }

                    const propWrapper = document.createElement('div');
                    propWrapper.className = 'info-popover-prop';
                    propWrapper.appendChild(dt);
                    propWrapper.appendChild(dd);
                    hoverPropList.appendChild(propWrapper);
                });

                hoverSection.appendChild(hoverPropList);
                popover.appendChild(hoverSection);
            }
        } catch (error) {
            console.error('Error creating hover styles section:', error);
        }

        // Add contrast ratio after the property list
        const contrast = checkContrast(el);
        const contrastDiv = document.createElement('div');
        contrastDiv.className = 'info-popover-contrast';
        // Determine classes and colors for AA/AAA
        let aaClass = 'contrast-fail', aaaClass = 'contrast-fail';
        let aaColor = 'red', aaaColor = 'red';
        if (contrast.passedAA && contrast.passedAAA) {
            aaClass = 'contrast-pass';
            aaaClass = 'contrast-pass';
            aaColor = 'green';
            aaaColor = 'green';
        } else if (contrast.passedAA) {
            aaClass = 'contrast-pass';
            aaaClass = 'contrast-fail';
            aaColor = 'green';
            aaaColor = 'red';
        }
        // SVGs for pass and fail
        const checkSvg = `<svg class="contrast-icon contrast-pass-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3.33337 8.13325L7.20712 12.3333L13.6634 5.33325" stroke="#03A303" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        const crossSvg = `<svg class="contrast-icon contrast-fail-icon" width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="5.25" cy="5.25" r="5.25" transform="matrix(1 0 0 -1 1.75 12.25)" stroke="#FF4E68" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.3998 10.3999L3.59995 3.60007" stroke="#FF4E4E" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        contrastDiv.innerHTML = `
            <span class="contrast-label">Contrast ratio</span>
            <span class="contrast-results">
                <span class="contrast-value">${contrast.ratio}:1</span>
                <span class="contrast-levels">
                    <span class="contrast-aa ${aaClass}">${contrast.passedAA ? checkSvg : crossSvg}AA</span>
                    <span class="contrast-aaa ${aaaClass}">${contrast.passedAAA ? checkSvg : crossSvg}AAA</span>
                </span>
            </span>
        `;
        popover.appendChild(contrastDiv);
        return popover;
    }

    // Remove any existing popover
    function removePopover() {
        const root = getPopoverRoot();
        const existing = root.querySelector('.info-popover');
        if (existing) existing.remove();
    }

    // Position the popover at the bottom-left of the element
    function positionPopover(popover, el) {
        const rect = el.getBoundingClientRect();
        const popoverRect = popover.getBoundingClientRect();
        let left = rect.left;
        let top;
        const margin = 8; // Minimum margin from viewport edges
        // Default: try below
        if (rect.bottom + 4 + popoverRect.height <= window.innerHeight) {
            top = rect.bottom + 4;
        } else if (rect.top - 4 - popoverRect.height >= 0) {
            // Try above
            top = rect.top - popoverRect.height - 4;
        } else {
            // Not enough space above or below: stick to closest edge, but never overlap the element
            if (rect.top > window.innerHeight - rect.bottom) {
                // More space above, stick to top edge but not overlap element
                top = Math.max(margin, rect.top - popoverRect.height - 4);
                if (top + popoverRect.height > rect.top) {
                    top = rect.top - popoverRect.height - 4;
                }
            } else {
                // More space below, stick to bottom edge but not overlap element
                top = Math.min(window.innerHeight - popoverRect.height - margin, rect.bottom + 4);
                if (top < rect.bottom) {
                    top = rect.bottom + 4;
                }
            }
        }
        popover.style.left = `${left}px`;
        popover.style.top = `${top}px`;
        // Fade in
        requestAnimationFrame(() => {
            popover.style.opacity = '1';
        });
    }

    // Should we show the popover for this element?
    function isValidTarget(el) {
        if (!el) return false;
        // Don't show for inspector UI
        if (el.closest && (el.closest('#inspecta_app_container') || el.closest('#inspecta-rg-overlay'))) return false;
        return true;
    }

    // --- CONTRAST CHECK LOGIC ---
    function getBackgroundColor(element) {
        let currentElement = element;
        while (currentElement) {
            const styles = window.getComputedStyle(currentElement);
            const bgColor = styles.backgroundColor;
            if (bgColor && bgColor !== 'transparent' && bgColor !== 'rgba(0, 0, 0, 0)') {
                return bgColor;
            }

            if (currentElement.parentElement) {
                currentElement = currentElement.parentElement;
            } else if (currentElement.getRootNode() instanceof ShadowRoot) {
                currentElement = currentElement.getRootNode().host;
            } else {
                // We've reached the root (<html> or something else without a parent)
                currentElement = null;
            }
        }
        // Default to white if no background found, as it's a common browser default.
        return 'rgb(255, 255, 255)';
    }

    function parseColor(color) {
        if (!color) return null;
        let match;

        // RGBA
        match = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
        if (match) {
            return {
                r: parseInt(match[1]),
                g: parseInt(match[2]),
                b: parseInt(match[3]),
                a: match[4] !== undefined ? parseFloat(match[4]) : 1
            };
        }

        // HEX
        match = color.match(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/);
        if (match) {
            return { r: parseInt(match[1], 16), g: parseInt(match[2], 16), b: parseInt(match[3], 16), a: 1 };
        }

        // HEX shorthand
        match = color.match(/^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/);
        if (match) {
            return { r: parseInt(match[1] + match[1], 16), g: parseInt(match[2] + match[2], 16), b: parseInt(match[3] + match[3], 16), a: 1 };
        }

        // Fallback for named colors, etc.
        const temp = document.createElement('div');
        temp.style.color = color;
        // The element needs to be in the DOM for getComputedStyle to work reliably
        document.body.appendChild(temp);
        const computedColor = window.getComputedStyle(temp).color;
        document.body.removeChild(temp);

        // Re-parse the computed color (which will be rgb or rgba)
        if (computedColor && computedColor !== color) return parseColor(computedColor);

        return null;
    }

    function getLuminance(r, g, b) {
        const [rs, gs, bs] = [r, g, b].map(c => {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    }
    function getContrastRatio(l1, l2) {
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
    }
    function checkContrast(element) {
        const styles = window.getComputedStyle(element);
        const textColorString = styles.color;
        const bgColorString = getBackgroundColor(element);
        const elementOpacity = parseFloat(styles.opacity);

        const fgColor = parseColor(textColorString);
        let bgColor = parseColor(bgColorString);

        if (!fgColor || !bgColor) {
            return { ratio: 0, passedAA: false, passedAAA: false };
        }

        // If the retrieved background color is transparent, use white as a fallback.
        if (bgColor.a === 0) {
            bgColor = { r: 255, g: 255, b: 255, a: 1 };
        }

        // The final alpha is a combination of the color's alpha and the element's opacity
        const finalAlpha = fgColor.a * elementOpacity;

        let finalFgColor = fgColor;

        if (finalAlpha < 1) {
            // Blend the foreground color with the background color
            finalFgColor = {
                r: Math.round((fgColor.r * finalAlpha) + (bgColor.r * (1 - finalAlpha))),
                g: Math.round((fgColor.g * finalAlpha) + (bgColor.g * (1 - finalAlpha))),
                b: Math.round((fgColor.b * finalAlpha) + (bgColor.b * (1 - finalAlpha))),
            };
        }

        const textLuminance = getLuminance(finalFgColor.r, finalFgColor.g, finalFgColor.b);
        const bgLuminance = getLuminance(bgColor.r, bgColor.g, bgColor.b);

        if (isNaN(textLuminance) || isNaN(bgLuminance)) {
            return { ratio: 0, passedAA: false, passedAAA: false };
        }

        const ratio = getContrastRatio(textLuminance, bgLuminance);
        const passedAA = ratio >= 4.5;
        const passedAAA = ratio >= 7;

        return {
            ratio: ratio.toFixed(2),
            passedAA: passedAA,
            passedAAA: passedAAA
        };
    }

    // Main hover logic
    let lastTarget = null;
    document.addEventListener('mouseover', function (e) {
        if (!window.inspectaIsActive || !window.inspectaInfoPopoverActive || window.previewMode) return;
        const el = e.target;
        if (!isValidTarget(el)) return;
        removePopover();
        lastTarget = el;
        const popover = createPopover(el);
        getPopoverRoot().appendChild(popover);
        positionPopover(popover, el);
        // Hide pink hover overlay always
        if (window.inspectaHoverOverlay) {
            window.inspectaHoverOverlay.style.display = 'none';
        }
        // Hide blue selected overlay only if hovering the selected element
        if (el === window.inspectaCurrentlySelected && window.inspectaSelectedOverlay) {
            window.inspectaSelectedOverlay.style.display = 'none';
        }
    }, true);

    document.addEventListener('mouseout', function (e) {
        if (!window.inspectaIsActive || !window.inspectaInfoPopoverActive || window.previewMode) {
            removePopover();
            return;
        }
        if (!lastTarget) return;
        // Only remove if leaving the same element
        if (e.target === lastTarget) {
            removePopover();
            // Restore blue selected overlay if we were hiding it
            if (window.inspectaSelectedOverlay && lastTarget === window.inspectaCurrentlySelected) {
                window.inspectaSelectedOverlay.style.display = 'block';
            }
            lastTarget = null;
        }
    }, true);

})(); 