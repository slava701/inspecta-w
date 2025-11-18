class ElementToolbar {
    constructor(initialElement = document.body) {
        this.currentElement = initialElement;
        this.highlightClass = 'inspecta-inspect-active';
        this.actionPanel = null;
    }

    // Remove highlights from all elements
    clearHighlights() {
        document.querySelectorAll('.' + this.highlightClass).forEach(el => {
            el.classList.remove(this.highlightClass);
            el.removeAttribute('data-element-tag');
            el.removeAttribute('data-element-classes');
        });

        if (this.actionPanel) {
            this.actionPanel.remove();
            this.actionPanel = null;
        }
    }

    // Create action panel for the current element
    createActionPanel() {
        if (this.actionPanel) {
            this.actionPanel.remove();
        }

        this.actionPanel = document.createElement('div');
        this.actionPanel.className = 'element-action-panel';

        // Check if the current element has CSS changes
        const hasCssChanges = this.checkElementHasCssChanges();

        this.actionPanel.innerHTML = `
            <button id="paste_figma_style" class="copy-selector-btn">
                <svg class="icon-20" style="pointer-events:none">
                    <use href="#ic_figma_paste"></use>
                </svg>
            </button>
            ${hasCssChanges ? `
            <button id="btn_copy_ai_prompt" class="copy-ai-prompt-btn">
                <svg class="icon-20" style="pointer-events:none">
                    <use href="#ic_ai_copy"></use>
                </svg>
            </button>
            ` : ''}
            ${hasCssChanges && typeof window.isLocalhost === 'function' && window.isLocalhost() ? `
            <button id="btn_send_to_cursor" class="send-to-cursor-btn">
                <svg class="icon-20" style="pointer-events:none">
                    <use href="#ic_cursor"></use>
                </svg>
            </button>
            ` : ''}
            <button id="btn_screenshot_element" class="screenshot-btn">
                <svg class="icon-20" style="pointer-events:none">
                    <use href="#ic_camera"></use>
                </svg>
            </button>
            <button id="btn_isolate_element" class="isolate-btn">
                <svg class="icon-20" style="pointer-events:none">
                    <use href="#ic_isolate"></use>
                </svg>
            </button>
        `;

        const copyBtn = this.actionPanel.querySelector('.copy-selector-btn');
        copyBtn.addEventListener('click', async (e) => {
            applyClipboardCSS(this.currentElement);
        });

        // Add event listener for AI copy button if it exists
        const aiCopyBtn = this.actionPanel.querySelector('.copy-ai-prompt-btn');
        if (aiCopyBtn) {
            aiCopyBtn.addEventListener('click', async (e) => {
                if (typeof window.copyToAI === 'function') {
                    const selector = window.generateElSelector ? window.generateElSelector(this.currentElement) : null;
                    if (selector) {
                        window.copyToAI(selector);
                    }
                }
            });
        }

        // Add event listener for Send to Cursor button if it exists
        const sendToCursorBtn = this.actionPanel.querySelector('.send-to-cursor-btn');
        if (sendToCursorBtn) {
            sendToCursorBtn.addEventListener('click', async (e) => {
                if (typeof window.sendToCursorSingleRule === 'function') {
                    const selector = window.generateElSelector ? window.generateElSelector(this.currentElement) : null;
                    if (selector) {
                        window.sendToCursorSingleRule(selector);
                    }
                }
            });
        }

        const screenshotBtn = this.actionPanel.querySelector('.screenshot-btn');
        screenshotBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            try {
                // Get the element's bounding box
                const rect = this.currentElement.getBoundingClientRect();
                const devicePixelRatio = window.devicePixelRatio || 1;

                const bounds = {
                    x: Math.round(rect.x * devicePixelRatio),
                    y: Math.round(rect.y * devicePixelRatio),
                    width: Math.round(rect.width * devicePixelRatio),
                    height: Math.round(rect.height * devicePixelRatio)
                };


                // Temporarily hide Inspecta UI for clean screenshot
                const inspectaContainer = document.getElementById('inspecta_app_container');
                const originalDisplay = inspectaContainer ? inspectaContainer.style.display : null;

                if (inspectaContainer) {
                    inspectaContainer.style.display = 'none';
                }

                // Send message to background script to capture screenshot
                const response = await chrome.runtime.sendMessage({
                    action: 'capture-screenshot',
                    bounds: bounds
                });

                // Restore Inspecta UI visibility
                if (inspectaContainer) {
                    inspectaContainer.style.display = originalDisplay || 'block';
                }

                if (response && response.base64) {
                    // Convert base64 to blob and copy to clipboard
                    const imageResponse = await fetch(response.base64);
                    const blob = await imageResponse.blob();
                    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);

                    // Show success toast
                    if (window.showToast) {
                        window.showToast('📸 Screenshot copied!', 2000);
                    }
                } else if (response && response.error) {
                    console.error('Screenshot error:', response.error);
                    if (window.showToast) {
                        window.showToast('❌ Screenshot failed: ' + response.error, 3000);
                    }
                } else {
                    console.error('No response from background script');
                    if (window.showToast) {
                        window.showToast('❌ Screenshot failed', 3000);
                    }
                }
            } catch (error) {
                console.error('Error capturing screenshot:', error);

                // Ensure Inspecta UI is restored even if there's an error
                const inspectaContainer = document.getElementById('inspecta_app_container');
                if (inspectaContainer) {
                    inspectaContainer.style.display = 'block';
                }

                if (window.showToast) {
                    window.showToast('❌ Screenshot failed: ' + error.message, 3000);
                }
            }
        });

        const isolateBtn = this.actionPanel.querySelector('.isolate-btn');
        isolateBtn.addEventListener('click', () => {
            const body = document.body;
            this.actionPanel.style.display = 'none';

            const rect = this.currentElement.getBoundingClientRect();

            // Store original position and parent info
            this.originalParent = this.currentElement.parentElement;
            this.originalNextSibling = this.currentElement.nextSibling;
            this.originalPosition = {
                top: rect.top + window.scrollY,
                left: rect.left + window.scrollX
            };

            // Store the enabled state of each property for the original selector
            this.preIsolationEnabledState = {};
            if (window.cssRulesJson && this.originalSelector && window.cssRulesJson[this.originalSelector]) {
                for (const prop in window.cssRulesJson[this.originalSelector]) {
                    if (prop !== 'additionalInfo') {
                        this.preIsolationEnabledState[prop] = window.cssRulesJson[this.originalSelector][prop].enabled;
                    }
                }
            }

            // Store original computed styles before moving the element
            this.originalComputedStyles = {};
            const computed = window.getComputedStyle(this.currentElement);
            for (let i = 0; i < computed.length; i++) {
                const prop = computed[i];
                this.originalComputedStyles[prop] = computed.getPropertyValue(prop);
            }

            // Store original inline styles
            this.originalInlineStyles = this.currentElement.style.cssText;

            // Store the original selector BEFORE moving the element
            this.originalSelector = null;
            if (typeof window.generateElSelector === 'function') {
                this.originalSelector = window.generateElSelector(this.currentElement);
                // Store the original selector on the element itself for CSS generator access
                this.currentElement.originalSelector = this.originalSelector;

                // Also store original selectors for all child elements to prevent selector conflicts
                this.storeChildElementSelectors(this.currentElement);
            }

            // Store original inline styles BEFORE copying styles to inline
            this.originalInlineStyles = this.currentElement.style.cssText;

            // Copy all applicable CSS rules to inline styles BEFORE moving
            this.copyAllApplicableStylesToInline(this.currentElement);

            // Store the element's computed styles to preserve dimensions
            const computedStyle = window.getComputedStyle(this.currentElement);
            const originalWidth = computedStyle.width;
            const originalHeight = computedStyle.height;
            const originalMinWidth = computedStyle.minWidth;
            const originalMaxWidth = computedStyle.maxWidth;
            const originalMinHeight = computedStyle.minHeight;
            const originalMaxHeight = computedStyle.maxHeight;

            // Create wrapper for visual isolation
            const wrapper = document.createElement('div');
            wrapper.id = 'inspecta_isolation_wrapper';
            wrapper.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                width: ${rect.width}px;
                height: ${rect.height}px;
                z-index: 9999;
                transform: translate(-50%, -50%);
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            this.wrapper = wrapper;

            // Move element to wrapper
            wrapper.appendChild(this.currentElement);
            body.appendChild(wrapper);

            // Preserve the element's original dimensions
            this.currentElement.style.width = originalWidth;
            this.currentElement.style.height = originalHeight;
            if (originalMinWidth !== 'none') this.currentElement.style.minWidth = originalMinWidth;
            if (originalMaxWidth !== 'none') this.currentElement.style.maxWidth = originalMaxWidth;
            if (originalMinHeight !== 'none') this.currentElement.style.minHeight = originalMinHeight;
            if (originalMaxHeight !== 'none') this.currentElement.style.maxHeight = originalMaxHeight;

            // Add isolation class
            this.currentElement.classList.add('inspecta-inspect-isolated');

            // Hide all other elements
            this.hideOtherElements();

            // Create isolation panel
            this.createIsolationPanel();

            selectElement(null, this.currentElement, false);
            applyInspector();
        });

        const rect = this.currentElement.getBoundingClientRect();
        const left = rect.left + rect.width / 2 + window.scrollX;

        shadow.appendChild(this.actionPanel);
        const panelRect = this.actionPanel.getBoundingClientRect();

        // Use the same smart positioning logic as overlay labels
        const position = this.getSmartToolbarPosition(rect, panelRect);

        // console.log('Toolbar positioning:', {
        //     elementHeight: rect.height,
        //     viewportHeight: window.innerHeight,
        //     spaceBelow: window.innerHeight - rect.bottom,
        //     spaceAbove: rect.top,
        //     position: position.position,
        //     top: position.top
        // });

        this.actionPanel.style.left = left + 'px';
        this.actionPanel.style.top = position.top + 'px';
        // transform is now handled by CSS

        // Apply positioning class (removed custom inside positioning classes)

        if (window.tooltipManager) {
            window.tooltipManager.initializeTooltips();
        }
    }

    // Smart positioning logic for toolbar (same as overlay labels)
    getSmartToolbarPosition(rect, panelRect) {
        const viewportHeight = window.innerHeight;
        const toolbarHeight = panelRect.height;
        const buffer = 50; // Same buffer as overlay labels

        // Check if element is near the bottom of the viewport
        const elementBottom = rect.bottom;
        const spaceBelow = viewportHeight - elementBottom;

        // Also check if element takes up most of the viewport height (full-height elements)
        const elementHeight = rect.height;
        const isFullHeightElement = elementHeight > viewportHeight * 0.7; // 70% of viewport height

        // Check if element extends beyond the viewport (causes scrollbars)
        const elementTop = rect.top;
        const isElementBeyondViewport = elementBottom > viewportHeight || elementTop < 0;

        // Check if there's enough space above for the toolbar
        const spaceAbove = elementTop;

        // Special case: if element takes up most of the viewport height (100vh or close) AND no room outside, position inside
        const threshold = viewportHeight * 0.8;
        const isFullHeight = elementHeight > threshold;
        const noRoomOutside = spaceAbove < toolbarHeight + 10 && spaceBelow < toolbarHeight + buffer;


        if (isFullHeight && noRoomOutside) {
            return {
                top: rect.top + window.scrollY + 4,
                position: 'inside-top'
            };
        }

        // Default to positioning above the element, unless there's not enough space above
        if (spaceAbove > toolbarHeight + 10) {
            return {
                top: rect.top + window.scrollY - toolbarHeight - 4,
                position: 'above'
            };
        } else {
            // If there's not enough space above, position below (only if there's space below)
            if (spaceBelow > toolbarHeight + buffer) {
                return {
                    top: rect.bottom + window.scrollY + 4,
                    position: 'below'
                };
            } else {
                // No space above or below, position above anyway (might be partially cut off)
                return {
                    top: rect.top + window.scrollY - toolbarHeight - 4,
                    position: 'above'
                };
            }
        }
    }

    // Check if the current element has CSS changes
    checkElementHasCssChanges() {
        if (!this.currentElement || !window.cssRulesJson) {
            return false;
        }

        // Generate selector for the current element
        const selector = window.generateElSelector ? window.generateElSelector(this.currentElement) : null;
        if (!selector || !window.cssRulesJson[selector]) {
            return false;
        }

        const ruleData = window.cssRulesJson[selector];

        // Check if there are any enabled properties with values
        for (const prop in ruleData) {
            if (prop !== 'additionalInfo' && ruleData[prop] && ruleData[prop].enabled && ruleData[prop].value) {
                return true;
            }
        }

        return false;
    }

    // Update the action panel immediately after changes are made
    updateActionPanel() {
        // console.log('🔍 updateActionPanel called');
        if (this.actionPanel && this.actionPanel.parentNode) {
            // Check if the current element has CSS changes
            const hasCssChanges = this.checkElementHasCssChanges();
            const isLocal = typeof window.isLocalhost === 'function' && window.isLocalhost();
            // console.log('🔍 hasCssChanges:', hasCssChanges, 'isLocal:', isLocal);

            // Update the AI copy button visibility
            const aiCopyBtn = this.actionPanel.querySelector('.copy-ai-prompt-btn');
            // console.log('🔍 existing aiCopyBtn:', aiCopyBtn);

            if (hasCssChanges && !aiCopyBtn) {
                // console.log('🔍 Adding AI copy button');
                // Add AI copy button if it doesn't exist but should
                const pasteBtn = this.actionPanel.querySelector('.copy-selector-btn');
                if (pasteBtn) {
                    const newAiCopyBtn = document.createElement('button');
                    newAiCopyBtn.id = 'btn_copy_ai_prompt';
                    newAiCopyBtn.className = 'copy-ai-prompt-btn';
                    newAiCopyBtn.innerHTML = `
                        <svg class="icon-20" style="pointer-events:none">
                            <use href="#ic_ai_copy"></use>
                        </svg>
                    `;

                    // Add event listener
                    newAiCopyBtn.addEventListener('click', async (e) => {
                        if (typeof window.copyToAI === 'function') {
                            const selector = window.generateElSelector ? window.generateElSelector(this.currentElement) : null;
                            if (selector) {
                                try {
                                    await window.copyToAI(selector);
                                } catch (error) {
                                    console.error('Error copying to AI:', error);
                                }
                            }
                        }
                    });

                    // Insert after the paste button
                    pasteBtn.parentNode.insertBefore(newAiCopyBtn, pasteBtn.nextSibling);

                    // Initialize tooltip for the new button
                    if (window.tooltipManager) {
                        window.tooltipManager.initializeTooltips();
                    }

                    // console.log('🔍 AI copy button added successfully');
                }
            } else if (!hasCssChanges && aiCopyBtn) {
                // console.log('🔍 Removing AI copy button');
                // Remove AI copy button if it exists but shouldn't
                aiCopyBtn.remove();
            } else {
                // console.log('🔍 No action needed for AI copy button');
            }

            // Update the Send to Cursor button visibility
            const sendToCursorBtn = this.actionPanel.querySelector('.send-to-cursor-btn');
            // console.log('🔍 existing sendToCursorBtn:', sendToCursorBtn);

            if (hasCssChanges && isLocal && !sendToCursorBtn) {
                // console.log('🔍 Adding Send to Cursor button');
                // Add Send to Cursor button if it doesn't exist but should
                const aiCopyBtn = this.actionPanel.querySelector('.copy-ai-prompt-btn');
                if (aiCopyBtn) {
                    const newSendToCursorBtn = document.createElement('button');
                    newSendToCursorBtn.id = 'btn_send_to_cursor';
                    newSendToCursorBtn.className = 'send-to-cursor-btn';
                    newSendToCursorBtn.innerHTML = `
                        <svg class="icon-20" style="pointer-events:none">
                            <use href="#ic_cursor"></use>
                        </svg>
                    `;

                    // Add event listener
                    newSendToCursorBtn.addEventListener('click', async (e) => {
                        if (typeof window.sendToCursorSingleRule === 'function') {
                            const selector = window.generateElSelector ? window.generateElSelector(this.currentElement) : null;
                            if (selector) {
                                try {
                                    window.sendToCursorSingleRule(selector);
                                } catch (error) {
                                    console.error('Error sending to Cursor:', error);
                                }
                            }
                        }
                    });

                    // Insert after the AI copy button
                    aiCopyBtn.parentNode.insertBefore(newSendToCursorBtn, aiCopyBtn.nextSibling);

                    // Initialize tooltip for the new button
                    if (window.tooltipManager) {
                        window.tooltipManager.initializeTooltips();
                    }

                    // console.log('🔍 Send to Cursor button added successfully');
                }
            } else if ((!hasCssChanges || !isLocal) && sendToCursorBtn) {
                // console.log('🔍 Removing Send to Cursor button');
                // Remove Send to Cursor button if it exists but shouldn't
                sendToCursorBtn.remove();
            } else {
                // console.log('🔍 No action needed for Send to Cursor button');
            }
        } else {
            console.log('❌ No action panel found');
        }
    }

    // Clean up method
    destroy() {
        this.clearHighlights();
    }

    // Exit isolation mode and restore element
    exitIsolationMode() {
        if (!this.currentElement || !this.currentElement.classList.contains('inspecta-inspect-isolated')) return;

        // Clean up any duplicate CSS rules that might have been created
        this.cleanupDuplicateCssRules();

        // Check if CSS changes are enabled
        const applyCssChanges = document.querySelector('#apply_css_changes');
        const isCssEnabled = applyCssChanges ? applyCssChanges.checked : true;

        if (isCssEnabled) {
            // Transfer all inline styles back to the CSS system
            this.transferInlineStylesToCss(this.currentElement);
        } else {
            // If CSS is disabled, just remove all inline styles
            this.currentElement.removeAttribute('style');
        }

        if (this.originalDisplays) {
            this.originalDisplays.forEach((display, element) => {
                element.style.display = display;
            });
            this.originalDisplays = null;
        }
        document.body.style.backgroundColor = '';
        if (this.originalParent) {
            this.originalParent.insertBefore(this.currentElement, this.originalNextSibling);
        }
        if (this.wrapper) {
            this.wrapper.remove();
            this.wrapper = null;
        }
        // Remove isolation panel from shadow DOM if present
        const shadow = document.querySelector('#inspecta_app_container')?.shadowRoot;
        if (shadow) {
            shadow.querySelectorAll('.isolation-pnl').forEach(panel => panel.remove());
        }
        this.currentElement.classList.remove('inspecta-inspect-isolated');
        if (this.actionPanel) {
            this.actionPanel.style.display = 'flex';
        }
    }

    // Apply CSS changes as inline styles during isolation mode
    applyInlineStyle(property, value) {
        if (!this.currentElement || !this.currentElement.closest('#inspecta_isolation_wrapper')) {
            return false; // Not in isolation mode
        }

        // Apply the style directly as inline style
        this.currentElement.style.setProperty(property, value);

        // Also map this change to the original selector in the CSS system
        if (this.originalSelector && typeof window.generateInspectaCss === 'function') {
            const originalTarget = window.target;
            window.target = this.currentElement;
            window.generateInspectaCss(property, value, true, false, this.originalSelector, true, false);
            window.target = originalTarget;
        }

        return true; // Successfully applied as inline
    }

    // Copy stylesheet styles to inline styles for isolation mode
    copyStylesheetToInline(element) {
        // Only copy styles that were applied by Inspecta system
        if (typeof window.cssRulesJson === 'object' && window.cssRulesJson) {
            // Find the element's selector in cssRulesJson
            let elementSelector = null;
            for (let selector in window.cssRulesJson) {
                try {
                    const elements = document.querySelectorAll(selector);
                    if (Array.from(elements).includes(element)) {
                        elementSelector = selector;
                        break;
                    }
                } catch (e) {
                    // Invalid selector, skip
                }
            }

            if (elementSelector && window.cssRulesJson[elementSelector]) {
                const ruleData = window.cssRulesJson[elementSelector];

                // Apply only the styles that were set by Inspecta
                for (let prop in ruleData) {
                    if (prop !== 'additionalInfo' && ruleData[prop] && ruleData[prop].enabled) {
                        const value = ruleData[prop].value;
                        if (value && value.trim() !== '') {
                            element.style.setProperty(prop, value);
                        }
                    }
                }
            }
        }
    }

    // Copy all applicable CSS rules to inline styles
    copyAllApplicableStylesToInline(element) {
        // Instead of copying CSS rules, preserve the current computed styles
        // This prevents automatic changes from being applied during isolation

        // Get the current computed styles
        const computedStyle = window.getComputedStyle(element);

        // List of properties that we want to preserve during isolation
        // Only preserve properties that are essential for visual appearance and don't typically change
        const propertiesToPreserve = [
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
            'display', 'position', 'top', 'right', 'bottom', 'left', 'z-index',
            'opacity', 'visibility', 'overflow', 'overflow-x', 'overflow-y',
            'transform', 'transition', 'animation', 'box-shadow', 'text-shadow'
        ];

        // Preserve the current computed styles as inline styles
        propertiesToPreserve.forEach(property => {
            const value = computedStyle.getPropertyValue(property);
            if (value && value.trim() !== '' && value !== 'initial' && value !== 'unset' && value !== 'inherit') {
                element.style.setProperty(property, value, 'important');
            }
        });

        // Also copy any styles from the Inspecta CSS system
        if (typeof window.cssRulesJson === 'object' && window.cssRulesJson) {
            // Use the original selector that we stored when entering isolation mode
            if (this.originalSelector && window.cssRulesJson[this.originalSelector]) {
                const ruleData = window.cssRulesJson[this.originalSelector];

                // Apply all the styles that were set by Inspecta
                for (let prop in ruleData) {
                    if (prop !== 'additionalInfo' && ruleData[prop] && ruleData[prop].enabled) {
                        const value = ruleData[prop].value;
                        if (value && value.trim() !== '') {
                            element.style.setProperty(prop, value, 'important');
                        }
                    }
                }
            }

            // Also check for child element rules that might apply
            const children = element.querySelectorAll('*');
            children.forEach(child => {
                if (child.originalSelector && window.cssRulesJson[child.originalSelector]) {
                    const childRuleData = window.cssRulesJson[child.originalSelector];

                    // Apply all enabled CSS rules as inline styles to the child
                    for (let prop in childRuleData) {
                        if (prop !== 'additionalInfo' && childRuleData[prop] && childRuleData[prop].enabled) {
                            const value = childRuleData[prop].value;
                            if (value && value.trim() !== '') {
                                // Apply as inline style with !important to override
                                child.style.setProperty(prop, value, 'important');
                            }
                        }
                    }
                }
            });
        }
    }

    // Hide other elements except the selected one
    hideOtherElements() {
        const body = document.body;

        Array.from(body.children).forEach(child => {
            if (child.id !== 'inspecta_app_container') {
                if (child !== this.wrapper &&
                    child !== this.actionPanel &&
                    !this.actionPanel.contains(child)
                ) {
                    if (!this.originalDisplays) {
                        this.originalDisplays = new Map();
                    }
                    this.originalDisplays.set(child, child.style.display);
                    child.style.display = 'none';
                }
            }
        });
    }

    // Create isolation panel
    createIsolationPanel() {
        const isolationPanel = document.createElement('div');
        isolationPanel.className = 'isolation-pnl';
        isolationPanel.innerHTML = `
            <div class="isolation-controls">
              <button class="action-btn center-btn">Reset Position</button>
                <div class="bg-color-control">
                    <div class="color-options">
                        <button class="color-rect" data-color="white"></button>
                        <button class="color-rect" data-color="grey"></button>
                        <button class="color-rect" data-color="black"></button>
                    </div>
                </div>
                <button class="action-btn exit-isolation">Exit</button>
            </div>
        `;

        let isElementCentered = true;

        const centerBtn = isolationPanel.querySelector('.center-btn');
        centerBtn.addEventListener('click', () => {
            if (isElementCentered) {
                this.wrapper.style.position = 'absolute';
                this.wrapper.style.top = this.originalPosition.top + 'px';
                this.wrapper.style.left = this.originalPosition.left + 'px';
                this.wrapper.style.transform = 'none';
                centerBtn.textContent = 'Center element';
                isElementCentered = false;
            } else {
                this.wrapper.style.position = 'fixed';
                this.wrapper.style.top = '50%';
                this.wrapper.style.left = '50%';
                this.wrapper.style.transform = 'translate(-50%, -50%)';
                centerBtn.textContent = 'Reset Position';
                isElementCentered = true;
            }
        });

        const colorRects = isolationPanel.querySelectorAll('.color-rect');
        colorRects.forEach(rect => {
            rect.addEventListener('click', () => {
                const color = rect.dataset.color;
                document.body.style.backgroundColor = color;
            });
        });

        const exitBtn = isolationPanel.querySelector('.exit-isolation');
        exitBtn.addEventListener('click', () => {
            this.exitIsolationWithStyleTransfer();
        });

        // Add to shadow DOM
        const shadow = document.querySelector('#inspecta_app_container').shadowRoot;
        shadow.appendChild(isolationPanel);
    }

    // Exit isolation mode and transfer styles back to CSS system
    exitIsolationWithStyleTransfer() {
        if (!this.currentElement || !this.currentElement.classList.contains('inspecta-inspect-isolated')) return;

        // Clean up any duplicate CSS rules that might have been created
        this.cleanupDuplicateCssRules();

        // Store the current inline styles before moving the element
        const currentInlineStyles = this.currentElement.style.cssText;

        // Restore element to original position FIRST
        if (this.originalParent) {
            this.originalParent.insertBefore(this.currentElement, this.originalNextSibling);
        }

        // Remove isolation class
        this.currentElement.classList.remove('inspecta-inspect-isolated');

        // Now apply the inline styles to the element in its original position
        if (currentInlineStyles) {
            this.currentElement.style.cssText = currentInlineStyles;
        }

        // Transfer all inline styles back to the CSS system (now that element is in original position)
        this.transferInlineStylesToCss(this.currentElement);

        // Clean up
        if (this.wrapper) {
            this.wrapper.remove();
            this.wrapper = null;
        }

        // Show other elements
        if (this.originalDisplays) {
            this.originalDisplays.forEach((display, element) => {
                element.style.display = display;
            });
            this.originalDisplays = null;
        }

        // Remove isolation panel from shadow DOM if present
        const shadow = document.querySelector('#inspecta_app_container')?.shadowRoot;
        if (shadow) {
            shadow.querySelectorAll('.isolation-pnl').forEach(panel => panel.remove());
        }

        // Reset body background
        document.body.style.backgroundColor = '';

        // Show action panel
        if (this.actionPanel) {
            this.actionPanel.style.display = 'flex';
        }

        // Re-select the element
        selectElement(null, this.currentElement, false);
    }

    // Store original selectors for all child elements to prevent selector conflicts
    storeChildElementSelectors(element) {
        if (!window.generateElSelector) return;

        // Recursively store selectors for all child elements
        const children = element.querySelectorAll('*');
        children.forEach(child => {
            if (!child.originalSelector) {
                child.originalSelector = window.generateElSelector(child);
            }
        });
    }

    // Clean up duplicate CSS rules that might have been created during isolation
    cleanupDuplicateCssRules() {
        if (!this.originalSelector || !window.cssRulesJson) {
            return;
        }

        // Check all selectors in cssRulesJson for potential duplicates
        const selectorsToCheck = Object.keys(window.cssRulesJson);

        for (const selector of selectorsToCheck) {
            // Skip if it's the original selector
            if (selector === this.originalSelector) {
                continue;
            }

            // Check if this selector might be a duplicate of the original
            // This could happen if the element was moved during isolation
            const rule = window.cssRulesJson[selector];
            if (rule && rule.additionalInfo) {
                // Check if this rule has the same tag name and similar properties
                const originalRule = window.cssRulesJson[this.originalSelector];
                if (originalRule && originalRule.additionalInfo) {
                    const sameTagName = rule.additionalInfo.tagName === originalRule.additionalInfo.tagName;
                    const sameCustomTagName = rule.additionalInfo.customTagName === originalRule.additionalInfo.customTagName;

                    if (sameTagName || sameCustomTagName) {
                        // This looks like a duplicate, merge it with the original
                        console.log('Found potential duplicate CSS rule:', selector, 'merging into:', this.originalSelector);

                        // Merge properties from duplicate to original
                        Object.keys(rule).forEach(property => {
                            if (property !== 'additionalInfo') {
                                originalRule[property] = rule[property];
                            }
                        });

                        // Update the original rule
                        window.cssRulesJson[this.originalSelector] = originalRule;

                        // Remove the duplicate rule
                        delete window.cssRulesJson[selector];

                        // Remove the duplicate rule from the stylesheet
                        const stylesheet = document.getElementById('inspectaStylesheet');
                        if (stylesheet && stylesheet.sheet) {
                            const rules = Array.from(stylesheet.sheet.cssRules);
                            rules.forEach((rule, index) => {
                                if (rule.selectorText === selector) {
                                    stylesheet.sheet.deleteRule(index);
                                }
                            });
                        }

                        console.log('Cleaned up duplicate CSS rule:', selector, 'merged into:', this.originalSelector);
                    }
                }
            }
        }
    }

    // Helper to normalize color values to rgb format
    normalizeColorValue(val) {
        if (!val) return '';
        // If already rgb, return as is
        if (val.startsWith('rgb')) return val.replace(/\s+/g, '');
        // If hex, convert to rgb
        let hex = val.trim().toLowerCase();
        if (hex[0] === '#') {
            if (hex.length === 4) {
                hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
            }
            const num = parseInt(hex.slice(1), 16);
            const r = (num >> 16) & 255;
            const g = (num >> 8) & 255;
            const b = num & 255;
            return `rgb(${r},${g},${b})`;
        }
        return val;
    }

    // Transfer inline styles back to CSS system
    transferInlineStylesToCss(element) {
        // List of outline properties to ignore
        const OUTLINE_PROPS = [
            'outline', 'outline-width', 'outline-style', 'outline-color'
        ];
        const OUTLINE_COLOR_DEFAULTS = ['#000', '#000000', 'rgb(0,0,0)', 'rgb(0, 0, 0)', 'transparent', 'rgba(0,0,0,0)', 'rgba(0, 0, 0, 0)'];

        // Collect all inline styles
        const styleProps = [];
        for (let i = 0; i < element.style.length; i++) {
            styleProps.push(element.style[i]);
        }

        const styleObj = {};
        for (const property of styleProps) {
            const cssProp = property.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
            const value = element.style.getPropertyValue(property);
            let shouldTransfer = true;
            // Ignore outline properties unless they were present in the original computed styles and not default
            if (OUTLINE_PROPS.includes(cssProp)) {
                // Special case for outline-color: skip if value is a default black (normalize both)
                if (cssProp === 'outline-color') {
                    const orig = this.originalComputedStyles ? this.originalComputedStyles[cssProp] : undefined;
                    const normValue = this.normalizeColorValue(value);
                    const normOrig = this.normalizeColorValue(orig);
                    if (
                        OUTLINE_COLOR_DEFAULTS.includes(normValue) ||
                        OUTLINE_COLOR_DEFAULTS.includes(normOrig)
                    ) {
                        shouldTransfer = false;
                    }
                } else {
                    const orig = this.originalComputedStyles ? this.originalComputedStyles[cssProp] : undefined;
                    if (!orig || orig === '' || orig === 'none' || orig === '0px' || orig === 'rgb(0, 0, 0)') {
                        shouldTransfer = false;
                    }
                }
            }
            if (shouldTransfer && this.originalComputedStyles && this.originalComputedStyles.hasOwnProperty(cssProp)) {
                if (value === this.originalComputedStyles[cssProp]) {
                    shouldTransfer = false;
                }
            }
            if (shouldTransfer && value && value.trim() !== '' &&
                value !== 'initial' && value !== 'unset' && value !== 'inherit') {
                styleObj[cssProp] = { value, enabled: true };
            }
            element.style.removeProperty(property);
        }

        // Use shorthand properties
        let shorthandObj = getShorthandProperties(styleObj);

        // Use the original selector for CSS changes
        const selector = this.originalSelector || null;

        // Transfer to CSS system using the original selector
        for (const prop in shorthandObj) {
            if (shorthandObj[prop] && shorthandObj[prop].enabled) {
                // If the property was previously unchecked, keep it disabled
                let shouldEnable = true;
                if (this.preIsolationEnabledState && this.preIsolationEnabledState.hasOwnProperty(prop)) {
                    shouldEnable = this.preIsolationEnabledState[prop];
                }
                if (typeof window.generateInspectaCss === 'function') {
                    const originalTarget = window.target;
                    window.target = element;
                    window.generateInspectaCss(prop, shorthandObj[prop].value, true, false, selector, shouldEnable, false);
                    window.target = originalTarget;
                }
            }
        }

        // Force remove any remaining inline styles
        if (element.style.length > 0) {
            element.removeAttribute('style');
        }

        // Ensure changes are saved to storage
        if (typeof window.saveCSS === 'function' && window.isStoreCss) {
            window.saveCSS();
        }
    }
}

// Helper function to initialize element toolbar
function initElementToolbar(startElement) {
    const toolbar = new ElementToolbar();
    toolbar.currentElement = startElement;

    // Use global selectElement to handle selection and highlighting
    selectElement(null, startElement, false);

    // Create the action panel
    toolbar.createActionPanel();

    // Make the toolbar globally available for updates
    window.elementToolbar = toolbar;

    return toolbar;
}

// Helper: Try to generate margin/padding/border/border-radius shorthand
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
            properties[prop + '-top'].enabled && properties[prop + '-right'].enabled &&
            properties[prop + '-bottom'].enabled && properties[prop + '-left'].enabled
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
    // Border-radius
    const tl = properties['border-top-left-radius']?.value;
    const tr = properties['border-top-right-radius']?.value;
    const br = properties['border-bottom-right-radius']?.value;
    const bl = properties['border-bottom-left-radius']?.value;
    if (
        tl !== undefined && tr !== undefined && br !== undefined && bl !== undefined &&
        properties['border-top-left-radius'].enabled && properties['border-top-right-radius'].enabled &&
        properties['border-bottom-right-radius'].enabled && properties['border-bottom-left-radius'].enabled
    ) {
        const shorthand = `${tl} ${tr} ${br} ${bl}`;
        result['border-radius'] = { value: shorthand, enabled: true };
        delete result['border-top-left-radius'];
        delete result['border-top-right-radius'];
        delete result['border-bottom-right-radius'];
        delete result['border-bottom-left-radius'];
    }
    // Border
    if (
        properties['border-width'] && properties['border-style'] && properties['border-color'] &&
        properties['border-width'].enabled && properties['border-style'].enabled && properties['border-color'].enabled
    ) {
        const borderVal = `${properties['border-width'].value} ${properties['border-style'].value} ${properties['border-color'].value}`;
        result['border'] = { value: borderVal, enabled: true };
        delete result['border-width'];
        delete result['border-style'];
        delete result['border-color'];
    }
    return result;
}


