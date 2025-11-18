// InspectaColorPicker Class - Wrapper for Iro.js color picker
class InspectaColorPicker {
    // Constants for better maintainability
    static MODES = {
        SOLID: 'solid',
        GRADIENT: 'gradient',
        IMAGE: 'image'
    };

    static SELECTORS = {
        SOLID_WRAPPER: '#solidPickerWrapper',
        GRADIENT_WRAPPER: '#gradientPickerWrapper',
        IMAGE_WRAPPER: '#imagePickerWrapper',
        SOLID_OPTION: '#solidOption',
        GRADIENT_OPTION: '#gradientOption',
        IMAGE_OPTION: '#imageOption',
        PAGE_COLORS_SECTION: '.page-colors-section'
    };
    destroy() {
        // Remove the color picker UI from the container
        if (this.container && this.container.firstChild) {
            this.container.innerHTML = '';
        }
        // Remove any event listeners attached to the container or document
        if (this._eventRemovers && Array.isArray(this._eventRemovers)) {
            this._eventRemovers.forEach(remove => {
                if (typeof remove === 'function') remove();
            });
            this._eventRemovers = [];
        }
        // Destroy iro.ColorPicker instance if it exists
        if (this.iroPicker && typeof this.iroPicker.off === 'function') {
            this.iroPicker.off('*');
        }
        this.iroPicker = null;
        this.isColorPickerShow = false;
        this.isDragging = false;
        this.stops = [];
        this.activeStopIdx = 0;
        this.activeStopId = null;
        this.dragStopId = null;
        this.isDraggingStop = false;
        this.floatingPickerStopIdx = null;
        // Remove any global event listeners (for drags, etc.)
        if (this._globalEventRemovers && Array.isArray(this._globalEventRemovers)) {
            this._globalEventRemovers.forEach(remove => {
                if (typeof remove === 'function') remove();
            });
            this._globalEventRemovers = [];
        }

        // Clean up theme observer
        this.removeThemeChangeListener();
    }

    setupThemeChangeListener() {
        // Create a MutationObserver to watch for theme changes
        this.themeObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
                    const newTheme = mutation.target.getAttribute('data-theme');
                    this.updateTheme(newTheme);
                }
            });
        });

        // Start observing the main app element for theme changes
        const mainApp = this.shadowRoot.querySelector('#inspecta_app');
        if (mainApp) {
            this.themeObserver.observe(mainApp, {
                attributes: true,
                attributeFilter: ['data-theme']
            });
        }
    }

    removeThemeChangeListener() {
        if (this.themeObserver) {
            this.themeObserver.disconnect();
            this.themeObserver = null;
        }
    }

    updateTheme(newTheme) {
        // Update the container's theme
        if (this.container) {
            this.container.setAttribute('data-theme', newTheme);
        }

        // Update the floating picker's theme
        if (this.floatingPicker) {
            this.floatingPicker.setAttribute('data-theme', newTheme);
        }

        // Update Iro.js border colors
        const borderColor = getComputedStyle(this.shadowRoot.host).getPropertyValue('--in-color-divider').trim() || '#ccc';

        if (this.colorPicker) {
            this.colorPicker.borderColor = borderColor;
        }
        if (this.hueSlider) {
            this.hueSlider.borderColor = borderColor;
        }
        if (this.alphaSlider) {
            this.alphaSlider.borderColor = borderColor;
        }
    }

    populatePageColors() {
        const pageColorsGrid = this.container.querySelector(`#pageColorsGrid_${this.containerId}`);
        if (!pageColorsGrid) return;

        // Clear existing colors
        pageColorsGrid.innerHTML = '';

        // Get page colors from the overview panel function
        let pageColors = [];
        if (typeof window.getPageColorPalette === 'function') {
            pageColors = window.getPageColorPalette();
        } else {
            // Fallback: try to get colors from the overview panel directly
            const overviewPanel = this.shadowRoot.querySelector('#colors-pallet-page-colors');
            if (overviewPanel) {
                const colorThumbnails = overviewPanel.querySelectorAll('.in-thumb-color');
                pageColors = Array.from(colorThumbnails).map(thumb => thumb.style.backgroundColor);
            }
        }

        // Create color thumbnails
        pageColors.forEach(color => {
            const thumbnail = document.createElement('div');
            thumbnail.className = 'page-color-thumbnail';
            thumbnail.style.backgroundColor = color;
            thumbnail.title = color;

            // Apply smart border based on contrast with picker background
            const pickerBackground = getComputedStyle(this.container).backgroundColor;
            applySwatchBorder(thumbnail, color, pickerBackground, 1.5);

            // Add click handler to select this color
            thumbnail.addEventListener('click', () => {
                this.setColor(color);
                if (this.onColorChange) {
                    this.onColorChange({
                        hexString: color,
                        alpha: 1
                    });
                }
            });

            pageColorsGrid.appendChild(thumbnail);
        });

        // Handle scrollbar visibility based on number of rows
        this.updatePageColorsScrollbar(pageColorsGrid, pageColors.length);
    }

    updatePageColorsScrollbar(pageColorsGrid, colorCount) {
        // Check if this is a Figma colors grid (has figma-colors-grid class)
        const isFigmaGrid = pageColorsGrid.classList.contains('figma-colors-grid');

        if (isFigmaGrid) {
            // For Figma colors, always allow scrolling if needed
            // The CSS already sets overflow-y: auto, so we don't need to override it
            return;
        }

        // For page colors grid (10 colors per row)
        const rows = Math.ceil(colorCount / 10);

        // Show scrollbar only if more than 3 rows
        // 3 rows = 3 * 16px (thumbnails) + 2 * 4px (gaps) = 48px + 8px = 56px
        if (rows > 3) {
            pageColorsGrid.style.overflowY = 'auto';
        } else {
            pageColorsGrid.style.overflowY = 'hidden';
        }
    }

    populatePageColorsForFloating(container) {
        const pageColorsGrid = container.querySelector(`#pageColorsGrid_floating_${this.containerId}`);
        if (!pageColorsGrid) return;

        // Clear existing colors
        pageColorsGrid.innerHTML = '';

        // Get page colors from the overview panel function
        const pageColors = typeof getPageColorPalette === 'function' ? getPageColorPalette() : [];
        const colorCount = pageColors.length;

        // Create color thumbnails
        pageColors.forEach((color, index) => {
            const thumbnail = document.createElement('div');
            thumbnail.className = 'page-color-thumbnail';
            thumbnail.style.backgroundColor = color;
            thumbnail.setAttribute('data-color', color);
            thumbnail.setAttribute('title', color);

            // Apply smart border based on contrast with picker background (same as main picker)
            const pickerBackground = getComputedStyle(container).backgroundColor;
            if (typeof applySwatchBorder === 'function') {
                applySwatchBorder(thumbnail, color, pickerBackground, 1.5);
            }

            // Add click handler to select color for floating picker
            thumbnail.addEventListener('click', () => {
                if (this.floatingColorPicker) {
                    this.floatingColorPicker.color.set(color);
                }
                // Update the stop color if this is for a gradient stop
                if (this.floatingPickerStopIdx !== null && this.stops[this.floatingPickerStopIdx]) {
                    this.stops[this.floatingPickerStopIdx].color = color;
                    this.stops[this.floatingPickerStopIdx].opacity = 1;
                    this.renderGradient();
                }
            });

            pageColorsGrid.appendChild(thumbnail);
        });

        // Update scrollbar if needed
        this.updatePageColorsScrollbar(pageColorsGrid, colorCount);
    }

    constructor(options) {
        this.shadowRoot = options.shadowRoot;
        // this.container = options.container;
        this.containerId = options.containerId;
        // Handle transparent initial color
        if (options.initialColor === 'transparent') {
            this.initialColor = '#ffffff'; // Use white as base color
            this.initialAlpha = 0; // Set alpha to 0 for transparent
        } else {
            this.initialColor = options.initialColor || '#ffffff';
            this.initialAlpha = 1; // Default alpha
        }
        this.onColorChange = options.onColorChange;
        this.onColorApply = options.onColorApply;
        this.onColorCancel = options.onColorCancel;
        this.isColorPickerShow = false;
        this.isDragging = false; // Add this line

        // Event control
        this.suppressColorChangeEvents = false;

        // Gradient picker state
        this.gradientType = 'linear';
        this.stops = [];
        this.nextStopId = 1;
        this.activeStopIdx = 0;
        this.activeStopId = null; // Track by ID instead of index
        this.dragStopId = null;
        this.isDraggingStop = false;
        this.linearDirection = 'to right';
        this.floatingPickerStopIdx = null;

        // Main picker drag state variables
        this.isDraggingMain = false;
        this.isDraggingFloating = false;
        this.dragState = {
            currentX: 0,
            currentY: 0,
            initialMouseX: 0,
            initialMouseY: 0
        };

        // console.log('Container element:', this.container);
        this.init();
    }

    /**
     * Helper method to trigger color change events consistently
     * @param {Object} data - The color data to pass to onColorChange
     */
    triggerColorChange(data) {
        if (!this.suppressColorChangeEvents && this.onColorChange) {
            this.onColorChange(data);
        }
    }



    /**
     * Switch to a specific picker mode
     * @param {string} mode - The mode to switch to (solid, gradient, image)
     */
    switchToMode(mode) {
        const modes = {
            [InspectaColorPicker.MODES.SOLID]: {
                wrapper: InspectaColorPicker.SELECTORS.SOLID_WRAPPER,
                option: InspectaColorPicker.SELECTORS.SOLID_OPTION,
                display: 'block'
            },
            [InspectaColorPicker.MODES.GRADIENT]: {
                wrapper: InspectaColorPicker.SELECTORS.GRADIENT_WRAPPER,
                option: InspectaColorPicker.SELECTORS.GRADIENT_OPTION,
                display: 'flex'
            },
            [InspectaColorPicker.MODES.IMAGE]: {
                wrapper: InspectaColorPicker.SELECTORS.IMAGE_WRAPPER,
                option: InspectaColorPicker.SELECTORS.IMAGE_OPTION,
                display: 'block'
            }
        };

        const targetMode = modes[mode];
        if (!targetMode) return;

        // Hide all wrappers
        Object.values(InspectaColorPicker.SELECTORS).forEach(selector => {
            if (selector.includes('Wrapper')) {
                const wrapper = this.container.querySelector(selector);
                if (wrapper) wrapper.style.display = 'none';
            }
        });

        // Show target wrapper
        const targetWrapper = this.container.querySelector(targetMode.wrapper);
        if (targetWrapper) targetWrapper.style.display = targetMode.display;

        // Update option styles
        Object.values(InspectaColorPicker.SELECTORS).forEach(selector => {
            if (selector.includes('Option')) {
                const option = this.container.querySelector(selector);
                if (option) option.classList.remove('active');
            }
        });

        const targetOption = this.container.querySelector(targetMode.option);
        if (targetOption) targetOption.classList.add('active');
    }

    init() {

        this.createTemplate();
        this.initIroPicker();
        this.setupEventHandlers();
        this.setupFormatInputs();
        this.initMainPickerDrag();

        // Set Custom tab as active by default
        const customTab = this.container.querySelector('#custom');
        if (customTab) {
            customTab.classList.add('active');
        }

        // Check if this picker is for font color, border color, or shadow color
        // These pickers should not show picker-options (solid/gradient toggle)
        const isFontColorPicker = this.containerId === 'in_font_color';
        const isBorderColorPicker = this.containerId === 'in_border_color';
        const isShadowColorPicker = this.containerId === 'in_bxsdc';

        // Hide picker options for font, border, and shadow color pickers
        if (isFontColorPicker || isBorderColorPicker || isShadowColorPicker) {
            const pickerOptions = this.container.querySelector('.picker-options');
            if (pickerOptions) {
                pickerOptions.style.display = 'none';
            }
        }

        // Check if initial color is a gradient and set appropriate mode
        if (this.initialColor && typeof this.initialColor === 'string' &&
            (this.initialColor.includes('linear-gradient') ||
                this.initialColor.includes('radial-gradient') ||
                this.initialColor.includes('conic-gradient'))) {
            this.showGradientPicker();
        } else {
            // Set solid picker as default
            this.showSolidPicker();
        }

        // Populate page colors
        this.populatePageColors();
    }

    createTemplate() {
        this.container = document.createElement('div');

        // Create the main picker structure with correct layout
        this.container.innerHTML = `
            <div class="picker-wrapper">
                <div class="picker-header">
                    <div class="picker-tabs">
                       <div id="custom" class="picker-tab">Custom</div>
                         <div id="picker-figma-colors" class="picker-tab">Figma</div>
                    </div>
                    <button class="picker-close-btn" aria-label="Close">
                        <svg width="16" height="16" viewBox="0 0 16 16">
                            <use href="#ic_close"></use>
                        </svg>
                    </button>
                </div>
                <div class="picker-options">
                    <button class="action-icon" id="solidOption" title="Solid Color">
                        <svg width="16" height="16" viewBox="0 0 16 16">
                            <rect x="2" y="2" width="12" height="12" rx="2" fill="currentColor"/>
                        </svg>
                    </button>
                    <button class="action-icon" id="gradientOption" title="Gradient">
                        <svg width="16" height="16" viewBox="0 0 16 16">
                            <rect x="2" y="2" width="12" height="12" rx="2" fill="currentColor" opacity="0.3"/>
                            <rect x="2" y="2" width="6" height="12" rx="2" fill="currentColor" opacity="0.7"/>
                            <rect x="2" y="2" width="3" height="12" rx="2" fill="currentColor" opacity="1"/>
                        </svg>
                    </button>
                    <button class="action-icon" id="imageOption" title="Background Image">
                        <svg width="12" height="12" viewBox="0 0 16 16">
                            <use href="#ic_img"></use>
                        </svg>
                    </button>
                </div>
                <div id="solidPickerWrapper">
                    <div id="colorPicker_${this.containerId}"></div>
                    <div class="color-sliders-wrapper">
                        <div class="eye-dropper-btn">
                            <svg width="20" height="20" viewBox="0 0 20 20">
                                <use href="#ic_eye_dropper"></use>
                            </svg>
                        </div>
                        <div class="sliders-wrapper">
                            <div id="hueSlider_${this.containerId}"></div>
                            <div id="alphaSlider_${this.containerId}"></div>
                        </div>
                    </div>
                    <div class="controls-wrapper">
                        <div class="format-picker">
                            <div class="select-wrapper">
                                <select id="formatSelect_${this.containerId}" class="format-dropdown">
                                    <option value="hex">HEX</option>
                                    <option value="rgb">RGB</option>
                                    <option value="hsl">HSL</option>
                                    <option value="hsv">HSV</option>
                                </select>
                                <svg class="icon-16 icon-fill select-arrow">
                                    <use href="#ic_dd"></use>
                                </svg>
                            </div>
                        </div>
                        <div class="color-inputs">
                            <div class="input-group" id="hexInputs_${this.containerId}">
                                <input type="text" id="colorInput_${this.containerId}" class="color-input" value="ff0000" placeholder="Color">
                            </div>
                            <div class="input-group" id="rgbInputs_${this.containerId}" style="display: none;">
                                <input type="text" id="rInput_${this.containerId}" class="color-input" value="255" placeholder="R">
                                <input type="text" id="gInput_${this.containerId}" class="color-input" value="0" placeholder="G">
                                <input type="text" id="bInput_${this.containerId}" class="color-input" value="0" placeholder="B">
                            </div>
                            <div class="input-group" id="hslInputs_${this.containerId}" style="display: none;">
                                <input type="text" id="hInput_${this.containerId}" class="color-input" value="0" placeholder="H">
                                <input type="text" id="sInput_${this.containerId}" class="color-input" value="100" placeholder="S">
                                <input type="text" id="lInput_${this.containerId}" class="color-input" value="50" placeholder="L">
                            </div>
                            <div class="input-group" id="hsvInputs_${this.containerId}" style="display: none;">
                                <input type="text" id="hvInput_${this.containerId}" class="color-input" value="0" placeholder="H">
                                <input type="text" id="svInput_${this.containerId}" class="color-input" value="100" placeholder="S">
                                <input type="text" id="vvInput_${this.containerId}" class="color-input" value="100" placeholder="V">
                            </div>
                                                <div class="input-group">
                        <div class="input-percent-group">
                            <input type="text" id="opacityInput_${this.containerId}" class="color-input" value="100" placeholder="Opacity">
                            <span class="input-percent-suffix">%</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Page Colors Section -->
        <div class="page-colors-section">
            <div class="page-colors-header">
                <span class="page-colors-title">Page colors</span>
            </div>
            <div class="page-colors-grid" id="pageColorsGrid_${this.containerId}">
                <!-- Page colors will be populated here -->
            </div>
        </div>
                <div id="gradientPickerWrapper" style="display: none;">
                    <div class="gradient-picker-header">
                        <div class="select-wrapper">
                            <select id="gradientType">
                                <option value="linear">Linear</option>
                                <option value="radial">Radial</option>
                            </select>
                            <svg class="icon-16 icon-fill select-arrow">
                                <use href="#ic_dd"></use>
                            </svg>
                        </div>
                        <div class="gradient-picker-header-actions">
                            <button id="reverseStopsBtn">
                                <svg width="16" height="16" viewBox="0 0 16 16">
                                    <use href="#ic_direction"></use>
                                </svg>
                            </button>
                            <button id="toggleDirectionBtn">
                                <svg width="16" height="16" viewBox="0 0 16 16">
                                    <use href="#ic_rotate"></use>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div class="gradient-bar-wrapper">
                        <canvas id="gradientCanvas" width="208" height="32"></canvas>
                        <div id="stopsSlider" class="stops-slider"></div>
                    </div>
                    <div class="stops-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                        <span style="font-weight: 500; font-size: 11px;">Stops</span>
                        <button id="addStopBtn">
                            <svg width="16" height="16" viewBox="0 0 16 16">
                                <use href="#ic_plus"></use>
                            </svg>
                        </button>
                    </div>
                    <div id="stopsList"></div>
                </div>
                
                <!-- Image Picker Wrapper -->
                <div id="imagePickerWrapper" style="display: none;">
                    <div class="image-picker-content">
                        <div class="image-preview-container">
                            <div class="image-preview" id="imagePreview">
                                <!-- Checkerboard pattern for empty state -->
                                <div class="image-preview-checkerboard"></div>
                                <img id="selectedImage" style="display: none; max-width: 100%; object-fit: cover;">
                                <!-- Select image button centered in preview -->
                                <button id="selectImageBtn" class="image-btn image-btn-centered">
                                    <svg width="16" height="16" viewBox="0 0 16 16">
                                        <use href="#ic_img"></use>
                                    </svg>
                                    <span>Select Image</span>
                                </button>
                                <!-- Delete button in top-left corner -->
                                <div id="removeImageBtn" class="image-delete-btn hide-delete-image">
                                    <svg width="16" height="16" viewBox="0 0 16 16">
                                        <use href="#ic_delete"></use>
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div class="image-settings">
                            <div class="setting-group">
                                <label>Size:</label>
                                <select id="imageSize">
                                    <option value="auto">Auto</option>
                                    <option value="cover">Cover</option>
                                    <option value="contain">Contain</option>
                                    <option value="100% 100%">Stretch</option>
                                </select>
                            </div>
                            <div class="setting-group">
                                <label>Position:</label>
                                <select id="imagePosition">
                                    <option value="center center">Center</option>
                                    <option value="top left">Top Left</option>
                                    <option value="top center">Top Center</option>
                                    <option value="top right">Top Right</option>
                                    <option value="center left">Center Left</option>
                                    <option value="center right">Center Right</option>
                                    <option value="bottom left">Bottom Left</option>
                                    <option value="bottom center">Bottom Center</option>
                                    <option value="bottom right">Bottom Right</option>
                                </select>
                            </div>
                            <div class="setting-group">
                                <label>Repeat:</label>
                                <select id="imageRepeat">
                                    <option value="no-repeat">No Repeat</option>
                                    <option value="repeat">Repeat</option>
                                    <option value="repeat-x">Repeat X</option>
                                    <option value="repeat-y">Repeat Y</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        // Inherit the current theme from the main app
        const mainApp = this.shadowRoot.querySelector('#inspecta_app');
        if (mainApp && mainApp.getAttribute('data-theme')) {
            this.container.setAttribute('data-theme', mainApp.getAttribute('data-theme'));
        }

        // Set up theme change listener
        this.setupThemeChangeListener();

        this.shadowRoot.appendChild(this.container);

        // Create a separate floating picker for when stop-color-preview is clicked
        this.floatingPicker = document.createElement('div');
        this.floatingPicker.id = 'floatingColorPicker';
        this.floatingPicker.className = 'inspecta-color-picker';
        this.floatingPicker.style.display = 'none';
        this.floatingPicker.style.position = 'fixed';
        this.floatingPicker.style.zIndex = '2147483647';

        // Add floating picker to document body
        //document.body.appendChild(this.floatingPicker);
        this.shadowRoot.appendChild(this.floatingPicker);
        this.pickerElement = this.container.querySelector('.picker-wrapper');
    }

    initIroPicker() {
        const uniqueId = this.containerId;

        // Get the actual DOM elements from the container
        const colorPickerElement = this.container.querySelector(`#colorPicker_${uniqueId}`);
        const hueSliderElement = this.container.querySelector(`#hueSlider_${uniqueId}`);
        const alphaSliderElement = this.container.querySelector(`#alphaSlider_${uniqueId}`);

        // Check if elements exist before initializing
        if (!colorPickerElement || !hueSliderElement || !alphaSliderElement) {
            console.error('Color picker elements not found in container:', this.container);
            return;
        }

        // Initialize main color picker

        this.colorPicker = new iro.ColorPicker(colorPickerElement, {
            width: 208,
            color: this.initialColor,
            borderWidth: 1,
            borderColor: "#ccc",
            borderRadius: 8,
            layout: [
                {
                    component: iro.ui.Box,
                    options: {
                        handleSize: 8
                    }
                }
            ]
        });

        // Initialize hue slider
        this.hueSlider = new iro.ColorPicker(hueSliderElement, {
            width: 172,
            color: this.initialColor,
            borderWidth: 1,
            borderColor: "#ccc",
            borderRadius: 8,
            layout: [
                {
                    component: iro.ui.Slider,
                    options: {
                        sliderType: 'hue',
                        sliderSize: 16
                    }
                }
            ]
        });

        // Initialize alpha slider
        this.alphaSlider = new iro.ColorPicker(alphaSliderElement, {
            width: 172,
            color: this.initialColor,
            borderWidth: 1,
            borderColor: "#ccc",
            borderRadius: 8,
            layout: [
                {
                    component: iro.ui.Slider,
                    options: {
                        sliderType: 'alpha',
                        sliderSize: 16
                    }
                }
            ]
        });
    }

    setupEventHandlers() {
        const uniqueId = this.containerId;

        const iroInstances = [this.colorPicker, this.hueSlider, this.alphaSlider];

        // Set dragging flag using the library's own input events
        iroInstances.forEach(instance => {
            instance.on('input:start', () => {
                this.isDragging = true;
            });
            instance.on('input:end', () => {
                this.isDragging = false;
            });
        });

        this.setupMainColorChangeListener();

        this.hueSlider.on('color:change', (color) => {
            this.colorPicker.color.set(color);
            this.alphaSlider.color.set(color);
            this.updateColorDisplay(color);
            if (this.onColorChange) {
                this.onColorChange(color);
            }
        });

        this.alphaSlider.on('color:change', (color) => {
            this.colorPicker.color.set(color);
            this.hueSlider.color.set(color);
            this.updateColorDisplay(color);
            if (this.onColorChange) {
                this.onColorChange(color);
            }
        });

        // Setup format selector
        const formatSelect = this.container.querySelector(`#formatSelect_${uniqueId}`);
        if (formatSelect) {
            formatSelect.addEventListener('click', () => {
                formatSelect.classList.toggle('open');
            });

            formatSelect.addEventListener('change', (e) => {
                this.showFormatInputs(e.target.value);
            });
        }

        // Setup close button
        const closeBtn = this.container.querySelector('.picker-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // console.log('Close button clicked - closing all pickers');
                // Close everything - main picker and any floating picker
                this.closeAll();
            });
        }

        // Setup eyedropper button
        const eyeDropperBtn = this.container.querySelector('.eye-dropper-btn');
        if (eyeDropperBtn) {
            eyeDropperBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // console.log('Eyedropper button clicked');
                this.openEyeDropper();
            });
        }

        // Setup tab handlers
        const customTab = this.container.querySelector('#custom');
        const figmaTab = this.container.querySelector('#picker-figma-colors');

        if (customTab) {
            customTab.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.switchToCustomTab();
            });
        }

        if (figmaTab) {
            figmaTab.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.switchToFigmaTab();
            });
        }

        // Setup picker option handlers (solid/gradient/image)
        const solidOption = this.container.querySelector('#solidOption');
        const gradientOption = this.container.querySelector('#gradientOption');
        const imageOption = this.container.querySelector('#imageOption');

        // Hide entire picker-options for non-background color pickers (gradients and images only work for backgrounds)
        const pickerOptions = this.container.querySelector('.picker-options');
        if (pickerOptions && this.containerId !== 'in_bg_color') {
            pickerOptions.style.display = 'none';
        }

        if (solidOption) {
            solidOption.addEventListener('click', (e) => {
                // console.log('Solid option clicked');
                e.preventDefault();
                e.stopPropagation();
                this.showSolidPicker();
                const solidColorData = this.getCurrentColorData();
                this.onColorChange(solidColorData);
            });
        }

        if (gradientOption) {
            gradientOption.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showGradientPicker();
                // Fire onColorChange event with the current gradient color
                if (typeof this.onColorChange === 'function') {
                    const gradientData = this.getCurrentColorData();
                    this.onColorChange(gradientData);
                }
            });
        }

        if (imageOption) {
            imageOption.addEventListener('click', (e) => {
                // console.log('Image option clicked');
                e.preventDefault();
                e.stopPropagation();
                this.showImagePicker();
                // Fire onColorChange event with the current image data
                if (typeof this.onColorChange === 'function') {
                    const imageData = this.getCurrentImageData();
                    this.onColorChange(imageData);
                }
            });
        }

        // Setup gradient controls
        const gradientType = this.container.querySelector('#gradientType');
        if (gradientType) {
            gradientType.addEventListener('click', () => {
                gradientType.classList.toggle('open');
            });

            gradientType.addEventListener('change', (e) => {
                this.gradientType = e.target.value;
                this.renderGradient();
                // Fire onColorChange event with updated gradient
                if (typeof this.onColorChange === 'function') {
                    const gradientData = this.getCurrentColorData();
                    this.onColorChange(gradientData);
                }
            });
        }

        const addStopBtn = this.container.querySelector('#addStopBtn');
        if (addStopBtn) {
            addStopBtn.addEventListener('click', () => {
                this.addStop();
            });
        }

        const reverseStopsBtn = this.container.querySelector('#reverseStopsBtn');
        if (reverseStopsBtn) {
            reverseStopsBtn.addEventListener('click', () => {
                this.reverseStops();
                // Fire onColorChange event with updated gradient
                if (typeof this.onColorChange === 'function') {
                    const gradientData = this.getCurrentColorData();
                    this.onColorChange(gradientData);
                }
            });
        }

        const toggleDirectionBtn = this.container.querySelector('#toggleDirectionBtn');
        if (toggleDirectionBtn) {
            toggleDirectionBtn.addEventListener('click', () => {
                this.toggleDirection();
                // Fire onColorChange event with updated gradient
                if (typeof this.onColorChange === 'function') {
                    const gradientData = this.getCurrentColorData();
                    this.onColorChange(gradientData);
                }
            });
        }

        // Setup stops slider click to add new stops
        const stopsSlider = this.container.querySelector('#stopsSlider');
        if (stopsSlider) {
            stopsSlider.addEventListener('click', (e) => {
                if (e.target !== stopsSlider) return;
                const rect = stopsSlider.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const pos = Math.round((x / rect.width) * 100);
                let color = '#ffffff', opacity = 1;
                if (this.stops.length > 1) {
                    for (let i = 1; i < this.stops.length; i++) {
                        if (pos < this.stops[i].pos) {
                            color = this.stops[i - 1].color;
                            opacity = this.stops[i - 1].opacity;
                            break;
                        }
                    }
                }
                this.stops.push({ id: this.nextStopId++, pos, color, opacity });
                this.setActiveStop(this.stops.length - 1);
            });
        }

        // Add Escape key handler to cancel
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isColorPickerShow) {
                if (this.onColorCancel) {
                    this.onColorCancel(this.colorPicker.color);
                }
                this.hide();
            }
        });

        // Setup input handlers
        this.setupInputHandlers(uniqueId);
    }

    setupMainColorChangeListener() {
        // Sync the main picker components
        this.colorPicker.on('color:change', (color, changes) => {
            // console.log('color:change', color, changes);
            // Stop the event from propagating further if it's from user interaction
            if (changes.source) {
                // No need to manually stop propagation, just don't call the external handler yet
            }
            this.hueSlider.color.set(color);
            this.alphaSlider.color.set(color);
            this.updateColorDisplay(color);

            // Update active gradient stop when main picker changes (but not when just setting active stop)
            if (this.activeStopIdx >= 0 && this.activeStopIdx < this.stops.length && !this.isSettingActiveStop) {
                this.stops[this.activeStopIdx].color = color.hexString;
                this.stops[this.activeStopIdx].opacity = color.alpha;
                this.renderGradient();
            }

            if (this.onColorChange) {
                // Use getCurrentColorData() to ensure proper structure
                const colorData = this.getCurrentColorData();
                this.onColorChange(colorData);
            }
        });
    }

    setupInputHandlers(uniqueId, root = null, picker = null, addEnterHandlers = true) {
        const container = root || this.container;
        const colorPicker = picker || this.colorPicker;
        const colorInput = container.querySelector(`#colorInput_${uniqueId}`);
        const rInput = container.querySelector(`#rInput_${uniqueId}`);
        const gInput = container.querySelector(`#gInput_${uniqueId}`);
        const bInput = container.querySelector(`#bInput_${uniqueId}`);
        const hInput = container.querySelector(`#hInput_${uniqueId}`);
        const sInput = container.querySelector(`#sInput_${uniqueId}`);
        const lInput = container.querySelector(`#lInput_${uniqueId}`);
        const hvInput = container.querySelector(`#hvInput_${uniqueId}`);
        const svInput = container.querySelector(`#svInput_${uniqueId}`);
        const vvInput = container.querySelector(`#vvInput_${uniqueId}`);
        const opacityInput = container.querySelector(`#opacityInput_${uniqueId}`);

        if (colorInput) {
            colorInput.addEventListener('input', (e) => {
                const color = e.target.value;
                // Support both 6-character hex (without #) and 7-character hex (with #)
                if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
                    colorPicker.color.set(color);
                } else if (/^[0-9A-Fa-f]{6}$/.test(color)) {
                    colorPicker.color.set('#' + color);
                }
            });

            // Add Enter key handler to apply color (only for main picker)
            if (addEnterHandlers) {
                colorInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        if (this.onColorApply) {
                            this.onColorApply(this.getCurrentColorData());
                        }
                        this.hide();
                    }
                });
            }
        }

        if (rInput && gInput && bInput) {
            [rInput, gInput, bInput].forEach(input => {
                input.addEventListener('input', () => {
                    const r = parseInt(rInput.value) || 0;
                    const g = parseInt(gInput.value) || 0;
                    const b = parseInt(bInput.value) || 0;
                    colorPicker.color.set({ r, g, b });
                });

                // Add Enter key handler to apply color (only for main picker)
                if (addEnterHandlers) {
                    input.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            if (this.onColorApply) {
                                this.onColorApply(this.getCurrentColorData());
                            }
                            this.hide();
                        }
                    });
                }
            });
        }

        if (hInput && sInput && lInput) {
            [hInput, sInput, lInput].forEach(input => {
                input.addEventListener('input', () => {
                    const h = parseInt(hInput.value) || 0;
                    const s = parseInt(sInput.value) || 0;
                    const l = parseInt(lInput.value) || 0;
                    colorPicker.color.set({ h, s, l });
                });

                // Add Enter key handler to apply color (only for main picker)
                if (addEnterHandlers) {
                    input.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            if (this.onColorApply) {
                                this.onColorApply(this.getCurrentColorData());
                            }
                            this.hide();
                        }
                    });
                }
            });
        }

        if (hvInput && svInput && vvInput) {
            [hvInput, svInput, vvInput].forEach(input => {
                input.addEventListener('input', () => {
                    const h = parseInt(hvInput.value) || 0;
                    const s = parseInt(svInput.value) || 0;
                    const v = parseInt(vvInput.value) || 0;
                    colorPicker.color.set({ h, s, v });
                });

                // Add Enter key handler to apply color (only for main picker)
                if (addEnterHandlers) {
                    input.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            if (this.onColorApply) {
                                this.onColorApply(this.getCurrentColorData());
                            }
                            this.hide();
                        }
                    });
                }
            });
        }

        if (opacityInput) {
            opacityInput.addEventListener('input', () => {
                const opacity = parseInt(opacityInput.value) || 100;
                const alpha = opacity / 100;

                // Update the color picker alpha without triggering unnecessary re-renders
                colorPicker.color.alpha = alpha;

                // Update the display
                this.updateColorDisplay(colorPicker.color);

                // Trigger color change event
                if (this.onColorChange) {
                    this.onColorChange(this.getCurrentColorData());
                }
            });
        }
    }

    setupFormatInputs() {
        this.showFormatInputs('hex');
    }

    showSolidPicker() {
        this.switchToMode(InspectaColorPicker.MODES.SOLID);

        // Show page colors section
        const pageColorsSection = this.container.querySelector(InspectaColorPicker.SELECTORS.PAGE_COLORS_SECTION);
        if (pageColorsSection) pageColorsSection.style.display = 'block';

        // Set solid color picker to active gradient stop color if available
        if (this.activeStopIdx >= 0 && this.activeStopIdx < this.stops.length) {
            const activeStop = this.stops[this.activeStopIdx];
            this.colorPicker.color.set(activeStop.color);
            this.colorPicker.color.alpha = activeStop.opacity;
        }

        // Don't fire onColorChange event automatically when switching modes
        // This prevents applying unwanted changes when initializing or switching
        // The event should only fire when the user actually changes the color
    }

    showGradientPicker() {
        this.switchToMode(InspectaColorPicker.MODES.GRADIENT);

        // Hide page colors section for gradient mode
        const pageColorsSection = this.container.querySelector(InspectaColorPicker.SELECTORS.PAGE_COLORS_SECTION);
        if (pageColorsSection) pageColorsSection.style.display = 'none';

        // Check if we have a gradient CSS string to parse from the show method's initialColor
        // We need to access the initialColor that was passed to the show method
        // For now, we'll check if the colorPicker has been set with a gradient
        const currentColor = this.colorPicker.color.hexString;


        // Check if we have a gradient CSS string to parse
        if (this.tempGradientCSS && typeof this.tempGradientCSS === 'string' &&
            (this.tempGradientCSS.includes('linear-gradient') || this.tempGradientCSS.includes('radial-gradient'))) {

            this.parseGradientAndSetup(this.tempGradientCSS);
            // Clear the temporary gradient CSS after parsing
            this.tempGradientCSS = null;
        } else if (this.initialColor && typeof this.initialColor === 'string' &&
            (this.initialColor.includes('linear-gradient') || this.initialColor.includes('radial-gradient'))) {

            this.parseGradientAndSetup(this.initialColor);
        } else {
            // Initialize gradient if needed
            if (this.stops.length === 0) {
                const solidColor = this.colorPicker.color.hexString;
                const solidAlpha = this.colorPicker.color.alpha;
                const lighter = this.lightenHexColor(solidColor, 0.5);
                this.stops.push({ id: this.nextStopId++, pos: 0, color: solidColor, opacity: solidAlpha });
                this.stops.push({ id: this.nextStopId++, pos: 100, color: lighter, opacity: solidAlpha });
                this.activeStopIdx = 0;
            } else if (this.stops.length === 1) {
                const s = this.stops[0];
                const lighter = this.lightenHexColor(s.color, 0.5);
                this.stops.push({ id: this.nextStopId++, pos: 100, color: lighter, opacity: s.opacity });
            }
        }

        setTimeout(() => {
            this.renderGradient(false);
        }, 10);

        setTimeout(() => {
            const gradientWrapper = this.container.querySelector('#gradientPickerWrapper');
            if (gradientWrapper && gradientWrapper.style.display !== 'none') {
                this.drawGradientCanvas(this.stops);
                // Don't fire onColorChange event automatically when switching modes
                // This prevents applying unwanted changes when initializing or switching
                // The event should only fire when the user actually changes the gradient
            }
        }, 100);
    }

    showImagePicker() {
        this.switchToMode(InspectaColorPicker.MODES.IMAGE);

        // Hide page colors section for image mode
        const pageColorsSection = this.container.querySelector(InspectaColorPicker.SELECTORS.PAGE_COLORS_SECTION);
        if (pageColorsSection) pageColorsSection.style.display = 'none';

        // Setup image picker functionality
        this.setupImagePickerHandlers();

        // Populate with existing background image data if available
        this.populateExistingImageData();
    }

    /**
     * Refresh the image data from the current target element
     * This is useful when the picker is shown after selecting an element with a background image
     */
    refreshImageData() {
        // Only refresh if we're in image mode
        if (this.currentMode === InspectaColorPicker.MODES.IMAGE) {
            this.populateExistingImageData();
        }
    }

    setupImagePickerHandlers() {
        const selectImageBtn = this.container.querySelector('#selectImageBtn');
        const removeImageBtn = this.container.querySelector('#removeImageBtn');
        const imageSize = this.container.querySelector('#imageSize');
        const imagePosition = this.container.querySelector('#imagePosition');
        const imageRepeat = this.container.querySelector('#imageRepeat');

        // Remove existing event listeners by cloning and replacing elements
        if (selectImageBtn) {
            const newSelectImageBtn = selectImageBtn.cloneNode(true);
            selectImageBtn.parentNode.replaceChild(newSelectImageBtn, selectImageBtn);
            newSelectImageBtn.addEventListener('click', () => {
                this.selectImage();
            });
        }

        if (removeImageBtn) {
            const newRemoveImageBtn = removeImageBtn.cloneNode(true);
            removeImageBtn.parentNode.replaceChild(newRemoveImageBtn, removeImageBtn);
            newRemoveImageBtn.addEventListener('click', () => {
                this.removeImage();
            });
        }

        if (imageSize) {
            const newImageSize = imageSize.cloneNode(true);
            imageSize.parentNode.replaceChild(newImageSize, imageSize);
            newImageSize.addEventListener('change', () => {
                this.updateImageSettings();
            });
        }

        if (imagePosition) {
            const newImagePosition = imagePosition.cloneNode(true);
            imagePosition.parentNode.replaceChild(newImagePosition, imagePosition);
            newImagePosition.addEventListener('change', () => {
                this.updateImageSettings();
            });
        }

        if (imageRepeat) {
            const newImageRepeat = imageRepeat.cloneNode(true);
            imageRepeat.parentNode.replaceChild(newImageRepeat, imageRepeat);
            newImageRepeat.addEventListener('change', () => {
                this.updateImageSettings();
            });
        }
    }

    selectImage() {
        // Create a file input element
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    this.setImage(event.target.result);
                };
                reader.readAsDataURL(file);
            }
        });

        // Trigger file selection
        document.body.appendChild(fileInput);
        fileInput.click();
        document.body.removeChild(fileInput);
    }

    /**
     * Set image in the image picker
     * @param {string} imageUrl - The URL of the image to set
     * @param {boolean} [triggerChange=true] - Whether to trigger onColorChange event
     */
    setImage(imageUrl, triggerChange = true) {
        const imagePreview = this.container.querySelector('#imagePreview');
        const selectedImage = this.container.querySelector('#selectedImage');
        const removeImageBtn = this.container.querySelector('#removeImageBtn');
        const checkerboard = this.container.querySelector('.image-preview-checkerboard');

        if (selectedImage && imagePreview) {
            selectedImage.src = imageUrl;
            selectedImage.style.display = 'block';
            checkerboard.style.display = 'none';
            removeImageBtn.classList.remove('hide-delete-image');

            // Store image data
            this.currentImageData = {
                url: imageUrl,
                size: this.container.querySelector('#imageSize')?.value || 'auto',
                position: this.container.querySelector('#imagePosition')?.value || 'center center',
                repeat: this.container.querySelector('#imageRepeat')?.value || 'no-repeat'
            };

            // Trigger onColorChange with image data only if requested
            if (triggerChange) {
                this.triggerColorChange(this.getCurrentImageData());
            }
        }
    }

    removeImage() {
        const selectedImage = this.container.querySelector('#selectedImage');
        const removeImageBtn = this.container.querySelector('#removeImageBtn');
        const checkerboard = this.container.querySelector('.image-preview-checkerboard');
        const imageSize = this.container.querySelector('#imageSize');
        const imagePosition = this.container.querySelector('#imagePosition');
        const imageRepeat = this.container.querySelector('#imageRepeat');

        if (selectedImage) {

            // Hide the image and show checkerboard
            selectedImage.style.display = 'none';
            selectedImage.src = '';
            checkerboard.style.display = 'block';
            removeImageBtn.classList.add('hide-delete-image');

            // Reset dropdown values to defaults
            if (imageSize) imageSize.value = 'auto';
            if (imagePosition) imagePosition.value = 'center center';
            if (imageRepeat) imageRepeat.value = 'no-repeat';

            // Clear image data
            this.currentImageData = null;

            // Trigger onColorChange with null image data to remove background image from element
            // This will set background-image: none in the CSS
            const imageData = this.getCurrentImageData();
            this.triggerColorChange(imageData);
        }
    }

    updateImageSettings() {
        if (this.currentImageData) {
            this.currentImageData.size = this.container.querySelector('#imageSize')?.value || 'auto';
            this.currentImageData.position = this.container.querySelector('#imagePosition')?.value || 'center center';
            this.currentImageData.repeat = this.container.querySelector('#imageRepeat')?.value || 'no-repeat';

            // Trigger onColorChange with updated image data
            this.triggerColorChange(this.getCurrentImageData());
        }
    }

    getCurrentImageData() {
        if (this.currentImageData) {
            const data = {
                type: 'image',
                url: this.currentImageData.url,
                size: this.currentImageData.size,
                position: this.currentImageData.position,
                repeat: this.currentImageData.repeat
            };
            return data;
        }

        const nullData = {
            type: 'image',
            url: null,
            size: 'auto',
            position: 'center center',
            repeat: 'no-repeat'
        };
        return nullData;
    }

    populateExistingImageData() {
        // First check the target element's background image (for when element is clicked)
        let backgroundImage = null;
        let imageSize = 'auto';
        let imagePosition = 'center center';
        let imageRepeat = 'no-repeat';

        // Check if we have access to targetStyles (from the selected element)
        // Try both window.targetStyles and local targetStyles, and also get computed styles directly
        const styles = window.targetStyles || (typeof targetStyles !== 'undefined' ? targetStyles : null);
        const computedStyles = window.target ? window.getComputedStyle(window.target) : null;

        // Prefer computed styles if available, otherwise fall back to targetStyles
        const sourceStyles = computedStyles || styles;

        if (sourceStyles && sourceStyles.backgroundImage && sourceStyles.backgroundImage !== 'none') {
            backgroundImage = sourceStyles.backgroundImage;
            imageSize = sourceStyles.backgroundSize || 'auto';
            imagePosition = sourceStyles.backgroundPosition || 'center center';
            imageRepeat = sourceStyles.backgroundRepeat || 'no-repeat';
        } else {
            // Fallback to checking the background color container
            const bgColorContainer = document.querySelector('#in_bg_color');
            if (!bgColorContainer) {
                return;
            }

            backgroundImage = bgColorContainer.style.backgroundImage;
            if (backgroundImage && backgroundImage !== 'none') {
                imageSize = bgColorContainer.style.backgroundSize || 'auto';
                imagePosition = bgColorContainer.style.backgroundPosition || 'center center';
                imageRepeat = bgColorContainer.style.backgroundRepeat || 'no-repeat';
            } else {
                // Final fallback: check if target element has inline background-image style
                if (window.target && window.target.style && window.target.style.backgroundImage && window.target.style.backgroundImage !== 'none') {
                    backgroundImage = window.target.style.backgroundImage;
                    imageSize = window.target.style.backgroundSize || 'auto';
                    imagePosition = window.target.style.backgroundPosition || 'center center';
                    imageRepeat = window.target.style.backgroundRepeat || 'no-repeat';
                }
            }
        }

        if (backgroundImage && backgroundImage !== 'none') {
            // Extract image URL from the background-image CSS
            const imageUrlMatch = backgroundImage.match(/url\(['"]?([^'"]+)['"]?\)/);
            if (imageUrlMatch) {
                const imageUrl = imageUrlMatch[1];

                // Set the image in the picker without triggering change event
                this.setImage(imageUrl, false);

                // Update the settings dropdowns with current values
                const imageSizeElement = this.container.querySelector('#imageSize');
                const imagePositionElement = this.container.querySelector('#imagePosition');
                const imageRepeatElement = this.container.querySelector('#imageRepeat');

                if (imageSizeElement) {
                    imageSizeElement.value = imageSize;
                }
                if (imagePositionElement) {
                    imagePositionElement.value = imagePosition;
                }
                if (imageRepeatElement) {
                    imageRepeatElement.value = imageRepeat;
                }

                // Update the current image data with the settings
                if (this.currentImageData) {
                    this.currentImageData.size = imageSize;
                    this.currentImageData.position = imagePosition;
                    this.currentImageData.repeat = imageRepeat;
                }
            }
        }
    }

    showFormatInputs(format, root = null) {
        const container = root || this.container;
        const uniqueId = this.containerId;
        const hexInputs = container.querySelector(`#hexInputs_${uniqueId}`);
        const rgbInputs = container.querySelector(`#rgbInputs_${uniqueId}`);
        const hslInputs = container.querySelector(`#hslInputs_${uniqueId}`);
        const hsvInputs = container.querySelector(`#hsvInputs_${uniqueId}`);

        if (hexInputs) hexInputs.style.display = 'none';
        if (rgbInputs) rgbInputs.style.display = 'none';
        if (hslInputs) hslInputs.style.display = 'none';
        if (hsvInputs) hsvInputs.style.display = 'none';

        switch (format) {
            case 'hex':
                if (hexInputs) hexInputs.style.display = 'flex';
                break;
            case 'rgb':
                if (rgbInputs) rgbInputs.style.display = 'flex';
                break;
            case 'hsl':
                if (hslInputs) hslInputs.style.display = 'flex';
                break;
            case 'hsv':
                if (hsvInputs) hsvInputs.style.display = 'flex';
                break;
        }
    }

    updateColorDisplay(color, root = null) {
        const container = root || this.container;
        const uniqueId = this.containerId;
        const formatSelect = container.querySelector(`#formatSelect_${uniqueId}`);
        const format = formatSelect ? formatSelect.value : 'hex';

        const colorInput = container.querySelector(`#colorInput_${uniqueId}`);
        const rInput = container.querySelector(`#rInput_${uniqueId}`);
        const gInput = container.querySelector(`#gInput_${uniqueId}`);
        const bInput = container.querySelector(`#bInput_${uniqueId}`);
        const hInput = container.querySelector(`#hInput_${uniqueId}`);
        const sInput = container.querySelector(`#sInput_${uniqueId}`);
        const lInput = container.querySelector(`#lInput_${uniqueId}`);
        const hvInput = container.querySelector(`#hvInput_${uniqueId}`);
        const svInput = container.querySelector(`#svInput_${uniqueId}`);
        const vvInput = container.querySelector(`#vvInput_${uniqueId}`);
        const opacityInput = container.querySelector(`#opacityInput_${uniqueId}`);

        switch (format) {
            case 'hex':
                if (colorInput) colorInput.value = color.hexString;
                break;
            case 'rgb':
                if (rInput) rInput.value = color.rgb.r;
                if (gInput) gInput.value = color.rgb.g;
                if (bInput) bInput.value = color.rgb.b;
                break;
            case 'hsl':
                if (hInput) hInput.value = Math.round(color.hsl.h);
                if (sInput) sInput.value = Math.round(color.hsl.s);
                if (lInput) lInput.value = Math.round(color.hsl.l);
                break;
            case 'hsv':
                if (hvInput) hvInput.value = Math.round(color.hsv.h);
                if (svInput) svInput.value = Math.round(color.hsv.s);
                if (vvInput) vvInput.value = Math.round(color.hsv.v);
                break;
        }

        // Update opacity input
        if (opacityInput) {
            opacityInput.value = Math.round(color.alpha * 100);
        }
    }

    show(position, initialColor, onColorChange, onColorCancel, onColorApply) {
        if (this.isColorPickerShow) return;

        this.isColorPickerShow = true;

        // Set initial color
        if (initialColor) {
            // Handle object format with color and alpha
            if (typeof initialColor === 'object' && initialColor.color && typeof initialColor.alpha === 'number') {
                // Convert hex to RGB and set color with alpha
                const hex = initialColor.color.replace('#', '');
                const r = parseInt(hex.substr(0, 2), 16);
                const g = parseInt(hex.substr(2, 2), 16);
                const b = parseInt(hex.substr(4, 2), 16);

                this.colorPicker.color.set({
                    r: r,
                    g: g,
                    b: b,
                    a: initialColor.alpha
                });

                // Also update the opacity input in the UI
                const opacityInput = this.container.querySelector(`#opacityInput_${this.containerId}`);
                if (opacityInput) {
                    opacityInput.value = Math.round(initialColor.alpha * 100);
                }
            } else {
                this.colorPicker.color.set(initialColor);
            }
        }

        // Update callbacks if provided
        if (onColorChange) this.onColorChange = onColorChange;
        if (onColorCancel) this.onColorCancel = onColorCancel;
        if (onColorApply) this.onColorApply = onColorApply;

        // Check if we need to switch to gradient mode based on initial color
        if (initialColor && typeof initialColor === 'string' &&
            (initialColor.includes('linear-gradient') ||
                initialColor.includes('radial-gradient') ||
                initialColor.includes('conic-gradient'))) {
            // Store the gradient CSS temporarily so showGradientPicker can access it
            this.tempGradientCSS = initialColor;
            this.showGradientPicker();
        }

        // Position the picker
        if (position) {
            // Use fixed positioning to position relative to viewport
            this.pickerElement.style.position = 'fixed';
            this.pickerElement.style.left = position.left + 'px';
            this.pickerElement.style.top = position.top + 'px';
            this.pickerElement.style.zIndex = '2147483647';
        }

        // Show the picker
        this.pickerElement.style.display = 'flex';

        // Refresh page colors when picker is shown
        this.populatePageColors();

        // Refresh image data if in image mode (for when element with background image is selected)
        this.refreshImageData();

        // Add click event to picker to prevent closing
        this.setupPickerClickHandler();

        // Add click outside to hide
        // this.setupClickOutsideHandler();
    }

    hide() {
        this.isColorPickerShow = false;
        this.pickerElement.style.display = 'none';

        // Remove event handlers
        this.removePickerClickHandler();
        this.removeClickOutsideHandler();

        // Notify global manager that this picker is closed
        if (window.colorPickerManager && window.colorPickerManager.activePicker === this) {
            window.colorPickerManager.activePicker = null;
        }
    }

    closeAll() {
        // console.log('Closing all color pickers');
        this.hide();
        this.hideFloatingPicker && this.hideFloatingPicker();
    }

    openEyeDropper() {
        // Check if browser supports EyeDropper API
        if (!window.EyeDropper) {
            // console.warn('EyeDropper API not supported in this browser');
            if (typeof window.showToast === 'function') {
                window.showToast('Eyedropper not supported in this browser', 3000);
            }
            return;
        }

        const eyeDropper = new EyeDropper();

        eyeDropper.open()
            .then((result) => {
                // console.log('Eyedropper selected color:', result.sRGBHex);

                // Update the color picker with the selected color
                this.setColor(result.sRGBHex);

                // Trigger color change event
                if (this.onColorChange) {
                    this.onColorChange({
                        hexString: result.sRGBHex,
                        alpha: 1 // EyeDropper always returns opaque colors
                    });
                }

                // Show success feedback
                if (typeof window.showToast === 'function') {
                    window.showToast(`Color ${result.sRGBHex} selected`, 2000);
                }
            })
            .catch((error) => {
                // User cancelled or error occurred
            });
    }

    openEyeDropperForFloating(picker, onColorChange) {
        // Check if browser supports EyeDropper API
        if (!window.EyeDropper) {
            // console.warn('EyeDropper API not supported in this browser');
            if (typeof window.showToast === 'function') {
                window.showToast('Eyedropper not supported in this browser', 3000);
            }
            return;
        }

        const eyeDropper = new EyeDropper();

        eyeDropper.open()
            .then((result) => {
                // console.log('Floating picker eyedropper selected color:', result.sRGBHex);

                // Update the floating color picker with the selected color
                picker.color.set(result.sRGBHex);

                // Trigger color change event for floating picker
                if (onColorChange) {
                    onColorChange({
                        hexString: result.sRGBHex,
                        alpha: 1 // EyeDropper always returns opaque colors
                    });
                }

                // Show success feedback
                if (typeof window.showToast === 'function') {
                    window.showToast(`Color ${result.sRGBHex} selected`, 2000);
                }
            })
            .catch((error) => {
                // User cancelled or error occurred
            });
    }

    setupPickerClickHandler() {
        this.pickerClickHandler = (e) => {
            // console.log('Click inside picker, stopping propagation');
            e.stopPropagation();
        };
        this.pickerElement.addEventListener('mousedown', this.pickerClickHandler);
    }

    setupClickOutsideHandler() {
        this.clickOutsideHandler = (e) => {
            // console.log('Click detected on:', e.target);
            // console.log('Picker element:', this.pickerElement);
            // console.log('Is dragging:', this.isDragging);

            if (this.isDragging || this.isDraggingFloating) {
                return;
            }

            // Check if the click is inside the picker element (which is the picker-wrapper)
            const isInsidePicker = this.pickerElement && this.pickerElement.contains(e.target);
            // console.log('Click inside picker?', isInsidePicker);

            if (isInsidePicker) {
                return;
            }

            //console.log('Click is outside picker, closing');
            // Click is outside the picker, close it
            if (this.onColorApply) {
                this.onColorApply(this.getCurrentColorData());
            }
            this.hide();
        };
        document.addEventListener('mousedown', this.clickOutsideHandler);
    }

    removePickerClickHandler() {
        if (this.pickerClickHandler && this.pickerElement) {
            this.pickerElement.removeEventListener('mousedown', this.pickerClickHandler);
            this.pickerClickHandler = null;
        }
    }

    removeClickOutsideHandler() {
        if (this.clickOutsideHandler) {
            document.removeEventListener('mousedown', this.clickOutsideHandler);
            this.clickOutsideHandler = null;
        }
    }

    getColor() {
        return this.colorPicker.color;
    }

    setColor(color) {
        this.colorPicker.color.set(color);
    }

    // Gradient picker helper methods
    lightenHexColor(hex, amount = 0.5) {
        let c = hex.replace('#', '');
        if (c.length === 3) c = c.split('').map(x => x + x).join('');
        let r = parseInt(c.substring(0, 2), 16);
        let g = parseInt(c.substring(2, 4), 16);
        let b = parseInt(c.substring(4, 6), 16);
        r = Math.round(r + (136 - r) * amount);
        g = Math.round(g + (136 - g) * amount);
        b = Math.round(b + (136 - b) * amount);
        return (
            '#' +
            r.toString(16).padStart(2, '0') +
            g.toString(16).padStart(2, '0') +
            b.toString(16).padStart(2, '0')
        );
    }

    getGradientCssString() {
        if (!this.stops || this.stops.length === 0) {
            return '';
        }

        // Sort stops by position
        const sortedStops = [...this.stops].sort((a, b) => a.pos - b.pos);

        // Build gradient string based on type
        let gradientString = '';

        switch (this.gradientType) {
            case 'linear':
                gradientString = `linear-gradient(${this.linearDirection}`;
                break;
            case 'radial':
                gradientString = 'radial-gradient(circle';
                break;
            case 'conic':
                gradientString = 'conic-gradient';
                break;
            case 'diamond':
                gradientString = 'radial-gradient(diamond';
                break;
            default:
                gradientString = `linear-gradient(${this.linearDirection}`;
        }

        // Add color stops
        const colorStops = sortedStops.map(stop => {
            const color = this.hexWithAlpha(stop.color, stop.opacity);
            return `${color} ${stop.pos}%`;
        }).join(', ');

        gradientString += `, ${colorStops})`;

        return gradientString;
    }

    getCurrentColorData() {
        // Check if we're in gradient mode and have stops
        const solidWrapper = this.container.querySelector('#solidPickerWrapper');
        const gradientWrapper = this.container.querySelector('#gradientPickerWrapper');

        if (gradientWrapper && gradientWrapper.style.display !== 'none' && this.stops && this.stops.length > 0) {
            // Return gradient data
            return {
                cssString: this.getGradientCssString(),
                type: 'gradient',
                stops: JSON.parse(JSON.stringify(this.stops)),
                gradientType: this.gradientType,
                linearDirection: this.linearDirection
            };
        } else {
            // Return solid color data
            return this.colorPicker.color;
        }
    }

    hexWithAlpha(hex, alpha) {
        if (alpha === 1) return hex;
        let c = hex.replace('#', '');
        if (c.length === 3) c = c.split('').map(x => x + x).join('');
        const num = parseInt(c, 16);
        const r = (num >> 16) & 255;
        const g = (num >> 8) & 255;
        const b = num & 255;
        return `rgba(${r},${g},${b},${alpha})`;
    }

    drawGradientCanvas(stops) {
        const canvas = this.container.querySelector('#gradientCanvas');
        if (!canvas) {
            console.warn('Gradient canvas not found');
            return;
        }
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.warn('Could not get canvas context');
            return;
        }

        // Retina support
        const dpr = window.devicePixelRatio || 1;
        const width = canvas.clientWidth * dpr;
        const height = canvas.clientHeight * dpr;
        canvas.width = width;
        canvas.height = height;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);

        // Checkerboard for alpha preview
        const checkerSize = 8;
        for (let y = 0; y < canvas.clientHeight; y += checkerSize) {
            for (let x = 0; x < canvas.clientWidth; x += checkerSize) {
                ctx.fillStyle = ((x / checkerSize + y / checkerSize) % 2 === 0) ? '#eee' : '#fff';
                ctx.fillRect(x, y, checkerSize, checkerSize);
            }
        }

        // Linear gradient
        let grad;
        if (this.gradientType === 'linear') {
            if (this.linearDirection === 'to right') {
                grad = ctx.createLinearGradient(0, 0, canvas.clientWidth, 0);
            } else {
                grad = ctx.createLinearGradient(0, 0, 0, canvas.clientHeight);
            }
        } else {
            grad = ctx.createLinearGradient(0, 0, canvas.clientWidth, 0);
        }

        const sortedStops = stops.sort((a, b) => a.pos - b.pos);
        sortedStops.forEach(stop => {
            const colorWithAlpha = this.hexWithAlpha(stop.color, stop.opacity);
            grad.addColorStop(stop.pos / 100, colorWithAlpha);
        });
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    }

    /**
     * Render the gradient with current stops
     * @param {boolean} [triggerChange=true] - Whether to trigger onColorChange event
     */
    renderGradient(triggerChange = true) {
        if (this.isDraggingStop) return;

        // Prevent cascading renders when just setting active stop
        if (this.isSettingActiveStop) {
            return;
        }

        // Store the active stop ID before sorting
        const activeStopId = this.stops[this.activeStopIdx]?.id;

        this.stops.sort((a, b) => a.pos - b.pos);

        // Update active index after sorting (but not during dragging)
        if (activeStopId && !this.isDraggingStop) {
            this.activeStopIdx = this.stops.findIndex(stop => stop.id === activeStopId);
            if (this.activeStopIdx === -1) this.activeStopIdx = 0;
        }

        this.drawGradientCanvas(this.stops);
        // console.log('Rendering gradient. Active stop index:', this.activeStopIdx, 'Active stop ID:', activeStopId, 'Total stops:', this.stops.length);

        // Fire onColorChange event with updated gradient only if requested
        if (triggerChange) {
            const gradientData = this.getCurrentColorData();
            this.triggerColorChange(gradientData);
        }

        const stopsSlider = this.container.querySelector('#stopsSlider');
        if (!stopsSlider) return;

        stopsSlider.innerHTML = '';
        this.stops.forEach((stop, idx) => {
            const marker = document.createElement('div');
            const isActive = idx === this.activeStopIdx;
            marker.className = 'stop-marker' + (isActive ? ' active' : '');
            // console.log('Creating marker', idx, 'isActive:', isActive, 'className:', marker.className);
            marker.style.left = `calc(${stop.pos}%)`;
            marker.style.zIndex = (stop.id === this.dragStopId) ? 10 : 1;
            marker.setAttribute('data-stop-id', stop.id);
            // console.log(`Creating stop marker ${idx}, active: ${idx === this.activeStopIdx}, className: ${marker.className}`);

            let isDragStarted = false;
            let dragTimeout = null;

            marker.onmousedown = (e) => {
                e.stopPropagation();
                e.preventDefault();
                if (this.isDraggingStop) return;

                isDragStarted = false;

                // Start drag after a small delay to allow for click detection
                dragTimeout = setTimeout(() => {
                    isDragStarted = true;
                    this.startDragStop(e, stop.id);
                }, 150);
            };

            marker.onmouseup = (e) => {
                // Clear drag timeout
                if (dragTimeout) {
                    clearTimeout(dragTimeout);
                    dragTimeout = null;
                }

                // If we didn't start dragging, treat this as a click to open floating picker
                if (!isDragStarted && !this.isDraggingStop) {
                    // Select this stop by finding its current index
                    const currentIndex = this.stops.findIndex(s => s.id === stop.id);

                    if (currentIndex !== -1) {
                        this.setActiveStop(currentIndex);

                        // Calculate position for floating picker near the marker
                        const rect = marker.getBoundingClientRect();
                        let x = rect.right + 10;
                        let y = rect.top;

                        // Adjust position if it would go off screen
                        if (x + 300 > window.innerWidth) {
                            x = rect.left - 310;
                        }
                        if (y + 400 > window.innerHeight) {
                            y = window.innerHeight - 420;
                        }

                        // Open floating color picker for this stop
                        this.showFloatingColorPicker(x, y, this.stops[currentIndex].color, currentIndex, this.stops[currentIndex].opacity);
                    }
                }
            };

            // console.log('Created stop marker', idx, 'with mousedown/mouseup handlers');

            // Inner square
            const square = document.createElement('div');
            square.className = 'stop-marker-square';
            square.style.setProperty('--stop-color', this.hexWithAlpha(stop.color, stop.opacity));
            marker.appendChild(square);

            // Pointer
            const pointer = document.createElement('div');
            pointer.className = 'stop-marker-pointer';
            marker.appendChild(pointer);

            stopsSlider.appendChild(marker);
        });

        this.renderStopsList();
    }

    renderStopsList() {
        const stopsList = this.container.querySelector('#stopsList');
        if (!stopsList) {
            return;
        }

        stopsList.innerHTML = '';
        this.stops.forEach((stop, idx) => {
            const row = document.createElement('div');
            const isActive = idx === this.activeStopIdx;
            row.className = 'stop-row' + (isActive ? ' active' : '');
            // console.log('Creating stop row', idx, 'isActive:', isActive, 'className:', row.className);

            // Add click handler to select this stop
            row.onclick = (e) => {
                e.stopPropagation();
                // Find current index by stop ID to ensure correct selection
                const currentIndex = this.stops.findIndex(s => s.id === stop.id);
                if (currentIndex !== -1) {
                    this.setActiveStop(currentIndex);
                }
            };

            // Position input group
            const posGroup = document.createElement('div');
            posGroup.className = 'input-percent-group';
            const posInput = document.createElement('input');
            posInput.type = 'text';
            posInput.className = 'color-input';
            posInput.value = stop.pos;
            posInput.oninput = (e) => {
                let val = parseInt(e.target.value);
                if (isNaN(val)) val = 0;
                val = Math.max(0, Math.min(100, val));
                this.stops[idx].pos = val;
                this.drawGradientCanvas(this.stops);
                this.updateStopMarkers();
            };
            const posPercent = document.createElement('span');
            posPercent.className = 'input-percent-suffix';
            posPercent.textContent = '%';
            posGroup.appendChild(posInput);
            posGroup.appendChild(posPercent);

            // Hex input group with color preview inside
            const hexGroup = document.createElement('div');
            hexGroup.className = 'input-color-preview-group';
            const colorPreview = document.createElement('div');
            colorPreview.className = 'stop-color-preview';
            colorPreview.style.background = stop.color;

            colorPreview.addEventListener('click', (e) => {
                const rect = e.target.getBoundingClientRect();
                let x = rect.right + 10;
                let y = rect.top;
                if (x + 300 > window.innerWidth) {
                    x = rect.left - 310;
                }
                if (y + 400 > window.innerHeight) {
                    y = window.innerHeight - 420;
                }
                const stopColor = {
                    color: this.stops[idx].color,
                    alpha: this.stops[idx].opacity
                };
                this.showFloatingColorPicker(x, y, stopColor, idx);
                e.stopPropagation();
            });

            const hexInput = document.createElement('input');
            hexInput.type = 'text';
            hexInput.className = 'color-input stop-hex-input hex-input-with-preview';
            hexInput.value = stop.color.replace('#', '');
            hexInput.oninput = (e) => {
                let val = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
                if (/^[0-9a-fA-F]{6}$/.test(val)) {
                    let oldOpacity = this.stops[idx].opacity;
                    this.stops[idx].color = '#' + val;
                    this.stops[idx].opacity = oldOpacity;
                    colorPreview.style.background = '#' + val;
                    this.renderGradient();
                }
                hexInput.value = val;
            };
            hexGroup.appendChild(colorPreview);
            hexGroup.appendChild(hexInput);

            // Opacity input group
            const opacityGroup = document.createElement('div');
            opacityGroup.className = 'input-percent-group';
            const opacityInput = document.createElement('input');
            opacityInput.type = 'text';
            opacityInput.className = 'color-input stop-opacity-input';
            opacityInput.value = Math.round(stop.opacity * 100);

            opacityInput.oninput = (e) => {
                let val = parseInt(e.target.value);
                if (isNaN(val)) val = 0;
                val = Math.max(0, Math.min(100, val));

                this.stops[idx].opacity = val / 100;
                opacityInput.value = val;

                // Only update the gradient canvas, don't re-render the entire stops list
                this.drawGradientCanvas(this.stops);

                // Trigger color change without re-rendering the UI
                const gradientData = this.getCurrentColorData();
                this.triggerColorChange(gradientData);
            };
            const opacityPercent = document.createElement('span');
            opacityPercent.className = 'input-percent-suffix';
            opacityPercent.textContent = '%';
            opacityGroup.appendChild(opacityInput);
            opacityGroup.appendChild(opacityPercent);

            // Remove button
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-stop';
            removeBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 16 16">
                    <use href="#ic_minus"></use>
                </svg>
            `;
            removeBtn.onclick = () => {
                if (this.stops.length > 2) {
                    this.stops.splice(idx, 1);
                    this.renderGradient();
                }
            };
            if (this.stops.length <= 2) {
                removeBtn.style.visibility = 'hidden';
            }

            row.appendChild(posGroup);
            row.appendChild(hexGroup);
            row.appendChild(opacityGroup);
            row.appendChild(removeBtn);
            stopsList.appendChild(row);
        });
    }

    updateStopMarkers() {
        const stopsSlider = this.container.querySelector('#stopsSlider');
        if (!stopsSlider) return;

        const markers = stopsSlider.querySelectorAll('.stop-marker');
        this.stops.forEach((stop, idx) => {
            if (markers[idx]) {
                markers[idx].style.left = `calc(${stop.pos}%)`;
                markers[idx].style.zIndex = (stop.id === this.dragStopId) ? 10 : 1;

                // Update active class during dragging
                const isActive = idx === this.activeStopIdx;
                if (isActive && !markers[idx].classList.contains('active')) {
                    markers[idx].classList.add('active');
                } else if (!isActive && markers[idx].classList.contains('active')) {
                    markers[idx].classList.remove('active');
                }
            }
        });
    }

    setActiveStop(idx) {
        if (this.isDraggingStop) return;

        // Set flag to prevent color change handler from updating stops
        this.isSettingActiveStop = true;

        this.activeStopIdx = idx;

        // Just update the visual markers and rows, don't re-render everything
        this.updateActiveStopVisuals();

        if (this.stops[idx]) {
            const stopColor = this.stops[idx].color;
            const stopAlpha = this.stops[idx].opacity;

            // Set the color directly using the flag to prevent updates
            // this.colorPicker.color.set(stopColor);
            // this.colorPicker.color.alpha = stopAlpha;
        }

        // Clear the flag after a brief delay
        setTimeout(() => {
            this.isSettingActiveStop = false;
        }, 10);
    }

    updateActiveStopVisuals() {
        // Update marker visuals by finding the marker with the active stop ID
        const stopsSlider = this.container.querySelector('#stopsSlider');
        if (stopsSlider && this.stops[this.activeStopIdx]) {
            const activeStopId = this.stops[this.activeStopIdx].id;

            const markers = stopsSlider.querySelectorAll('.stop-marker');
            markers.forEach((marker, idx) => {
                const markerStopId = marker.getAttribute('data-stop-id');

                if (markerStopId === String(activeStopId)) {
                    marker.classList.add('active');
                } else {
                    marker.classList.remove('active');
                }
            });
        }

        // Update stop row visuals using DOM index (this should be fine since rows are recreated each time)
        const stopsList = this.container.querySelector('#stopsList');
        if (stopsList) {
            const rows = stopsList.querySelectorAll('.stop-row');
            rows.forEach((row, idx) => {
                if (idx === this.activeStopIdx) {
                    row.classList.add('active');
                } else {
                    row.classList.remove('active');
                }
            });
        }
    }

    startDragStop(e, stopId) {
        if (this.dragStopId !== null || this.isDraggingStop) return;
        this.isDraggingStop = true;
        this.dragStopId = stopId;

        // Set the dragged stop as active and keep it active during drag
        const stopIndex = this.stops.findIndex(stop => stop.id === stopId);
        if (stopIndex !== -1) {
            this.activeStopIdx = stopIndex;
        }

        this.updateStopMarkers();
        document.onmousemove = (e) => this.onDrag(e);
        document.onmouseup = () => this.stopDrag();
    }

    onDrag(e) {
        if (this.dragStopId === null) return;
        const stopsSlider = this.container.querySelector('#stopsSlider');
        if (!stopsSlider) return;

        const rect = stopsSlider.getBoundingClientRect();
        let x = e.clientX - rect.left;
        x = Math.max(0, Math.min(rect.width, x));
        const stop = this.stops.find(s => s.id === this.dragStopId);
        if (stop) {
            stop.pos = Math.round((x / rect.width) * 100);
        }

        // Maintain active selection on the dragged stop during drag
        const draggedStopIndex = this.stops.findIndex(s => s.id === this.dragStopId);
        if (draggedStopIndex !== -1) {
            this.activeStopIdx = draggedStopIndex;
        }

        this.drawGradientCanvas(this.stops);
        this.updateStopMarkers();
    }

    stopDrag() {
        // Store the dragged stop ID to maintain selection
        const draggedStopId = this.dragStopId;

        this.isDraggingStop = false;
        this.dragStopId = null;
        this.updateStopMarkers();
        document.onmousemove = null;
        document.onmouseup = null;

        // Ensure the dragged stop remains active after sorting
        if (draggedStopId) {
            const newIndex = this.stops.findIndex(stop => stop.id === draggedStopId);
            if (newIndex !== -1) {
                this.activeStopIdx = newIndex;
            }
        }

        this.renderGradient();
    }

    addStop() {
        if (this.stops.length === 0) {
            this.stops.push({ id: this.nextStopId++, pos: 50, color: '#ffffff', opacity: 1 });
            this.activeStopIdx = 0;
            this.renderGradient();
            return;
        }

        let pos = 50;
        let color = '#ffffff', opacity = 1;

        if (this.stops.length === 1) {
            pos = this.stops[0].pos > 50 ? 25 : 75;
            color = this.stops[0].color;
            opacity = this.stops[0].opacity;
        } else if (this.stops.length >= 2) {
            const idx = Math.min(this.activeStopIdx, this.stops.length - 1);
            const currentStop = this.stops[idx];
            let prevStop, nextStop;

            if (idx === 0) {
                prevStop = currentStop;
                nextStop = this.stops[1];
            } else if (idx === this.stops.length - 1) {
                prevStop = this.stops[idx - 1];
                nextStop = currentStop;
            } else {
                prevStop = this.stops[idx - 1];
                nextStop = this.stops[idx + 1];
            }

            pos = Math.round((prevStop.pos + nextStop.pos) / 2);
            color = currentStop.color;
            opacity = currentStop.opacity;
        }

        this.stops.push({ id: this.nextStopId++, pos, color, opacity });
        this.activeStopIdx = this.stops.length - 1;
        this.renderGradient();
    }

    reverseStops() {
        const maxPos = Math.max(...this.stops.map(s => s.pos));
        const minPos = Math.min(...this.stops.map(s => s.pos));
        this.stops.forEach(stop => {
            stop.pos = maxPos + minPos - stop.pos;
        });
        this.stops.reverse();
        this.renderGradient();
    }

    toggleDirection() {
        if (this.linearDirection === 'to right') {
            this.linearDirection = 'to bottom';
        } else {
            this.linearDirection = 'to right';
        }
        this.renderGradient();
    }

    showFloatingColorPicker(x, y, initialColor, stopIdx) {
        // Create floating picker if it doesn't exist
        if (!this.floatingPicker) {
            this.floatingPicker = document.createElement('div');
            this.floatingPicker.id = 'floatingColorPicker';

            this.floatingPicker.style.display = 'none';
            this.floatingPicker.style.position = 'fixed';
            this.floatingPicker.style.zIndex = '2147483647';

            // Inherit the current theme from the main app
            const mainApp = this.shadowRoot.querySelector('#inspecta_app');
            if (mainApp && mainApp.getAttribute('data-theme')) {
                this.floatingPicker.setAttribute('data-theme', mainApp.getAttribute('data-theme'));
            }

            //document.body.appendChild(this.floatingPicker);
            this.shadowRoot.appendChild(this.floatingPicker);
        }

        const container = this.floatingPicker;

        // Update theme if it has changed
        const mainApp = this.shadowRoot.querySelector('#inspecta_app');
        if (mainApp && mainApp.getAttribute('data-theme')) {
            container.setAttribute('data-theme', mainApp.getAttribute('data-theme'));
        }

        // Position the floating picker on top of the main gradient picker
        const pickerWrapper = this.container.querySelector('.picker-wrapper');
        const rect = pickerWrapper.getBoundingClientRect();

        container.style.left = (rect.left - 300) + 'px';
        container.style.top = rect.top + 'px';
        // Apply proper styling
        container.style.setProperty('display', 'block', 'important');
        container.style.setProperty('width', '240px', 'important');
        container.style.setProperty('z-index', '2147483647', 'important');
        container.style.setProperty('position', 'fixed', 'important');

        container.innerHTML = '';
        this.floatingPickerStopIdx = stopIdx;

        container.innerHTML = '';
        this.floatingPickerStopIdx = stopIdx;

        // Add picker header
        const header = document.createElement('div');
        header.className = 'floating-picker-header';

        // Left: tabs
        const tabsWrapper = document.createElement('div');
        tabsWrapper.className = 'floating-picker-tabs';

        const customTab = document.createElement('div');
        customTab.className = 'picker-tab active';
        customTab.textContent = 'Custom';
        const figmaTab = document.createElement('div');
        figmaTab.className = 'picker-tab';
        figmaTab.textContent = 'Figma';

        tabsWrapper.appendChild(customTab);
        tabsWrapper.appendChild(figmaTab);

        // Right: close button
        const closeBtn = document.createElement('button');
        closeBtn.setAttribute('aria-label', 'Close');
        closeBtn.className = 'floating-picker-close-btn';
        closeBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 16 16">
                    <use href="#ic_close"></use>
                </svg>
            `;
        closeBtn.onclick = () => {
            container.style.display = 'none';
            // Remove the event listener
            if (this.boundHideFloatingPicker) {
                document.removeEventListener('mousedown', this.boundHideFloatingPicker);
                this.boundHideFloatingPicker = null;
            }
            // Clean up drag handlers
            if (this.floatingDragHandlers) {
                const header = container.querySelector('.floating-picker-header');
                if (header) {
                    header.removeEventListener('mousedown', this.floatingDragHandlers.mousedown);
                }
                document.removeEventListener('mousemove', this.floatingDragHandlers.mousemove);
                document.removeEventListener('mouseup', this.floatingDragHandlers.mouseup);
                this.floatingDragHandlers = null;
            }
            this.floatingColorPicker = null;
            this.floatingPickerStopIdx = null;
        };

        // Tab switching for floating picker
        customTab.onclick = () => {
            customTab.classList.add('active');
            figmaTab.classList.remove('active');

            // Remove CSS class to show solidPickerWrapper again
            container.classList.remove('figma-tab-active');

            // Show the cloned solid picker content
            if (this.floatingClonedContent) {
                this.floatingClonedContent.style.display = 'block';
            }

            // Also explicitly show solidPickerWrapper by ID
            const solidPickerWrapper = container.querySelector('#solidPickerWrapper');
            if (solidPickerWrapper) {
                solidPickerWrapper.style.display = 'block';
            }

            // Show any color picker elements that were hidden
            const colorPickerElements = container.querySelectorAll('[id^="colorPicker"], [id^="hueSlider"], [id^="alphaSlider"]');
            colorPickerElements.forEach(el => {
                el.style.display = 'block';
            });

            // Show wrapper elements with proper flex display
            const controlsWrapper = container.querySelector('.controls-wrapper');
            if (controlsWrapper) {
                controlsWrapper.style.display = 'flex';
            }

            const colorSlidersWrapper = container.querySelector('.color-sliders-wrapper');
            if (colorSlidersWrapper) {
                colorSlidersWrapper.style.display = 'flex';
            }

            // Show page colors section
            const pageColorsSection = container.querySelector('.page-colors-section');
            if (pageColorsSection) {
                pageColorsSection.style.display = 'block';
            }

            // Hide Figma colors section if it exists
            const figmaColorsSection = container.querySelector('.figma-colors-section');
            if (figmaColorsSection) {
                figmaColorsSection.style.display = 'none';
            }

            // Populate page colors
            this.populatePageColorsForFloating(container);
        };
        figmaTab.onclick = () => {
            figmaTab.classList.add('active');
            customTab.classList.remove('active');

            // Add CSS class to trigger the CSS override for hiding solidPickerWrapper
            container.classList.add('figma-tab-active');

            // Hide the cloned solid picker content (contains all color picker elements)
            if (this.floatingClonedContent) {
                this.floatingClonedContent.style.display = 'none';
            }

            // Also try to hide by ID as backup
            const solidPickerWrapper = container.querySelector('#solidPickerWrapper');
            if (solidPickerWrapper) {
                solidPickerWrapper.style.display = 'none';
            }

            // Hide any elements with color picker related classes
            const colorPickerElements = container.querySelectorAll('.color-sliders-wrapper, .controls-wrapper, [id^="colorPicker"], [id^="hueSlider"], [id^="alphaSlider"]');
            colorPickerElements.forEach(el => {
                el.style.display = 'none';
            });

            // Hide page colors section
            const pageColorsSection = container.querySelector('.page-colors-section');
            if (pageColorsSection) {
                pageColorsSection.style.display = 'none';
            }

            // Show and populate Figma colors section (replaces the custom content)
            this.populateFigmaColorsForFloating(container);

            // Ensure Figma colors section takes the full space and matches main picker styling
            const figmaColorsSection = container.querySelector('.figma-colors-section');
            if (figmaColorsSection) {
                figmaColorsSection.style.display = 'flex';
                figmaColorsSection.style.flexDirection = 'column';
                figmaColorsSection.style.flex = '1';
                figmaColorsSection.style.width = '100%';
                figmaColorsSection.style.height = '100%';
                figmaColorsSection.style.justifyContent = 'center';
                figmaColorsSection.style.alignItems = 'center';
            }
        };

        header.appendChild(tabsWrapper);
        header.appendChild(closeBtn);
        container.appendChild(header);

        // Clone the solid picker wrapper content
        const solidPickerWrapper = this.container.querySelector('#solidPickerWrapper');
        const clonedContent = solidPickerWrapper.cloneNode(true);

        // Remove any existing iro instances from the clone
        const existingPickers = clonedContent.querySelectorAll('[id^="colorPicker"], [id^="hueSlider"], [id^="alphaSlider"]');
        existingPickers.forEach(picker => {
            picker.innerHTML = '';
        });

        container.appendChild(clonedContent);

        // Store reference to the cloned content for easy access
        this.floatingClonedContent = clonedContent;

        // Check if this picker is for font color, border color, or shadow color
        // These pickers should not show picker-options (solid/gradient toggle) in floating picker
        const isFontColorPicker = this.containerId === 'in_font_color';
        const isBorderColorPicker = this.containerId === 'in_border_color';
        const isShadowColorPicker = this.containerId === 'in_bxsdc';

        // Hide picker options for font, border, and shadow color pickers in floating picker
        if (isFontColorPicker || isBorderColorPicker || isShadowColorPicker) {
            const pickerOptions = container.querySelector('.picker-options');
            if (pickerOptions) {
                pickerOptions.style.display = 'none';
            }
        }

        // Create new iro instances in the cloned content
        const colorPickerEl = clonedContent.querySelector(`#colorPicker_${this.containerId}`);
        const hueSliderEl = clonedContent.querySelector(`#hueSlider_${this.containerId}`);
        const alphaSliderEl = clonedContent.querySelector(`#alphaSlider_${this.containerId}`);

        // Create the main color picker
        this.floatingColorPicker = new iro.ColorPicker(colorPickerEl, {
            width: 208,
            color: initialColor,
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 8,
            layout: [
                {
                    component: iro.ui.Box,
                    options: {
                        handleSize: 100
                    }
                }
            ]
        });

        // Handle object format with color and alpha
        if (typeof initialColor === 'object' && initialColor.color && typeof initialColor.alpha === 'number') {
            // Convert hex to RGB and set color with alpha
            const hex = initialColor.color.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);

            this.floatingColorPicker.color.set({
                r: r,
                g: g,
                b: b,
                a: initialColor.alpha
            });

            // Also update the opacity input in the UI
            const opacityInput = clonedContent.querySelector(`#opacityInput_${this.containerId}`);
            if (opacityInput) {
                opacityInput.value = Math.round(initialColor.alpha * 100);
            }
        }

        // Create hue slider
        const floatingHueSlider = new iro.ColorPicker(hueSliderEl, {
            width: 172,
            color: initialColor,
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 8,
            layout: [
                {
                    component: iro.ui.Slider,
                    options: {
                        sliderType: 'hue',
                        sliderSize: 16
                    }
                }
            ]
        });

        // Create alpha slider
        const floatingAlphaSlider = new iro.ColorPicker(alphaSliderEl, {
            width: 172,
            color: initialColor,
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 8,
            layout: [
                {
                    component: iro.ui.Slider,
                    options: {
                        sliderType: 'alpha',
                        sliderSize: 16
                    }
                }
            ]
        });

        // Handle object format with color and alpha for sliders
        if (typeof initialColor === 'object' && initialColor.color && typeof initialColor.alpha === 'number') {
            // Convert hex to RGB and set color with alpha for sliders
            const hex = initialColor.color.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);

            floatingHueSlider.color.set({
                r: r,
                g: g,
                b: b,
                a: initialColor.alpha
            });

            floatingAlphaSlider.color.set({
                r: r,
                g: g,
                b: b,
                a: initialColor.alpha
            });
        }

        // Store the stop index for this floating picker session
        this.floatingPickerStopIdx = stopIdx;

        // Sync the floating pickers - use the stored stopIdx that gets updated properly
        this.floatingColorPicker.on('color:change', (color) => {
            floatingHueSlider.color.set(color);
            floatingAlphaSlider.color.set(color);
            // Use the stored stop index, not the captured parameter
            if (this.floatingPickerStopIdx !== null && this.stops[this.floatingPickerStopIdx]) {
                this.stops[this.floatingPickerStopIdx].color = color.hexString;
                this.stops[this.floatingPickerStopIdx].opacity = color.alpha;
                this.renderGradient();
            }
        });

        floatingHueSlider.on('color:change', (color) => {
            this.floatingColorPicker.color.set(color);
            floatingAlphaSlider.color.set(color);
            // Use the stored stop index, not the captured parameter
            if (this.floatingPickerStopIdx !== null && this.stops[this.floatingPickerStopIdx]) {
                this.stops[this.floatingPickerStopIdx].color = color.hexString;
                this.stops[this.floatingPickerStopIdx].opacity = color.alpha;
                this.renderGradient();
            }
        });

        floatingAlphaSlider.on('color:change', (color) => {
            this.floatingColorPicker.color.set(color);
            floatingHueSlider.color.set(color);
            // Use the stored stop index, not the captured parameter
            if (this.floatingPickerStopIdx !== null && this.stops[this.floatingPickerStopIdx]) {
                this.stops[this.floatingPickerStopIdx].color = color.hexString;
                this.stops[this.floatingPickerStopIdx].opacity = color.alpha;
                this.renderGradient();
            }
        });

        // Hide on click outside
        this.boundHideFloatingPicker = this.hideFloatingColorPickerOnClick.bind(this);
        setTimeout(() => {
            document.addEventListener('mousedown', this.boundHideFloatingPicker);
        }, 0);

        // Setup format inputs for the floating picker
        this.setupFormatInputsForFloating(clonedContent, this.floatingColorPicker, (color) => {
            this.stops[stopIdx].color = color.hexString;
            this.stops[stopIdx].opacity = color.alpha;
            this.renderGradient();
        });

        // Add page colors section to floating picker
        const pageColorsSection = document.createElement('div');
        pageColorsSection.className = 'page-colors-section';
        pageColorsSection.innerHTML = `
            <div class="page-colors-header">
                <span class="page-colors-title">Page colors</span>
            </div>
            <div class="page-colors-grid" id="pageColorsGrid_floating_${this.containerId}">
                <!-- Page colors will be populated here -->
            </div>
        `;
        container.appendChild(pageColorsSection);

        // Populate page colors for floating picker
        this.populatePageColorsForFloating(container);

        // Initialize drag functionality for the floating picker
        this.initFloatingPickerDrag(container);
    }

    hideFloatingColorPickerOnClick(e) {
        if (!this.floatingPicker || !this.floatingPicker.contains(e.target)) {
            if (this.floatingPicker) {
                //this.floatingPicker.style.display = 'none';
            }
            // Remove the event listener
            // if (this.boundHideFloatingPicker) {
            //     document.removeEventListener('mousedown', this.boundHideFloatingPicker);
            //     this.boundHideFloatingPicker = null;
            // }
            // this.floatingColorPicker = null;
            // this.floatingPickerStopIdx = null;
        }
    }

    setupFormatInputsForFloating(root, picker, onColorChange) {
        const uniqueId = this.containerId;

        // Setup format selector for floating picker
        const formatSelect = root.querySelector(`#formatSelect_${uniqueId}`);
        if (formatSelect) {
            formatSelect.addEventListener('change', (e) => {
                this.showFormatInputs(e.target.value, root);
            });
        }

        // Set default format
        this.showFormatInputs('hex', root);

        // Setup input handlers for floating picker (without main picker functionality like hide/apply)
        this.setupInputHandlers(uniqueId, root, picker, false);

        // Setup eyedropper button for floating picker
        const eyeDropperBtn = root.querySelector('.eye-dropper-btn');
        if (eyeDropperBtn) {
            eyeDropperBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // console.log('Floating picker eyedropper button clicked');
                this.openEyeDropperForFloating(picker, onColorChange);
            });
        }

        // Setup color change handler
        picker.on('color:change', (color) => {
            this.updateColorDisplay(color, root);
            if (onColorChange) onColorChange(color);
        });
    }

    // Initialize drag functionality for main color picker
    initMainPickerDrag() {
        const header = this.container.querySelector('.picker-header');

        if (!header || !this.pickerElement) return;

        header.style.cursor = 'grab';

        header.addEventListener('mousedown', (e) => {
            // Only allow dragging if the picker is visible and positioned
            if (!this.isColorPickerShow || this.pickerElement.style.position !== 'fixed') {
                return;
            }

            // Don't drag if clicking on buttons or tabs
            if (e.target.classList.contains('picker-close-btn') ||
                e.target.classList.contains('picker-tab')) {
                return;
            }

            this.isDraggingMain = true;
            header.style.cursor = 'grabbing';

            // Get the current picker position from pickerElement
            const rect = this.pickerElement.getBoundingClientRect();
            this.dragState.currentX = rect.left;
            this.dragState.currentY = rect.top;

            // Get the initial mouse position
            this.dragState.initialMouseX = e.clientX;
            this.dragState.initialMouseY = e.clientY;

            e.preventDefault();
        });

        // Global mouse events for dragging
        document.addEventListener('mousemove', (e) => {
            if (!this.isDraggingMain) return;

            // Calculate the distance moved
            const dx = e.clientX - this.dragState.initialMouseX;
            const dy = e.clientY - this.dragState.initialMouseY;

            // Calculate new position
            let newX = this.dragState.currentX + dx;
            let newY = this.dragState.currentY + dy;

            // Get viewport and picker dimensions
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const pickerWidth = this.pickerElement.offsetWidth;
            const pickerHeight = this.pickerElement.offsetHeight;

            // Add padding and enforce boundaries
            const padding = 8;
            newX = Math.max(padding, Math.min(viewportWidth - pickerWidth - padding, newX));
            newY = Math.max(padding, Math.min(viewportHeight - pickerHeight - padding, newY));

            // Apply the new position to pickerElement (same as show() method does)
            this.pickerElement.style.left = `${newX}px`;
            this.pickerElement.style.top = `${newY}px`;
        });

        document.addEventListener('mouseup', () => {
            if (this.isDraggingMain) {
                this.isDraggingMain = false;
                const header = this.container.querySelector('.picker-header');
                if (header) {
                    header.style.cursor = 'grab';
                }
            }
        });
    }

    // Reset gradient state when selecting new elements
    resetGradientState() {
        // Clear existing stops
        this.stops = [];
        this.activeStopIdx = 0;
        this.nextStopId = 1;
        this.dragStopId = null;
        this.isDraggingStop = false;
        this.isSettingActiveStop = false;

        // Reset gradient direction
        this.gradientDirection = 'to right';

        // Clear any gradient-related UI
        const gradientWrapper = this.container.querySelector('#gradientPickerWrapper');
        if (gradientWrapper) {
            const stopsList = gradientWrapper.querySelector('#stopsList');
            if (stopsList) {
                stopsList.innerHTML = '';
            }

            const gradientCanvas = gradientWrapper.querySelector('#gradientCanvas');
            if (gradientCanvas) {
                const ctx = gradientCanvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, gradientCanvas.width, gradientCanvas.height);
                }
            }
        }
    }

    // Parse gradient CSS and set up gradient state
    parseGradientAndSetup(gradientCSS) {
        if (!gradientCSS || typeof gradientCSS !== 'string') return;

        // Clean up the gradient CSS by extracting only the gradient part
        // Remove additional properties like "0% 0% / auto repeat scroll padding-box border-box rgba(0, 0, 0, 0)"
        // Use a more robust approach to find the complete gradient function
        const gradientStart = gradientCSS.indexOf('linear-gradient(');
        if (gradientStart !== -1) {
            let parenCount = 0;
            let endIndex = gradientStart;
            for (let i = gradientStart; i < gradientCSS.length; i++) {
                if (gradientCSS[i] === '(') {
                    parenCount++;
                }
                if (gradientCSS[i] === ')') {
                    parenCount--;
                    if (parenCount === 0) {
                        endIndex = i;
                        break;
                    }
                }
            }
            if (endIndex > gradientStart) {
                gradientCSS = gradientCSS.substring(gradientStart, endIndex + 1);
            }
        } else {
            // Try radial gradient
            const radialStart = gradientCSS.indexOf('radial-gradient(');
            if (radialStart !== -1) {
                let parenCount = 0;
                let endIndex = radialStart;
                for (let i = radialStart; i < gradientCSS.length; i++) {
                    if (gradientCSS[i] === '(') parenCount++;
                    if (gradientCSS[i] === ')') parenCount--;
                    if (parenCount === 0) {
                        endIndex = i;
                        break;
                    }
                }
                if (endIndex > radialStart) {
                    gradientCSS = gradientCSS.substring(radialStart, endIndex + 1);
                }
            }
        }

        // Reset gradient state first
        this.resetGradientState();

        // Parse gradient type (only linear and radial)
        if (gradientCSS.includes('linear-gradient')) {
            this.gradientType = 'linear';
            this.gradientDirection = this.parseLinearGradientDirection(gradientCSS);
        } else if (gradientCSS.includes('radial-gradient')) {
            this.gradientType = 'radial';
            this.gradientDirection = 'radial';
        }

        // Parse color stops
        const stops = this.parseGradientStops(gradientCSS);
        if (stops.length > 0) {
            this.stops = stops;
            this.activeStopIdx = 0;
            this.nextStopId = Math.max(...stops.map(stop => stop.id)) + 1;

            // Update the gradient type dropdown to match the parsed type
            const gradientTypeSelect = this.container.querySelector('#gradientType');
            if (gradientTypeSelect) {
                gradientTypeSelect.value = this.gradientType;
            }

            // Render the gradient without triggering change event
            setTimeout(() => {
                this.renderGradient(false);
            }, 10);
        }
    }

    // Parse linear gradient direction
    parseLinearGradientDirection(gradientCSS) {
        const match = gradientCSS.match(/linear-gradient\(([^,]+),/);
        if (match) {
            const direction = match[1].trim();
            // Convert common directions to our format
            if (direction.includes('to right')) return 'to right';
            if (direction.includes('to left')) return 'to left';
            if (direction.includes('to top')) return 'to top';
            if (direction.includes('to bottom')) return 'to bottom';
            if (direction.includes('45deg')) return '45deg';
            if (direction.includes('90deg')) return '90deg';
            if (direction.includes('135deg')) return '135deg';
            if (direction.includes('180deg')) return '180deg';
            if (direction.includes('225deg')) return '225deg';
            if (direction.includes('270deg')) return '270deg';
            if (direction.includes('315deg')) return '315deg';
        }
        return 'to right'; // default
    }

    // Parse gradient color stops
    parseGradientStops(gradientCSS) {
        const stops = [];
        // More specific regex to avoid duplicate matches
        const stopRegex = /(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|rgba?\([^)]+\)|hsla?\([^)]+\))\s*(\d*%?)(?=\s*,|\s*\))/g;
        let match;
        let index = 0;
        let nextId = 1; // Use local ID counter

        while ((match = stopRegex.exec(gradientCSS)) !== null) {
            const color = match[1];
            const position = match[2] || '';

            let pos = 0;
            if (position.includes('%')) {
                pos = parseInt(position) || 0;
            } else {
                // Calculate position based on index
                if (index === 0) pos = 0;
                else if (index === 1) pos = 100;
                else pos = (index / (stops.length + 1)) * 100;
            }

            // Convert color to hex and extract opacity
            let hexColor = color;
            let opacity = 1; // Default opacity

            if (color.startsWith('rgba')) {
                // Parse RGBA color to extract opacity
                const rgbaMatch = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
                if (rgbaMatch) {
                    const r = parseInt(rgbaMatch[1]);
                    const g = parseInt(rgbaMatch[2]);
                    const b = parseInt(rgbaMatch[3]);
                    opacity = parseFloat(rgbaMatch[4]);
                    hexColor = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
                }
            } else if (color.startsWith('rgb')) {
                // Parse RGB color (opacity = 1)
                const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                if (rgbMatch) {
                    const r = parseInt(rgbMatch[1]);
                    const g = parseInt(rgbMatch[2]);
                    const b = parseInt(rgbMatch[3]);
                    hexColor = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
                }
            } else if (color.startsWith('hsla')) {
                // Parse HSLA color to extract opacity
                const hslaMatch = color.match(/hsla\((\d+),\s*(\d+)%,\s*(\d+)%,\s*([\d.]+)\)/);
                if (hslaMatch) {
                    const h = parseInt(hslaMatch[1]);
                    const s = parseInt(hslaMatch[2]);
                    const l = parseInt(hslaMatch[3]);
                    opacity = parseFloat(hslaMatch[4]);
                    hexColor = this.hslToHex(color);
                }
            } else if (color.startsWith('hsl')) {
                // Parse HSL color (opacity = 1)
                hexColor = this.hslToHex(color);
            }

            stops.push({
                id: nextId++,
                pos: pos,
                color: hexColor,
                opacity: opacity
            });

            index++;
        }

        return stops;
    }

    // Helper to convert RGB to hex
    rgbToHex(rgb) {
        const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (match) {
            const r = parseInt(match[1]);
            const g = parseInt(match[2]);
            const b = parseInt(match[3]);
            return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
        }
        return '#000000';
    }

    // Helper to convert HSL to hex (simplified)
    hslToHex(hsl) {
        // This is a simplified conversion - for full accuracy, you'd need a proper HSL to RGB conversion
        return '#000000'; // Placeholder
    }

    // Initialize drag functionality for floating color picker
    initFloatingPickerDrag(floatingContainer) {
        const header = floatingContainer.querySelector('.floating-picker-header');

        if (!header) return;

        header.style.cursor = 'grab';

        const mousedownHandler = (e) => {
            // Don't drag if clicking on buttons or tabs
            if (e.target.classList.contains('floating-picker-close-btn') ||
                e.target.classList.contains('picker-tab')) {
                return;
            }

            this.isDraggingFloating = true;
            header.style.cursor = 'grabbing';

            // Get the current floating picker position
            const rect = floatingContainer.getBoundingClientRect();
            this.dragState.currentX = rect.left;
            this.dragState.currentY = rect.top;

            // Get the initial mouse position
            this.dragState.initialMouseX = e.clientX;
            this.dragState.initialMouseY = e.clientY;

            e.preventDefault();
            e.stopPropagation(); // Prevent click outside handler from firing
        };

        const mousemoveHandler = (e) => {
            if (!this.isDraggingFloating) return;

            // Calculate the distance moved
            const dx = e.clientX - this.dragState.initialMouseX;
            const dy = e.clientY - this.dragState.initialMouseY;

            // Calculate new position
            let newX = this.dragState.currentX + dx;
            let newY = this.dragState.currentY + dy;

            // Get viewport and picker dimensions
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const pickerWidth = floatingContainer.offsetWidth;
            const pickerHeight = floatingContainer.offsetHeight;

            // Add padding and enforce boundaries
            const padding = 8;
            newX = Math.max(padding, Math.min(viewportWidth - pickerWidth - padding, newX));
            newY = Math.max(padding, Math.min(viewportHeight - pickerHeight - padding, newY));

            // Apply the new position
            floatingContainer.style.left = `${newX}px`;
            floatingContainer.style.top = `${newY}px`;
        };

        const mouseupHandler = () => {
            if (this.isDraggingFloating) {
                this.isDraggingFloating = false;
                header.style.cursor = 'grab';
            }
        };

        // Store handlers for cleanup
        this.floatingDragHandlers = {
            mousedown: mousedownHandler,
            mousemove: mousemoveHandler,
            mouseup: mouseupHandler
        };

        header.addEventListener('mousedown', mousedownHandler);
        document.addEventListener('mousemove', mousemoveHandler);
        document.addEventListener('mouseup', mouseupHandler);
    }

    switchToCustomTab() {
        const customTab = this.container.querySelector('#custom');
        const figmaTab = this.container.querySelector('#picker-figma-colors');

        if (customTab && figmaTab) {
            customTab.classList.add('active');
            figmaTab.classList.remove('active');
        }

        // Show main color selection area (solid picker by default)
        const solidPickerWrapper = this.container.querySelector('#solidPickerWrapper');
        const gradientPickerWrapper = this.container.querySelector('#gradientPickerWrapper');
        if (solidPickerWrapper) {
            solidPickerWrapper.style.display = 'block';
        }
        if (gradientPickerWrapper) {
            gradientPickerWrapper.style.display = 'none';
        }

        // Show page colors section
        const pageColorsSection = this.container.querySelector('.page-colors-section');
        if (pageColorsSection) {
            pageColorsSection.style.display = 'block';
        }

        // Check if this picker is for font color, border color, or shadow color
        // These pickers should not show picker-options (solid/gradient toggle)
        const isFontColorPicker = this.containerId === 'in_font_color';
        const isBorderColorPicker = this.containerId === 'in_border_color';
        const isShadowColorPicker = this.containerId === 'in_bxsdc';

        // Show picker options section only for background color picker
        const pickerOptions = this.container.querySelector('.picker-options');
        if (pickerOptions) {
            if (isFontColorPicker || isBorderColorPicker || isShadowColorPicker) {
                pickerOptions.style.display = 'none';
            } else {
                pickerOptions.style.display = 'flex';
            }
        }

        // Hide Figma colors section if it exists
        const figmaColorsSection = this.container.querySelector('.figma-colors-section');
        if (figmaColorsSection) {
            figmaColorsSection.style.display = 'none';
        }

        // Populate page colors
        this.populatePageColors();
    }

    switchToFigmaTab() {
        const customTab = this.container.querySelector('#custom');
        const figmaTab = this.container.querySelector('#picker-figma-colors');

        if (customTab && figmaTab) {
            figmaTab.classList.add('active');
            customTab.classList.remove('active');
        }

        // Hide main color selection area (solid, gradient, and image pickers)
        const solidPickerWrapper = this.container.querySelector('#solidPickerWrapper');
        const gradientPickerWrapper = this.container.querySelector('#gradientPickerWrapper');
        const imagePickerWrapper = this.container.querySelector('#imagePickerWrapper');
        if (solidPickerWrapper) {
            solidPickerWrapper.style.display = 'none';
        }
        if (gradientPickerWrapper) {
            gradientPickerWrapper.style.display = 'none';
        }
        if (imagePickerWrapper) {
            imagePickerWrapper.style.display = 'none';
        }

        // Hide page colors section
        const pageColorsSection = this.container.querySelector('.page-colors-section');
        if (pageColorsSection) {
            pageColorsSection.style.display = 'none';
        }

        // Check if this picker is for font color, border color, or shadow color
        // These pickers should not show picker-options (solid/gradient toggle)
        const isFontColorPicker = this.containerId === 'in_font_color';
        const isBorderColorPicker = this.containerId === 'in_border_color';
        const isShadowColorPicker = this.containerId === 'in_bxsdc';

        // Hide picker options section for all contexts in Figma tab
        // (This overrides the new Figma colors list logic as requested)
        const pickerOptions = this.container.querySelector('.picker-options');
        if (pickerOptions) {
            pickerOptions.style.display = 'none';
        }

        // Show and populate Figma colors section
        this.populateFigmaColors();
    }

    populateFigmaColors() {
        // Check if Figma colors section exists, if not create it
        let figmaColorsSection = this.container.querySelector('.figma-colors-section');
        if (!figmaColorsSection) {
            figmaColorsSection = document.createElement('div');
            figmaColorsSection.className = 'figma-colors-section';
            figmaColorsSection.innerHTML = `
                <div class="figma-colors-grid" id="figmaColorsGrid_${this.containerId}">
                    <!-- Figma colors will be populated here -->
                </div>
            `;

            // Insert after picker-options to replace the color picker area
            const pickerOptions = this.container.querySelector('.picker-options');
            if (pickerOptions) {
                pickerOptions.parentNode.insertBefore(figmaColorsSection, pickerOptions.nextSibling);
            }
        }

        // Show the section
        figmaColorsSection.style.display = 'block';

        const figmaColorsGrid = figmaColorsSection.querySelector(`#figmaColorsGrid_${this.containerId}`);
        if (!figmaColorsGrid) return;

        // Clear existing colors
        figmaColorsGrid.innerHTML = '';

        // Get Figma colors from global storage
        const figmaColors = Array.isArray(window.inspectaFigmaColors) ? window.inspectaFigmaColors : [];

        if (figmaColors.length === 0) {
            // Show message when no Figma colors are available
            const noColorsMessage = document.createElement('div');
            noColorsMessage.className = 'no-figma-colors-message';
            noColorsMessage.textContent = 'No Figma colors available. Paste Figma colors from the overview panel first.';
            noColorsMessage.style.cssText = `
                text-align: center;
                padding: 20px;
                color: var(--in-color-text-2);
                font-size: 12px;
            `;
            figmaColorsGrid.appendChild(noColorsMessage);
            return;
        }

        // Create color items for Figma colors (list format with swatch and hex value)
        figmaColors.forEach((color, index) => {
            const colorItem = document.createElement('div');
            colorItem.className = 'figma-color-item';

            const thumbnail = document.createElement('div');
            thumbnail.className = 'figma-color-thumbnail';
            thumbnail.style.cssText = `
                width: 16px;
                height: 16px;
                border-radius: 4px;
                background-color: ${color};
                border: 1px solid var(--in-color-divider);
                flex-shrink: 0;
            `;
            thumbnail.setAttribute('data-color', color);
            thumbnail.setAttribute('title', color);

            const hexValue = document.createElement('span');
            hexValue.className = 'figma-color-hex';
            hexValue.textContent = color;

            colorItem.appendChild(thumbnail);
            colorItem.appendChild(hexValue);

            // Add click handler to select color
            colorItem.addEventListener('click', () => {
                this.setColor(color);
                if (this.onColorChange) {
                    this.onColorChange({
                        hexString: color,
                        alpha: 1
                    });
                }
            });

            figmaColorsGrid.appendChild(colorItem);
        });

        // Update scrollbar if needed
        this.updatePageColorsScrollbar(figmaColorsGrid, figmaColors.length);
    }

    populateFigmaColorsForFloating(container) {
        // Check if Figma colors section exists, if not create it
        let figmaColorsSection = container.querySelector('.figma-colors-section');
        if (!figmaColorsSection) {
            figmaColorsSection = document.createElement('div');
            figmaColorsSection.className = 'figma-colors-section';
            figmaColorsSection.innerHTML = `
                <div class="figma-colors-grid" id="figmaColorsGrid_floating_${this.containerId}">
                    <!-- Figma colors will be populated here -->
                </div>
            `;

            // Insert after the header but before the cloned content
            // This ensures Figma colors appear in the content area below the tabs
            const header = container.querySelector('.floating-picker-header');
            if (header) {
                container.insertBefore(figmaColorsSection, header.nextSibling);
            } else {
                // Fallback: insert at the beginning if header not found
                container.insertBefore(figmaColorsSection, container.firstChild);
            }
        }

        // Show the section
        figmaColorsSection.style.display = 'block';

        const figmaColorsGrid = figmaColorsSection.querySelector(`#figmaColorsGrid_floating_${this.containerId}`);
        if (!figmaColorsGrid) return;

        // Clear existing colors
        figmaColorsGrid.innerHTML = '';

        // Get Figma colors from global storage
        const figmaColors = Array.isArray(window.inspectaFigmaColors) ? window.inspectaFigmaColors : [];

        if (figmaColors.length === 0) {
            // Show message when no Figma colors are available - match main picker styling
            const noColorsMessage = document.createElement('div');
            noColorsMessage.className = 'no-figma-colors-message';
            noColorsMessage.textContent = 'No Figma colors available. Paste Figma colors from the overview panel first.';
            noColorsMessage.style.cssText = `
                text-align: center;
                padding: 20px;
                color: var(--in-color-text-2);
                font-size: 12px;
                line-height: 1.4;
                max-width: 200px;
            `;
            figmaColorsGrid.appendChild(noColorsMessage);
            return;
        }

        // Create color items for Figma colors (list format with swatch and hex value)
        figmaColors.forEach((color, index) => {
            const colorItem = document.createElement('div');
            colorItem.className = 'figma-color-item';

            const thumbnail = document.createElement('div');
            thumbnail.className = 'figma-color-thumbnail';
            thumbnail.style.cssText = `
                width: 16px;
                height: 16px;
                border-radius: 4px;
                background-color: ${color};
                border: 1px solid var(--in-color-divider);
                flex-shrink: 0;
            `;
            thumbnail.setAttribute('data-color', color);
            thumbnail.setAttribute('title', color);

            const hexValue = document.createElement('span');
            hexValue.className = 'figma-color-hex';
            hexValue.textContent = color;

            colorItem.appendChild(thumbnail);
            colorItem.appendChild(hexValue);

            // Add click handler to select color for floating picker
            colorItem.addEventListener('click', () => {
                if (this.floatingColorPicker) {
                    this.floatingColorPicker.color.set(color);
                }
                // Update the stop color if this is for a gradient stop
                if (this.floatingPickerStopIdx !== null && this.stops[this.floatingPickerStopIdx]) {
                    this.stops[this.floatingPickerStopIdx].color = color;
                    this.stops[this.floatingPickerStopIdx].opacity = 1;
                    this.renderGradient();
                }
            });

            figmaColorsGrid.appendChild(colorItem);
        });

        // Update scrollbar if needed
        this.updatePageColorsScrollbar(figmaColorsGrid, figmaColors.length);
    }
}

// Export for use in other files
if (typeof window !== 'undefined') {
    window.InspectaColorPicker = InspectaColorPicker;
} 