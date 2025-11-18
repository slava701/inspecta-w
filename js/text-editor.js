'use strict';

class TextEditor {
    constructor() {
        this.currentTextElement = null;
        this.originalText = '';
        this.textEditPanel = null;
        this.textEditTextarea = null;
        this.resetButton = null;
        this.clearAllButton = null;
        this.textEditHeader = null;
        this.textEditValues = null;
        this.textContentObserver = null;
        this.isResetting = false;

        this.init();
    }

    init() {
        if (window.shadow) {
            this.setupElements();
        }
    }

    setupElements() {
        if (!this.validateGlobalVariables()) {
            console.warn('TextEditor: Global variables validation failed');
            return;
        }

        const shadow = window.shadow;
        if (!shadow) {
            console.warn('TextEditor: Shadow DOM not available');
            return;
        }


        this.textEditPanel = shadow.getElementById('text-edit');
        this.textEditTextarea = shadow.getElementById('text_edit_textarea');
        this.resetButton = shadow.getElementById('text_edit_reset');
        // this.clearAllButton = shadow.getElementById('text_edit_clear_all');
        this.copyPromptButton = shadow.getElementById('text_edit_copy_prompt');
        this.sendCursorButton = shadow.getElementById('text_edit_send_cursor');
        this.textEditHeader = shadow.getElementById('pnl_text_edit_header');
        this.textEditValues = shadow.getElementById('pnl_text_edit_values');

        if (!this.textEditPanel || !this.textEditTextarea) {
            console.warn('TextEditor: Core elements not found in shadow DOM');
            return;
        }

        if (this.resetButton) {
            // Add multiple event listeners to ensure we catch the click
            this.resetButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.resetCurrentElement();
            });

            this.resetButton.addEventListener('mousedown', (e) => {
                // Mousedown handler for additional reliability
            });

            // Also try adding a direct onclick handler as backup
            this.resetButton.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.resetCurrentElement();
            };

        } else {
            console.warn('TextEditor: Reset button not found in shadow DOM');
        }

        // if (this.clearAllButton) {
        //     this.clearAllButton.addEventListener('click', () => {
        //         this.clearAllTextChanges();
        //     });
        // }

        if (this.copyPromptButton) {
            this.copyPromptButton.addEventListener('click', () => {
                this.copyTextPrompt();
            });
        }

        if (this.sendCursorButton) {
            this.sendCursorButton.addEventListener('click', () => {
                this.sendTextToCursor();
            });
        }

        this.textEditTextarea.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.resetCurrentElement();
            }
        });

        this.setupTextContentObserver();
        this.setupGlobalPanelHeaderHandlers();
        this.setupElementSelectionListener();

        let saveTimeout;
        this.textEditTextarea.addEventListener('input', (e) => {
            const newText = e.target.value;
            this.updateDOMInRealTime(newText);
            this.updateResetButtonState();

            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                if (this.currentTextElement) {
                    this.saveToChromeStorage(this.currentTextElement, newText);
                    // this.updateClearAllButtonState();
                }
            }, 300);
        });

    }

    refreshElementReferences() {
        if (!this.validateGlobalVariables()) {
            return false;
        }

        const shadow = window.shadow;
        if (!shadow) {
            console.log('TextEditor: Shadow DOM not available for refresh');
            return false;
        }

        this.textEditPanel = shadow.getElementById('text-edit');
        this.textEditTextarea = shadow.getElementById('text_edit_textarea');
        this.resetButton = shadow.getElementById('text_edit_reset');
        this.clearAllButton = shadow.getElementById('text_edit_clear_all');
        this.textEditHeader = shadow.getElementById('pnl_text_edit_header');
        this.textEditValues = shadow.getElementById('pnl_text_edit_values');

        return !!(this.textEditPanel && this.textEditTextarea);
    }

    updateResetButtonState() {
        if (!this.resetButton || !this.textEditTextarea) return;
        const currentText = this.textEditTextarea.value;

        // Get the original text from multiple sources to ensure we have it
        let originalText = this.originalText;
        if (!originalText && this.currentTextElement) {
            originalText = this.currentTextElement.getAttribute('data-original-text');
        }

        // If we still don't have original text, use current text as fallback
        if (!originalText) {
            originalText = currentText;
        }

        const hasChanges = currentText !== originalText;
        const isDisabled = !hasChanges;

        this.resetButton.disabled = isDisabled;
        this.resetButton.style.opacity = isDisabled ? '0.5' : '1';
        this.resetButton.style.cursor = isDisabled ? 'not-allowed' : 'pointer';
    }

    // updateClearAllButtonState() {
    //     if (!this.clearAllButton) {
    //         const shadow = window.shadow;
    //         if (shadow) {
    //             this.clearAllButton = shadow.getElementById('text_edit_clear_all');
    //         }
    //     }
    //     if (!this.clearAllButton) return;

    //     const keys = Object.keys(localStorage);
    //     const textEditKeys = keys.filter(key => key.startsWith('inspecta_text_edit_'));
    //     const hasAnyChanges = textEditKeys.length > 0;

    //     this.clearAllButton.disabled = !hasAnyChanges;
    //     this.clearAllButton.style.opacity = this.clearAllButton.disabled ? '0.5' : '1';
    //     this.clearAllButton.style.cursor = this.clearAllButton.disabled ? 'not-allowed' : 'pointer';
    // }

    setupTextContentObserver() {
        if (this.textContentObserver) {
            this.textContentObserver.disconnect();
        }
        this.textContentObserver = new MutationObserver((mutations) => {
            if (!this.currentTextElement || !this.textEditTextarea || this.isResetting) return;
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' || mutation.type === 'characterData') {
                    if (mutation.target === this.currentTextElement ||
                        this.currentTextElement.contains(mutation.target)) {
                        const newText = this.normalizeTextContent(this.currentTextElement.textContent || '');
                        const currentTextareaValue = this.textEditTextarea.value;
                        if (newText !== currentTextareaValue) {
                            this.textEditTextarea.value = newText;
                            this.saveToChromeStorage(this.currentTextElement, newText);
                            this.updateResetButtonState();
                        }
                    }
                }
            });
        });
    }

    startObservingCurrentElement() {
        if (this.currentTextElement && this.textContentObserver) {
            this.textContentObserver.observe(this.currentTextElement, {
                childList: true,
                subtree: true,
                characterData: true
            });
        }
    }

    stopObservingCurrentElement() {
        if (this.textContentObserver) {
            this.textContentObserver.disconnect();
        }
    }

    setupGlobalPanelHeaderHandlers() {
        if (!this.validateGlobalVariables()) {
            return;
        }

        const shadow = window.shadow;
        if (!shadow) return;
        shadow.addEventListener('click', (event) => {
            const panelHeader = event.target.closest('.pnl_item_header');
            if (panelHeader) {
                const panelItem = panelHeader.closest('.pnl_item');
                if (!panelItem) return;
                const valuesContainer = panelItem.querySelector('.item_values');
                if (!valuesContainer) return;
                const isExpanded = valuesContainer.style.display !== 'none';
                const expandIcon = panelHeader.querySelector('.expand');
                if (isExpanded) {
                    valuesContainer.style.display = 'none';
                    if (expandIcon) expandIcon.style.transform = 'rotate(0deg)';
                } else {
                    valuesContainer.style.display = 'block';
                    if (expandIcon) expandIcon.style.transform = 'rotate(180deg)';
                }
            }
        });
    }

    setupElementSelectionListener() {
        window.handleElementSelectionChange = () => {
            setTimeout(() => this.checkForTextElement(), 100);
        };
    }

    checkForTextElement() {
        if (!window.target) {
            return;
        }
        const element = window.target;
        if (this.isTextElement(element)) {
            this.showTextEditPanel(element);
        } else {
            this.hideTextEditPanel();
        }
    }

    isTextElement(element) {
        if (!element) return false;
        if (element.closest('#inspecta_app_container') ||
            element.closest('#inspecta-rg-overlay') ||
            element.id === 'inspecta_app_container' ||
            element.id === 'inspecta-rg-overlay') {
            return false;
        }

        // If it's a text node, it's always a text element
        if (element.nodeType === Node.TEXT_NODE) {
            const textContent = element.textContent ? element.textContent.trim() : '';
            return textContent.length > 0;
        }

        // For element nodes, only show text editor if:
        // 1. Element has no child elements (only text content)
        // 2. Element has exactly one child that is a text node
        const hasChildElements = element.children.length > 0;
        const textContent = element.textContent ? element.textContent.trim() : '';

        // If element has no child elements and has text content, it's a text element
        if (!hasChildElements && textContent.length > 0) {
            return true;
        }

        // If element has child elements, only show text editor if it has exactly one text node child
        if (hasChildElements) {
            const childNodes = Array.from(element.childNodes);
            const textNodes = childNodes.filter(child => child.nodeType === Node.TEXT_NODE && child.textContent.trim().length > 0);
            const elementNodes = childNodes.filter(child => child.nodeType === Node.ELEMENT_NODE);

            // Only show text editor if there's exactly one text node and no element children
            return textNodes.length === 1 && elementNodes.length === 0;
        }

        return false;
    }

    showTextEditPanel(element) {
        if (!this.textEditPanel || !this.textEditTextarea) {
            if (!this.refreshElementReferences()) {
                return;
            }
        }
        this.currentTextElement = element;

        // Always ensure we have the original text stored, but never overwrite existing
        if (!element.getAttribute('data-original-text')) {
            // Check if we have saved changes and can get the original text from Chrome storage
            const elementId = this.getElementId(element);
            const hostname = window.location.hostname;
            const referenceKey = `${hostname}_text_ref_${elementId}`;

            // Use Chrome storage API instead of localStorage
            chrome.storage.local.get([referenceKey], (result) => {
                const referenceData = result[referenceKey];
                let trueOriginalText = null;

                if (referenceData) {
                    try {
                        const ref = JSON.parse(referenceData);
                        trueOriginalText = ref.textContent;
                    } catch (parseError) {
                        console.warn('Failed to parse reference data:', parseError);
                    }
                }

                if (trueOriginalText) {
                    // Use the true original text from Chrome storage
                    element.setAttribute('data-original-text', trueOriginalText);
                    this.originalText = trueOriginalText;
                } else {
                    // No saved changes, use current text as original
                    const originalText = this.normalizeTextContent(element.textContent || '');
                    const originalClasses = element.className || '';
                    element.setAttribute('data-original-text', originalText);
                    element.setAttribute('data-original-classes', originalClasses);
                    this.originalText = originalText;
                }

                // Continue with panel setup after original text is loaded
                this.continueShowTextEditPanel(element);
            });
        } else {
            // Use stored original text, but verify it's not corrupted
            const storedOriginalText = element.getAttribute('data-original-text');
            const elementId = this.getElementId(element);
            const hostname = window.location.hostname;
            const referenceKey = `${hostname}_text_ref_${elementId}`;

            // Use Chrome storage API instead of localStorage
            chrome.storage.local.get([referenceKey], (result) => {
                const referenceData = result[referenceKey];

                // If we have Chrome storage reference data, verify the stored original text matches
                if (referenceData) {
                    try {
                        const ref = JSON.parse(referenceData);
                        if (ref.textContent && ref.textContent !== storedOriginalText) {
                            // The stored original text doesn't match the reference, use the reference
                            element.setAttribute('data-original-text', ref.textContent);
                            this.originalText = ref.textContent;
                        } else {
                            this.originalText = storedOriginalText;
                        }
                    } catch (parseError) {
                        console.warn('Failed to parse reference data for verification:', parseError);
                        this.originalText = storedOriginalText;
                    }
                } else {
                    // No Chrome storage reference, use stored original text
                    this.originalText = storedOriginalText;
                }

                // Continue with panel setup after original text is loaded
                this.continueShowTextEditPanel(element);
            });
        }
    }

    continueShowTextEditPanel(element) {


        this.textEditPanel.style.display = 'block';
        if (this.validateGlobalVariables()) {
            const elementsSection = window.shadow.querySelector('#pnl-elements');
            if (elementsSection) {
                elementsSection.style.display = 'block';
            }
        }
        if (this.textEditValues && this.textEditHeader) {
            this.textEditValues.style.display = 'block';
            const expandIcon = this.textEditHeader.querySelector('.expand');
            if (expandIcon) expandIcon.style.transform = 'rotate(180deg)';
        }
        element.classList.add('text-node-selected');
        this.isTextEditMode = true;

        // Load saved changes first, then set textarea value
        this.loadSavedChanges().then((hadSavedChanges) => {
            if (!hadSavedChanges) {
                this.textEditTextarea.value = this.originalText;
            }
        });

        this.textEditTextarea.focus();

        // Force a sync check to ensure DOM and textarea are in sync
        setTimeout(() => {
            this.forceSyncCheck();
            // this.updateClearAllButtonState();
        }, 10);

        this.startObservingCurrentElement();
    }

    hideTextEditPanel() {
        if (!this.textEditPanel) return;
        this.textEditPanel.style.display = 'none';
        this.stopObservingCurrentElement();
        if (this.currentTextElement) {
            this.currentTextElement.classList.remove('text-node-selected');
        }
        this.currentTextElement = null;
        this.originalText = '';
        this.isTextEditMode = false;
        if (this.validateGlobalVariables()) {
            const elementsSection = window.shadow.querySelector('#pnl-elements');
            if (elementsSection) {
                const otherPanels = elementsSection.querySelectorAll('.pnl_item:not(#text-edit)');
                const hasVisiblePanels = Array.from(otherPanels).some(panel =>
                    panel.style.display !== 'none' && panel.id !== 'text-edit'
                );
                if (!hasVisiblePanels) {
                    elementsSection.style.display = 'none';
                }
            }
        }
    }

    updateDOMInRealTime(newText) {
        if (!this.currentTextElement) return;
        this.currentTextElement.textContent = newText;
    }

    resetCurrentElement() {
        if (!this.currentTextElement || !this.textEditTextarea) {
            console.warn('TextEditor: Missing currentTextElement or textEditTextarea');
            return;
        }
        try {
            this.isResetting = true; // Prevent mutation observer from interfering

            // Always try to get the true original text from Chrome storage first
            const elementId = this.getElementId(this.currentTextElement);
            const hostname = window.location.hostname;
            const referenceKey = `${hostname}_text_ref_${elementId}`;

            chrome.storage.local.get([referenceKey], (result) => {
                const referenceData = result[referenceKey];
                let originalText = null;

                if (referenceData) {
                    try {
                        const ref = JSON.parse(referenceData);
                        originalText = ref.textContent;
                    } catch (parseError) {
                        console.warn('Failed to parse reference data for reset:', parseError);
                    }
                }

                // If we found original text in storage, use it
                if (originalText) {
                    this.performReset(originalText);
                } else {
                    // Fallback to data attribute or current text
                    const fallbackOriginalText = this.currentTextElement.getAttribute('data-original-text') || this.originalText;
                    this.performReset(fallbackOriginalText);
                }
            });

        } catch (error) {
            console.warn('Failed to reset current element:', error);
            this.isResetting = false;
        }
    }

    performReset(originalText) {
        try {
            const elementId = this.getElementId(this.currentTextElement);
            const hostname = window.location.hostname;
            const storageKey = `${hostname}_text_edit_${elementId}`;
            const referenceKey = `${hostname}_text_ref_${elementId}`;

            // Remove the specific keys for this element from Chrome storage
            chrome.storage.local.remove([storageKey, referenceKey], function () {
                if (chrome.runtime.lastError) {
                    console.warn('Failed to remove text from Chrome storage during reset:', chrome.runtime.lastError);
                }
            });

            // Clear any cached data in the element itself
            this.currentTextElement.removeAttribute('data-inspecta-modified');
            this.currentTextElement.removeAttribute('data-inspecta-cached');

            // Update both DOM and textarea
            this.currentTextElement.textContent = originalText;
            this.textEditTextarea.value = originalText;
            this.originalText = originalText;

            // Ensure the data-original-text attribute is set to the true original text
            this.currentTextElement.setAttribute('data-original-text', originalText);

            // Update button states
            this.updateResetButtonState();
            // this.updateClearAllButtonState();

            // Force DOM update by triggering a reflow
            this.currentTextElement.offsetHeight;

            if (window.showToast) {
                window.showToast('✅ Text reset to original!', 2000);
            }
        } catch (error) {
            console.warn('Failed to perform reset:', error);
        } finally {
            this.isResetting = false; // Re-enable mutation observer
        }
    }

    clearAllTextChanges() {
        try {
            const hostname = window.location.hostname;
            const textEditPrefix = `${hostname}_text_edit_`;
            const textRefPrefix = `${hostname}_text_ref_`;

            chrome.storage.local.get(null, (result) => {
                const textEditKeys = Object.keys(result).filter(key => key.startsWith(textEditPrefix));
                const textRefKeys = Object.keys(result).filter(key => key.startsWith(textRefPrefix));

                console.log('TextEditor: Clearing all text changes', {
                    textEditKeys: textEditKeys,
                    textRefKeys: textRefKeys,
                    totalKeys: textEditKeys.length + textRefKeys.length
                });

                if (textEditKeys.length === 0 && textRefKeys.length === 0) {
                    if (window.showToast) {
                        window.showToast('ℹ️ No text changes found to clear', 2000);
                    }
                    return;
                }

                // First, restore all elements to their original text
                const elementsWithOriginalText = document.querySelectorAll('[data-original-text]');
                let restoredCount = 0;

                // Create a map of element IDs to their saved text for comparison
                const savedTextMap = new Map();
                textEditKeys.forEach(key => {
                    const text = result[key];
                    if (text) {
                        const elementId = key.replace(textEditPrefix, '');
                        savedTextMap.set(elementId, text);
                    }
                });

                elementsWithOriginalText.forEach(element => {
                    const originalText = element.getAttribute('data-original-text');
                    const currentText = element.textContent;
                    const elementId = this.getElementId(element);
                    const savedText = savedTextMap.get(elementId);

                    // Restore if we have saved text for this element and it differs from original
                    if (originalText && savedText && savedText !== originalText) {
                        if (element.children.length > 0) {
                            return; // Skip elements with children
                        }
                        element.textContent = originalText;
                        restoredCount++;
                        // Force DOM update by triggering a reflow
                        element.offsetHeight;
                    }
                });

                // Try to find any remaining elements by their saved text content (fallback for ID matching failures)
                savedTextMap.forEach((savedText, elementId) => {
                    // Find elements that currently have the saved text
                    const elementsWithSavedText = document.querySelectorAll('*');
                    elementsWithSavedText.forEach(element => {
                        if (element.children.length === 0 && element.textContent === savedText) {
                            const originalText = element.getAttribute('data-original-text');
                            if (originalText && originalText !== savedText) {
                                element.textContent = originalText;
                                restoredCount++;
                                element.offsetHeight; // Force reflow
                            }
                        }
                    });
                });

                // Then clear Chrome storage
                const keysToRemove = [...textEditKeys, ...textRefKeys];
                chrome.storage.local.remove(keysToRemove, function () {
                    if (chrome.runtime.lastError) {
                        console.warn('Failed to clear text changes from Chrome storage:', chrome.runtime.lastError);
                    }

                    // Clear current textarea if open
                    if (this.textEditTextarea) {
                        this.textEditTextarea.value = '';
                    }

                    // Hide panel and update button states
                    this.hideTextEditPanel();
                    // this.updateClearAllButtonState();

                    if (window.showToast) {
                        window.showToast(`✅ Cleared ${textEditKeys.length} text changes! Original content restored`, 2000);
                    }
                }.bind(this));
            });
        } catch (error) {
            console.warn('Failed to clear all text changes:', error);
            if (window.showToast) {
                window.showToast('❌ Failed to clear text changes', 2000);
            }
        }
    }

    saveToChromeStorage(element, text) {
        try {
            const elementId = this.getElementId(element);
            const hostname = window.location.hostname;
            const storageKey = `${hostname}_text_edit_${elementId}`;
            const referenceKey = `${hostname}_text_ref_${elementId}`;

            // Get the true original text - prefer data-original-text, fallback to this.originalText
            const originalText = element.getAttribute('data-original-text') || this.originalText;

            const dataToSave = {
                [storageKey]: text,
                [referenceKey]: JSON.stringify({
                    tagName: element.tagName,
                    textContent: originalText,
                    parentId: element.parentElement?.id || element.parentElement?.className || 'root',
                    index: Array.from(element.parentElement?.children || []).indexOf(element)
                })
            };

            chrome.storage.local.set(dataToSave, function () {
                if (chrome.runtime.lastError) {
                    console.warn('Failed to save text to Chrome storage:', chrome.runtime.lastError);
                }
            });
        } catch (error) {
            console.warn('Failed to save text to Chrome storage:', error);
        }
    }

    loadSavedChanges() {
        if (!this.currentTextElement) return Promise.resolve(false);

        return new Promise((resolve) => {
            try {
                const elementId = this.getElementId(this.currentTextElement);
                const hostname = window.location.hostname;
                const storageKey = `${hostname}_text_edit_${elementId}`;
                const referenceKey = `${hostname}_text_ref_${elementId}`;

                // Use Chrome storage API
                chrome.storage.local.get([storageKey, referenceKey], (result) => {
                    const savedText = result[storageKey];
                    if (savedText !== undefined) {
                        const referenceData = result[referenceKey];
                        let trueOriginalText = null;

                        if (referenceData) {
                            try {
                                const ref = JSON.parse(referenceData);
                                trueOriginalText = ref.textContent;
                            } catch (parseError) {
                                console.warn('Failed to parse reference data:', parseError);
                            }
                        }

                        // Ensure we have the original text stored
                        if (!this.currentTextElement.getAttribute('data-original-text')) {
                            if (trueOriginalText) {
                                // Use the true original text from Chrome storage reference
                                this.currentTextElement.setAttribute('data-original-text', trueOriginalText);
                                this.originalText = trueOriginalText;
                            } else {
                                // Fallback: use current text (this shouldn't happen in normal cases)
                                const currentText = this.normalizeTextContent(this.currentTextElement.textContent || '');
                                this.currentTextElement.setAttribute('data-original-text', currentText);
                                this.originalText = currentText;
                            }
                        } else {
                            // Use the stored original text
                            this.originalText = this.currentTextElement.getAttribute('data-original-text');
                        }

                        // Set the textarea to the saved text
                        this.textEditTextarea.value = savedText;
                        // Update the DOM element to show the saved text
                        this.currentTextElement.textContent = savedText;

                        // Update button states after loading saved changes
                        this.updateResetButtonState();
                        // this.updateClearAllButtonState();

                        resolve(true); // Had saved changes
                    } else {
                        this.updateResetButtonState();
                        resolve(false); // No saved changes
                    }
                });
            } catch (error) {
                console.warn('Failed to load text from Chrome storage:', error);
                resolve(false);
            }
        });
    }

    removeFromChromeStorage(element) {
        try {
            const elementId = this.getElementId(element);
            const hostname = window.location.hostname;
            const storageKey = `${hostname}_text_edit_${elementId}`;
            const referenceKey = `${hostname}_text_ref_${elementId}`;

            chrome.storage.local.remove([storageKey, referenceKey], function () {
                if (chrome.runtime.lastError) {
                    console.warn('Failed to remove text from Chrome storage:', chrome.runtime.lastError);
                }
            });
        } catch (error) {
            console.warn('Failed to remove text from Chrome storage:', error);
        }
    }


    normalizeTextContent(text) {
        if (!text) return '';
        // Normalize whitespace: replace multiple spaces with single space, trim leading/trailing whitespace
        return text.replace(/\s+/g, ' ').trim();
    }

    // Security helper methods
    validateElementId(id) {
        if (!id || typeof id !== 'string') return false;
        return /^[a-zA-Z0-9_-]+$/.test(id) && id.length < 100;
    }

    sanitizeSelector(selector) {
        if (!selector || typeof selector !== 'string') return '';
        return selector.replace(/[^a-zA-Z0-9\s._-]/g, '');
    }

    validateGlobalVariables() {
        if (!window.shadow || typeof window.shadow !== 'object') {
            console.error('TextEditor: Required global window.shadow not available');
            return false;
        }
        return true;
    }

    forceSyncCheck() {
        if (!this.currentTextElement || !this.textEditTextarea || this.isResetting) return;

        const currentDOMText = this.normalizeTextContent(this.currentTextElement.textContent || '');
        const currentTextareaValue = this.textEditTextarea.value;


        // Only sync if the DOM text matches the original text (to avoid syncing edited text)
        if (currentDOMText !== currentTextareaValue && currentDOMText === this.originalText) {
            this.textEditTextarea.value = currentDOMText;
        } else if (currentDOMText !== currentTextareaValue && currentDOMText !== this.originalText) {
            this.textEditTextarea.value = currentDOMText;
            this.saveToChromeStorage(this.currentTextElement, currentDOMText);
        }

        this.updateResetButtonState();
    }

    getElementId(element) {
        if (element.id && this.validateElementId(element.id)) {
            return element.id;
        }
        const tagName = element.tagName ? element.tagName.toLowerCase() : 'text';
        const parent = element.parentElement;
        const parentId = parent ? (parent.id || parent.className || parent.tagName.toLowerCase()) : 'root';
        const index = Array.from(parent ? parent.children : []).indexOf(element);
        // Remove text-node-selected and inspecta-inspect classes from the classes used for identification
        const originalClasses = element.getAttribute('data-original-classes') ||
            element.className.replace(/\btext-node-selected\b/g, '').replace(/\binspecta-inspect\b/g, '').trim();

        // Create a stable ID without including text content or data-original-text to avoid changes
        const stableAttributes = Array.from(element.attributes)
            .filter(attr => {
                return (attr.name === 'id' || (attr.name.startsWith('data-') && attr.name !== 'data-original-text' && attr.name !== 'data-original-classes')) &&
                    !attr.value.includes('text-node-selected') &&
                    !attr.value.includes('inspecta-inspect');
            })
            .map(attr => `${attr.name}=${attr.value}`)
            .join('|');

        // Use a more stable ID that doesn't change when classes change
        // Only include the most stable identifiers: tag, parent, index, and stable attributes
        const elementId = `${tagName}_${parentId}_${index}_${stableAttributes}`;

        // Validate the generated ID and truncate if too long
        if (elementId.length > 200) {
            return elementId.substring(0, 200);
        }

        return elementId;
    }

    // Method to restore text changes when called by main system
    restoreAllSavedChangesWhenReady() {
        // Add a longer delay to ensure page is fully loaded
        setTimeout(() => {
            this.restoreTextChangesDirectly();
        }, 500);
    }

    restoreTextChangesDirectly() {
        try {
            // Check if DOM is ready and page is fully loaded
            if (document.readyState !== 'complete') {
                return;
            }

            // Don't restore if we're currently resetting
            if (this.isResetting) {
                return;
            }

            const hostname = window.location.hostname;
            const textEditPrefix = `${hostname}_text_edit_`;
            const textRefPrefix = `${hostname}_text_ref_`;

            // Get all Chrome storage keys
            chrome.storage.local.get(null, (result) => {
                const textEditKeys = Object.keys(result).filter(key => key.startsWith(textEditPrefix));

                if (textEditKeys.length === 0) {
                    return;
                }

                // Check if we have old format IDs (with text content) and clear them
                const hasOldFormat = textEditKeys.some(key => {
                    const elementId = key.replace(textEditPrefix, '');
                    // Old format includes text content in the ID
                    return elementId.includes('_Inspecta_Chrome_extension_lets_') || elementId.includes('_Find_and_fix_UI_bugs_');
                });

                if (hasOldFormat) {
                    const keysToRemove = [];
                    textEditKeys.forEach(key => {
                        const elementId = key.replace(textEditPrefix, '');
                        keysToRemove.push(key);
                        keysToRemove.push(`${textRefPrefix}${elementId}`);
                    });
                    chrome.storage.local.remove(keysToRemove);
                    return;
                }

                let restoredCount = 0;
                for (const key of textEditKeys) {
                    const text = result[key];
                    if (text) {
                        const elementId = key.replace(textEditPrefix, '');
                        const referenceKey = `${textRefPrefix}${elementId}`;
                        const referenceData = result[referenceKey];
                        console.log('TextEditor: Processing key:', key, 'text:', text, 'referenceData:', referenceData);


                        if (referenceData) {
                            try {
                                const ref = JSON.parse(referenceData);

                                // Check if this is the element we just reset
                                if (this.currentTextElement) {
                                    const currentElementId = this.getElementId(this.currentTextElement);
                                    const keyElementId = key.replace(textEditPrefix, '');
                                    if (currentElementId === keyElementId) {
                                        continue;
                                    }
                                }

                                const restored = this.restoreElementByReference(ref, text);
                                if (restored) {
                                    restoredCount++;
                                }
                            } catch (parseError) {
                                console.warn('Failed to parse reference data:', parseError);
                            }
                        } else {
                            // Fallback method
                            const elementInfo = this.parseElementKeyFromStorage(key);
                            if (elementInfo) {
                                const restored = this.restoreElementTextDirectly(elementInfo, text);
                                if (restored) {
                                    restoredCount++;
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.warn('Failed to restore text changes:', error);
        }
    }

    parseElementKeyFromStorage(key) {
        const hostname = window.location.hostname;
        const parts = key.replace(`${hostname}_text_edit_`, '').split('_');
        if (parts.length < 4) return null;

        return {
            tagName: parts[0],
            parentId: parts[1],
            index: parseInt(parts[2]) || 0,
            originalText: parts.slice(3).join('_').replace(/_/g, ' ')
        };
    }

    restoreElementTextDirectly(elementInfo, text) {
        try {
            // Strategy 1: Find by tag name and original text
            if (elementInfo.tagName && elementInfo.originalText) {
                const elements = document.querySelectorAll(elementInfo.tagName);
                for (let el of elements) {
                    if (el.children.length === 0 && el.textContent &&
                        el.textContent.trim() === elementInfo.originalText.trim()) {
                        el.textContent = text;
                        return true;
                    }
                }
            }

            // Strategy 2: Find by partial text match
            if (elementInfo.originalText) {
                const allElements = document.querySelectorAll('*');
                for (let el of allElements) {
                    if (el.children.length === 0 && el.textContent &&
                        el.textContent.trim() === elementInfo.originalText.trim()) {
                        el.textContent = text;
                        return true;
                    }
                }
            }

            return false;
        } catch (error) {
            console.warn('Failed to restore element text directly:', error);
            return false;
        }
    }

    restoreElementByReference(ref, text) {
        try {
            // Strategy 1: Find by tag name and original text content
            if (ref.tagName && ref.textContent) {
                const elements = document.querySelectorAll(ref.tagName.toLowerCase());
                for (let el of elements) {
                    if (el.children.length === 0 && el.textContent &&
                        el.textContent.trim() === ref.textContent.trim()) {
                        // Ensure data-original-text is set to the true original text
                        if (!el.getAttribute('data-original-text')) {
                            el.setAttribute('data-original-text', ref.textContent);
                        }
                        el.textContent = text;
                        return true;
                    }
                }
            }

            // Strategy 2: Find by parent and index
            if (ref.parentId && ref.index !== undefined) {
                const sanitizedParentId = this.sanitizeSelector(ref.parentId);
                const parent = document.getElementById(sanitizedParentId) ||
                    document.querySelector(`.${sanitizedParentId.replace(/\s+/g, '.')}`) ||
                    document.querySelector(sanitizedParentId);
                if (parent && parent.children[ref.index]) {
                    const targetElement = parent.children[ref.index];
                    if (targetElement.children.length === 0) {
                        // Ensure data-original-text is set to the true original text
                        if (!targetElement.getAttribute('data-original-text')) {
                            targetElement.setAttribute('data-original-text', ref.textContent);
                        }
                        targetElement.textContent = text;
                        return true;
                    }
                }
            }

            // Strategy 3: Find by text content only (fallback)
            if (ref.textContent) {
                const allElements = document.querySelectorAll('*');
                for (let el of allElements) {
                    if (el.children.length === 0 && el.textContent &&
                        el.textContent.trim() === ref.textContent.trim()) {
                        // Ensure data-original-text is set to the true original text
                        if (!el.getAttribute('data-original-text')) {
                            el.setAttribute('data-original-text', ref.textContent);
                        }
                        el.textContent = text;
                        return true;
                    }
                }
            }
            return false;
        } catch (error) {
            console.warn('Failed to restore element by reference:', error);
            return false;
        }
    }

    // Generate text change prompt for AI
    generateTextPrompt() {
        if (!this.currentTextElement) {
            if (window.showToast) {
                window.showToast('No text element selected', 2000);
            }
            return null;
        }

        const originalText = this.currentTextElement.getAttribute('data-original-text') || this.originalText;
        const newText = this.textEditTextarea.value;

        if (!originalText || !newText) {
            if (window.showToast) {
                window.showToast('No text changes to generate prompt for', 2000);
            }
            return null;
        }

        // Get element context
        const tagName = this.currentTextElement.tagName.toLowerCase();
        const elementId = this.currentTextElement.id || '';
        const elementClasses = this.currentTextElement.className || '';

        // Generate structured prompt similar to CSS changes
        const prompt = {
            "type": "text_content_change",
            "element": {
                "tag": tagName,
                "id": elementId,
                "classes": elementClasses,
                "selector": this.generateElementSelector(this.currentTextElement)
            },
            "changes": {
                "original_text": originalText,
                "new_text": newText
            },
            "context": {
                "detect_project_type": true,
                "allow_file_creation": false,
                "ignore_breakpoints": true
            },
            "instructions": [
                "Update the text content for the specified element",
                "Maintain the same HTML structure and attributes",
                "Ensure the new text fits the design context and doesn't break the layout"
            ]
        };

        return JSON.stringify(prompt, null, 2);
    }

    // Generate CSS selector for the element
    generateElementSelector(element) {
        if (element.id) {
            return `#${element.id}`;
        }

        const tagName = element.tagName.toLowerCase();
        const classes = element.className.split(' ').filter(cls => cls.trim()).join('.');

        if (classes) {
            return `${tagName}.${classes}`;
        }

        return tagName;
    }

    // Copy text prompt to clipboard
    copyTextPrompt() {
        const prompt = this.generateTextPrompt();
        if (!prompt) return;

        navigator.clipboard.writeText(prompt).then(() => {
            if (window.showToast) {
                window.showToast('📋 Text prompt copied to clipboard', 2000);
            }
        }).catch(err => {
            console.error('Failed to copy prompt:', err);
            if (window.showToast) {
                window.showToast('❌ Failed to copy prompt', 2000);
            }
        });
    }

    // Send text prompt to Cursor
    sendTextToCursor() {
        const prompt = this.generateTextPrompt();
        if (!prompt) return;

        // Check if we're on localhost - validate hostname first
        if (!window.location || !window.location.hostname) {
            if (window.showToast) {
                window.showToast('Unable to determine hostname', 3000);
            }
            return;
        }

        const hostname = window.location.hostname.toLowerCase();
        const isLocal = hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname === '';

        if (!isLocal) {
            if (window.showToast) {
                window.showToast('Send to Cursor only works on localhost', 3000);
            }
            return;
        }

        try {
            const cursorData = {
                type: 'text_change',
                prompt: prompt,
                element: {
                    tag: this.currentTextElement.tagName.toLowerCase(),
                    id: this.currentTextElement.id || '',
                    classes: this.currentTextElement.className || ''
                },
                changes: {
                    original: this.currentTextElement.getAttribute('data-original-text') || this.originalText,
                    new: this.textEditTextarea.value
                }
            };

            // Use the existing sendToCursorExtension function from cssgenerator.js
            if (typeof window.sendToCursorExtension === 'function') {
                window.sendToCursorExtension(cursorData);
                if (window.showToast) {
                    window.showToast('🚀 Text change sent to Cursor', 2000);
                }
            } else {
                if (window.showToast) {
                    window.showToast('❌ Send to Cursor not available', 2000);
                }
            }
        } catch (error) {
            console.error('Error sending text to Cursor:', error);
            if (window.showToast) {
                window.showToast('❌ Error sending to Cursor', 2000);
            }
        }
    }
}

// Text editor will be initialized by main.js when needed