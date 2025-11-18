'use strict';
let hostname = window.location.hostname;
let isStoreCss = true;
let inspectaCss = '';
let applyCssChanges = true;

// Make isStoreCss available globally
window.isStoreCss = isStoreCss;
let target;
let targetStyles;
let pnl_properties;
let properties_list;
let btn_close_properties;
let btn_properties_position;

let tab_properties;
let tab_changes;
let tab_compare;
let tab_overlay;

let pnl_changes;
let pnl_properties_content;
let pnl_compare;

let domTreeVisualizer;
/*
SECONDARY PANELS
*/

// let tab_compare_img;
// let tab_compare_properties;
//let pnl_compare_css;

let pnl_overview;
let btn_back;
let pnl_title;
let inspectMode = true;
let shadow;
let elementToolbar;
let pathNavigator;
chrome.runtime.onMessage.addListener(messageReciver);

// //---HOT SWAP--- REMOVE BEFORE DEPLOYMENT
// chrome.commands.onCommand.addListener((shortcut) => {
//   console.log('lets reload');
//   console.log(shortcut);
//   if(shortcut.includes("+M")) {
//       chrome.runtime.reload();
//   }
// })
// //-------------------------------------

// syncCSS(); //if we want to load the saved css from the storage if the instpecta app is not open

function messageReciver(message, sender, sendResponse) {
  if (message === 'toggle_app') {
    if (appToggle) {
      // FULL CLEANUP
      ensureInspectaUIState(false);
      appToggle = false;
      mainAppToggle = false;
      inspectMode = false;
      window.previewMode = false;
    } else {
      // Always create a fresh instance of the app
      ensureInspectaUIState(true);
      appToggle = true;
      mainAppToggle = true;
      inspectMode = true;
      window.previewMode = false;
    }
    if (typeof sendResponse === 'function') sendResponse({ status: 'ok' });
  } else if (message === 'check_inspecta_status') {
    // Respond to status check - if this function exists, scripts are injected
    if (typeof sendResponse === 'function') sendResponse({ status: 'inspecta_loaded' });
  }
}

function initInspector() {
  // Note: Cursor styles are now handled in the shadow DOM to prevent layout shifts

  // Initialize inspector state
  document.querySelectorAll('body > *').forEach(element => {
    // Skip inspector UI elements
    if (element.id === 'inspecta_app_container' ||
      element.closest('#inspecta_app_container') ||
      element.id === 'inspecta-rg-overlay' ||
      element.closest('#inspecta-rg-overlay')) {
      return;
    }

    // Store original styles if not already stored
    if (!element._inspectaOriginalStyles) {
      element._inspectaOriginalStyles = {
        display: element.style.display,
        position: element.style.position,
        zIndex: element.style.zIndex,
        // Removed outline and outlineOffset from original styles
      };
    }

    // Remove any existing event listeners first
    element.removeEventListener('mouseover', addInspector);
    element.removeEventListener('mouseout', removeInspector);
    element.removeEventListener('click', selectElement);
    element.removeEventListener('mousedown', preventInteractions);
    element.removeEventListener('mouseup', preventInteractions);
    element.removeEventListener('keydown', preventInteractions);

    // Add inspector event listeners
    element.addEventListener('mouseover', addInspector);
    element.addEventListener('mouseout', removeInspector);
    element.addEventListener('click', selectElement, true);
  });

  // Initialize window event listeners
  addWindowListeners();

  // Remove overlays on scroll, except for selected element overlays
  function removeInspectaOverlaysExceptSelected() {
    document.querySelectorAll('.inspecta-margin-overlay, .inspecta-padding-overlay, .inspecta-gap-overlay').forEach(el => {
      if (!el.hasAttribute('data-inspecta-selected')) {
        el.remove();
      }
    });
  }
  window.addEventListener('scroll', removeInspectaOverlaysExceptSelected, true);
}

function showInspectaApp() {
  // First check if the app container exists
  const appContainer = document.getElementById('inspecta_app_container');

  if (!appContainer) {
    // If container doesn't exist, create the app
    createInspectaApp();
    return;
  }

  // Clean up any existing elements and states
  document.querySelectorAll('.inspecta-lines-distance-x, .inspecta-lines-distance-y, .inspecta-lines-distance-label-x, .inspecta-lines-distance-label-y, .inspecta-lines-top, .inspecta-lines-bottom, .inspecta-lines-left, .inspecta-lines-right').forEach(el => {
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  });

  // Remove all event listeners
  document.querySelectorAll('body > *').forEach(element => {
    if (element.id === 'inspecta_app_container' ||
      element.closest('#inspecta_app_container') ||
      element.id === 'inspecta-rg-overlay' ||
      element.closest('#inspecta-rg-overlay')) {
      return;
    }

    element.removeEventListener('mouseover', addInspector);
    element.removeEventListener('mouseout', removeInspector);
    element.removeEventListener('click', selectElement);
    element.classList.remove('inspecta-inspect', 'inspecta-inspect-active', 'inspecta-inspect-isolated');
    element.style.pointerEvents = null;
  });

  // Reinitialize all panel references and bottom bar elements
  initObjects();
  initBottomBar();

  // Show the app container and the app itself
  appContainer.style.display = 'block';

  const app = document.getElementById('inspecta_app');
  if (app) {
    app.style.display = 'block';
  }

  // Restore saved text changes FIRST (before CSS to avoid conflicts)
  setTimeout(async () => {
    if (window.textEditor && typeof window.textEditor.restoreAllSavedChangesWhenReady === 'function') {
      window.textEditor.restoreAllSavedChangesWhenReady();
    }

    // Restore images from storage
    if (window.inspectaImageStorage && window.inspectaImageStorage.restore) {
      window.inspectaImageStorage.restore();
    }

    // Wait for text restoration to complete, then restore CSS
    setTimeout(async () => {
      console.log('Starting CSS restoration in showInspectaApp...');
      await syncCSS();
      console.log('CSS restoration completed in showInspectaApp');

      const stylesheet = document.getElementById('inspectaStylesheet');
      if (stylesheet && stylesheet.sheet) {
        stylesheet.sheet.disabled = false;
      }
    }, 500);
  }, 1000);

  // Always update the CSS panel after CSS is applied
  setTimeout(() => {
    if (typeof generateInspectaFullCss === 'function') generateInspectaFullCss();
    if (typeof generateCssChangesCounter === 'function') generateCssChangesCounter();
  }, 500);

  // Reset all states
  appToggle = false;
  mainAppToggle = false;
  inspectMode = false;
  window.previewMode = false;
  enableDistances = false;
  target = null;

  // Reset all buttons
  if (btn_distances) btn_distances.classList.remove("inspecta-active");
  if (btn_ruler) btn_ruler.classList.remove("inspecta-active");
  if (btn_outline) btn_outline.classList.remove("inspecta-active");
  if (btn_eye_dropper) btn_eye_dropper.classList.remove("inspecta-active");
  if (btn_view_overlay) btn_view_overlay.classList.remove("inspecta-active");

  // Initialize inspector functionality
  initInspector();

  // Apply inspector
  applyInspector();
}

async function createInspectaApp() {
  // Clean up existing tooltip instance if it exists
  if (window.tooltipManager) {
    // Remove all tooltips and their event listeners
    if (window.shadow) {
      window.shadow.querySelectorAll('[id]').forEach(button => {
        const tooltip = button.querySelector('.tooltip');
        if (tooltip) {
          // Remove event listeners
          button.removeEventListener('mouseenter', () => { });
          button.removeEventListener('mouseleave', () => { });
          // Remove tooltip element
          tooltip.remove();
        }
      });
    }
    // Clear the tooltip manager instance
    window.tooltipManager = null;
  }

  // Remove existing app container if it exists
  const existingContainer = document.getElementById('inspecta_app_container');
  if (existingContainer) {
    existingContainer.remove();
  }

  fetch(chrome.runtime.getURL('/index.html')).then(r => r.text()).then(async html => {
    const svgsContent = await fetch(chrome.runtime.getURL('/svgs.html')).then(r => r.text());
    const cssContent = await fetch(chrome.runtime.getURL('/css/style.css')).then(r => r.text());
    const rulerGuidesCSSContent = await fetch(chrome.runtime.getURL('/css/ruler-guides.css')).then(r => r.text());
    const simpleBarCSSContent = await fetch(chrome.runtime.getURL('/css/simplebar.min.css')).then(r => r.text());

    // Load Inter font in the main document first
    if (!document.getElementById('inspecta-inter-font-main')) {
      const link = document.createElement('link');
      link.id = 'inspecta-inter-font-main';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
      document.head.appendChild(link);

      // Add success and error handling for main document font loading
      link.onload = () => {
        // console.log('Inter font loaded successfully in main document');
        // Check if font is actually available
        if ('fonts' in document) {
          document.fonts.load('400 16px Inter').then(() => {
            // console.log('Inter font confirmed available in main document');
          }).catch(() => {
            console.warn('Inter font not confirmed available in main document');
          });
        }
      };

      link.onerror = () => {
        console.warn('Failed to load Inter font in main document');
      };
    }

    const INSPECTAAPPCONTAINER = document.createElement('div');
    INSPECTAAPPCONTAINER.setAttribute('id', 'inspecta_app_container');

    document.body.appendChild(INSPECTAAPPCONTAINER);
    shadow = INSPECTAAPPCONTAINER.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = cssContent;

    const styleRulerGuide = document.createElement('style');
    styleRulerGuide.textContent = rulerGuidesCSSContent;
    shadow.appendChild(styleRulerGuide);

    shadow.appendChild(style);


    // Load Inter font in shadow DOM using a different approach
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
    shadow.appendChild(fontLink);

    // Wait for font to load before proceeding
    fontLink.onload = () => {
      // Font loaded successfully
      // console.log('Inter font loaded in shadow DOM');

      // Use Font Loading API to ensure font is actually available
      if ('fonts' in document) {
        document.fonts.load('400 16px Inter').then(() => {
          // console.log('Inter font confirmed loaded via Font Loading API');
        }).catch(() => {
          console.warn('Inter font not confirmed via Font Loading API');
        });
      }
    };

    fontLink.onerror = () => {
      console.warn('Failed to load Inter font in shadow DOM, using fallback fonts');
      // Add fallback font loading as backup
      const fallbackFontLink = document.createElement('link');
      fallbackFontLink.rel = 'stylesheet';
      fallbackFontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=block';
      shadow.appendChild(fallbackFontLink);
    };

    const scriptSimpleBar = document.createElement('script');
    scriptSimpleBar.src = chrome.runtime.getURL('/js/simplebar.min.js');
    shadow.appendChild(scriptSimpleBar);

    const scriptTooltips = document.createElement('script');
    scriptTooltips.src = chrome.runtime.getURL('/js/tooltips.js');
    shadow.appendChild(scriptTooltips);

    var link1 = document.createElement("link");
    link1.type = "text/css";
    link1.rel = "stylesheet";
    link1.href = chrome.runtime.getURL('/css/inspecta-color-picker.css');
    shadow.appendChild(link1);

    var link2 = document.createElement("link");
    link2.type = "text/css";
    link2.rel = "stylesheet";
    link2.href = chrome.runtime.getURL('/css/simplebar.min.css');
    shadow.appendChild(link2);

    var head = document.head;

    const INSPECTAAPP = document.createElement('div');
    INSPECTAAPP.setAttribute('id', 'inspecta_app');
    INSPECTAAPP.setAttribute('contenteditable', 'false');
    INSPECTAAPP.innerHTML = html + svgsContent;
    shadow.appendChild(INSPECTAAPP);

    // Make shadow DOM available globally
    window.shadow = shadow;

    // Initialize tooltips after shadow DOM is created
    scriptTooltips.onload = () => {
      // Wait for DOM to be ready
      setTimeout(() => {
        window.tooltipManager = new TooltipManager();
        window.textEditor = new TextEditor();
        // Reinitialize tooltips after a longer delay to catch dynamically loaded content
        setTimeout(() => {
          if (window.tooltipManager) {
            window.tooltipManager.initializeTooltips();
          }
        }, 500);
      }, 100);
    };

    // Initialize the app
    init();

    // Restore saved text changes FIRST (before CSS to avoid conflicts)
    setTimeout(async () => {
      if (window.textEditor && typeof window.textEditor.restoreAllSavedChangesWhenReady === 'function') {
        window.textEditor.restoreAllSavedChangesWhenReady();
      }

      // Wait for text restoration to complete, then restore CSS
      setTimeout(async () => {
        await syncCSS();

        // Ensure stylesheet is enabled after restoration
        const stylesheet = document.getElementById('inspectaStylesheet');
        if (stylesheet && stylesheet.sheet) {
          stylesheet.sheet.disabled = false;
        }
      }, 500);
    }, 1000);

    // Update Send to Cursor button states based on localhost
    setTimeout(() => {
      if (typeof window.updateSendToCursorButtons === 'function') {
        window.updateSendToCursorButtons();
      }
    }, 1000);

    // Always update the CSS panel after CSS is applied
    setTimeout(() => {
      if (typeof generateInspectaFullCss === 'function') generateInspectaFullCss();
      if (typeof generateCssChangesCounter === 'function') generateCssChangesCounter();
    }, 800);

    // Apply inspector
    applyInspector();
  }).catch(error => {
    console.log('createInspectaApp error', error);
  });
}


let appToggle = false;
let mainAppToggle = false;

function initObjects() {
  pnl_properties = shadow.querySelector("#pnl_properties");
  btn_close_properties = shadow.querySelector("#btn_close_properties_pnl");
  btn_properties_position = shadow.querySelector("#btn_properties_position");
  btn_back = shadow.querySelector("#btn_back");
  pnl_title = shadow.querySelector("#pnl_title");
  tab_properties = shadow.querySelector("#tab_properties");
  tab_changes = shadow.querySelector("#tab_changes");
  tab_overlay = shadow.querySelector("#tab_overlay");
  pnl_changes = shadow.querySelector("#pnl_changes");
  pnl_properties_content = shadow.querySelector("#pnl_properties_content");
  pnl_overlay = shadow.querySelector("#pnl_overlay");
  createInspectaStylesheet(inspectaCss);
}

function init() {
  initObjects();
  initBottomBar();
  initChanges();
  initProperties();
  inputsEventRegister();
  initRuler();
  initOverlay();
  initElementSiblings();
  initElementParenChild();
  initPageOverview();
  initDraggablePanel();
  initFigmaIntegration();
  initPropertyDelete();
  // Initialize SimpleBar on appropriate elements
  if (typeof SimpleBar !== 'undefined') {
    new SimpleBar(shadow.querySelector('#pnl_navigator_dom_tree'));
    new SimpleBar(shadow.querySelector('.properties_list'));
  }
  initResizeObserver();

  // Call updateColorMismatchUI after all initialization is complete
  setTimeout(() => {
    if (typeof window.updateColorMismatchUI === 'function') {
      window.updateColorMismatchUI();
    }
    // Also update property change indicators after initialization
    if (typeof window.updatePropertyChangeIndicators === 'function') {
      window.updatePropertyChangeIndicators();
    }
  }, 100);

  //Initialize width input with unit dropdown
  const widthInput = shadow.querySelector('#in_width');
  if (widthInput) {
    const widthUnitHint = document.createElement('span');
    widthUnitHint.id = 'widthUnitHint';
    widthUnitHint.className = 'unit-hint';
    widthUnitHint.textContent = 'px';
    // Insert unit hint as sibling after the input
    widthInput.parentNode.insertBefore(widthUnitHint, widthInput.nextSibling);
    setupUnitInputWidget({
      input: widthInput,
      unitHint: widthUnitHint,
      property: 'width',
      getTarget: () => target,
      generateCss: (property, value) => {
        const match = value.match(/^([\d.]+)(px|em|rem|%|vw|vh)$/i);
        if (target && match && window.elementUnitMaps[property]) {
          window.elementUnitMaps[property].set(target, { value: match[1], unit: match[2] });
        }
        generateInspectaCss(property, value);
      },
      allowedUnits: ['px', 'em', 'rem', '%', 'vw', 'vh', 'auto']
    });
  }

  // Initialize height input with unit dropdown
  const heightInput = shadow.querySelector('#in_height');
  if (heightInput) {
    const heightUnitHint = document.createElement('span');
    heightUnitHint.id = 'heightUnitHint';
    heightUnitHint.className = 'unit-hint';
    heightUnitHint.textContent = 'px';
    // Insert unit hint as sibling after the input
    heightInput.parentNode.insertBefore(heightUnitHint, heightInput.nextSibling);
    setupUnitInputWidget({
      input: heightInput,
      unitHint: heightUnitHint,
      property: 'height',
      getTarget: () => target,
      generateCss: (property, value) => {
        const match = value.match(/^([\d.]+)(px|em|rem|%|vw|vh)$/i);
        if (target && match && window.elementUnitMaps[property]) {
          window.elementUnitMaps[property].set(target, { value: match[1], unit: match[2] });
        }
        generateInspectaCss(property, value);
      },
      allowedUnits: ['px', 'em', 'rem', '%', 'vw', 'vh', 'auto']
    });
  }

  // Initialize min-width input with unit dropdown
  const minWidthInput = shadow.querySelector('#in_min_width');
  if (minWidthInput) {
    const minWidthUnitHint = document.createElement('span');
    minWidthUnitHint.id = 'minWidthUnitHint';
    minWidthUnitHint.className = 'unit-hint';
    minWidthUnitHint.textContent = 'px';
    // Insert unit hint as sibling after the input
    minWidthInput.parentNode.insertBefore(minWidthUnitHint, minWidthInput.nextSibling);
    setupUnitInputWidget({
      input: minWidthInput,
      unitHint: minWidthUnitHint,
      property: 'min-width',
      getTarget: () => target,
      generateCss: (property, value) => {
        const match = value.match(/^([\d.]+)(px|em|rem|%|vw|vh)$/i);
        if (target && match && window.elementUnitMaps[property]) {
          window.elementUnitMaps[property].set(target, { value: match[1], unit: match[2] });
        }
        generateInspectaCss(property, value);
      },
      allowedUnits: ['px', 'em', 'rem', '%', 'vw', 'vh', 'auto', 'none']
    });
  }

  // Initialize max-width input with unit dropdown
  const maxWidthInput = shadow.querySelector('#in_max_width');
  if (maxWidthInput) {
    const maxWidthUnitHint = document.createElement('span');
    maxWidthUnitHint.id = 'maxWidthUnitHint';
    maxWidthUnitHint.className = 'unit-hint';
    maxWidthUnitHint.textContent = 'px';
    // Insert unit hint as sibling after the input
    maxWidthInput.parentNode.insertBefore(maxWidthUnitHint, maxWidthInput.nextSibling);
    setupUnitInputWidget({
      input: maxWidthInput,
      unitHint: maxWidthUnitHint,
      property: 'max-width',
      getTarget: () => target,
      generateCss: (property, value) => {
        const match = value.match(/^([\d.]+)(px|em|rem|%|vw|vh)$/i);
        if (target && match && window.elementUnitMaps[property]) {
          window.elementUnitMaps[property].set(target, { value: match[1], unit: match[2] });
        }
        generateInspectaCss(property, value);
      },
      allowedUnits: ['px', 'em', 'rem', '%', 'vw', 'vh', 'auto', 'none']
    });
  }

  // Initialize gap input with unit dropdown
  const gapInput = shadow.querySelector('#in_gap');
  if (gapInput) {
    const gapUnitHint = document.createElement('span');
    gapUnitHint.id = 'gapUnitHint';
    gapUnitHint.className = 'unit-hint';
    gapUnitHint.textContent = 'px';
    // Insert unit hint as sibling after the input
    gapInput.parentNode.insertBefore(gapUnitHint, gapInput.nextSibling);
    setupUnitInputWidget({
      input: gapInput,
      unitHint: gapUnitHint,
      property: 'gap',
      getTarget: () => target,
      generateCss: (property, value) => {
        const match = value.match(/^([\d.]+)(px|em|rem|%|vw|vh)$/i);
        if (target && match && window.elementUnitMaps[property]) {
          window.elementUnitMaps[property].set(target, { value: match[1], unit: match[2] });
        }
        generateInspectaCss(property, value);
      },
      allowedUnits: ['px', 'em', 'rem', '%', 'vw', 'vh']
    });

    // Initialize gap slider
    const gapSlider = shadow.querySelector('#gapSlider');
    if (gapSlider) {
      // Set initial slider value from input
      const match = gapInput.value.match(/^([\d.]+)/);
      if (match) {
        gapSlider.value = match[1];
      }

      // Update input when slider changes
      gapSlider.addEventListener('input', function () {
        gapInput.value = this.value;
        // Trigger the CSS generation with the current unit
        const unit = gapUnitHint.textContent;
        const fullValue = this.value + unit;
        generateInspectaCss('gap', fullValue);
      });

      // Update slider when input changes
      gapInput.addEventListener('input', function () {
        const match = this.value.match(/^([\d.]+)/);
        if (match) {
          gapSlider.value = match[1];
        }
      });
    }
  }

  // Initialize opacity slider
  const opacitySlider = shadow.querySelector('#opacitySlider');
  const opacityInput = shadow.querySelector('#in_el_opac');
  if (opacitySlider && opacityInput) {
    // Set initial slider value from input
    if (opacityInput.value) {
      opacitySlider.value = opacityInput.value;
    }

    // Update input when slider changes
    opacitySlider.addEventListener('input', function () {
      opacityInput.value = this.value;
      // Trigger the CSS generation
      const opacityValue = parseFloat(this.value / 100);
      generateInspectaCss('opacity', opacityValue);
    });

    // Update slider when input changes
    opacityInput.addEventListener('input', function () {
      opacitySlider.value = this.value;
    });

    // Store references for later updates
    window.opacitySlider = opacitySlider;
    window.opacityInput = opacityInput;
  }

  // Initialize border radius slider
  const radiusSlider = shadow.querySelector('#radiusSlider');
  const radiusInput = shadow.querySelector('#in_radius');
  if (radiusSlider && radiusInput) {
    // Set initial slider value from input
    const match = radiusInput.value.match(/^([\d.]+)/);
    if (match) {
      radiusSlider.value = match[1];
    }

    // Update input when slider changes
    radiusSlider.addEventListener('input', function () {
      radiusInput.value = this.value;
      // Trigger the same behavior as the main input
      const event = { target: radiusInput };
      borderRadiusChange(event);
    });

    // Update slider when input changes
    radiusInput.addEventListener('input', function () {
      const match = this.value.match(/^([\d.]+)/);
      if (match) {
        radiusSlider.value = match[1];
      }
    });
  }

  // Initialize min-height input with unit dropdown
  const minHeightInput = shadow.querySelector('#in_min_height');
  if (minHeightInput) {
    if (!minHeightInput.parentElement.classList.contains('unit-input-wrapper')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'unit-input-wrapper';
      minHeightInput.parentNode.insertBefore(wrapper, minHeightInput);
      wrapper.appendChild(minHeightInput);
    }
    const minHeightUnitHint = document.createElement('span');
    minHeightUnitHint.id = 'minHeightUnitHint';
    minHeightUnitHint.className = 'unit-hint';
    minHeightUnitHint.textContent = 'px';
    setupUnitInputWidget({
      input: minHeightInput,
      unitHint: minHeightUnitHint,
      property: 'min-height',
      getTarget: () => target,
      generateCss: (property, value) => {
        const match = value.match(/^([\d.]+)(px|em|rem|%|vw|vh)$/i);
        if (target && match && window.elementUnitMaps[property]) {
          window.elementUnitMaps[property].set(target, { value: match[1], unit: match[2] });
        }
        generateInspectaCss(property, value);
      },
      allowedUnits: ['px', 'em', 'rem', '%', 'vw', 'vh', 'auto', 'none']
    });
  }

  // Initialize max-height input with unit dropdown
  const maxHeightInput = shadow.querySelector('#in_max_height');
  if (maxHeightInput) {
    const maxHeightUnitHint = document.createElement('span');
    maxHeightUnitHint.id = 'maxHeightUnitHint';
    maxHeightUnitHint.className = 'unit-hint';
    maxHeightUnitHint.textContent = 'px';
    // Insert unit hint as sibling after the input
    maxHeightInput.parentNode.insertBefore(maxHeightUnitHint, maxHeightInput.nextSibling);
    setupUnitInputWidget({
      input: maxHeightInput,
      unitHint: maxHeightUnitHint,
      property: 'max-height',
      getTarget: () => target,
      generateCss: (property, value) => {
        const match = value.match(/^([\d.]+)(px|em|rem|%|vw|vh)$/i);
        if (target && match && window.elementUnitMaps[property]) {
          window.elementUnitMaps[property].set(target, { value: match[1], unit: match[2] });
        }
        generateInspectaCss(property, value);
      },
      allowedUnits: ['px', 'em', 'rem', '%', 'vw', 'vh', 'auto', 'none']
    });
  }

  // Initialize distances as disabled
  enableDistances = false;
  hideDistances();
  if (btn_distances) {
    btn_distances.classList.remove("inspecta-active");
  }
  if (bottom_toolbar_toggle_fill) {
    bottom_toolbar_toggle_fill.classList.remove("fill_active");
  }

  // --- Font size unit memory per element ---
  const elementFontSizeUnits = new WeakMap();

  const fontSizeInput = shadow.querySelector('#in_font_size');
  if (fontSizeInput) {
    const fontSizeUnitHint = document.createElement('span');
    fontSizeUnitHint.id = 'fontSizeUnitHint';
    fontSizeUnitHint.className = 'unit-hint';
    fontSizeUnitHint.textContent = 'px';
    // Insert unit hint as sibling after the input
    fontSizeInput.parentNode.insertBefore(fontSizeUnitHint, fontSizeInput.nextSibling);
    setupUnitInputWidget({
      input: fontSizeInput,
      unitHint: fontSizeUnitHint,
      property: 'font-size',
      getTarget: () => target,
      generateCss: (property, value) => {
        // Save the value and unit for this element
        const match = value.match(/^([\d.]+)(px|em|rem|%|vw|vh)$/i);
        if (target && match && window.elementUnitMaps[property]) {
          window.elementUnitMaps[property].set(target, { value: match[1], unit: match[2] });
        }
        generateInspectaCss(property, value);
      },
      allowedUnits: ['px', 'em', 'rem', '%', 'vw', 'vh', 'auto']
    });
  }

  //In init(), add for line-height:
  const lineHeightInput = shadow.querySelector('#in_line_height');
  if (lineHeightInput) {
    const lineHeightUnitHint = document.createElement('span');
    lineHeightUnitHint.id = 'lineHeightUnitHint';
    lineHeightUnitHint.className = 'unit-hint';
    lineHeightUnitHint.textContent = 'px';
    // Insert unit hint as sibling after the input
    lineHeightInput.parentNode.insertBefore(lineHeightUnitHint, lineHeightInput.nextSibling);
    setupUnitInputWidget({
      input: lineHeightInput,
      unitHint: lineHeightUnitHint,
      property: 'line-height',
      getTarget: () => target,
      generateCss: (property, value) => {
        // Save the value and unit for this element
        const match = value.match(/^([\d.]+)(px|em|rem|%)$/i);
        if (target && match && window.elementUnitMaps[property]) {
          window.elementUnitMaps[property].set(target, { value: match[1], unit: match[2] });
        } else if (target && value === 'normal' && window.elementUnitMaps[property]) {
          window.elementUnitMaps[property].set(target, { value: 'normal', unit: 'normal' });
          if (unitHint) unitHint.textContent = '-';
        }
        generateInspectaCss(property, value);
      },
      allowedUnits: ['px', 'em', 'rem', '%', 'normal']
    });
  }

  const letterSpacingInput = shadow.querySelector('#in_letter_spacing');
  if (letterSpacingInput) {
    const letterSpacingUnitHint = document.createElement('span');
    letterSpacingUnitHint.id = 'letterSpacingUnitHint';
    letterSpacingUnitHint.className = 'unit-hint';
    letterSpacingUnitHint.textContent = 'px';
    // Insert unit hint as sibling after the input
    letterSpacingInput.parentNode.insertBefore(letterSpacingUnitHint, letterSpacingInput.nextSibling);
    setupUnitInputWidget({
      input: letterSpacingInput,
      unitHint: letterSpacingUnitHint,
      property: 'letter-spacing',
      getTarget: () => target,
      generateCss: (property, value) => {
        // Save the value and unit for this element
        const match = value.match(/^([\d.]+)(px|em|rem)$/i);
        if (target && match && window.elementUnitMaps[property]) {
          window.elementUnitMaps[property].set(target, { value: match[1], unit: match[2] });
        } else if (target && value === 'normal' && window.elementUnitMaps[property]) {
          window.elementUnitMaps[property].set(target, { value: 'normal', unit: 'normal' });
        }
        generateInspectaCss(property, value);
      },
      allowedUnits: ['px', 'em', 'rem', 'normal']
    });
  }


  // Call this to ensure the close button works
  initNavigatorCloseButton();
  initImageOverlayCloseButton();
}

function initImageOverlayCloseButton() {
  if (!shadow) return;
  const btnImgOverlayClose = shadow.querySelector('#btn_img_overlay_close');
  const btnViewOverlay = shadow.querySelector('#btn_view_overlay');
  if (btnImgOverlayClose && btnViewOverlay) {
    btnImgOverlayClose.addEventListener('click', () => {
      // Trigger the same logic as the overlay toggle
      btnViewOverlay.click();
    });
  }
}

function showEyeDropper() {
  const eyeDropper = new EyeDropper();
  const eyeDropperResultBg = $id('eye_dropper_result_bg');
  const eyeDropperResultElement = $id('eye_dropper_result');
  const eyeDropperResultThumb = $id('eye_dropper_result_thumb');
  const eyeDropperCopy = $id('eye_dropper_copy');
  const eyeDropperClose = $id('btn_close_eye_dropper');
  eyeDropper
    .open()
    .then((result) => {
      eyeDropperResultBg.style.display = 'flex';
      eyeDropperResultElement.textContent = result.sRGBHex;
      eyeDropperResultThumb.style.backgroundColor = result.sRGBHex;
      eyeDropperCopy.style.display = 'block';
      navigator.clipboard.writeText(eyeDropperResultElement.textContent);

      setTimeout(function () {
        eyeDropperResultBg.style.display = 'none';
      }, 4000);
      btn_eye_dropper.classList.remove("inspecta-active");
    })
    .catch((e) => {
      // console.log('eyeDropper error', e);
    });
  eyeDropperClose.addEventListener('click', function handleMouseClick() {
    eyeDropperResultBg.style.display = 'none';
    btn_eye_dropper.classList.remove("inspecta-active");
  });
}




function applyInspector() {
  document.querySelectorAll('body > *').forEach(element => {
    if (element.id === 'inspecta_app_container' ||
      element.closest('#inspecta_app_container') ||
      element.id === 'inspecta-rg-overlay' ||
      element.offsetParent && element.offsetParent.id && element.offsetParent.id === 'inspecta-rg-overlay' ||
      element.id === 'color_picker_test' ||
      element.id === 'overlayImage' ||
      element.id === 'pnl_navigator_dom_tree' ||
      element.closest('#inspecta-rg-overlay') ||
      element.id === 'pnl_properties' ||
      element.closest('#pnl_properties')
    ) {
      return;
    }

    if (appToggle == true) {
      addWindowListeners();
      element.addEventListener('mouseover', addInspector);
      element.addEventListener('mouseout', removeInspector);
      element.addEventListener('click', selectElement, true);
    } else {
      removeWindowListeners();
      element.classList.remove('inspecta-inspect');
      element.classList.remove('inspecta-inspect-active');
      element.removeEventListener('mouseover', addInspector);
      element.removeEventListener('mouseout', removeInspector);
      element.removeEventListener('click', selectElement);
      element.removeAttribute('contenteditable');
      element.style.cursor = '';
      element.style.pointerEvents = null;

      // Restore original styles if they exist
      if (element.originalStyles) {
        element.style.display = element.originalStyles.display;
        element.style.position = element.originalStyles.position;
        element.style.zIndex = element.originalStyles.zIndex;
        delete element.originalStyles;
      }
    }
  });
}

// function widthChange(e) {
//   const w = e.target.value + 'px';
//   //target.style.width = w;
//   generateInspectaCss('width', w);
//   //console.log('cssRulesJson', cssRulesJson);
// }

let isPanelMinimized = false;

function closePropertiesPanel() {
  pnl_properties.style.display = 'none';
  toggle_fill.classList.remove("toggle_fill_selected");
  toggle_fill.classList.remove("fill_active");
}

function togglePanelSize() {
  const minimizeIcon = btn_close_properties.querySelector('.minimize-icon');
  const maximizeIcon = btn_close_properties.querySelector('.maximize-icon');
  const currentTransform = pnl_properties.style.transform;

  if (!isPanelMinimized) {
    // Minimize
    pnl_properties.classList.add('minimized');
    minimizeIcon.style.display = 'none';
    maximizeIcon.style.display = 'block';
    window.tooltipManager.toggleTooltipMode('btn_close_properties_pnl', 'maximize');
    isPanelMinimized = true;
  } else {
    // Maximize
    pnl_properties.classList.remove('minimized');
    minimizeIcon.style.display = 'block';
    maximizeIcon.style.display = 'none';
    window.tooltipManager.toggleTooltipMode('btn_close_properties_pnl', 'minimize');
    isPanelMinimized = false;
  }

  // Preserve the panel's position
  if (currentTransform) {
    requestAnimationFrame(() => {
      pnl_properties.style.transform = currentTransform;
    });
  }
}

function togglePanelPosition() {
  const panel = shadow.getElementById('pnl_properties');
  const flip_pnl_ic = btn_properties_position;

  // Reset all positioning properties
  panel.style.transform = '';
  panel.style.top = '8px';
  panel.style.bottom = '70px';

  if (panel.style.left === '8px') {
    // Move to right side (initial position)
    panel.style.left = '';
    panel.style.right = '8px';
    flip_pnl_ic.style.transform = 'rotate(0deg)';
  } else {
    // Move to left side
    panel.style.right = '';
    panel.style.left = '8px';
    flip_pnl_ic.style.transform = 'rotate(180deg)';
  }
}

function inputsEventRegister() {
  //POSITION
  $id('in_position').addEventListener('change', positionChange);
  $id('btn_back').addEventListener('click', onBackClicked)
  tab_changes.addEventListener('click', tabChangesClick);
  tab_properties.addEventListener('click', tabPropertiesClick);
  tab_overlay.addEventListener('click', tabOverlayClick);
  //  close properties pnl
  btn_close_properties.addEventListener('click', function handleMouseClick() {
    togglePanelSize();
  });
  //  properties pnl position
  btn_properties_position.addEventListener('click', togglePanelPosition);
  //  properties pnl position
  btn_properties_position.addEventListener('click', function handleMouseClick() {
    const flip_pnl_ic = btn_properties_position;
    if (pnl_properties.style.left !== '8px') {
      pnl_properties.style.right = "unset";
      pnl_properties.style.left = '8px';
      flip_pnl_ic.style.transform = 'rotate(180deg)';
    } else {
      pnl_properties.style.left = "unset";
      pnl_properties.style.right = '8px';
      flip_pnl_ic.style.transform = 'rotate(0deg)';
    }
  });
}

function tabChangesClick(e) {
  tab_changes.classList.add('tab_selected');
  tab_properties.classList.remove('tab_selected');
  tab_overlay.classList.remove('tab_selected');
  pnl_changes.style.display = 'block';
  pnl_properties_content.style.display = 'none';
  pnl_overlay.style.display = 'none';
  generateInspectaFullCss();
  generateCssChangesCounter();
}
function tabPropertiesClick(e) {
  tab_properties.classList.add('tab_selected');
  tab_changes.classList.remove('tab_selected');
  tab_overlay.classList.remove('tab_selected');
  pnl_properties_content.style.display = 'block';
  pnl_changes.style.display = 'none';
  pnl_overlay.style.display = 'none';
  //ADD OVERLAY  
}
function tabOverlayClick(e) {
  tab_overlay.classList.add('tab_selected');
  tab_properties.classList.remove('tab_selected');
  tab_changes.classList.remove('tab_selected');
  pnl_overlay.style.display = 'flex';
  pnl_properties_content.style.display = 'none';
  pnl_changes.style.display = 'none';
  //ADD OVERLAY  

}


function onInspectToggleClick() {
  if (inspectMode) {
    inspectMode = false;
    window.previewMode = true;
    btn_inspect_preview_toggle.classList.add("btn_inspect_preview_mode");
    window.tooltipManager.toggleTooltipMode('btn_inspect_preview_toggle', 'preview');

    // Remove all overlays when entering preview mode
    removeAllInspectaOverlays();

    // Hide selection overlays in preview mode
    hideHoverOverlay();
    stopSelectedOverlayLoop();

    // Remove all overlay elements completely
    const selectedOverlay = document.getElementById('inspecta-selected-overlay');
    if (selectedOverlay && selectedOverlay.parentNode) selectedOverlay.parentNode.removeChild(selectedOverlay);
    const selectionOverlay = document.getElementById('inspecta-selection-overlay');
    if (selectionOverlay && selectionOverlay.parentNode) selectionOverlay.parentNode.removeChild(selectionOverlay);
    const hoverOverlay = document.getElementById('inspecta-hover-overlay');
    if (hoverOverlay && hoverOverlay.parentNode) hoverOverlay.parentNode.removeChild(hoverOverlay);
    const overlayImage = document.getElementById('overlayImage');
    if (overlayImage && overlayImage.parentNode) overlayImage.parentNode.removeChild(overlayImage);
    const outlineStyle = document.getElementById('outline_style_container');
    if (outlineStyle && outlineStyle.parentNode) outlineStyle.parentNode.removeChild(outlineStyle);

    // Hide element action panel in preview mode
    const elementActionPanel = shadow.querySelector('.element-action-panel');
    if (elementActionPanel) {
      elementActionPanel.style.display = 'none';
    }

    pnl_properties.style.display = "none";
    pnl_overlay.style.display = "none";

    // Reset all active states
    btn_eye_dropper.classList.remove("inspecta-active");
    btn_ruler.classList.remove("inspecta-active");
    btn_view_overlay.classList.remove("inspecta-active");
    btn_outline.classList.remove("inspecta-active");
    btn_distances.classList.remove("inspecta-active");

    // Reset bottom toolbar toggles
    if (shadow) {
      const allToggles = shadow.querySelectorAll('.bottom_toolbar_toggle, .toggle_fill, #bottom_toolbar_toggle_fill_changes');
      allToggles.forEach(toggle => {
        toggle.classList.remove('fill_active');
      });
    }

    // Reset panel states
    isPnlPropertiesVisible = false;
    isPnlPropertiesContentVisible = false;
    isPnlChangesVisible = false;

    // Deactivate properties icon
    if (typeof toggle_fill !== 'undefined') {
      toggle_fill.classList.remove('fill_active');
    }

    // console.log("preview-mode");
    appToggle = false;
    if ($qs('.inspecta-inspect-active')) {
      $qs('.inspecta-inspect-active').classList.remove('inspecta-inspect-active');
    }
    bottom_toolbar_toggle_fill.classList.remove("fill_active");
    hideGuides();
    unloadOverlay();
    hideDistances();
    enableDisableOutline(false);
    enableDisableDistances(false);
    applyInspector();
  } else {
    inspectMode = true;
    window.previewMode = false;
    btn_inspect_preview_toggle.classList.remove("btn_inspect_preview_mode");
    window.tooltipManager.toggleTooltipMode('btn_inspect_preview_toggle', 'inspect');

    // Remove all overlays when switching back to inspect mode for clean state
    removeAllInspectaOverlays();

    // Stop selection overlay loop for clean state
    stopSelectedOverlayLoop();

    // Re-initialize overlays for inspect mode
    initializeOverlays();

    // If there's a currently selected element, show its overlays
    if (inspectaCurrentlySelected) {
      showSelectedOverlay(inspectaCurrentlySelected);
      startSelectedOverlayLoop(inspectaCurrentlySelected);
    }

    btn_eye_dropper.classList.remove("inspecta-active");
    // console.log("inspect-mode");
    appToggle = true;
    if (target)
      target.classList.add('inspecta-inspect-active');
    pnl_properties.style.display = "block";
    // Set properties icon as active if properties panel is shown
    if (pnl_properties && pnl_properties.style.display !== 'none' && typeof toggle_fill !== 'undefined') {
      toggle_fill.classList.add('fill_active');
      isPnlPropertiesContentVisible = true;
      isPnlChangesVisible = false;
    }
    applyInspector();

    if (btn_view_overlay.classList.contains("inspecta-active")) {
      resumeOverlay();
      pnl_overlay.style.display = "flex";
    }
    if (btn_ruler.classList.contains("inspecta-active")) {
      showGuides();
    }
    enableDisableDistances();
  }
}


//-----------UTILS------------
function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}
// 
/**
 *Prevent Event bubbling
 *  */
function stopBubbling(e) {
  e.stopPropagation();
  e.preventDefault();
  e.stopImmediatePropagation()

}




// Add inspector Class
function addInspector(event) {
  if (!event.target) return;

  // Skip creating overlays if in preview mode
  if (window.previewMode) {
    return;
  }

  // Remove any existing overlays (but not selected overlays)
  document.querySelectorAll('.inspecta-margin-overlay[data-inspecta-selected], .inspecta-padding-overlay[data-inspecta-selected], .inspecta-gap-overlay[data-inspecta-selected]').forEach(el => el.removeAttribute('data-inspecta-selected'));
  document.querySelectorAll('.inspecta-margin-overlay, .inspecta-padding-overlay, .inspecta-gap-overlay').forEach(el => el.remove());

  const el = event.target;
  const rect = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);

  // --- Hover overlay support (two overlays) ---
  if (typeof showHoverOverlay === 'function' && typeof inspectaCurrentlySelected !== 'undefined') {
    if (el === inspectaCurrentlySelected) {
      // Only show the selected overlay, never the hover overlay
      hideHoverOverlay();
    } else {
      showHoverOverlay(el);
    }
  }

  // Helper to create overlays
  function createMarginOverlays(selected) {
    function addValue(overlay, value, isVertical) {
      if (value === '0px' || value === '0' || value === 0) return;
      const label = document.createElement('div');
      label.className = 'inspecta-overlay-label';
      label.innerText = value;
      label.style.position = 'absolute';
      label.style.left = '50%';
      label.style.top = '50%';
      label.style.transform = 'translate(-50%, -50%)';
      overlay.appendChild(label);
    }
    const marginTop = document.createElement('div');
    const marginRight = document.createElement('div');
    const marginBottom = document.createElement('div');
    const marginLeft = document.createElement('div');
    marginTop.className = 'inspecta-margin-overlay';
    marginRight.className = 'inspecta-margin-overlay';
    marginBottom.className = 'inspecta-margin-overlay';
    marginLeft.className = 'inspecta-margin-overlay';
    if (selected) {
      marginTop.setAttribute('data-inspecta-selected', 'true');
      marginRight.setAttribute('data-inspecta-selected', 'true');
      marginBottom.setAttribute('data-inspecta-selected', 'true');
      marginLeft.setAttribute('data-inspecta-selected', 'true');
    }
    // Top margin (no overlap with left/right)
    marginTop.style.position = 'fixed';
    marginTop.style.top = (rect.top - parseFloat(style.marginTop)) + 'px';
    marginTop.style.left = (rect.left) + 'px';
    marginTop.style.width = rect.width + 'px';
    marginTop.style.height = style.marginTop;
    addValue(marginTop, style.marginTop, false);
    // Right margin
    marginRight.style.position = 'fixed';
    marginRight.style.top = (rect.top) + 'px';
    marginRight.style.left = (rect.right) + 'px';
    marginRight.style.width = style.marginRight;
    marginRight.style.height = rect.height + 'px';
    addValue(marginRight, style.marginRight, true);
    // Bottom margin
    marginBottom.style.position = 'fixed';
    marginBottom.style.top = (rect.bottom) + 'px';
    marginBottom.style.left = (rect.left) + 'px';
    marginBottom.style.width = rect.width + 'px';
    marginBottom.style.height = style.marginBottom;
    addValue(marginBottom, style.marginBottom, false);
    // Left margin
    marginLeft.style.position = 'fixed';
    marginLeft.style.top = (rect.top) + 'px';
    marginLeft.style.left = (rect.left - parseFloat(style.marginLeft)) + 'px';
    marginLeft.style.width = style.marginLeft;
    marginLeft.style.height = rect.height + 'px';
    addValue(marginLeft, style.marginLeft, true);
    document.body.appendChild(marginTop);
    document.body.appendChild(marginRight);
    document.body.appendChild(marginBottom);
    document.body.appendChild(marginLeft);
  }
  function createPaddingOverlays(selected) {
    function addValue(overlay, value, isVertical) {
      if (value === '0px' || value === '0' || value === 0) return;
      const label = document.createElement('div');
      label.className = 'inspecta-overlay-label';
      label.innerText = value;
      label.style.position = 'absolute';
      label.style.left = '50%';
      label.style.top = '50%';
      label.style.transform = 'translate(-50%, -50%)';
      overlay.appendChild(label);
    }
    const paddingTop = document.createElement('div');
    const paddingRight = document.createElement('div');
    const paddingBottom = document.createElement('div');
    const paddingLeft = document.createElement('div');
    paddingTop.className = 'inspecta-padding-overlay';
    paddingRight.className = 'inspecta-padding-overlay';
    paddingBottom.className = 'inspecta-padding-overlay';
    paddingLeft.className = 'inspecta-padding-overlay';
    if (selected) {
      paddingTop.setAttribute('data-inspecta-selected', 'true');
      paddingRight.setAttribute('data-inspecta-selected', 'true');
      paddingBottom.setAttribute('data-inspecta-selected', 'true');
      paddingLeft.setAttribute('data-inspecta-selected', 'true');
    }
    // Parse all paddings and borders as floats
    const padTop = parseFloat(style.paddingTop);
    const padRight = parseFloat(style.paddingRight);
    const padBottom = parseFloat(style.paddingBottom);
    const padLeft = parseFloat(style.paddingLeft);
    const borderTop = parseFloat(style.borderTopWidth);
    const borderRight = parseFloat(style.borderRightWidth);
    const borderBottom = parseFloat(style.borderBottomWidth);
    const borderLeft = parseFloat(style.borderLeftWidth);
    const contentWidth = rect.width - padLeft - padRight - borderLeft - borderRight;
    const contentHeight = rect.height - padTop - padBottom - borderTop - borderBottom;

    // Top padding (horizontal, inside left/right padding)
    paddingTop.style.position = 'fixed';
    paddingTop.style.top = (rect.top + borderTop) + 'px';
    paddingTop.style.left = (rect.left + borderLeft + padLeft) + 'px';
    paddingTop.style.width = contentWidth + 'px';
    paddingTop.style.height = padTop + 'px';
    addValue(paddingTop, style.paddingTop, false);

    // Right padding (vertical, full height)
    paddingRight.style.position = 'fixed';
    paddingRight.style.top = (rect.top + borderTop) + 'px';
    paddingRight.style.left = (rect.right - borderRight - padRight) + 'px';
    paddingRight.style.width = padRight + 'px';
    paddingRight.style.height = (rect.height - borderTop - borderBottom) + 'px';
    addValue(paddingRight, style.paddingRight, true);

    // Bottom padding (horizontal, inside left/right padding)
    paddingBottom.style.position = 'fixed';
    paddingBottom.style.top = (rect.bottom - borderBottom - padBottom) + 'px';
    paddingBottom.style.left = (rect.left + borderLeft + padLeft) + 'px';
    paddingBottom.style.width = contentWidth + 'px';
    paddingBottom.style.height = padBottom + 'px';
    addValue(paddingBottom, style.paddingBottom, false);

    // Left padding (vertical, full height)
    paddingLeft.style.position = 'fixed';
    paddingLeft.style.top = (rect.top + borderTop) + 'px';
    paddingLeft.style.left = (rect.left + borderLeft) + 'px';
    paddingLeft.style.width = padLeft + 'px';
    paddingLeft.style.height = (rect.height - borderTop - borderBottom) + 'px';
    addValue(paddingLeft, style.paddingLeft, true);

    document.body.appendChild(paddingTop);
    document.body.appendChild(paddingRight);
    document.body.appendChild(paddingBottom);
    document.body.appendChild(paddingLeft);
  }

  function createGapOverlays(selected) {
    const display = style.display;
    let gap = 0, rowGap = 0, columnGap = 0;
    if (display === 'flex' || display === 'inline-flex') {
      gap = parseFloat(style.gap) || 0;
      rowGap = parseFloat(style.rowGap) || 0;
      columnGap = parseFloat(style.columnGap) || 0;
      const flexDirection = style.flexDirection;
      const children = Array.from(el.children).filter(child => child.nodeType === 1 && child.offsetParent !== null);
      if (children.length > 1) {
        for (let i = 0; i < children.length - 1; i++) {
          const first = children[i].getBoundingClientRect();
          const second = children[i + 1].getBoundingClientRect();
          // Row gap (vertical gap)
          if ((flexDirection === 'column' || flexDirection === 'column-reverse') && rowGap > 0) {
            const gapOverlay = document.createElement('div');
            gapOverlay.className = 'inspecta-gap-overlay';
            gapOverlay.style.position = 'fixed';
            gapOverlay.style.left = first.left + 'px';
            gapOverlay.style.top = first.bottom + 'px';
            gapOverlay.style.width = first.width + 'px';
            gapOverlay.style.height = rowGap + 'px';
            addGapLabel(gapOverlay, style.rowGap);
            if (selected) {
              gapOverlay.setAttribute('data-inspecta-selected', 'true');
            }
            document.body.appendChild(gapOverlay);
          }
          // Column gap (horizontal gap)
          if ((flexDirection === 'row' || flexDirection === 'row-reverse') && columnGap > 0) {
            const gapOverlay = document.createElement('div');
            gapOverlay.className = 'inspecta-gap-overlay';
            gapOverlay.style.position = 'fixed';
            gapOverlay.style.left = first.right + 'px';
            gapOverlay.style.top = first.top + 'px';
            gapOverlay.style.width = columnGap + 'px';
            gapOverlay.style.height = first.height + 'px';
            addGapLabel(gapOverlay, style.columnGap);
            if (selected) {
              gapOverlay.setAttribute('data-inspecta-selected', 'true');
            }
            document.body.appendChild(gapOverlay);
          }
        }
      }
    } else if (display === 'grid' || display === 'inline-grid') {
      rowGap = parseFloat(style.rowGap) || 0;
      columnGap = parseFloat(style.columnGap) || 0;
      // For grid, show overlays between rows and columns
      const children = Array.from(el.children).filter(child => child.nodeType === 1 && child.offsetParent !== null);
      // Get grid info
      const rows = parseInt(style.gridTemplateRows.split(' ').length);
      const cols = parseInt(style.gridTemplateColumns.split(' ').length);
      // Only show if there are gaps
      if (rowGap > 0 || columnGap > 0) {
        // For each child, check if it's not in the last row/col and draw gap overlays
        children.forEach(child => {
          const childRect = child.getBoundingClientRect();
          // Column gap
          if (columnGap > 0 && child.nextElementSibling) {
            const gapOverlay = document.createElement('div');
            gapOverlay.className = 'inspecta-gap-overlay';
            gapOverlay.style.position = 'fixed';
            gapOverlay.style.left = childRect.right + 'px';
            gapOverlay.style.top = childRect.top + 'px';
            gapOverlay.style.width = columnGap + 'px';
            gapOverlay.style.height = childRect.height + 'px';
            addGapLabel(gapOverlay, style.columnGap);
            if (selected) {
              gapOverlay.setAttribute('data-inspecta-selected', 'true');
            }
            document.body.appendChild(gapOverlay);
          }
          // Row gap
          if (rowGap > 0) {
            const gapOverlay = document.createElement('div');
            gapOverlay.className = 'inspecta-gap-overlay';
            gapOverlay.style.position = 'fixed';
            gapOverlay.style.left = childRect.left + 'px';
            gapOverlay.style.top = childRect.bottom + 'px';
            gapOverlay.style.width = childRect.width + 'px';
            gapOverlay.style.height = rowGap + 'px';
            addGapLabel(gapOverlay, style.rowGap);
            if (selected) {
              gapOverlay.setAttribute('data-inspecta-selected', 'true');
            }
            document.body.appendChild(gapOverlay);
          }
        });
      }
    }
    function addGapLabel(overlay, value) {
      if (value === '0px' || value === '0' || value === 0) return;
      const label = document.createElement('div');
      label.className = 'inspecta-overlay-label';
      label.innerText = value;
      label.style.position = 'absolute';
      label.style.left = '50%';
      label.style.top = '50%';
      label.style.transform = 'translate(-50%, -50%)';
      overlay.appendChild(label);
    }
  }

  // Show overlays based on hover/selection state (only if spacing overlays are enabled)
  // Initialize the flag if not set (default to true)
  if (window.inspectaSpacingOverlaysEnabled === undefined) {
    window.inspectaSpacingOverlaysEnabled = true;
  }

  if (window.inspectaSpacingOverlaysEnabled !== false) {
    if (el.classList.contains('inspecta-inspect-active')) {
      // If selected/inspected, show both overlays and mark as selected
      createMarginOverlays(true);
      createPaddingOverlays(true);
      createGapOverlays(true);
    } else {
      // If hovered inside the element, show only padding
      if (event.relatedTarget && el.contains(event.relatedTarget)) {
        createPaddingOverlays(false);
        createGapOverlays(false);
      } else {
        // If hovered from outside, show only margin
        createMarginOverlays(false);
      }
    }
  }

  // Store original styles if not already stored
  if (!el._inspectaOriginalStyles) {
    el._inspectaOriginalStyles = {
      // Removed outline and outlineOffset from original styles
    };
  }

  el.classList.add('inspecta-inspect');

  // Draw distance if distances are enabled and we have a target element
  if (enableDistances && target && target !== el) {
    // Make sure we have valid elements
    if (target.getBoundingClientRect && el.getBoundingClientRect) {
      drawDistance(target, el);
    }
  } else if (enableDistances) {
    // If distances are enabled but we don't have a valid target,
    // just show the lines for the hovered element
    drawLines(el);
  } else {
    // Hide all distance guides if distances are disabled
    hideDistances();
  }
}


// Remove inspector Class
function removeInspector(event) {
  if (!event.target) return;

  // Skip removing inspector logic if in preview mode
  if (window.previewMode) {
    return;
  }

  // Remove old class-based highlight logic
  // event.target.classList.remove('inspecta-inspect');

  // Restore original styles
  if (event.target._inspectaOriginalStyles) {
    // Removed outline and outlineOffset from original styles
  }

  // --- Hide hover overlay if not the selected element ---
  if (typeof hideHoverOverlay === 'function' && typeof inspectaCurrentlySelected !== 'undefined') {
    if (event.target !== inspectaCurrentlySelected) {
      hideHoverOverlay();
    }
  }

  // Remove any existing overlays
  document.querySelectorAll('.inspecta-margin-overlay, .inspecta-padding-overlay, .inspecta-gap-overlay').forEach(el => el.remove());
}

function showOverview() {
  pnl_overview.style.display = 'block';
  pnl_elements.style.display = 'none';
  btn_back.style.display = 'none';
  pnl_title.innerHTML = 'Overview';
  $id("el_name").innerHTML = document.title;
  pnl_element_selection_arrows.style.display = 'none'
  inspect_hint.style.display = 'flex';
  figma_compare_panel.style.display = 'flex';
}
let selectingElement = false; // Flag to track whether an element is being selected
function addWindowListeners() {
  //document.addEventListener('click', preventInteractions);
  // document.addEventListener('keydown', preventInteractions);
  document.addEventListener('mousedown', preventInteractions);
  document.addEventListener('touchstart', preventInteractions);
  document.addEventListener('touchend', preventInteractions);
  window.addEventListener('keydown', handleKeyboardShortcuts);

}
function removeWindowListeners() {
  //document.removeEventListener('click', preventInteractions);
  // document.removeEventListener('keydown', preventInteractions);
  document.removeEventListener('mousedown', preventInteractions);
  document.removeEventListener('touchstart', preventInteractions);
  document.removeEventListener('touchend', preventInteractions);
  window.removeEventListener('keydown', handleKeyboardShortcuts);
}

function handleKeyboardShortcuts(e) {
  // Only handle shortcuts if the app is open
  if (!appToggle) return;
  // Check for modifier keys
  const hasCtrl = e.ctrlKey || e.metaKey; // metaKey for Mac
  const hasAlt = e.altKey;
  const hasShift = e.shiftKey;
  // Unselect element on Escape
  if (e.key === 'Escape') {
    e.preventDefault();
    onBackClicked(e);
    return;
  }
  // Preview Mode: 'u'
  if (e.key.toLowerCase() === 'u') {
    e.preventDefault();
    const btnInspectPreviewToggle = shadow.querySelector('#btn_inspect_preview_toggle');
    if (btnInspectPreviewToggle) {
      btnInspectPreviewToggle.click();
    }
  }

  // Inspect Mode: 'i'
  if (e.key.toLowerCase() === 'i') {
    e.preventDefault();
    const btnInspectPreviewToggle = shadow.querySelector('#btn_inspect_preview_toggle');
    if (btnInspectPreviewToggle) {
      btnInspectPreviewToggle.click();
    }
  }

  // Properties Panel: 'p'
  if (e.key.toLowerCase() === 'p') {
    e.preventDefault();
    const tabProperties = shadow.querySelector('#tab_properties');
    if (tabProperties) {
      tabProperties.click();
    }
  }

  // CSS Changes Panel: 'o'
  if (e.key.toLowerCase() === 'o') {
    e.preventDefault();
    const tabChanges = shadow.querySelector('#tab_changes');
    if (tabChanges) {
      tabChanges.click();
    }
  }
}

// Select element
function selectElement(e, el, isFromTreeNavigator = false) {
  // In preview mode, do nothing - let the page handle clicks normally
  if (window.previewMode) {
    return;
  }

  if (e) {
    selectingElement = true;
    showProperties();

    // Store the new target
    const newTarget = el || (e && e.target);
    window.target = newTarget;

    // If clicking the same element, just return
    if (target === newTarget) {
      selectingElement = false;
      return;
    }

    // Clean up previous target if it exists
    if (target) {
      target.removeAttribute('contenteditable');
      target.style.cursor = '';
    }

    if (e) {
      e.stopPropagation();
      e.preventDefault();
      e.stopImmediatePropagation();
      stopBubbling(e);
      target = newTarget;

      // Store original styles if not already stored
      if (!target._inspectaOriginalStyles) {
        target._inspectaOriginalStyles = {
          // Removed outline and outlineOffset from original styles
        };
      }

      showElement(target);
      // Check if target is inside an element with id 'inspecta_isolation_wrapper'
      const isInIsolationWrapper = !!target.closest('#inspecta_isolation_wrapper');
      // You can now use isInIsolationWrapper as needed
      if (!isInIsolationWrapper && !window.previewMode) {
        if (elementToolbar) elementToolbar.destroy();
        elementToolbar = initElementToolbar(target);
        // Store on window object for CSS generator access
        window.elementToolbar = elementToolbar;
      }
    } else {
      target = newTarget;
      showElement(el);
    }

    // Only make text elements editable
    const isTextElement = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'SPAN', 'A', 'LI', 'TD', 'TH', 'LABEL', 'BUTTON', 'DIV'].includes(target.tagName);
    const isLinkOrButton = target.tagName === 'A' || target.tagName === 'BUTTON';

    // Text editing logic - re-enabled
    if (isTextElement) {
      // For links and buttons, allow editing even if empty
      // For other elements, allow editing if they have text content or are likely to contain text
      if (isLinkOrButton || target.textContent.trim().length > 0 || target.tagName === 'DIV') {
        // Make the container editable for text editing to work
        target.setAttribute('contenteditable', 'true');

        // For links and buttons, also allow their default interactions when not in inspect mode
        if (isLinkOrButton) {
          // Store original cursor if not already stored
          if (!target._inspectaOriginalCursor) {
            target._inspectaOriginalCursor = target.style.cursor;
          }

          // Store original content for potential restoration
          if (!target._inspectaOriginalContent) {
            target._inspectaOriginalContent = target.textContent;
          }

          // Add event listeners for better editing experience
          target.addEventListener('blur', handleEditableBlur);
          target.addEventListener('keydown', handleEditableKeydown);
        }

        // Add double-click event listener for better text editing support
        target.addEventListener('dblclick', function (e) {
          // Make text editable on double-click if element is already selected
          if (target.classList.contains('inspecta-inspect-active')) {
            target.classList.add('inspecta-text-cursor');
            target.focus();
            // Select all text for easy editing
            if (window.getSelection) {
              const selection = window.getSelection();
              const range = document.createRange();
              range.selectNodeContents(target);
              selection.removeAllRanges();
              selection.addRange(range);
            }
          }
        });

        // Add blur event listener to restore default cursor
        target.addEventListener('blur', function (e) {
          target.classList.remove('inspecta-text-cursor');
        });
      }
    }

    // Use the overlay system for selection highlight
    selectElementForInspecta(target);

    const selector = generateElSelector(target);
    if (!isFromTreeNavigator) {
      domTreeVisualizer.selectTreeNodeBySelector(target);
    }

    // First populate CSS to get targetStyles
    if (window.target instanceof Element) {
      populateCSS();
    }

    // Then initialize color pickers with the populated styles
    initColorPickers();

    drawLines(target);

    // --- NEW LOGIC: Always show properties panel and update toggle when selecting an element ---
    if (typeof pnl_properties_content !== 'undefined' && pnl_properties_content) {
      pnl_properties_content.style.display = "block";
    }
    if (typeof pnl_changes !== 'undefined' && pnl_changes) {
      pnl_changes.style.display = "none";
    }
    // Update toggle button/icon state
    if (typeof shadow !== 'undefined') {
      const btnTogglePnl = shadow.querySelector('#btn_toggle_pnl');
      const btnToggleChanges = shadow.querySelector('#btn_toggle_changes');
      const toggleFill = shadow.querySelector('#toggle_fill');
      const bottomToolbarToggleFillChanges = shadow.querySelector('#bottom_toolbar_toggle_fill_changes');
      if (btnTogglePnl) btnTogglePnl.classList.add("fill_active");
      if (btnToggleChanges) btnToggleChanges.classList.remove("fill_active");
      if (toggleFill) toggleFill.classList.add("fill_active");
      if (bottomToolbarToggleFillChanges) bottomToolbarToggleFillChanges.classList.remove("fill_active");
    }
    // --- END NEW LOGIC ---

    // Reset flag after element selection is complete
    selectingElement = false;
    // Always update the image panel based on the new selection
    updatePanelContent(window.target);
  }
}

// function showElement(element) {
//   if (!element) return;

//   // Store original styles if not already stored
//   if (!element._inspectaOriginalStyles) {
//     element._inspectaOriginalStyles = {
//       // Removed outline and outlineOffset from original styles
//     };
//   }

//   // Removed outline and outlineOffset assignments
// }

// Prevent interactions while selecting an element
function preventInteractions(event) {
  // In preview mode, allow all interactions - no prevention
  if (window.previewMode) {
    return;
  }

  // Allow all interactions with contenteditable elements
  if (event.target.isContentEditable || document.activeElement?.isContentEditable) {
    return;
  }

  // Allow Escape key to pass through
  if (event.key === 'Escape') {
    return;
  }

  // Check if the clicked element is part of the inspector UI
  if (event.target.closest('#inspecta_app_container') ||
    event.target.closest('#inspecta-rg-overlay') ||
    event.target.closest('#pnl_properties') ||
    event.target.closest('.pnl_item') ||
    event.target.closest('.pnl_item_header') ||
    event.target.closest('.item_values')) {
    return; // Allow interactions with inspector UI elements
  }

  // Prevent all other interactions
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}


function populateCSS() {
  if (!(window.target instanceof Element)) {
    return;
  }

  // Clear all property change indicators from previous element
  if (typeof clearAllPropertyChangeIndicators === 'function') {
    clearAllPropertyChangeIndicators();
  }

  // Temporarily remove element from DOM to get default styles without hover state
  const parent = window.target.parentNode;
  const nextSibling = window.target.nextSibling;

  // Remove element from DOM
  parent.removeChild(window.target);

  // Get computed styles while element is not in DOM (no hover possible)
  targetStyles = window.getComputedStyle(window.target);

  // Put element back in its original position
  if (nextSibling) {
    parent.insertBefore(window.target, nextSibling);
  } else {
    parent.appendChild(window.target);
  }
  //apply_css_changes.checked = true;
  // Matching For All Elements
  populateDisplay();
  populateMargin();
  populatePadding();
  populateSize();
  populateBorder();
  populateTypography();
  populateBorderRadius();
  populateBoxShadow();
  populateBackgroundColor();
  populatePosition();
  populateOpacity();

  // Update slider positions after all properties are populated
  updateSliderPositions();

  // Update property change indicators
  if (typeof updatePropertyChangeIndicators === 'function') {
    updatePropertyChangeIndicators();
  }

  // Use the new element selection handler
  setTimeout(() => {
    if (typeof window.handleElementSelectionChange === 'function') {
      window.handleElementSelectionChange();
    }
  }, 100);

  // Ensure property change indicators are updated after populateCSS completes
  // This is especially important when CSS is restored from storage
  setTimeout(() => {
    if (typeof window.updatePropertyChangeIndicators === 'function') {
      window.updatePropertyChangeIndicators();
    }
  }, 200);
}

// Function to update slider positions based on current input values
function updateSliderPositions() {
  // Update opacity slider
  if (window.opacitySlider && window.opacityInput) {
    if (window.opacityInput.value) {
      window.opacitySlider.value = window.opacityInput.value;
    }
  }

  // Update gap slider
  const gapSlider = shadow.querySelector('#gapSlider');
  const gapInput = shadow.querySelector('#in_gap');
  if (gapSlider && gapInput) {
    const match = gapInput.value.match(/^([\d.]+)/);
    if (match) {
      gapSlider.value = match[1];
    }
  }

  // Update border radius slider
  const radiusSlider = shadow.querySelector('#radiusSlider');
  const radiusInput = shadow.querySelector('#in_radius');
  if (radiusSlider && radiusInput) {
    const match = radiusInput.value.match(/^([\d.]+)/);
    if (match) {
      radiusSlider.value = match[1];
    }
  }
}
let startX;
let currentX;
//  change input values usign mouse drag
function initInputValuesByMouseDrag() {
  let input = document.getElementById('in_width');


  input.addEventListener('mousedown', function (e) {
    startX = e.clientX;
    document.addEventListener('mousemove', changeValue);
  });

  document.addEventListener('mouseup', function () {
    document.removeEventListener('mousemove', changeValue);
  });
}


function changeValue(e) {
  if (e) {
    currentX = e.clientX;
    let change = currentX - startX;
    input.value = parseInt(input.value) + change;
    startX = currentX;
  }
}

function opacityPCTToHex(opacityPCT) {
  let val = parseFloat(opacityPCT / 100)
  return Math.floor(val * 255).toString(16)
}

// Helper function to create hex color with alpha only when needed
function hexColorWithOptionalAlpha(hexColor, opacityPCT) {
  // Ensure hexColor has # prefix for consistency
  let normalizedHex = hexColor;
  if (hexColor.length === 6 && /^[0-9A-Fa-f]{6}$/.test(hexColor)) {
    normalizedHex = '#' + hexColor;
  }

  // If opacity is 100%, don't add alpha digits
  if (opacityPCT >= 100) {
    return normalizedHex;
  }
  // Otherwise add the alpha hex digits
  const opcityVALUE_HEX = opacityPCTToHex(opacityPCT);
  return normalizedHex + opcityVALUE_HEX;
}


//color picker DROP


function onBackClicked(e) {
  // If an element is selected, unselect it
  if (inspectaCurrentlySelected) {
    stopSelectedOverlayLoop();
    if (typeof inspectaSelectedOverlay !== 'undefined' && inspectaSelectedOverlay) {
      inspectaSelectedOverlay.style.display = 'none';
    }
    if (typeof target !== 'undefined' && target) {
      target.removeAttribute('contenteditable');
      target.style.cursor = '';
      // Remove the editable interactive class and restore original cursor for links and buttons
      if (target.classList.contains('inspecta-editable-interactive')) {
        target.classList.remove('inspecta-editable-interactive');
        if (target._inspectaOriginalCursor) {
          target.style.cursor = target._inspectaOriginalCursor;
        }
      }
    }
    inspectaCurrentlySelected = null;
    target = null;
    if (typeof btnPasteCss !== 'undefined' && btnPasteCss) {
      btnPasteCss.disabled = true;
    }
  }
  showOverview();
}
// function drawDistance(element1, element2) {
//   const rect1 = element1.getBoundingClientRect();
//   const rect2 = element2.getBoundingClientRect();


//   const x1 = rect1.left + rect1.width;
//   const y1 = rect1.top + rect1.height / 2;

//   const x2 = rect2.left;
//   const y2 = rect2.top + rect2.height / 2;

//   const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

//   const line = document.createElement("div");
//   line.className = "line";
//   line.style.left = `${x1}px`;
//   line.style.top = `${y1}px`;
//   line.style.width = `${x2 - x1}px`;

//   const distanceText = document.createElement("div");
//   distanceText.className = "distance-text";
//   distanceText.textContent = `${Math.round(distance)}px`;

//   line.appendChild(distanceText);

//   document.body.appendChild(line);
// }
function removeDistance() {
  // const line = shadow.querySelector(".line");
  // if (line) {
  //   document.body.removeChild(line);
  // }
}

function calculateDistances(element1, element2) {
  const rect1 = element1.getBoundingClientRect();
  const rect2 = element2.getBoundingClientRect();

  const x1 = rect1.left + rect1.width / 2;
  const y1 = rect1.top + rect1.height / 2;

  const x2 = rect2.left + rect2.width / 2;
  const y2 = rect2.top + rect2.height / 2;

  const xDistance = Math.abs(x2 - x1);
  const yDistance = Math.abs(y2 - y1);

  return { x: xDistance, y: yDistance };
}

// Make panel draggable
function initDraggablePanel() {
  const windowBar = shadow.getElementById('window_bar');
  const panel = shadow.getElementById('pnl_properties');
  let isDragging = false;
  let currentX;
  let currentY;
  let initialMouseX;
  let initialMouseY;

  windowBar.style.cursor = 'grab';

  windowBar.addEventListener('mousedown', function (e) {
    if (!windowBar.contains(e.target)) return;

    isDragging = true;
    windowBar.style.cursor = 'grabbing';

    // Get the current panel position
    const rect = panel.getBoundingClientRect();
    currentX = rect.left;
    currentY = rect.top;

    // Get the initial mouse position
    initialMouseX = e.clientX;
    initialMouseY = e.clientY;

    e.preventDefault();
  });

  document.addEventListener('mousemove', function (e) {
    if (!isDragging) return;

    // Calculate the distance moved
    const dx = e.clientX - initialMouseX;
    const dy = e.clientY - initialMouseY;

    // Calculate new position
    let newX = currentX + dx;
    let newY = currentY + dy;

    // Get viewport and panel dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const panelWidth = panel.offsetWidth;
    const panelHeight = panel.offsetHeight;

    // Add padding and enforce boundaries
    const padding = 8;
    newX = Math.max(padding, Math.min(viewportWidth - panelWidth - padding, newX));
    newY = Math.max(padding, Math.min(viewportHeight - panelHeight - padding, newY));

    // Apply the new position
    panel.style.left = `${newX}px`;
    panel.style.top = `${newY}px`;
  });

  document.addEventListener('mouseup', function () {
    isDragging = false;
    windowBar.style.cursor = 'grab';
  });
}


function handleToolbarButtonClick() {
  if (!inspectMode) {
    // Enable inspect mode
    inspectMode = true;
    window.previewMode = false;
    btn_inspect_preview_toggle.classList.remove("btn_inspect_preview_mode");
    window.tooltipManager.toggleTooltipMode('btn_inspect_preview_toggle', 'inspect');
    appToggle = true;
    if (target) {
      target.classList.add('inspecta-inspect-active');
    }
    applyInspector();
  }
}

function onTogglePropertiesClick() {
  handleToolbarButtonClick();
  // If already visible and active, do nothing
  if (isPnlPropertiesContentVisible) {
    return;
  }
  // Show properties panel
  pnl_properties.style.display = "block";
  pnl_properties_content.style.display = "block";
  pnl_changes.style.display = "none";

  // Get button elements from shadow DOM
  const btnTogglePnl = shadow.querySelector('#btn_toggle_pnl');
  const btnToggleChanges = shadow.querySelector('#btn_toggle_changes');
  const toggleFill = shadow.querySelector('#toggle_fill');
  const bottomToolbarToggleFillChanges = shadow.querySelector('#bottom_toolbar_toggle_fill_changes');

  // Remove fill_active from all buttons and their SVGs
  btnTogglePnl.classList.remove("fill_active");
  btnToggleChanges.classList.remove("fill_active");
  toggleFill.classList.remove("fill_active");
  bottomToolbarToggleFillChanges.classList.remove("fill_active");

  // Then add fill_active to properties button and its SVG
  btnTogglePnl.classList.add("fill_active");
  toggleFill.classList.add("fill_active");
  isPnlPropertiesContentVisible = true;
  isPnlChangesVisible = false;
}

function onToggleChangesClick() {
  handleToolbarButtonClick();
  // Show changes panel
  pnl_changes.style.display = 'block';
  pnl_properties_content.style.display = 'none';

  // Get button elements from shadow DOM
  const btnTogglePnl = shadow.querySelector('#btn_toggle_pnl');
  const btnToggleChanges = shadow.querySelector('#btn_toggle_changes');
  const toggleFill = shadow.querySelector('#toggle_fill');
  const bottomToolbarToggleFillChanges = shadow.querySelector('#bottom_toolbar_toggle_fill_changes');

  // Remove fill_active from all buttons and their SVGs
  btnTogglePnl.classList.remove("fill_active");
  btnToggleChanges.classList.remove("fill_active");
  toggleFill.classList.remove("fill_active");
  bottomToolbarToggleFillChanges.classList.remove("fill_active");

  // Then add fill_active to changes button and its SVG
  btnToggleChanges.classList.add("fill_active");
  bottomToolbarToggleFillChanges.classList.add("fill_active");
  isPnlChangesVisible = true;
  isPnlPropertiesContentVisible = false;
  generateInspectaFullCss();
  generateCssChangesCounter();
}

function onEyeDropperClick() {
  handleToolbarButtonClick();
  btn_eye_dropper.classList.add("inspecta-active");
  applyInspector();
  showEyeDropper();
}

function onBtnRulerClick() {
  handleToolbarButtonClick();
  if (rulers.style.display === "block") {
    hideGuides();
    rulers.style.display = "none";
    btn_ruler.classList.remove("inspecta-active");
    pnl_properties.style.top = "5px";
  } else {
    showGuides();
    rulers.style.display = "block";
    btn_ruler.classList.add("inspecta-active");
    pnl_properties.style.top = "25px";
  }
}

function onBtnOverleyClick() {
  handleToolbarButtonClick();
  hideNavigator();
  if (pnl_overlay.style.display === "flex") {
    pnl_overlay.style.display = "none";
    btn_view_overlay.classList.remove("fill_active");
    bottom_toolbar_toggle_fill.classList.remove("fill_active");
    unloadOverlay();
  } else {
    pnl_overlay.style.display = "flex";
    bottom_toolbar_toggle_fill.classList.add("fill_active");
    btn_view_overlay.classList.add("fill_active");
    resumeOverlay();
  }
}

function onOutlineClick() {
  handleToolbarButtonClick();
  if (btn_outline.classList.contains("inspecta-active")) {
    enableDisableOutline(false);
  } else {
    enableDisableOutline(true);
  }
}

function onDistancesClick() {
  handleToolbarButtonClick();

  // Toggle distances state
  if (btn_distances.classList.contains("inspecta-active")) {
    // Disable distances
    enableDistances = false;
    hideDistances();
    btn_distances.classList.remove("inspecta-active");

    // Remove all distance elements
    document.querySelectorAll('.inspecta-lines-distance-x, .inspecta-lines-distance-y, .inspecta-lines-distance-label-x, .inspecta-lines-distance-label-y, .inspecta-lines-top, .inspecta-lines-bottom, .inspecta-lines-left, .inspecta-lines-right').forEach(el => {
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
  } else {
    // Enable distances
    enableDistances = true;
    resumeDistances();
    btn_distances.classList.add("inspecta-active");

    // If we have a target element, draw initial distances
    if (target) {
      drawLines(target);
    }
  }
}

function onBtnViewTreeNavigatorClick(e) {
  handleToolbarButtonClick();
  hidImageOverlay();
  if (!domTreeVisualizer) {
    domTreeVisualizer = new DOMTreeVisualizer('inspecta_app', shadow);
  }
  if (shadow.querySelector('#pnl_navigator').style.display === "block") {
    domTreeVisualizer.hide();
    shadow.querySelector('#bottom_toolbar_toggle_fill_navigator').classList.remove("fill_active");
  } else {
    domTreeVisualizer.show();
    shadow.querySelector('#bottom_toolbar_toggle_fill_navigator').classList.add("fill_active");
  }
}

// Add event listener for the close button to close the navigator window
function initNavigatorCloseButton() {
  if (!shadow) return;
  const btnNavigatorClose = shadow.querySelector('#btn_navigator_close');
  const btnNavigatorToggle = shadow.querySelector('#btn_view_tree_navigator');
  if (btnNavigatorClose && btnNavigatorToggle) {
    btnNavigatorClose.addEventListener('click', () => {
      // Trigger the same logic as the navigator toggle
      btnNavigatorToggle.click();
    });
  }
}

function fullCleanupInspecta() {
  // --- EXIT ISOLATE MODE IF ACTIVE ---
  if (elementToolbar && typeof elementToolbar.exitIsolationMode === 'function') {
    elementToolbar.exitIsolationMode();
  }

  // Remove Inspecta app container and shadow DOM
  const appContainer = document.getElementById('inspecta_app_container');
  if (appContainer) appContainer.remove();

  // Remove overlay
  const overlay = document.getElementById('inspecta-rg-overlay');
  if (overlay) overlay.remove();

  // --- ISOLATE MODE FULL CLEANUP ---
  // For each isolated element, restore its style and move it back
  document.querySelectorAll('.inspecta-inspect-isolated').forEach(element => {
    element.classList.remove('inspecta-inspect-isolated');
    // Restore original styles if they exist
    if (element.originalStyles && element.originalStyles.cssText) {
      element.style.cssText = element.originalStyles.cssText;
      delete element.originalStyles;
    }
    // Restore original position if it exists
    if (element.originalParent && element.originalNextSibling) {
      element.originalParent.insertBefore(element, element.originalNextSibling);
      delete element.originalParent;
      delete element.originalNextSibling;
    } else if (element.originalParent) {
      element.originalParent.appendChild(element);
      delete element.originalParent;
    }
    // Remove orphaned wrapper if present
    if (element.parentElement && element.parentElement.childElementCount === 1 && element.parentElement.classList.length === 0 && element.parentElement.tagName === 'DIV' && element.parentElement.style.position && (element.parentElement.style.position === 'absolute' || element.parentElement.style.position === 'fixed')) {
      const wrapper = element.parentElement;
      document.body.appendChild(element); // Move out of wrapper
      wrapper.remove();
    }
  });
  // Remove all isolation panels
  document.querySelectorAll('.isolation-pnl').forEach(panel => panel.remove());
  // Reset body background color
  document.body.style.backgroundColor = '';

  // --- RESTORE DISPLAY OF ALL BODY CHILDREN ---
  // This ensures that any elements hidden during isolate mode are made visible again
  document.querySelectorAll('body > *').forEach(element => {
    if (element.id === 'inspecta_app_container' || element.closest('#inspecta_app_container') || element.id === 'inspecta-rg-overlay' || element.closest('#inspecta-rg-overlay')) {
      return;
    }
    if (element.style.display === 'none') {
      element.style.display = '';
    }
  });

  // --- REMOVE ANY REMAINING ISOLATED WRAPPERS ---
  // This ensures that any wrapper divs left from isolation are fully removed
  document.querySelectorAll('body > div').forEach(div => {
    if (div.childElementCount === 1 && div.classList.length === 0 && div.style.position && (div.style.position === 'absolute' || div.style.position === 'fixed')) {
      const child = div.firstElementChild;
      if (child) {
        document.body.appendChild(child);
      }
      div.remove();
    }
  });

  // --- REMOVE ANY REMAINING ISOLATED ELEMENTS ---
  // This ensures that any remaining isolated elements are fully restored and their wrappers removed
  document.querySelectorAll('.inspecta-inspect-isolated').forEach(element => {
    element.classList.remove('inspecta-inspect-isolated');
    if (element.originalStyles && element.originalStyles.cssText) {
      element.style.cssText = element.originalStyles.cssText;
      delete element.originalStyles;
    }
    if (element.originalParent && element.originalNextSibling) {
      element.originalParent.insertBefore(element, element.originalNextSibling);
      delete element.originalParent;
      delete element.originalNextSibling;
    } else if (element.originalParent) {
      element.originalParent.appendChild(element);
      delete element.originalParent;
    }
    if (element.parentElement && element.parentElement.childElementCount === 1 && element.parentElement.classList.length === 0 && element.parentElement.tagName === 'DIV' && element.parentElement.style.position && (element.parentElement.style.position === 'absolute' || element.parentElement.style.position === 'fixed')) {
      const wrapper = element.parentElement;
      document.body.appendChild(element); // Move out of wrapper
      wrapper.remove();
    }
  });

  // Remove all toolbars, menus, and panels
  document.querySelectorAll('.inspecta-toolbar, .inspecta-bottom-bar, .inspecta-menu, .inspecta-panel, .inspecta-lines-distance-x, .inspecta-lines-distance-y, .inspecta-lines-distance-label-x, .inspecta-lines-distance-label-y, .inspecta-lines-top, .inspecta-lines-bottom, .inspecta-lines-left, .inspecta-lines-right').forEach(el => {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  });

  // Remove all event listeners from body children (except Inspecta containers)
  document.querySelectorAll('body > *').forEach(element => {
    if (element.id === 'inspecta_app_container' ||
      element.closest('#inspecta_app_container') ||
      element.id === 'inspecta-rg-overlay' ||
      element.closest('#inspecta-rg-overlay')) {
      return;
    }
    element.removeEventListener('mouseover', addInspector);
    element.removeEventListener('mouseout', removeInspector);
    element.removeEventListener('click', selectElement);
    element.removeEventListener('mousedown', preventInteractions);
    element.removeEventListener('mouseup', preventInteractions);
    element.removeEventListener('keydown', preventInteractions);
    element.classList.remove('inspecta-inspect', 'inspecta-inspect-active', 'inspecta-inspect-isolated');
    element.style.pointerEvents = null;
  });

  // Remove window/global event listeners
  removeWindowListeners();

  // Destroy element toolbar if exists
  if (elementToolbar) {
    elementToolbar.destroy();
    elementToolbar = null;
  }

  // Remove Inspecta stylesheet (so CSS changes are only visible when extension is open)
  const inspectaStylesheet = document.getElementById('inspectaStylesheet');
  if (inspectaStylesheet) inspectaStylesheet.remove();

  // Do NOT clear localStorage! (CSS changes will be re-applied on open)

  // Remove outlines if active
  if (typeof enableDisableOutline === 'function') {
    enableDisableOutline(false);
  }

  // Hide or remove selection overlays
  const selectedOverlay = document.getElementById('inspecta-selected-overlay');
  if (selectedOverlay && selectedOverlay.parentNode) selectedOverlay.parentNode.removeChild(selectedOverlay);
  const selectionOverlay = document.getElementById('inspecta-selection-overlay');
  if (selectionOverlay && selectionOverlay.parentNode) selectionOverlay.parentNode.removeChild(selectionOverlay);
  const hoverOverlay = document.getElementById('inspecta-hover-overlay');
  if (hoverOverlay && hoverOverlay.parentNode) hoverOverlay.parentNode.removeChild(hoverOverlay);

  // Remove overlay image if present
  const overlayImage = document.getElementById('overlayImage');
  if (overlayImage && overlayImage.parentNode) overlayImage.parentNode.removeChild(overlayImage);

  // Remove outline style container if present
  const outlineStyle = document.getElementById('outline_style_container');
  if (outlineStyle && outlineStyle.parentNode) outlineStyle.parentNode.removeChild(outlineStyle);
}

// Remove overlays on scroll and redraw for selected element after scrolling stops
let inspectaScrollTimeout = null;
function removeAllInspectaOverlays() {
  document.querySelectorAll('.inspecta-margin-overlay, .inspecta-padding-overlay, .inspecta-gap-overlay').forEach(el => el.remove());
}
function redrawSelectedElementOverlays() {
  const selected = document.querySelector('.inspecta-inspect-active');
  if (selected) {
    // Create a proper MouseEvent object
    const event = new MouseEvent('mouseover', {
      bubbles: true,
      cancelable: true,
      view: window
    });
    // Simulate a mouseover event to trigger addInspector for the selected element
    addInspector(event);
  }
}
window.addEventListener('scroll', () => {
  removeAllInspectaOverlays();
  if (inspectaScrollTimeout) clearTimeout(inspectaScrollTimeout);
  inspectaScrollTimeout = setTimeout(() => {
    redrawSelectedElementOverlays();
  }, 150);
}, true);

// --- Begin quickfix: unit input logic ---
function setupUnitInput(inputElement, unitHintElement, generateCssCallback) {
  // Re-initialize lastValidValue after input/unit hint are set up
  let lastValidValue = inputElement.value + (unitHintElement ? unitHintElement.textContent : '');

  // Live update as you type
  inputElement.addEventListener('input', function (e) {
    const val = this.value.trim();

    // Handle typing 'auto'
    if (val.toLowerCase() === 'auto') {
      unitHintElement.textContent = '-';
      if (lastValidValue !== 'auto') {
        lastValidValue = 'auto';
        generateCssCallback('auto');
      }
      return;
    }

    // Check for unit in the input value
    const unitMatch = val.match(/^([\d.]+)(px|em|rem|%|vw|vh)$/i);
    if (unitMatch) {
      const number = unitMatch[1];
      const unit = unitMatch[2].toLowerCase();
      if (this.value !== number) {
        this.value = number;
        this.setSelectionRange(this.value.length, this.value.length);
      }
      unitHintElement.textContent = unit;
      if (lastValidValue !== number + unit) {
        lastValidValue = number + unit;
        generateCssCallback(number + unit);
      }
      return;
    }

    // Prevent negative values
    if (!isNaN(parseFloat(val)) && parseFloat(val) < 0) {
      this.value = '0';
      return;
    }

    // If number and unit is auto, switch to px
    if (!isNaN(parseFloat(val)) && unitHintElement.textContent === '-') {
      unitHintElement.textContent = 'px';
    }

    if (!isNaN(parseFloat(val))) {
      const newValue = val + unitHintElement.textContent;
      if (lastValidValue !== newValue) {
        lastValidValue = newValue;
        generateCssCallback(newValue);
      }
    }
  });

  // Restore last valid value on blur if input is invalid
  inputElement.addEventListener('blur', function () {
    const val = this.value.trim();

    // Handle auto value
    if (val.toLowerCase() === 'auto') {
      this.value = 'auto';
      unitHintElement.textContent = '-';
      if (lastValidValue !== 'auto') {
        lastValidValue = 'auto';
        generateCssCallback('auto');
      }
      return;
    }

    // Handle value with unit (e.g., 10em, 50vw)
    const match = val.match(/^([\d.]+)(px|em|rem|%|vw|vh)$/i);
    if (match) {
      this.value = match[1];
      unitHintElement.textContent = match[2];
      const newValue = match[1] + match[2];
      if (lastValidValue !== newValue) {
        lastValidValue = newValue;
        generateCssCallback(newValue);
      }
      return;
    }

    // Handle numeric values
    if (!isNaN(parseFloat(val))) {
      if (lastValidValue === 'auto' || unitHintElement.textContent === '-') {
        unitHintElement.textContent = 'px';
      }
      this.value = parseFloat(val);
      const newValue = this.value + unitHintElement.textContent;
      if (lastValidValue !== newValue) {
        lastValidValue = newValue;
        generateCssCallback(newValue);
      }
      return;
    }

    // If input is invalid, restore last valid value
    this.value = lastValidValue;
    if (lastValidValue === 'auto') {
      unitHintElement.textContent = '-';
      generateCssCallback('auto');
    } else {
      if (unitHintElement.textContent === '-' || !unitHintElement.textContent) unitHintElement.textContent = 'px';
      generateCssCallback(lastValidValue + unitHintElement.textContent);
    }
  });
}

function createUnitHint(id = '', defaultUnit = 'px') {
  const unitHint = document.createElement('span');
  if (id) unitHint.id = id;
  unitHint.className = 'unit-hint';
  unitHint.textContent = defaultUnit;
  return unitHint;
}
// --- End quickfix: unit input logic ---

// --- Begin refactored unit input widget ---
function setupUnitInputWidget({ input, unitHint, property, getTarget, generateCss, allowedUnits }) {
  // Create custom dropdown
  const customDropdown = document.createElement('div');
  customDropdown.id = property + 'CustomDropdown';
  customDropdown.className = 'custom-dropdown';

  // Add dropdown options
  const units = allowedUnits || ['px', 'em', 'rem', '%', 'vw', 'vh', 'auto'];

  // Helper to close all dropdowns
  function closeAllDropdowns() {
    const root = window.shadow || document;
    root.querySelectorAll('.custom-dropdown.show').forEach(dd => {
      if (dd !== customDropdown) dd.classList.remove('show');
    });
  }

  function convertCSSUnit(value, fromUnit, toUnit, contextElement = document.body) {
    if (fromUnit === toUnit || toUnit === 'auto' || fromUnit === 'auto') return value;
    // Special handling for font-size conversions
    // Only applies if property is font-size or contextElement is provided
    let baseFontSize = 16; // fallback
    if (property === 'font-size' || (contextElement && contextElement instanceof Element)) {
      // For em: use parent font size
      if (fromUnit === 'em' || toUnit === 'em') {
        const parent = contextElement.parentElement || document.body;
        const parentFontSize = window.getComputedStyle(parent).fontSize;
        baseFontSize = parseFloat(parentFontSize) || 16;
      }
      // For rem: use root font size
      if (fromUnit === 'rem' || toUnit === 'rem') {
        const rootFontSize = window.getComputedStyle(document.documentElement).fontSize;
        baseFontSize = parseFloat(rootFontSize) || 16;
      }
    }
    // px to em
    if (fromUnit === 'px' && toUnit === 'em') {
      return +(value / baseFontSize).toFixed(3);
    }
    // em to px
    if (fromUnit === 'em' && toUnit === 'px') {
      return +(value * baseFontSize).toFixed(1);
    }
    // px to rem
    if (fromUnit === 'px' && toUnit === 'rem') {
      return +(value / baseFontSize).toFixed(3);
    }
    // rem to px
    if (fromUnit === 'rem' && toUnit === 'px') {
      return +(value * baseFontSize).toFixed(1);
    }
    // em to rem
    if (fromUnit === 'em' && toUnit === 'rem') {
      // em to px, then px to rem
      const px = value * baseFontSize;
      const rootFontSize = parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
      return +(px / rootFontSize).toFixed(3);
    }
    // rem to em
    if (fromUnit === 'rem' && toUnit === 'em') {
      // rem to px, then px to em
      const px = value * baseFontSize;
      const parent = contextElement.parentElement || document.body;
      const parentFontSize = parseFloat(window.getComputedStyle(parent).fontSize) || 16;
      return +(px / parentFontSize).toFixed(3);
    }
    // fallback: use DOM for other units
    const testEl = document.createElement('div');
    testEl.style.position = 'absolute';
    testEl.style.visibility = 'hidden';
    testEl.style.height = `0`;
    testEl.style.width = `${value}${fromUnit}`;
    contextElement.appendChild(testEl);
    const pxValue = testEl.offsetWidth;
    testEl.style.width = `1${toUnit}`;
    const oneUnitInPx = testEl.offsetWidth;
    testEl.remove();
    if (oneUnitInPx === 0) return 0;
    return parseFloat((pxValue / oneUnitInPx).toFixed(3));
  }

  units.forEach(unit => {
    const div = document.createElement('div');
    div.textContent = unit;
    div.onclick = () => {
      const val = input.value.trim();
      const target = getTarget();
      // Handle normal value
      if (unit === 'normal') {
        input.value = 'normal';
        unitHint.textContent = '-';
        customDropdown.classList.remove('show');
        generateCss(property, 'normal');
        return;
      }
      // Handle none value (for min/max width/height)
      if (unit === 'none') {
        input.value = 'none';
        unitHint.textContent = '-';
        customDropdown.classList.remove('show');
        generateCss(property, 'none');

        // Re-populate width/height when min/max is set to none
        setTimeout(() => {
          if (property === 'min-width' || property === 'max-width') {
            const target = getTarget();
            if (target) {
              const computedWidth = window.getComputedStyle(target).width;
              const widthInput = shadow.querySelector('#in_width');
              if (widthInput) {
                const widthMatch = computedWidth.match(/^([\d.]+)(px|em|rem|%|vw|vh)$/i);
                if (widthMatch) {
                  widthInput.value = Math.round(widthMatch[1]);
                  const widthUnitHint = shadow.querySelector('#widthUnitHint');
                  if (widthUnitHint) {
                    widthUnitHint.textContent = widthMatch[2];
                  }
                } else {
                  widthInput.value = Math.round(parseFloat(computedWidth));
                  const widthUnitHint = shadow.querySelector('#widthUnitHint');
                  if (widthUnitHint) {
                    widthUnitHint.textContent = 'px';
                  }
                }
              }
            }
          }

          if (property === 'min-height' || property === 'max-height') {
            const target = getTarget();
            if (target) {
              const computedHeight = window.getComputedStyle(target).height;
              const heightInput = shadow.querySelector('#in_height');
              if (heightInput) {
                const heightMatch = computedHeight.match(/^([\d.]+)(px|em|rem|%|vw|vh)$/i);
                if (heightMatch) {
                  heightInput.value = Math.round(heightMatch[1]);
                  const heightUnitHint = shadow.querySelector('#heightUnitHint');
                  if (heightUnitHint) {
                    heightUnitHint.textContent = heightMatch[2];
                  }
                } else {
                  heightInput.value = Math.round(parseFloat(computedHeight));
                  const heightUnitHint = shadow.querySelector('#heightUnitHint');
                  if (heightUnitHint) {
                    heightUnitHint.textContent = 'px';
                  }
                }
              }
            }
          }
        }, 0);

        return;
      }
      // If switching from auto to a real unit, use computed px value and convert
      if (val.toLowerCase() === 'auto' && unit !== 'auto') {
        const rect = target.getBoundingClientRect();
        const pxValue = property === 'width' ? rect.width : rect.height;
        // Convert px to the selected unit
        const convertedValue = convertCSSUnit(pxValue, 'px', unit, target);
        input.value = convertedValue;
        unitHint.textContent = unit;
        customDropdown.classList.remove('show');
        generateCss(property, convertedValue + unit);
        return;
      }
      // Handle auto value (skip for font-size)
      if (unit === 'auto' && property !== 'font-size') {
        input.value = 'auto';
        unitHint.textContent = '-';
        customDropdown.classList.remove('show');
        generateCss(property, 'auto');
        return;
      }
      // Prevent 'auto' for font-size
      if (unit === 'auto' && property === 'font-size') {
        return;
      }
      // Handle numeric values
      if (!isNaN(parseFloat(val))) {
        // Detect the current unit
        let currentUnit = unitHint.textContent === '-' ? 'px' : unitHint.textContent;
        // If the input has a unit, use that
        const match = val.match(/^([\d.]+)(px|em|rem|%|vw|vh)$/i);
        let currentValue = parseFloat(val);
        if (match) {
          currentUnit = match[2];
          currentValue = parseFloat(match[1]);
        }
        // Use the convertCSSUnit function for conversion
        const convertedValue = convertCSSUnit(currentValue, currentUnit, unit, target);
        input.value = convertedValue;
        unitHint.textContent = unit;
        customDropdown.classList.remove('show');
        generateCss(property, convertedValue + unit);
        return;
      }
      unitHint.textContent = unit === 'auto' ? '-' : unit;
      customDropdown.classList.remove('show');
      generateCss(property, input.value + (unit === 'auto' ? '' : unit));
    };
    customDropdown.appendChild(div);
  });

  // Add elements to DOM
  input.parentNode.appendChild(unitHint);
  input.parentNode.appendChild(customDropdown);

  // Toggle dropdown on unit hint click
  unitHint.addEventListener('click', (e) => {
    e.stopPropagation();
    closeAllDropdowns();
    customDropdown.classList.toggle('show');
  });

  // Select text on input click
  input.addEventListener('click', function () {
    this.select();
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!customDropdown.contains(e.target) && !unitHint.contains(e.target)) {
      customDropdown.classList.remove('show');
    }
  });

  // Variables for drag functionality
  let isDragging = false;
  let startX = 0;
  let startValue = 0;
  let lastScreenX = 0;
  let isScrolling = false;

  // Function to increment/decrement value
  function incrementValue(direction) {
    const val = parseFloat(input.value);
    if (isNaN(val)) return;
    input.value = val + direction;
    const inputEvent = new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      composed: true,
      data: input.value
    });
    input.dispatchEvent(inputEvent);
  }

  // Keyboard arrow support
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      incrementValue(1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      incrementValue(-1);
    }
  });

  // Mouse wheel support (focus-aware)
  let isInputFocused = false;

  input.addEventListener('focus', function () {
    isInputFocused = true;
    // console.log(`${input.id} focused`);
  });

  input.addEventListener('blur', function () {
    isInputFocused = false;
    // console.log(`${input.id} blurred`);
  });

  input.addEventListener('wheel', (e) => { /* disabled for testing phantom changes */ });

  // Get the property label element
  const propertyLabel = input.closest('.property_item')?.querySelector('.property_label');

  // Mouse drag support for both input and label
  const startDrag = (e) => {
    if (unitHint.textContent === '-') return; // Don't allow dragging for 'auto'
    const val = parseFloat(input.value);
    if (isNaN(val)) return;
    // Only start dragging if not focused on input
    if (document.activeElement !== input) {
      isDragging = true;
      isScrolling = true;
      startX = e.clientX;
      lastScreenX = e.clientX;
      startValue = val;
      document.body.style.cursor = 'ew-resize';
      input.classList.add('scrolling');
      e.preventDefault();
    }
  };
  // input.addEventListener('mousedown', startDrag);
  // Only add event listener to property label if it exists
  // if (propertyLabel) {
  //   propertyLabel.addEventListener('mousedown', startDrag);
  // }

  // document.addEventListener('mousemove', (e) => {
  //   if (!isDragging) return;
  //   const currentScreenX = e.clientX;
  //   const screenWidth = window.innerWidth;
  //   let deltaX = 0;
  //   // Handle screen edge wrapping
  //   if (currentScreenX <= 0) {
  //     deltaX = -(lastScreenX - currentScreenX);
  //     lastScreenX = currentScreenX + screenWidth;
  //   } else if (currentScreenX >= screenWidth) {
  //     deltaX = currentScreenX - (lastScreenX + screenWidth);
  //     lastScreenX = currentScreenX - screenWidth;
  //   } else {
  //     deltaX = currentScreenX - lastScreenX;
  //     lastScreenX = currentScreenX;
  //   }
  //   // Update value based on movement
  //   const step = 1;
  //   const newValue = Math.max(0, startValue + Math.round(deltaX / 2) * step);
  //   startValue = newValue;
  //   input.value = newValue;
  //   const inputEvent = new InputEvent('input', {
  //     bubbles: true,
  //     cancelable: true,
  //     composed: true,
  //     data: input.value
  //   });
  //   input.dispatchEvent(inputEvent);
  // });

  // document.addEventListener('mouseup', () => {
  //   if (isDragging) {
  //     isDragging = false;
  //     isScrolling = false;
  //     document.body.style.cursor = 'default';
  //     input.classList.remove('scrolling');
  //     // Focus the input after scrolling
  //     input.focus();
  //   }
  // });

  // Prevent text selection while dragging
  document.addEventListener('selectstart', (e) => {
    if (isDragging) {
      e.preventDefault();
    }
  });

  // Store last valid value
  let lastValidValue = '';

  // Live update as you type
  input.addEventListener('input', function (e) {
    const val = this.value.trim();
    // Handle normal value
    if (val === 'normal') {
      unitHint.textContent = '-';
      lastValidValue = 'normal';
      if (property === 'letter-spacing') {
        generateCss(property, 'normal');
      }
      generateCss(property, 'normal');
      return;
    }
    // Prevent 'auto' for font-size
    if (property === 'font-size' && val.toLowerCase() === 'auto') {
      this.value = lastValidValue;
      return;
    }
    // Handle typing 'auto' for other properties
    if (val.toLowerCase() === 'auto') {
      unitHint.textContent = '-';
      lastValidValue = 'auto';
      generateCss(property, 'auto');
      return;
    }
    // Check for unit in the input value
    const unitMatch = val.match(/^([\-\d.]+)(px|em|rem|%|vw|vh)$/i);
    if (unitMatch) {
      const number = unitMatch[1];
      const unit = unitMatch[2].toLowerCase();
      if (this.value !== number) {
        this.value = number;
        this.setSelectionRange(this.value.length, this.value.length);
      }
      unitHint.textContent = unit;
      lastValidValue = number;
      generateCss(property, number + unit);
      return;
    }
    // Prevent negative values for properties that should not allow them
    if (!isNaN(parseFloat(val)) && parseFloat(val) < 0 && property !== 'letter-spacing') {
      this.value = '0';
      return;
    }
    // If number and unit is auto, switch to px
    if (!isNaN(parseFloat(val)) && unitHint.textContent === '-') {
      unitHint.textContent = 'px';
    }
    if (!isNaN(parseFloat(val))) {
      lastValidValue = parseFloat(val);
      generateCss(property, val + unitHint.textContent);
    }
  });

  // Restore last valid value on blur if input is invalid
  input.addEventListener('blur', function () {
    const val = this.value.trim();
    // Check if value has changed
    if (typeof this._lastValue === 'undefined') {
      this._lastValue = val;
    }
    const isValueChanged = val !== this._lastValue;
    this._lastValue = val;
    if (!isValueChanged) {
      return; // No change, do nothing
    }
    // Handle normal value
    if (val === 'normal') {
      this.value = 'normal';
      unitHint.textContent = '-';
      lastValidValue = 'normal';
      if (property === 'letter-spacing') {
        generateCss(property, 'normal');
      }
      generateCss(property, 'normal');
      return;
    }
    // Handle none value (for min/max width/height)
    if (val === 'none' && ['min-width', 'max-width', 'min-height', 'max-height'].includes(property)) {
      this.value = 'none';
      unitHint.textContent = '-';
      lastValidValue = 'none';
      generateCss(property, 'none');
      return;
    }
    // Prevent 'auto' for font-size
    if (property === 'font-size' && val.toLowerCase() === 'auto') {
      this.value = lastValidValue;
      return;
    }
    // Handle auto value for other properties
    if (val.toLowerCase() === 'auto') {
      this.value = 'auto';
      unitHint.textContent = '-';
      lastValidValue = 'auto';
      generateCss(property, 'auto');
      return;
    }
    // Handle value with unit (e.g., 10em, 50vw)
    const match = val.match(/^([\-\d.]+)(px|em|rem|%|vw|vh)$/i);
    if (match) {
      this.value = match[1];
      unitHint.textContent = match[2];
      lastValidValue = match[1];
      generateCss(property, match[1] + match[2]);
      return;
    }
    // Handle numeric values
    if (!isNaN(parseFloat(val))) {
      if (lastValidValue === 'auto' || unitHint.textContent === '-') {
        unitHint.textContent = 'px';
      }
      this.value = parseFloat(val);
      lastValidValue = this.value;
      generateCss(property, this.value + unitHint.textContent);
      return;
    }
    // If input is invalid, restore last valid value
    this.value = lastValidValue;
    if (lastValidValue === 'auto') {
      unitHint.textContent = '-';
      generateCss(property, 'auto');
    } else if (lastValidValue === 'none') {
      unitHint.textContent = '-';
      generateCss(property, 'none');
    } else {
      if (unitHint.textContent === '-' || !unitHint.textContent) unitHint.textContent = 'px';
      generateCss(property, lastValidValue + unitHint.textContent);
    }
  });
}
// --- End refactored unit input widget ---

// --- Per-element, per-property unit memory ---
window.elementUnitMaps = window.elementUnitMaps || {
  'width': new WeakMap(),
  'height': new WeakMap(),
  'min-width': new WeakMap(),
  'max-width': new WeakMap(),
  'min-height': new WeakMap(),
  'max-height': new WeakMap(),
  'font-size': new WeakMap(),
  'line-height': new WeakMap(),
  'letter-spacing': new WeakMap(),
  // Add more properties as needed
};

function restoreUnitInputForElement(property, inputId, unitHintId, computedValue) {
  const input = shadow.querySelector(inputId);
  const unitHint = shadow.querySelector(unitHintId);
  if (window.elementUnitMaps[property] && target && window.elementUnitMaps[property].has(target)) {
    const { value, unit } = window.elementUnitMaps[property].get(target);
    // Round for width/height/min/max
    if (input && ['width', 'height', 'min-width', 'max-width', 'min-height', 'max-height'].includes(property)) {
      input.value = value === 'normal' || value === 'none' ? value : Math.round(Number(value));
    } else if (input) {
      input.value = value === 'normal' ? 'normal' : value;
    }
    if (unitHint) unitHint.textContent = unit === 'normal' || unit === 'none' ? '-' : unit;
  } else {
    const match = computedValue.match(/^([\d.]+)(px|em|rem|%|vw|vh)$/i);
    if (input && match && ['width', 'height', 'min-width', 'max-width', 'min-height', 'max-height'].includes(property)) input.value = Math.round(match[1]);
    else if (input && match) input.value = match[1];
    if (unitHint && match) unitHint.textContent = match[2];
    if (input && !match && ['width', 'height', 'min-width', 'max-width', 'min-height', 'max-height'].includes(property)) input.value = Math.round(toNumb(computedValue));
    else if (input && !match) input.value = toNumb(computedValue);
    if (unitHint && !match) unitHint.textContent = 'px';
  }
}

// --- Overlay creation at startup ---
let inspectaSelectedOverlay = null;
let inspectaSelectedLabel = null;
let inspectaHoverOverlay = null;
let inspectaHoverLabel = null;

function initializeOverlays() {
  if (!document.getElementById('inspecta-selected-overlay')) {
    const sel = document.createElement('div');
    sel.id = 'inspecta-selected-overlay';
    sel.innerHTML = '<div id="inspecta-selected-label" class="inspecta-overlay-label position-bottom"></div>';
    document.body.appendChild(sel);
  }
  if (!document.getElementById('inspecta-hover-overlay')) {
    const hov = document.createElement('div');
    hov.id = 'inspecta-hover-overlay';
    hov.innerHTML = '<div id="inspecta-hover-label" class="inspecta-overlay-label position-bottom"></div>';
    document.body.appendChild(hov);
  }

  // Initialize references
  inspectaSelectedOverlay = document.getElementById('inspecta-selected-overlay');
  inspectaSelectedLabel = document.getElementById('inspecta-selected-label');
  inspectaHoverOverlay = document.getElementById('inspecta-hover-overlay');
  inspectaHoverLabel = document.getElementById('inspecta-hover-label');
}

// Call initialization immediately
// initializeOverlays();

// Add event listeners to reposition labels when viewport changes
window.addEventListener('resize', () => {
  if (inspectaSelectedLabel && inspectaSelectedOverlay && inspectaSelectedOverlay.style.display === 'block') {
    const element = inspectaCurrentlySelected;
    if (element) {
      const rect = element.getBoundingClientRect();
      positionOverlayLabel(inspectaSelectedLabel, rect);
    }
  }
  if (inspectaHoverLabel && inspectaHoverOverlay && inspectaHoverOverlay.style.display === 'block') {
    // We need to find the currently hovered element - this is a bit tricky
    // For now, we'll just hide the hover overlay on resize to avoid positioning issues
    hideHoverOverlay();
  }
});

window.addEventListener('scroll', () => {
  if (inspectaSelectedLabel && inspectaSelectedOverlay && inspectaSelectedOverlay.style.display === 'block') {
    const element = inspectaCurrentlySelected;
    if (element) {
      const rect = element.getBoundingClientRect();
      positionOverlayLabel(inspectaSelectedLabel, rect);
    }
  }
});

// Function to position overlay labels to prevent scrollbar issues
function positionOverlayLabel(label, rect) {
  if (!label) return;

  const viewportHeight = window.innerHeight;
  const labelHeight = 18; // Height of the label (from CSS)
  const buffer = 50; // Increased buffer to be more aggressive about preventing scrollbars

  // Check if element is near the bottom of the viewport
  const elementBottom = rect.bottom;
  const spaceBelow = viewportHeight - elementBottom;

  // Also check if element takes up most of the viewport height (full-height elements)
  const elementHeight = rect.height;
  const isFullHeightElement = elementHeight > viewportHeight * 0.7; // 70% of viewport height (more aggressive)

  // Check if element extends beyond the viewport (causes scrollbars)
  const elementTop = rect.top;
  const isElementBeyondViewport = elementBottom > viewportHeight || elementTop < 0;

  // Check if there's enough space above for the label
  const spaceAbove = elementTop;

  // If there's not enough space below for the label OR it's a full-height element OR element extends beyond viewport, position it above
  // BUT only if there's enough space above
  if ((spaceBelow < labelHeight + buffer || isFullHeightElement || isElementBeyondViewport || elementHeight > viewportHeight * 0.5) && spaceAbove > labelHeight + 10) {
    label.classList.remove('position-bottom', 'position-inside');
    label.classList.add('position-top');
    // console.log('Label positioned ABOVE - spaceAbove:', spaceAbove, 'spaceBelow:', spaceBelow, 'elementHeight:', elementHeight);
  } else if (spaceBelow < labelHeight + buffer && spaceAbove < labelHeight + 10) {
    // No space above or below, position inside the element
    label.classList.remove('position-top', 'position-bottom');
    label.classList.add('position-inside');
    // console.log('Label positioned INSIDE - spaceAbove:', spaceAbove, 'spaceBelow:', spaceBelow, 'elementHeight:', elementHeight);
  } else {
    label.classList.remove('position-top', 'position-inside');
    label.classList.add('position-bottom');
    // console.log('Label positioned BELOW - spaceAbove:', spaceAbove, 'spaceBelow:', spaceBelow, 'elementHeight:', elementHeight);
  }
}

function showSelectedOverlay(element) {
  if (!element || !inspectaSelectedOverlay || !inspectaSelectedLabel) return;

  // Don't show selected overlay in preview mode
  if (window.previewMode) return;
  const rect = element.getBoundingClientRect();
  inspectaSelectedOverlay.style.display = 'block';
  inspectaSelectedOverlay.style.top = `${window.scrollY + rect.top}px`;
  inspectaSelectedOverlay.style.left = `${window.scrollX + rect.left}px`;
  inspectaSelectedOverlay.style.width = `${rect.width}px`;
  inspectaSelectedOverlay.style.height = `${rect.height}px`;
  let tag = element.tagName.toLowerCase();
  let classes = '';
  if (typeof element.className === 'string') {
    classes = element.className ? '.' + element.className.trim()
      .replace(/\s+/g, '.')
      .replace(/\.inspecta-inspect/g, '')
      .replace(/\.inspecta-inspect-active/g, '')
      .replace(/\.inspecta-inspect-isolated/g, '') : '';
  } else if (element.className && typeof element.className.baseVal === 'string') {
    classes = element.className.baseVal ? '.' + element.className.baseVal.trim()
      .replace(/\s+/g, '.')
      .replace(/\.inspecta-inspect/g, '')
      .replace(/\.inspecta-inspect-active/g, '')
      .replace(/\.inspecta-inspect-isolated/g, '') : '';
  }
  // Only show the blue label if the selected element is NOT being hovered
  if (window.lastPopoverTarget && window.lastPopoverTarget === element) {
    inspectaSelectedLabel.style.display = 'none';
  } else {
    inspectaSelectedLabel.style.display = 'block';
    // Truncate classes to show only element type and first class
    const truncatedClasses = truncateElementLabel(classes);
    inspectaSelectedLabel.textContent = `${tag}${truncatedClasses}`;

    // Position label to prevent scrollbar issues
    positionOverlayLabel(inspectaSelectedLabel, rect);

    // Debug: Log label visibility
    // console.log('Selected label displayed:', inspectaSelectedLabel.textContent, 'display:', inspectaSelectedLabel.style.display, 'classes:', inspectaSelectedLabel.className);
  }
}

// Function to truncate element label to show only element type and first class
function truncateElementLabel(classes) {
  if (!classes) return '';

  // Find the first dot after the element type
  const firstDotIndex = classes.indexOf('.');
  if (firstDotIndex === -1) return classes;

  // Find the second dot
  const secondDotIndex = classes.indexOf('.', firstDotIndex + 1);
  if (secondDotIndex === -1) return classes;

  // Return everything up to and including the first class (with its dot)
  return classes.substring(0, secondDotIndex);
}

function showHoverOverlay(element) {
  if (!element || !inspectaHoverOverlay || !inspectaHoverLabel) {
    // If overlays aren't initialized, try to initialize them
    initializeOverlays();
    // If still not available, return
    if (!inspectaHoverOverlay || !inspectaHoverLabel) return;
  }

  // Don't show hover overlay in preview mode
  if (window.previewMode) return;

  if (element === inspectaCurrentlySelected) return;
  const rect = element.getBoundingClientRect();
  inspectaHoverOverlay.style.display = 'block';
  inspectaHoverOverlay.style.top = `${window.scrollY + rect.top}px`;
  inspectaHoverOverlay.style.left = `${window.scrollX + rect.left}px`;
  inspectaHoverOverlay.style.width = `${rect.width}px`;
  inspectaHoverOverlay.style.height = `${rect.height}px`;

  // Show the hover label with element name
  let tag = element.tagName.toLowerCase();
  let classes = '';
  if (typeof element.className === 'string') {

    classes = element.className
      ? '.' +
      element.className
        .trim()
        .replace(/\s+/g, '.')
        .replace(/\.inspecta-[\w-]*/g, '')
        .replace('-isolated', '') // Remove any class starting with .inspecta-
      : '';
  } else if (element.className && typeof element.className.baseVal === 'string') {
    classes = element.className.baseVal
      ? '.' +
      element.className.baseVal
        .trim()
        .replace(/\s+/g, '.')
        .replace(/\.inspecta-[\w-]*/g, '')
        .replace('-isolated', '') // Remove any class starting with .inspecta-
      : '';
  }

  inspectaHoverLabel.style.display = 'block';
  inspectaHoverLabel.textContent = `${tag}${classes.replace('-isolated', '')}`;

  // Position label to prevent scrollbar issues
  positionOverlayLabel(inspectaHoverLabel, rect);

  // Debug: Log label visibility
  // console.log('Hover label displayed:', inspectaHoverLabel.textContent, 'display:', inspectaHoverLabel.style.display, 'classes:', inspectaHoverLabel.className);
}

function hideHoverOverlay() {
  if (!inspectaHoverOverlay) return;
  // console.log('hideHoverOverlay');
  inspectaHoverOverlay.style.display = 'none';
}

// --- Real-time selected overlay update ---
let inspectaSelectedOverlayRAF = null;
let inspectaSelectedOverlayTarget = null;

function startSelectedOverlayLoop(element) {
  stopSelectedOverlayLoop();
  inspectaSelectedOverlayTarget = element;
  function update() {
    if (inspectaSelectedOverlayTarget) {
      showSelectedOverlay(inspectaSelectedOverlayTarget);
      inspectaSelectedOverlayRAF = requestAnimationFrame(update);
    }
  }
  inspectaSelectedOverlayRAF = requestAnimationFrame(update);
}

function stopSelectedOverlayLoop() {
  if (inspectaSelectedOverlayRAF) {
    cancelAnimationFrame(inspectaSelectedOverlayRAF);
    inspectaSelectedOverlayRAF = null;
  }
  inspectaSelectedOverlayTarget = null;
}

// Patch selectElementForInspecta to start/stop the overlay loop
function selectElementForInspecta(element) {
  inspectaCurrentlySelected = element;
  showSelectedOverlay(element);
  startSelectedOverlayLoop(element);
  hideHoverOverlay(); // Always hide hover overlay when selecting

  // Update property change indicators for the selected element
  setTimeout(() => {
    if (typeof window.updatePropertyChangeIndicators === 'function') {
      window.updatePropertyChangeIndicators();
    }
  }, 100);

  // Use the new element selection handler
  setTimeout(() => {
    if (typeof window.handleElementSelectionChange === 'function') {
      window.handleElementSelectionChange();
    }
  }, 150);
}

// When deselecting (if needed), call stopSelectedOverlayLoop();

// Ensures all Inspecta UI is present if active, or fully removed if not
function ensureInspectaUIState(active) {
  window.inspectaIsActive = !!active;
  if (active) {
    // Restore images from storage when extension is activated
    if (window.inspectaImageStorage && window.inspectaImageStorage.restore) {
      window.inspectaImageStorage.restore();
    }

    // Ensure overlays
    initializeOverlays();
    // Ensure app container
    if (!document.getElementById('inspecta_app_container')) {
      createInspectaApp();
    }
    // Ensure stylesheet
    if (!document.getElementById('inspectaStylesheet')) {
      createInspectaStylesheet(inspectaCss);
    }
    // Show app container if hidden
    const appContainer = document.getElementById('inspecta_app_container');
    if (appContainer) appContainer.style.display = 'block';
    // Show overlays if hidden
    const selOverlay = document.getElementById('inspecta-selected-overlay');
    if (selOverlay) selOverlay.style.display = 'block';
    const hovOverlay = document.getElementById('inspecta-hover-overlay');
    if (hovOverlay) hovOverlay.style.display = 'block';
  } else {
    // Reset all images to original state when extension is deactivated
    if (window.inspectaImageStorage && window.inspectaImageStorage.resetAll) {
      window.inspectaImageStorage.resetAll();
    }

    // Remove all Inspecta UI
    fullCleanupInspecta();
    // Remove info popover if present
    const popover = document.querySelector('.info-popover');
    if (popover && popover.parentNode) popover.parentNode.removeChild(popover);
    // Remove overlays if still present
    const selOverlay = document.getElementById('inspecta-selected-overlay');
    if (selOverlay && selOverlay.parentNode) selOverlay.parentNode.removeChild(selOverlay);
    const hovOverlay = document.getElementById('inspecta-hover-overlay');
    if (hovOverlay && hovOverlay.parentNode) hovOverlay.parentNode.removeChild(hovOverlay);
    // Remove overlay image if present
    const overlayImage = document.getElementById('overlayImage');
    if (overlayImage && overlayImage.parentNode) overlayImage.parentNode.removeChild(overlayImage);
    // Remove outline style container if present
    const outlineStyle = document.getElementById('outline_style_container');
    if (outlineStyle && outlineStyle.parentNode) outlineStyle.parentNode.removeChild(outlineStyle);
  }
}

// Handle blur event for editable links and buttons
function handleEditableBlur(event) {
  const element = event.target;

  // Remove the editable interactive class and restore original cursor
  if (element.classList.contains('inspecta-editable-interactive')) {
    element.classList.remove('inspecta-editable-interactive');
    if (element._inspectaOriginalCursor) {
      element.style.cursor = element._inspectaOriginalCursor;
    }
  }

  // Remove event listeners
  element.removeEventListener('blur', handleEditableBlur);
  element.removeEventListener('keydown', handleEditableKeydown);

  // Remove contenteditable attribute
  element.removeAttribute('contenteditable');
}

// Handle keydown event for editable links and buttons
function handleEditableKeydown(event) {
  const element = event.target;

  // Allow Enter to save changes and exit edit mode
  if (event.key === 'Enter') {
    event.preventDefault();
    element.blur();
    return;
  }

  // Allow Escape to cancel changes and exit edit mode
  if (event.key === 'Escape') {
    event.preventDefault();
    // Restore original content if available
    if (element._inspectaOriginalContent) {
      element.textContent = element._inspectaOriginalContent;
    }
    element.blur();
    return;
  }

  // Allow Ctrl+S to save changes
  if (event.ctrlKey && event.key === 's') {
    event.preventDefault();
    element.blur();
    return;
  }
}

function initResizeObserver() {
  // ... existing code ...
}

// Make function available globally
window.selectElementForInspecta = selectElementForInspecta;
window.showHoverOverlay = showHoverOverlay;
window.hideHoverOverlay = hideHoverOverlay;
window.populateCSS = populateCSS;

// Initialize Cursor IDE notification connection when Inspecta is ready
if (typeof window.connectToCursorNotifications === 'function') {
  // Wait a bit for everything to be ready, then connect
  setTimeout(() => {
    // console.log('🚀 Initializing Cursor IDE notification connection...');
    window.connectToCursorNotifications();
  }, 2000);
}

// Initialize bridge status to disconnected on page load
if (typeof window.updateBridgeStatus === 'function') {
  // Try to update status immediately
  window.updateBridgeStatus('disconnected');

  // Also try after a delay in case elements aren't ready
  setTimeout(() => {
    window.updateBridgeStatus('disconnected');
  }, 500);
}

// Initialize refresh icon handler
if (typeof window.setupRefreshIconHandler === 'function') {
  // Set up the refresh icon click handler
  setTimeout(() => {
    window.setupRefreshIconHandler();
  }, 1000);
}

// Check if current page is localhost
function isLocalhost() {
  const hostname = window.location.hostname;
  return hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.endsWith('.local');
}

// Initialize AI agent bridge panel collapse/expand functionality
function initAIBridgePanelToggle() {
  if (!window.shadow) {
    setTimeout(initAIBridgePanelToggle, 100);
    return;
  }

  const bridgeHeader = window.shadow.querySelector('#ai_agent_bridge_header');
  const bridgeContent = window.shadow.querySelector('#ai_agent_bridge_content');
  const expandIcon = window.shadow.querySelector('#ai_agent_bridge_header .expand');

  // Hide AI bridge panel if not on localhost
  if (!isLocalhost()) {
    if (bridgeHeader && bridgeHeader.parentElement) {
      bridgeHeader.parentElement.style.display = 'none';
    }
    return;
  }

  if (!bridgeHeader || !bridgeContent || !expandIcon) {
    // Retry after a short delay if elements aren't ready
    setTimeout(initAIBridgePanelToggle, 100);
    return;
  }

  // Set initial state (expanded by default)
  bridgeContent.style.display = 'flex';
  expandIcon.style.transform = 'rotate(180deg)';

  // Add click event listener
  bridgeHeader.addEventListener('click', function (event) {
    const isExpanded = bridgeContent.style.display !== 'none';

    if (isExpanded) {
      // Collapse
      bridgeContent.style.display = 'none';
      expandIcon.style.transform = 'rotate(0deg)';
    } else {
      // Expand
      bridgeContent.style.display = 'flex';
      expandIcon.style.transform = 'rotate(180deg)';
    }
  });
}

// Initialize the bridge panel toggle
initAIBridgePanelToggle();

// Initialize setup guide popup functionality
function initSetupGuidePopup() {
  if (!window.shadow) {
    setTimeout(initSetupGuidePopup, 100);
    return;
  }

  const setupGuideButton = window.shadow.querySelector('#ai_agent_setup_guide');
  const setupPopup = window.shadow.querySelector('#setup-guide-popup');
  const setupPopupClose = window.shadow.querySelector('#setup-popup-close');

  if (!setupGuideButton || !setupPopup || !setupPopupClose) {
    setTimeout(initSetupGuidePopup, 100);
    return;
  }

  // Set the header image source using Chrome extension URL
  const headerImage = window.shadow.querySelector('.header-image');
  if (headerImage) {
    headerImage.src = chrome.runtime.getURL('assets/cursor_dialog_header.png');
  }

  // Check if we should show the setup guide popup automatically
  chrome.storage.local.get(['showSetupGuide'], function (result) {
    if (result.showSetupGuide) {
      // Show the popup automatically
      setupPopup.style.display = 'flex';
      // Clear the flag so it doesn't show again
      chrome.storage.local.remove(['showSetupGuide']);
    }
  });

  // Show popup when setup guide button is clicked
  setupGuideButton.addEventListener('click', function () {
    setupPopup.style.display = 'flex';
  });

  // Hide popup when close button is clicked
  setupPopupClose.addEventListener('click', function () {
    setupPopup.style.display = 'none';
  });

  // Hide popup when clicking outside the content
  setupPopup.addEventListener('click', function (event) {
    if (event.target === setupPopup) {
      setupPopup.style.display = 'none';
    }
  });

  // Hide popup when pressing Escape key
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && setupPopup.style.display === 'flex') {
      setupPopup.style.display = 'none';
    }
  });
}

// Initialize setup guide popup
initSetupGuidePopup();


// Inject Inter font dynamically if not already present
// Removed duplicate Inter font loading - already loaded in createInspectaApp()



