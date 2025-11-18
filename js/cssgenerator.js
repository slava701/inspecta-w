let cssRulesJson = {};

function toggleStoreCSS(isApplyChanges) {
    isStoreCss = isApplyChanges;
    window.isStoreCss = isStoreCss; // Update global reference
    if (isStoreCss) {
        saveCSS();
    } else {
        removeCSS();
    }
}

// Sync CSS from storage
function syncCSS() {
    return new Promise((resolve) => {
        const hostname = window.location.hostname;
        chrome.storage.local.get([hostname + '_cssRulesJson'], function (result) {
            if (result[hostname + '_cssRulesJson']) {
                cssRulesJson = result[hostname + '_cssRulesJson'];
                window.cssRulesJson = cssRulesJson; // Make sure global object is updated

                // Ensure stylesheet exists
                let inspectaStylesheet = document.getElementById('inspectaStylesheet');
                if (!inspectaStylesheet) {
                    inspectaStylesheet = document.createElement('style');
                    inspectaStylesheet.id = 'inspectaStylesheet';
                    document.head.appendChild(inspectaStylesheet);
                }

                // Wait for stylesheet to be ready before applying rules
                const waitForStylesheet = setInterval(() => {
                    if (inspectaStylesheet.sheet) {
                        clearInterval(waitForStylesheet);

                        // Re-apply all stored CSS rules
                        for (let selector in cssRulesJson) {
                            const ruleData = cssRulesJson[selector];
                            // Handle Global Color Changes
                            if (ruleData.additionalInfo?.isGlobalColorChange) {
                                Object.entries(ruleData).forEach(([prop, details]) => {
                                    if (prop !== 'additionalInfo' && details.originalColor && details.enabled) {
                                        // Determine the correct property to check (background-color, color, border-color)
                                        let cssPropertyToCheck;
                                        if (prop === 'background') {
                                            cssPropertyToCheck = 'background-color';
                                        } else if (prop === 'border') {
                                            cssPropertyToCheck = 'border-color';
                                        } else {
                                            cssPropertyToCheck = prop;
                                        }

                                        const globalChangeClass = `inspecta-global-color-${details.originalColor.replace('#', '')}-${prop.replace(/[^a-zA-Z]/g, '')}`;

                                        // Re-apply class to matching elements
                                        document.querySelectorAll('body *').forEach(el => {
                                            try {
                                                const styles = getComputedStyle(el);
                                                const currentColor = rgba2hex(styles[cssPropertyToCheck], false).toUpperCase();
                                                if (currentColor === details.originalColor.toUpperCase()) {
                                                    el.classList.add(globalChangeClass);
                                                }
                                            } catch (e) { /* Ignore elements that cause errors */ }
                                        });

                                        // Re-apply the CSS rule for the class
                                        let safeValue = details.value;
                                        if (Array.isArray(safeValue)) {
                                            safeValue = safeValue[0] || '';
                                        }
                                        if (typeof safeValue === 'object' && safeValue !== null) {
                                            safeValue = '';
                                        }
                                        applyCssRule(`.${globalChangeClass}`, cssPropertyToCheck, safeValue);
                                    }
                                });
                            } else if (ruleData.additionalInfo?.isGlobalFontChange) {
                                // Handle Global Font Changes - Just restore CSS rules, don't scan for elements
                                // The CSS rules will automatically apply to elements that have the class
                                const fontFamily = ruleData['font-family'];
                                const fontSize = ruleData['font-size'];
                                const lineHeight = ruleData['line-height'];
                                const fontWeight = ruleData['font-weight'];

                                // Only proceed if all font properties are enabled and we have the original font key
                                if (fontFamily?.enabled && fontSize?.enabled && lineHeight?.enabled && fontWeight?.enabled &&
                                    fontFamily?.originalFontKey && fontSize?.originalFontKey && lineHeight?.originalFontKey && fontWeight?.originalFontKey) {

                                    const globalChangeClass = `inspecta-global-font-${fontFamily.originalFontKey}`;

                                    // Re-apply the CSS rules for all properties
                                    if (fontSize.value && fontSize.value !== fontSize.originalValue) {
                                        applyCssRule(`.${globalChangeClass}`, 'font-size', fontSize.value);
                                    }
                                    if (fontFamily.value && fontFamily.value !== fontFamily.originalValue) {
                                        applyCssRule(`.${globalChangeClass}`, 'font-family', fontFamily.value);
                                    }
                                    if (lineHeight.value && lineHeight.value !== lineHeight.originalValue) {
                                        applyCssRule(`.${globalChangeClass}`, 'line-height', lineHeight.value);
                                    }
                                    if (fontWeight.value && fontWeight.value !== fontWeight.originalValue) {
                                        applyCssRule(`.${globalChangeClass}`, 'font-weight', fontWeight.value);
                                    }
                                }
                            } else { // Handle Standard CSS Rules
                                for (let property in ruleData) {
                                    if (property !== 'additionalInfo' && ruleData[property].enabled) {
                                        let propValue = ruleData[property].value;
                                        if (Array.isArray(propValue)) {
                                            propValue = propValue[0] || '';
                                        }
                                        if (typeof propValue === 'object' && propValue !== null) {
                                            propValue = '';
                                        }
                                        applyCssRule(selector, property, propValue);
                                    }
                                }
                            }
                        }

                        // Update the UI
                        if (typeof generateInspectaFullCss === 'function') generateInspectaFullCss();
                        if (typeof generateCssChangesCounter === 'function') generateCssChangesCounter();

                        // Refresh the overview to show the restored colors
                        if (typeof clearAndRefreshOverview === 'function') {
                            clearAndRefreshOverview();
                        }

                        // Ensure property change indicators are updated after CSS restoration
                        setTimeout(() => {
                            if (typeof window.updatePropertyChangeIndicators === 'function') {
                                window.updatePropertyChangeIndicators();
                            }
                        }, 100);

                        resolve(); // Resolve promise after all rules are applied
                    }
                }, 50); // Check every 50ms

                // Failsafe timeout
                setTimeout(() => {
                    clearInterval(waitForStylesheet);
                    resolve(); // Resolve anyway after a timeout to prevent blocking
                }, 2000);

            } else {
                resolve(); // Resolve if there are no stored rules
            }
        });
    });
}

// Save CSS
function saveCSS() {
    const inspectaStylesheet = document.getElementById('inspectaStylesheet');
    const cssHtml = stylesheetToCssHtml(inspectaStylesheet.sheet);
    chrome.storage.local.set({ [hostname]: cssHtml }, function () {
        // Notify Styles saved.
        // ('Style changes saved');
    });
    saveCssJSONRules();
}
function saveCssJSONRules() {
    chrome.storage.local.set({ [hostname + '_cssRulesJson']: cssRulesJson }, function () {
        // Notify Styles saved.
        // ('Style changes saved');
    });
}
// Delete CSS from storage
function removeCSS() {
    chrome.storage.local.remove([hostname], function () {
        // ('Removed Styles from Store');
    });
    chrome.storage.local.remove([hostname + '_cssRulesJson'], function () {
        // ('Removed Styles_cssRulesJson from Store');
    });
    chrome.storage.local.remove([hostname + '_globalColorChanges'], function () {
        // ('Removed Global Color Changes from Store');
    });
}

//---------------------------

function cssTextToStyleObject2(cssText, ruleSelector) {
    const styleObject = {};
    const declarations = cssText.split(';');

    for (let declaration of declarations) {
        const [property, value] = declaration.split(':').map(str => str.trim());

        if (property && value) {
            styleObject[property] = value;
            cssRulesJson[ruleSelector] = cssRulesJson[ruleSelector] || {};
            cssRulesJson[ruleSelector][property] = {
                value: value,
                enabled: true // Assuming all properties are enabled by default
            };
        }
    }

    return styleObject;
}
//-----------------------------

function removeInlineStyle(target, property) {
    // Remove the main property
    target.style.removeProperty(property);
    // Remove sub-properties for shorthands
    switch (property) {
        case 'border':
            ['border-top', 'border-right', 'border-bottom', 'border-left',
                'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
                'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
                'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color'].forEach(p => target.style.removeProperty(p));
            break;
        case 'background':
            ['background-color', 'background-image', 'background-position', 'background-size', 'background-repeat', 'background-attachment', 'background-clip', 'background-origin'].forEach(p => target.style.removeProperty(p));
            break;
        case 'font':
            ['font-style', 'font-variant', 'font-weight', 'font-size', 'line-height', 'font-family'].forEach(p => target.style.removeProperty(p));
            break;
        case 'outline':
            ['outline-color', 'outline-style', 'outline-width'].forEach(p => target.style.removeProperty(p));
            break;
        case 'margin':
            ['margin-top', 'margin-right', 'margin-bottom', 'margin-left'].forEach(p => target.style.removeProperty(p));
            break;
        case 'padding':
            ['padding-top', 'padding-right', 'padding-bottom', 'padding-left'].forEach(p => target.style.removeProperty(p));
            break;
        case 'text-decoration':
            ['text-decoration-line', 'text-decoration-style', 'text-decoration-color'].forEach(p => target.style.removeProperty(p));
            break;
    }
}

// Patch onCssPropertyChange to remove inline style
function onCssPropertyChange(e) {
    const target = e.target;
    const isChecked = target.checked;
    const rule = target.getAttribute('rule');
    const key = target.getAttribute('key');
    const value = target.getAttribute('cssValue');

    if (isChecked) {
        generateInspectaCss(key, value, true, false, rule, true, false);
    } else {
        // Only disable, do not clear value
        updateCssRulesJson(rule, key, value, false, false);
        // Remove from stylesheet and element for preview only, but do NOT update cssRulesJson value
        applyCssRule(rule, key, ''); // Only update the stylesheet, not the data
        if (window.inspectaStyledElements) {
            window.inspectaStyledElements.forEach(el => {
                if (el.matches(rule)) {
                    el.style.setProperty(key, '');
                }
            });
        }
    }

    // Always update main checkbox state for this rule
    const mainCheckbox = $id('change_rule_checkbox' + rule);
    const customCheckboxBox = mainCheckbox ? mainCheckbox.parentElement.querySelector('.custom-checkbox-box') : null;
    let total = 0;
    let checked = 0;
    for (let key in cssRulesJson[rule]) {
        if (key === 'additionalInfo') continue;
        const property = cssRulesJson[rule][key];
        if (!property.value || String(property.value).trim() === '') continue;
        total++;
        if (property.enabled) checked++;
    }
    if (mainCheckbox) {
        mainCheckbox.checked = checked === total && total > 0;
        mainCheckbox.indeterminate = checked > 0 && checked < total;
        if (customCheckboxBox) {
            customCheckboxBox.classList.toggle('indeterminate', mainCheckbox.indeterminate);
        }
    }

    saveCSS();
    generateCssChangesCounter();

    // Sync dots with CSS changes panel
    setTimeout(() => {
        if (typeof window.syncDotsWithCssChanges === 'function') {
            window.syncDotsWithCssChanges();
        }
    }, 50);
}

const uncheckedProperties = [];
function isAllPropertiesUnChecked(cssRuleSelectorText) {
    if (!cssRulesJson[cssRuleSelectorText]) return false;
    let hasProperty = false;
    for (let key in cssRulesJson[cssRuleSelectorText]) {
        if (key === 'additionalInfo') continue;
        const property = cssRulesJson[cssRuleSelectorText][key];
        if (!property.value || String(property.value).trim() === '') continue;
        hasProperty = true;
        if (property.enabled) return false;
    }
    return hasProperty;
}
function isAllPropertiesChecked(cssRuleSelectorText) {
    if (!cssRulesJson[cssRuleSelectorText]) return false;
    let hasProperty = false;
    for (let key in cssRulesJson[cssRuleSelectorText]) {
        if (key === 'additionalInfo') continue;
        const property = cssRulesJson[cssRuleSelectorText][key];
        if (!property.value || String(property.value).trim() === '') continue;
        hasProperty = true;
        if (!property.enabled) return false;
    }
    return hasProperty;
}
function onRuleChange(e) {
    isBatchUpdating = true;
    const target = e.target;
    const isChecked = target.checked;
    const rule = target.getAttribute('rule');

    // Special handling for global color changes
    if (cssRulesJson[rule]?.additionalInfo?.isGlobalColorChange) {
        // For global color changes, enable/disable the entire rule
        Object.keys(cssRulesJson[rule]).forEach(key => {
            if (key !== 'additionalInfo') {
                cssRulesJson[rule][key].enabled = isChecked;
            }
        });

        // Use the existing generateGlobalColorChange function
        Object.entries(cssRulesJson[rule]).forEach(([prop, details]) => {
            if (prop !== 'additionalInfo' && details.originalColor) {
                const globalChangeClass = `inspecta-global-color-${details.originalColor.replace('#', '')}-${prop.replace('-', '')}`;

                // Map the property name to the correct CSS property
                let cssProperty = prop;
                if (prop === 'background') cssProperty = 'background-color';
                if (prop === 'border-color') cssProperty = 'border-color';
                if (prop === 'color') cssProperty = 'color';

                if (isChecked) {
                    // Re-apply the global color change
                    // First, find and add the class to matching elements
                    const allElements = document.querySelectorAll('body *');
                    let foundElements = 0;
                    let checkedElements = 0;
                    allElements.forEach(el => {
                        const styles = getComputedStyle(el);
                        let matches = false;
                        let currentColor = '';

                        if (cssProperty === 'background-color' && styles.backgroundColor !== 'rgba(0, 0, 0, 0)') {
                            currentColor = rgba2hex(styles.backgroundColor, false);
                            checkedElements++;
                            if (currentColor.toLowerCase() === details.originalColor.toLowerCase()) {
                                matches = true;
                            }
                        } else if (cssProperty === 'color' && styles.color !== 'rgba(0, 0, 0, 0)') {
                            currentColor = rgba2hex(styles.color, false);
                            checkedElements++;
                            if (currentColor.toLowerCase() === details.originalColor.toLowerCase()) {
                                matches = true;
                            }
                        } else if (cssProperty === 'border-color' && styles.borderColor !== 'rgba(0, 0, 0, 0)') {
                            currentColor = rgba2hex(styles.borderColor, false);
                            checkedElements++;
                            if (currentColor.toLowerCase() === details.originalColor.toLowerCase()) {
                                matches = true;
                            }
                        }

                        if (matches) {
                            el.classList.add(globalChangeClass);
                            el.style.removeProperty(cssProperty);
                            foundElements++;
                        }
                    });

                    // Then add the CSS rule
                    const inspectaStylesheet = document.getElementById('inspectaStylesheet').sheet;
                    const cssRule = `.${globalChangeClass} { ${cssProperty}: ${details.value}; }`;
                    try {
                        inspectaStylesheet.insertRule(cssRule, inspectaStylesheet.cssRules.length);
                    } catch (error) {
                        console.error(`Error adding CSS rule: ${error}`);
                    }

                    // Force a reflow to ensure styles are updated
                    document.body.offsetHeight;
                } else {
                    // Remove the global color change by removing the class from elements
                    const elements = document.querySelectorAll(`.${globalChangeClass}`);
                    elements.forEach(el => {
                        el.classList.remove(globalChangeClass);
                        // Also remove any inline styles that might have been set
                        el.style.removeProperty(prop);
                    });

                    // Remove the CSS rule
                    const inspectaStylesheet = document.getElementById('inspectaStylesheet').sheet;
                    for (let i = 0; i < inspectaStylesheet.cssRules.length; i++) {
                        if (inspectaStylesheet.cssRules[i].selectorText === `.${globalChangeClass}`) {
                            inspectaStylesheet.deleteRule(i);
                            break;
                        }
                    }

                    // Force a reflow to ensure styles are updated
                    document.body.offsetHeight;
                }
            }
        });

        saveCSS();
        generateCssChangesCounter();
        isBatchUpdating = false;
        return;
    }

    // Special handling for global font changes
    if (cssRulesJson[rule]?.additionalInfo?.isGlobalFontChange) {
        // Get the global change class from the stored info
        const globalChangeClass = cssRulesJson[rule].additionalInfo.customClassName;

        if (globalChangeClass) {
            // Set enabled state for all font properties
            Object.keys(cssRulesJson[rule]).forEach(key => {
                if (key !== 'additionalInfo') {
                    cssRulesJson[rule][key].enabled = isChecked;
                }
            });

            if (isChecked) {

                // Get the font properties from the rule
                const fontFamily = cssRulesJson[rule]['font-family'];
                const fontSize = cssRulesJson[rule]['font-size'];
                const lineHeight = cssRulesJson[rule]['line-height'];
                const fontWeight = cssRulesJson[rule]['font-weight'];

                // Find elements with the original font and add the class back
                const allElements = document.querySelectorAll('body *');
                let elementsFound = 0;

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

                    // Check if element has any text content
                    const hasTextContent = el.textContent && el.textContent.trim().length > 0;
                    if (!hasTextContent) return;

                    const styles = getComputedStyle(el);

                    // Check if this element uses the specified font combination
                    const elementFontFamily = styles.fontFamily.split(',')[0].trim().replace(/['"]/g, '');
                    const elementFontSize = styles.fontSize;
                    const elementLineHeight = styles.lineHeight;
                    const elementFontWeight = styles.fontWeight;

                    // Clean up the target font family for comparison
                    const targetFontFamily = fontFamily.originalValue.split(',')[0].trim().replace(/['"]/g, '');

                    // Check if font properties match using proper comparison
                    const familyMatches = elementFontFamily.toLowerCase() === targetFontFamily.toLowerCase();
                    const sizeMatches = compareFontValues(elementFontSize, fontSize.originalValue);
                    const lineHeightMatches = compareFontValues(elementLineHeight, lineHeight.originalValue);
                    const weightMatches = elementFontWeight === fontWeight.originalValue;

                    if (familyMatches && sizeMatches && lineHeightMatches && weightMatches) {
                        el.classList.add(globalChangeClass);
                        elementsFound++;
                    }
                });

                // Re-add the CSS rules
                const cssSelector = `.${globalChangeClass}`;

                // Collect all font properties that need to be applied
                const fontProperties = [];
                if (fontSize.value && fontSize.value !== fontSize.originalValue) {
                    fontProperties.push(`font-size: ${fontSize.value}`);
                }
                if (fontFamily.value && fontFamily.value !== fontFamily.originalValue) {
                    fontProperties.push(`font-family: ${fontFamily.value}`);
                }
                if (lineHeight.value && lineHeight.value !== lineHeight.originalValue) {
                    fontProperties.push(`line-height: ${lineHeight.value}`);
                }
                if (fontWeight.value && fontWeight.value !== fontWeight.originalValue) {
                    fontProperties.push(`font-weight: ${fontWeight.value}`);
                }

                // Apply all properties in a single CSS rule
                if (fontProperties.length > 0) {
                    const stylesheet = document.getElementById('inspectaStylesheet');
                    if (stylesheet && stylesheet.sheet) {
                        // Remove any existing rule for this selector
                        const rules = stylesheet.sheet.cssRules;
                        for (let i = rules.length - 1; i >= 0; i--) {
                            if (rules[i].selectorText === cssSelector) {
                                stylesheet.sheet.deleteRule(i);
                            }
                        }

                        // Create a single rule with all properties
                        const cssRule = `${cssSelector} { ${fontProperties.join('; ')}; }`;
                        try {
                            stylesheet.sheet.insertRule(cssRule, stylesheet.sheet.cssRules.length);
                        } catch (e) {
                            console.error('Failed to insert font rule:', e);
                        }
                    }
                }

                // Force a reflow to ensure styles are updated
                document.body.offsetHeight;
            } else {
                // Check if we have a previous state to revert to
                const previousState = cssRulesJson[rule].additionalInfo.previousState;

                if (previousState) {

                    // Apply the previous state as a new global font change
                    const fontFamily = cssRulesJson[rule]['font-family'];
                    const fontSize = cssRulesJson[rule]['font-size'];
                    const lineHeight = cssRulesJson[rule]['line-height'];
                    const fontWeight = cssRulesJson[rule]['font-weight'];

                    // Create a new global font change from true original to previous state
                    if (typeof window.generateGlobalFontChange === 'function') {
                        window.generateGlobalFontChange(
                            fontFamily.originalValue,
                            fontSize.originalValue,
                            lineHeight.originalValue,
                            fontWeight.originalValue,
                            previousState.fontFamily,
                            previousState.fontSize,
                            previousState.lineHeight,
                            previousState.fontWeight,
                            'all'
                        );
                    }
                } else {
                    // Find elements with the global font class and remove it
                    const elementsWithClass = document.querySelectorAll(`.${globalChangeClass}`);

                    elementsWithClass.forEach((el, index) => {
                        el.classList.remove(globalChangeClass);
                    });

                    // Remove the CSS rules from stylesheet
                    const inspectaStylesheet = document.getElementById('inspectaStylesheet').sheet;
                    let rulesRemoved = 0;
                    const cssSelector = `.${globalChangeClass}`;
                    for (let i = inspectaStylesheet.cssRules.length - 1; i >= 0; i--) {
                        const rule = inspectaStylesheet.cssRules[i];
                        if (rule.selectorText === cssSelector) {
                            inspectaStylesheet.deleteRule(i);
                            rulesRemoved++;
                        }
                    }

                    // Force a reflow to ensure styles are updated
                    document.body.offsetHeight;
                }
            }
        } else {
            console.log('❌ No global change class found');
        }

        saveCSS();
        generateCssChangesCounter();

        // Sync dots with CSS changes panel
        setTimeout(() => {
            if (typeof window.syncDotsWithCssChanges === 'function') {
                window.syncDotsWithCssChanges();
            }
        }, 50);

        isBatchUpdating = false;
        return;
    }

    // Handle regular CSS property changes
    const changeItem = target.closest('.change_item');
    const properties = changeItem ? changeItem.querySelectorAll('.css_change_property input[type="checkbox"]') : [];
    for (let i = 0; i < properties.length; i++) {
        const property = properties[i];
        property.checked = isChecked;
        onCssPropertyChange({ target: property });
    }

    // Update indeterminate state and '-' class after batch in onRuleChange
    setTimeout(() => {
        const mainCheckbox = $id('change_rule_checkbox' + rule);
        const customCheckboxBox = mainCheckbox ? mainCheckbox.parentElement.querySelector('.custom-checkbox-box') : null;
        let total = 0;
        let checked = 0;
        for (let key in cssRulesJson[rule]) {
            if (key === 'additionalInfo') continue;
            const property = cssRulesJson[rule][key];
            if (!property.value || String(property.value).trim() === '') continue;
            total++;
            if (property.enabled) checked++;
        }
        if (mainCheckbox) {
            mainCheckbox.checked = checked === total && total > 0;
            mainCheckbox.indeterminate = checked > 0 && checked < total;
            if (customCheckboxBox) {
                customCheckboxBox.classList.toggle('indeterminate', mainCheckbox.indeterminate);
            }
        }
    }, 0);
}

function onRuleDeleteClick(e) {
    const target = e.target;
    const rule = target.getAttribute('rule');
    const checkbx = $id('change_rule_checkbox' + rule);
    checkbx.checked = false;
    onRuleChange({ target: checkbx });

    // Special handling for global color changes
    if (cssRulesJson[rule]?.additionalInfo?.isGlobalColorChange) {
        // Get the original color from the global color change
        let originalColor = null;
        for (let prop in cssRulesJson[rule]) {
            if (prop !== 'additionalInfo' && cssRulesJson[rule][prop]?.originalColor) {
                originalColor = cssRulesJson[rule][prop].originalColor;
                break;
            }
        }

        if (originalColor) {
            // Remove all global color classes from all elements
            const allElements = document.querySelectorAll('body *');
            const properties = ['background-color', 'color', 'border-color'];

            properties.forEach(prop => {
                const className = `inspecta-global-color-${originalColor.replace('#', '')}-${prop.replace(/[^a-zA-Z]/g, '')}`;
                allElements.forEach(el => {
                    if (el.classList.contains(className)) {
                        el.classList.remove(className);
                    }
                });
            });

            // Remove all related CSS rules from stylesheet
            const inspectaStylesheet = document.getElementById('inspectaStylesheet')?.sheet;
            if (inspectaStylesheet) {
                for (let i = inspectaStylesheet.cssRules.length - 1; i >= 0; i--) {
                    const rule = inspectaStylesheet.cssRules[i];
                    if (rule.selectorText && rule.selectorText.includes(`inspecta-global-color-${originalColor.replace('#', '')}`)) {
                        inspectaStylesheet.deleteRule(i);
                    }
                }
            }
        }
    }

    // Special handling for global font changes
    if (cssRulesJson[rule]?.additionalInfo?.isGlobalFontChange) {
        // Get the original font key from the global font change
        let originalFontKey = null;
        for (let prop in cssRulesJson[rule]) {
            if (prop !== 'additionalInfo' && cssRulesJson[rule][prop]?.originalFontKey) {
                originalFontKey = cssRulesJson[rule][prop].originalFontKey;
                break;
            }
        }

        if (originalFontKey) {
            // Remove all global font classes from all elements
            const allElements = document.querySelectorAll('body *');
            const globalFontClassPattern = `inspecta-global-font-${originalFontKey}`;
            allElements.forEach(el => {
                const classes = Array.from(el.classList);
                classes.forEach(cls => {
                    if (cls.startsWith(globalFontClassPattern)) {
                        el.classList.remove(cls);
                    }
                });
            });

            // Remove all related CSS rules from stylesheet
            const inspectaStylesheet = document.getElementById('inspectaStylesheet')?.sheet;
            if (inspectaStylesheet) {
                for (let i = inspectaStylesheet.cssRules.length - 1; i >= 0; i--) {
                    const rule = inspectaStylesheet.cssRules[i];
                    if (rule.selectorText && rule.selectorText.includes(`inspecta-global-font-${originalFontKey}`)) {
                        inspectaStylesheet.deleteRule(i);
                    }
                }
            }
        }
    }

    delete cssRulesJson[rule];
    const updatedCssRulesJson = {};
    for (let key in cssRulesJson) {
        if (key !== rule) {
            updatedCssRulesJson[key] = cssRulesJson[key];
        }
    }
    cssRulesJson = updatedCssRulesJson;

    // Remove the main rule from stylesheet
    const inspectaStylesheet = document.getElementById('inspectaStylesheet').sheet;
    for (let i = 0; i < inspectaStylesheet.cssRules.length; i++) {
        if (inspectaStylesheet.cssRules[i].selectorText === rule) {
            inspectaStylesheet.deleteRule(i);
            break;
        }
    }

    saveCSS();
    generateInspectaFullCss();
    generateCssChangesCounter();

    // Force update property change indicators to clear dots for deleted rules
    setTimeout(() => {
        if (typeof window.updatePropertyChangeIndicators === 'function') {
            window.updatePropertyChangeIndicators();
        }
    }, 100);

    // Refresh overview thumbnails to show original colors after rule deletion
    if (typeof clearAndRefreshOverview === 'function') {
        clearAndRefreshOverview();
        // Update mismatch indicators after overview is refreshed
        setTimeout(() => {
            if (typeof window.updateColorMismatchUI === 'function') {
                window.updateColorMismatchUI();
            }
        }, 100);
    }
}
function scrollToElement(element) {
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}
function getRuleActionButtons(cssRule) {
    const actionPanel = document.createElement('div');
    const deleteRule = document.createElement('div');
    const copyRule = document.createElement('div');
    const aiCopyRule = document.createElement('div');
    const selectTarget = document.createElement('div');

    // Set up select target button
    selectTarget.classList.add('select_target');
    selectTarget.id = 'select_target';
    selectTarget.innerHTML = `<svg class="icon-16 icon-fill" style="pointer-events:none">
                        <use href="#ic_target"></use>
                    </svg>`;
    selectTarget.classList.add('action_icon');
    selectTarget.setAttribute('rule', cssRule.selectorText);
    selectTarget.setAttribute('target-element-classname', cssRulesJson[cssRule.selectorText].additionalInfo.customClassName);
    selectTarget.addEventListener('click', function (e) {
        const targetElementClassname = e.target.getAttribute('target-element-classname');
        const targetRule = e.target.getAttribute('rule');
        const element = document.querySelector(targetRule);
        // Only select the element and scroll, do NOT switch panels
        if (element) {
            window.target = element; // update global target
            selectElementForInspecta(element); // highlight selection
            scrollToElement(element);
            // Do NOT call showProperties() or change panel visibility
            // Optionally, you can update the header or other UI as needed
        }
        e.stopPropagation();
        e.preventDefault();
    });

    actionPanel.appendChild(selectTarget);

    actionPanel.classList.add('action_panel');

    // Set up copy rule button
    copyRule.classList.add('copy_rule');
    copyRule.id = 'copy_rule';
    copyRule.innerHTML = `<svg class="icon-16 icon-fill" style="pointer-events:none">
                        <use href="#ic_clipboard"></use>
                    </svg>`;
    copyRule.classList.add('action_icon');
    copyRule.setAttribute('rule', cssRule.selectorText);
    copyRule.addEventListener('click', function (e) {
        const rule = e.target.getAttribute('rule');
        const cssText = generateCssRuleTextForExport(rule);
        navigator.clipboard.writeText(cssText);
        if (window.showToast) window.showToast('Copied to clipboard');
    });

    // Set up AI copy rule button
    aiCopyRule.classList.add('ai_copy_rule');
    aiCopyRule.id = 'ai_copy_rule';
    aiCopyRule.innerHTML = `<svg class="icon-16 icon-fill" style="pointer-events:none">
                        <use href="#ic_ai"></use>
                    </svg>`;
    aiCopyRule.classList.add('action_icon');
    aiCopyRule.setAttribute('rule', cssRule.selectorText);
    aiCopyRule.addEventListener('click', function (e) {
        const rule = e.target.getAttribute('rule');
        copyToAI(rule);
    });

    // Set up Send to Cursor button
    const sendToCursorRule = document.createElement('div');
    sendToCursorRule.classList.add('send_to_cursor_rule');
    sendToCursorRule.id = 'send_to_cursor_rule';
    sendToCursorRule.innerHTML = `<svg class="icon-16 icon-fill" style="pointer-events:none">
                        <use href="#ic_cursor"></use>
                    </svg>`;
    sendToCursorRule.classList.add('action_icon');
    sendToCursorRule.setAttribute('rule', cssRule.selectorText);
    sendToCursorRule.addEventListener('click', function (e) {
        const rule = e.target.getAttribute('rule');
        sendToCursorSingleRule(rule);
    });

    // Set up delete rule button
    deleteRule.classList.add('delete_rule');
    deleteRule.id = 'delete_rule';
    deleteRule.innerHTML = `<svg class="icon-16 icon-fill" style="pointer-events:none">
                        <use href="#ic_delete"></use>
                    </svg>`;
    deleteRule.classList.add('action_icon');
    deleteRule.addEventListener('click', onRuleDeleteClick);
    deleteRule.setAttribute('rule', cssRule.selectorText);

    actionPanel.appendChild(copyRule);
    actionPanel.appendChild(aiCopyRule);
    actionPanel.appendChild(sendToCursorRule);
    actionPanel.appendChild(deleteRule);

    // Initialize tooltips for these buttons after they're added to the DOM
    setTimeout(() => {
        if (window.tooltipManager) {
            initializeActionButtonTooltips(actionPanel);
        }
        // Update Send to Cursor button states based on localhost
        updateSendToCursorButtons();
    }, 50);

    // Also update immediately for this specific button
    setTimeout(() => {
        const sendToCursorButton = actionPanel.querySelector('.send_to_cursor_rule');
        if (sendToCursorButton) {
            const isLocal = isLocalhost();
            if (isLocal) {
                sendToCursorButton.classList.remove('disabled');
                sendToCursorButton.removeAttribute('disabled');
                sendToCursorButton.style.opacity = '1';
            } else {
                // Keep button looking normal but mark as disabled for tooltip
                sendToCursorButton.classList.add('disabled');
                sendToCursorButton.removeAttribute('disabled'); // Keep it clickable
                sendToCursorButton.style.opacity = '1'; // Keep full opacity - no visual disabling
            }
        }
    }, 10);

    return actionPanel;
}

/**
 * Initialize tooltips for action buttons in CSS changes panel
 * @param {HTMLElement} actionPanel - The action panel containing the buttons
 */
function initializeActionButtonTooltips(actionPanel) {
    const isLocal = isLocalhost();
    const tooltipConfig = {
        'select_target': 'Select Element',
        'copy_rule': 'Copy CSS Rule',
        'ai_copy_rule': 'Copy for AI',
        'send_to_cursor_rule': isLocal ? 'Send to Cursor' : 'Send to Cursor only works on localhost',
        'delete_rule': 'Delete Rule'
    };

    Object.entries(tooltipConfig).forEach(([buttonId, tooltipText]) => {
        const button = actionPanel.querySelector(`#${buttonId}`);
        if (button && !button.querySelector('.tooltip')) {
            const tooltip = document.createElement('div');

            // All tooltips appear from the bottom like the collapse panel
            tooltip.className = 'tooltip tooltip-bottom';

            tooltip.textContent = tooltipText;

            // Append tooltip as a child of the button
            button.appendChild(tooltip);

            // Add hover effects
            button.addEventListener('mouseenter', () => {
                tooltip.style.opacity = '1';
            });

            button.addEventListener('mouseleave', () => {
                tooltip.style.opacity = '0';
            });

            // Set relative positioning for proper tooltip placement
            button.style.position = 'relative';
        }
    });
}

// Function to delete a specific property from a rule
function deletePropertyFromRule(rule, property) {
    console.log(`deletePropertyFromRule called: ${rule}, ${property}`);
    console.log('cssRulesJson[rule]:', cssRulesJson[rule]);

    if (!cssRulesJson[rule] || !cssRulesJson[rule][property]) {
        console.log('Property not found in cssRulesJson');
        return;
    }

    // Get the original value before deleting
    const originalValue = cssRulesJson[rule][property].originalValue;
    console.log(`Original value for ${property}: ${originalValue}`);

    // Check if we're in isolation mode
    const isInIsolationMode = window.target && window.target.closest('#inspecta_isolation_wrapper');

    // Remove the property from cssRulesJson
    delete cssRulesJson[rule][property];

    // Check if the rule is now empty
    const remainingProperties = Object.keys(cssRulesJson[rule]).filter(key => key !== 'additionalInfo');
    if (remainingProperties.length === 0) {
        delete cssRulesJson[rule];
    }

    // Remove the CSS rule from the stylesheet
    removeCssRule(rule, property);

    // Handle inline style removal - use the proper removeInlineStyle function
    if (window.target && typeof window.removeInlineStyle === 'function') {
        // Use removeInlineStyle to properly handle shorthand properties
        window.removeInlineStyle(window.target, property);
    }

    // Restore the original value to the UI input
    restoreOriginalValueToUI(property, originalValue);

    // Update the UI
    generateInspectaFullCss();
    generateCssChangesCounter();

    // Update property change indicators
    if (typeof window.updatePropertyChangeIndicators === 'function') {
        setTimeout(() => {
            window.updatePropertyChangeIndicators();
        }, 200);
    }

    // Save changes
    saveCSS();
    saveCssJSONRules();
}

// Remove a specific CSS rule from the stylesheet
function removeCssRule(selector, propertyName) {
    const stylesheet = document.getElementById('inspectaStylesheet');
    if (!stylesheet || !stylesheet.sheet) {
        console.warn('Inspecta stylesheet not found');
        return;
    }

    const rules = stylesheet.sheet.cssRules;
    let ruleRemoved = false;

    for (let i = rules.length - 1; i >= 0; i--) {
        const rule = rules[i];
        if (rule.selectorText === selector) {
            if (rule.style.getPropertyValue(propertyName)) {
                rule.style.removeProperty(propertyName);
                if (rule.style.length === 0) {
                    stylesheet.sheet.deleteRule(i);
                }
                ruleRemoved = true;
            }
        }
    }

    if (!ruleRemoved) {
        console.warn(`CSS rule for property ${propertyName} not found in stylesheet`);
    }
}
/**
 * Generate Inspecta full Style sheet
 * */
function displayColorAsHex(value) {
    if (typeof value !== 'string') return value;
    if (value.startsWith('rgba') || value.startsWith('rgb')) {
        // Use rgba2hexAdvanced from utils.js
        if (typeof rgba2hexAdvanced === 'function') {
            const hexObj = rgba2hexAdvanced(value);
            return hexObj.color + hexObj.opacity; // #RRGGBBAA
        }
    }
    // Already hex or named color
    return value;
}

// Helper: Normalize color values to hex
function normalizeColorValue(value) {
    if (typeof value !== 'string') return value;
    if (value.startsWith('rgba') || value.startsWith('rgb')) {
        if (typeof rgba2hexAdvanced === 'function') {
            const hexObj = rgba2hexAdvanced(value);
            return hexObj.color + (hexObj.opacity !== 'FF' ? hexObj.opacity : '');
        }
    }
    // Already hex or named color
    return value;
}

// Helper: Check if property is a color property
function isColorProperty(key) {
    return [
        'color', 'background-color', 'border-color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'box-shadow', 'outline-color', 'text-shadow', 'fill', 'stroke'
    ].some(colorProp => key.toLowerCase().includes(colorProp));
}

// Helper: Try to generate margin/padding/border shorthand
function getShorthandProperties(properties) {
    const result = { ...properties };
    // Margin & Padding
    ['margin', 'padding'].forEach((prop) => {
        const top = properties[prop + '-top']?.value;
        const right = properties[prop + '-right']?.value;
        const bottom = properties[prop + '-bottom']?.value;
        const left = properties[prop + '-left']?.value;
        if (
            top !== undefined && right !== undefined && bottom !== undefined && left !== undefined &&
            properties[prop + '-top'].enabled && properties[prop + '-right'].enabled && properties[prop + '-bottom'].enabled && properties[prop + '-left'].enabled
        ) {
            // All sides present and enabled
            const shorthand = `${top} ${right} ${bottom} ${left}`;
            result[prop] = { value: shorthand, enabled: true };
            // Remove long-form
            delete result[prop + '-top'];
            delete result[prop + '-right'];
            delete result[prop + '-bottom'];
            delete result[prop + '-left'];
        }
    });
    // Border
    if (
        properties['border-width'] && properties['border-style'] && properties['border-color'] &&
        properties['border-width'].enabled && properties['border-style'].enabled && properties['border-color'].enabled
    ) {
        const borderVal = `${properties['border-width'].value} ${properties['border-style'].value} ${normalizeColorValue(properties['border-color'].value)}`;
        result['border'] = { value: borderVal, enabled: true };
        delete result['border-width'];
        delete result['border-style'];
        delete result['border-color'];
    }
    return result;
}

function generateInspectaFullCss() {
    // debugger;
    createInspectaStylesheet('inspectaStylesheet')
    if (!document.getElementById('inspectaStylesheet')) {
        return
    }
    isFullCss = true;
    let CSS_CODE = '';
    const inspectaStylesheet = document.getElementById('inspectaStylesheet').sheet;
    const change_items = document.createElement('div');


    for (let selector in cssRulesJson) {
        if (!cssRulesJson.hasOwnProperty(selector)) continue;
        //Start rule with set css selector
        const change_item = document.createElement('div');
        change_item.className = 'change_item';

        const element_div = document.createElement('div');
        element_div.className = 'tag_name_panel'

        const incrementalNumberLabel = document.createElement('label');
        incrementalNumberLabel.innerText = '# ' + cssRulesJson[selector]?.additionalInfo?.incrementalNumber ?? '';
        incrementalNumberLabel.className = 'tag_name_change_number';
        element_div.appendChild(incrementalNumberLabel);

        const element_input = document.createElement('input');
        element_input.type = 'text'
        element_input.className = 'inspecta_tag_input';
        element_input.value = cssRulesJson[selector]?.additionalInfo?.customTagName ?? ''
        element_input.setAttribute('rule', selector);
        element_input.addEventListener('change', (e) => {
            const target = e.target;
            const rule = target.getAttribute('rule');
            cssRulesJson[rule].additionalInfo.customTagName = target.value;
            saveCssJSONRules();
        })
        element_div.appendChild(element_input);

        // Special handling for global color changes
        if (cssRulesJson[selector]?.additionalInfo?.isGlobalColorChange) {
            element_div.classList.add('global-color-change');
            // Set the input value to "Global color change"
            element_input.value = 'Global color change';
            element_input.readOnly = true;
        }

        // Special handling for global font changes
        if (cssRulesJson[selector]?.additionalInfo?.isGlobalFontChange) {
            element_div.classList.add('global-font-change');
            // Set the input value to "Global font change"
            element_input.value = 'Global font change';
            element_input.readOnly = true;
        }

        element_div.appendChild(getRuleActionButtons({ selectorText: selector }));
        change_item.appendChild(element_div);

        const change_el_name = document.createElement('div');
        const change_el_name_label = document.createElement('label');
        // Remove ".inspecta-inspect-isolated" from the selector for display
        const displaySelector = selector.replace(/\.inspecta-inspect-isolated/g, '');
        change_el_name_label.innerText = displaySelector.substring(displaySelector.lastIndexOf('>') + 1);

        change_el_name.className = 'change_el_name';

        // Add specific ID for global color changes
        if (cssRulesJson[selector]?.additionalInfo?.isGlobalColorChange) {
            change_el_name.id = 'global-color-change-el-name';
        }

        // Add specific ID for global font changes
        if (cssRulesJson[selector]?.additionalInfo?.isGlobalFontChange) {
            change_el_name.id = 'global-font-change-el-name';
        }

        const checkboxLabel = document.createElement('label');
        checkboxLabel.className = 'custom-checkbox';

        const change_rule_checkbox = document.createElement('input');
        change_rule_checkbox.type = 'checkbox';
        let total = 0;
        let checked = 0;
        for (let key in cssRulesJson[selector]) {
            if (key === 'additionalInfo') continue;
            const property = cssRulesJson[selector][key];
            if (!property.value || String(property.value).trim() === '') continue;
            total++;
            if (property.enabled) checked++;
        }
        change_rule_checkbox.checked = checked === total && total > 0;
        change_rule_checkbox.indeterminate = checked > 0 && checked < total;
        change_rule_checkbox.setAttribute('rule', selector);
        change_rule_checkbox.id = 'change_rule_checkbox' + selector;
        change_rule_checkbox.addEventListener('change', onRuleChange);

        const customCheckboxBox = document.createElement('span');
        customCheckboxBox.className = 'custom-checkbox-box';
        customCheckboxBox.classList.toggle('indeterminate', change_rule_checkbox.indeterminate);

        checkboxLabel.appendChild(change_rule_checkbox);
        checkboxLabel.appendChild(customCheckboxBox);
        change_el_name.appendChild(checkboxLabel);

        // Only add the label for non-global color and font changes
        if (!cssRulesJson[selector]?.additionalInfo?.isGlobalColorChange && !cssRulesJson[selector]?.additionalInfo?.isGlobalFontChange) {
            change_el_name.appendChild(change_el_name_label);
        }

        // Add color preview for global color changes after the checkbox
        if (cssRulesJson[selector]?.additionalInfo?.isGlobalColorChange) {
            const colorPreview = document.createElement('div');
            colorPreview.className = 'color-preview-container';

            // Find the first color property to get the original and new values
            const changeDetails = Object.values(cssRulesJson[selector]).find(details => details.originalColor);

            if (changeDetails) {
                const beforeColor = document.createElement('div');
                beforeColor.className = 'color-preview before';
                beforeColor.style.backgroundColor = changeDetails.originalColor;
                beforeColor.title = changeDetails.originalColor;

                const beforeColorValue = document.createElement('span');
                beforeColorValue.className = 'color-value';
                beforeColorValue.textContent = changeDetails.originalColor;

                const afterColor = document.createElement('div');
                afterColor.className = 'color-preview after';
                afterColor.style.backgroundColor = changeDetails.value;
                afterColor.title = changeDetails.value;

                const afterColorValue = document.createElement('span');
                afterColorValue.className = 'color-value';
                afterColorValue.textContent = changeDetails.value;

                const arrow = document.createElement('span');
                arrow.className = 'color-arrow';
                arrow.textContent = '→';

                colorPreview.appendChild(beforeColor);
                colorPreview.appendChild(beforeColorValue);
                colorPreview.appendChild(arrow);
                colorPreview.appendChild(afterColor);
                colorPreview.appendChild(afterColorValue);
            }

            change_el_name.appendChild(colorPreview);
        }

        // Add font preview for global font changes after the checkbox
        if (cssRulesJson[selector]?.additionalInfo?.isGlobalFontChange) {

            const fontPreview = document.createElement('div');
            fontPreview.className = 'font-preview-container';

            // Get all font properties for this global font change
            const fontProperties = {};
            Object.keys(cssRulesJson[selector]).forEach(key => {
                if (key !== 'additionalInfo' && cssRulesJson[selector][key]) {
                    fontProperties[key] = cssRulesJson[selector][key];
                }
            });



            if (Object.keys(fontProperties).length > 0) {
                // Create original font string
                const originalFontFamily = fontProperties['font-family']?.originalValue || fontProperties['font-family']?.value || '';
                const originalFontSize = fontProperties['font-size']?.originalValue || fontProperties['font-size']?.value || '';
                const originalLineHeight = fontProperties['line-height']?.originalValue || fontProperties['line-height']?.value || '';
                const originalFontWeight = fontProperties['font-weight']?.originalValue || fontProperties['font-weight']?.value || '';

                // Create new font string
                const newFontFamily = fontProperties['font-family']?.value || originalFontFamily;
                const newFontSize = fontProperties['font-size']?.value || originalFontSize;
                const newLineHeight = fontProperties['line-height']?.value || originalLineHeight;
                const newFontWeight = fontProperties['font-weight']?.value || originalFontWeight;




                // Format the font strings properly
                const originalFontString = `${originalFontFamily} ${originalFontSize}/${originalLineHeight}/${originalFontWeight}`;
                const newFontString = `${newFontFamily} ${newFontSize}/${newLineHeight}/${newFontWeight}`;



                // Create top row - Original
                const originalRow = document.createElement('div');
                originalRow.className = 'font-preview-row original';
                originalRow.textContent = `Original: ${originalFontString}`;

                // Create bottom row - New
                const newRow = document.createElement('div');
                newRow.className = 'font-preview-row new';
                newRow.textContent = `New: ${newFontString}`;

                fontPreview.appendChild(originalRow);
                fontPreview.appendChild(newRow);
            }

            change_el_name.appendChild(fontPreview);
        }

        change_item.appendChild(change_el_name);

        // Display individual properties in UI (skip for global color and font changes)
        if (!cssRulesJson[selector]?.additionalInfo?.isGlobalColorChange && !cssRulesJson[selector]?.additionalInfo?.isGlobalFontChange) {
            // Create a scrollable container for all property/value rows
            const change_item_scroll = document.createElement('div');
            change_item_scroll.className = 'change_item_scroll';

            Object.keys(cssRulesJson[selector]).forEach((key) => {
                if (key === 'additionalInfo') return;
                const property = cssRulesJson[selector][key];
                // Skip properties with empty, null, or undefined values
                if (!property.value || String(property.value).trim() === '') return;
                // Do NOT skip if property.enabled is false; always render
                const change_property = document.createElement('div');
                change_property.className = 'css_change_property';

                // Create custom checkbox
                const customCheckboxLabel = document.createElement('label');
                customCheckboxLabel.className = 'custom-checkbox';

                const change_property_checkbox = document.createElement('input');
                change_property_checkbox.type = 'checkbox';
                change_property_checkbox.checked = property.enabled;
                change_property_checkbox.setAttribute('rule', selector);
                change_property_checkbox.setAttribute('key', key);
                change_property_checkbox.setAttribute('cssValue', property.value);
                change_property_checkbox.onclick = onCssPropertyChange;

                const customCheckboxBox = document.createElement('span');
                customCheckboxBox.className = 'custom-checkbox-box';

                // --- NEW LOGIC: Display 'background-color' for solid colors ---
                let displayProp = key;
                if (key === 'background' && isSimpleColor(property.value)) {
                    displayProp = 'background-color';
                }
                const change_property_name = document.createElement('span');
                change_property_name.innerText = displayProp + ":";
                const change_property_value = document.createElement('span');
                change_property_value.className = 'prop-val';
                if (key === 'box-shadow') {
                    change_property_value.innerText = property.value; // Show full value for box-shadow
                } else if (isColorProperty(key)) {
                    change_property_value.innerText = normalizeColorValue(property.value);
                } else {
                    change_property_value.innerText = property.value;
                }

                // Compose custom checkbox
                customCheckboxLabel.appendChild(change_property_checkbox);
                customCheckboxLabel.appendChild(customCheckboxBox);
                customCheckboxLabel.appendChild(change_property_name);
                customCheckboxLabel.appendChild(change_property_value);

                // Add delete button for individual property
                const deletePropertyBtn = document.createElement('div');
                deletePropertyBtn.className = 'action_icon action_icon_small property-delete-btn';
                deletePropertyBtn.innerHTML = `<svg class="icon-12 icon-fill" style="pointer-events:none">
                    <use href="#ic_close"></use>
                </svg>`;
                deletePropertyBtn.setAttribute('rule', selector);
                deletePropertyBtn.setAttribute('property', key);
                deletePropertyBtn.title = `Delete ${key} property`;
                deletePropertyBtn.addEventListener('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    const rule = e.target.closest('.property-delete-btn').getAttribute('rule');
                    const property = e.target.closest('.property-delete-btn').getAttribute('property');
                    deletePropertyFromRule(rule, property);
                });

                change_property.appendChild(deletePropertyBtn);
                change_property.appendChild(customCheckboxLabel);
                change_item_scroll.appendChild(change_property);
            });
            change_item.appendChild(change_item_scroll);
            // Initialize SimpleBar for horizontal scroll
            if (typeof SimpleBar !== 'undefined') {
                new SimpleBar(change_item_scroll, { autoHide: false, direction: 'x' });
            } else {
                change_item_scroll.setAttribute('data-simplebar', '');
            }
            // Add class if horizontal scroll is needed
            function updateHorizontalScrollPadding(el) {
                if (el.scrollWidth > el.clientWidth) {
                    el.classList.add('has-horizontal-scroll');
                } else {
                    el.classList.remove('has-horizontal-scroll');
                }
            }
            updateHorizontalScrollPadding(change_item_scroll);
            // Keep updated on resize/content change
            if (window.ResizeObserver) {
                const ro = new ResizeObserver(() => updateHorizontalScrollPadding(change_item_scroll));
                ro.observe(change_item_scroll);
            }
        }
        change_items.appendChild(change_item);
    }
    $id('full_css_content').innerHTML = '';
    $id('full_css_content').appendChild(change_items);
    if (Object.keys(cssRulesJson).length > 0) {
        $id('css_changes_hint').style.display = 'none';
    } else {
        $id('css_changes_hint').style.display = 'flex';
    }
}
function generateCssChangesCounter() {
    console.log('🔍 generateCssChangesCounter called from cssgenerator.js');
    const inspectaStylesheet = document.getElementById('inspectaStylesheet').sheet;
    // const propertyCount = countPropertiesInStylesheet(inspectaStylesheet);
    const propertyCountJson = countPropertiesInJSONCSS();
    if (propertyCountJson === 1) {
        css_changes_counter.innerText = '1 change';
    } else {
        css_changes_counter.innerText = propertyCountJson + ' changes';
    }

    // Also call updatePropertyChangeIndicators
    if (typeof window.updatePropertyChangeIndicators === 'function') {
        console.log('🔍 Calling updatePropertyChangeIndicators');
        window.updatePropertyChangeIndicators();
    }

    // Sync dots with CSS changes panel and element toolbar
    setTimeout(() => {
        if (typeof window.syncDotsWithCssChanges === 'function') {
            console.log('🔍 Calling syncDotsWithCssChanges');
            window.syncDotsWithCssChanges();
        } else {
            console.log('❌ syncDotsWithCssChanges function not available');
        }
    }, 50);
}
function generateInspectaCss(property, value, persistInStore = true, checkForSelectedTarget = true, customSelector, enable = true, forceDelete = false) {
    // debugger;
    // Validate inputs and requirements
    if ((checkForSelectedTarget && (!target || !target.tagName)) || !document.getElementById('inspectaStylesheet')) {
        console.log('generateInspectaCss early return - no target or stylesheet');
        return;
    }
    // Ignore transform property as it's only used for UI
    if (property === 'transform') {
        return;
    }
    // Allow empty string for top/right/bottom/left, but skip null/undefined
    if (['top', 'right', 'bottom', 'left'].includes(property)) {
        if (value === null || value === undefined) {
            return;
        }
    }

    // If forceDelete is true, only handle the deletion and return early
    if (forceDelete) {
        // Check if target is in isolation mode
        const isInIsolationMode = target && target.closest('#inspecta_isolation_wrapper');

        let selector;
        if (isInIsolationMode && target.originalSelector) {
            // Use original selector in isolation mode to prevent duplicates
            selector = target.originalSelector;
        } else {
            // Use normal selector generation for non-isolation mode
            selector = customSelector || generateElSelector(target);
        }

        property = formatCssProperty(property);
        updateCssRulesJson(selector, property, value, enable, forceDelete);
        return;
    }

    applyCssChanges = true;
    property = formatCssProperty(property);
    value = formatCssValue(value, target, property);

    // Check if target is in isolation mode by checking if it's inside the isolation wrapper
    const isInIsolationMode = target && target.closest('#inspecta_isolation_wrapper');

    if (isInIsolationMode) {
        // During isolation mode, apply styles as inline styles
        target.style.setProperty(property, value);

        // Determine the correct selector for the target element
        let targetSelector = null;

        // Check if the target element has its own original selector (for child elements)
        if (target.originalSelector) {
            targetSelector = target.originalSelector;
        } else {
            // For child elements within isolation, we need to generate their original selector
            // Store the original selector on the element for future use
            if (!target.originalSelector) {
                target.originalSelector = generateElSelector(target);
            }
            targetSelector = target.originalSelector;
        }

        if (targetSelector) {
            // Update cssRulesJson with the correct selector for the target element
            updateCssRulesJson(targetSelector, property, value, enable, forceDelete);
            // Apply CSS rule with the correct selector
            applyCssRule(targetSelector, property, value);
        }

        // Generate the CSS changes panel to show the change
        generateInspectaFullCss();
        generateCssChangesCounter();

        // Save changes if needed (before early return)
        if (persistInStore && isStoreCss) {
            saveCSS();
        }

        // IMPORTANT: Don't use the new selector for isolated elements to prevent duplicates
        // The targetSelector should be used instead of the generated selector
        return; // Exit early to prevent duplicate CSS rule creation
    } else {
        // Normal mode: Generate selector only when not in isolation mode
        const selector = customSelector || generateElSelector(target);

        // Remove inline style from target element before applying stylesheet style
        if (target) {
            removeInlineStyle(target, property);
        }

        // Update cssRulesJson
        updateCssRulesJson(selector, property, value, enable, forceDelete);
        // Apply CSS rule
        applyCssRule(selector, property, value);
    }

    // Save changes if needed
    if (persistInStore && isStoreCss) {
        saveCSS();
    }

    // Create property change indicator if function exists
    if (typeof createPropertyChangeIndicator === 'function') {
        const containerElement = getPropertyContainerElement(property);
        if (containerElement) {
            createPropertyChangeIndicator(property, containerElement);
        }
    }

    // Update CSS changes counter and sync element toolbar
    generateCssChangesCounter();
}

// Helper function to get the original value of a property from the element's computed styles
function getOriginalPropertyValue(property) {
    if (!window.target) return '';

    const computedStyle = window.getComputedStyle(window.target);
    const originalValue = computedStyle.getPropertyValue(property);

    // Handle special cases for different property types
    if (property.includes('color')) {
        // For color properties, convert to hex if possible
        const hexObj = rgba2hexAdvanced(originalValue);
        if (hexObj && typeof hexObj === 'object' && hexObj.color) {
            return hexObj.color;
        }
        return originalValue;
    }

    return originalValue || '';
}

// Helper function to restore all original values to the UI before clearing all CSS rules
function restoreAllOriginalValuesToUI() {
    // console.log('restoreAllOriginalValuesToUI called');
    // console.log('cssRulesJson:', cssRulesJson);

    // Iterate through all CSS rules and restore original values
    for (let selector in cssRulesJson) {
        const rule = cssRulesJson[selector];
        // console.log(`Processing selector: ${selector}`, rule);
        for (let property in rule) {
            if (property !== 'additionalInfo' && rule[property].originalValue) {
                // console.log(`Restoring property: ${property} with value: ${rule[property].originalValue}`);
                restoreOriginalValueToUI(property, rule[property].originalValue);
            }
        }
    }
}

// Helper function to restore original value to the appropriate UI input
function restoreOriginalValueToUI(property, originalValue) {
    // console.log(`restoreOriginalValueToUI called: ${property} = ${originalValue}`);
    if (!originalValue) {
        console.log('No original value provided');
        return;
    }

    // Map CSS properties to their corresponding UI input IDs
    const propertyToInputMap = {
        'gap': 'in_gap',
        'width': 'in_width',
        'height': 'in_height',
        'min-width': 'in_min_width',
        'max-width': 'in_max_width',
        'min-height': 'in_min_height',
        'max-height': 'in_max_height',
        'margin-top': 'in_mt',
        'margin-right': 'in_mr',
        'margin-bottom': 'in_mb',
        'margin-left': 'in_ml',
        'padding-top': 'in_pt',
        'padding-right': 'in_pr',
        'padding-bottom': 'in_pb',
        'padding-left': 'in_pl',
        'border-width': 'in_bc',
        'borderWidth': 'in_bc',
        'border-top-width': 'in_bt',
        'border-right-width': 'in_br',
        'border-bottom-width': 'in_bb',
        'border-left-width': 'in_bl',
        'border-radius': 'in_radius',
        'border-top-left-radius': 'in_radius_tl',
        'border-top-right-radius': 'in_radius_tr',
        'border-bottom-left-radius': 'in_radius_bl',
        'border-bottom-right-radius': 'in_radius_br',
        'color': 'in_font_color',
        'font-size': 'in_font_size',
        'font-weight': 'in_font_weight',
        'line-height': 'in_line_height',
        'letter-spacing': 'in_letter_spacing',
        'background-color': 'in_bg_color',
        'backgroundColor': 'in_bg_color',
        'background-image': 'in_bg_image',
        'background-size': 'in_bg_size',
        'background-position': 'in_bg_position',
        'background-repeat': 'in_bg_repeat',
        'opacity': 'in_el_opac',
        'z-index': 'in_z_index'
    };

    // Handle display and flex properties directly (they don't have input elements)
    if (property === 'display') {
        console.log(`Handling display restoration: ${property} = ${originalValue}`);
        // Access elements in shadow DOM like the rest of the codebase
        const shadowContainer = document.getElementById('inspecta_app_container');
        const shadowRoot = shadowContainer ? shadowContainer.shadowRoot : null;
        const root = shadowRoot || document;
        restoreDisplayRadioGroup(originalValue, root);
        return;
    } else if (property === 'flex-direction') {
        console.log(`Handling flex-direction restoration: ${property} = ${originalValue}`);
        const shadowContainer = document.getElementById('inspecta_app_container');
        const shadowRoot = shadowContainer ? shadowContainer.shadowRoot : null;
        const root = shadowRoot || document;
        restoreFlexDirectionRadioGroup(originalValue, root);
        return;
    } else if (property === 'flex-wrap') {
        console.log(`Handling flex-wrap restoration: ${property} = ${originalValue}`);
        const shadowContainer = document.getElementById('inspecta_app_container');
        const shadowRoot = shadowContainer ? shadowContainer.shadowRoot : null;
        const root = shadowRoot || document;
        restoreFlexWrapRadioGroup(originalValue, root);
        return;
    } else if (property === 'justify-content') {
        console.log(`Handling justify-content restoration: ${property} = ${originalValue}`);
        const shadowContainer = document.getElementById('inspecta_app_container');
        const shadowRoot = shadowContainer ? shadowContainer.shadowRoot : null;
        const root = shadowRoot || document;
        restoreJustifyContentRadioGroup(originalValue, root);
        return;
    } else if (property === 'align-items') {
        console.log(`Handling align-items restoration: ${property} = ${originalValue}`);
        const shadowContainer = document.getElementById('inspecta_app_container');
        const shadowRoot = shadowContainer ? shadowContainer.shadowRoot : null;
        const root = shadowRoot || document;
        restoreAlignItemsRadioGroup(originalValue, root);
        return;
    } else if (property === 'font-family') {
        console.log(`Handling font-family restoration: ${property} = ${originalValue}`);
        const shadowContainer = document.getElementById('inspecta_app_container');
        const shadowRoot = shadowContainer ? shadowContainer.shadowRoot : null;
        const root = shadowRoot || document;
        restoreFontFamily(originalValue, root);
        return;
    } else if (property === 'font-weight') {
        console.log(`Handling font-weight restoration: ${property} = ${originalValue}`);
        const shadowContainer = document.getElementById('inspecta_app_container');
        const shadowRoot = shadowContainer ? shadowContainer.shadowRoot : null;
        const root = shadowRoot || document;
        restoreFontWeight(originalValue, root);
        return;
    } else if (property === 'color') {
        // console.log(`Handling font color restoration: ${property} = ${originalValue}`);
        const shadowContainer = document.getElementById('inspecta_app_container');
        const shadowRoot = shadowContainer ? shadowContainer.shadowRoot : null;
        const root = shadowRoot || document;
        restoreFontColor(originalValue, root);
        return;
    } else if (property === 'text-align') {
        console.log(`Handling text-align restoration: ${property} = ${originalValue}`);
        const shadowContainer = document.getElementById('inspecta_app_container');
        const shadowRoot = shadowContainer ? shadowContainer.shadowRoot : null;
        const root = shadowRoot || document;
        restoreTextAlign(originalValue, root);
        return;
    } else if (property === 'text-decoration' || property === 'text-decoration-line') {
        console.log(`Handling text-decoration restoration: ${property} = ${originalValue}`);
        const shadowContainer = document.getElementById('inspecta_app_container');
        const shadowRoot = shadowContainer ? shadowContainer.shadowRoot : null;
        const root = shadowRoot || document;
        restoreTextDecoration(originalValue, root);
        return;
    } else if (property === 'border-style') {
        console.log(`Handling border-style restoration: ${property} = ${originalValue}`);
        const shadowContainer = document.getElementById('inspecta_app_container');
        const shadowRoot = shadowContainer ? shadowContainer.shadowRoot : null;
        const root = shadowRoot || document;
        restoreBorderStyle(originalValue, root);
        return;
    } else if (property === 'border-color') {
        console.log(`Handling border-color restoration: ${property} = ${originalValue}`);
        const shadowContainer = document.getElementById('inspecta_app_container');
        const shadowRoot = shadowContainer ? shadowContainer.shadowRoot : null;
        const root = shadowRoot || document;
        restoreBorderColor(originalValue, root);
        return;
    } else if (property === 'border-width' || property === 'border-top-width' || property === 'border-right-width' || property === 'border-bottom-width' || property === 'border-left-width') {
        console.log(`Handling border-width restoration: ${property} = ${originalValue}`);
        const shadowContainer = document.getElementById('inspecta_app_container');
        const shadowRoot = shadowContainer ? shadowContainer.shadowRoot : null;
        const root = shadowRoot || document;
        restoreBorderWidth(property, originalValue, root);
        return;
    } else if (property === 'borderTopWidth' || property === 'borderRightWidth' || property === 'borderBottomWidth' || property === 'borderLeftWidth') {
        console.log(`Handling individual border-width restoration: ${property} = ${originalValue}`);
        const shadowContainer = document.getElementById('inspecta_app_container');
        const shadowRoot = shadowContainer ? shadowContainer.shadowRoot : null;
        const root = shadowRoot || document;
        restoreIndividualBorderWidth(property, originalValue, root);
        return;
    } else if (property === 'border-radius' || property === 'border-top-left-radius' || property === 'border-top-right-radius' || property === 'border-bottom-left-radius' || property === 'border-bottom-right-radius') {
        console.log(`Handling border-radius restoration: ${property} = ${originalValue}`);
        const shadowContainer = document.getElementById('inspecta_app_container');
        const shadowRoot = shadowContainer ? shadowContainer.shadowRoot : null;
        const root = shadowRoot || document;
        restoreBorderRadius(property, originalValue, root);
        return;
    } else if (property === 'borderTopLeftRadius' || property === 'borderTopRightRadius' || property === 'borderBottomLeftRadius' || property === 'borderBottomRightRadius') {
        console.log(`Handling individual border-radius restoration: ${property} = ${originalValue}`);
        const shadowContainer = document.getElementById('inspecta_app_container');
        const shadowRoot = shadowContainer ? shadowContainer.shadowRoot : null;
        const root = shadowRoot || document;
        restoreIndividualBorderRadius(property, originalValue, root);
        return;
    } else if (property === 'position') {
        console.log(`Handling position restoration: ${property} = ${originalValue}`);
        const shadowContainer = document.getElementById('inspecta_app_container');
        const shadowRoot = shadowContainer ? shadowContainer.shadowRoot : null;
        const root = shadowRoot || document;
        restorePosition(originalValue, root);
        return;
    } else if (property === 'box-shadow' || property === 'box-shadow-color' || property === 'box-shadow-opacity' || property === 'box-shadow-x' || property === 'box-shadow-y' || property === 'box-shadow-blur' || property === 'box-shadow-spread') {
        console.log(`Handling box-shadow restoration: ${property} = ${originalValue}`);
        const shadowContainer = document.getElementById('inspecta_app_container');
        const shadowRoot = shadowContainer ? shadowContainer.shadowRoot : null;
        const root = shadowRoot || document;
        restoreBoxShadow(property, originalValue, root);
        return;
    }

    const inputId = propertyToInputMap[property];
    console.log(`Property ${property} maps to input ID: ${inputId}`);
    if (inputId) {
        // Access elements in shadow DOM like the rest of the codebase
        const shadowContainer = document.getElementById('inspecta_app_container');
        const shadowRoot = shadowContainer ? shadowContainer.shadowRoot : null;
        const root = shadowRoot || document;

        const input = root.getElementById(inputId);
        console.log(`Input element found:`, input);
        if (input) {
            // Handle different input types
            if (property.includes('color')) {
                // For color inputs, set the color value
                input.value = originalValue;

                // Special handling for background-color to update thumbnail and opacity
                if (property === 'background-color' || property === 'backgroundColor') {
                    console.log(`Handling background-color restoration: ${originalValue}`);
                    const colorValue = rgba2hexAdvanced(originalValue);
                    const hexInput = root.getElementById('in_bg_color_hex');
                    const opacityInput = root.getElementById('in_bg_color_opac');
                    const colorContainer = root.getElementById('in_bg_color');

                    if (hexInput && opacityInput && colorContainer) {
                        if (originalValue !== 'rgba(0, 0, 0, 0)' && originalValue !== 'transparent') {
                            hexInput.value = colorValue.color;
                            opacityInput.value = colorValue.opacityPCT === 0 ? 100 : colorValue.opacityPCT;

                            // Update thumbnail with proper opacity
                            if (colorValue.opacityPCT < 100) {
                                const colorWithAlpha = hexColorWithOptionalAlpha(colorValue.color, colorValue.opacityPCT);
                                colorContainer.style.backgroundColor = colorWithAlpha;
                            } else {
                                colorContainer.style.backgroundColor = colorValue.color;
                            }
                        } else {
                            hexInput.value = '';
                            opacityInput.value = '';
                            colorContainer.style.backgroundColor = 'transparent';
                        }
                        console.log(`Background color restored: hex=${colorValue.color}, opacity=${colorValue.opacityPCT}`);
                    }
                }
                // Note: Event dispatching removed to avoid compatibility issues
                // The value restoration should work without triggering events
            } else if (property === 'background-image') {
                // For background-image, restore to the background color UI
                const hexInput = root.getElementById('in_bg_color_hex');
                const colorContainer = root.getElementById('in_bg_color');
                const opacityInput = root.getElementById('in_bg_color_opac');

                if (originalValue === 'none' || !originalValue) {
                    // Clear image and restore to solid color
                    if (hexInput) hexInput.value = '';
                    if (colorContainer) {
                        colorContainer.style.backgroundImage = 'none';
                        colorContainer.style.backgroundSize = '';
                        colorContainer.style.backgroundPosition = '';
                        colorContainer.style.backgroundRepeat = '';
                    }
                    if (opacityInput) opacityInput.style.display = '';
                } else {
                    // Restore image
                    if (hexInput) hexInput.value = 'Image';
                    if (colorContainer) {
                        colorContainer.style.backgroundImage = originalValue;
                        colorContainer.style.backgroundSize = 'cover';
                        colorContainer.style.backgroundPosition = 'center center';
                        colorContainer.style.backgroundRepeat = 'no-repeat';
                    }
                    if (opacityInput) opacityInput.style.display = 'none';
                }
            } else if (property.startsWith('background-')) {
                // For other background properties, try to find the specific input
                const backgroundInput = root.getElementById(inputId);
                if (backgroundInput) {
                    backgroundInput.value = originalValue;
                    // Note: Event dispatching removed to avoid compatibility issues
                    // The value restoration should work without triggering events
                }
            } else if (property.includes('opacity')) {
                // For opacity, convert to percentage
                const opacityValue = Math.round(parseFloat(originalValue) * 100);
                input.value = opacityValue;
            } else if (property.includes('z-index')) {
                // For z-index, use the value directly
                input.value = originalValue;
            } else {
                // For most other properties, extract numeric value
                const numericValue = originalValue.replace(/[^\d.-]/g, '');
                input.value = numericValue;
            }

            // Update slider positions for properties that have sliders
            if (property === 'gap' || property === 'opacity' || property === 'border-radius') {
                console.log(`Updating slider position for: ${property}`);
                if (typeof window.updateSliderPositions === 'function') {
                    window.updateSliderPositions();
                }
            }

            // Note: Event dispatching removed to avoid compatibility issues
            // The value restoration should work without triggering events
        }
    }
}

// Helper functions to restore radio group selections
function restoreDisplayRadioGroup(originalValue, root) {
    console.log(`Restoring display to: ${originalValue}`);

    // Clear all display radio buttons
    root.querySelectorAll("[id^='in_dis_']").forEach((element) => {
        element.classList.remove("action_icon_radio_active");
        const svg = element.querySelector("svg");
        if (svg) svg.classList.remove("icon-fill_active");
    });

    // Select the original display value
    const displayElement = root.getElementById(`in_dis_${originalValue}`);
    console.log(`Looking for display element: in_dis_${originalValue}`, displayElement);
    if (displayElement) {
        displayElement.classList.add("action_icon_radio_active");
        const svg = displayElement.querySelector("svg");
        if (svg) svg.classList.add("icon-fill_active");
        console.log(`Successfully restored display to: ${originalValue}`);
    } else {
        console.log(`Display element not found: in_dis_${originalValue}`);
    }
}

function restoreFlexDirectionRadioGroup(originalValue, root) {
    // Clear all flex-direction radio buttons
    root.querySelectorAll("[id^='in_flex_dir_']").forEach((element) => {
        element.classList.remove("action_icon_radio_active");
        const svg = element.querySelector("svg");
        if (svg) svg.classList.remove("icon-fill_active");
    });

    // Select the original flex-direction value
    const flexDirElement = root.getElementById(`in_flex_dir_${originalValue}`);
    if (flexDirElement) {
        flexDirElement.classList.add("action_icon_radio_active");
        const svg = flexDirElement.querySelector("svg");
        if (svg) svg.classList.add("icon-fill_active");
    }
}

function restoreFlexWrapRadioGroup(originalValue, root) {
    console.log(`Restoring flex-wrap to: ${originalValue}`);

    // Clear all flex-wrap radio buttons
    root.querySelectorAll("[id^='in_flex_wrap_']").forEach((element) => {
        element.classList.remove("action_icon_radio_active");
        const svg = element.querySelector("svg");
        if (svg) svg.classList.remove("icon-fill_active");
    });

    // For flex-wrap, we need to find the correct element based on current flex-direction
    const currentFlexDir = window.target ? window.getComputedStyle(window.target).flexDirection : 'row';
    const direction = currentFlexDir.replace('-reverse', '');
    console.log(`Current flex direction: ${currentFlexDir}, direction: ${direction}`);

    console.log(`Looking for flex-wrap element: in_flex_wrap_${direction}_${originalValue}`);
    const flexWrapElement = root.getElementById(`in_flex_wrap_${direction}_${originalValue}`);
    console.log(`Found flex-wrap element:`, flexWrapElement);

    if (flexWrapElement) {
        flexWrapElement.classList.add("action_icon_radio_active");
        const svg = flexWrapElement.querySelector("svg");
        if (svg) svg.classList.add("icon-fill_active");
        console.log(`Successfully restored flex-wrap to: ${originalValue}`);
    } else {
        console.log(`Flex-wrap element not found: in_flex_wrap_${direction}_${originalValue}`);
    }
}

function restoreJustifyContentRadioGroup(originalValue, root) {
    console.log(`Restoring justify-content to: ${originalValue}`);

    // Clear all justify-content radio buttons
    root.querySelectorAll("[id^='in_justify_content_']").forEach((element) => {
        element.classList.remove("action_icon_radio_active");
        const svg = element.querySelector("svg");
        if (svg) svg.classList.remove("icon-fill_active");
    });

    // For justify-content, we need to find the correct element based on current flex-direction
    const currentFlexDir = window.target ? window.getComputedStyle(window.target).flexDirection : 'row';
    console.log(`Current flex direction: ${currentFlexDir}`);

    let justifyValue = originalValue;
    if (justifyValue === 'flex-start' || justifyValue === 'normal' || justifyValue === 'initial') justifyValue = 'start';
    else if (justifyValue === 'flex-end') justifyValue = 'end';
    else if (justifyValue === 'space-between') justifyValue = 'between';
    else if (justifyValue === 'space-around') justifyValue = 'around';
    else if (justifyValue === 'space-evenly') justifyValue = 'evenly';
    else if (justifyValue === 'center') justifyValue = 'center';

    // Use the full flex direction name (including -reverse) for the ID
    const justifyElementId = `in_justify_content_${currentFlexDir}_${justifyValue}`;
    console.log(`Looking for justify element: ${justifyElementId}`);

    // Debug: List all available justify-content elements
    const allJustifyElements = root.querySelectorAll("[id^='in_justify_content_']");
    console.log(`All available justify-content elements:`, Array.from(allJustifyElements).map(el => el.id));

    const justifyElement = root.getElementById(justifyElementId);
    console.log(`Found justify element:`, justifyElement);

    if (justifyElement) {
        justifyElement.classList.add("action_icon_radio_active");
        const svg = justifyElement.querySelector("svg");
        if (svg) svg.classList.add("icon-fill_active");
        console.log(`Successfully restored justify-content to: ${originalValue}`);
    } else {
        console.log(`Justify element not found: ${justifyElementId}`);
    }
}

function restoreAlignItemsRadioGroup(originalValue, root) {
    console.log(`Restoring align-items to: ${originalValue}`);

    // Clear all align-items radio buttons
    root.querySelectorAll("[id^='in_align_items_']").forEach((element) => {
        element.classList.remove("action_icon_radio_active");
        const svg = element.querySelector("svg");
        if (svg) svg.classList.remove("icon-fill_active");
    });

    // For align-items, we need to find the correct element based on current flex-direction
    const currentFlexDir = window.target ? window.getComputedStyle(window.target).flexDirection : 'row';
    console.log(`Current flex direction: ${currentFlexDir}`);

    let alignValue = originalValue;
    if (alignValue === 'flex-start') alignValue = 'start';
    else if (alignValue === 'flex-end') alignValue = 'end';
    else if (alignValue === 'stretch') alignValue = 'stretch';
    else if (alignValue === 'center') alignValue = 'center';
    else if (alignValue === 'baseline') alignValue = 'baseline';

    console.log(`Looking for align element: in_align_items_${currentFlexDir}_${alignValue}`);
    const alignElement = root.getElementById(`in_align_items_${currentFlexDir}_${alignValue}`);
    console.log(`Found align element:`, alignElement);

    if (alignElement) {
        alignElement.classList.add("action_icon_radio_active");
        const svg = alignElement.querySelector("svg");
        if (svg) svg.classList.add("icon-fill_active");
        console.log(`Successfully restored align-items to: ${originalValue}`);
    } else {
        console.log(`Align element not found: in_align_items_${currentFlexDir}_${alignValue}`);
    }
}

// Typography restoration functions
function restoreFontFamily(originalValue, root) {
    console.log(`Restoring font-family to: ${originalValue}`);

    // Clean the font family name (remove extra quotes and fallback fonts)
    const cleanFontFamily = originalValue.replace(/^["']|["']$/g, '').trim();

    if (window.fontSelector) {
        window.fontSelector.setValue(cleanFontFamily);
        // Update font weight options for the restored font
        if (typeof updateFontWeightOptions === 'function') {
            updateFontWeightOptions(cleanFontFamily);
        }
        console.log(`Successfully restored font-family to: ${cleanFontFamily}`);
    } else {
        console.log(`Font selector not found`);
    }
}

function restoreFontWeight(originalValue, root) {
    console.log(`Restoring font-weight to: ${originalValue}`);

    const fontWeightSelect = root.getElementById('in_font_weight');
    if (fontWeightSelect) {
        // Try to find a matching option
        let foundMatch = false;
        for (let option of fontWeightSelect.options) {
            if (option.value === originalValue) {
                fontWeightSelect.value = originalValue;
                foundMatch = true;
                break;
            }
        }

        if (!foundMatch) {
            // If no exact match, try to find a close match
            const numericWeight = parseInt(originalValue);
            if (!isNaN(numericWeight)) {
                for (let option of fontWeightSelect.options) {
                    if (parseInt(option.value) === numericWeight) {
                        fontWeightSelect.value = option.value;
                        foundMatch = true;
                        break;
                    }
                }
            }
        }

        if (foundMatch) {
            console.log(`Successfully restored font-weight to: ${originalValue}`);
        } else {
            console.log(`Font-weight option not found: ${originalValue}`);
        }
    } else {
        console.log(`Font weight select not found`);
    }
}

function restoreFontColor(originalValue, root) {
    // console.log(`Restoring font color to: ${originalValue}`);

    const colorValue = rgba2hexAdvanced(originalValue);
    const hexInput = root.getElementById('in_font_color_hex');
    const opacityInput = root.getElementById('in_font_color_opac');
    const colorContainer = root.getElementById('in_font_color');

    if (hexInput && opacityInput && colorContainer) {
        hexInput.value = colorValue.color;
        opacityInput.value = colorValue.opacityPCT === 0 ? 100 : colorValue.opacityPCT;

        // Update thumbnail with proper opacity
        if (colorValue.opacityPCT < 100) {
            const colorWithAlpha = hexColorWithOptionalAlpha(colorValue.color, colorValue.opacityPCT);
            colorContainer.style.backgroundColor = colorWithAlpha;
        } else {
            colorContainer.style.backgroundColor = colorValue.color;
        }
        // console.log(`Font color restored: hex=${colorValue.color}, opacity=${colorValue.opacityPCT}`);
    } else {
        console.log(`Font color elements not found`);
    }
}

function restoreTextAlign(originalValue, root) {
    console.log(`Restoring text-align to: ${originalValue}`);

    // Clear all text-align radio buttons
    root.querySelectorAll("[id^='in_txt_align_']").forEach((element) => {
        element.classList.remove("action_icon_radio_active");
        const svg = element.querySelector("svg");
        if (svg) svg.classList.remove("icon-fill_active");
    });

    // Handle initial/inherit values and map CSS values to HTML element IDs
    let alignValue = originalValue;
    if (originalValue === 'initial' || originalValue === 'inherit' || originalValue === 'unset' || originalValue === 'start') {
        alignValue = 'left'; // CSS 'start' maps to 'left' in HTML
    }

    // Select the original text-align value
    const alignElement = root.getElementById(`in_txt_align_${alignValue}`);
    if (alignElement) {
        alignElement.classList.add("action_icon_radio_active");
        const svg = alignElement.querySelector("svg");
        if (svg) svg.classList.add("icon-fill_active");
        console.log(`Successfully restored text-align to: ${alignValue}`);
    } else {
        console.log(`Text-align element not found: in_txt_align_${alignValue}`);
        // Debug: List all available text-align elements
        const allAlignElements = root.querySelectorAll("[id^='in_txt_align_']");
        console.log(`All available text-align elements:`, Array.from(allAlignElements).map(el => el.id));
    }
}

function restoreTextDecoration(originalValue, root) {
    console.log(`Restoring text-decoration to: ${originalValue}`);

    // Clear all text-decoration radio buttons - use more specific selectors
    const decorationElements = [
        root.getElementById('in_txt_decoration_none'),
        root.getElementById('in_txt_underline'),
        root.getElementById('in_txt_line_through')
    ];

    decorationElements.forEach((element) => {
        if (element) {
            element.classList.remove("action_icon_radio_active");
            const svg = element.querySelector("svg");
            if (svg) svg.classList.remove("icon-fill_active");
            const span = element.querySelector("span");
            if (span) span.style.color = "var(--in-color-text-1)";
        }
    });

    // Select the original text-decoration value
    if (originalValue && originalValue.includes("underline")) {
        const underlineElement = root.getElementById('in_txt_underline');
        if (underlineElement) {
            underlineElement.classList.add("action_icon_radio_active");
            const svg = underlineElement.querySelector("svg");
            if (svg) svg.classList.add("icon-fill_active");
            console.log(`Selected underline decoration`);
        }
    } else if (originalValue && originalValue.includes("line-through")) {
        const lineThroughElement = root.getElementById('in_txt_line_through');
        if (lineThroughElement) {
            lineThroughElement.classList.add("action_icon_radio_active");
            const svg = lineThroughElement.querySelector("svg");
            if (svg) svg.classList.add("icon-fill_active");
            console.log(`Selected line-through decoration`);
        }
    } else {
        // No decoration or none - set to "None"
        const noneElement = root.getElementById('in_txt_decoration_none');
        if (noneElement) {
            noneElement.classList.add("action_icon_radio_active");
            const span = noneElement.querySelector("span");
            if (span) span.style.color = "var(--in-color-primary)";
            console.log(`Selected none decoration`);
        }
    }

    console.log(`Successfully restored text-decoration to: ${originalValue}`);
}

// Border restoration functions
function restoreBorderStyle(originalValue, root) {
    console.log(`Restoring border-style to: ${originalValue}`);

    // Clear all border-style radio buttons
    root.querySelectorAll("[id^='in_border_style_']").forEach((element) => {
        element.classList.remove("action_icon_radio_active");
        const svg = element.querySelector("svg");
        if (svg) svg.classList.remove("icon-fill_active");
        const span = element.querySelector("span");
        if (span) span.style.color = "var(--in-color-text-1)";
    });

    // Select the original border-style value
    if (originalValue && originalValue !== 'none') {
        const styleButton = root.querySelector(`#in_border_style_${originalValue}`);
        if (styleButton) {
            styleButton.classList.add("action_icon_radio_active");
            const svg = styleButton.querySelector("svg");
            if (svg) svg.classList.add("icon-fill_active");
            console.log(`Selected border style: ${originalValue}`);
        } else {
            console.log(`Border style element not found: in_border_style_${originalValue}`);
        }
    } else {
        // No border or style is 'none' - select the 'none' button
        const noneButton = root.querySelector("#in_border_style_none");
        if (noneButton) {
            noneButton.classList.add("action_icon_radio_active");
            const span = noneButton.querySelector("span");
            if (span) span.style.color = "var(--in-color-primary)";
            console.log(`Selected border style: none`);
        }
    }

    console.log(`Successfully restored border-style to: ${originalValue}`);
}

function restoreBorderColor(originalValue, root) {
    console.log(`Restoring border-color to: ${originalValue}`);

    const colorValue = rgba2hexAdvanced(originalValue);
    const hexInput = root.getElementById('in_border_color_hex');
    const opacityInput = root.getElementById('in_border_color_opac');
    const colorContainer = root.getElementById('in_border_color');

    if (hexInput && opacityInput && colorContainer) {
        if (originalValue !== 'rgba(0, 0, 0, 0)' && originalValue !== 'transparent') {
            hexInput.value = colorValue.color;
            opacityInput.value = colorValue.opacityPCT === 0 ? 100 : colorValue.opacityPCT;

            // Update thumbnail with proper opacity
            if (colorValue.opacityPCT < 100) {
                const colorWithAlpha = hexColorWithOptionalAlpha(colorValue.color, colorValue.opacityPCT);
                colorContainer.style.backgroundColor = colorWithAlpha;
            } else {
                colorContainer.style.backgroundColor = colorValue.color;
            }
        } else {
            hexInput.value = '';
            opacityInput.value = '';
            colorContainer.style.backgroundColor = 'unset';
        }
        console.log(`Border color restored: hex=${colorValue.color}, opacity=${colorValue.opacityPCT}`);
    } else {
        console.log(`Border color elements not found`);
    }
}

function restoreBorderWidth(property, originalValue, root) {
    console.log(`Restoring border-width: ${property} = ${originalValue}`);

    // Handle border-width (both shorthand like "2px 2px 1px" and single value like "1px")
    if (property === 'border-width') {
        // Parse shorthand: "top right bottom" or "top right bottom left"
        const values = originalValue.split(' ').map(v => v.replace(/[^\d.-]/g, ''));
        console.log(`Parsed border-width values:`, values);

        // Map to individual inputs
        const inputMap = {
            'in_bt': values[0] || '0', // top
            'in_br': values[1] || values[0] || '0', // right (fallback to top)
            'in_bb': values[2] || values[0] || '0', // bottom (fallback to top)
            'in_bl': values[3] || values[1] || values[0] || '0' // left (fallback to right, then top)
        };

        // Update all border width inputs
        Object.entries(inputMap).forEach(([inputId, value]) => {
            const input = root.getElementById(inputId);
            if (input) {
                input.value = value;
                console.log(`Set ${inputId} value to: ${value}`);
            }
        });

        // Also update the main border width input with the first value
        const mainInput = root.getElementById('in_bc');
        if (mainInput) {
            mainInput.value = values[0] || '0';
            console.log(`Set in_bc value to: ${values[0] || '0'}`);
        }

        // Manually update all individual border inputs to match the restored values
        // This ensures the UI is properly synchronized
        const individualInputs = ['in_bt', 'in_br', 'in_bb', 'in_bl'];
        const individualValues = [values[0] || '0', values[1] || values[0] || '0', values[2] || values[0] || '0', values[3] || values[1] || values[0] || '0'];

        console.log(`About to update individual inputs with values:`, individualValues);

        individualInputs.forEach((inputId, index) => {
            const input = root.getElementById(inputId);
            if (input) {
                console.log(`Before update - ${inputId} value: ${input.value}`);
                input.value = individualValues[index];
                console.log(`After update - ${inputId} value: ${input.value}`);
                console.log(`Manually set ${inputId} value to: ${individualValues[index]}`);
            } else {
                console.log(`Input not found: ${inputId}`);
            }
        });

        // Add a small delay and check again to see if values persist
        setTimeout(() => {
            console.log(`Checking values after 100ms delay:`);
            individualInputs.forEach((inputId) => {
                const input = root.getElementById(inputId);
                if (input) {
                    console.log(`${inputId} value after delay: ${input.value}`);
                }
            });
        }, 100);

        // Call checkIfAllBordersEqual to sync the UI state
        if (typeof checkIfAllBordersEqual === 'function') {
            checkIfAllBordersEqual();
        }

    } else {
        // Handle individual border width properties
        const numericValue = originalValue.replace(/[^\d.-]/g, '');

        // Map property to input ID
        const inputMap = {
            'border-width': 'in_bc',
            'border-top-width': 'in_bt',
            'border-right-width': 'in_br',
            'border-bottom-width': 'in_bb',
            'border-left-width': 'in_bl'
        };

        const inputId = inputMap[property];
        if (inputId) {
            const input = root.getElementById(inputId);
            if (input) {
                input.value = numericValue;
                console.log(`Set ${inputId} value to: ${numericValue}`);
            } else {
                console.log(`Border width input not found: ${inputId}`);
            }
        } else {
            console.log(`No input mapping found for border width property: ${property}`);
        }
    }

    // Update slider positions for border width
    if (typeof window.updateSliderPositions === 'function') {
        window.updateSliderPositions();
    }

    console.log(`Successfully restored border-width: ${property} = ${originalValue}`);
}

function restoreIndividualBorderWidth(property, originalValue, root) {
    console.log(`Restoring individual border-width: ${property} = ${originalValue}`);

    // Extract numeric value
    const numericValue = originalValue.replace(/[^\d.-]/g, '');

    // Map camelCase property to input ID
    const inputMap = {
        'borderTopWidth': 'in_bt',
        'borderRightWidth': 'in_br',
        'borderBottomWidth': 'in_bb',
        'borderLeftWidth': 'in_bl'
    };

    const inputId = inputMap[property];
    if (inputId) {
        const input = root.getElementById(inputId);
        if (input) {
            input.value = numericValue;
            console.log(`Set ${inputId} value to: ${numericValue}`);

            // Update slider positions for border width
            if (typeof window.updateSliderPositions === 'function') {
                window.updateSliderPositions();
            }

            // Call checkIfAllBordersEqual to sync the UI state
            if (typeof checkIfAllBordersEqual === 'function') {
                checkIfAllBordersEqual();
            }
        } else {
            console.log(`Individual border width input not found: ${inputId}`);
        }
    } else {
        console.log(`No input mapping found for individual border width property: ${property}`);
    }

    console.log(`Successfully restored individual border-width: ${property} = ${originalValue}`);
}

// Border radius restoration functions
function restoreBorderRadius(property, originalValue, root) {
    console.log(`Restoring border-radius: ${property} = ${originalValue}`);

    // Handle border-radius (both shorthand like "2px 2px 1px" and single value like "1px")
    if (property === 'border-radius') {
        // Parse shorthand: "top-left top-right bottom-right bottom-left" or single value
        const values = originalValue.split(' ').map(v => v.replace(/[^\d.-]/g, ''));
        console.log(`Parsed border-radius values:`, values);

        // Map to individual inputs
        const inputMap = {
            'in_radius_tl': values[0] || '0', // top-left
            'in_radius_tr': values[1] || values[0] || '0', // top-right (fallback to top-left)
            'in_radius_br': values[2] || values[0] || '0', // bottom-right (fallback to top-left)
            'in_radius_bl': values[3] || values[1] || values[0] || '0' // bottom-left (fallback to top-right, then top-left)
        };

        // Update all border radius inputs
        Object.entries(inputMap).forEach(([inputId, value]) => {
            const input = root.getElementById(inputId);
            if (input) {
                input.value = value;
                console.log(`Set ${inputId} value to: ${value}`);
            }
        });

        // Also update the main border radius input with the first value
        const mainInput = root.getElementById('in_radius');
        if (mainInput) {
            mainInput.value = values[0] || '0';
            console.log(`Set in_radius value to: ${values[0] || '0'}`);
        }

        // Manually update all individual border radius inputs to match the restored values
        // This ensures the UI is properly synchronized
        const individualInputs = ['in_radius_tl', 'in_radius_tr', 'in_radius_br', 'in_radius_bl'];
        const individualValues = [values[0] || '0', values[1] || values[0] || '0', values[2] || values[0] || '0', values[3] || values[1] || values[0] || '0'];

        console.log(`About to update individual radius inputs with values:`, individualValues);

        individualInputs.forEach((inputId, index) => {
            const input = root.getElementById(inputId);
            if (input) {
                console.log(`Before update - ${inputId} value: ${input.value}`);
                input.value = individualValues[index];
                console.log(`After update - ${inputId} value: ${input.value}`);
                console.log(`Manually set ${inputId} value to: ${individualValues[index]}`);
            } else {
                console.log(`Input not found: ${inputId}`);
            }
        });

        // Add a small delay and check again to see if values persist
        setTimeout(() => {
            console.log(`Checking radius values after 100ms delay:`);
            individualInputs.forEach((inputId) => {
                const input = root.getElementById(inputId);
                if (input) {
                    console.log(`${inputId} value after delay: ${input.value}`);
                }
            });
        }, 100);

    } else {
        // Handle individual border radius properties
        const numericValue = originalValue.replace(/[^\d.-]/g, '');

        // Map property to input ID
        const inputMap = {
            'border-radius': 'in_radius',
            'border-top-left-radius': 'in_radius_tl',
            'border-top-right-radius': 'in_radius_tr',
            'border-bottom-right-radius': 'in_radius_br',
            'border-bottom-left-radius': 'in_radius_bl'
        };

        const inputId = inputMap[property];
        if (inputId) {
            const input = root.getElementById(inputId);
            if (input) {
                input.value = numericValue;
                console.log(`Set ${inputId} value to: ${numericValue}`);
            } else {
                console.log(`Border radius input not found: ${inputId}`);
            }
        } else {
            console.log(`No input mapping found for border radius property: ${property}`);
        }
    }

    // Update slider positions for border radius
    if (typeof window.updateSliderPositions === 'function') {
        window.updateSliderPositions();
    }

    console.log(`Successfully restored border-radius: ${property} = ${originalValue}`);
}

function restoreIndividualBorderRadius(property, originalValue, root) {
    console.log(`Restoring individual border-radius: ${property} = ${originalValue}`);

    // Extract numeric value
    const numericValue = originalValue.replace(/[^\d.-]/g, '');

    // Map camelCase property to input ID
    const inputMap = {
        'borderTopLeftRadius': 'in_radius_tl',
        'borderTopRightRadius': 'in_radius_tr',
        'borderBottomRightRadius': 'in_radius_br',
        'borderBottomLeftRadius': 'in_radius_bl'
    };

    const inputId = inputMap[property];
    if (inputId) {
        const input = root.getElementById(inputId);
        if (input) {
            input.value = numericValue;
            console.log(`Set ${inputId} value to: ${numericValue}`);

            // Update slider positions for border radius
            if (typeof window.updateSliderPositions === 'function') {
                window.updateSliderPositions();
            }
        } else {
            console.log(`Individual border radius input not found: ${inputId}`);
        }
    } else {
        console.log(`No input mapping found for individual border radius property: ${property}`);
    }

    console.log(`Successfully restored individual border-radius: ${property} = ${originalValue}`);
}

// Position restoration function
function restorePosition(originalValue, root) {
    console.log(`Restoring position to: ${originalValue}`);

    // Handle initial/inherit values - default to static
    let positionValue = originalValue;
    if (originalValue === 'initial' || originalValue === 'inherit' || originalValue === 'unset') {
        positionValue = 'static'; // Default position value
    }

    // Get the position select dropdown
    const positionSelect = root.getElementById('in_position');
    if (positionSelect) {
        console.log(`Before update - position select value: ${positionSelect.value}`);

        // Try to find a matching option
        let foundMatch = false;
        for (let option of positionSelect.options) {
            if (option.value === positionValue) {
                positionSelect.value = positionValue;
                foundMatch = true;
                console.log(`After update - position select value: ${positionSelect.value}`);
                break;
            }
        }

        if (foundMatch) {
            console.log(`Successfully restored position to: ${positionValue}`);
        } else {
            console.log(`Position option not found: ${positionValue}`);
            // Debug: List all available position options
            const allOptions = Array.from(positionSelect.options).map(option => option.value);
            console.log(`All available position options:`, allOptions);
        }
    } else {
        console.log(`Position select element not found: in_position`);
    }

    console.log(`Successfully restored position to: ${originalValue}`);
}

// Box shadow restoration function
function restoreBoxShadow(property, originalValue, root) {
    console.log(`Restoring box-shadow: ${property} = ${originalValue}`);

    if (property === 'box-shadow') {
        // Handle complete box-shadow shorthand (e.g., "2px 2px 4px rgba(0,0,0,0.3)")
        console.log(`Parsing box-shadow shorthand: ${originalValue}`);

        // Handle 'none' case - clear all inputs
        if (originalValue === 'none' || originalValue === 'initial' || originalValue === 'inherit' || originalValue === 'unset') {
            console.log(`Box shadow is none/initial - clearing all inputs`);

            // Clear all box shadow inputs
            const xInput = root.getElementById('in_bxsh_x');
            const yInput = root.getElementById('in_bxsh_y');
            const blurInput = root.getElementById('in_bxsh_blur');
            const spreadInput = root.getElementById('in_bxsh_spread');
            const hexInput = root.getElementById('in_bxsh_hex');
            const opacityInput = root.getElementById('in_bxsh_opac');
            const colorContainer = root.getElementById('in_bxsdc');

            if (xInput) xInput.value = '0';
            if (yInput) yInput.value = '0';
            if (blurInput) blurInput.value = '0';
            if (spreadInput) spreadInput.value = '0';
            if (hexInput) hexInput.value = '';
            if (opacityInput) opacityInput.value = '';
            if (colorContainer) colorContainer.style.backgroundColor = 'transparent';

            console.log(`All box shadow inputs cleared to default values`);

        } else {
            // Parse the box-shadow value
            const shadowMatch = originalValue.match(/(\d+(?:\.\d+)?)px\s+(\d+(?:\.\d+)?)px\s+(\d+(?:\.\d+)?)px\s+(\d+(?:\.\d+)?)px\s+(.+)/);
            if (shadowMatch) {
                const [, x, y, blur, spread, color] = shadowMatch;
                console.log(`Parsed box-shadow values: x=${x}, y=${y}, blur=${blur}, spread=${spread}, color=${color}`);

                // Update individual inputs
                const xInput = root.getElementById('in_bxsh_x');
                const yInput = root.getElementById('in_bxsh_y');
                const blurInput = root.getElementById('in_bxsh_blur');
                const spreadInput = root.getElementById('in_bxsh_spread');

                if (xInput) xInput.value = x;
                if (yInput) yInput.value = y;
                if (blurInput) blurInput.value = blur;
                if (spreadInput) spreadInput.value = spread;

                // Handle color and opacity
                if (color && color !== 'none') {
                    const colorValue = rgba2hexAdvanced(color);
                    const hexInput = root.getElementById('in_bxsh_hex');
                    const opacityInput = root.getElementById('in_bxsh_opac');
                    const colorContainer = root.getElementById('in_bxsdc');

                    if (hexInput && opacityInput && colorContainer) {
                        hexInput.value = colorValue.color;
                        opacityInput.value = colorValue.opacityPCT === 0 ? 100 : colorValue.opacityPCT;

                        // Update thumbnail with proper opacity
                        if (colorValue.opacityPCT < 100) {
                            const colorWithAlpha = hexColorWithOptionalAlpha(colorValue.color, colorValue.opacityPCT);
                            colorContainer.style.backgroundColor = colorWithAlpha;
                        } else {
                            colorContainer.style.backgroundColor = colorValue.color;
                        }
                        console.log(`Box shadow color restored: hex=${colorValue.color}, opacity=${colorValue.opacityPCT}`);
                    }
                } else {
                    // No color or 'none'
                    const hexInput = root.getElementById('in_bxsh_hex');
                    const opacityInput = root.getElementById('in_bxsh_opac');
                    const colorContainer = root.getElementById('in_bxsdc');

                    if (hexInput) hexInput.value = '';
                    if (opacityInput) opacityInput.value = '';
                    if (colorContainer) colorContainer.style.backgroundColor = 'transparent';
                }
            } else {
                console.log(`Could not parse box-shadow shorthand: ${originalValue}`);
            }
        }

    } else if (property === 'box-shadow-color') {
        // Handle box-shadow color
        const colorValue = rgba2hexAdvanced(originalValue);
        const hexInput = root.getElementById('in_bxsh_hex');
        const opacityInput = root.getElementById('in_bxsh_opac');
        const colorContainer = root.getElementById('in_bxsdc');

        if (hexInput && opacityInput && colorContainer) {
            if (originalValue !== 'rgba(0, 0, 0, 0)' && originalValue !== 'transparent') {
                hexInput.value = colorValue.color;
                opacityInput.value = colorValue.opacityPCT === 0 ? 100 : colorValue.opacityPCT;

                // Update thumbnail with proper opacity
                if (colorValue.opacityPCT < 100) {
                    const colorWithAlpha = hexColorWithOptionalAlpha(colorValue.color, colorValue.opacityPCT);
                    colorContainer.style.backgroundColor = colorWithAlpha;
                } else {
                    colorContainer.style.backgroundColor = colorValue.color;
                }
            } else {
                hexInput.value = '';
                opacityInput.value = '';
                colorContainer.style.backgroundColor = 'transparent';
            }
            console.log(`Box shadow color restored: hex=${colorValue.color}, opacity=${colorValue.opacityPCT}`);
        }

    } else if (property === 'box-shadow-opacity') {
        // Handle box-shadow opacity
        const opacityInput = root.getElementById('in_bxsh_opac');
        if (opacityInput) {
            opacityInput.value = originalValue;
            console.log(`Box shadow opacity restored: ${originalValue}`);
        }

    } else if (property === 'box-shadow-x') {
        // Handle box-shadow x offset
        const xInput = root.getElementById('in_bxsh_x');
        if (xInput) {
            xInput.value = originalValue.replace(/[^\d.-]/g, '');
            console.log(`Box shadow x restored: ${originalValue}`);
        }

    } else if (property === 'box-shadow-y') {
        // Handle box-shadow y offset
        const yInput = root.getElementById('in_bxsh_y');
        if (yInput) {
            yInput.value = originalValue.replace(/[^\d.-]/g, '');
            console.log(`Box shadow y restored: ${originalValue}`);
        }

    } else if (property === 'box-shadow-blur') {
        // Handle box-shadow blur
        const blurInput = root.getElementById('in_bxsh_blur');
        if (blurInput) {
            blurInput.value = originalValue.replace(/[^\d.-]/g, '');
            console.log(`Box shadow blur restored: ${originalValue}`);
        }

    } else if (property === 'box-shadow-spread') {
        // Handle box-shadow spread
        const spreadInput = root.getElementById('in_bxsh_spread');
        if (spreadInput) {
            spreadInput.value = originalValue.replace(/[^\d.-]/g, '');
            console.log(`Box shadow spread restored: ${originalValue}`);
        }
    }

    // Update slider positions for box shadow
    if (typeof window.updateSliderPositions === 'function') {
        window.updateSliderPositions();
    }

    console.log(`Successfully restored box-shadow: ${property} = ${originalValue}`);
}

// Helper function to find CSS rules that apply to the current element or its children
function findApplicableCssRules(element, property) {
    if (!element || !window.cssRulesJson) return null;

    // First, check if there's a direct rule for this element
    const elementSelector = generateElSelector(element);
    if (elementSelector && window.cssRulesJson[elementSelector] && window.cssRulesJson[elementSelector][property]) {
        return window.cssRulesJson[elementSelector][property];
    }

    // If no direct rule, check if any child elements have rules for this property
    const children = element.querySelectorAll('*');
    for (const child of children) {
        const childSelector = generateElSelector(child);
        if (childSelector && window.cssRulesJson[childSelector] && window.cssRulesJson[childSelector][property]) {
            return window.cssRulesJson[childSelector][property];
        }
    }

    return null;
}

// Make the function globally available
window.findApplicableCssRules = findApplicableCssRules;

function updateCssRulesJson(selector, property, value, enable, forceDelete = false) {
    if (!cssRulesJson[selector]) {
        const incrementalNumber = Object.keys(cssRulesJson).length + 1;
        cssRulesJson[selector] = {
            additionalInfo: {
                incrementalNumber: incrementalNumber,
                customClassName: `inspecta-element-${incrementalNumber}`,
                tagName: target?.nodeName,
                customTagName: target?.nodeName
            }
        };
    }
    target?.classList.add(cssRulesJson[selector].additionalInfo.customClassName);

    if (forceDelete && cssRulesJson[selector][property]) {
        delete cssRulesJson[selector][property];

        // Check if the rule is now empty (only has additionalInfo)
        const remainingProperties = Object.keys(cssRulesJson[selector]).filter(key => key !== 'additionalInfo');
        if (remainingProperties.length === 0) {
            // Remove the entire rule if it's empty
            delete cssRulesJson[selector];
        }
        return;
    }

    if (!forceDelete) {
        if (!cssRulesJson[selector][property]) {
            // Store original value when property is first added
            const originalValue = getOriginalPropertyValue(property);
            cssRulesJson[selector][property] = {
                enabled: enable,
                value: value,
                originalValue: originalValue
            };
        } else {
            cssRulesJson[selector][property].enabled = enable;
            cssRulesJson[selector][property].value = value;
            // Preserve original value if it exists
            if (!cssRulesJson[selector][property].originalValue) {
                cssRulesJson[selector][property].originalValue = getOriginalPropertyValue(property);
            }
        }
    }
}

function generateInspectaCssFromJson(selector, cssRulesJson) {
    const inspectaStylesheet = document.getElementById('inspectaStylesheet').sheet;
    for (let property in cssRulesJson[selector]) {
        if (property !== 'additionalInfo' && cssRulesJson[property].enabled) {
            applyCssRule(selector, property, cssRulesJson[property].value);
        }
    }
}



function replaceCssProperties(selector, cssPropertiesJson, applyChanges = false, forceAdd = true) {
    ('replaceCssProperties', selector, cssPropertiesJson, applyChanges, forceAdd);
    // Validate inputs and requirements
    if (!document.getElementById('inspectaStylesheet')) {
        return;
    }

    // Check if the selector exists in cssRulesJson
    if (!cssRulesJson[selector] && !forceAdd) {
        console.warn(`Selector ${selector} does not exist in cssRulesJson.`);
        return;
    }


    // Remove existing properties for the selector

    // Apply the new CSS rules

    //LOGIC FOR REPLACING CSS PROPERTIES
    //TODO: create a blacklist of properties that should not be applied from figma, width, height, position absolute, 
    //TODO: create a blacklist of properties that should not be reseted if not in figma like width, height, position



    // Iterate through all possible CSS properties
    for (let property of ALL_CSS_PROPERTIES_HYPHEN) {

        // Check if the property is not in pastedCssJson
        if (!cssPropertiesJson[property]) {
            //  (`property ${property} does not exist in cssPropertiesJson`);

            // Check if the property exists in the computed styles of the target
            const computedStyle = window.getComputedStyle(target);
            const currentValue = computedStyle.getPropertyValue(property);
            const defaultValue = CSS_DEFAULT_VALUES_HYPHEN[property];
            //  (`porperty ${property} currentValue`, currentValue);
            //  (`porperty ${property} defaultValue`, defaultValue);
            // If the property value is not the default value, add it to cssPropertiesJson
            if (currentValue && currentValue !== defaultValue) {
                ('adding property to cssPropertiesJson', property, defaultValue);
                cssPropertiesJson[property] = {
                    value: defaultValue.trim(),
                    enabled: true
                };
            }
        }
    }
    // Iterate through all possible CSS properties
    // for (let property of ALL_CSS_PROPERTIES_HYPHEN) {
    //     // Check if the property is not in pastedCssJson
    //     if (!pastedCssJson[property]) {
    //         // Check if the property exists in cssRulesJson[selector]
    //         if (cssRulesJson[selector] && cssRulesJson[selector][property]) {
    //             // Check if the property value is not the default value
    //             const currentValue = cssRulesJson[selector][property].value;
    //             const defaultValue = CSS_DEFAULT_VALUES_HYPHEN[property];
    //             if (currentValue !== defaultValue) {
    //                 // Remove the property from cssRulesJson
    //                 delete cssRulesJson[selector][property];
    //             }
    //         }
    //     }
    // }

    const inspectaStylesheet = document.getElementById('inspectaStylesheet').sheet;
    for (let i = 0; i < inspectaStylesheet.cssRules.length; i++) {
        const rule = inspectaStylesheet.cssRules[i];
        if (rule.selectorText === selector) {
            inspectaStylesheet.deleteRule(i);
            break;
        }
    }
    //  ('cssProperties', cssPropertiesJson);
    for (let property in cssPropertiesJson) {
        if (property !== 'additionalInfo' && cssPropertiesJson[property].enabled) {
            applyCssRule(selector, property, cssPropertiesJson[property].value);
        }
    }
    //if apply changes is true then remove all properties and add new properties
    if (applyChanges) {
        for (let property in cssRulesJson[selector]) {
            if (property !== 'additionalInfo') {
                delete cssRulesJson[selector][property];
            }
        }

        // Add new properties from newCssRulesJson
        for (let property in cssPropertiesJson) {
            if (property !== 'additionalInfo') {
                //  ('---here 1---');
                //  ('---here 1 selector---', selector);
                //  ('---here 1 property---', property);
                //  ('---here 1 cssRulesJson[property]---', cssRulesJson[property]);
                if (!cssRulesJson[selector]) {
                    const incrementalNumber = cssRulesJson ? Object.keys(cssRulesJson).length + 1 : 1;
                    cssRulesJson[selector] = {
                        additionalInfo: {
                            incrementalNumber: incrementalNumber,
                            customClassName: `inspecta-element-${incrementalNumber}`,
                            tagName: document.querySelector(selector)?.tagName || '',
                            customTagName: document.querySelector(selector)?.tagName || ''
                        }
                    };
                    //cssRulesJson[selector] = {};
                }
                //  ('---here 2---');
                //  ('cssRulesJson', cssRulesJson);
                cssRulesJson[selector][property] = {
                    value: cssPropertiesJson[property].value,
                    enabled: cssPropertiesJson[property].enabled
                };
            }
        }
        //  ('---cssRulesJson after---', cssRulesJson);
        saveCSS();
        generateInspectaFullCss();
        generateCssChangesCounter();
    }

}

function formatCssProperty(property) {
    return property.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
}

function formatCssValue(value, target, property) {
    if (["top", "right", "bottom", "left"].includes(property)) {
        if (value === "") return "auto";
    }
    if (property === 'z-index') {
        // If value is 'auto', keep it as is
        if (value === 'auto') {
            return 'auto';
        }
        // If value is empty or invalid, restore to last value or default to 'auto'
        if (!value || isNaN(Number(value))) {
            // Try to get the last valid value from cssRulesJson
            const selector = generateElSelector(target);
            if (cssRulesJson[selector] && cssRulesJson[selector]['z-index']) {
                return cssRulesJson[selector]['z-index'].value;
            }
            return 'auto';
        }
        // For numeric values, return as string
        return value.toString();
    }
    if (!isNaN(Number(value))) return value;
    // Remove !important from value if present
    if (typeof value === 'string') {
        value = value.replace(/\s*!important\s*/i, '');
    }
    return value;
}

function applyCssRule(selector, property, value) {
    // Sanitize value to always be a string
    if (Array.isArray(value)) {
        value = value[0] || '';
    }
    if (typeof value !== 'string') {
        value = String(value);
    }

    // Update the stylesheet
    const stylesheet = document.getElementById('inspectaStylesheet');
    if (stylesheet && stylesheet.sheet) {
        const rules = stylesheet.sheet.cssRules;
        let rule = null;
        for (let i = 0; i < rules.length; i++) {
            if (rules[i].selectorText === selector) {
                rule = rules[i];
                break;
            }
        }

        // Use the value as-is, without automatically adding !important
        let finalValue = value;

        if (rule) {
            // Update the existing rule by modifying its style property
            if (finalValue === '' || finalValue === null || finalValue === undefined) {
                // Remove the property if value is empty
                rule.style.removeProperty(property);
            } else {
                // Set the property with the new value
                rule.style.setProperty(property, finalValue);
            }
        } else if (finalValue !== '' && finalValue !== null && finalValue !== undefined) {
            // No existing rule, create a new one with this property
            const newRule = `${selector} { ${property}: ${finalValue}; }`;
            try {
                stylesheet.sheet.insertRule(newRule, stylesheet.sheet.cssRules.length);
            } catch (e) {
                console.error('Failed to insert rule:', e);
                // If insertion fails, try without !important
                const fallbackRule = `${selector} { ${property}: ${finalValue.replace(' !important', '')}; }`;
                stylesheet.sheet.insertRule(fallbackRule, stylesheet.sheet.cssRules.length);
            }
        }

    } else {
        console.error('Stylesheet not found or not accessible');
    }
}

function setCssProperty(stylesheet, propertyName, propertyValue) {
    // Convert JavaScript property name to CSS property name
    propertyName = propertyName.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
    const cssRule = `${propertyName}: ${propertyValue};`;

    // Use a regular expression to find the property in the stylesheet
    const propertyRegex = new RegExp(`(${propertyName}\\s*:\\s*[^;]+;)`, 'i');

    // If the property is found in the stylesheet
    if (propertyRegex.test(stylesheet)) {
        // Replace the old property value with the new one
        stylesheet = stylesheet.replace(propertyRegex, cssRule);
    } else {
        // If the property is not found, add it to the end of the last rule in the stylesheet
        const lastClosingBraceIndex = stylesheet.lastIndexOf('}');
        stylesheet = stylesheet.substring(0, lastClosingBraceIndex) + ' ' + cssRule + ' ' + stylesheet.substring(lastClosingBraceIndex);
    }

    return stylesheet;
}

/**
 * generate css selector
 * @param {*} element 
 * @returns CSS selector with parents 
 */


function generateElSelector(el) {
    const elClass = (EL) => {
        const INSP = 'inspecta-inspect-active';
        const INSP2 = 'inspecta-inspect';
        const TEXT_SELECTED = 'text-node-selected';
        // Handle both string and DOMTokenList cases
        let className = '';
        if (typeof EL.className === 'string') {
            className = EL.className;
        } else if (EL.classList) {
            className = Array.from(EL.classList).join(' ');
        }
        // Remove inspecta classes and text-node-selected
        className = className.replace(INSP, '').replace(INSP2, '').replace(TEXT_SELECTED, '').trim();
        // Filter out classes with unsupported characters
        const validClassRegex = /^[a-zA-Z0-9_-]+$/;
        const filteredClassList = className.split(' ')
            .filter(cls =>
                cls !== INSP &&
                cls !== INSP2 &&
                cls !== TEXT_SELECTED &&
                !cls.includes('inspecta-element-') &&
                validClassRegex.test(cls)
            );
        return filteredClassList.join(' ');
    }

    const idx = (sib, name) =>
        sib ? idx(sib.previousElementSibling, name || sib.localName) + (sib.localName == name) : 1;
    const segs = (elm, depth = 0) => {
        if (!elm || elm.nodeType !== 1 || elm.localName.toLowerCase() === 'html' || depth >= 50) {
            return [];
        }
        if (elm.id && document.getElementById(elm.id) === elm) {
            return [...segs(elm.parentNode, depth + 1), `#${elm.id}`];
        }
        const classes = elClass(elm);
        if (classes) {
            // Check uniqueness among siblings
            const parent = elm.parentNode;
            if (parent) {
                const sameClassSiblings = Array.from(parent.children).filter(sib => {
                    if (sib === elm) return false;
                    if (sib.localName !== elm.localName) return false;
                    const sibClasses = elClass(sib);
                    return sibClasses === classes;
                });
                if (sameClassSiblings.length > 0) {
                    // Not unique, add :nth-of-type
                    return [
                        ...segs(elm.parentNode, depth + 1),
                        elm.localName.toLowerCase() + classes.replace(/^|\s+/g, ".") + `:nth-of-type(${idx(elm)})`
                    ];
                } else {
                    // Unique, just use class selector
                    return [
                        ...segs(elm.parentNode, depth + 1),
                        elm.localName.toLowerCase() + classes.replace(/^|\s+/g, ".")
                    ];
                }
            }
        }
        if (idx(elm) > 1) {
            return [
                ...segs(elm.parentNode, depth + 1),
                `${elm.localName.toLowerCase()}:nth-of-type(${idx(elm)})`
            ];
        }
        return [
            ...segs(elm.parentNode, depth + 1),
            elm.localName.toLowerCase()
        ];
    };
    return segs(el).join(' > ');
}


/**
 * Create we Stylesheet
 * **/

function createInspectaStylesheet(cssCode) {
    // Check css exists
    if (document.getElementById('inspectaStylesheet')) {
        return
    } else {
        const inspectaStylesheet = document.createElement('style');
        inspectaStylesheet.type = 'text/css';
        inspectaStylesheet.setAttribute('id', 'inspectaStylesheet')
        inspectaStylesheet.innerHTML = cssCode;
        document.head.appendChild(inspectaStylesheet);
    }
}

function generateCssRuleText(selector) {
    let cssJsonText = `/*#${cssRulesJson[selector].additionalInfo.incrementalNumber} ${cssRulesJson[selector].additionalInfo.customTagName}*/\n`;
    cssJsonText += selector + ' {\n';
    let properties = {};
    Object.keys(cssRulesJson[selector]).forEach((key) => {
        if (key !== 'additionalInfo' && cssRulesJson[selector][key].enabled)
            properties[key] = cssRulesJson[selector][key];
    });
    properties = getShorthandProperties(properties);
    Object.keys(properties).forEach((key) => {
        let value = properties[key].value;
        if (isColorProperty(key)) value = normalizeColorValue(value);
        cssJsonText += `    ${key}: ${value};\n`;
    });
    cssJsonText += '}\n\n';
    return cssJsonText;
}

function countPropertiesInJSONCSS() {
    let propertyCount = 0;
    for (let selector in cssRulesJson) {
        const rule = cssRulesJson[selector];
        if (rule.additionalInfo?.isGlobalColorChange || rule.additionalInfo?.isGlobalFontChange) {
            // A global change (color or font) is one logical change. Only count it if it's active.
            // We check if any of the properties within the rule are enabled.
            let isEnabled = false;
            for (const key in rule) {
                if (key !== 'additionalInfo' && rule[key].enabled) {
                    isEnabled = true;
                    break;
                }
            }
            if (isEnabled) {
                propertyCount++;
            }
        } else {
            // For standard rules, count each enabled property.
            for (const key in rule) {
                if (key !== 'additionalInfo' && rule[key].enabled) {
                    propertyCount++;
                }
            }
        }
    }
    return propertyCount;
}

function stylesheetToCssHtml(stylesheet) {
    let cssHtml = '';
    let cssJsonText = '';
    for (let selector in cssRulesJson) {
        cssJsonText += generateCssRuleText(selector);
    }
    cssHtml += cssJsonText;
    return cssHtml;
}

// Function to remove all Inspecta-applied inline styles from an element
function removeAllInspectaInlineStyles(element) {
    if (!element || !element.style) return;

    // List of CSS properties that Inspecta commonly modifies
    // This list should include ALL properties that Inspecta might modify for proper cleanup
    const inspectaProperties = [
        'color', 'background-color', 'background-image', 'background-size', 'background-repeat',
        'font-family', 'font-size', 'font-weight', 'line-height', 'text-align', 'text-decoration',
        'border', 'border-width', 'border-style', 'border-color', 'border-radius',
        'border-top', 'border-right', 'border-bottom', 'border-left',
        'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
        'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
        'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
        'border-top-left-radius', 'border-top-right-radius', 'border-bottom-left-radius', 'border-bottom-right-radius',
        'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
        'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
        'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
        'display', 'position', 'top', 'right', 'bottom', 'left', 'z-index',
        'opacity', 'visibility', 'overflow', 'overflow-x', 'overflow-y',
        'transform', 'transition', 'animation', 'box-shadow', 'text-shadow'
    ];

    // Remove each Inspecta property from the element's inline styles
    inspectaProperties.forEach(property => {
        if (element.style.getPropertyValue(property)) {
            element.style.removeProperty(property);
        }
    });

    // If the element has no remaining inline styles, remove the style attribute entirely
    if (element.style.length === 0) {
        element.removeAttribute('style');
    }
}

// Function to clean up all duplicate CSS rules in cssRulesJson
function cleanupAllDuplicateCssRules() {
    if (!cssRulesJson || Object.keys(cssRulesJson).length === 0) {
        return;
    }

    const selectors = Object.keys(cssRulesJson);
    const processedSelectors = new Set();
    const duplicatesToRemove = [];

    // Find potential duplicates by comparing tag names and custom tag names
    for (let i = 0; i < selectors.length; i++) {
        const selector1 = selectors[i];
        if (processedSelectors.has(selector1)) continue;

        const rule1 = cssRulesJson[selector1];
        if (!rule1 || !rule1.additionalInfo) continue;

        const tagName1 = rule1.additionalInfo.tagName;
        const customTagName1 = rule1.additionalInfo.customTagName;

        for (let j = i + 1; j < selectors.length; j++) {
            const selector2 = selectors[j];
            if (processedSelectors.has(selector2)) continue;

            const rule2 = cssRulesJson[selector2];
            if (!rule2 || !rule2.additionalInfo) continue;

            const tagName2 = rule2.additionalInfo.tagName;
            const customTagName2 = rule2.additionalInfo.customTagName;

            // Check if these rules represent the same element
            if ((tagName1 === tagName2 && tagName1) ||
                (customTagName1 === customTagName2 && customTagName1)) {

                // Merge properties from the second rule into the first
                Object.keys(rule2).forEach(property => {
                    if (property !== 'additionalInfo') {
                        rule1[property] = rule2[property];
                    }
                });

                // Mark the second rule for removal
                duplicatesToRemove.push(selector2);
                processedSelectors.add(selector2);
            }
        }
        processedSelectors.add(selector1);
    }

    // Remove duplicate rules
    duplicatesToRemove.forEach(selector => {
        delete cssRulesJson[selector];
        console.log('Removed duplicate CSS rule during cleanup:', selector);
    });
}

function deleteCss(removeFromStore = true) {
    // Temporarily disable CSS rule change monitoring to prevent indicators from being recreated
    window._cssRuleChangeMonitorDisabled = true;

    // Before clearing everything, restore all original values to the UI
    restoreAllOriginalValuesToUI();

    // Clean up any duplicate CSS rules that might exist from isolate mode
    if (window.elementToolbar && typeof window.elementToolbar.cleanupDuplicateCssRules === 'function') {
        window.elementToolbar.cleanupDuplicateCssRules();
    }

    // Additional cleanup: remove any duplicate rules that might exist in cssRulesJson
    cleanupAllDuplicateCssRules();

    const inspectaStylesheet = document.getElementById('inspectaStylesheet');
    if (inspectaStylesheet && inspectaStylesheet.parentNode) {
        inspectaStylesheet.parentNode.removeChild(inspectaStylesheet);
    }
    cssRulesJson = {};

    // Remove all inline styles from all styled elements
    if (window.inspectaStyledElements) {
        window.inspectaStyledElements.forEach(el => removeAllInspectaInlineStyles(el));
        window.inspectaStyledElements.clear();
    }

    // Also clean up ALL elements that might have Inspecta classes or styles
    // This ensures we catch any elements that weren't tracked in inspectaStyledElements
    document.querySelectorAll('*').forEach(element => {
        // Check if element has any Inspecta-related classes
        const hasInspectaClass = element.classList && (
            element.classList.contains('inspecta-element-') ||
            Array.from(element.classList).some(cls => cls.startsWith('inspecta-element-'))
        );

        // Check if element has inline styles that might be from Inspecta
        const hasInlineStyles = element.style && element.style.length > 0;

        if (hasInspectaClass || hasInlineStyles) {
            removeAllInspectaInlineStyles(element);

            // Remove Inspecta classes
            if (element.classList) {
                Array.from(element.classList).forEach(cls => {
                    if (cls.startsWith('inspecta-element-')) {
                        element.classList.remove(cls);
                    }
                });
            }
        }
    });

    // Clean up originalSelector properties from all elements to prevent future conflicts
    document.querySelectorAll('*').forEach(element => {
        if (element.originalSelector) {
            delete element.originalSelector;
        }
    });

    // Clean up any remaining isolate mode wrappers and restore elements
    const isolationWrapper = document.getElementById('inspecta_isolation_wrapper');
    if (isolationWrapper) {
        // If there's an active isolation wrapper, clean it up
        const isolatedElement = isolationWrapper.querySelector('.inspecta-inspect-isolated');
        if (isolatedElement && window.elementToolbar) {
            // Exit isolation mode properly to clean up everything
            window.elementToolbar.exitIsolationMode();
        }
    }

    if (removeFromStore)
        removeCSS();

    // Clear all property change indicators
    if (typeof clearAllPropertyChangeIndicators === 'function') {
        clearAllPropertyChangeIndicators();
    }

    // Also call the force clear function to ensure all indicators are removed
    if (typeof window.forceClearAllIndicators === 'function') {
        window.forceClearAllIndicators();
    }

    // Re-enable CSS rule change monitoring after a short delay
    setTimeout(() => {
        window._cssRuleChangeMonitorDisabled = false;
    }, 100);
}

function exportToFile() {
    // Use a function that generates CSS with just target element selectors for file export
    const cssHtml = generateCssForFileExport();
    const blob = new Blob([cssHtml], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'styles.css';
    a.click();
}

/**
 * Generate CSS for file export using just target element selectors
 * @returns {string} CSS text for file export
 */
function generateCssForFileExport() {
    let cssHtml = '';
    let cssJsonText = '';
    for (let selector in cssRulesJson) {
        cssJsonText += generateCssRuleTextForExport(selector);
    }
    cssHtml += cssJsonText;
    return cssHtml;
}

/**
 * Extract just the target element's selector from a full path selector
 * @param {string} fullSelector - The full selector path (e.g., "body.body > section.section-featured > div.w-layout-blockcontainer.featured.w-container")
 * @returns {string} Just the target element's selector (e.g., "div.w-layout-blockcontainer.featured.w-container")
 */
function extractTargetElementSelector(fullSelector) {
    // Split by ' > ' to get individual parts
    const parts = fullSelector.split(' > ');
    // Return just the last part (the target element)
    // If there's no ' > ' in the selector, return the original selector
    return parts[parts.length - 1] || fullSelector;
}

function generateCssRuleTextForExport(selector) {
    let cssJsonText = `/*#${cssRulesJson[selector].additionalInfo.incrementalNumber} ${cssRulesJson[selector].additionalInfo.customTagName}*/\n`;
    // Use just the target element's selector for export
    const targetSelector = extractTargetElementSelector(selector);
    cssJsonText += targetSelector + ' {\n';
    let properties = {};
    Object.keys(cssRulesJson[selector]).forEach((key) => {
        if (key !== 'additionalInfo' && cssRulesJson[selector][key].enabled)
            properties[key] = cssRulesJson[selector][key];
    });
    // Use shorthand properties for export
    properties = getShorthandProperties(properties);
    Object.keys(properties).forEach((key) => {
        let value = properties[key].value;
        if (isColorProperty(key)) value = normalizeColorValue(value);
        cssJsonText += `    ${key}: ${value};\n`;
    });
    cssJsonText += '}\n\n';
    return cssJsonText;
}

function copyToClipboard() {
    const cssHtml = Object.keys(cssRulesJson)
        .map(selector => generateCssRuleTextForExport(selector))
        .join('');
    navigator.clipboard.writeText(cssHtml);
    if (window.showToast) window.showToast('Copied to clipboard');
}

/**
 * Copy CSS changes as AI-friendly JSON payload to clipboard
 * @param {string} selector - The CSS selector for the rule
 */
function copyToAI(selector) {
    try {
        const aiPayload = generateAIJsonPayload(selector);

        // Check if there are actual changes
        if (aiPayload.css.changes.length === 0) {
            console.warn('No CSS changes detected for selector:', selector);
            console.log('Available properties:', Object.keys(cssRulesJson[selector] || {}));
        }

        const promptText = generateAIPrompt(aiPayload, selector);

        navigator.clipboard.writeText(promptText);
        if (window.showToast) window.showToast('CSS + prompt copied to clipboard');
    } catch (error) {
        console.error('Error generating AI payload:', error);
        if (window.showToast) window.showToast('Error generating AI payload');
    }
}

/**
 * Send single CSS rule to Cursor AI agent via WebSocket
 * @param {string} selector - The CSS selector for the rule
 */
function sendToCursorSingleRule(selector) {
    // console.log('🚀 sendToCursorSingleRule function called for:', selector);

    // Check if on localhost first
    if (!isLocalhost()) {
        if (window.showToast) window.showToast('Send to Cursor only works on localhost');
        return;
    }

    try {
        const aiPayload = generateAIJsonPayload(selector);

        // Check if there are actual changes
        if (aiPayload.css.changes.length === 0) {
            if (window.showToast) window.showToast('No CSS changes found for this rule');
            return;
        }

        const promptText = generateAIPrompt(aiPayload, selector);
        const context = getContextInfo();

        // Create single change object
        const singleChange = {
            selector: selector,
            changes: aiPayload.css.changes.map(c => `${c.property}: ${c.old} → ${c.new}`).join(', '),
            boundingBox: aiPayload.boundingBox,
            isGlobal: aiPayload.element.tag === 'Global Change'
        };

        // Prepare data for Cursor
        const cursorData = {
            prompt: promptText,
            cssChanges: [singleChange],
            context: context,
            timestamp: Date.now()
        };

        // Send to Cursor extension
        sendToCursorExtension(cursorData);

    } catch (error) {
        console.error('Error sending single rule to Cursor:', error);
        if (window.showToast) window.showToast('Error sending to Cursor');
    }
}

/**
 * Check if the current page is running on localhost
 * @returns {boolean} True if on localhost, false otherwise
 */
function isLocalhost() {
    const hostname = window.location.hostname;
    return hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.endsWith('.local');
}

/**
 * Update Send to Cursor button states based on localhost status
 */
function updateSendToCursorButtons() {
    const isLocal = isLocalhost();

    // Update individual rule "Send to Cursor" buttons
    const sendToCursorRuleButtons = document.querySelectorAll('.send_to_cursor_rule');
    sendToCursorRuleButtons.forEach(button => {
        if (isLocal) {
            button.classList.remove('disabled');
            button.removeAttribute('disabled');
            button.style.opacity = '1';
        } else {
            // Keep button looking normal but mark as disabled for tooltip
            button.classList.add('disabled');
            button.removeAttribute('disabled'); // Keep it clickable
            button.style.opacity = '1'; // Keep full opacity - no visual disabling
        }
    });

    // Update "Send to Cursor" button for all changes
    const sendToCursorAllButton = document.querySelector('#changes_action_send_to_cursor');
    if (sendToCursorAllButton) {
        if (isLocal) {
            sendToCursorAllButton.classList.remove('disabled');
            sendToCursorAllButton.removeAttribute('disabled');
            sendToCursorAllButton.style.opacity = '1';
        } else {
            // Keep button looking normal but mark as disabled for tooltip
            sendToCursorAllButton.classList.add('disabled');
            sendToCursorAllButton.removeAttribute('disabled'); // Keep it clickable
            sendToCursorAllButton.style.opacity = '1'; // Keep full opacity - no visual disabling
        }
    }
}

/**
 * Get base instructions for all prompt types
 * @param {string} promptType - Type of prompt ('global_color', 'global_font', 'single_rule', 'multiple_rules')
 * @returns {Array} Array of base instructions
 */
function getBaseInstructions(promptType) {
    const baseInstructions = [
        "Apply these changes using the current framework and existing code patterns.",
        "Follow the codebase's CSS architecture and naming conventions.",
        "Use the bounding box info to understand element positioning and layout context.",
        "Maintain consistency with existing component structure and styling approach.",
        "Do not create new files; only modify existing ones.",
        "Do not create new CSS rules - modify existing rules to achieve the change whenever possible.",
        "Do not create new responsive breakpoint rules - only update the main definition.",
        "Only update responsive breakpoint rules if the old value is explicitly found within those specific breakpoint rules."
    ];

    // Add type-specific instructions
    if (promptType === 'global_color') {
        baseInstructions.push(
            "Detect framework and styling patterns (CSS vars, SCSS, Tailwind, MUI, styled-components).",
            "If variables or tokens exist, update their definitions instead of hardcoded values.",
            "Exclude inline SVG fills or strokes in non-icon graphics (logos, illustrations, decorative svgs).",
            "Include and update SVG icons that use the old color value, following the same rules as CSS.",
            "Otherwise, replace all instances of the old color globally.",
            "Follow existing naming conventions and color formats.",
            "Maintain theme structure (light/dark variants, overrides).",
            "Provide a brief summary of what was changed (avoid technical details)."
        );
    } else if (promptType === 'global_font') {
        baseInstructions.push(
            "Detect framework and styling patterns (CSS vars, SCSS, Tailwind, MUI, styled-components).",
            "If typography variables or tokens exist, update their definitions instead of hardcoded values.",
            "Otherwise, replace all instances of this font globally.",
            "Follow existing naming and font format conventions.",
            "Maintain typography hierarchy and design system structure.",
            "Test readability across different screen sizes and update font loading if using web fonts.",
            "Provide a brief summary of what was changed (avoid technical details)."
        );
    } else if (promptType === 'multiple_rules') {
        baseInstructions.push(
            "Process changes in order and maintain relationships between related elements.",
            "Provide a brief summary of what was changed (avoid technical details)."
        );
    } else {
        // single_rule or default
        baseInstructions.push(
            "Provide a brief summary of what was changed (avoid technical details)."
        );
    }

    return baseInstructions;
}

/**
 * Generate framework-specific instructions based on detected framework
 * @param {string} frameworkName - The detected framework name
 * @param {Object} patterns - Codebase patterns information
 * @returns {Array} Array of framework-specific instructions
 */
function getFrameworkSpecificInstructions(frameworkName, patterns) {
    const baseInstructions = [
        "Apply these changes using the current framework and existing code patterns.",
        "Follow the codebase's CSS architecture and naming conventions.",
        "Use the bounding box info to understand element positioning and layout context.",
        "Maintain consistency with existing component structure and styling approach.",
        "Do not create new files; only modify existing ones.",
        "Summarize the changes made and any framework patterns detected."
    ];

    const frameworkInstructions = {
        'webflow': [
            "This is a Webflow project with generated CSS classes.",
            "Webflow uses its own class naming system (w-, w-[name]-[number], etc.).",
            "Do not modify Webflow's generated classes directly.",
            "Apply changes using custom CSS that targets the existing Webflow classes.",
            "Use CSS custom properties or additional classes to override Webflow styles.",
            "Maintain Webflow's responsive breakpoint system and component structure."
        ],
        'tailwind': [
            "Use Tailwind utility classes where possible instead of custom CSS.",
            "Follow Tailwind's design system and spacing scale.",
            "Consider using Tailwind's color palette and design tokens.",
            "If custom CSS is needed, place it in appropriate component files or global styles."
        ],
        'bootstrap': [
            "Use Bootstrap's component classes and utility classes where possible.",
            "Follow Bootstrap's grid system and component patterns.",
            "Consider using Bootstrap's color variables and design tokens.",
            "If custom CSS is needed, use Bootstrap's customization methods."
        ],
        'material-ui': [
            "Use Material-UI's theme system and component props where possible.",
            "Follow Material Design principles and spacing guidelines.",
            "Consider using Material-UI's color palette and typography scale.",
            "If custom CSS is needed, use Material-UI's styling solutions (styled-components, sx prop, etc.)."
        ],
        'styled-components': [
            "Use styled-components syntax for component-specific styles.",
            "Follow the existing styled-components patterns in the codebase.",
            "Consider using theme providers and design tokens.",
            "Maintain component isolation and avoid global style pollution."
        ],
        'css-modules': [
            "Use CSS Modules syntax with local class names.",
            "Follow the existing CSS Modules naming conventions.",
            "Consider using CSS custom properties for theming.",
            "Maintain component-specific styles and avoid global styles."
        ],
        'unknown': [
            "Analyze the existing CSS architecture and follow established patterns.",
            "Use standard CSS practices and maintain consistency with existing styles.",
            "Consider using CSS custom properties for maintainable theming.",
            "Follow the detected naming conventions and component structure."
        ]
    };

    const specificInstructions = frameworkInstructions[frameworkName] || frameworkInstructions['unknown'];

    // Add component structure specific instructions
    if (patterns.componentStructure !== 'unknown') {
        specificInstructions.push(`Component structure detected: ${patterns.componentStructure}. Follow ${patterns.componentStructure} best practices for styling.`);
    }

    // Add naming convention specific instructions
    if (patterns.namingConvention !== 'unknown') {
        specificInstructions.push(`Naming convention detected: ${patterns.namingConvention}. Follow ${patterns.namingConvention} naming patterns.`);
    }

    return [...baseInstructions, ...specificInstructions];
}

/**
 * Generate AI prompt with framework-specific guidance
 * @param {Object} aiPayload - The AI payload data
 * @param {string} selector - The CSS selector for the rule
 * @returns {string} Formatted prompt text
 */
function generateAIPrompt(aiPayload, selector) {
    // Check if this is a global change
    const isGlobalChange = aiPayload.element.tag === 'Global Change';

    if (isGlobalChange) {
        // Simple prompt for global changes
        const changes = aiPayload.css.changes;
        if (changes.length > 0) {
            const ruleData = cssRulesJson[selector];

            // Check if this is a global font change
            if (ruleData?.additionalInfo?.isGlobalFontChange) {
                // Handle global font changes
                const fontFamily = ruleData['font-family']?.value || '';
                const fontSize = ruleData['font-size']?.value || '';
                const fontWeight = ruleData['font-weight']?.value || '';
                const lineHeight = ruleData['line-height']?.value || '';

                // Get original values directly from the rule data
                const originalFontFamily = ruleData['font-family']?.originalValue || 'original';
                const originalFontSize = ruleData['font-size']?.originalValue || 'original';
                const originalLineHeight = ruleData['line-height']?.originalValue || 'original';
                const originalFontWeight = ruleData['font-weight']?.originalValue || 'original';

                return JSON.stringify({
                    "type": "global_font_change",
                    "old_values": {
                        "font_family": originalFontFamily,
                        "font_size": originalFontSize,
                        "font_weight": originalFontWeight,
                        "line_height": originalLineHeight
                    },
                    "new_values": {
                        "font_family": fontFamily,
                        "font_size": fontSize,
                        "font_weight": fontWeight,
                        "line_height": lineHeight
                    },
                    "context": {
                        "detect_project_type": true,
                        "allow_file_creation": false,
                        "ignore_breakpoints": true
                    },
                    "instructions": getBaseInstructions('global_font')
                }, null, 2);
            } else {
                // Handle global color changes
                const firstChange = changes[0];
                let originalColor = 'original value';
                if (ruleData) {
                    for (let prop in ruleData) {
                        if (prop !== 'additionalInfo' && ruleData[prop]?.originalColor) {
                            originalColor = ruleData[prop].originalColor;
                            break;
                        }
                    }
                }
                const newValue = firstChange.new;

                return JSON.stringify({
                    "type": "global_color_change",
                    "old_color": originalColor,
                    "new_color": newValue,
                    "context": {
                        "detect_project_type": true,
                        "allow_file_creation": false,
                        "ignore_breakpoints": true
                    },
                    "instructions": getBaseInstructions('global_color')
                }, null, 2);
            }
        }
    }

    // Compact format for single rule changes
    const changes = aiPayload.css.changes;
    const context = aiPayload.context;
    const boundingBox = aiPayload.boundingBox;
    const element = aiPayload.element;

    if (changes.length === 0) {
        return 'No CSS changes detected for this element.';
    }

    const changesText = changes.map(c => `${c.property}: ${c.old} → ${c.new}`).join(', ');
    let line = `${selector} { ${changesText} }`;

    // Add bounding box info for context
    if (boundingBox) {
        line += ` [${boundingBox.width}×${boundingBox.height}px at ${boundingBox.x},${boundingBox.y}]`;
    }

    // Add element context for identification
    let elementContext = '';
    if (element.tag) {
        elementContext += `\nElement: <${element.tag}`;
        if (element.id) elementContext += ` id="${element.id}"`;
        if (element.classes && element.classes.length > 0) {
            elementContext += ` class="${element.classes.join(' ')}"`;
        }
        elementContext += '>';
    }

    return JSON.stringify({
        "type": "single_css_change",
        "selector": selector,
        "changes": changes.map(c => ({
            "property": c.property,
            "old_value": c.old,
            "new_value": c.new
        })),
        "element": {
            "tag": element.tag,
            "id": element.id,
            "classes": element.classes
        },
        "bounding_box": boundingBox ? {
            "width": boundingBox.width,
            "height": boundingBox.height,
            "x": boundingBox.x,
            "y": boundingBox.y
        } : null,
        "context": {
            "file_hint": context.codePlacementHint,
            "url": context.pageUrl,
            "detect_project_type": true,
            "allow_file_creation": false,
            "ignore_breakpoints": true
        },
        "instructions": getBaseInstructions('single_rule')
    }, null, 2);
}

/**
 * Generate structured JSON payload for AI agents
 * @param {string} selector - The CSS selector for the rule
 * @returns {Object} Structured JSON payload
 */
function generateAIJsonPayload(selector) {
    const ruleData = cssRulesJson[selector];

    if (!ruleData) {
        throw new Error('Rule data not found for selector: ' + selector);
    }

    // Handle global color and font changes differently
    if (ruleData.additionalInfo?.isGlobalColorChange || ruleData.additionalInfo?.isGlobalFontChange) {
        const payload = {
            element: {
                tag: 'Global Change',
                classes: [],
                id: null,
                parentPath: 'Global Change'
            },
            css: getCssChanges(ruleData),
            boundingBox: null,
            context: getContextInfo()
        };
        return payload;
    }

    const element = document.querySelector(selector);
    if (!element) {
        throw new Error('Element not found for selector: ' + selector);
    }

    const payload = {
        element: getElementMetadata(element),
        css: getCssChanges(ruleData),
        boundingBox: getBoundingBoxInfo(element),
        context: getContextInfo()
    };

    return payload;
}

/**
 * Extract element metadata
 * @param {Element} element - The DOM element
 * @returns {Object} Element metadata
 */
function getElementMetadata(element) {
    const classes = Array.from(element.classList);
    const parentPath = generateParentPath(element);

    return {
        id: element.id || null,
        classes: classes,
        tag: element.tagName.toLowerCase(),
        parentPath: parentPath
    };
}

/**
 * Generate parent path for element location
 * @param {Element} element - The DOM element
 * @returns {string} Parent path string
 */
function generateParentPath(element) {
    const path = [];
    let current = element;

    while (current && current !== document.body) {
        let selector = current.tagName.toLowerCase();

        if (current.id) {
            selector += `#${current.id}`;
        }

        if (current.classList.length > 0) {
            const classes = Array.from(current.classList).slice(0, 3); // Limit to first 3 classes
            selector += '.' + classes.join('.');
        }

        path.unshift(selector);
        current = current.parentElement;
    }

    return path.join(' > ');
}

/**
 * Extract CSS changes data
 * @param {Object} ruleData - The CSS rule data from cssRulesJson
 * @returns {Object} CSS changes information
 */
function getCssChanges(ruleData) {
    const before = {};
    const after = {};
    const changes = [];

    Object.keys(ruleData).forEach(key => {
        if (key === 'additionalInfo') return;

        const property = ruleData[key];
        // Include all properties that have values, regardless of enabled state
        if (property.value && (typeof property.value === 'string' ? property.value.trim() !== '' : property.value !== '')) {
            // For global color changes, use originalColor instead of originalValue
            const originalValue = property.originalColor || property.originalValue || '';
            const currentValue = property.value || '';

            before[key] = originalValue;
            after[key] = currentValue;

            // Add to changes if there's a difference, or if originalValue is empty (new property)
            if (originalValue !== currentValue || (originalValue === '' && currentValue !== '')) {
                changes.push({
                    property: key,
                    old: originalValue,
                    new: currentValue
                });
            }
        }
    });

    return {
        before: before,
        after: after,
        changes: changes
    };
}

/**
 * Get element bounding box information
 * @param {Element} element - The DOM element
 * @returns {Object} Bounding box data
 */
function getBoundingBoxInfo(element) {
    if (!element) {
        return null;
    }

    const rect = element.getBoundingClientRect();

    return {
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
    };
}

/**
 * Detect active breakpoint from codebase CSS rules
 * @returns {string} The active breakpoint name
 */
function detectActiveBreakpoint() {
    // Look for media queries in the current stylesheets
    const styleSheets = Array.from(document.styleSheets);
    const mediaQueries = [];

    try {
        styleSheets.forEach(sheet => {
            if (sheet.cssRules) {
                Array.from(sheet.cssRules).forEach(rule => {
                    if (rule.type === CSSRule.MEDIA_RULE) {
                        mediaQueries.push(rule.media.mediaText);
                    }
                });
            }
        });
    } catch (e) {
        // Some stylesheets might not be accessible due to CORS
        // console.log('Some stylesheets not accessible for breakpoint detection');
    }

    // If no media queries found, return desktop as default
    if (mediaQueries.length === 0) {
        return 'desktop';
    }

    // Check which media query is currently active
    const viewportWidth = window.innerWidth;

    for (const mediaQuery of mediaQueries) {
        if (window.matchMedia(mediaQuery).matches) {
            // Extract breakpoint name from media query or use a simple mapping
            if (mediaQuery.includes('max-width: 768px') || mediaQuery.includes('max-width: 767px')) {
                return 'mobile';
            } else if (mediaQuery.includes('min-width: 1024px') || mediaQuery.includes('min-width: 1200px')) {
                return 'desktop';
            } else if (mediaQuery.includes('min-width: 768px') && mediaQuery.includes('max-width: 1023px')) {
                return 'tablet';
            }
        }
    }

    // Fallback based on viewport if no specific media query matches
    if (viewportWidth < 768) {
        return 'mobile';
    } else if (viewportWidth < 1024) {
        return 'tablet';
    } else {
        return 'desktop';
    }
}

/**
 * Get context information for AI reasoning
 * @returns {Object} Context information
 */
function getContextInfo() {
    return {
        pageUrl: window.location.href,
        activeBreakpoint: detectActiveBreakpoint(),
        note: null, // Could be populated from user input in the future
        codePlacementHint: generateCodePlacementHint(),
        cssFramework: detectCSSFramework(),
        codebasePatterns: detectCodebasePatterns()
    };
}

/**
 * Generate code placement hint based on element context
 * @returns {string} Suggested file path
 */
function generateCodePlacementHint() {
    // This is a simple heuristic - could be enhanced with more sophisticated logic
    const path = window.location.pathname;
    const isComponent = path.includes('/component') || path.includes('/ui');

    if (isComponent) {
        return 'components/button/styles.css';
    } else if (path.includes('/page')) {
        return 'pages/home/styles.css';
    } else {
        return 'styles/components.css';
    }
}

/**
 * Detect CSS framework being used on the page
 * @returns {Object} CSS framework information
 */
function detectCSSFramework() {
    const framework = {
        name: 'unknown',
        version: null,
        classes: [],
        indicators: []
    };

    // Check for Tailwind CSS
    if (document.querySelector('link[href*="tailwind"]') ||
        document.querySelector('script[src*="tailwind"]') ||
        window.tailwind) {
        framework.name = 'tailwind';
        framework.indicators.push('tailwind-link-or-script');
    }

    // Check for Bootstrap
    if (document.querySelector('link[href*="bootstrap"]') ||
        document.querySelector('script[src*="bootstrap"]') ||
        window.bootstrap) {
        framework.name = 'bootstrap';
        framework.indicators.push('bootstrap-link-or-script');
    }

    // Check for Material-UI/MUI
    if (document.querySelector('link[href*="mui"]') ||
        document.querySelector('script[src*="mui"]') ||
        window.MaterialUI) {
        framework.name = 'material-ui';
        framework.indicators.push('mui-link-or-script');
    }

    // Check for styled-components
    if (window.styled) {
        framework.name = 'styled-components';
        framework.indicators.push('styled-components-global');
    }

    // Check for CSS Modules
    if (document.querySelector('style[data-styled]') ||
        document.querySelector('link[href*="module"]')) {
        framework.name = 'css-modules';
        framework.indicators.push('css-modules-indicator');
    }

    // Check for Webflow
    if (document.querySelector('script[src*="webflow"]') ||
        document.querySelector('link[href*="webflow"]') ||
        window.Webflow ||
        document.querySelector('[data-w-id]') ||
        document.querySelector('.w-')) {
        framework.name = 'webflow';
        framework.indicators.push('webflow-detected');
    }

    // Analyze class patterns to detect frameworks
    const allElements = document.querySelectorAll('*');
    const classPatterns = {
        webflow: /^(w-|w-[a-z]+-[0-9]+|w-[a-z]+-[a-z]+|w-[a-z]+-[a-z]+-[0-9]+|w-[a-z]+-[a-z]+-[a-z]+-[0-9]+)/,
        tailwind: /^(bg-|text-|p-|m-|w-|h-|flex|grid|hidden|block|inline)/,
        bootstrap: /^(btn|container|row|col|card|modal|navbar)/,
        material: /^(Mui|mui-)/,
        bulma: /^(button|container|columns|card|modal|navbar)/,
        foundation: /^(button|container|row|column|card|reveal|top-bar)/
    };

    let detectedPatterns = [];
    allElements.forEach(el => {
        if (el.className && typeof el.className === 'string') {
            const classes = el.className.split(' ');
            classes.forEach(cls => {
                Object.keys(classPatterns).forEach(frameworkName => {
                    if (classPatterns[frameworkName].test(cls)) {
                        detectedPatterns.push(frameworkName);
                        if (!framework.classes.includes(cls)) {
                            framework.classes.push(cls);
                        }
                    }
                });
            });
        }
    });

    // Count pattern occurrences
    const patternCounts = detectedPatterns.reduce((acc, pattern) => {
        acc[pattern] = (acc[pattern] || 0) + 1;
        return acc;
    }, {});

    // Determine most likely framework based on class patterns
    const mostLikely = Object.keys(patternCounts).reduce((a, b) =>
        patternCounts[a] > patternCounts[b] ? a : b, 'unknown'
    );

    if (mostLikely !== 'unknown' && patternCounts[mostLikely] > 5) {
        framework.name = mostLikely;
        framework.indicators.push(`class-patterns-${patternCounts[mostLikely]}-matches`);
    }

    // Limit classes to most relevant ones
    framework.classes = framework.classes.slice(0, 10);

    return framework;
}

/**
 * Detect codebase patterns and conventions
 * @returns {Object} Codebase pattern information
 */
function detectCodebasePatterns() {
    const patterns = {
        namingConvention: 'unknown',
        componentStructure: 'unknown',
        cssArchitecture: 'unknown',
        buildTool: 'unknown',
        indicators: []
    };

    // Check for React patterns
    if (window.React || document.querySelector('[data-reactroot]') ||
        document.querySelector('script[src*="react"]')) {
        patterns.componentStructure = 'react';
        patterns.indicators.push('react-detected');
    }

    // Check for Vue patterns
    if (window.Vue || document.querySelector('[data-v-]') ||
        document.querySelector('script[src*="vue"]')) {
        patterns.componentStructure = 'vue';
        patterns.indicators.push('vue-detected');
    }

    // Check for Angular patterns
    if (window.ng || document.querySelector('[ng-app]') ||
        document.querySelector('script[src*="angular"]')) {
        patterns.componentStructure = 'angular';
        patterns.indicators.push('angular-detected');
    }

    // Check for Next.js patterns
    if (document.querySelector('script[src*="next"]') ||
        window.__NEXT_DATA__) {
        patterns.componentStructure = 'nextjs';
        patterns.buildTool = 'nextjs';
        patterns.indicators.push('nextjs-detected');
    }

    // Check for Vite patterns
    if (document.querySelector('script[src*="vite"]') ||
        window.__vite_plugin_react_preamble_installed__) {
        patterns.buildTool = 'vite';
        patterns.indicators.push('vite-detected');
    }

    // Check for Webpack patterns
    if (window.webpackChunkName || document.querySelector('script[src*="webpack"]')) {
        patterns.buildTool = 'webpack';
        patterns.indicators.push('webpack-detected');
    }

    // Analyze CSS architecture
    const styleSheets = Array.from(document.styleSheets);
    let cssArchitecture = 'traditional';

    if (styleSheets.some(sheet => sheet.href && sheet.href.includes('module'))) {
        cssArchitecture = 'css-modules';
        patterns.indicators.push('css-modules-stylesheets');
    } else if (styleSheets.some(sheet => sheet.href && sheet.href.includes('scoped'))) {
        cssArchitecture = 'scoped-css';
        patterns.indicators.push('scoped-css-stylesheets');
    } else if (document.querySelector('style[data-styled]')) {
        cssArchitecture = 'styled-components';
        patterns.indicators.push('styled-components-styles');
    }

    patterns.cssArchitecture = cssArchitecture;

    // Analyze naming conventions
    const elements = document.querySelectorAll('[class]');
    const classNames = Array.from(elements).map(el => el.className).join(' ');

    if (/[A-Z][a-z]+[A-Z]/.test(classNames)) {
        patterns.namingConvention = 'pascal-case';
        patterns.indicators.push('pascal-case-classes');
    } else if (/[a-z]+_[a-z]+/.test(classNames)) {
        patterns.namingConvention = 'snake-case';
        patterns.indicators.push('snake-case-classes');
    } else if (/[a-z]+-[a-z]+/.test(classNames)) {
        patterns.namingConvention = 'kebab-case';
        patterns.indicators.push('kebab-case-classes');
    } else if (/[a-z]+[A-Z]/.test(classNames)) {
        patterns.namingConvention = 'camel-case';
        patterns.indicators.push('camel-case-classes');
    }

    return patterns;
}

/**
 * Show global change prompt with old/new values and AI guidance
 * @param {string} oldValue - The old value being changed
 * @param {string} newValue - The new value
 * @param {string} property - The CSS property being changed
 * @param {string} changeType - Type of change ('color' or 'font')
 */
function showGlobalChangePrompt(oldValue, newValue, property, changeType) {
    let promptText = '';
    let instructions = '';

    if (changeType === 'color') {
        const structuredPrompt = {
            "type": "global_color_change",
            "old_color": oldValue,
            "new_color": newValue,
            "context": {
                "detect_project_type": true,
                "allow_file_creation": false,
                "ignore_breakpoints": true
            },
            "instructions": getBaseInstructions('global_color')
        };
        promptText = JSON.stringify(structuredPrompt, null, 2);
        instructions = '';
    } else if (changeType === 'font') {
        const structuredPrompt = {
            "type": "global_font_change",
            "old_font": oldValue,
            "new_font": newValue,
            "context": {
                "detect_project_type": true,
                "allow_file_creation": false,
                "ignore_breakpoints": true
            },
            "instructions": getBaseInstructions('global_font')
        };
        promptText = JSON.stringify(structuredPrompt, null, 2);
        instructions = '';
    } else {
        promptText = `Global Change:\n\nOld Value: ${oldValue}\nNew Value: ${newValue}\nProperty: ${property}`;
        instructions = `\n\nInstructions for AI:\n• If CSS variables are detected in the codebase, update the variable definitions\n• Review all usages of this property\n• Test the change across your application\n• Consider the impact on your design system`;
    }

    // Show toast notification
    if (window.showToast) {
        window.showToast('Page colors updated', 2000);
    }

    // Log detailed information to console
    console.group('🎨 Inspecta Global Change Prompt');
    console.log(promptText);
    console.log(instructions);
    console.groupEnd();

    // Copy to clipboard for easy sharing
    const fullPrompt = promptText + instructions;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(fullPrompt).then(() => {
            console.log('📋 Global change prompt copied to clipboard');
        }).catch(err => {
            console.error('Failed to copy to clipboard:', err);
        });
    }
}

function generateGlobalColorChange(oldColor, newColor, property) {
    // Show global change prompt with AI guidance
    showGlobalChangePrompt(oldColor, newColor, property, 'color');

    if (property === 'all') {
        const properties = ['background-color', 'color', 'border-color'];
        let hasAppliedChange = false;

        // 1. First, check if the oldColor is actually a color that was changed by a previous global color change
        let isIntermediateColor = false;
        let intermediateColorOriginalColor = null;

        // Check if this color exists in any existing global color change as a "newColor"
        for (let selector in cssRulesJson) {
            if (cssRulesJson[selector]?.additionalInfo?.isGlobalColorChange) {
                for (let prop in cssRulesJson[selector]) {
                    if (prop !== 'additionalInfo') {
                        const entry = cssRulesJson[selector][prop];
                        if (entry && entry.value && entry.value.toLowerCase() === oldColor.toLowerCase()) {
                            isIntermediateColor = true;
                            intermediateColorOriginalColor = entry.originalColor;
                            break;
                        }
                    }
                }
                if (isIntermediateColor) break;
            }
        }

        // 2. Find the true original color and collect all elements that should be affected
        let trueOriginalColor = null;
        const allElements = document.querySelectorAll('body *');
        const elementsWithOriginalColor = [];
        const elementsWithManualChanges = [];

        // First, temporarily remove all global color classes to see original colors
        const globalClasses = [];
        allElements.forEach(el => {
            const classes = Array.from(el.classList);
            classes.forEach(cls => {
                if (cls.startsWith('inspecta-global-color-')) {
                    globalClasses.push({ element: el, class: cls });
                    el.classList.remove(cls);
                }
            });
        });

        // Now scan for the original color and collect full path selectors
        for (const el of allElements) {
            const styles = getComputedStyle(el);
            for (const prop of properties) {
                try {
                    let currentColor = '';
                    if (prop === 'background-color') currentColor = rgba2hex(styles.backgroundColor, false).toUpperCase();
                    else if (prop === 'color') currentColor = rgba2hex(styles.color, false).toUpperCase();
                    else if (prop === 'border-color') currentColor = rgba2hex(styles.borderColor, false).toUpperCase();

                    if (currentColor === oldColor.toUpperCase()) {
                        if (!trueOriginalColor) {
                            trueOriginalColor = currentColor;
                        }
                        // Generate full path selector for this element
                        const fullPathSelector = generateElSelector(el);
                        elementsWithOriginalColor.push({
                            element: el,
                            selector: fullPathSelector,
                            property: prop,
                            originalColor: currentColor
                        });
                    }
                } catch (e) { }
            }
        }

        // Restore global color classes
        globalClasses.forEach(({ element, class: cls }) => {
            element.classList.add(cls);
        });

        // 3. Also check for elements that have been manually changed to the oldColor
        // These elements might have been manually edited and now have the oldColor
        for (let selector in cssRulesJson) {
            if (!cssRulesJson[selector]?.additionalInfo?.isGlobalColorChange) {
                // This is a manual change, not a global color change
                for (let prop in cssRulesJson[selector]) {
                    if (prop !== 'additionalInfo') {
                        const entry = cssRulesJson[selector][prop];
                        if (entry && typeof entry.value === 'string' && entry.value.toLowerCase() === oldColor.toLowerCase()) {
                            // Find the element(s) that match this selector
                            try {
                                const elements = document.querySelectorAll(selector);
                                elements.forEach(el => {
                                    const fullPathSelector = generateElSelector(el);
                                    elementsWithManualChanges.push({
                                        element: el,
                                        selector: fullPathSelector,
                                        property: prop,
                                        originalColor: oldColor,
                                        isManualChange: true
                                    });
                                });
                            } catch (e) {
                                // Invalid selector, skip
                            }
                        }
                    }
                }
            }
        }

        // 4. If we couldn't find the original color, but it's an intermediate color, use the original color from the previous change
        if (!trueOriginalColor && isIntermediateColor && intermediateColorOriginalColor) {
            trueOriginalColor = intermediateColorOriginalColor;
        }
        // If we still couldn't find the original color, use the provided oldColor
        else if (!trueOriginalColor) {
            trueOriginalColor = oldColor;
        }

        // 5. Find elements that already have global color classes for this original color
        // (This must be done BEFORE removing the classes)
        const elementsWithGlobalClass = [];
        const globalColorClassPattern = `inspecta-global-color-${trueOriginalColor.replace('#', '')}`;
        const elementsWithGlobalClassSelector = document.querySelectorAll(`[class*="${globalColorClassPattern}"]`);

        elementsWithGlobalClassSelector.forEach(el => {
            const classes = Array.from(el.classList);
            classes.forEach(cls => {
                if (cls.startsWith(globalColorClassPattern)) {
                    const propertyMatch = cls.match(new RegExp(`${globalColorClassPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-([a-zA-Z]+)`));
                    if (propertyMatch) {
                        const prop = propertyMatch[1];
                        let cssProp = '';
                        if (prop === 'backgroundcolor') cssProp = 'background-color';
                        else if (prop === 'color') cssProp = 'color';
                        else if (prop === 'bordercolor') cssProp = 'border-color';

                        if (cssProp) {
                            const fullPathSelector = generateElSelector(el);
                            elementsWithGlobalClass.push({
                                element: el,
                                selector: fullPathSelector,
                                property: cssProp,
                                originalColor: trueOriginalColor
                            });
                        }
                    }
                }
            });
        });

        // 6. Remove existing global color change for this original color
        for (let selector in cssRulesJson) {
            if (cssRulesJson[selector]?.additionalInfo?.isGlobalColorChange) {
                let shouldDeleteThisEntry = false;

                for (let prop in cssRulesJson[selector]) {
                    if (prop !== 'additionalInfo') {
                        const entry = cssRulesJson[selector][prop];
                        if (entry && entry.originalColor && entry.originalColor.toLowerCase() === trueOriginalColor.toLowerCase()) {
                            shouldDeleteThisEntry = true;
                            break;
                        }
                    }
                }

                if (shouldDeleteThisEntry) {
                    // Remove from stylesheet
                    const inspectaStylesheet = document.getElementById('inspectaStylesheet')?.sheet;
                    if (inspectaStylesheet) {
                        for (let i = inspectaStylesheet.cssRules.length - 1; i >= 0; i--) {
                            const rule = inspectaStylesheet.cssRules[i];
                            if (rule.selectorText && rule.selectorText.includes(`inspecta-global-color-${trueOriginalColor.replace('#', '')}`)) {
                                inspectaStylesheet.deleteRule(i);
                            }
                        }
                    }

                    // Remove from JSON
                    delete cssRulesJson[selector];
                }
            }
        }

        // 7. Remove existing global color classes for this original color
        properties.forEach(prop => {
            const className = `inspecta-global-color-${trueOriginalColor.replace('#', '')}-${prop.replace(/[^a-zA-Z]/g, '')}`;
            allElements.forEach(el => {
                if (el.classList.contains(className)) el.classList.remove(className);
            });
        });

        // 8. Combine elements from all sources
        const allElementsToChange = [...elementsWithGlobalClass];

        // Add elements with original color that aren't already in the list
        elementsWithOriginalColor.forEach(originalElement => {
            const exists = allElementsToChange.some(item =>
                item.element === originalElement.element && item.property === originalElement.property
            );
            if (!exists) {
                allElementsToChange.push(originalElement);
            }
        });

        // Add elements with manual changes that aren't already in the list
        elementsWithManualChanges.forEach(manualElement => {
            const exists = allElementsToChange.some(item =>
                item.element === manualElement.element && item.property === manualElement.property
            );
            if (!exists) {
                allElementsToChange.push(manualElement);
            }
        });

        // 8.5. Remove manual CSS rules for elements that will be affected by the global color change
        // This prevents conflicts between manual changes and global color changes
        const elementsToRemoveManualRules = new Set();
        allElementsToChange.forEach(({ element }) => {
            elementsToRemoveManualRules.add(element);
        });

        for (let selector in cssRulesJson) {
            if (!cssRulesJson[selector]?.additionalInfo?.isGlobalColorChange) {
                // This is a manual change
                let shouldRemoveThisRule = false;
                const propertiesToRemove = [];

                // Check if any element affected by this rule is in our global color change list
                try {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(el => {
                        if (elementsToRemoveManualRules.has(el)) {
                            shouldRemoveThisRule = true;
                            // Find which properties should be removed
                            for (let prop in cssRulesJson[selector]) {
                                if (prop !== 'additionalInfo') {
                                    const entry = cssRulesJson[selector][prop];
                                    if (entry && entry.value && properties.includes(prop)) {
                                        propertiesToRemove.push(prop);
                                    }
                                }
                            }
                        }
                    });
                } catch (e) {
                    // Invalid selector, skip
                }

                if (shouldRemoveThisRule) {
                    // Remove the specific properties from the rule
                    propertiesToRemove.forEach(prop => {
                        if (cssRulesJson[selector][prop]) {
                            delete cssRulesJson[selector][prop];
                        }
                    });

                    // If no properties left, remove the entire rule
                    const remainingProps = Object.keys(cssRulesJson[selector]).filter(key => key !== 'additionalInfo');
                    if (remainingProps.length === 0) {
                        delete cssRulesJson[selector];
                    }

                    // Also remove the rule from the stylesheet to ensure it doesn't override global changes
                    const inspectaStylesheet = document.getElementById('inspectaStylesheet')?.sheet;
                    if (inspectaStylesheet) {
                        for (let i = inspectaStylesheet.cssRules.length - 1; i >= 0; i--) {
                            const rule = inspectaStylesheet.cssRules[i];
                            if (rule.selectorText === selector) {
                                // Check if this rule has any of the properties we're removing
                                let shouldDeleteRule = false;
                                propertiesToRemove.forEach(prop => {
                                    if (rule.style.getPropertyValue(prop)) {
                                        shouldDeleteRule = true;
                                    }
                                });

                                if (shouldDeleteRule) {
                                    inspectaStylesheet.deleteRule(i);
                                }
                            }
                        }
                    }
                }
            }
        }

        // 9. Apply the new global color change using a simpler approach
        if (allElementsToChange.length > 0) {
            const combinedGlobalSelector = `.inspecta-global-color-${trueOriginalColor.replace('#', '')}-to-${newColor.replace('#', '')}`;

            // Group elements by their full path selector to avoid duplicates
            const selectorGroups = new Map();
            allElementsToChange.forEach(({ element, selector, property, originalColor }) => {
                if (!selectorGroups.has(selector)) {
                    selectorGroups.set(selector, []);
                }
                selectorGroups.get(selector).push({ element, property, originalColor });
            });

            // Apply global color classes and create CSS rules
            selectorGroups.forEach((elements, fullPathSelector) => {
                elements.forEach(({ element, property, originalColor }) => {
                    // Add global color class to the element
                    const globalColorClass = `inspecta-global-color-${trueOriginalColor.replace('#', '')}-${property.replace(/[^a-zA-Z]/g, '')}`;
                    element.classList.add(globalColorClass);

                    // Remove inline style if present
                    if (element.style) element.style.removeProperty(property);
                });

                // Create CSS rule with full path selector + global color class
                elements.forEach(({ property, originalColor }) => {
                    // Use simple selector since applyCssRule now handles precedence
                    const simpleSelector = `.inspecta-global-color-${trueOriginalColor.replace('#', '')}-${property.replace(/[^a-zA-Z]/g, '')}`;

                    // Store in cssRulesJson
                    if (!cssRulesJson[combinedGlobalSelector]) {
                        const incrementalNumber = Object.keys(cssRulesJson).length + 1;
                        cssRulesJson[combinedGlobalSelector] = {
                            additionalInfo: {
                                incrementalNumber: incrementalNumber,
                                customClassName: `inspecta-global-color-${trueOriginalColor.replace('#', '')}`,
                                tagName: 'Global Color Change',
                                customTagName: `${trueOriginalColor} → ${newColor}`,
                                isGlobalColorChange: true
                            }
                        };
                    }

                    let cssPropertyForJson = property;
                    if (property === 'background-color') cssPropertyForJson = 'background';

                    cssRulesJson[combinedGlobalSelector][cssPropertyForJson] = {
                        value: newColor,
                        enabled: true,
                        originalColor: trueOriginalColor
                    };

                    // Apply the CSS rule - applyCssRule will handle precedence
                    applyCssRule(simpleSelector, property, newColor);
                });

            });

            hasAppliedChange = true;
        }

        if (hasAppliedChange) {
            if (isStoreCss) saveCSS();
            generateInspectaFullCss();
            generateCssChangesCounter();
            if (typeof clearAndRefreshOverview === 'function') {
                clearAndRefreshOverview();
                setTimeout(() => {
                    if (typeof window.updateColorMismatchUI === 'function') {
                        window.updateColorMismatchUI();
                    }
                }, 100);
            }
        }
        return;
    }
}


/**
 * Add a class to the last part of a selector in both the stylesheet and cssRulesJson.
 * @param {string} selector - The original selector.
 * @param {string} className - The class to add (without dot).
 * @returns {string} The new selector.
 */
function addClassToSelector(selector, className) {
    // Add .className to the last part of the selector
    const parts = selector.trim().split(' ');
    const last = parts.pop();
    let newLast;
    if (last.includes('.')) {
        newLast = last + '.' + className;
    } else {
        newLast = last + '.' + className;
    }
    const newSelector = [...parts, newLast].join(' ').trim();

    // Copy cssRulesJson entry
    if (cssRulesJson[selector]) {
        cssRulesJson[newSelector] = JSON.parse(JSON.stringify(cssRulesJson[selector]));
        // Optionally update customClassName in additionalInfo
        if (cssRulesJson[newSelector].additionalInfo) {
            cssRulesJson[newSelector].additionalInfo.customClassName = className;
        }
        delete cssRulesJson[selector];
    }

    // Update stylesheet
    const inspectaStylesheet = document.getElementById('inspectaStylesheet')?.sheet;
    if (inspectaStylesheet) {
        for (let i = 0; i < inspectaStylesheet.cssRules.length; i++) {
            const rule = inspectaStylesheet.cssRules[i];
            if (rule.selectorText === selector) {
                const cssText = rule.style.cssText;
                inspectaStylesheet.deleteRule(i);
                inspectaStylesheet.insertRule(`${newSelector} { ${cssText} }`, i);
                break;
            }
        }
    }

    saveCSS();
    generateInspectaFullCss();
    generateCssChangesCounter();

    return newSelector;
}

/**
 * Remove a class from the last part of a selector in both the stylesheet and cssRulesJson.
 * @param {string} selector - The selector with the class.
 * @param {string} className - The class to remove (without dot).
 * @returns {string} The new selector.
 */
function removeClassFromSelector(selector, className) {
    // Remove .className from the last part of the selector
    const parts = selector.trim().split(' ');
    let last = parts.pop();
    const classPattern = new RegExp(`\\.?${className}\\b`);
    last = last.replace(classPattern, '');
    last = last.replace(/\.+/g, '.').replace(/\.$/, ''); // Clean up extra dots
    const newSelector = [...parts, last].join(' ').trim();

    // Copy cssRulesJson entry
    if (cssRulesJson[selector]) {
        cssRulesJson[newSelector] = JSON.parse(JSON.stringify(cssRulesJson[selector]));
        // Optionally update customClassName in additionalInfo
        if (cssRulesJson[newSelector].additionalInfo) {
            cssRulesJson[newSelector].additionalInfo.customClassName = '';
        }
        delete cssRulesJson[selector];
    }

    // Update stylesheet
    const inspectaStylesheet = document.getElementById('inspectaStylesheet')?.sheet;
    if (inspectaStylesheet) {
        for (let i = 0; i < inspectaStylesheet.cssRules.length; i++) {
            const rule = inspectaStylesheet.cssRules[i];
            if (rule.selectorText === selector) {
                const cssText = rule.style.cssText;
                inspectaStylesheet.deleteRule(i);
                inspectaStylesheet.insertRule(`${newSelector} { ${cssText} }`, i);
                break;
            }
        }
    }

    saveCSS();
    generateInspectaFullCss();
    generateCssChangesCounter();

    return newSelector;
}

/**
 * Replace an element selector in both the stylesheet and cssRulesJson.
 * @param {string} oldSelector - The selector to be replaced.
 * @param {string} newSelector - The new selector to use.
 */
function replaceSelector(oldSelector, newSelector) {
    // Update cssRulesJson
    if (!cssRulesJson[oldSelector]) return;

    // If newSelector already exists, merge properties (optional: you can customize this behavior)
    // if (cssRulesJson[newSelector]) {
    //     Object.assign(cssRulesJson[newSelector], cssRulesJson[oldSelector]);
    // } else {
    cssRulesJson[newSelector] = cssRulesJson[oldSelector];
    // }
    delete cssRulesJson[oldSelector];

    //Update stylesheet
    const inspectaStylesheet = document.getElementById('inspectaStylesheet')?.sheet;
    if (inspectaStylesheet) {
        // Find and update the rule
        for (let i = 0; i < inspectaStylesheet.cssRules.length; i++) {
            const rule = inspectaStylesheet.cssRules[i];
            if (rule.selectorText === oldSelector) {
                // Get the CSS text for the rule
                const cssText = rule.style.cssText;
                // Remove the old rule
                inspectaStylesheet.deleteRule(i);
                // Insert the new rule with the new selector
                inspectaStylesheet.insertRule(`${newSelector} { ${cssText} }`, i);
                break;
            }
        }
    }

    //Save changes and update UI
    saveCSS();
    //setTimeout(() => {
    generateInspectaFullCss();
    generateCssChangesCounter();
    //}, 1000)

}

/**
 * Clone CSS rule from one selector to another, updating both cssRulesJson and the stylesheet.
 * If toSelector exists in cssRulesJson, only copy the styles (properties), not additionalInfo.
 * @param {string} fromSelector - The selector to clone from.
 * @param {string} toSelector - The selector to clone to.
 */
function cloneSelectorRule(fromSelector, toSelector) {
    if (!cssRulesJson[fromSelector]) return;

    // If toSelector exists, only copy properties (not additionalInfo)
    if (cssRulesJson[toSelector]) {
        for (const key in cssRulesJson[fromSelector]) {
            if (key !== 'additionalInfo') {
                cssRulesJson[toSelector][key] = JSON.parse(JSON.stringify(cssRulesJson[fromSelector][key]));
            }
        }
    } else {
        // Full clone, including additionalInfo (with updated fields)
        cssRulesJson[toSelector] = JSON.parse(JSON.stringify(cssRulesJson[fromSelector]));
        if (cssRulesJson[toSelector].additionalInfo) {
            const incrementalNumber = Object.keys(cssRulesJson).length;
            cssRulesJson[toSelector].additionalInfo.incrementalNumber = incrementalNumber;
            cssRulesJson[toSelector].additionalInfo.customClassName = `inspecta-element-${incrementalNumber}`;
            cssRulesJson[toSelector].additionalInfo.tagName = document.querySelector(toSelector)?.tagName || '';
            cssRulesJson[toSelector].additionalInfo.customTagName = document.querySelector(toSelector)?.tagName || '';
        }
    }

    // Clone in stylesheet
    const inspectaStylesheet = document.getElementById('inspectaStylesheet')?.sheet;
    if (inspectaStylesheet) {
        // Remove existing rule for toSelector if present
        for (let i = 0; i < inspectaStylesheet.cssRules.length; i++) {
            if (inspectaStylesheet.cssRules[i].selectorText === toSelector) {
                inspectaStylesheet.deleteRule(i);
                break;
            }
        }
        // Find the rule for fromSelector
        for (let i = 0; i < inspectaStylesheet.cssRules.length; i++) {
            const rule = inspectaStylesheet.cssRules[i];
            if (rule.selectorText === fromSelector) {
                const cssText = rule.style.cssText;
                // Insert new rule for toSelector
                inspectaStylesheet.insertRule(`${toSelector} { ${cssText} }`, inspectaStylesheet.cssRules.length);
                break;
            }
        }
    }

    //saveCSS();
    generateInspectaFullCss();
    //generateCssChangesCounter();
}

window.getShorthandProperties = getShorthandProperties;

// Helper to check if a value is a simple color (not a gradient or image)
function isSimpleColor(value) {
    if (!value) return false;
    return !value.includes('gradient(') && !value.includes('url(');
}

function deleteGlobalColorChange(originalColor) {
    // Find and remove the specific global color change for this original color
    for (let selector in cssRulesJson) {
        if (cssRulesJson[selector]?.additionalInfo?.isGlobalColorChange) {
            let shouldDeleteThisEntry = false;

            // Check if this entry contains the specific original color we want to delete
            for (let prop in cssRulesJson[selector]) {
                if (prop !== 'additionalInfo') {
                    const entry = cssRulesJson[selector][prop];
                    if (entry && entry.originalColor && entry.originalColor.toLowerCase() === originalColor.toLowerCase()) {
                        shouldDeleteThisEntry = true;
                        break;
                    }
                }
            }
            if (shouldDeleteThisEntry) {
                // Remove from stylesheet
                const inspectaStylesheet = document.getElementById('inspectaStylesheet')?.sheet;
                if (inspectaStylesheet) {
                    for (let i = inspectaStylesheet.cssRules.length - 1; i >= 0; i--) {
                        const rule = inspectaStylesheet.cssRules[i];
                        if (rule.selectorText && rule.selectorText.includes(`inspecta-global-color-${originalColor.replace('#', '')}`)) {
                            inspectaStylesheet.deleteRule(i);
                        }
                    }
                }

                // Remove global color classes from elements
                const allElements = document.querySelectorAll('body *');
                const properties = ['background-color', 'color', 'border-color'];
                properties.forEach(prop => {
                    const className = `inspecta-global-color-${originalColor.replace('#', '')}-${prop.replace(/[^a-zA-Z]/g, '')}`;
                    allElements.forEach(el => {
                        if (el.classList.contains(className)) {
                            el.classList.remove(className);
                        }
                    });
                });

                // Remove from JSON
                delete cssRulesJson[selector];
            }
        }
    }

    if (isStoreCss) saveCSS();
    generateInspectaFullCss();
    generateCssChangesCounter();
    if (typeof clearAndRefreshOverview === 'function') {
        clearAndRefreshOverview();
        setTimeout(() => {
            if (typeof window.updateColorMismatchUI === 'function') {
                window.updateColorMismatchUI();
            }
        }, 100);
    }
}

function generateGlobalFontChange(originalFontFamily, originalFontSize, originalLineHeight, originalFontWeight, newFontFamily, newFontSize, newLineHeight, newFontWeight, property) {
    // Show global change prompt with AI guidance
    const oldValue = `${originalFontFamily} ${originalFontSize} ${originalLineHeight} ${originalFontWeight}`;
    const newValue = `${newFontFamily} ${newFontSize} ${newLineHeight} ${newFontWeight}`;
    showGlobalChangePrompt(oldValue, newValue, property, 'font');

    // Ensure we have the original values even if new values are empty
    if (!newFontFamily) newFontFamily = originalFontFamily;
    if (!newFontSize) newFontSize = originalFontSize;
    if (!newLineHeight) newLineHeight = originalLineHeight;
    if (!newFontWeight) newFontWeight = originalFontWeight;

    if (property === 'all') {
        const fontProperties = ['font-family', 'font-size', 'line-height', 'font-weight'];
        let hasAppliedChange = false;

        // 1. First, check if the original font is actually a font that was changed by a previous global font change
        let isIntermediateFont = false;
        let intermediateFontOriginalValues = null;

        // Check if this font exists in any existing global font change as a "newFont"
        for (let selector in cssRulesJson) {
            if (cssRulesJson[selector]?.additionalInfo?.isGlobalFontChange) {
                // Check if this global font change has the current "original" font as its new value
                const fontFamilyEntry = cssRulesJson[selector]['font-family'];
                const fontSizeEntry = cssRulesJson[selector]['font-size'];
                const lineHeightEntry = cssRulesJson[selector]['line-height'];
                const fontWeightEntry = cssRulesJson[selector]['font-weight'];

                if (fontFamilyEntry && fontSizeEntry && lineHeightEntry && fontWeightEntry) {
                    // Check if the current "original" font matches the "new" font from this existing change
                    if (fontFamilyEntry.value === originalFontFamily &&
                        fontSizeEntry.value === originalFontSize &&
                        lineHeightEntry.value === originalLineHeight &&
                        fontWeightEntry.value === originalFontWeight) {

                        isIntermediateFont = true;
                        intermediateFontOriginalValues = {
                            fontFamily: fontFamilyEntry.originalValue,
                            fontSize: fontSizeEntry.originalValue,
                            lineHeight: lineHeightEntry.originalValue,
                            fontWeight: fontWeightEntry.originalValue
                        };

                        break;
                    }
                }
            }
        }

        // 2. Find the true original font values
        let trueOriginalFontFamily = originalFontFamily;
        let trueOriginalFontSize = originalFontSize;
        let trueOriginalLineHeight = originalLineHeight;
        let trueOriginalFontWeight = originalFontWeight;

        // If this is an intermediate font, use the original values from the previous change
        if (isIntermediateFont && intermediateFontOriginalValues) {

            trueOriginalFontFamily = intermediateFontOriginalValues.fontFamily;
            trueOriginalFontSize = intermediateFontOriginalValues.fontSize;
            trueOriginalLineHeight = intermediateFontOriginalValues.lineHeight;
            trueOriginalFontWeight = intermediateFontOriginalValues.fontWeight;

            // Store the current intermediate values as "previous state" for reverting
            const previousState = {
                fontFamily: originalFontFamily,
                fontSize: originalFontSize,
                lineHeight: originalLineHeight,
                fontWeight: originalFontWeight
            };

            // Delete the existing global font change that we're replacing

            for (let selector in cssRulesJson) {
                if (cssRulesJson[selector]?.additionalInfo?.isGlobalFontChange) {
                    const fontFamilyEntry = cssRulesJson[selector]['font-family'];
                    const fontSizeEntry = cssRulesJson[selector]['font-size'];
                    const lineHeightEntry = cssRulesJson[selector]['line-height'];
                    const fontWeightEntry = cssRulesJson[selector]['font-weight'];

                    if (fontFamilyEntry && fontSizeEntry && lineHeightEntry && fontWeightEntry) {
                        if (fontFamilyEntry.value === originalFontFamily &&
                            fontSizeEntry.value === originalFontSize &&
                            lineHeightEntry.value === originalLineHeight &&
                            fontWeightEntry.value === originalFontWeight) {

                            // Store the previous state in the rule for reverting
                            if (!cssRulesJson[selector].additionalInfo.previousState) {
                                cssRulesJson[selector].additionalInfo.previousState = previousState;
                            }

                            // Remove from stylesheet
                            const inspectaStylesheet = document.getElementById('inspectaStylesheet')?.sheet;
                            if (inspectaStylesheet) {
                                for (let i = inspectaStylesheet.cssRules.length - 1; i >= 0; i--) {
                                    const rule = inspectaStylesheet.cssRules[i];
                                    if (rule.selectorText === selector) {
                                        inspectaStylesheet.deleteRule(i);

                                    }
                                }
                            }

                            // Store the old selector to preserve checkbox references
                            const oldSelector = selector;

                            // Remove from JSON
                            delete cssRulesJson[selector];


                            break;
                        }
                    }
                }
            }
        }

        // 3. Find all elements using the original font combination
        const allElements = document.querySelectorAll('body *');
        const elementsWithOriginalFont = [];

        // First, temporarily remove all global font classes to see original fonts
        const globalClasses = [];
        allElements.forEach(el => {
            const classes = Array.from(el.classList);
            classes.forEach(cls => {
                if (cls.startsWith('inspecta-global-font-')) {
                    globalClasses.push({ element: el, class: cls });
                    el.classList.remove(cls);
                }
            });
        });

        // Now scan for elements with the original font combination
        let scannedElements = 0;
        let skippedHidden = 0;
        let skippedNonText = 0;
        let skippedNoText = 0;
        let checkedFonts = 0;

        for (const el of allElements) {
            scannedElements++;

            // Skip invisible/hidden elements
            const rect = el.getBoundingClientRect();
            if (
                el.style.display === 'none' ||
                el.style.visibility === 'hidden' ||
                el.style.opacity === '0' ||
                rect.width === 0 || rect.height === 0 ||
                (el.style.position === 'absolute' && parseInt(el.style.left) <= -9999)
            ) {
                skippedHidden++;
                continue;
            }

            // Exclude non-text elements
            const nonTextTags = ['img', 'svg', 'canvas', 'video', 'audio', 'iframe', 'object', 'embed', 'picture', 'source', 'track', 'map', 'area', 'meta', 'link', 'script', 'style', 'br', 'hr', 'input', 'textarea', 'button', 'select', 'option'];
            if (nonTextTags.includes(el.tagName.toLowerCase())) {
                skippedNonText++;
                continue;
            }

            // Check if element has any text content (direct or in children)
            const hasTextContent = el.textContent && el.textContent.trim().length > 0;
            if (!hasTextContent) {
                skippedNoText++;
                continue;
            }

            const styles = getComputedStyle(el);
            checkedFonts++;

            // Check if this element uses the specified font combination
            const elementFontFamily = styles.fontFamily.split(',')[0].trim().replace(/['"]/g, '');
            const elementFontSize = styles.fontSize;
            const elementLineHeight = styles.lineHeight;
            const elementFontWeight = styles.fontWeight;

            // Clean up the target font family for comparison
            const targetFontFamily = trueOriginalFontFamily.split(',')[0].trim().replace(/['"]/g, '');

            // Check if font properties match using proper comparison
            const familyMatches = elementFontFamily.toLowerCase() === targetFontFamily.toLowerCase();
            const sizeMatches = compareFontValues(elementFontSize, trueOriginalFontSize);
            const lineHeightMatches = compareFontValues(elementLineHeight, trueOriginalLineHeight);
            const weightMatches = elementFontWeight === trueOriginalFontWeight;





            if (familyMatches && sizeMatches && lineHeightMatches && weightMatches) {
                // Generate full path selector for this element
                const fullPathSelector = generateElSelector(el);
                elementsWithOriginalFont.push({
                    element: el,
                    selector: fullPathSelector,
                    fontFamily: elementFontFamily,
                    fontSize: elementFontSize,
                    lineHeight: elementLineHeight,
                    fontWeight: elementFontWeight
                });
            }
        }



        // Restore global font classes
        globalClasses.forEach(({ element, class: cls }) => {
            element.classList.add(cls);
        });

        // 4. Remove existing global font change for this original font combination
        const fontKey = `${trueOriginalFontFamily}-${trueOriginalFontSize}-${trueOriginalLineHeight}-${trueOriginalFontWeight}`.replace(/[^a-zA-Z0-9-]/g, '');

        for (let selector in cssRulesJson) {
            if (cssRulesJson[selector]?.additionalInfo?.isGlobalFontChange) {
                let shouldDeleteThisEntry = false;

                for (let prop in cssRulesJson[selector]) {
                    if (prop !== 'additionalInfo') {
                        const entry = cssRulesJson[selector][prop];
                        if (entry && entry.originalFontKey && entry.originalFontKey === fontKey) {
                            shouldDeleteThisEntry = true;
                            break;
                        }
                    }
                }

                if (shouldDeleteThisEntry) {
                    // Remove from stylesheet
                    const inspectaStylesheet = document.getElementById('inspectaStylesheet')?.sheet;
                    if (inspectaStylesheet) {
                        for (let i = inspectaStylesheet.cssRules.length - 1; i >= 0; i--) {
                            const rule = inspectaStylesheet.cssRules[i];
                            if (rule.selectorText && rule.selectorText.includes(`inspecta-global-font-${fontKey}`)) {
                                inspectaStylesheet.deleteRule(i);
                            }
                        }
                    }

                    // Remove from JSON
                    delete cssRulesJson[selector];
                }
            }
        }

        // 3. Remove existing global font classes for this original font combination
        const globalFontClassPattern = `inspecta-global-font-${fontKey}`;
        allElements.forEach(el => {
            const classes = Array.from(el.classList);
            classes.forEach(cls => {
                if (cls.startsWith(globalFontClassPattern)) {
                    el.classList.remove(cls);
                }
            });
        });

        // 4. Apply the new global font change
        if (elementsWithOriginalFont.length === 0) {

            // Check if there's already a global font change for this combination
            const existingGlobalFontChange = Object.keys(cssRulesJson).find(selector =>
                cssRulesJson[selector]?.additionalInfo?.isGlobalFontChange &&
                Object.values(cssRulesJson[selector]).some(prop =>
                    prop.originalFontKey && prop.originalFontKey === fontKey
                )
            );

            if (existingGlobalFontChange) {
                // You can modify the existing change instead of creating a new one.
            } else {
                // Create the global font change anyway so it appears in the CSS changes panel

                const combinedGlobalSelector = `.inspecta-global-font-${fontKey}`;

                // Store in cssRulesJson
                if (!cssRulesJson[combinedGlobalSelector]) {
                    const incrementalNumber = Object.keys(cssRulesJson).length + 1;
                    cssRulesJson[combinedGlobalSelector] = {
                        additionalInfo: {
                            incrementalNumber: incrementalNumber,
                            customClassName: `inspecta-global-font-${fontKey}`,
                            tagName: 'Global Font Change',
                            customTagName: `${originalFontFamily} → ${newFontFamily}`,
                            isGlobalFontChange: true
                        }
                    };
                }

                // Add font properties to the rule (store all properties for display)
                cssRulesJson[combinedGlobalSelector]['font-family'] = {
                    value: newFontFamily || originalFontFamily,
                    enabled: true,
                    originalFontKey: fontKey,
                    originalValue: originalFontFamily
                };

                cssRulesJson[combinedGlobalSelector]['font-size'] = {
                    value: newFontSize || originalFontSize,
                    enabled: true,
                    originalFontKey: fontKey,
                    originalValue: originalFontSize
                };

                cssRulesJson[combinedGlobalSelector]['line-height'] = {
                    value: newLineHeight || originalLineHeight,
                    enabled: true,
                    originalFontKey: fontKey,
                    originalValue: originalLineHeight
                };

                cssRulesJson[combinedGlobalSelector]['font-weight'] = {
                    value: newFontWeight || originalFontWeight,
                    enabled: true,
                    originalFontKey: fontKey,
                    originalValue: originalFontWeight
                };

                hasAppliedChange = true;
            }
        }

        if (elementsWithOriginalFont.length > 0) {
            // Use dynamic selector like global color change to avoid conflicts
            const newFontKey = `${newFontFamily || originalFontFamily}-${newFontSize || originalFontSize}-${newLineHeight || originalLineHeight}-${newFontWeight || originalFontWeight}`.replace(/[^a-zA-Z0-9-]/g, '');
            const combinedGlobalSelector = `.inspecta-global-font-${fontKey}-to-${newFontKey}`;


            // Group elements by their full path selector to avoid duplicates
            const selectorGroups = new Map();
            elementsWithOriginalFont.forEach(({ element, selector, fontFamily, fontSize, lineHeight, fontWeight }) => {
                if (!selectorGroups.has(selector)) {
                    selectorGroups.set(selector, []);
                }
                selectorGroups.get(selector).push({ element, fontFamily, fontSize, lineHeight, fontWeight });
            });

            // Apply global font classes and create CSS rules
            selectorGroups.forEach((elements, selector) => {
                elements.forEach(({ element }, index) => {
                    // Add global font class to the element (use original font key for class)
                    const globalFontClass = `inspecta-global-font-${fontKey}`;
                    element.classList.add(globalFontClass);

                    // Remove inline styles if present
                    if (element.style) {
                        element.style.removeProperty('font-family');
                        element.style.removeProperty('font-size');
                        element.style.removeProperty('line-height');
                        element.style.removeProperty('font-weight');
                    }
                });

                // Store in cssRulesJson
                if (!cssRulesJson[combinedGlobalSelector]) {
                    const incrementalNumber = Object.keys(cssRulesJson).length + 1;
                    cssRulesJson[combinedGlobalSelector] = {
                        additionalInfo: {
                            incrementalNumber: incrementalNumber,
                            customClassName: `inspecta-global-font-${fontKey}`,
                            tagName: 'Global Font Change',
                            customTagName: `${originalFontFamily} → ${newFontFamily}`,
                            isGlobalFontChange: true
                        }
                    };
                }

                // Add font properties to the rule (store all properties for display)
                cssRulesJson[combinedGlobalSelector]['font-family'] = {
                    value: newFontFamily || originalFontFamily,
                    enabled: true,
                    originalFontKey: fontKey,
                    originalValue: trueOriginalFontFamily
                };

                cssRulesJson[combinedGlobalSelector]['font-size'] = {
                    value: newFontSize || originalFontSize,
                    enabled: true,
                    originalFontKey: fontKey,
                    originalValue: trueOriginalFontSize
                };

                cssRulesJson[combinedGlobalSelector]['line-height'] = {
                    value: newLineHeight || originalLineHeight,
                    enabled: true,
                    originalFontKey: fontKey,
                    originalValue: trueOriginalLineHeight
                };

                cssRulesJson[combinedGlobalSelector]['font-weight'] = {
                    value: newFontWeight || originalFontWeight,
                    enabled: true,
                    originalFontKey: fontKey,
                    originalValue: trueOriginalFontWeight
                };



                // Apply the CSS rules using the class selector that matches the elements
                const classSelector = `.inspecta-global-font-${fontKey}`;

                // Collect all font properties that need to be applied
                const fontProperties = [];
                if (newFontFamily && newFontFamily !== trueOriginalFontFamily) {
                    fontProperties.push(`font-family: ${newFontFamily}`);
                }
                if (newFontSize && newFontSize !== trueOriginalFontSize) {
                    fontProperties.push(`font-size: ${newFontSize}`);
                }
                if (newLineHeight && newLineHeight !== trueOriginalLineHeight) {
                    fontProperties.push(`line-height: ${newLineHeight}`);
                }
                if (newFontWeight && newFontWeight !== trueOriginalFontWeight) {
                    fontProperties.push(`font-weight: ${newFontWeight}`);
                }

                // Apply all properties in a single CSS rule
                if (fontProperties.length > 0) {
                    const stylesheet = document.getElementById('inspectaStylesheet');
                    if (stylesheet && stylesheet.sheet) {
                        // Remove any existing rule for this selector
                        const rules = stylesheet.sheet.cssRules;
                        for (let i = rules.length - 1; i >= 0; i--) {
                            if (rules[i].selectorText === classSelector) {
                                stylesheet.sheet.deleteRule(i);
                            }
                        }

                        // Create a single rule with all properties
                        const cssRule = `${classSelector} { ${fontProperties.join('; ')}; }`;
                        try {
                            stylesheet.sheet.insertRule(cssRule, stylesheet.sheet.cssRules.length);
                        } catch (e) {
                            console.error('Failed to insert font rule:', e);
                        }
                    }
                }

                // Final cleanup: Remove any remaining inline styles after CSS rules are applied
                setTimeout(() => {
                    elementsWithOriginalFont.forEach(({ element }) => {
                        if (element.style) {
                            const hadInlineStyles = element.style.fontSize || element.style.fontFamily || element.style.lineHeight || element.style.fontWeight;
                            if (hadInlineStyles) {
                                element.style.removeProperty('font-family');
                                element.style.removeProperty('font-size');
                                element.style.removeProperty('line-height');
                                element.style.removeProperty('font-weight');
                            }
                        }
                    });
                }, 200);
            });

            hasAppliedChange = true;
        }

        if (hasAppliedChange) {
            if (isStoreCss) saveCSS();
            generateInspectaFullCss();
            generateCssChangesCounter();

            // Force UI regeneration to update checkbox references
            if (typeof clearAndRefreshOverview === 'function') {
                clearAndRefreshOverview();
                setTimeout(() => {
                    if (typeof window.updateFontMismatchUI === 'function') {
                        window.updateFontMismatchUI();
                    }
                }, 100);
            }


        }
        return;
    }
}

function deleteGlobalFontChange(originalFontKey) {
    // Find and remove the specific global font change for this original font combination
    for (let selector in cssRulesJson) {
        if (cssRulesJson[selector]?.additionalInfo?.isGlobalFontChange) {
            let shouldDeleteThisEntry = false;

            // Check if this entry contains the specific original font key we want to delete
            for (let prop in cssRulesJson[selector]) {
                if (prop !== 'additionalInfo') {
                    const entry = cssRulesJson[selector][prop];
                    if (entry && entry.originalFontKey && entry.originalFontKey === originalFontKey) {
                        shouldDeleteThisEntry = true;
                        break;
                    }
                }
            }
            if (shouldDeleteThisEntry) {
                // Remove from stylesheet
                const inspectaStylesheet = document.getElementById('inspectaStylesheet')?.sheet;
                if (inspectaStylesheet) {
                    for (let i = inspectaStylesheet.cssRules.length - 1; i >= 0; i--) {
                        const rule = inspectaStylesheet.cssRules[i];
                        if (rule.selectorText && rule.selectorText.includes(`inspecta-global-font-${originalFontKey}`)) {
                            inspectaStylesheet.deleteRule(i);
                        }
                    }
                }

                // Remove global font classes from elements
                const allElements = document.querySelectorAll('body *');
                const globalFontClassPattern = `inspecta-global-font-${originalFontKey}`;
                allElements.forEach(el => {
                    const classes = Array.from(el.classList);
                    classes.forEach(cls => {
                        if (cls.startsWith(globalFontClassPattern)) {
                            el.classList.remove(cls);
                        }
                    });
                });

                // Remove from JSON
                delete cssRulesJson[selector];
            }
        }
    }

    if (isStoreCss) saveCSS();
    generateInspectaFullCss();
    generateCssChangesCounter();
    if (typeof clearAndRefreshOverview === 'function') {
        clearAndRefreshOverview();
        setTimeout(() => {
            if (typeof window.updateFontMismatchUI === 'function') {
                window.updateFontMismatchUI();
            }
        }, 100);
    }
}

// Helper functions for font normalization (if not already defined)
function normalizeSize(size) {
    if (!size) return '';
    // Convert to string and normalize
    size = String(size).trim();
    if (size === 'normal' || size === 'inherit' || size === 'initial') return size;
    // For numeric values, ensure they have units
    if (!isNaN(size) && !size.includes('px') && !size.includes('em') && !size.includes('rem')) {
        size = size + 'px';
    }
    return size;
}

function normalizeLineHeight(lh) {
    if (!lh) return '';
    // Convert to string and normalize
    lh = String(lh).trim();
    if (lh === 'normal' || lh === 'inherit' || lh === 'initial') return lh;
    // For numeric values, ensure they have units
    if (!isNaN(lh) && !lh.includes('px') && !lh.includes('em') && !lh.includes('rem')) {
        lh = lh + 'px';
    }
    return lh;
}

// Helper function to compare font values (handles units properly)
function compareFontValues(value1, value2) {
    if (!value1 || !value2) return false;

    // Convert to strings and trim
    const v1 = String(value1).trim();
    const v2 = String(value2).trim();

    // Direct comparison first
    if (v1 === v2) return true;

    // Handle numeric values with/without units
    const num1 = parseFloat(v1);
    const num2 = parseFloat(v2);

    if (!isNaN(num1) && !isNaN(num2) && num1 === num2) {
        // Check if both have the same unit type or both are unitless
        const hasUnit1 = v1.includes('px') || v1.includes('em') || v1.includes('rem');
        const hasUnit2 = v2.includes('px') || v2.includes('em') || v2.includes('rem');

        // If both have units or both are unitless, compare the numeric values
        if (hasUnit1 === hasUnit2) return true;
    }

    return false;
}

// Make functions globally available
window.generateGlobalFontChange = generateGlobalFontChange;
window.deleteGlobalFontChange = deleteGlobalFontChange;
window.normalizeSize = normalizeSize;
window.normalizeLineHeight = normalizeLineHeight;

// Make essential functions globally available for property delete functionality
window.generateElSelector = generateElSelector;
window.removeInlineStyle = removeInlineStyle;
window.generateInspectaFullCss = generateInspectaFullCss;
window.generateCssChangesCounter = generateCssChangesCounter;
window.cssRulesJson = cssRulesJson;
window.removeAllInspectaInlineStyles = removeAllInspectaInlineStyles;

/**
 * Copy all CSS changes as optimized AI prompt to clipboard
 */
function copyAllChangesToAI() {
    try {
        const allChanges = [];
        const context = getContextInfo(); // Shared context for all rules

        // Collect all changes in compact format
        for (let selector in cssRulesJson) {
            const ruleData = cssRulesJson[selector];

            // Skip if no rule data
            if (!ruleData) continue;

            // Handle global changes differently
            if (ruleData.additionalInfo?.isGlobalColorChange || ruleData.additionalInfo?.isGlobalFontChange) {
                const changes = getCssChanges(ruleData);
                if (changes.changes.length > 0) {
                    const changeType = ruleData.additionalInfo.isGlobalColorChange ? 'Global Color' : 'Global Font';
                    const changesText = changes.changes.map(c => `${c.property}: ${c.old} → ${c.new}`).join(', ');
                    allChanges.push({
                        selector: changeType + ' Change',
                        changes: changesText,
                        isGlobal: true
                    });
                }
                continue;
            }

            // Regular element changes
            const changes = getCssChanges(ruleData);
            if (changes.changes.length > 0) {
                const element = document.querySelector(selector);
                const boundingBox = element ? getBoundingBoxInfo(element) : null;

                allChanges.push({
                    selector: selector,
                    changes: changes.changes.map(c => `${c.property}: ${c.old} → ${c.new}`).join(', '),
                    boundingBox: boundingBox,
                    isGlobal: false
                });
            }
        }

        // Check if there are any changes
        if (allChanges.length === 0) {
            if (window.showToast) window.showToast('No CSS changes found');
            return;
        }

        // Generate optimized prompt
        const promptText = generateOptimizedAIPrompt(allChanges, context);

        navigator.clipboard.writeText(promptText);
        if (window.showToast) window.showToast(`All ${allChanges.length} CSS changes copied to AI prompt`);
    } catch (error) {
        console.error('Error generating all changes AI prompt:', error);
        if (window.showToast) window.showToast('Error generating AI prompt');
    }
}

/**
 * Generate optimized AI prompt for multiple CSS changes
 * @param {Array} changes - Array of change objects
 * @param {Object} context - Shared context information
 * @returns {string} Optimized prompt text
 */
function generateOptimizedAIPrompt(changes, context) {
    const changesText = changes.map((change, index) => {
        let line = `${index + 1}. ${change.selector} { ${change.changes} }`;

        // Add bounding box info for regular elements (not global changes)
        if (!change.isGlobal && change.boundingBox) {
            line += ` [${change.boundingBox.width}×${change.boundingBox.height}px at ${change.boundingBox.x},${change.boundingBox.y}]`;
        }

        return line;
    }).join('\n');

    return JSON.stringify({
        "type": "multiple_css_changes",
        "total_rules": changes.length,
        "changes": changes.map((change, index) => ({
            "index": index + 1,
            "selector": change.selector,
            "changes_text": change.changes,
            "is_global": change.isGlobal,
            "bounding_box": change.boundingBox ? {
                "width": change.boundingBox.width,
                "height": change.boundingBox.height,
                "x": change.boundingBox.x,
                "y": change.boundingBox.y
            } : null
        })),
        "context": {
            "file_hint": context.codePlacementHint,
            "url": context.pageUrl,
            "detect_project_type": true,
            "allow_file_creation": false,
            "ignore_breakpoints": true
        },
        "instructions": getBaseInstructions('multiple_rules')
    }, null, 2);
}

// Make functions globally available
window.copyAllChangesToAI = copyAllChangesToAI;
window.sendToCursorSingleRule = sendToCursorSingleRule;
window.updateSendToCursorButtons = updateSendToCursorButtons;
window.isLocalhost = isLocalhost;

// Update Send to Cursor buttons immediately when this script loads
setTimeout(() => {
    updateSendToCursorButtons();
}, 100);

/**
 * Send all CSS changes to Cursor AI agent via WebSocket
 */
function sendToCursor() {
    console.log('🚀 sendToCursor function called!');

    // Check if on localhost first
    if (!isLocalhost()) {
        if (window.showToast) window.showToast('Send to Cursor only works on localhost');
        return;
    }

    try {
        const allChanges = [];
        const context = getContextInfo(); // Shared context for all rules

        // Collect all changes in compact format
        for (let selector in cssRulesJson) {
            const ruleData = cssRulesJson[selector];

            // Skip if no rule data
            if (!ruleData) continue;

            // Handle global changes differently
            if (ruleData.additionalInfo?.isGlobalColorChange || ruleData.additionalInfo?.isGlobalFontChange) {
                const changes = getCssChanges(ruleData);
                if (changes.changes.length > 0) {
                    const changeType = ruleData.additionalInfo.isGlobalColorChange ? 'Global Color' : 'Global Font';
                    const changesText = changes.changes.map(c => `${c.property}: ${c.old} → ${c.new}`).join(', ');
                    allChanges.push({
                        selector: changeType + ' Change',
                        changes: changesText,
                        isGlobal: true
                    });
                }
                continue;
            }

            // Skip individual element entries that are part of a global change
            // Only process entries that have the isGlobalColorChange or isGlobalFontChange flag
            // Individual element entries created by applyCssRule don't have these flags
            if (!ruleData.additionalInfo?.isGlobalColorChange && !ruleData.additionalInfo?.isGlobalFontChange) {
                // Skip entries that look like they're part of a global change but don't have the flag
                if (selector.includes('inspecta-global-color-') || selector.includes('inspecta-global-font-')) {
                    continue;
                }
            }

            // Regular element changes
            const changes = getCssChanges(ruleData);
            if (changes.changes.length > 0) {
                const element = document.querySelector(selector);
                const boundingBox = element ? getBoundingBoxInfo(element) : null;

                allChanges.push({
                    selector: selector,
                    changes: changes.changes.map(c => `${c.property}: ${c.old} → ${c.new}`).join(', '),
                    boundingBox: boundingBox,
                    isGlobal: false
                });
            }
        }

        // Check if there are any changes
        if (allChanges.length === 0) {
            if (window.showToast) window.showToast('No CSS changes found');
            return;
        }

        // Generate optimized prompt
        const promptText = generateOptimizedAIPrompt(allChanges, context);

        // Prepare data for Cursor
        const cursorData = {
            prompt: promptText,
            cssChanges: allChanges,
            context: context,
            timestamp: Date.now()
        };

        // Send to Cursor extension
        sendToCursorExtension(cursorData);

    } catch (error) {
        console.error('Error sending to Cursor:', error);
        if (window.showToast) window.showToast('Error sending to Cursor');
    }
}

/**
 * Send data to Cursor IDE extension via WebSocket or fallback method
 * @param {Object} data - The data to send to Cursor IDE
 */
function sendToCursorExtension(data) {
    // Only attempt connection on localhost
    if (!window.isLocalhost || !window.isLocalhost()) {
        if (window.showToast) {
            window.showToast('❌ Send to Cursor only works on localhost');
        }
        return;
    }

    // console.log('📡 Attempting WebSocket connection to Cursor IDE extension...');
    // Try WebSocket first (connects to Cursor IDE extension)
    try {
        const ws = new WebSocket('ws://127.0.0.1:8080');

        ws.onopen = function () {
            const message = {
                type: 'css_changes',
                data: data,
                autoSubmit: true
            };

            ws.send(JSON.stringify(message));

            // Update bridge status to connected
            if (window.updateBridgeStatus) {
                window.updateBridgeStatus('connected');
            }

            // Show success toast when data is sent
            if (window.showToast) window.showToast('✅ Sent to Cursor AI agent!');
        };

        ws.onmessage = function (event) {
            const response = JSON.parse(event.data);
            handleCursorResponse(response);

            // Only close connection for regular responses, keep open for notifications
            if (response.type !== 'cursor_notification') {
                ws.close();
            }
        };

        ws.onerror = function (error) {
            console.log('❌ WebSocket failed:', error);
            ws.close();

            // Update bridge status to disconnected
            if (window.updateBridgeStatus) {
                window.updateBridgeStatus('disconnected');
            }

            if (window.showToast) window.showToast('❌ Failed to connect to Cursor IDE. Make sure the Inspecta extension is running in Cursor.');
        };

        // Timeout after 5 seconds
        setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();

                // Update bridge status to disconnected
                if (window.updateBridgeStatus) {
                    window.updateBridgeStatus('disconnected');
                }

                if (window.showToast) window.showToast('❌ Connection to Cursor IDE timed out. Make sure the Inspecta extension is running in Cursor.');
            }
        }, 5000);

    } catch (error) {
        console.log('WebSocket not available:', error);

        // Update bridge status to disconnected
        if (window.updateBridgeStatus) {
            window.updateBridgeStatus('disconnected');
        }

        if (window.showToast) window.showToast('❌ Cannot connect to Cursor IDE. Make sure the Inspecta extension is running in Cursor.');
    }
}


/**
 * Handle response from Cursor IDE extension
 * @param {Object} response - The response from Cursor IDE
 */
function handleCursorResponse(response) {
    // console.log('📥 Received response from Cursor IDE:', response);

    if (response.type === 'cursor_notification') {
        // Handle notification from Cursor IDE
        const notification = response.data;
        console.log('🔔 Cursor notification:', notification);

        if (window.showToast) {
            // Show toast with appropriate styling based on type
            if (notification.type === 'success') {
                window.showToast(`✅ ${notification.message}`, 'success');
            } else if (notification.type === 'error') {
                window.showToast(`❌ ${notification.message}`, 'error');
            } else {
                window.showToast(`ℹ️ ${notification.message}`, 'info');
            }
        }
    } else if (response.type === 'server_status') {
        // Handle server status updates - don't show as error
        console.log('📡 Server status update:', response.status, response.message);
        // Status updates are handled in the onmessage function, no need to show toast here
    } else if (response.success) {
        // Handle regular response - removed intermediate toast as we get live feedback
        // console.log('Cursor response:', response);
    } else {
        // Handle error response
        if (window.showToast) window.showToast(`Error: ${response.message}`);
        console.error('Cursor error:', response);
    }
}

// Global WebSocket connection for notifications
let notificationWebSocket = null;

/**
 * Update the AI bridge status indicator
 * @param {string} status - 'connected', 'connecting', or 'disconnected'
 */
function updateBridgeStatus(status) {
    // Use shadow DOM to access elements
    const statusIndicator = window.shadow ? window.shadow.querySelector('#ai_bridge_status_indicator') : null;
    const statusText = window.shadow ? window.shadow.querySelector('#ai_bridge_status_text') : null;
    const refreshIcon = window.shadow ? window.shadow.querySelector('#ai_bridge_refresh_icon') : null;

    if (!statusIndicator || !statusText) {
        // Retry after a short delay in case elements aren't ready yet
        setTimeout(() => updateBridgeStatus(status), 100);
        return;
    }

    // Remove all status classes
    statusIndicator.classList.remove('connected', 'connecting', 'disconnected');

    // Add the appropriate class and update text
    switch (status) {
        case 'connected':
            statusIndicator.classList.add('connected');
            statusText.textContent = 'Connected';
            // Hide refresh icon when connected
            if (refreshIcon) {
                refreshIcon.style.display = 'none';
            }
            break;
        case 'connecting':
            statusIndicator.classList.add('connecting');
            statusText.textContent = 'Connecting...';
            // Hide refresh icon when connecting
            if (refreshIcon) {
                refreshIcon.style.display = 'none';
            }
            break;
        case 'disconnected':
        default:
            statusIndicator.classList.add('disconnected');
            statusText.textContent = 'Disconnected';
            // Show refresh icon when disconnected
            if (refreshIcon) {
                refreshIcon.style.display = 'inline-block';
            }
            break;
    }
}

/**
 * Establish persistent WebSocket connection for receiving notifications from Cursor IDE
 */
function connectToCursorNotifications() {
    // Only attempt connection on localhost
    if (!window.isLocalhost || !window.isLocalhost()) {
        if (window.debugMode) {
            console.log('📡 Skipping Cursor IDE notification connection: Not on localhost');
        }
        updateBridgeStatus('disconnected');
        return;
    }

    if (notificationWebSocket && notificationWebSocket.readyState === WebSocket.OPEN) {
        console.log('📡 Notification WebSocket already connected');
        updateBridgeStatus('connected');
        return;
    }

    // Update status to connecting
    updateBridgeStatus('connecting');

    // Only log connection attempts in debug mode to reduce console spam
    if (window.debugMode) {
        console.log('📡 Connecting to Cursor IDE for notifications...');
    }

    try {
        notificationWebSocket = new WebSocket('ws://127.0.0.1:8080');

        notificationWebSocket.onopen = function () {
            // console.log('✅ Connected to Cursor IDE for notifications');
            updateBridgeStatus('connected');
        };

        notificationWebSocket.onmessage = function (event) {
            const response = JSON.parse(event.data);
            if (response.type === 'cursor_notification') {
                handleCursorResponse(response);
            } else if (response.type === 'server_status') {
                // Handle server status updates from Cursor
                updateBridgeStatus(response.status);
            }
        };

        notificationWebSocket.onclose = function () {
            // Only log disconnection in debug mode
            if (window.debugMode) {
                console.log('🔌 Notification WebSocket disconnected');
            }
            updateBridgeStatus('disconnected');
            notificationWebSocket = null;
            // Don't auto-reconnect - wait for Cursor to send status updates
        };

        notificationWebSocket.onerror = function (error) {
            // Only log errors in debug mode to reduce console spam
            if (window.debugMode) {
                console.log('❌ Notification WebSocket error:', error);
            }
            updateBridgeStatus('disconnected');
        };

    } catch (error) {
        console.log('❌ Failed to create notification WebSocket:', error);
        updateBridgeStatus('disconnected');
    }
}

/**
 * Manual connection check function
 */
function checkConnectionManually() {
    console.log('🔄 Manual connection check initiated');

    // Update status to connecting
    updateBridgeStatus('connecting');

    // Close any existing connection first
    if (notificationWebSocket) {
        notificationWebSocket.close();
        notificationWebSocket = null;
    }

    // Try to establish a new connection
    if (typeof connectToCursorNotifications === 'function') {
        connectToCursorNotifications();

        // Add a timeout to check if connection actually succeeded
        setTimeout(() => {
            if (notificationWebSocket && notificationWebSocket.readyState === WebSocket.OPEN) {
                console.log('✅ Manual connection check: Server is running');
                updateBridgeStatus('connected');
            } else {
                console.log('❌ Manual connection check: Server is not running');
                updateBridgeStatus('disconnected');
            }
        }, 2000); // Wait 2 seconds to see if connection stabilizes
    } else {
        console.log('❌ connectToCursorNotifications function not available');
        updateBridgeStatus('disconnected');
    }
}

/**
 * Setup refresh icon click handler
 */
function setupRefreshIconHandler() {
    const refreshIcon = window.shadow ? window.shadow.querySelector('#ai_bridge_refresh_icon') : null;

    if (refreshIcon) {
        refreshIcon.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent event bubbling
            checkConnectionManually();
        });
    } else {
        // Retry after a short delay if element isn't ready
        setTimeout(setupRefreshIconHandler, 100);
    }
}

/**
 * Debug function to check bridge status elements and current state
 */
function debugBridgeStatus() {
    console.log('🔍 Debug Bridge Status:');
    console.log('🔍 shadow DOM available:', !!window.shadow);
    console.log('🔍 statusIndicator element:', window.shadow ? window.shadow.querySelector('#ai_bridge_status_indicator') : 'shadow not available');
    console.log('🔍 statusText element:', window.shadow ? window.shadow.querySelector('#ai_bridge_status_text') : 'shadow not available');
    console.log('🔍 refreshIcon element:', window.shadow ? window.shadow.querySelector('#ai_bridge_refresh_icon') : 'shadow not available');
    console.log('🔍 notificationWebSocket state:', notificationWebSocket ? notificationWebSocket.readyState : 'null');
    console.log('🔍 isLocalhost function available:', typeof window.isLocalhost === 'function');
    console.log('🔍 isLocalhost result:', window.isLocalhost ? window.isLocalhost() : 'function not available');

    // Try to update status to test
    updateBridgeStatus('connected');
}

// Make functions globally available
window.sendToCursor = sendToCursor;
window.connectToCursorNotifications = connectToCursorNotifications;
window.updateBridgeStatus = updateBridgeStatus;
window.checkConnectionManually = checkConnectionManually;
window.setupRefreshIconHandler = setupRefreshIconHandler;
window.debugBridgeStatus = debugBridgeStatus;



