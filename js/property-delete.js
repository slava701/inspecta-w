// Property Change Indicators - Works exactly like CSS Changes Panel
// Shows dots near changed properties that can be clicked to delete them

let propertyChangeIndicators = new Map(); // Maps property names to their indicator elements

// Initialize property delete functionality
function initPropertyDelete() {
    const shadowContainer = document.getElementById('inspecta_app_container');
    if (!shadowContainer) {
        setTimeout(initPropertyDelete, 100);
        return;
    }

    const shadowRoot = shadowContainer.shadowRoot;
    const root = shadowRoot || document;

    // Remove existing listener to prevent duplicates
    root.removeEventListener('click', handlePropertyIndicatorClick, true);

    // Add click listener
    root.addEventListener('click', handlePropertyIndicatorClick, true);
}

// Create a visual indicator (dot) for a property that has changes
function createPropertyChangeIndicator(propertyName, containerElement) {
    if (!containerElement || !propertyName) {
        return;
    }

    // Remove existing indicator if present
    removePropertyChangeIndicator(propertyName);

    // Get the selector for the current target (same as CSS changes panel)
    const selector = window.generateElSelector(window.target);

    // Create indicator element
    const indicator = document.createElement('div');
    indicator.className = 'property-change-indicator';
    indicator.setAttribute('data-property', propertyName);
    indicator.setAttribute('data-rule', selector); // Store the rule like CSS changes panel
    indicator.title = `Click to delete ${propertyName} change`;

    // Make container relative positioned if not already
    const containerStyle = getComputedStyle(containerElement);
    if (containerStyle.position === 'static') {
        containerElement.style.position = 'relative';
    }

    // Add indicator to container
    containerElement.appendChild(indicator);

    // Store reference
    propertyChangeIndicators.set(propertyName, indicator);
}

// Remove a property change indicator
function removePropertyChangeIndicator(propertyName) {
    const existingIndicator = propertyChangeIndicators.get(propertyName);
    if (existingIndicator && existingIndicator.parentNode) {
        existingIndicator.parentNode.removeChild(existingIndicator);
        propertyChangeIndicators.delete(propertyName);
    }
}

// Handle click on property change indicator - EXACT same logic as CSS changes panel
function handlePropertyIndicatorClick(event) {
    // Use composedPath() for reliable event delegation in Shadow DOM
    const path = event.composedPath();

    for (let element of path) {
        if (element.classList && element.classList.contains('property-change-indicator')) {
            const propertyName = element.getAttribute('data-property');
            const rule = element.getAttribute('data-rule');

            if (propertyName && rule) {
                event.preventDefault();
                event.stopPropagation();

                // Use the EXACT same logic as CSS changes panel
                if (typeof window.deletePropertyFromRule === 'function') {
                    // Call the deletion function (same as CSS changes panel)
                    window.deletePropertyFromRule(rule, propertyName);
                } else {
                    console.warn('deletePropertyFromRule function not available');
                }
            }
            return;
        }
    }
}

// Update all property change indicators based on current cssRulesJson
// Uses EXACT same logic as CSS changes panel
function updatePropertyChangeIndicators() {
    if (!window.target || !window.cssRulesJson) {
        clearAllPropertyChangeIndicators();
        return;
    }

    // Check if cssRulesJson is empty (no rules at all)
    const availableSelectors = Object.keys(window.cssRulesJson);
    if (availableSelectors.length === 0) {
        clearAllPropertyChangeIndicators();
        return;
    }

    // Use the same logic as CSS changes panel to detect properties
    const selector = window.generateElSelector(window.target);

    // Clear existing indicators
    clearAllPropertyChangeIndicators();

    // Check if there are any properties for this selector (same as CSS changes panel)
    if (window.cssRulesJson[selector]) {
        const rule = window.cssRulesJson[selector];

        // Get all properties except additionalInfo (same as CSS changes panel)
        Object.keys(rule).forEach((key) => {
            if (key === 'additionalInfo') return;

            const property = rule[key];
            // Use the EXACT same validation as CSS changes panel
            // Only show indicators for enabled properties with values
            if (property.enabled && property.value && String(property.value).trim() !== '') {
                // For each valid property, add a dot indicator
                const containerElement = getPropertyContainerElement(key);
                if (containerElement) {
                    createPropertyChangeIndicator(key, containerElement);
                }
            }
        });
    }
}

// Get the container element for a specific property
function getPropertyContainerElement(propertyName) {
    const shadowContainer = document.getElementById('inspecta_app_container');
    const shadowRoot = shadowContainer ? shadowContainer.shadowRoot : null;
    const root = shadowRoot || document;

    // Normalize property name to kebab-case
    const normalizedPropertyName = propertyName.replace(/[A-Z]/g, m => '-' + m.toLowerCase());

    // Helper: find label inside a parent that has a given child
    const findLabelWithChild = (parentSelector, childSelector) => {
        const parents = root.querySelectorAll(parentSelector);
        for (let parent of parents) {
            if (parent.querySelector(childSelector)) {
                return parent.querySelector('.property_label');
            }
        }
        return null;
    };

    const propertyLabels = {
        'display': root.querySelector('#pnl_display_values .property_label'),
        'flex-direction': root.querySelector('#pnl_flex_direction_values .property_label'),
        'flex-wrap': () => {
            const currentDir = getFlexDir().replace('-reverse', '');
            return root.querySelector(`#pnl_flex_warp_${currentDir} .property_label`);
        },
        'align-items': () => {
            // Always use the currently visible align panel by checking which one has display: block
            const allAlignPanels = root.querySelectorAll('#pnl_flex_align_row, #pnl_flex_align_row_rev, #pnl_flex_align_column, #pnl_flex_align_column_rev');
            for (let panel of allAlignPanels) {
                if (panel.style.display === 'block' || (panel.style.display === '' && panel.offsetParent !== null)) {
                    const label = panel.querySelector('.property_label');
                    if (label) return label;
                }
            }
            // If no visible panel found, use the first one as fallback
            return root.querySelector('#pnl_flex_align_row .property_label');
        },
        'justify-content': () => {
            // Always use the currently visible justify panel by checking which one has display: block
            const allJustifyPanels = root.querySelectorAll('#pnl_flex_justify_row, #pnl_flex_justify_row_rev, #pnl_flex_justify_column, #pnl_flex_justify_column_reverse');
            for (let panel of allJustifyPanels) {
                if (panel.style.display === 'block' || (panel.style.display === '' && panel.offsetParent !== null)) {
                    const label = panel.querySelector('.property_label');
                    if (label) return label;
                }
            }
            // If no visible panel found, use the first one as fallback
            return root.querySelector('#pnl_flex_justify_row .property_label');
        },
        'gap': root.querySelector('#pnl_flex_gap .property_label'),

        'width': findLabelWithChild('#pnl_size_values .input_dd', '#in_width'),
        'height': findLabelWithChild('#pnl_size_values .input_dd', '#in_height'),
        'min-width': findLabelWithChild('#pnl_size_values .input_dd', '#in_min_width'),
        'max-width': findLabelWithChild('#pnl_size_values .input_dd', '#in_max_width'),
        'min-height': findLabelWithChild('#pnl_size_values .input_dd', '#in_min_height'),
        'max-height': findLabelWithChild('#pnl_size_values .input_dd', '#in_max_height'),

        'margin-top': root.querySelector('#pnl_spacing_values .input_m_top'),
        'margin-right': root.querySelector('#pnl_spacing_values .input_m_right'),
        'margin-bottom': root.querySelector('#pnl_spacing_values .input_m_bottom'),
        'margin-left': root.querySelector('#pnl_spacing_values .input_m_left'),

        'padding-top': root.querySelector('#pnl_spacing_values .input_p_top'),
        'padding-right': root.querySelector('#pnl_spacing_values .input_p_right'),
        'padding-bottom': root.querySelector('#pnl_spacing_values .input_p_bottom'),
        'padding-left': root.querySelector('#pnl_spacing_values .input_p_left'),

        'border-style': root.querySelector('#pnl_border_values .property_label'),
        'border-width': findLabelWithChild('#pnl_border_values .property_item_vertical', '#in_bc'),
        'borderWidth': findLabelWithChild('#pnl_border_values .property_item_vertical', '#in_bc'),
        'border-top-width': findLabelWithChild('#pnl_border_values .property_item_vertical', '#in_bc'),
        'border-right-width': findLabelWithChild('#pnl_border_values .property_item_vertical', '#in_bc'),
        'border-bottom-width': findLabelWithChild('#pnl_border_values .property_item_vertical', '#in_bc'),
        'border-left-width': findLabelWithChild('#pnl_border_values .property_item_vertical', '#in_bc'),
        'border-color': findLabelWithChild('#pnl_border_values .property_item_vertical', '#in_border_color'),
        'border-radius': findLabelWithChild('#pnl_border_values .property_item_vertical', '#in_radius'),
        'border-top-left-radius': findLabelWithChild('#pnl_border_values .property_item_vertical', '#in_radius'),
        'border-top-right-radius': findLabelWithChild('#pnl_border_values .property_item_vertical', '#in_radius'),
        'border-bottom-left-radius': findLabelWithChild('#pnl_border_values .property_item_vertical', '#in_radius'),
        'border-bottom-right-radius': findLabelWithChild('#pnl_border_values .property_item_vertical', '#in_radius'),
        'border': findLabelWithChild('#pnl_border_values .property_item_vertical', '#in_bc'),

        'background-color': root.querySelector('#pnl_background_values .property_label'),
        'background': root.querySelector('#pnl_background_values .property_label'),
        'background-image': root.querySelector('#pnl_background_values .property_label'),
        'backgroundColor': root.querySelector('#pnl_background_values .property_label'),

        'color': findLabelWithChild('#pnl_typography_values .property_item_vertical', '#in_font_color'),
        'font-family': findLabelWithChild('#pnl_typography_values .property_item_vertical', '#font-family-selector-container'),
        'font-size': findLabelWithChild('#pnl_typography_values .property_item_vertical', '#in_font_size'),
        'font-weight': findLabelWithChild('#pnl_typography_values .property_item_vertical', '#in_font_weight'),
        'line-height': findLabelWithChild('#pnl_typography_values .property_item_vertical', '#in_line_height'),
        'letter-spacing': findLabelWithChild('#pnl_typography_values .property_item_vertical', '#in_letter_spacing'),
        'text-align': findLabelWithChild('#pnl_typography_values .property_item_vertical', '#in_txt_align_left'),
        'text-decoration-line': findLabelWithChild('#pnl_typography_values .property_item_vertical', '#in_txt_decoration_none'),

        'position': root.querySelector('#pnl_position_values .property_label'),
        'top': findLabelWithChild('#pnl_absolute_position_values .property_item_vertical', '#in_top'),
        'right': findLabelWithChild('#pnl_absolute_position_values .property_item_vertical', '#in_right'),
        'bottom': findLabelWithChild('#pnl_absolute_position_values .property_item_vertical', '#in_bottom'),
        'left': findLabelWithChild('#pnl_absolute_position_values .property_item_vertical', '#in_left'),

        'z-index': root.querySelector('#pnl_z_index .property_label'),
        'opacity': root.querySelector('#pnl_opac_values .property_label'),
        'box-shadow': root.querySelector('#pnl_box_shadow_header .item_label')
    };

    // Try both original and normalized property names
    const mapping = propertyLabels[propertyName] || propertyLabels[normalizedPropertyName];
    if (typeof mapping === 'function') {
        return mapping();
    }
    return mapping || null;

    function getFlexDir() {
        if (window.target) {
            return window.getComputedStyle(window.target).flexDirection || 'row';
        }
        return 'row';
    }
}

// Clear all property change indicators
function clearAllPropertyChangeIndicators() {
    propertyChangeIndicators.forEach((indicator, propertyName) => {
        if (indicator && indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
        }
    });
    propertyChangeIndicators.clear();
}

// Simple element selection handler
function handleElementSelectionChange() {
    clearAllPropertyChangeIndicators();
    setTimeout(updatePropertyChangeIndicators, 300);
}

// Debounce mechanism to prevent infinite loops
let syncDotsTimeout = null;

// Sync dots with CSS changes panel - this function was missing!
function syncDotsWithCssChanges() {
    // Clear any existing timeout to debounce calls
    if (syncDotsTimeout) {
        clearTimeout(syncDotsTimeout);
    }

    // Debounce the function call to prevent infinite loops
    syncDotsTimeout = setTimeout(() => {
        // console.log('🔍 syncDotsWithCssChanges called');
        updatePropertyChangeIndicators();

        // Also update the element toolbar AI copy button if it exists
        if (window.elementToolbar && typeof window.elementToolbar.updateActionPanel === 'function') {
            if (window.debugMode) {
                console.log('🔍 Updating element toolbar action panel');
            }
            window.elementToolbar.updateActionPanel();
        } else {
            // Only log in debug mode to reduce console spam
            if (window.debugMode) {
                console.log('❌ Element toolbar not available or updateActionPanel method missing');
                console.log('🔍 window.elementToolbar:', window.elementToolbar);
                console.log('🔍 updateActionPanel method:', window.elementToolbar?.updateActionPanel);
            }
        }
    }, 100); // 100ms debounce
}

// Make functions globally available
window.updatePropertyChangeIndicators = updatePropertyChangeIndicators;
window.createPropertyChangeIndicator = createPropertyChangeIndicator;
window.removePropertyChangeIndicator = removePropertyChangeIndicator;
window.clearAllPropertyChangeIndicators = clearAllPropertyChangeIndicators;
window.forceClearAllIndicators = clearAllPropertyChangeIndicators;
window.handleElementSelectionChange = handleElementSelectionChange;
window.syncDotsWithCssChanges = syncDotsWithCssChanges;