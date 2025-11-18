'use strict';

class ImageEditor {
    constructor() {
        this.currentImageElement = null;
        this.originalImageSrc = '';
        this.imagePanel = null;
        this.imagePreview = null;
        this.deleteButton = null;
        this.uploadButton = null;
        this.pasteButton = null;
        this.downloadButton = null;
        this.uploadInput = null;
        this.isStoreImages = true;

        this.init();
    }

    init() {
        if (window.shadow) {
            this.setupElements();
            this.setupEventListeners();
        } else {
            console.log('ImageEditor: Shadow DOM not ready, will initialize when available');
        }
    }

    setupElements() {
        if (!this.validateGlobalVariables()) {
            return;
        }

        const shadow = window.shadow;
        if (!shadow) {
            console.warn('ImageEditor: Shadow DOM not available');
            return;
        }

        this.imagePanel = shadow.getElementById('selected_img');
        this.imagePreview = shadow.getElementById('img_preview');
        this.deleteButton = shadow.getElementById('in_img_delete');
        this.uploadButton = shadow.getElementById('in_img_upload');
        this.pasteButton = shadow.getElementById('in_img_paste');
        this.downloadButton = shadow.getElementById('in_img_download');

        if (!this.imagePanel) {
            console.warn('ImageEditor: Image panel not found in shadow DOM');
            return;
        }

        // Create upload input if it doesn't exist
        this.uploadInput = shadow.getElementById('img_upload_input');
        if (!this.uploadInput) {
            this.uploadInput = document.createElement('input');
            this.uploadInput.type = 'file';
            this.uploadInput.accept = 'image/*';
            this.uploadInput.id = 'img_upload_input';
            this.uploadInput.style.display = 'none';
            shadow.appendChild(this.uploadInput);
        }
    }

    validateGlobalVariables() {
        if (typeof window.shadow === 'undefined') {
            console.warn('ImageEditor: window.shadow not available');
            return false;
        }
        return true;
    }

    setupEventListeners() {
        // Upload button
        if (this.uploadButton) {
            this.uploadButton.addEventListener('click', () => {
                this.uploadInput.value = '';
                this.uploadInput.click();
            });
        }

        // Upload input
        if (this.uploadInput) {
            this.uploadInput.addEventListener('change', (e) => {
                this.handleImageUpload(e);
            });
        }

        // Paste button
        if (this.pasteButton) {
            this.pasteButton.addEventListener('click', () => {
                this.handleImagePaste();
            });
        }

        // Delete button
        if (this.deleteButton) {
            this.deleteButton.addEventListener('click', () => {
                if (window.target && window.target.nodeName && window.target.nodeName.toLowerCase() === 'img') {
                    this.deleteImageAndRestoreOriginal(window.target);
                }
            });
        }

        // Download button
        if (this.downloadButton) {
            this.downloadButton.addEventListener('click', () => {
                this.handleImageDownload();
            });
        }

        // Object-fit select handler
        const objectFitSelect = this.getRoot().querySelector('#in_object_fit_select');
        if (objectFitSelect) {
            objectFitSelect.addEventListener('change', (e) => {
                if (window.target && window.target.nodeName && window.target.nodeName.toLowerCase() === 'img') {
                    if (e.target.value === 'auto') {
                        // Remove inline object-fit style to use webpage's default
                        window.target.style.objectFit = '';
                        if (typeof generateInspectaCss === 'function') {
                            generateInspectaCss('objectFit', 'auto');
                        }
                    } else if (e.target.value) {
                        // Apply the selected object-fit value
                        window.target.style.objectFit = e.target.value;
                        if (typeof generateInspectaCss === 'function') {
                            generateInspectaCss('objectFit', e.target.value);
                        }
                    }
                }
            });
        }
    }

    // Image storage functions
    saveImageToStorage(imgElement, newSrc, newAlt) {
        try {
            // Only save if storage is enabled
            if (!this.isStoreImages) {
                return;
            }

            // Get the original src (before any modifications)
            let originalSrc = imgElement.getAttribute('data-original-src');
            if (!originalSrc) {
                // If no original src stored, use current src as original
                originalSrc = imgElement.src;
                imgElement.setAttribute('data-original-src', originalSrc);
            }

            // Create a unique key for this image based on its original src
            const hostname = window.location.hostname;
            const imgKey = `${hostname}_img_${btoa(originalSrc).replace(/[^a-zA-Z0-9]/g, '')}`;

            // Store the updated image data
            const imageData = {
                src: newSrc,
                alt: newAlt,
                timestamp: Date.now(),
                originalSrc: originalSrc
            };

            const dataToSave = {
                [imgKey]: JSON.stringify(imageData)
            };

            chrome.storage.local.set(dataToSave, function () {
                if (chrome.runtime.lastError) {
                    console.warn('Failed to save image to Chrome storage:', chrome.runtime.lastError);
                } else {
                    console.log('Image saved to Chrome storage:', imgKey, 'Original:', originalSrc, 'New:', newSrc);
                }
            });

            // Mark this image as having been updated
            imgElement.setAttribute('data-inspecta-updated', 'true');
        } catch (error) {
            console.error('Failed to save image to storage:', error);
        }
    }

    restoreImagesFromStorage() {
        try {

            // Only restore if Inspecta is active
            if (!window.inspectaIsActive) {
                console.log('ImageEditor: Inspecta not active, resetting all images to original');
                this.resetAllImagesToOriginal();
                return;
            }

            const images = document.querySelectorAll('img');

            let restoredCount = 0;
            images.forEach(img => {
                // First, ensure we have the original src stored
                let originalSrc = img.getAttribute('data-original-src');
                if (!originalSrc) {
                    originalSrc = img.src;
                    img.setAttribute('data-original-src', originalSrc);
                }

                const hostname = window.location.hostname;
                const imgKey = `${hostname}_img_${btoa(originalSrc).replace(/[^a-zA-Z0-9]/g, '')}`;

                // Use Chrome storage API
                chrome.storage.local.get([imgKey], (result) => {
                    const storedData = result[imgKey];
                    if (storedData) {
                        const imageData = JSON.parse(storedData);
                        img.src = imageData.src;
                        img.alt = imageData.alt;
                        img.setAttribute('data-inspecta-updated', 'true');
                        img.setAttribute('data-original-src', imageData.originalSrc);
                        // Clear srcset to ensure src takes precedence
                        img.removeAttribute('srcset');
                        restoredCount++;
                        console.log('ImageEditor: Image restored from storage:', imgKey, 'Original:', imageData.originalSrc, 'Restored:', imageData.src);
                    }
                });
            });

        } catch (error) {
            console.error('ImageEditor: Failed to restore images from storage:', error);
        }
    }

    restoreImageFromStorage(imgElement) {
        try {
            // Only restore if Inspecta is active
            if (!window.inspectaIsActive) {
                this.resetImageToOriginal(imgElement);
                return;
            }

            // First, ensure we have the original src stored
            let originalSrc = imgElement.getAttribute('data-original-src');
            if (!originalSrc) {
                originalSrc = imgElement.src;
                imgElement.setAttribute('data-original-src', originalSrc);
            }

            const hostname = window.location.hostname;
            const imgKey = `${hostname}_img_${btoa(originalSrc).replace(/[^a-zA-Z0-9]/g, '')}`;

            // Use Chrome storage API
            chrome.storage.local.get([imgKey], (result) => {
                const storedData = result[imgKey];
                if (storedData) {
                    const imageData = JSON.parse(storedData);
                    imgElement.src = imageData.src;
                    imgElement.alt = imageData.alt;
                    imgElement.setAttribute('data-inspecta-updated', 'true');
                    imgElement.setAttribute('data-original-src', imageData.originalSrc);
                    // Clear srcset to ensure src takes precedence
                    imgElement.removeAttribute('srcset');
                    console.log('Individual image restored from storage:', imgKey);
                }
            });
        } catch (error) {
            console.error('Failed to restore individual image from storage:', error);
        }
    }

    resetImageToOriginal(imgElement) {
        try {
            const originalSrc = imgElement.getAttribute('data-original-src');
            if (originalSrc) {
                imgElement.src = originalSrc;
                imgElement.removeAttribute('data-inspecta-updated');
                imgElement.removeAttribute('data-original-src');
            }
        } catch (error) {
            console.error('Failed to reset image to original:', error);
        }
    }

    resetAllImagesToOriginal() {
        try {
            const images = document.querySelectorAll('img[data-inspecta-updated="true"]');
            images.forEach(img => {
                this.resetImageToOriginal(img);
            });
            console.log('All images reset to original state');
        } catch (error) {
            console.error('Failed to reset all images to original:', error);
        }
    }

    clearImageStorage() {
        try {
            const hostname = window.location.hostname;
            const imgPrefix = `${hostname}_img_`;

            chrome.storage.local.get(null, (result) => {
                const keysToRemove = Object.keys(result).filter(key => key.startsWith(imgPrefix));

                if (keysToRemove.length > 0) {
                    chrome.storage.local.remove(keysToRemove, function () {
                        if (chrome.runtime.lastError) {
                            console.warn('Failed to clear image storage from Chrome storage:', chrome.runtime.lastError);
                        } else {
                            console.log('Image storage cleared from Chrome storage');
                        }
                    });
                }

                // Reset all images to their original state
                this.resetAllImagesToOriginal();
            });
        } catch (error) {
            console.error('Failed to clear image storage:', error);
        }
    }

    canDeleteImage(imgElement) {
        try {
            // Check if the image has been modified by Inspecta
            const hasOriginalSrc = imgElement.getAttribute('data-original-src');
            const isUpdated = imgElement.getAttribute('data-inspecta-updated') === 'true';

            // Can delete if there's an original src stored (meaning it was modified)
            return !!(hasOriginalSrc && isUpdated);
        } catch (error) {
            console.error('Failed to check if image can be deleted:', error);
            return false;
        }
    }

    updateDeleteButtonState(imgElement) {
        try {
            if (!this.deleteButton) return;

            const canDelete = this.canDeleteImage(imgElement);

            if (canDelete) {
                this.deleteButton.classList.remove('disabled');
                this.deleteButton.removeAttribute('disabled');
                this.deleteButton.style.opacity = '1';
                this.deleteButton.style.cursor = 'pointer';
            } else {
                this.deleteButton.classList.add('disabled');
                this.deleteButton.setAttribute('disabled', 'true');
                this.deleteButton.style.opacity = '0.5';
                this.deleteButton.style.cursor = 'not-allowed';
            }
        } catch (error) {
            console.error('Failed to update delete button state:', error);
        }
    }

    deleteImageAndRestoreOriginal(imgElement) {
        try {
            // Check if image can be deleted
            if (!this.canDeleteImage(imgElement)) {
                console.log('No image modifications to delete');
                return;
            }

            // Get the original src before any modifications
            const originalSrc = imgElement.getAttribute('data-original-src');

            if (originalSrc) {
                // Restore the original image
                imgElement.src = originalSrc;
                imgElement.removeAttribute('data-inspecta-updated');
                imgElement.removeAttribute('data-original-src');

                // Remove from Chrome storage
                const hostname = window.location.hostname;
                const imgKey = `${hostname}_img_${btoa(originalSrc).replace(/[^a-zA-Z0-9]/g, '')}`;
                chrome.storage.local.remove([imgKey], function () {
                    if (chrome.runtime.lastError) {
                        console.warn('Failed to remove image from Chrome storage:', chrome.runtime.lastError);
                    }
                });

                // Update the panel preview
                if (this.imagePreview) {
                    this.imagePreview.src = originalSrc;
                    this.imagePreview.alt = imgElement.alt || '';
                }

                // Update type/size info
                const typeValue = this.getRoot().querySelector('.img_info_item_value');
                if (typeValue) {
                    // Try to fetch the original image to get its info
                    fetch(originalSrc)
                        .then(res => res.blob())
                        .then(blob => {
                            const type = blob.type.split('/')[1] || 'unknown';
                            const size = `${Math.round(blob.size / 1024)}KB`;
                            typeValue.textContent = `${type}, ${size}`;
                        })
                        .catch(() => {
                            typeValue.textContent = 'unknown';
                        });
                }

                // Update delete button state after deletion
                this.updateDeleteButtonState(imgElement);

                console.log('Image restored to original and removed from storage:', originalSrc);
            } else {
                console.log('No original image found to restore');
            }
        } catch (error) {
            console.error('Failed to delete image and restore original:', error);
        }
    }

    // Event handlers
    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const url = e.target.result;
            // Update the selected image node in the DOM
            if (window.target && window.target.nodeName && window.target.nodeName.toLowerCase() === 'img') {
                window.target.setAttribute('src', url);
                window.target.setAttribute('alt', file.name);
                // Clear srcset to ensure src takes precedence
                window.target.removeAttribute('srcset');
                // Save to Chrome storage
                this.saveImageToStorage(window.target, url, file.name);
            }
            // Update the panel preview
            if (this.imagePreview) {
                this.imagePreview.src = url;
                this.imagePreview.alt = file.name;
                // Set error handler for preview
                this.imagePreview.onerror = function () {
                    this.onerror = null;
                    this.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150"><rect width="100%25" height="100%25" fill="#eee"/><text x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="#888" font-size="16">Not found</text></svg>';
                };
            }
            // Update type/size info
            const typeValue = this.getRoot().querySelector('.img_info_item_value');
            if (typeValue) {
                const size = `${Math.round(file.size / 1024)}KB`;
                const type = file.type.split('/')[1] || 'unknown';
                typeValue.textContent = `${type}, ${size}`;
            }
            // Show the panel if hidden
            if (this.imagePanel) {
                this.imagePanel.style.display = 'block';
            }
            // Update delete button state
            this.updateDeleteButtonState(window.target);
        };
        reader.readAsDataURL(file);
    }

    async handleImagePaste() {
        if (!(window.chrome && chrome.runtime && chrome.runtime.id)) return;

        try {
            const clipboardItems = await navigator.clipboard.read();
            for (const item of clipboardItems) {
                for (const type of item.types) {
                    // Handle raster images
                    if (type.startsWith('image/')) {
                        const blob = await item.getType(type);
                        const url = URL.createObjectURL(blob);
                        if (this.imagePreview) {
                            this.imagePreview.src = url;
                            this.imagePreview.alt = 'Pasted image';
                            // Set error handler for preview
                            this.imagePreview.onerror = function () {
                                this.onerror = null;
                                this.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150"><rect width="100%25" height="100%25" fill="#eee"/><text x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="#888" font-size="16">Not found</text></svg>';
                            };
                        }
                        const typeValue = this.getRoot().querySelector('.img_info_item_value');
                        if (typeValue) {
                            const size = `${Math.round(blob.size / 1024)}KB`;
                            typeValue.textContent = `${type.split('/')[1]}, ${size}`;
                        }
                        if (this.imagePanel) {
                            this.imagePanel.style.display = 'block';
                        }
                        // Update the image in the node itself
                        if (window.target && window.target.nodeName && window.target.nodeName.toLowerCase() === 'img') {
                            window.target.setAttribute('src', url);
                            window.target.setAttribute('alt', 'Pasted image');
                            // Clear srcset to ensure src takes precedence
                            window.target.removeAttribute('srcset');
                            // Save to Chrome storage
                            this.saveImageToStorage(window.target, url, 'Pasted image');
                        }
                        // Update delete button state
                        this.updateDeleteButtonState(window.target);
                        return;
                    }
                    // Handle SVGs (as HTML or SVG MIME)
                    else if (type === 'text/html' || type === 'image/svg+xml') {
                        const svgText = await item.getType(type).then(blob => blob.text());
                        const parser = new DOMParser();
                        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
                        const svgElement = svgDoc.querySelector('svg');

                        if (svgElement) {
                            const svgCode = svgElement.outerHTML;
                            const blob = new Blob([svgCode], { type: 'image/svg+xml' });
                            const url = URL.createObjectURL(blob);
                            if (this.imagePreview) {
                                this.imagePreview.src = url;
                                this.imagePreview.alt = 'Pasted SVG';
                                // Set error handler for preview
                                this.imagePreview.onerror = function () {
                                    this.onerror = null;
                                    this.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150"><rect width="100%25" height="100%25" fill="#eee"/><text x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="#888" font-size="16">Not found</text></svg>';
                                };
                            }
                            const typeValue = this.getRoot().querySelector('.img_info_item_value');
                            if (typeValue) {
                                const size = `${Math.round(blob.size / 1024)}KB`;
                                typeValue.textContent = `svg+xml, ${size}`;
                            }
                            if (this.imagePanel) {
                                this.imagePanel.style.display = 'block';
                            }
                            // Update the image in the node itself
                            if (window.target && window.target.nodeName && window.target.nodeName.toLowerCase() === 'img') {
                                window.target.setAttribute('src', url);
                                window.target.setAttribute('alt', 'Pasted SVG');
                                // Clear srcset to ensure src takes precedence
                                window.target.removeAttribute('srcset');
                                // Save to Chrome storage
                                this.saveImageToStorage(window.target, url, 'Pasted SVG');
                            }
                            // Update delete button state
                            this.updateDeleteButtonState(window.target);
                            return;
                        }
                    }
                }
            }
            showToast('No image or SVG found in clipboard!', 4000);
        } catch (err) {
            showToast('Failed to read image or SVG from clipboard.', 4000);
        }
    }

    handleImageDownload() {
        if (!this.imagePreview) return;

        fetch(this.imagePreview.src)
            .then(res => res.blob())
            .then(blob => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                let filename = (this.imagePreview.src.split('/').pop() || 'image.png').split('?')[0];
                if (!filename.includes('.')) filename += '.png';
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            });
    }

    // Panel management
    showImagePanel(imageElement) {
        if (!window.inspectaIsActive) return;

        // Hide both panels first
        if (this.imagePanel) this.imagePanel.style.display = 'none';
        const svgPanel = this.getRoot().querySelector('#selected_svg');
        if (svgPanel) svgPanel.style.display = 'none';

        if (imageElement && imageElement.nodeName && imageElement.nodeName.toLowerCase() === 'img') {
            window.target = imageElement;
            if (this.imagePanel) {
                this.imagePanel.style.display = 'block';
            }

            // Show pnl_img_values
            const pnlImgValues = this.getRoot().querySelector('#pnl_img_values');
            if (pnlImgValues) pnlImgValues.style.display = 'block';

            // Update preview and info
            this.updateImagePanelContent(imageElement);

            // Update delete button state
            this.updateDeleteButtonState(imageElement);
        }
    }

    updateImagePanelContent(imageElement) {
        if (!this.imagePreview) return;

        // Set object-fit - respect webpage's existing value, only set default if none exists
        const objectFitSelect = this.getRoot().querySelector('#in_object_fit_select');
        let objectFit = '';

        // Check inline style first
        if (imageElement.style && imageElement.style.objectFit) {
            objectFit = imageElement.style.objectFit;
        } else {
            // Check computed style (includes CSS rules)
            const computed = window.getComputedStyle(imageElement);
            objectFit = computed.objectFit;
        }

        // Only set default if no object-fit is defined
        if (!objectFit || objectFit === 'initial' || objectFit === 'unset') {
            // Set to "auto" to indicate we're using webpage's default behavior
            if (objectFitSelect) objectFitSelect.value = 'auto';
        } else {
            // Use the webpage's existing object-fit value
            if (objectFitSelect) objectFitSelect.value = objectFit;
        }

        // Update preview
        if (this.imagePreview) {
            this.imagePreview.src = imageElement.src;
            this.imagePreview.alt = imageElement.alt || '';
            this.imagePreview.onerror = function () {
                this.onerror = null;
                this.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150"><rect width="100%25" height="100%25" fill="#eee"/><text x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="#888" font-size="16">Not found</text></svg>';
            };
        }

        // Update type/size info
        const typeValue = this.getRoot().querySelector('.img_info_item_value');
        if (typeValue) {
            fetch(imageElement.src)
                .then(res => res.blob())
                .then(blob => {
                    const type = blob.type.split('/')[1] || 'unknown';
                    const size = `${Math.round(blob.size / 1024)}KB`;
                    typeValue.textContent = `${type}, ${size}`;
                })
                .catch(() => {
                    typeValue.textContent = 'unknown';
                });
        }
    }

    // Utility functions
    getRoot() {
        return (typeof shadow !== 'undefined' && shadow) ? shadow : document;
    }

    toggleStoreImages(isApplyChanges) {
        this.isStoreImages = isApplyChanges;
        window.isStoreImages = this.isStoreImages;
        if (this.isStoreImages) {
            // If enabling storage, restore all images
            this.restoreImagesFromStorage();
        } else {
            // If disabling storage, reset all images to original
            this.resetAllImagesToOriginal();
        }
    }

    // Make functions available globally for debugging
    exposeToGlobal() {
        // Set the global imageEditor reference
        window.imageEditor = this;

        window.inspectaImageStorage = {
            save: this.saveImageToStorage.bind(this),
            restore: this.restoreImagesFromStorage.bind(this),
            restoreSingle: this.restoreImageFromStorage.bind(this),
            resetAll: this.resetAllImagesToOriginal.bind(this),
            resetSingle: this.resetImageToOriginal.bind(this),
            clear: this.clearImageStorage.bind(this),
            toggle: this.toggleStoreImages.bind(this),
            deleteAndRestore: this.deleteImageAndRestoreOriginal.bind(this)
        };

        // Restore images from storage when ImageEditor is initialized
        setTimeout(() => {
            if (window.inspectaIsActive) {
                this.restoreImagesFromStorage();
            } else {
                console.log('ImageEditor: Inspecta not active, skipping image restoration');
            }
        }, 1000);
    }
}

// Initialize the image editor when the DOM is ready
let imageEditor;
if (typeof window !== 'undefined') {
    // Wait for shadow DOM to be available
    const initImageEditor = () => {
        if (window.shadow) {
            imageEditor = new ImageEditor();
            imageEditor.exposeToGlobal();
        } else {
            setTimeout(initImageEditor, 100);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initImageEditor);
    } else {
        initImageEditor();
    }
}
