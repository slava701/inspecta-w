/**
 * Settings Menu Handler
 * Manages the settings popover with specific Inspecta functionality
 */

class SettingsManager {
    constructor() {
        this.settingsMenu = null;
        this.settingsButton = null;
        this.settingsCloseButton = null;
        this.isVisible = false;
        this.spacingOverlaysEnabled = false;
        this.currentTheme = 'light';
        this.init();
    }

    init() {
        // Wait for shadow DOM to be ready
        if (typeof shadow !== 'undefined' && shadow) {
            this.initializeElements();
            this.registerEvents();
            this.loadSpacingOverlaysState();
            this.loadCurrentTheme();
        } else {
            // Retry if shadow DOM is not ready yet
            setTimeout(() => this.init(), 100);
        }
    }

    initializeElements() {
        this.settingsMenu = shadow.querySelector('#settings_menu');
        this.settingsButton = shadow.querySelector('#btn_settings');
        this.settingsCloseButton = shadow.querySelector('#btn_settings_close');
    }

    registerEvents() {
        if (this.settingsButton) {
            this.settingsButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleSettings();
            });
        }

        if (this.settingsCloseButton) {
            this.settingsCloseButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.hideSettings();
            });
        }

        // Close settings when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isVisible && !this.settingsMenu.contains(e.target) && !this.settingsButton.contains(e.target)) {
                this.hideSettings();
            }
        });

        // Register menu item events
        this.registerMenuItemEvents();
    }

    registerMenuItemEvents() {
        // Clear Inspecta Changes
        const clearChangesBtn = shadow.querySelector('#btn_clear_inspecta_changes');
        if (clearChangesBtn) {
            clearChangesBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.clearInspectaChanges();
            });
        }

        // Toggle Spacing Overlays
        const spacingOverlaysBtn = shadow.querySelector('#btn_toggle_spacing_overlays');
        const spacingOverlaysToggle = shadow.querySelector('#setting_spacing_overlays');
        if (spacingOverlaysBtn && spacingOverlaysToggle) {
            spacingOverlaysBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                spacingOverlaysToggle.checked = !spacingOverlaysToggle.checked;
                this.toggleSpacingOverlays(spacingOverlaysToggle.checked);
            });

            spacingOverlaysToggle.addEventListener('change', (e) => {
                this.toggleSpacingOverlays(e.target.checked);
            });
        }

        // Download Figma Plugin
        const downloadFigmaBtn = shadow.querySelector('#btn_download_figma_plugin');
        if (downloadFigmaBtn) {
            downloadFigmaBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.downloadFigmaPlugin();
            });
        }

        // Theme Toggle
        const themeLightBtn = shadow.querySelector('#theme_light');
        const themeDarkBtn = shadow.querySelector('#theme_dark');
        if (themeLightBtn && themeDarkBtn) {
            themeLightBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.setTheme('light');
            });

            themeDarkBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.setTheme('dark');
            });
        }

        // Report Bug (placeholder)
        const reportBugBtn = shadow.querySelector('#btn_report_bug');
        if (reportBugBtn) {
            reportBugBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.reportBug();
            });
        }

        // Send Feedback (placeholder)
        const sendFeedbackBtn = shadow.querySelector('#btn_send_feedback');
        if (sendFeedbackBtn) {
            sendFeedbackBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.sendFeedback();
            });
        }
    }

    toggleSettings() {
        if (this.isVisible) {
            this.hideSettings();
        } else {
            this.showSettings();
        }
    }

    showSettings() {
        if (this.settingsMenu) {
            this.settingsMenu.style.display = 'block';
            // Trigger reflow to ensure display change is applied
            this.settingsMenu.offsetHeight;
            this.settingsMenu.classList.add('show');
            this.isVisible = true;
        }
    }

    hideSettings() {
        if (this.settingsMenu) {
            this.settingsMenu.classList.remove('show');
            setTimeout(() => {
                if (this.settingsMenu) {
                    this.settingsMenu.style.display = 'none';
                }
            }, 200); // Match CSS transition duration
            this.isVisible = false;
        }
    }

    clearInspectaChanges() {
        // Show custom confirmation dialog
        this.showConfirmationDialog(
            'Clear Inspecta Changes',
            'Are you sure you want to clear all Inspecta changes? This will remove all saved CSS changes and images from local storage.',
            () => {
                this.executeClearChanges();
            }
        );
    }

    executeClearChanges() {
        try {
            // Specific Inspecta localStorage keys to clear
            const inspectaKeys = [
                'globalColorChanges',
                'inspecta_color_changes',
                'inspecta_spacing_overlays',
                'inspecta_theme',
                'RulersGuides'
            ];

            // Remove specific Inspecta localStorage items
            inspectaKeys.forEach(key => {
                localStorage.removeItem(key);
            });

            // Get all localStorage keys and filter for Inspecta-related ones
            const allKeys = Object.keys(localStorage);
            const additionalInspectaKeys = allKeys.filter(key =>
                key.startsWith('inspecta_') ||
                key.startsWith('inspecta-') ||
                key.includes('inspecta') ||
                key.startsWith('css_') ||
                key.startsWith('image_') ||
                key.startsWith('overlay_') ||
                key.startsWith('changes_') ||
                key.includes('text_') ||
                key.includes('reference_')
            );

            // Remove additional Inspecta-related localStorage items
            additionalInspectaKeys.forEach(key => {
                localStorage.removeItem(key);
            });

            // Clear any Inspecta-related sessionStorage
            const sessionKeys = Object.keys(sessionStorage);
            const inspectaSessionKeys = sessionKeys.filter(key =>
                key.startsWith('inspecta_') ||
                key.startsWith('inspecta-') ||
                key.includes('inspecta')
            );

            inspectaSessionKeys.forEach(key => {
                sessionStorage.removeItem(key);
            });

            // Clear any global variables that might hold changes
            if (typeof window.globalColorChanges !== 'undefined') {
                window.globalColorChanges = [];
            }

            // Clear Chrome storage (where CSS, text, and image changes are stored)
            const hostname = window.location.hostname;

            // Get all Chrome storage keys and filter for this hostname
            chrome.storage.local.get(null, (result) => {
                const allKeys = Object.keys(result);
                const hostnameKeys = allKeys.filter(key =>
                    key.startsWith(hostname + '_') ||
                    key === hostname ||
                    key === 'showSetupGuide'
                );

                if (hostnameKeys.length > 0) {
                    chrome.storage.local.remove(hostnameKeys, function () {
                        console.log('Chrome storage cleared for keys:', hostnameKeys);
                    });
                }
            });

            // Also clear the global CSS rules object
            if (typeof window.cssRulesJson !== 'undefined') {
                window.cssRulesJson = {};
            }

            // Remove the Inspecta stylesheet to clear all applied CSS
            const inspectaStylesheet = document.getElementById('inspectaStylesheet');
            if (inspectaStylesheet) {
                inspectaStylesheet.remove();
            }

            this.showToast('All Inspecta changes cleared successfully');

            // Reload the page to reset the UI completely
            setTimeout(() => {
                window.location.reload();
            }, 1000);

        } catch (error) {
            console.error('Failed to clear Inspecta changes:', error);
            this.showToast('Failed to clear changes');
        }
    }

    showConfirmationDialog(title, message, onConfirm) {
        // Hide settings menu first
        this.hideSettings();

        // Create overlay with popup content (like setup popup)
        const overlay = document.createElement('div');
        overlay.className = 'popup-overlay';
        overlay.style.display = 'flex'; // Use flex like setup popup

        // Create popup content (inside the overlay)
        const popupContent = document.createElement('div');
        popupContent.className = 'confirmation-popup';
        popupContent.style.cssText = `
            background-color: var(--in-color-bg-1);
            border: 1px solid var(--in-color-mid-1);
            color: var(--in-color-text-1);
            border-radius: 16px;
            box-shadow: 0px 4px 8px 0px rgba(0, 0, 0, 0.15);
            width: 400px;
            max-width: 90vw;
            font-size: 11px;
            font-family: 'Inter', sans-serif;
            display: flex;
            flex-direction: column;
        `;

        // Create header
        const header = document.createElement('div');
        header.className = 'popup-header';
        header.innerHTML = `
            <div class="popup-title">${title}</div>
            <div class="popup-elements-count"></div>
        `;

        // Create content
        const content = document.createElement('div');
        content.className = 'popup-content';
        content.style.cssText = `
            padding: 16px;
            font-size: 11px;
            line-height: 1.4;
            color: var(--in-color-text-1);
        `;
        content.textContent = message;

        // Create footer with buttons
        const footer = document.createElement('div');
        footer.className = 'popup-footer';
        footer.innerHTML = `
            <button class="btn-popup btn-popup-secondary" id="confirm-cancel">Cancel</button>
            <button class="btn-popup btn-popup-primary" id="confirm-ok">OK</button>
        `;

        // Assemble popup content
        popupContent.appendChild(header);
        popupContent.appendChild(content);
        popupContent.appendChild(footer);

        // Add popup content inside the overlay
        overlay.appendChild(popupContent);
        shadow.appendChild(overlay);

        // Add event listeners
        const cancelBtn = popupContent.querySelector('#confirm-cancel');
        const okBtn = popupContent.querySelector('#confirm-ok');

        const cleanup = () => {
            overlay.style.display = 'none';
            shadow.removeChild(overlay);
        };

        cancelBtn.addEventListener('click', cleanup);
        okBtn.addEventListener('click', () => {
            cleanup();
            onConfirm();
        });

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                cleanup();
            }
        });

        // Close on Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                cleanup();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }

    toggleSpacingOverlays(enabled) {
        this.spacingOverlaysEnabled = enabled;

        // Save state to localStorage
        try {
            localStorage.setItem('inspecta_spacing_overlays', enabled.toString());
        } catch (error) {
            console.warn('Failed to save spacing overlays state:', error);
        }

        // Set global flag to control overlay creation
        window.inspectaSpacingOverlaysEnabled = enabled;

        if (enabled) {
            this.showToast('Spacing overlays enabled');
        } else {
            this.showToast('Spacing overlays disabled');
            // Remove any existing overlays when disabled
            this.hideAllSpacingOverlays();
        }
    }

    hideAllSpacingOverlays() {
        // Remove all margin, padding, and gap overlays
        document.querySelectorAll('.inspecta-margin-overlay, .inspecta-padding-overlay, .inspecta-gap-overlay').forEach(el => {
            el.remove();
        });
    }

    loadSpacingOverlaysState() {
        try {
            const saved = localStorage.getItem('inspecta_spacing_overlays');
            if (saved === 'true') {
                this.spacingOverlaysEnabled = true;
                window.inspectaSpacingOverlaysEnabled = true;
                const toggle = shadow.querySelector('#setting_spacing_overlays');
                if (toggle) {
                    toggle.checked = true;
                }
            } else {
                // Default to true (overlays enabled by default)
                this.spacingOverlaysEnabled = true;
                window.inspectaSpacingOverlaysEnabled = true;
                const toggle = shadow.querySelector('#setting_spacing_overlays');
                if (toggle) {
                    toggle.checked = true;
                }
            }
        } catch (error) {
            console.warn('Failed to load spacing overlays state:', error);
            // Default to true (overlays enabled by default)
            this.spacingOverlaysEnabled = true;
            window.inspectaSpacingOverlaysEnabled = true;
        }
    }

    downloadFigmaPlugin() {
        // Redirect to Figma plugin download page
        const figmaPluginUrl = 'https://www.figma.com/community/plugin/1397609843224212500/figma-to-inspecta-compare-design-to-web';
        window.open(figmaPluginUrl, '_blank');
        this.showToast('Opening Figma plugin page...');
    }

    setTheme(theme) {
        this.currentTheme = theme;

        // Save theme to localStorage
        try {
            localStorage.setItem('inspecta_theme', theme);
        } catch (error) {
            console.warn('Failed to save theme:', error);
        }

        // Apply theme to the app
        const app = shadow.querySelector('#inspecta_app');
        if (app) {
            app.setAttribute('data-theme', theme);
        }

        // Update theme toggle UI
        this.updateThemeToggleUI(theme);

        // Also update the existing theme buttons in bottom toolbar
        const btnThemeLight = shadow.querySelector('#btn_theme_light');
        const btnThemeDark = shadow.querySelector('#btn_theme_dark');

        if (btnThemeLight && btnThemeDark) {
            if (theme === 'light') {
                btnThemeLight.style.display = 'none';
                btnThemeDark.style.display = 'flex';
            } else {
                btnThemeLight.style.display = 'flex';
                btnThemeDark.style.display = 'none';
            }
        }

        this.showToast(`Theme changed to ${theme}`);
    }

    loadCurrentTheme() {
        try {
            const saved = localStorage.getItem('inspecta_theme');
            if (saved) {
                this.currentTheme = saved;
                this.updateThemeToggleUI(saved);
            }
        } catch (error) {
            console.warn('Failed to load theme:', error);
        }
    }

    updateThemeToggleUI(theme) {
        const themeLightBtn = shadow.querySelector('#theme_light');
        const themeDarkBtn = shadow.querySelector('#theme_dark');

        if (themeLightBtn && themeDarkBtn) {
            // Remove active class from both
            themeLightBtn.classList.remove('active');
            themeDarkBtn.classList.remove('active');

            // Add active class to current theme
            if (theme === 'light') {
                themeLightBtn.classList.add('active');
            } else {
                themeDarkBtn.classList.add('active');
            }
        }
    }

    reportBug() {
        // Placeholder for bug reporting functionality
        this.showToast('Bug reporting feature coming soon');
    }

    sendFeedback() {
        // Placeholder for feedback functionality
        this.showToast('Feedback feature coming soon');
    }

    showToast(message) {
        // Create a simple toast notification
        const toast = document.createElement('div');
        toast.className = 'inspecta-toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        // Show toast
        setTimeout(() => toast.classList.add('show'), 10);

        // Hide toast after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 250);
        }, 3000);
    }
}

// Initialize settings manager when DOM is ready
let settingsManager;

function initSettings() {
    if (!settingsManager) {
        settingsManager = new SettingsManager();
        // Export for global access after creation
        window.settingsManager = settingsManager;
    }
}

// Auto-initialize when shadow DOM is ready
function waitForShadowDOM() {
    if (typeof shadow !== 'undefined' && shadow && shadow.querySelector('#btn_settings')) {
        initSettings();
    } else {
        setTimeout(waitForShadowDOM, 100);
    }
}

waitForShadowDOM();
