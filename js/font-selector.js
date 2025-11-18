// Font Selector Component
class FontSelector {
    constructor(container, options = {}) {
        // Accept either container ID (string) or container element
        this.container = typeof container === 'string' ? document.getElementById(container) : container;

        if (!this.container) {
            throw new Error('FontSelector: Container element not found');
        }

        this.options = {
            placeholder: 'Select font...',
            searchPlaceholder: 'Search fonts...',
            maxResults: 100, // Increased from 50 to 100
            onFontSelect: null,
            ...options
        };

        this.isOpen = false;
        this.selectedFont = null;
        this.searchResults = [];
        this.init();
    }

    init() {
        this.createFontSelector();
        this.bindEvents();
        this.loadPopularFonts();
    }

    createFontSelector() {
        // Create the main container
        this.container.innerHTML = `
            <div class="font-selector-container">
                <div class="font-selector-display" id="font-selector-display">
                    <div class="font-selector-text" id="font-selector-text">${this.options.placeholder}</div>
                    <svg class="icon-16 icon-fill font-selector-arrow">
                        <use href="#ic_dd"></use>
                    </svg>
                </div>
                <div class="font-selector-dropdown" id="font-selector-dropdown" style="display: none;">
                    <div class="font-selector-results" id="font-selector-results">
                        <div class="font-selector-loading">Loading fonts...</div>
                    </div>
                </div>
            </div>
        `;

        // Get references to elements within the container
        this.displayElement = this.container.querySelector('#font-selector-display');
        this.dropdownElement = this.container.querySelector('#font-selector-dropdown');
        this.resultsContainer = this.container.querySelector('#font-selector-results');
        this.textElement = this.container.querySelector('#font-selector-text');
    }

    bindEvents() {
        // Toggle dropdown
        this.displayElement.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown();
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.closeDropdown();
            }
        });
    }

    async loadPopularFonts() {
        if (!window.googleFontsManager) {
            console.error('Google Fonts Manager not available');
            return;
        }

        try {
            // Load popular fonts
            const popularFonts = window.googleFontsManager.fonts.slice(0, this.options.maxResults);
            this.renderFontList(popularFonts);
        } catch (error) {
            console.error('Failed to load popular fonts:', error);
            this.renderFontList(window.googleFontsManager.getFallbackFonts());
        }
    }



    renderFontList(fonts) {
        if (!fonts || fonts.length === 0) {
            this.resultsContainer.innerHTML = '<div class="font-selector-no-results">No fonts found</div>';
            return;
        }

        const fontItems = fonts.map(font => {
            // Always use Inter font for consistent display, regardless of the actual font
            const fontStyle = 'font-family: "Inter", sans-serif;';

            return `
                <div class="font-selector-item" data-font-family="${font.family}">
                    <div class="font-selector-item-preview" style="${fontStyle}">
                        ${font.family}
                    </div>
                </div>
            `;
        }).join('');

        this.resultsContainer.innerHTML = fontItems;

        // Add click handlers to font items
        this.resultsContainer.querySelectorAll('.font-selector-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const fontFamily = item.dataset.fontFamily;
                this.selectFont(fontFamily);
            });
        });

        // Font previews are now consistently displayed in Inter font
    }


    async selectFont(fontFamily) {
        // Clean the font family name for display
        const cleanFontFamily = fontFamily.replace(/^["']|["']$/g, '').trim();

        // Always update the selected font and display text, even if it's the same font
        this.selectedFont = cleanFontFamily;
        this.textElement.textContent = cleanFontFamily;

        // Load the font if not already loaded
        if (window.googleFontsManager) {
            try {
                await window.googleFontsManager.loadFont(cleanFontFamily);
                // Keep the default font for display (don't apply the selected font)
                this.textElement.style.fontFamily = 'Inter, sans-serif';
            } catch (error) {
                console.warn(`Failed to load font "${cleanFontFamily}":`, error);
                // Keep the default font for display
                this.textElement.style.fontFamily = 'Inter, sans-serif';
            }
        } else {
            // Keep the default font for display
            this.textElement.style.fontFamily = 'Inter, sans-serif';
        }

        this.closeDropdown();

        // Always call the callback, even if the same font is selected
        if (this.options.onFontSelect) {
            this.options.onFontSelect(cleanFontFamily);
        }
    }

    toggleDropdown() {
        if (this.isOpen) {
            this.closeDropdown();
        } else {
            this.openDropdown();
        }
    }

    openDropdown() {
        this.isOpen = true;
        this.dropdownElement.style.display = 'block';

        // Add active class
        this.displayElement.classList.add('font-selector-active');

        // Preload fonts for better performance
        this.preloadFonts();
    }

    async preloadFonts() {
        if (!window.googleFontsManager) return;

        try {
            // Get the fonts that will be displayed
            const popularFonts = window.googleFontsManager.fonts.slice(0, this.options.maxResults);

            // Preload the first 10 fonts to prevent "font not found" alerts
            const fontsToPreload = popularFonts.slice(0, 10);

            // Load fonts in parallel
            await Promise.allSettled(
                fontsToPreload.map(font =>
                    window.googleFontsManager.loadFont(font.family)
                )
            );
        } catch (error) {
            console.error('Error preloading fonts:', error);
        }
    }

    closeDropdown() {
        this.isOpen = false;
        this.dropdownElement.style.display = 'none';

        // Remove active class
        this.displayElement.classList.remove('font-selector-active');
    }



    setValue(fontFamily) {
        // Clean the font family name before setting
        const cleanFontFamily = fontFamily.replace(/^["']|["']$/g, '').trim();

        // Update the display without triggering the callback
        this.selectedFont = cleanFontFamily;
        this.textElement.textContent = cleanFontFamily;

        // Load the font if not already loaded (without triggering callback)
        if (window.googleFontsManager) {
            window.googleFontsManager.loadFont(cleanFontFamily).catch(error => {
                console.warn(`Failed to load font "${cleanFontFamily}":`, error);
            });
        }

        // Keep the default font for display
        this.textElement.style.fontFamily = 'Inter, sans-serif';
    }

    getValue() {
        return this.selectedFont;
    }

    destroy() {
        // Clean up event listeners
        this.displayElement.removeEventListener('click', this.toggleDropdown);
        document.removeEventListener('click', this.closeDropdown);
    }
}
