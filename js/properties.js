"use strict";

// At the top of the file or relevant scope, define a safe root:
const getRoot = () => (typeof shadow !== 'undefined' && shadow) ? shadow : document;
const getBody = () => (typeof shadow !== 'undefined' && shadow) ? shadow : document.body;



let boxshadow = {
  x: 0,
  y: 0,
  blure: 0,
  spread: 0,
  color: { color: "#000000", opacityPCT: 100, opacityHEX: "00" },
};
let btn_border_link;
let border_solo;
let btn_radius_link;
let radius_solo;
let font_weight_select;
let options_font_weight;

let ic_expand_rotate;
//let ic_expand_rotate_side;

let pnl_elements;
let pnl_element_selection_arrows;
let inspect_hint;

let fontColorPicker;
let borderColorPicker;
let bgColorPicker;
let boxShadowColorPicker;

let el_up;
let el_down;
let el_left;
let el_right;

let btn_paste_css_props_panel;

let pastedStyleObjectPropsPanel;

// Add a global state variable at the top of the file
let allPanelsExpanded = true;  // Start with all panels expanded
let overviewPanelsExpanded = true;  // State for overview panels
let elementsPanelsExpanded = true;  // State for elements panels
let propertiesPanelsExpanded = true;  // State for properties panels

// Selection overlay logic
let inspectaCurrentlySelected = null;

// Track last valid z-index value per element
const lastValidZIndexMap = new WeakMap();

// --- Global Color Changes ---
let globalColorChanges = JSON.parse(localStorage.getItem('globalColorChanges') || '[]');

function saveGlobalColorChanges() {
  localStorage.setItem('globalColorChanges', JSON.stringify(globalColorChanges));
  updateGlobalColorChangesStylesheet();
}

function updateGlobalColorChangesStylesheet() {
  // Remove old style tag if exists
  let styleTag = document.getElementById('global-color-changes-style');
  if (styleTag) styleTag.remove();
  // Build CSS rules for all enabled global color changes
  let css = '';
  globalColorChanges.filter(e => e.enabled !== false).forEach(entry => {
    // For each color property
    ['background-color', 'color', 'border-color'].forEach(prop => {
      // Attribute selector for inline style
      css += `*[style*="${prop}: ${entry.originalColor}"] { ${prop}: ${entry.newColor} !important; }\n`;
      css += `*[style*="${prop}:${entry.originalColor}"] { ${prop}: ${entry.newColor} !important; }\n`;
    });
  });
  if (css) {
    styleTag = document.createElement('style');
    styleTag.id = 'global-color-changes-style';
    styleTag.textContent = css;
    document.head.appendChild(styleTag);
  }
}

// Also call on load
updateGlobalColorChangesStylesheet();

function renderGlobalColorChangesUI() {
  const pnlChanges = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector('#pnl_changes') : document.querySelector('#pnl_changes');
  if (!pnlChanges) return;

  // Find the container for global color changes
  let container = pnlChanges.querySelector('#global-color-changes-container');

  // If there are no changes, ensure the container is removed and exit
  if (globalColorChanges.length === 0) {
    if (container) {
      container.remove();
    }
    return;
  }

  // If there are changes, create the container if it doesn't exist
  if (!container) {
    container = document.createElement('div');
    container.id = 'global-color-changes-container';
    container.style.marginBottom = '16px';
    // Insert it before the main changes content
    const content = pnlChanges.querySelector('#pnl_changes_content');
    if (content) {
      pnlChanges.insertBefore(container, content);
    } else {
      pnlChanges.appendChild(container);
    }
  }

  // Clear previous content and render new changes
  container.innerHTML = ``;
  globalColorChanges.forEach((entry, idx) => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.marginBottom = '4px';
    row.innerHTML = `
      <div style="width:18px;height:18px;background:${entry.originalColor};border:1px solid #ccc;margin-right:4px;"></div>
      <span style="font-size:12px;margin-right:8px;">${entry.originalColor}</span>
      <span style="margin:0 4px;">→</span>
      <div style="width:18px;height:18px;background:${entry.newColor};border:1px solid #ccc;margin-right:4px;"></div>
      <span style="font-size:12px;margin-right:8px;">${entry.newColor}</span>
      <button style="background:none;border:none;cursor:pointer;color:#c00;font-size:16px;" title="Delete" data-idx="${idx}" class="global-color-delete-btn">🗑️</button>
    `;
    container.appendChild(row);
  });
  // Event handlers
  container.querySelectorAll('.global-color-delete-btn').forEach(btn => {
    btn.onclick = function () {
      const idx = parseInt(this.getAttribute('data-idx'));
      globalColorChanges.splice(idx, 1);
      saveGlobalColorChanges();
      renderGlobalColorChangesUI();
      // TODO: update stylesheet
    };
  });
}

// Call this in initProperties to render on load
initProperties = (function (origInit) {
  return function () {
    origInit && origInit();
    renderGlobalColorChangesUI();
  };
})(initProperties);


// Image storage flag (similar to isStoreCss)
let isStoreImages = true;
window.isStoreImages = isStoreImages;

function toggleStoreImages(isApplyChanges) {
  // Delegate to ImageEditor if available
  if (window.imageEditor && typeof window.imageEditor.toggleStoreImages === 'function') {
    window.imageEditor.toggleStoreImages(isApplyChanges);
  } else {
    // Fallback for backward compatibility
    isStoreImages = isApplyChanges;
    window.isStoreImages = isStoreImages;
  }
}

// Image storage functions - now handled by ImageEditor class
// Functions are delegated to window.imageEditor when available

// Make functions available globally for debugging - delegate to ImageEditor
window.inspectaImageStorage = {
  save: (imgElement, newSrc, newAlt) => {
    if (window.imageEditor) return window.imageEditor.saveImageToStorage(imgElement, newSrc, newAlt);
  },
  restore: () => {
    if (window.imageEditor) return window.imageEditor.restoreImagesFromStorage();
  },
  restoreSingle: (imgElement) => {
    if (window.imageEditor) return window.imageEditor.restoreImageFromStorage(imgElement);
  },
  resetAll: () => {
    if (window.imageEditor) return window.imageEditor.resetAllImagesToOriginal();
  },
  resetSingle: (imgElement) => {
    if (window.imageEditor) return window.imageEditor.resetImageToOriginal(imgElement);
  },
  clear: () => {
    if (window.imageEditor) return window.imageEditor.clearImageStorage();
  },
  toggle: (isApplyChanges) => {
    return toggleStoreImages(isApplyChanges);
  },
  deleteAndRestore: (imgElement) => {
    if (window.imageEditor) return window.imageEditor.deleteImageAndRestoreOriginal(imgElement);
  }
};

function initProperties() {
  initPropertiesObjects();

  // Restore images from storage when the extension initializes (with delay like text changes)
  setTimeout(() => {
    if (window.imageEditor && typeof window.imageEditor.restoreImagesFromStorage === 'function') {
      window.imageEditor.restoreImagesFromStorage();
    }
  }, 500);

  // Initialize Simplebar on scrollable elements
  if (typeof SimpleBar !== 'undefined') {
    if (properties_list) {
      new SimpleBar(properties_list);
    }
    if (pnl_changes) {
      const pnlChangesContent = pnl_changes.querySelector('#pnl_changes_content');
      if (pnlChangesContent) {
        new SimpleBar(pnlChangesContent);
      }
    }
    if (pnl_overview) {
      new SimpleBar(pnl_overview);
    }
  }

  initExpandCollapse();
  inputsEventRegisterForProperties();
  //initInputValuesByMouseDrag();
  initBorderAndRadiusLink();
  initElementSiblings();
  initElementParenChild();
  setupBorderAndRadiusArrowKeyValidation();
  setupAllOpacityInputs();
  // At the end of initProperties, after setupAllOpacityInputs(), add robust event listeners for border opacity:
  setupBorderOpacityInputEvents();
  setupLetterSpacingArrowKeyValidation();
  setupAllBoxShadowArrowKeyValidation(); // Add this line to initialize box shadow inputs
  setupMainElementOpacity(); // Add this line to initialize main element opacity input
  setupZIndexArrowKeyValidation(); // Add this line to initialize z-index input
  setupGapArrowKeyValidation(); // Add this line to initialize gap input
  setupFrameMarginPaddingUnitInputs(); // Add this line to initialize margin and padding unit inputs
  // setupFrameMarginPaddingManualInputs(); // Removed duplicate - causes double increment
  setupAbsolutePositionManualInputs(); // Add this line to initialize position unit inputs
  setupAbsolutePositionActionIcons(); // Add this line to initialize position action icons

  // Attach z-index handler after input exists
  if ($id("in_z_index")) {
    ["input", "change", "blur"].forEach(evt => {
      $id("in_z_index").addEventListener(evt, handleZIndexInput);
    });
  }

  // SVG upload button
  const svgUploadBtn = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector('#in_svg_upload') : document.querySelector('#in_svg_upload');
  let svgUploadInput = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector('#svg_upload_input') : document.querySelector('#svg_upload_input');

  if (svgUploadBtn) {
    if (!svgUploadInput) {
      svgUploadInput = document.createElement('input');
      svgUploadInput.type = 'file';
      svgUploadInput.accept = '.svg';
      svgUploadInput.style.display = 'none';
      svgUploadInput.id = 'svg_upload_input';
      if (typeof shadow !== 'undefined' && shadow) {
        shadow.appendChild(svgUploadInput);
      } else {
        document.body.appendChild(svgUploadInput);
      }
    }

    svgUploadBtn.onclick = function (event) {
      event.stopPropagation();
      svgUploadInput.value = '';
      svgUploadInput.click();
    };

    svgUploadInput.onclick = function (event) {
      event.stopPropagation();
    };

    svgUploadInput.onchange = function (event) {
      const file = event.target.files[0];
      if (file && file.type === 'image/svg+xml') {
        const reader = new FileReader();
        reader.onload = function (e) {
          const svgContent = e.target.result;
          const parser = new DOMParser();
          const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
          const parserError = svgDoc.querySelector('parsererror');
          if (parserError) {
            showToast('Invalid SVG file!', 2000);
            return;
          }
          const newSvg = svgDoc.documentElement;
          if (newSvg.namespaceURI !== 'http://www.w3.org/2000/svg') {
            showToast('Invalid SVG file!', 2000);
            return;
          }
          // Update textarea and preview
          const svgCodeTextarea = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector('#svg_code') : document.querySelector('#svg_code');
          const svgPreview = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector('#svg_preview') : document.querySelector('#svg_preview');
          if (svgCodeTextarea) svgCodeTextarea.value = newSvg.outerHTML;
          if (svgPreview) {
            svgPreview.innerHTML = '';
            svgPreview.appendChild(newSvg.cloneNode(true));
          }
          // Replace the SVG in the DOM only if window.target is a valid SVG
          if (window.target && window.target.nodeName && window.target.nodeName.toLowerCase() === 'svg' && window.target.parentNode) {
            window.target.parentNode.replaceChild(newSvg, window.target);
            window.target = newSvg; // update reference
            showToast('SVG applied!', 2000);
          } else {
            showToast('No inline SVG element selected in DOM to replace.', 2000);
          }
        };
        reader.readAsText(file);
      } else {
        showToast('Please upload a valid SVG file!', 2000);
      }
    };
  }

  // SVG paste button
  const svgPasteBtn = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector('#in_svg_paste') : document.querySelector('#in_svg_paste');
  const svgCodeTextarea = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector('#svg_code') : document.querySelector('#svg_code');
  const svgPreview = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector('#svg_preview') : document.querySelector('#svg_preview');

  if (svgPasteBtn && svgCodeTextarea && svgPreview) {
    svgPasteBtn.onclick = async function () {
      if (!(window.chrome && chrome.runtime && chrome.runtime.id)) return;
      try {
        const text = await navigator.clipboard.readText();
        if (!text.trim().startsWith('<svg')) return;
        svgCodeTextarea.value = text;
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(text, 'image/svg+xml');
        const parserError = svgDoc.querySelector('parsererror');
        if (parserError) return;
        const newSvg = svgDoc.documentElement;
        if (newSvg.namespaceURI !== 'http://www.w3.org/2000/svg') return;
        svgPreview.innerHTML = '';
        svgPreview.appendChild(newSvg.cloneNode(true));
        if (window.target && window.target.nodeName && window.target.nodeName.toLowerCase() === 'svg' && window.target.parentNode) {
          window.target.parentNode.replaceChild(newSvg, window.target);
          window.target = newSvg;
          showToast('SVG applied!', 2000);
        }
      } catch (err) { }
    };
  }

  // SVG download button
  const svgDownloadBtn = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector('#in_svg_download') : document.querySelector('#in_svg_download');
  if (svgDownloadBtn && svgCodeTextarea) {
    svgDownloadBtn.onclick = function () {
      const svgCode = svgCodeTextarea.value;
      if (!svgCode.trim().startsWith('<svg')) {
        showToast('No valid SVG code to download.', 2000);
        return;
      }
      const blob = new Blob([svgCode], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'inline.svg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast('SVG downloaded!', 2000);
    };
  }

  // Absolute-positioned clipboard icon for SVG code
  const svgCodeCopyAbs = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector('#svg_code_copy_abs') : document.querySelector('#svg_code_copy_abs');
  if (svgCodeCopyAbs && svgCodeTextarea) {
    svgCodeCopyAbs.onclick = function () {
      svgCodeTextarea.select();
      document.execCommand('copy');
      showToast('SVG code copied to clipboard!', 2000);
    };
  }

  // Update SVG preview and DOM when textarea changes
  if (svgCodeTextarea && svgPreview) {
    svgCodeTextarea.addEventListener('input', function () {
      const text = svgCodeTextarea.value;
      if (!text.trim().startsWith('<svg')) return;
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(text, 'image/svg+xml');
      const parserError = svgDoc.querySelector('parsererror');
      if (parserError) return;
      const newSvg = svgDoc.documentElement;
      if (newSvg.namespaceURI !== 'http://www.w3.org/2000/svg') return;
      // Update preview
      svgPreview.innerHTML = '';
      svgPreview.appendChild(newSvg.cloneNode(true));
      // Replace in DOM if possible
      if (window.target && window.target.nodeName && window.target.nodeName.toLowerCase() === 'svg' && window.target.parentNode) {
        window.target.parentNode.replaceChild(newSvg, window.target);
        window.target = newSvg;
      }
    });
  }
}

function initPropertiesObjects() {
  pnl_properties = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector("#pnl_properties") : document.querySelector("#pnl_properties");
  properties_list = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector(".properties_list") : document.querySelector(".properties_list");
  btn_close_properties = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector("#btn_close_properties_pnl") : document.querySelector("#btn_close_properties_pnl");
  btn_properties_position = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector("#btn_properties_position") : document.querySelector("#btn_properties_position");

  boxshadow = {
    x: 0,
    y: 0,
    blure: 0,
    spread: 0,
    color: { color: "#000000", opacityPCT: 100, opacityHEX: "00" },
  };
  btn_border_link = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector("#btn_border_link") : document.querySelector("#btn_border_link");
  border_solo = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector("#border_solo") : document.querySelector("#border_solo");
  btn_radius_link = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector("#btn_radius_link") : document.querySelector("#btn_radius_link");
  radius_solo = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector("#radius_solo") : document.querySelector("#radius_solo");
  font_weight_select = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector("#font_weight_select") : document.querySelector("#font_weight_select");
  options_font_weight = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector("#options_font_weight") : document.querySelector("#options_font_weight");
  ic_expand_rotate = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector(".expand") : document.querySelector(".expand");
  //ic_expand_rotate_side = shadow.querySelector(".expand-side");
  el_up = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector("#el_up") : document.querySelector("#el_up");
  el_down = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector("#el_down") : document.querySelector("#el_down");
  el_left = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector("#el_left") : document.querySelector("#el_left");
  el_right = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector("#el_right") : document.querySelector("#el_right");
  pnl_overview = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector("#pnl-overview") : document.querySelector("#pnl-overview");
  pnl_elements = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector("#pnl-elements") : document.querySelector("#pnl-elements");
  pnl_title = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector("#pnl_title") : document.querySelector("#pnl_title");
  pnl_element_selection_arrows = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector(
    "#pnl_element_selection_arrows"
  ) : document.querySelector("#pnl_element_selection_arrows");
  tab_properties = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector("#tab_properties") : document.querySelector("#tab_properties");
  tab_changes = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector("#tab_changes") : document.querySelector("#tab_changes");
  pnl_changes = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector("#pnl_changes") : document.querySelector("#pnl_changes");
  pnl_properties_content = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector("#pnl_properties_content") : document.querySelector("#pnl_properties_content");
  inspect_hint = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector("#inspect_hint") : document.querySelector("#inspect_hint");

  btn_paste_css_props_panel = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector("#btn_paste_css_props_panel") : document.querySelector("#btn_paste_css_props_panel");

  // Image panel event handlers are now managed by ImageEditor class

  // Image panel logic is now handled by ImageEditor class

  // Dynamically load applyClipboardCSS.js if not already loaded
  if (!window.applyClipboardCSS) {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('/js/applyClipboardCSS.js');
    script.onload = function () {
    };
    // Append to shadow root if available, else to document
    if (window.shadow) {
      window.shadow.appendChild(script);
    } else {
      document.body.appendChild(script);
    }
  }

  // Find the button in the correct root
  // Note: Clipboard CSS functionality has been moved to element toolbar
  // The old btn_apply_clipboard_css button is no longer needed
}
// Use InspectaColorPicker instead of CodeMirror ColorPicker
let colorpickerTimeoutId = -1;

function initColorPickers() {

  // Reset gradient state only for background color picker (gradients are only for backgrounds)
  if (typeof bgColorPicker !== 'undefined' && bgColorPicker && typeof bgColorPicker.resetGradientState === 'function') {
    bgColorPicker.resetGradientState();
  }

  // Helper function to control opacity input visibility
  const updateOpacityInputVisibility = (backgroundType) => {
    const opacityInput = $id("in_bg_color_opac");
    const percentageLabel = opacityInput.nextElementSibling;

    if (opacityInput) {
      if (backgroundType === 'solid') {
        opacityInput.style.display = 'block';
        if (percentageLabel && percentageLabel.classList.contains('value_type')) {
          percentageLabel.style.display = 'flex';
        }
      } else {
        opacityInput.style.display = 'none';
        if (percentageLabel && percentageLabel.classList.contains('value_type')) {
          percentageLabel.style.display = 'none';
        }
      }
    }
  };

  // Helper function to get valid color value
  const getValidColor = (element, hexInputId, fallbackColor = '#ffffff') => {
    // Prefer the value in the hex input if present
    const hexInput = $id(hexInputId);
    const opacityInput = $id(hexInputId.replace('_hex', '_opac'));

    if (hexInput && hexInput.value) {
      // Support both 6-character hex (without #) and 7-character hex (with #)
      let hexColor;
      if (/^#[0-9A-Fa-f]{6}$/.test(hexInput.value)) {
        hexColor = hexInput.value;
      } else if (/^[0-9A-Fa-f]{6}$/.test(hexInput.value)) {
        hexColor = '#' + hexInput.value;
      } else {
        hexColor = hexInput.value;
      }

      // If we have an opacity input, return an object with color and alpha for Iro.js
      if (opacityInput && opacityInput.value) {
        const opacity = parseInt(opacityInput.value);
        if (!isNaN(opacity)) {
          return {
            color: hexColor,
            alpha: opacity / 100
          };
        }
      }

      return hexColor;
    }

    // For background color, check the container element's style for gradients
    if (hexInputId === "in_bg_color_hex" && element) {
      const containerStyle = element.style;
      const background = containerStyle.background || containerStyle.backgroundImage;
      const backgroundColor = containerStyle.backgroundColor;

      // Check if it's a gradient (only linear and radial)
      if (background && (background.includes('linear-gradient') ||
        background.includes('radial-gradient'))) {
        return background;
      }

      // Check if it's a solid color
      if (background && background !== 'none' && !background.includes('gradient')) {
        return background;
      }

      // Check if background is transparent or none
      if (backgroundColor === 'rgba(0, 0, 0, 0)' || backgroundColor === 'transparent' ||
        background === 'none' || background === 'rgba(0, 0, 0, 0)') {
        return 'transparent';
      }
    }

    // Fallback to the element's style
    if (element && element.style && element.style.background && element.style.background !== 'unset') {
      return element.style.background;
    }

    // Fallback to default
    return fallbackColor;
  };

  // Initialize color pickers with InspectaColorPicker
  if (typeof bgColorPicker !== 'undefined' && bgColorPicker && typeof bgColorPicker.destroy === 'function') {
    bgColorPicker.destroy();
    bgColorPicker = null;
  }

  bgColorPicker = new InspectaColorPicker({
    shadowRoot: shadow,
    containerId: "in_bg_color",
    // container: $id("in_bg_color"),
    initialColor: getValidColor($id("in_bg_color"), "in_bg_color_hex"),
    onColorChange: (color) => {
      // Skip applying changes during initialization
      if (bgColorPicker.isInitializing) {
        return;
      }

      if (color && color.type === 'gradient') {
        populateGradientFromPicker(
          color,
          "in_bg_color_hex",
          "in_bg_color",
          "in_bg_color_opac"
        );
        applyGradientBackground(color.cssString, true);
        // Hide opacity input for gradients
        updateOpacityInputVisibility('gradient');
        // Do not run the normal populateColorFromPicker or applyBackgroundColor for gradients
      }
      else if (color && color.type === 'image') {


        // Handle image background
        populateImageFromPicker(color);
        applyImageBackground(color, true);
        // Hide opacity input for images
        updateOpacityInputVisibility('image');
      }
      else {
        // Update the properties panel UI with 6-digit hex and separate opacity

        // Set the hex input to 6-digit color
        $id("in_bg_color_hex").value = color.hexString;

        // Set the opacity input to percentage
        const opacity = Math.round(color.alpha * 100);
        $id("in_bg_color_opac").value = opacity;

        // Update the thumbnail
        const colorElement = $id("in_bg_color");
        if (colorElement) {
          if (opacity === 0) {
            colorElement.style.backgroundColor = 'transparent';
          } else {
            const colorWithAlpha = hexColorWithOptionalAlpha(color.hexString, opacity);
            colorElement.style.backgroundColor = colorWithAlpha;
          }
        }

        // Apply the color immediately for live preview
        if (opacity === 0) {
          // If alpha is 0, apply transparent background
          applyBackgroundColor('transparent', true);
        } else {
          const colorWithAlpha = hexColorWithOptionalAlpha(color.hexString, opacity);
          applyBackgroundColor(colorWithAlpha, true);
        }

        // Show opacity input for solid colors
        updateOpacityInputVisibility('solid');
      }


    },
    onColorApply: (color) => {
      // Apply the color when user confirms
      const opacity = Math.round(color.alpha * 100);

      // Update the properties panel UI with 6-digit hex and separate opacity
      // Set the hex input to 6-digit color
      $id("in_bg_color_hex").value = color.hexString;

      // Set the opacity input to percentage
      $id("in_bg_color_opac").value = opacity;

      // Update the thumbnail
      const colorElement = $id("in_bg_color");
      if (colorElement) {
        if (opacity === 0) {
          colorElement.style.backgroundColor = 'transparent';
        } else {
          const colorWithAlpha = hexColorWithOptionalAlpha(color.hexString, opacity);
          colorElement.style.backgroundColor = colorWithAlpha;
        }
      }

      if (opacity === 0) {
        // If alpha is 0, apply transparent background
        applyBackgroundColor('transparent', true);
      } else {
        const colorWithAlpha = hexColorWithOptionalAlpha(color.hexString, opacity);
        applyBackgroundColor(colorWithAlpha, true);
      }

      // Show opacity input for solid colors
      updateOpacityInputVisibility('solid');
    }
  });

  // Check if initial color is a gradient and set it up
  const initialColor = getValidColor($id("in_bg_color"), "in_bg_color_hex");
  if (initialColor && typeof initialColor === 'string' &&
    (initialColor.includes('linear-gradient') ||
      initialColor.includes('radial-gradient'))) {
    bgColorPicker.parseGradientAndSetup(initialColor);
  }

  // Auto-select the correct option based on current background type
  const bgColorHex = $id("in_bg_color_hex").value;
  if (bgColorHex === 'Image') {
    // If it's an image, select the image option
    bgColorPicker.showImagePicker();
  } else if (bgColorHex === 'Linear' || bgColorHex === 'Radial') {
    // If it's a gradient, select the gradient option
    bgColorPicker.showGradientPicker();
  } else {
    // Default to solid color option
    bgColorPicker.showSolidPicker();
  }
  if (typeof fontColorPicker !== 'undefined' && fontColorPicker && typeof fontColorPicker.destroy === 'function') {
    fontColorPicker.destroy();
    fontColorPicker = null;
  }
  // Track if font color picker is open and user has interacted
  let fontColorPickerOpen = false;
  let fontColorUserInteracted = false;

  fontColorPicker = new InspectaColorPicker({
    shadowRoot: shadow,
    containerId: "in_font_color",
    container: $id("in_font_color"),
    initialColor: getValidColor($id("in_font_color"), "in_font_color_hex"),
    onColorChange: (color) => {
      // Update the hex input to 6-digit color
      $id("in_font_color_hex").value = color.hexString;

      // Set the opacity input to percentage
      const opacity = Math.round(color.alpha * 100);
      $id("in_font_color_opac").value = opacity;

      // Update the thumbnail
      const colorElement = $id("in_font_color");
      if (colorElement) {
        if (opacity === 0) {
          colorElement.style.backgroundColor = 'transparent';
        } else {
          const colorWithAlpha = hexColorWithOptionalAlpha(color.hexString, opacity);
          colorElement.style.backgroundColor = colorWithAlpha;
        }
      }

      // Apply the color immediately for live preview
      const colorWithAlpha = hexColorWithOptionalAlpha(color.hexString, opacity);

      // Only register CSS change if user has actually interacted with the picker
      if (fontColorUserInteracted) {
        applyFontColor(colorWithAlpha);
      } else {
        // Just apply to element for preview without registering CSS change
        if (window.target) {
          if (typeof removeInlineStyle === 'function') {
            removeInlineStyle(window.target, 'color');
          } else if (window.target.style) {
            window.target.style.removeProperty('color');
          }
          window.target.style.color = colorWithAlpha;
        }
      }
    },
    onColorApply: (color) => {
      // Apply the color when user confirms
      const opacity = Math.round(color.alpha * 100);
      const colorWithAlpha = hexColorWithOptionalAlpha(color.hexString, opacity);
      applyFontColor(colorWithAlpha);
      fontColorUserInteracted = false; // Reset for next time
    }
  });

  // Add event listeners to detect when user interacts with the picker
  const fontColorThumbnail = $id("in_font_color");
  if (fontColorThumbnail) {
    fontColorThumbnail.addEventListener('click', () => {
      fontColorPickerOpen = true;
      fontColorUserInteracted = false; // Reset interaction flag when opening

      // Add a one-time event listener to detect when user starts interacting
      const detectInteraction = () => {
        fontColorUserInteracted = true;
        document.removeEventListener('mousemove', detectInteraction);
        document.removeEventListener('mousedown', detectInteraction);
      };

      // Listen for any mouse interaction after picker opens
      setTimeout(() => {
        document.addEventListener('mousemove', detectInteraction, { once: true });
        document.addEventListener('mousedown', detectInteraction, { once: true });
      }, 100); // Small delay to avoid detecting the click that opened the picker
    });
  }

  borderColorPicker = new InspectaColorPicker({
    shadowRoot: shadow,
    containerId: "in_border_color",
    container: $id("in_border_color"),
    initialColor: getValidColor($id("in_border_color"), "in_border_color_hex"),
    onColorChange: (color) => {
      // Update the hex input to 6-digit color
      $id("in_border_color_hex").value = color.hexString;

      // Set the opacity input to percentage
      const opacity = Math.round(color.alpha * 100);
      $id("in_border_color_opac").value = opacity;

      // Update the thumbnail
      const colorElement = $id("in_border_color");
      if (colorElement) {
        if (opacity === 0) {
          colorElement.style.backgroundColor = 'transparent';
        } else {
          const colorWithAlpha = hexColorWithOptionalAlpha(color.hexString, opacity);
          colorElement.style.backgroundColor = colorWithAlpha;
        }
      }

      // Apply the color immediately for live preview
      const colorWithAlpha = hexColorWithOptionalAlpha(color.hexString, opacity);
      applyBorderColor(colorWithAlpha);
    },
    onColorApply: (color) => {
      // Apply the color when user confirms
      const opacity = Math.round(color.alpha * 100);
      const colorWithAlpha = hexColorWithOptionalAlpha(color.hexString, opacity);
      applyBorderColor(colorWithAlpha);
    }
  });

  boxShadowColorPicker = new InspectaColorPicker({
    shadowRoot: shadow,
    containerId: "in_bxsdc",
    //container: $id("in_bxsdc"),
    initialColor: getValidColor($id("in_bxsdc"), "in_bxsh_hex", "#000000"),
    onColorChange: (color) => {
      // Update the hex input to 6-digit color
      $id("in_bxsh_hex").value = color.hexString;

      // Set the opacity input to percentage
      const opacity = Math.round(color.alpha * 100);
      $id("in_bxsh_opac").value = opacity;

      // Update the thumbnail
      const colorElement = $id("in_bxsdc");
      if (colorElement) {
        if (opacity === 0) {
          colorElement.style.backgroundColor = 'transparent';
        } else {
          const colorWithAlpha = hexColorWithOptionalAlpha(color.hexString, opacity);
          colorElement.style.backgroundColor = colorWithAlpha;
        }
      }

      // Apply the color immediately for live preview
      const colorWithAlpha = hexColorWithOptionalAlpha(color.hexString, opacity);
      applyBoxShadowColorFromColorPicker(colorWithAlpha);
    },
    onColorApply: (color) => {
      // Apply the color when user confirms
      const opacity = Math.round(color.alpha * 100);
      const colorWithAlpha = hexColorWithOptionalAlpha(color.hexString, opacity);
      applyBoxShadowColorFromColorPicker(colorWithAlpha);
    }
  });

  // Global color picker manager to ensure only one is open at a time
  window.colorPickerManager = {
    activePicker: null,

    closeAllPickers() {
      if (this.activePicker && typeof this.activePicker.hide === 'function') {
        this.activePicker.hide();
      }
      this.activePicker = null;
    },

    openPicker(picker, position, initialColor) {
      // Close any currently open picker
      this.closeAllPickers();

      // Open the new picker
      picker.show(position, initialColor);
      this.activePicker = picker;

      // Special handling for background color picker to refresh image data
      if (picker.containerId === 'in_bg_color' && picker.refreshImageData) {
        // Small delay to ensure the picker is fully shown
        setTimeout(() => {
          picker.refreshImageData();
        }, 50);
      }
    }
  };

  // Set up click event handlers with global manager
  $id("in_bg_color").addEventListener("click", function (event) {
    // Get the current values from the properties panel
    const hexInput = $id("in_bg_color_hex");
    const opacityInput = $id("in_bg_color_opac");

    let initialColor;

    // Check if it's a gradient type (Linear/Radial) - if so, get the actual gradient CSS from container
    if (hexInput && hexInput.value && (hexInput.value === 'Linear' || hexInput.value === 'Radial')) {
      const container = $id("in_bg_color");
      if (container && container.style.background) {
        initialColor = container.style.background;
      } else {
        initialColor = hexInput.value;
      }
    } else if (hexInput && hexInput.value && opacityInput && opacityInput.value) {
      // Use the current values from the properties panel for solid colors
      const opacity = parseInt(opacityInput.value);
      if (!isNaN(opacity)) {
        if (opacity < 100) {
          initialColor = {
            color: hexInput.value,
            alpha: opacity / 100
          };
        } else {
          initialColor = hexInput.value;
        }
      } else {
        initialColor = hexInput.value;
      }
    } else {
      // Fallback to getValidColor
      initialColor = getValidColor($id("in_bg_color"), "in_bg_color_hex");
    }

    // Set a flag to prevent initial onColorChange from applying changes
    bgColorPicker.isInitializing = true;

    window.colorPickerManager.openPicker(
      bgColorPicker,
      {
        left: event.x,
        top: event.y,
      },
      initialColor
    );

    // Clear the flag after a short delay
    setTimeout(() => {
      bgColorPicker.isInitializing = false;
    }, 100);
  });

  $id("in_font_color").addEventListener("click", function (event) {
    window.colorPickerManager.openPicker(
      fontColorPicker,
      {
        left: event.x,
        top: event.y,
      },
      getValidColor($id("in_font_color"), "in_font_color_hex")
    );
  });

  $id("in_border_color").addEventListener("click", function (event) {
    window.colorPickerManager.openPicker(
      borderColorPicker,
      {
        left: event.x,
        top: event.y,
      },
      getValidColor($id("in_border_color"), "in_border_color_hex")
    );
  });

  $id("in_bxsdc").addEventListener("click", function (event) {
    window.colorPickerManager.openPicker(
      boxShadowColorPicker,
      {
        left: event.x,
        top: event.y,
      },
      getValidColor($id("in_bxsdc"), "in_bxsh_hex", "#000000")
    );
  });
}

function initElementSiblings() {
  function selectNextSibling() {
    if (target.nextElementSibling) {
      selectElement(null, target.nextElementSibling);
    } else {
      // Stay on the last element
      selectElement(null, target);
    }
  }

  function selectPreviousSibling() {
    if (target.previousElementSibling) {
      selectElement(null, target.previousElementSibling);
    } else {
      // Stay on the first element
      selectElement(null, target);
    }
  }

  function handleArrowKeys(event) {
    if (event.keyCode === 37) {
      // Left arrow key
      event.preventDefault(); // Prevent default scrolling
      selectPreviousSibling();
    } else if (event.keyCode === 39) {
      // Right arrow key
      event.preventDefault(); // Prevent default scrolling
      selectNextSibling();
    }
  }

  //document.addEventListener('keydown', handleArrowKeys);
  el_left.addEventListener("click", selectPreviousSibling);
  el_right.addEventListener("click", selectNextSibling);
}

function initElementParenChild() {
  function selectParentOrStay() {
    if (target.parentNode) {
      selectElement(null, target.parentNode);
    } else {
      // Stay on the current element if there's no parent
      selectElement(null, target);
    }
  }

  function selectFirstChildOrStay() {
    if (target.firstChild) {
      selectElement(null, target.firstChild);
    } else {
      // Stay on the current element if there's no child
      selectElement(null, target);
    }
  }

  function handleArrowKeys(event) {
    if (event.keyCode === 38) {
      // Up arrow key
      event.preventDefault(); // Prevent default scrolling
      selectParentOrStay();
    } else if (event.keyCode === 40) {
      // Down arrow key
      event.preventDefault(); // Prevent default scrolling
      selectFirstChildOrStay();
    }
  }

  //document.addEventListener('keydown', handleArrowKeys);
  el_up.addEventListener("click", selectParentOrStay);
  el_down.addEventListener("click", selectFirstChildOrStay);
}

function initBorderAndRadiusLink() {
  btn_border_link.addEventListener("click", function handleMouseClick() {
    if (border_solo.style.display === "flex") {
      border_solo.style.display = "none";
      btn_border_link.classList.remove("inspecta-active");
      //$id("in_bc").disabled = false;
    } else {
      border_solo.style.display = "flex";
      btn_border_link.classList.add("inspecta-active");
      const allBorder = $id("in_bc").value;
      //$id("in_bc").disabled = true;
    }
  });

  btn_radius_link.addEventListener("click", function handleMouseClick() {
    if (radius_solo.style.display == "flex") {
      radius_solo.style.display = "none";
      btn_radius_link.classList.remove("inspecta-active");
    } else {
      radius_solo.style.display = "flex";
      btn_radius_link.classList.add("inspecta-active");
    }
  });
  $id("in_radius").addEventListener("input", borderRadiusChange);
  $id("in_radius").addEventListener("blur", function () {
    if (isAllRadiusEqual()) {
      showHideMixedRadiusLabel(false);
    } else {
      showHideMixedRadiusLabel(true);
    }
  });

  $id("in_radius_mixed").addEventListener("click", function () {
    showHideMixedRadiusLabel(false);
    $id('in_radius').focus();
  });
}

function initExpandCollapse() {
  // Add event listener for toggle all button
  const btnTogglePnlItems = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector("#btn_toggle_pnl_items") : document.querySelector("#btn_toggle_pnl_items");
  if (btnTogglePnlItems) {

    // Set initial icon to collapse all since panels start expanded
    const expandIcon = btnTogglePnlItems.querySelector("use");
    if (expandIcon) {
      expandIcon.setAttribute("href", "#ic_collapse_all");
    }

    // Initialize tooltip to show "Collapse All" since panels start expanded
    if (window.tooltipManager) {
      window.tooltipManager.toggleTooltipMode('btn_toggle_pnl_items', 'collapse');
    }

    // Set the global state to match the initial expanded state
    allPanelsExpanded = true;
    overviewPanelsExpanded = true;
    elementsPanelsExpanded = true;
    propertiesPanelsExpanded = true;

    btnTogglePnlItems.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      toggleAllPnlItems();
    });
  } else {
    console.log("Toggle button not found in DOM");
  }

  // Handle overview panels
  const pnlOverview = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector("#pnl-overview") : document.querySelector("#pnl-overview");
  if (pnlOverview) {
    const overviewHeaders = pnlOverview.querySelectorAll("[id$='_header']");
    overviewHeaders.forEach((item) => {
      const id = item.id.replace("header", "values");
      const pnlValues = pnlOverview.querySelector("#" + id);
      const headerValues = pnlOverview.querySelector("#" + item.id + "_values");
      const expandIcon = item.querySelector(".expand");
      const expandIconSide = item.querySelector(".expand-side");

      if (pnlValues) {
        // Set overview panels to expanded state initially
        pnlValues.style.display = pnlValues.classList.contains("thumbnail-container") ? "grid" : "block";
        if (headerValues) {
          headerValues.style.display = headerValues.id === "pnl_size_header_values" ? "flex" : "block";
        }
        if (expandIcon) expandIcon.style.transform = "rotate(180deg)";
        if (expandIconSide) expandIconSide.style.transform = "rotate(90deg)";
      }

      // Add click event listener for individual panel toggle
      item.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();

        const valuesDiv = pnlOverview.querySelector("#" + id);
        if (!valuesDiv) return;

        // Special handling for colors panel to also hide/show figma_compare_panel
        if (item.id === "pnl_colors_header") {
          const figmaCompareColorsPanel = pnlOverview.querySelector("#figma_compare_colors_panel");
          if (valuesDiv.style.display === "none") {
            // Expand
            valuesDiv.style.display = valuesDiv.classList.contains("thumbnail-container") ? "grid" : "block";
            if (headerValues) headerValues.style.display = headerValues.id === "pnl_size_header_values" ? "flex" : "block";
            if (expandIcon) expandIcon.style.transform = "rotate(180deg)";
            if (expandIconSide) expandIconSide.style.transform = "rotate(90deg)";
            if (figmaCompareColorsPanel) figmaCompareColorsPanel.style.display = "flex";
          } else {
            // Collapse
            valuesDiv.style.display = "none";
            if (headerValues) headerValues.style.display = "none";
            if (expandIcon) expandIcon.style.transform = "rotate(0deg)";
            if (expandIconSide) expandIconSide.style.transform = "rotate(0deg)";
            if (figmaCompareColorsPanel) figmaCompareColorsPanel.style.display = "none";
          }
        } else if (item.id === "pnl_fonts_header") {
          const figmaCompareFontsPanel = pnlOverview.querySelector("#figma_compare_fonts_panel");
          if (valuesDiv.style.display === "none") {
            // Expand
            valuesDiv.style.display = valuesDiv.classList.contains("thumbnail-container") ? "grid" : "block";
            if (headerValues) headerValues.style.display = headerValues.id === "pnl_size_header_values" ? "flex" : "block";
            if (expandIcon) expandIcon.style.transform = "rotate(180deg)";
            if (expandIconSide) expandIconSide.style.transform = "rotate(90deg)";
            if (figmaCompareFontsPanel) figmaCompareFontsPanel.style.display = "flex";
          } else {
            // Collapse
            valuesDiv.style.display = "none";
            if (headerValues) headerValues.style.display = "none";
            if (expandIcon) expandIcon.style.transform = "rotate(0deg)";
            if (expandIconSide) expandIconSide.style.transform = "rotate(0deg)";
            if (figmaCompareFontsPanel) figmaCompareFontsPanel.style.display = "none";
          }
        } else {
          // Handle other panels normally
          if (valuesDiv.style.display === "none") {
            // Expand
            valuesDiv.style.display = valuesDiv.classList.contains("thumbnail-container") ? "grid" : "block";
            if (headerValues) {
              headerValues.style.display = headerValues.id === "pnl_size_header_values" ? "flex" : "block";
            }
            if (expandIcon) expandIcon.style.transform = "rotate(180deg)";
            if (expandIconSide) expandIconSide.style.transform = "rotate(90deg)";
          } else {
            // Collapse
            valuesDiv.style.display = "none";
            if (headerValues) headerValues.style.display = "none";
            if (expandIcon) expandIcon.style.transform = "rotate(0deg)";
            if (expandIconSide) expandIconSide.style.transform = "rotate(0deg)";
          }
        }
      });
    });
  }

  // Handle element panels
  const pnlElements = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector("#pnl-elements") : document.querySelector("#pnl-elements");
  if (pnlElements) {
    const elementHeaders = pnlElements.querySelectorAll("[id$='_header']");
    elementHeaders.forEach((item) => {
      const id = item.id.replace("header", "values");
      const pnlValues = pnlElements.querySelector("#" + id);
      const headerValues = pnlElements.querySelector("#" + item.id + "_values");
      const expandIcon = item.querySelector(".expand");
      const expandIconSide = item.querySelector(".expand-side");

      if (pnlValues) {
        // Set element panels to expanded state initially
        pnlValues.style.display = pnlValues.classList.contains("thumbnail-container") ? "grid" : "block";
        if (headerValues) {
          headerValues.style.display = headerValues.id === "pnl_size_header_values" ? "flex" : "block";
        }
        if (expandIcon) expandIcon.style.transform = "rotate(180deg)";
        if (expandIconSide) expandIconSide.style.transform = "rotate(90deg)";
      }

      // Add click event listener for individual panel toggle
      item.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();

        // Special handling for display panel
        if (item.id === "pnl_display_header") {
          const displayValues = pnlElements.querySelector("#pnl_display_values");
          if (!displayValues) return;

          if (displayValues.style.display === "none") {
            // Expand
            displayValues.style.display = "block";
            if (headerValues) {
              headerValues.style.display = headerValues.id === "pnl_size_header_values" ? "flex" : "block";
            }
            if (expandIcon) expandIcon.style.transform = "rotate(180deg)";
          } else {
            // Collapse
            displayValues.style.display = "none";
            if (headerValues) headerValues.style.display = "none";
            if (expandIcon) expandIcon.style.transform = "rotate(0deg)";
          }
        }
        // Special handling for size panel
        else if (item.id === "pnl_size_header") {
          const sizeValues = pnlElements.querySelector("#pnl_size_values");
          if (!sizeValues) return;

          if (sizeValues.style.display === "none") {
            // Expand
            sizeValues.style.display = "block";
            if (headerValues) {
              headerValues.style.display = headerValues.id === "pnl_size_header_values" ? "flex" : "block";
            }
            if (expandIcon) expandIcon.style.transform = "rotate(180deg)";
          } else {
            // Collapse
            sizeValues.style.display = "none";
            if (headerValues) headerValues.style.display = "none";
            if (expandIcon) expandIcon.style.transform = "rotate(0deg)";
          }
        }
        else {
          const valuesDiv = pnlElements.querySelector("#" + id);
          if (!valuesDiv) return;

          if (valuesDiv.style.display === "none") {
            // Expand
            valuesDiv.style.display = valuesDiv.classList.contains("thumbnail-container") ? "grid" : "block";
            if (headerValues) {
              headerValues.style.display = headerValues.id === "pnl_size_header_values" ? "flex" : "block";
            }
            if (expandIcon) expandIcon.style.transform = "rotate(180deg)";
            if (expandIconSide) expandIconSide.style.transform = "rotate(90deg)";
          } else {
            // Collapse
            valuesDiv.style.display = "none";
            if (headerValues) headerValues.style.display = "none";
            if (expandIcon) expandIcon.style.transform = "rotate(0deg)";
            if (expandIconSide) expandIconSide.style.transform = "rotate(0deg)";
          }
        }
      });
    });
  }
}

function toggleAllPnlItems() {
  // Check which section is currently visible
  const pnlOverview = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector("#pnl-overview") : document.querySelector("#pnl-overview");
  const pnlElements = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector("#pnl-elements") : document.querySelector("#pnl-elements");
  const pnlPropertiesContent = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector("#pnl_properties_content") : document.querySelector("#pnl_properties_content");

  // Determine which section to toggle based on visibility
  let sectionToToggle;
  if (pnlOverview && pnlOverview.style.display !== "none") {
    sectionToToggle = "overview";
  } else if (pnlElements && pnlElements.style.display !== "none") {
    sectionToToggle = "elements";
  } else if (pnlPropertiesContent && pnlPropertiesContent.style.display !== "none") {
    sectionToToggle = "properties";
  } else {
    console.log("No visible section found");
    return;
  }

  // Toggle the appropriate state variable
  if (sectionToToggle === "overview") {
    overviewPanelsExpanded = !overviewPanelsExpanded;
    allPanelsExpanded = overviewPanelsExpanded;
  } else if (sectionToToggle === "elements") {
    elementsPanelsExpanded = !elementsPanelsExpanded;
    allPanelsExpanded = elementsPanelsExpanded;
  } else if (sectionToToggle === "properties") {
    propertiesPanelsExpanded = !propertiesPanelsExpanded;
    allPanelsExpanded = propertiesPanelsExpanded;
  }

  // Handle overview panels
  if (sectionToToggle === "overview" && pnlOverview) {
    const overviewHeaders = pnlOverview.querySelectorAll("[id$='_header']");
    overviewHeaders.forEach((item) => {
      const id = item.id.replace("header", "values");
      const valuesDiv = pnlOverview.querySelector("#" + id);
      const headerValues = item.querySelector("[id$='_header_values']");
      const expandIcon = item.querySelector(".expand");
      const expandIconSide = item.querySelector(".expand-side");

      if (valuesDiv) {
        if (!overviewPanelsExpanded) {
          // Collapse all
          valuesDiv.style.display = "none";
          if (headerValues) headerValues.style.display = "none";
          if (expandIcon) expandIcon.style.transform = "rotate(0deg)";
          if (expandIconSide) expandIconSide.style.transform = "rotate(0deg)";

          // Special handling for colors panel to also hide figma_compare_panel
          if (item.id === "pnl_colors_header") {
            const figmaCompareColorsPanel = pnlOverview.querySelector("#figma_compare_colors_panel");
            if (figmaCompareColorsPanel) {
              figmaCompareColorsPanel.style.display = "none";
            }
          }
          // Special handling for fonts panel to also hide figma_compare_fonts_panel
          if (item.id === "pnl_fonts_header") {
            const figmaCompareFontsPanel = pnlOverview.querySelector("#figma_compare_fonts_panel");
            if (figmaCompareFontsPanel) {
              figmaCompareFontsPanel.style.display = "none";
            }
          }
        } else {
          // Expand all
          valuesDiv.style.display = valuesDiv.classList.contains("thumbnail-container") ? "grid" : "block";
          if (headerValues) {
            headerValues.style.display = headerValues.id === "pnl_size_header_values" ? "flex" : "block";
          }
          if (expandIcon) expandIcon.style.transform = "rotate(180deg)";
          if (expandIconSide) expandIconSide.style.transform = "rotate(90deg)";

          // Special handling for colors panel to also show figma_compare_panel
          if (item.id === "pnl_colors_header") {
            const figmaCompareColorsPanel = pnlOverview.querySelector("#figma_compare_colors_panel");
            if (figmaCompareColorsPanel) {
              figmaCompareColorsPanel.style.display = "flex";
            }
          }
          // Special handling for fonts panel to also show figma_compare_fonts_panel
          if (item.id === "pnl_fonts_header") {
            const figmaCompareFontsPanel = pnlOverview.querySelector("#figma_compare_fonts_panel");
            if (figmaCompareFontsPanel) {
              figmaCompareFontsPanel.style.display = "flex";
            }
          }
        }
      }
    });

  }
  // Handle element panels
  else if (sectionToToggle === "elements" && pnlElements) {
    const pnlItems = pnlElements.querySelectorAll(".pnl_item");
    pnlItems.forEach(item => {
      const header = item.querySelector("[id$='_header']");
      if (!header) return;

      // Special handling for display panel
      if (item.id === "display") {
        const displayValues = item.querySelector("#pnl_display_values");
        if (!displayValues) return;

        const expandIcon = header.querySelector(".expand");
        const headerValues = header.querySelector("[id$='_header_values']");

        if (!elementsPanelsExpanded) {
          // Collapse all
          displayValues.style.display = "none";
          if (headerValues) headerValues.style.display = "none";
          if (expandIcon) expandIcon.style.transform = "rotate(0deg)";
        } else {
          // Expand all
          displayValues.style.display = "block";
          if (headerValues) {
            headerValues.style.display = headerValues.id === "pnl_size_header_values" ? "flex" : "block";
          }
          if (expandIcon) expandIcon.style.transform = "rotate(180deg)";
        }
      }
      // Special handling for size panel
      else if (item.id === "size") {
        const sizeValues = item.querySelector("#pnl_size_values");
        if (!sizeValues) return;

        const expandIcon = header.querySelector(".expand");
        const headerValues = header.querySelector("[id$='_header_values']");

        if (!elementsPanelsExpanded) {
          // Collapse all
          sizeValues.style.display = "none";
          if (headerValues) headerValues.style.display = "none";
          if (expandIcon) expandIcon.style.transform = "rotate(0deg)";
        } else {
          // Expand all
          sizeValues.style.display = "block";
          if (headerValues) {
            headerValues.style.display = headerValues.id === "pnl_size_header_values" ? "flex" : "block";
          }
          if (expandIcon) expandIcon.style.transform = "rotate(180deg)";
        }
      }
      // Special handling for colors panel
      else if (item.id === "colors") {
        const colorGroups = item.querySelectorAll(".color-group");
        colorGroups.forEach(group => {
          const valuesDiv = group.querySelector(".thumbnail-container");
          const expandIconSide = group.querySelector(".expand-side");

          if (valuesDiv) {
            if (!elementsPanelsExpanded) {
              // Collapse all
              valuesDiv.style.display = "none";
              if (expandIconSide) expandIconSide.style.transform = "rotate(0deg)";
            } else {
              // Expand all
              valuesDiv.style.display = "grid";
              if (expandIconSide) expandIconSide.style.transform = "rotate(90deg)";
            }
          }
        });
      }
      else {
        const valuesDiv = item.querySelector("[id$='_values']");
        if (!valuesDiv) return;

        const expandIcon = header.querySelector(".expand");
        const expandIconSide = header.querySelector(".expand-side");
        const headerValues = header.querySelector("[id$='_header_values']");

        if (!elementsPanelsExpanded) {
          // Collapse all
          valuesDiv.style.display = "none";
          if (headerValues) headerValues.style.display = "none";
          if (expandIcon) expandIcon.style.transform = "rotate(0deg)";
          if (expandIconSide) expandIconSide.style.transform = "rotate(0deg)";
        } else {
          // Expand all
          valuesDiv.style.display = valuesDiv.classList.contains("thumbnail-container") ? "grid" : "block";
          if (headerValues) {
            headerValues.style.display = headerValues.id === "pnl_size_header_values" ? "flex" : "block";
          }
          if (expandIcon) expandIcon.style.transform = "rotate(180deg)";
          if (expandIconSide) expandIconSide.style.transform = "rotate(90deg)";
        }
      }
    });
  }
  // Handle properties content panels
  else if (sectionToToggle === "properties" && pnlPropertiesContent) {
    const propertyPanels = pnlPropertiesContent.querySelectorAll(".pnl_item");
    propertyPanels.forEach(item => {
      const header = item.querySelector("[id$='_header']");
      if (!header) return;

      const valuesDiv = item.querySelector("[id$='_values']");
      if (!valuesDiv) return;

      const expandIcon = header.querySelector(".expand");
      const expandIconSide = header.querySelector(".expand-side");
      const headerValues = header.querySelector("[id$='_header_values']");

      if (!propertiesPanelsExpanded) {
        // Collapse all
        valuesDiv.style.display = "none";
        if (headerValues) headerValues.style.display = "none";
        if (expandIcon) expandIcon.style.transform = "rotate(0deg)";
        if (expandIconSide) expandIconSide.style.transform = "rotate(0deg)";
      } else {
        // Expand all
        valuesDiv.style.display = valuesDiv.classList.contains("thumbnail-container") ? "grid" : "block";
        if (headerValues) {
          headerValues.style.display = headerValues.id === "pnl_size_header_values" ? "flex" : "block";
        }
        if (expandIcon) expandIcon.style.transform = "rotate(180deg)";
        if (expandIconSide) expandIconSide.style.transform = "rotate(90deg)";
      }
    });

  }

  // Update the toggle button icon and tooltip for all sections
  const btnTogglePnlItems = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector("#btn_toggle_pnl_items") : document.querySelector("#btn_toggle_pnl_items");
  if (btnTogglePnlItems) {
    const expandIcon = btnTogglePnlItems.querySelector("use");
    if (expandIcon) {
      expandIcon.setAttribute("href", allPanelsExpanded ? "#ic_collapse_all" : "#ic_expand_all");
      // Update the tooltip
      if (window.tooltipManager) {
        window.tooltipManager.toggleTooltipMode('btn_toggle_pnl_items', allPanelsExpanded ? 'collapse' : 'expand');
      }
    }
  }
}

//---------------SIZES-----------------
// Old widthChange function - no longer needed, replaced by unit input system in main.js
// function widthChange(e) {
//   console.log("Width change event triggered");
//   const rounded = Math.round(Number(e.target.value));
//   e.target.value = rounded;
//   const w = rounded + "px";
//   if (typeof window.generateInspectaCss === 'function') {
//     window.generateInspectaCss("width", w);
//   }
// }


// function maxWidthChange(e) {
//   const value = e.target.value.trim();
//   if (value === 'none') {
//     if (typeof window.generateInspectaCss === 'function') {
//       window.generateInspectaCss("maxWidth", "none");
//     }
//     return;
//   }
//   const rounded = Math.round(Number(value));
//   e.target.value = rounded;
//   const maxW = rounded + "px";
//   if (typeof window.generateInspectaCss === 'function') {
//     window.generateInspectaCss("maxWidth", maxW);
//   }
// }
// function minWidthChange(e) {
//   const value = e.target.value.trim();
//   if (value === 'none') {
//     if (typeof window.generateInspectaCss === 'function') {
//       window.generateInspectaCss("minWidth", "none");
//     }
//     return;
//   }
//   const rounded = Math.round(Number(value));
//   e.target.value = rounded;
//   const minW = rounded + "px";
//   if (typeof window.generateInspectaCss === 'function') {
//     window.generateInspectaCss("minWidth", minW);
//   }
// }
// function heightChange(e) {
//   const rounded = Math.round(Number(e.target.value));
//   e.target.value = rounded;
//   const h = rounded + "px";
//   if (typeof window.generateInspectaCss === 'function') {
//     window.generateInspectaCss("height", h);
//   }
// }
// function minHeightChange(e) {
//   const value = e.target.value.trim();
//   if (value === 'none') {
//     if (typeof window.generateInspectaCss === 'function') {
//       window.generateInspectaCss("minHeight", "none");
//     }
//     return;
//   }
//   const rounded = Math.round(Number(value));
//   e.target.value = rounded;
//   const minH = rounded + "px";
//   if (typeof window.generateInspectaCss === 'function') {
//     window.generateInspectaCss("minHeight", minH);
//   }
// }
// function maxHeightChange(e) {
//   const value = e.target.value.trim();
//   if (value === 'none') {
//     if (typeof window.generateInspectaCss === 'function') {
//       window.generateInspectaCss("maxHeight", "none");
//     }
//     return;
//   }
//   const rounded = Math.round(Number(value));
//   e.target.value = rounded;
//   const maxH = rounded + "px";
//   if (typeof window.generateInspectaCss === 'function') {
//     window.generateInspectaCss("maxHeight", maxH);
//   }
// }

//---------------BACKGROUND-----------------
function backgroundColorChange(e) {
  const colorHEX = e.target.value;
  let opacityValue = $id("in_bg_color_opac").value;
  if (opacityValue === undefined) {
    opacityValue = 100;
    $id("in_bg_color_opac").value = 100;
  }
  // Support both 6-character hex (without #) and 7-character hex (with #)
  if (colorHEX.length === 7 && colorHEX.startsWith('#')) {
    const colorWithAlpha = hexColorWithOptionalAlpha(colorHEX, opacityValue);
    applyBackgroundColor(colorWithAlpha);
    // Update the thumbnail color
    $id("in_bg_color").style.backgroundColor = colorHEX;
  } else if (colorHEX.length === 6 && /^[0-9A-Fa-f]{6}$/.test(colorHEX)) {
    const colorWithAlpha = hexColorWithOptionalAlpha('#' + colorHEX, opacityValue);
    applyBackgroundColor(colorWithAlpha);
    // Update the thumbnail color
    $id("in_bg_color").style.backgroundColor = '#' + colorHEX;
  }
}
function applyGradientBackground(gradientCssString, persistInStore = true) {
  // Remove inline background and background-color styles before applying stylesheet
  if (window.target) {
    if (typeof removeInlineStyle === 'function') {
      removeInlineStyle(window.target, 'background');
      removeInlineStyle(window.target, 'background-color');
    } else if (window.target.style) {
      window.target.style.removeProperty('background');
      window.target.style.removeProperty('background-color');
    }
  }
  // Ensure only the latest change remains: remove any existing background-color and background-image rules
  if (typeof window.generateInspectaCss === 'function') {
    window.generateInspectaCss('background-color', '', true, false, null, false, true);
    window.generateInspectaCss('background-image', '', true, false, null, false, true);
    window.generateInspectaCss('background-size', '', true, false, null, false, true);
    window.generateInspectaCss('background-position', '', true, false, null, false, true);
    window.generateInspectaCss('background-repeat', '', true, false, null, false, true);
  }
  if (typeof window.generateInspectaCss === 'function') {
    window.generateInspectaCss("background", gradientCssString, persistInStore);
  }
  if (typeof window.generateCssChangesCounter === 'function') {
    window.generateCssChangesCounter();
  }

  // Update the background label after applying the gradient
  setTimeout(() => {
    updateBackgroundLabel();
  }, 0);

  // Update property change indicators after gradient change
  setTimeout(() => {
    if (typeof window.updatePropertyChangeIndicators === 'function') {
      window.updatePropertyChangeIndicators();
    }
  }, 100);

  // Also try again after a longer delay to ensure everything is properly updated
  setTimeout(() => {
    if (typeof window.updatePropertyChangeIndicators === 'function') {
      window.updatePropertyChangeIndicators();
    }
  }, 300);
}

function applyImageBackground(imageData, persistInStore = true) {


  // Remove inline background and background-color styles before applying stylesheet
  if (window.target) {
    if (typeof removeInlineStyle === 'function') {
      removeInlineStyle(window.target, 'background');
      removeInlineStyle(window.target, 'background-color');
    } else if (window.target.style) {
      window.target.style.removeProperty('background');
      window.target.style.removeProperty('background-color');
    }
  }

  // Ensure only the latest change remains: remove any existing background-color and background (gradient) rules
  if (typeof window.generateInspectaCss === 'function') {
    window.generateInspectaCss('background-color', '', true, false, null, false, true);
    window.generateInspectaCss('background', '', true, false, null, false, true);
  }

  if (imageData && imageData.url) {
    // Create the background-image CSS string
    const backgroundImageCss = `url("${imageData.url}")`;

    // Apply background-image
    if (typeof window.generateInspectaCss === 'function') {
      window.generateInspectaCss("background-image", backgroundImageCss, persistInStore);
    }

    // Apply background-size
    if (imageData.size && imageData.size !== 'auto') {
      if (typeof window.generateInspectaCss === 'function') {
        window.generateInspectaCss("background-size", imageData.size, persistInStore);
      }
    }

    // Apply background-position
    if (imageData.position && imageData.position !== 'center center') {
      if (typeof window.generateInspectaCss === 'function') {
        window.generateInspectaCss("background-position", imageData.position, persistInStore);
      }
    }

    // Apply background-repeat
    if (imageData.repeat && imageData.repeat !== 'no-repeat') {
      if (typeof window.generateInspectaCss === 'function') {
        window.generateInspectaCss("background-repeat", imageData.repeat, persistInStore);
      }
    }
  } else {
    // Remove all background image properties if no image is selected
    if (typeof window.generateInspectaCss === 'function') {
      // Temporarily suppress rule deletion to batch all property deletions

      const originalGenerateInspectaCss = window.generateInspectaCss;
      window.generateInspectaCss = function (property, value, persistInStore, checkForSelectedTarget, customSelector, enable, forceDelete) {
        if (forceDelete) {
          // For forceDelete operations, don't delete the rule immediately
          // We'll handle rule cleanup after all properties are deleted
          const selector = customSelector || generateElSelector(target);
          if (cssRulesJson[selector] && cssRulesJson[selector][property]) {
            delete cssRulesJson[selector][property];
          }
          return;
        }
        return originalGenerateInspectaCss(property, value, persistInStore, checkForSelectedTarget, customSelector, enable, forceDelete);
      };

      // Delete all background image properties
      window.generateInspectaCss("background-image", 'none', true, false, null, true, false);
      window.generateInspectaCss("background-size", '', true, false, null, false, true);
      window.generateInspectaCss("background-position", '', true, false, null, false, true);
      window.generateInspectaCss("background-repeat", '', true, false, null, false, true);

      // Restore original function
      window.generateInspectaCss = originalGenerateInspectaCss;

      // Now check if any rules are empty and remove them
      const selector = generateElSelector(target);
      if (cssRulesJson[selector]) {
        const remainingProperties = Object.keys(cssRulesJson[selector]).filter(key => key !== 'additionalInfo');
        if (remainingProperties.length === 0) {
          delete cssRulesJson[selector];
        }
      }
    }
  }

  if (typeof window.generateCssChangesCounter === 'function') {
    window.generateCssChangesCounter();
  }

  // Update the background label after applying the image
  setTimeout(() => {
    updateBackgroundLabel();
  }, 0);

  // Update property change indicators after image change
  setTimeout(() => {
    if (typeof window.updatePropertyChangeIndicators === 'function') {
      window.updatePropertyChangeIndicators();
    }
  }, 100);

  // Also try again after a longer delay to ensure everything is properly updated
  setTimeout(() => {
    if (typeof window.updatePropertyChangeIndicators === 'function') {
      window.updatePropertyChangeIndicators();
    }
  }, 300);
}

function applyBackgroundColor(backgroundValue, persistInStore = true) {
  // Remove inline background and background-color styles before applying stylesheet
  if (window.target) {
    if (typeof removeInlineStyle === 'function') {
      removeInlineStyle(window.target, 'background');
      removeInlineStyle(window.target, 'background-color');
    } else if (window.target.style) {
      window.target.style.removeProperty('background');
      window.target.style.removeProperty('background-color');
    }
  }

  // Update the background label after applying the change
  setTimeout(() => {
    updateBackgroundLabel();
  }, 0);
  // Ensure only the latest change remains: remove any existing background (gradient) rules
  if (typeof window.generateInspectaCss === 'function') {
    window.generateInspectaCss('background', '', true, false, null, false, true);

    // Only set background-image: none if there's actually a background image present
    if (targetStyles.backgroundImage && targetStyles.backgroundImage !== 'none') {
      window.generateInspectaCss('background-image', 'none', true, false, null, true, false);
    }
  }
  if (typeof window.generateInspectaCss === 'function') {
    window.generateInspectaCss("background-color", backgroundValue, persistInStore);
  }
  if (typeof window.generateCssChangesCounter === 'function') {
    window.generateCssChangesCounter();
  }

  // Update property change indicators after background change
  setTimeout(() => {
    if (typeof window.updatePropertyChangeIndicators === 'function') {
      window.updatePropertyChangeIndicators();
    }
  }, 100);

  // Also try again after a longer delay to ensure everything is properly updated
  setTimeout(() => {
    if (typeof window.updatePropertyChangeIndicators === 'function') {
      window.updatePropertyChangeIndicators();
    }
  }, 300);
}
function backgroundOpacityChange(e) {
  let opacityValue = parseInt(e.target.value, 10);
  if (isNaN(opacityValue)) opacityValue = 100;
  opacityValue = Math.max(0, Math.min(100, opacityValue));
  const cssOpacity = opacityValue / 100;
  const colorHEX = $id("in_bg_color_hex").value;
  // Support both 6-character hex (without #) and 7-character hex (with #)
  if (colorHEX.length === 7 && colorHEX.startsWith('#')) {
    const colorWithAlpha = hexColorWithOptionalAlpha(colorHEX, opacityValue);
    if (typeof window.generateInspectaCss === 'function') {
      window.generateInspectaCss("background-color", colorWithAlpha);
    }
    // Update the thumbnail color with opacity
    $id("in_bg_color").style.backgroundColor = colorWithAlpha;
  } else if (colorHEX.length === 6 && /^[0-9A-Fa-f]{6}$/.test(colorHEX)) {
    const colorWithAlpha = hexColorWithOptionalAlpha('#' + colorHEX, opacityValue);
    if (typeof window.generateInspectaCss === 'function') {
      window.generateInspectaCss("background-color", colorWithAlpha);
    }
    // Update the thumbnail color with opacity
    $id("in_bg_color").style.backgroundColor = colorWithAlpha;
  }
  // Update the changes panel
  if (typeof window.generateCssChangesCounter === 'function') {
    window.generateCssChangesCounter();
  }

  // Update property change indicators after opacity change
  setTimeout(() => {
    if (typeof window.updatePropertyChangeIndicators === 'function') {
      window.updatePropertyChangeIndicators();
    }
  }, 100);

  // Also try again after a longer delay to ensure everything is properly updated
  setTimeout(() => {
    if (typeof window.updatePropertyChangeIndicators === 'function') {
      window.updatePropertyChangeIndicators();
    }
  }, 300);
}
function removeSeparatedBorderRadius() {
  if (typeof window.generateInspectaCss === 'function') {
    window.generateInspectaCss('borderTopLeftRadius', '', true, false, null, false, true);
    window.generateInspectaCss('borderTopRightRadius', '', true, false, null, false, true);
    window.generateInspectaCss('borderBottomLeftRadius', '', true, false, null, false, true);
    window.generateInspectaCss('borderBottomRightRadius', '', true, false, null, false, true);
  }
}
function removeSepartedBorders() {
  if (typeof window.generateInspectaCss === 'function') {
    window.generateInspectaCss('borderLeftWidth', '', true, false, null, false, true);
    window.generateInspectaCss('borderTopWidth', '', true, false, null, false, true);
    window.generateInspectaCss('borderRightWidth', '', true, false, null, false, true);
    window.generateInspectaCss('borderBottomWidth', '', true, false, null, false, true);
  }
}
//---------------BORDER-----------------

function isAllBordersEqual() {
  const borderL = $id("in_bl").value;
  const borderT = $id("in_bt").value;
  const borderR = $id("in_br").value;
  const borderB = $id("in_bb").value;
  if (borderL !== borderT || borderL !== borderR || borderL !== borderB || borderT !== borderR || borderT !== borderB || borderR !== borderB) {
    return false;
  }
  return true;
}

function showHideMixedBorderLabel(show = false) {
  if (show) {
    $id('in_bc_mixed').style.display = 'block';
    $id('in_bc').style.display = 'none';
  } else {
    $id('in_bc_mixed').style.display = 'none';
    $id('in_bc').style.display = 'block';
  }
}

function checkIfAllBordersEqual() {
  if (isAllBordersEqual()) {
    showHideMixedBorderLabel(false);
  } else {
    showHideMixedBorderLabel(true);
  }
}

function borderWidthChange(e) {
  const borderWidth = e.target.value + "px";
  $id("in_bl").value = e.target.value;
  $id("in_bt").value = e.target.value;
  $id("in_br").value = e.target.value;
  $id("in_bb").value = e.target.value;

  // Remove separated border width CSS rules
  removeSepartedBorders();

  // Generate CSS for border width only
  if (typeof window.generateInspectaCss === 'function') {
    window.generateInspectaCss("borderWidth", borderWidth);
  }
  if (typeof window.generateCssChangesCounter === 'function') {
    window.generateCssChangesCounter();
  }

  checkIfAllBordersEqual();

  // Update property change indicators after border width change
  setTimeout(() => {
    if (typeof window.updatePropertyChangeIndicators === 'function') {
      window.updatePropertyChangeIndicators();
    }
  }, 100);
}
function applyBorderColor(colorHexa) {
  // Remove inline border and border-color styles before applying stylesheet
  if (window.target) {
    if (typeof removeInlineStyle === 'function') {
      removeInlineStyle(window.target, 'border');
      removeInlineStyle(window.target, 'border-color');
    } else if (window.target.style) {
      window.target.style.removeProperty('border');
      window.target.style.removeProperty('border-color');
    }
  }

  // Generate CSS for border color only
  if (typeof window.generateInspectaCss === 'function') {
    window.generateInspectaCss("borderColor", colorHexa);
  }
  if (typeof window.generateCssChangesCounter === 'function') {
    window.generateCssChangesCounter();
  }
}
function borderColorChange(e) {
  const colorHEX = e.target.value;
  let opacityValue = $id("in_border_color_opac").value;
  if (opacityValue === "") {
    opacityValue = 100;
    $id("in_border_color_opac").value = 100;
  }

  // Update the color display
  if (colorHEX.length === 7 && colorHEX.startsWith('#')) {
    $id("in_border_color").style.backgroundColor = colorHEX;
  } else if (colorHEX.length === 6 && /^[0-9A-Fa-f]{6}$/.test(colorHEX)) {
    $id("in_border_color").style.backgroundColor = '#' + colorHEX;
  }

  // Apply the border color
  const colorWithAlpha = hexColorWithOptionalAlpha(colorHEX.startsWith('#') ? colorHEX : '#' + colorHEX, opacityValue);
  applyBorderColor(colorWithAlpha);

  // Update property change indicators after border color change
  setTimeout(() => {
    if (typeof window.updatePropertyChangeIndicators === 'function') {
      window.updatePropertyChangeIndicators();
    }
  }, 100);
}
function borderColorOpacityChange(e) {
  let opacityValue = parseInt(e.target.value, 10);
  if (isNaN(opacityValue)) opacityValue = 100;
  opacityValue = Math.max(0, Math.min(100, opacityValue));
  const colorHEX = $id("in_border_color_hex").value;
  // Support both 6-character hex (without #) and 7-character hex (with #)
  if ((colorHEX.length === 7 && colorHEX.startsWith('#')) || (colorHEX.length === 6 && /^[0-9A-Fa-f]{6}$/.test(colorHEX))) {
    const colorWithAlpha = hexColorWithOptionalAlpha(colorHEX.startsWith('#') ? colorHEX : '#' + colorHEX, opacityValue);
    applyBorderColor(colorWithAlpha);
  }
  // Update the changes panel
  if (typeof window.generateCssChangesCounter === 'function') {
    window.generateCssChangesCounter();
  }

  // Update property change indicators after border color opacity change
  setTimeout(() => {
    if (typeof window.updatePropertyChangeIndicators === 'function') {
      window.updatePropertyChangeIndicators();
    }
  }, 100);
}
function showHideMixedBorderLabel(show = false) {
  if (show) {
    $id('in_bc_mixed').style.display = 'block';
    $id('in_bc').style.display = 'none';
  } else {
    $id('in_bc_mixed').style.display = 'none';
    $id('in_bc').style.display = 'block';
  }
}

function borderLeftChange(e) {
  const borderleft = e.target.value + "px";
  if (typeof window.generateInspectaCss === 'function') {
    window.generateInspectaCss("border-left-width", borderleft);
  }
  if (typeof window.generateCssChangesCounter === 'function') {
    window.generateCssChangesCounter();
  }
  checkIfAllBordersEqual();
}
function borderToptChange(e) {
  const borderTop = e.target.value + "px";
  if (typeof window.generateInspectaCss === 'function') {
    window.generateInspectaCss("border-top-width", borderTop);
  }
  if (typeof window.generateCssChangesCounter === 'function') {
    window.generateCssChangesCounter();
  }
  checkIfAllBordersEqual();
}
function borderRightChange(e) {
  const borderRight = e.target.value + "px";
  if (typeof window.generateInspectaCss === 'function') {
    window.generateInspectaCss("border-right-width", borderRight);
  }
  if (typeof window.generateCssChangesCounter === 'function') {
    window.generateCssChangesCounter();
  }
  checkIfAllBordersEqual();
}
function borderBottomChange(e) {
  const borderBottom = e.target.value + "px";
  if (typeof window.generateInspectaCss === 'function') {
    window.generateInspectaCss("border-bottom-width", borderBottom);
  }
  if (typeof window.generateCssChangesCounter === 'function') {
    window.generateCssChangesCounter();
  }
  checkIfAllBordersEqual();
}
function showHideMixedRadiusLabel(show = false) {
  if (show) {
    $id('in_radius_mixed').style.display = 'block';
    $id('in_radius').style.display = 'none';
  } else {
    $id('in_radius_mixed').style.display = 'none';
    $id('in_radius').style.display = 'block';
  }
}

function isAllRadiusEqual() {
  const radiusTL = $id("in_radius_tl").value;
  const radiusTR = $id("in_radius_tr").value;
  const radiusBL = $id("in_radius_bl").value;
  const radiusBR = $id("in_radius_br").value;
  if (radiusTL !== radiusTR || radiusTL !== radiusBL || radiusTL !== radiusBR || radiusTR !== radiusBL || radiusTR !== radiusBR || radiusBL !== radiusBR) {
    return false;
  }
  return true;
}


// update border radius
function checkIfAllRadiusEqual() {
  if (isAllRadiusEqual()) {
    showHideMixedRadiusLabel(false);
  } else {
    showHideMixedRadiusLabel(true);
  }
}
function borderRadiusChange(e) {
  const borderRadius = e.target.value + "px";
  $id("in_radius_tl").value = e.target.value;
  $id("in_radius_tr").value = e.target.value;
  $id("in_radius_bl").value = e.target.value;
  $id("in_radius_br").value = e.target.value;
  removeSeparatedBorderRadius();
  if (typeof window.generateInspectaCss === 'function') {
    window.generateInspectaCss("borderRadius", borderRadius);
  }
  if (typeof window.generateCssChangesCounter === 'function') {
    window.generateCssChangesCounter();
  }
  checkIfAllRadiusEqual();
}
function borderRadiusTopLeftChange(e) {
  const brtl = e.target.value + "px";
  if (typeof window.generateInspectaCss === 'function') {
    window.generateInspectaCss("border-top-left-radius", brtl);
  }
  if (typeof window.generateCssChangesCounter === 'function') {
    window.generateCssChangesCounter();
  }
  checkIfAllRadiusEqual();
}
function borderRadiusTopRightChange(e) {
  const brtr = e.target.value + "px";
  if (typeof window.generateInspectaCss === 'function') {
    window.generateInspectaCss("border-top-right-radius", brtr);
  }
  if (typeof window.generateCssChangesCounter === 'function') {
    window.generateCssChangesCounter();
  }
  checkIfAllRadiusEqual();
}
function borderRadiusBottomLeftChange(e) {
  const brbl = e.target.value + "px";
  if (typeof window.generateInspectaCss === 'function') {
    window.generateInspectaCss("border-bottom-left-radius", brbl);
  }
  if (typeof window.generateCssChangesCounter === 'function') {
    window.generateCssChangesCounter();
  }
  checkIfAllRadiusEqual();
}
function borderRadiusBottomRighChange(e) {
  console.log('borderRadiusBottomRighChange called with value:', e.target.value);
  const brbr = e.target.value + "px";
  if (typeof window.generateInspectaCss === 'function') {
    console.log('Calling generateInspectaCss for border-bottom-right-radius with:', brbr);
    window.generateInspectaCss("border-bottom-right-radius", brbr);
    console.log('cssRulesJson after generateInspectaCss:', window.cssRulesJson);
  }
  if (typeof window.generateCssChangesCounter === 'function') {
    console.log('Calling generateCssChangesCounter from borderRadiusBottomRighChange');
    window.generateCssChangesCounter();
  }
  checkIfAllRadiusEqual();
}
function borderStyleClick(e) {
  // Get the button element (handle clicks on span or svg inside the button)
  const button = e.target.closest('[id^="in_border_style_"]');
  if (!button) return;

  // Remove active class from all border style options
  getRoot().querySelectorAll("[id^='in_border_style_']").forEach((element) => {
    element.classList.remove("action_icon_radio_active");
    const svg = element.querySelector("svg");
    if (svg) svg.classList.remove("icon-fill_active");
    const span = element.querySelector("span");
    if (span) span.style.color = "var(--in-color-text-1)";
  });

  // Add active class to clicked button
  button.classList.add("action_icon_radio_active");
  const svg = button.querySelector("svg");
  if (svg) svg.classList.add("icon-fill_active");
  const span = button.querySelector("span");
  if (span) span.style.color = "var(--in-color-primary)";

  const borderStyleType = button.id.replace("in_border_style_", "");

  if (borderStyleType === "none") {
    // Only change the border style to none - don't touch width or color
    if (typeof window.generateInspectaCss === 'function') {
      window.generateInspectaCss("borderStyle", "none");
    }
    if (typeof window.generateCssChangesCounter === 'function') {
      window.generateCssChangesCounter();
    }
  } else {
    // Generate CSS for border style only
    if (typeof window.generateInspectaCss === 'function') {
      window.generateInspectaCss("borderStyle", borderStyleType);
    }
    if (typeof window.generateCssChangesCounter === 'function') {
      window.generateCssChangesCounter();
    }
  }

  // Update property change indicators after border style change
  setTimeout(() => {
    if (typeof window.updatePropertyChangeIndicators === 'function') {
      window.updatePropertyChangeIndicators();
    }
  }, 100);
}
// Helper: Convert #RRGGBB and opacity (0-100) to rgba()
function hexToRgba(hex, opacity) {
  let r = 0, g = 0, b = 0;
  // Support both 6-character hex (without #) and 7-character hex (with #)
  if (hex.length === 7 && hex.startsWith('#')) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  } else if (hex.length === 6 && /^[0-9A-Fa-f]{6}$/.test(hex)) {
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
  } else if (hex.length === 4 && hex.startsWith('#')) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  }
  return `rgba(${r},${g},${b},${opacity / 100})`;
}


function marginTopChange(e) {
  const mt = e.target.value + "px";
  //target.style.marginTop = mt;
  generateInspectaCss("marginTop", mt);
}
function marginRightChange(e) {
  const mr = e.target.value + "px";
  //target.style.marginRight = mr;
  generateInspectaCss("marginRight", mr);
}
function marginBottomChange(e) {
  const mb = e.target.value + "px";
  //target.style.marginBottom = mb;
  generateInspectaCss("marginBottom", mb);
}
function marginLeftChange(e) {
  const ml = e.target.value + "px";
  //target.style.marginLeft = ml;
  generateInspectaCss("marginLeft", ml);
}

//-----------PADDING------------
function paddingTopChange(e) {
  const pt = e.target.value + "px";
  //target.style.paddingTop = pt;
  generateInspectaCss("paddingTop", pt);
}
function paddingRightChange(e) {
  const pr = e.target.value + "px";
  //target.style.paddingRight = pr;
  generateInspectaCss("paddingRight", pr);
}
function paddingBottomChange(e) {
  const pb = e.target.value + "px";
  //target.style.paddingBottom = pb;
  generateInspectaCss("paddingBottom", pb);
}
function paddingLeftChange(e) {
  const pl = e.target.value + "px";
  //target.style.paddingLeft = pl;
  generateInspectaCss("paddingLeft", pl);
}

//-----------OPACITY------------
function opacityChange(e) {
  const opacityPCT = e.target.value;
  let opacityValue = parseFloat(opacityPCT / 100);
  generateInspectaCss("opacity", opacityValue);
}

//-----------TYPOGRAPHY------------
function fontSizeChange(e) {
  const fz = e.target.value;
  generateInspectaCss("fontSize", fz);
}
function lineHeightChange(e) {
  const lh = e.target.value + "px";
  //target.style.lineHeight = lh;
  generateInspectaCss("lineHeight", lh);
}
function letterSpacingChange(e) {
  const val = e.target.value.trim();
  if (val === 'normal') {
    generateInspectaCss("letter-spacing", 'normal');
  } else {
    const ls = val + "px";
    generateInspectaCss("letter-spacing", ls);
  }
}

function boxShadowUpdate(e) {
  // Use the same approach as border color - properly handle opacity
  const colorWithAlpha = hexColorWithOptionalAlpha(boxshadow.color.color, boxshadow.color.opacityPCT);
  let val = `${colorWithAlpha} ${boxshadow.x}px ${boxshadow.y}px ${boxshadow.blure}px ${boxshadow.spread}px`;
  //target.style.boxShadow = val;
  if (typeof window.generateInspectaCss === 'function') {
    window.generateInspectaCss("box-shadow", val);
  }
  // Update the changes panel
  if (typeof window.generateCssChangesCounter === 'function') {
    window.generateCssChangesCounter();
  }

  // Update property change indicators after box shadow change
  setTimeout(() => {
    if (typeof window.updatePropertyChangeIndicators === 'function') {
      window.updatePropertyChangeIndicators();
    }
  }, 100);
}
function boxShadowChangeX(e) {
  boxshadow.x = e.target.value;
  boxShadowUpdate(e);
}
function boxShadowChangeY(e) {
  boxshadow.y = e.target.value;
  boxShadowUpdate(e);
}
function boxShadowChangeBlur(e) {
  boxshadow.blure = e.target.value;
  boxShadowUpdate(e);
}
function boxShadowChangeSpread(e) {
  boxshadow.spread = e.target.value;
  boxShadowUpdate(e);
}

function applyBoxShadowColorFromColorPicker(colorRgba) {
  const colorValue = rgba2hexAdvanced(colorRgba);
  boxshadow.color.color = colorValue.color;
  boxshadow.color.opacityHEX = colorValue.opacity;
  boxshadow.color.opacityPCT = colorValue.opacityPCT;

  // Update the color thumb like border color does
  const colorElement = $id("in_bxsdc");
  if (colorElement) {
    if (colorValue.opacityPCT === 0) {
      colorElement.style.backgroundColor = 'transparent';
    } else {
      colorElement.style.backgroundColor = colorRgba;
    }
  }

  boxShadowUpdate();
}
function boxShadowChangeColor(e) {
  const colorHEX = e.target.value;
  // Support both 6-character hex (without #) and 7-character hex (with #)
  if (colorHEX.length === 7 && colorHEX.startsWith('#')) {
    boxshadow.color.color = colorHEX;
    $id("in_bxsdc").style.backgroundColor = colorHEX;
  } else if (colorHEX.length === 6 && /^[0-9A-Fa-f]{6}$/.test(colorHEX)) {
    boxshadow.color.color = '#' + colorHEX;
    $id("in_bxsdc").style.backgroundColor = '#' + colorHEX;
  }
  boxShadowUpdate(e);
}
function boxShadowChangeOpacity(e) {
  let opacityValue = parseInt(e.target.value, 10);
  if (isNaN(opacityValue)) opacityValue = 100;
  opacityValue = Math.max(0, Math.min(100, opacityValue));
  const cssOpacity = opacityValue / 100;
  boxshadow.color.opacityHEX = opacityPCTToHex(opacityValue);
  boxshadow.color.opacityPCT = opacityValue;
  boxShadowUpdate(e);
}

function textAlignChange(e) {
  getRoot().querySelectorAll("[id^='in_txt_align_']").forEach((element) => {
    element.classList.remove("action_icon_radio_active");
    // Remove icon-fill_active from SVG
    const svg = element.querySelector("svg");
    if (svg) svg.classList.remove("icon-fill_active");
  });
  e.target.classList.add("action_icon_radio_active");
  // Add icon-fill_active to SVG
  const svg = e.target.querySelector("svg");
  if (svg) svg.classList.add("icon-fill_active");

  const textAlignType = e.target.id.replace("in_txt_align_", "");
  //target.style.textAlign = textAlignType;
  if (typeof window.generateInspectaCss === 'function') {
    window.generateInspectaCss("textAlign", textAlignType);
  }
}

function typographyChangeWeight(e) {
  const selectedValue = e.target.value;
  let fontWeight = selectedValue;
  let fontStyle = 'normal';

  // Check if it's an italic variant
  if (selectedValue.includes('italic')) {
    fontWeight = selectedValue.replace('italic', '');
    fontStyle = 'italic';
  }

  // Remove inline font-weight and font-style before applying stylesheet
  if (window.target) {
    if (typeof removeInlineStyle === 'function') {
      removeInlineStyle(window.target, 'font-weight');
      removeInlineStyle(window.target, 'font-style');
    } else if (window.target.style) {
      window.target.style.removeProperty('font-weight');
      window.target.style.removeProperty('font-style');
    }
  }

  if (typeof window.generateInspectaCss === 'function') {
    window.generateInspectaCss("fontWeight", fontWeight);
    window.generateInspectaCss("fontStyle", fontStyle);
  }

  if (typeof window.generateCssChangesCounter === 'function') {
    window.generateCssChangesCounter();
  }

  // Check if the bold button exists before trying to access it
  const boldButton = $id("in_txt_bold");
  if (boldButton) {
    if (e.target.value > 600) {
      boldButton.classList.add("action_icon_radio_active");
      const svg = boldButton.querySelector("svg");
      if (svg) svg.classList.add("icon-fill_active");
    } else {
      boldButton.classList.remove("action_icon_radio_active");
      const svg = boldButton.querySelector("svg");
      if (svg) svg.classList.remove("icon-fill_active");
    }
  }
}
function textDecorationChange(e) {
  // Get the button element (handle clicks on span or svg inside the button)
  const button = e.target.closest('[id^="in_txt_decoration_"], [id^="in_txt_underline"], [id^="in_txt_line_through"]');
  if (!button) return;

  // Remove active class from all text decoration options
  getRoot().querySelectorAll("[id^='in_txt_decoration_'], [id^='in_txt_underline'], [id^='in_txt_line_through']").forEach((element) => {
    element.classList.remove("action_icon_radio_active");
    const svg = element.querySelector("svg");
    if (svg) svg.classList.remove("icon-fill_active");
    const span = element.querySelector("span");
    if (span) span.style.color = "var(--in-color-text-1)";
  });

  // Add active class to clicked button
  button.classList.add("action_icon_radio_active");
  const svg = button.querySelector("svg");
  if (svg) svg.classList.add("icon-fill_active");
  const span = button.querySelector("span");
  if (span) span.style.color = "var(--in-color-primary)";

  // Apply the decoration based on the clicked option
  const decorationType = button.id.replace("in_txt_", "");
  if (decorationType === "decoration_none") {
    if (typeof window.generateInspectaCss === 'function') {
      window.generateInspectaCss("textDecorationLine", "none");
    }
  } else if (decorationType === "underline") {
    if (typeof window.generateInspectaCss === 'function') {
      window.generateInspectaCss("textDecorationLine", "underline");
    }
  } else if (decorationType === "line_through") {
    if (typeof window.generateInspectaCss === 'function') {
      window.generateInspectaCss("textDecorationLine", "line-through");
    }
  }
}


function applyFontColor(colorHexa) {
  // Remove inline color style before applying stylesheet
  if (window.target) {
    if (typeof removeInlineStyle === 'function') {
      removeInlineStyle(window.target, 'color');
    } else if (window.target.style) {
      window.target.style.removeProperty('color');
    }
  }
  if (typeof window.generateInspectaCss === 'function') {
    window.generateInspectaCss("color", colorHexa);
  }
  if (typeof window.generateCssChangesCounter === 'function') {
    window.generateCssChangesCounter();
  }
}

function updateFontWeightOptions(fontFamily) {
  // Get available font weights for the selected font
  let availableWeights = ['400']; // Default fallback

  if (window.googleFontsManager) {
    availableWeights = window.googleFontsManager.getFontVariants(fontFamily);

    // Ensure the font is loaded with all its variants
    const cleanFontFamily = fontFamily.replace(/^["']|[""]$/g, '').trim();
    window.googleFontsManager.loadFont(cleanFontFamily, availableWeights);
  }

  // Update the font weight dropdown
  const fontWeightSelect = $id("in_font_weight");
  if (fontWeightSelect) {
    // Clear existing options
    fontWeightSelect.innerHTML = '';

    // Add available weights
    availableWeights.forEach(weight => {
      const option = document.createElement('option');
      option.value = weight;

      // Create a readable label for the weight
      let weightLabel = '';
      let weightText = '';
      let isItalic = false;

      // Check if it's an italic variant
      if (weight.includes('italic')) {
        isItalic = true;
        weight = weight.replace('italic', '');
      }

      // Handle special cases where weight might be "regular" or just "italic"
      let weightNumber = weight;
      if (weight === 'regular') {
        weightNumber = '400';
        weightText = 'Regular';
      } else if (weight === 'italic') {
        weightNumber = '400';
        weightText = 'Regular';
        isItalic = true;
      } else {
        // Get the weight text for numeric weights
        switch (weight) {
          case '100': weightText = 'Thin'; break;
          case '200': weightText = 'Extra Light'; break;
          case '300': weightText = 'Light'; break;
          case '400': weightText = 'Regular'; break;
          case '500': weightText = 'Medium'; break;
          case '600': weightText = 'Semi Bold'; break;
          case '700': weightText = 'Bold'; break;
          case '800': weightText = 'Extra Bold'; break;
          case '900': weightText = 'Black'; break;
          default:
            weightText = weight;
            weightNumber = weight;
            break;
        }
      }

      // Format: "Text Weight Number Italic"
      weightLabel = `${weightText} ${weightNumber}`;
      if (isItalic) {
        weightLabel += ' Italic';
      }

      option.textContent = weightLabel;
      fontWeightSelect.appendChild(option);
    });
  }
}

function applyFontFamily(fontFamily) {
  // Remove inline font-family style before applying stylesheet
  if (window.target) {
    if (typeof removeInlineStyle === 'function') {
      removeInlineStyle(window.target, 'font-family');
    } else if (window.target.style) {
      window.target.style.removeProperty('font-family');
    }
  }

  // Load the font if using Google Fonts
  // Clean the font family name (remove extra quotes and fallback fonts)
  const cleanFontFamily = fontFamily.replace(/^["']|["']$/g, '').trim();

  if (window.googleFontsManager) {
    // Load the font without the fallback
    window.googleFontsManager.loadFont(cleanFontFamily);
  }

  if (typeof window.generateInspectaCss === 'function') {
    window.generateInspectaCss("font-family", `"${cleanFontFamily}", sans-serif`);
  }
  if (typeof window.generateCssChangesCounter === 'function') {
    window.generateCssChangesCounter();
  }
}
function fontColorChange(e) {
  const colorHEX = e.target.value;
  let opacityValue = $id("in_font_color_opac").value;
  if (opacityValue === "") {
    opacityValue = 100;
    $id("in_font_color_opac").value = 100;
  }
  // Support both 6-character hex (without #) and 7-character hex (with #)
  if (colorHEX.length === 7 && colorHEX.startsWith('#')) {
    const colorWithAlpha = hexColorWithOptionalAlpha(colorHEX, opacityValue);
    applyFontColor(colorWithAlpha);
    $id("in_font_color").style.backgroundColor = colorHEX;
  } else if (colorHEX.length === 6 && /^[0-9A-Fa-f]{6}$/.test(colorHEX)) {
    const colorWithAlpha = hexColorWithOptionalAlpha('#' + colorHEX, opacityValue);
    applyFontColor(colorWithAlpha);
    $id("in_font_color").style.backgroundColor = '#' + colorHEX;
  }
}

function fontColorOpacityChange(e) {
  let opacityValue = parseInt(e.target.value, 10);
  if (isNaN(opacityValue)) opacityValue = 100;
  opacityValue = Math.max(0, Math.min(100, opacityValue));
  const cssOpacity = opacityValue / 100;
  const colorHEX = $id("in_font_color_hex").value;
  // Support both 6-character hex (without #) and 7-character hex (with #)
  if (colorHEX.length === 7 && colorHEX.startsWith('#')) {
    const colorWithAlpha = hexColorWithOptionalAlpha(colorHEX, opacityValue);
    applyFontColor(colorWithAlpha);
  } else if (colorHEX.length === 6 && /^[0-9A-Fa-f]{6}$/.test(colorHEX)) {
    const colorWithAlpha = hexColorWithOptionalAlpha('#' + colorHEX, opacityValue);
    applyFontColor(colorWithAlpha);
  }
}

//-----------DISPLAY------------
//-----------Display------------
function displayChange(e) {
  getRoot().querySelectorAll("[id^='in_dis_']").forEach((element) => {
    element.classList.remove("action_icon_radio_active");
    // Remove icon-fill_active from SVG
    const svg = element.querySelector("svg");
    if (svg) svg.classList.remove("icon-fill_active");
  });

  e.target.classList.add("action_icon_radio_active");
  // Add icon-fill_active to SVG
  const svg = e.target.querySelector("svg");
  if (svg) svg.classList.add("icon-fill_active");

  const displayType = e.target.id.replace("in_dis_", "");
  //target.style.display = displayType;
  if (typeof window.generateInspectaCss === 'function') {
    window.generateInspectaCss("display", displayType);
  }
  $id("in_dis_current").innerHTML = displayType;
  showHideFlexSettings(displayType);
}
//-----------flex-direction------------
function flexDirChange(e) {
  const flexDir = e.target.id.replace("in_flex_dir_", "");
  getRoot().querySelectorAll("[id^='in_flex_dir_']").forEach((element) => {
    element.classList.remove("action_icon_radio_active");
    // Remove icon-fill_active from SVG
    const svg = element.querySelector("svg");
    if (svg) svg.classList.remove("icon-fill_active");
  });

  getRoot()
    .querySelectorAll("[id^='pnl_flex_dir_settings']")
    .forEach((element) => {
      element.style.display = "none";
    });

  getRoot().querySelectorAll("[id^='pnl_flex_warp']").forEach((element) => {
    element.style.display = "none";
  });
  getRoot().getElementById("pnl_flex_dir_settings_" + flexDir).style.display =
    "block";
  getRoot().getElementById(
    "pnl_flex_warp_" + flexDir.replace("-reverse", "")
  ).style.display = "block";

  e.target.classList.add("action_icon_radio_active");
  // Add icon-fill_active to SVG
  const svg = e.target.querySelector("svg");
  if (svg) svg.classList.add("icon-fill_active");

  //target.style.flexDirection = flexDir;
  if (typeof window.generateInspectaCss === 'function') {
    window.generateInspectaCss("flexDirection", flexDir);
  }

  // Update radio button selections for the newly visible panels
  setTimeout(() => {
    // Refresh targetStyles to ensure we have the latest values
    if (window.target) {
      targetStyles = window.getComputedStyle(window.target);
    }

    if (typeof populateDisplay === 'function') {
      populateDisplay();
    }

    // Regenerate property change indicators after UI update
    if (typeof updatePropertyChangeIndicators === 'function') {
      updatePropertyChangeIndicators();
    }
  }, 0);
}
function flexWrapChange(e) {
  getRoot().querySelectorAll("[id^='in_flex_wrap_']").forEach((element) => {
    element.classList.remove("action_icon_radio_active");
    // Remove icon-fill_active from SVG
    const svg = element.querySelector("svg");
    if (svg) svg.classList.remove("icon-fill_active");
  });

  e.target.classList.add("action_icon_radio_active");
  // Add icon-fill_active to SVG
  const svg = e.target.querySelector("svg");
  if (svg) svg.classList.add("icon-fill_active");

  const flexWrap = e.target.id.substring(e.target.id.lastIndexOf("_") + 1); //e.target.id.replace('in_flex_wrap_', '');
  //target.style.flexWrap = flexWrap;
  if (typeof window.generateInspectaCss === 'function') {
    window.generateInspectaCss("flexWrap", flexWrap);
  }
}
function flexJustifyChange(e) {
  getRoot()
    .querySelectorAll("[id^='in_justify_content_']")
    .forEach((element) => {
      element.classList.remove("action_icon_radio_active");
      // Remove icon-fill_active from SVG
      const svg = element.querySelector("svg");
      if (svg) svg.classList.remove("icon-fill_active");
    });

  e.target.classList.add("action_icon_radio_active");
  // Add icon-fill_active to SVG
  const svg = e.target.querySelector("svg");
  if (svg) svg.classList.add("icon-fill_active");

  const flexJustify = e.target.id.substring(e.target.id.lastIndexOf("_") + 1); //e.target.id.replace('in_justify_content_', '');
  //target.style.justifyContent = flexJustify;
  if (typeof window.generateInspectaCss === 'function') {
    window.generateInspectaCss("justifyContent", flexJustify);
  }
}
function flexAlignChange(e) {
  getRoot().querySelectorAll("[id^='in_align_items_']").forEach((element) => {
    element.classList.remove("action_icon_radio_active");
    // Remove icon-fill_active from SVG
    const svg = element.querySelector("svg");
    if (svg) svg.classList.remove("icon-fill_active");
  });

  e.target.classList.add("action_icon_radio_active");
  // Add icon-fill_active to SVG
  const svg = e.target.querySelector("svg");
  if (svg) svg.classList.add("icon-fill_active");

  const flexAlign = e.target.id.substring(e.target.id.lastIndexOf("_") + 1);
  //target.style.alignItems = flexAlign;
  if (typeof window.generateInspectaCss === 'function') {
    window.generateInspectaCss("alignItems", flexAlign);
  }
}
function gapChange(e) {
  const gapValue = e.target.value + "px";
  //target.style.gap = gapValue;
  if (typeof window.generateInspectaCss === 'function') {
    window.generateInspectaCss("gap", gapValue);
  }
  //generateInspectaCss('width', w);
}

//-----------POSITION------------
function positionChange(e) {
  if (typeof window.generateInspectaCss === 'function') {
    window.generateInspectaCss("position", e.target.value);
  }
  // Show/hide position-related panels
  const show = e.target.value !== 'static';
  const showPositioning = e.target.value === 'absolute' || e.target.value === 'fixed';
  const absVals = $id('pnl_absolute_position_values');
  const absSpacing = $id('pnl_absolute_poisition_spacing_values');
  const zIndex = $id('pnl_z_index');
  const relativeTo = $id('relative_to');

  // Only show/hide if the panel is not minimized
  if (!pnl_properties.classList.contains('minimized')) {
    if (absVals) absVals.style.display = showPositioning ? '' : 'none';
    if (absSpacing) absSpacing.style.display = show ? '' : 'none';
    if (zIndex) zIndex.style.display = show ? '' : 'none';
    if (relativeTo) relativeTo.style.display = show ? '' : 'none';
  }

  // Set all manual absolute position inputs to 'auto' when position changes
  ['in_pos_mt', 'in_pos_mb', 'in_pos_mr', 'in_pos_ml'].forEach(id => {
    const input = $id(id);
    if (input) input.value = 'auto';
  });

  // Update property change indicators after position change
  setTimeout(() => {
    if (typeof window.updatePropertyChangeIndicators === 'function') {
      window.updatePropertyChangeIndicators();
    }
  }, 100);
}

// Function to populate relative parent options based on the element's actual parent
function populateRelativeParentOptions() {
  const relativeParentSelect = $id('relative_parent');
  if (!relativeParentSelect || !window.target) return;

  // Clear existing options
  relativeParentSelect.innerHTML = '';

  // Get the element's parent
  const parent = window.target.parentElement;

  // Always add Body option
  const bodyOption = document.createElement('option');
  bodyOption.value = 'body';
  bodyOption.textContent = 'Body';
  relativeParentSelect.appendChild(bodyOption);

  // Add Parent option
  const parentOption = document.createElement('option');
  parentOption.value = 'parent';
  parentOption.textContent = 'Parent';
  relativeParentSelect.appendChild(parentOption);

  // If parent exists and has a meaningful tag name, add it as an option
  if (parent && parent.tagName && parent.tagName !== 'BODY') {
    const parentTagOption = document.createElement('option');
    parentTagOption.value = 'parent-element';

    // Get parent's tag name and class/id for better identification
    let parentName = parent.tagName.toLowerCase();
    if (parent.id) {
      parentName += `#${parent.id}`;
    } else if (parent.className && typeof parent.className === 'string') {
      const classes = parent.className.split(' ').filter(c => c.trim());
      if (classes.length > 0) {
        parentName += `.${classes[0]}`;
      }
    }

    parentTagOption.textContent = parentName;
    relativeParentSelect.appendChild(parentTagOption);
  }

  // Set default to parent
  relativeParentSelect.value = 'parent';
}
function isAllBordersEqual() {
  const borderLeft = $id("in_bl").value;
  const borderTop = $id("in_bt").value;
  const borderRight = $id("in_br").value;
  const borderBottom = $id("in_bb").value;
  if (borderLeft !== borderTop || borderLeft !== borderRight || borderLeft !== borderBottom || borderRight !== borderTop || borderRight !== borderBottom || borderBottom !== borderTop) {
    return false;
  }
  return true;
}
function inputsEventRegisterForProperties() {
  //SIZE
  // Remove the old width input event listener since it's now handled by the unit input system in main.js
  // $id("in_width").addEventListener("input", widthChange);
  // Remove the old min/max width and height input event listeners since they are now handled by the unit input system in main.js
  // $id("in_min_width").addEventListener("input", minWidthChange);
  // $id("in_max_width").addEventListener("input", maxWidthChange);
  // $id("in_min_height").addEventListener("input", minHeightChange);
  // $id("in_max_height").addEventListener("input", maxHeightChange);

  // Removed legacy min/max event listeners

  //BACKGROUND COLOR
  $id("in_bg_color_hex").addEventListener("input", backgroundColorChange);
  $id("in_bg_color_opac").addEventListener("input", backgroundOpacityChange);

  //BORDER
  $id("in_bc").addEventListener("input", borderWidthChange);
  $id("in_bc").addEventListener("blur", function () {
    if (isAllBordersEqual()) {
      showHideMixedBorderLabel(false);
    }
    else {
      showHideMixedBorderLabel(true);
    }
  });
  $id("in_bc_mixed").addEventListener("click", function () {
    showHideMixedBorderLabel(false);
    $id('in_bc').focus();
  }
  );
  $id("in_border_color_hex").addEventListener("input", borderColorChange);
  $id("in_border_color_opac").addEventListener(
    "input",
    borderColorOpacityChange
  );
  $id("in_bl").addEventListener("input", borderLeftChange);
  $id("in_bt").addEventListener("input", borderToptChange);
  $id("in_br").addEventListener("input", borderRightChange);
  $id("in_bb").addEventListener("input", borderBottomChange);
  $id("in_radius").addEventListener("input", borderRadiusChange);
  // Border radius corner inputs are handled by setupArrowKeyValidation
  // No need to add duplicate event listeners here
  getRoot().querySelectorAll("[id^='in_border_style_']").forEach((element) => {
    element.addEventListener("click", function (e) {
      // Always use the .action_icon as the target, regardless of SVG click
      borderStyleClick({ target: element });
    });
  });

  //MARGIN
  $id("in_mt").addEventListener("input", marginTopChange);
  $id("in_mr").addEventListener("input", marginRightChange);
  $id("in_mb").addEventListener("input", marginBottomChange);
  $id("in_ml").addEventListener("input", marginLeftChange);
  $id("in_pt").addEventListener("input", paddingTopChange);
  $id("in_pr").addEventListener("input", paddingRightChange);
  $id("in_pb").addEventListener("input", paddingBottomChange);
  $id("in_pl").addEventListener("input", paddingLeftChange);

  //MAIN OPACITY
  $id("in_el_opac").addEventListener("input", opacityChange);

  //TYPOGRAPHY
  $id("in_font_size").addEventListener("input", fontSizeChange);
  $id("in_line_height").addEventListener("input", lineHeightChange);
  $id("in_letter_spacing").addEventListener("input", letterSpacingChange);
  $id("in_txt_decoration_none").addEventListener("click", textDecorationChange);
  $id("in_txt_underline").addEventListener("click", textDecorationChange);
  $id("in_txt_line_through").addEventListener("click", textDecorationChange);
  // Handle font weight select open/close for arrow rotation
  const fontWeightSelect = $id("in_font_weight");
  if (fontWeightSelect) {
    fontWeightSelect.addEventListener('click', () => {
      fontWeightSelect.classList.toggle('open');
    });

    fontWeightSelect.addEventListener("change", typographyChangeWeight);
  }
  $id("in_font_color_hex").addEventListener("input", fontColorChange);
  $id("in_font_color_opac").addEventListener("input", fontColorOpacityChange);
  $id("in_line_height").addEventListener("input", lineHeightChange);
  getRoot().querySelectorAll("[id^='in_txt_align_']").forEach((element) => {
    element.addEventListener("click", textAlignChange);
  });

  //BOX SHADOW
  $id("in_bxsh_hex").addEventListener("input", boxShadowChangeColor);
  $id("in_bxsh_opac").addEventListener("input", boxShadowChangeOpacity);
  $id("in_bxsh_x").addEventListener("input", boxShadowChangeX);
  $id("in_bxsh_y").addEventListener("input", boxShadowChangeY);
  $id("in_bxsh_blur").addEventListener("input", boxShadowChangeBlur);
  $id("in_bxsh_spread").addEventListener("input", boxShadowChangeSpread);

  //DISPLAY
  getRoot().querySelectorAll("[id^='in_dis_']").forEach((element) => {
    element.addEventListener("click", displayChange);
  });

  //FLEX-DIR
  getRoot().querySelectorAll("[id^='in_flex_dir_']").forEach((element) => {
    element.addEventListener("click", flexDirChange);
  });

  getRoot().querySelectorAll("[id^='in_flex_wrap_']").forEach((element) => {
    element.addEventListener("click", flexWrapChange);
  });
  getRoot()
    .querySelectorAll("[id^='in_justify_content_']")
    .forEach((element) => {
      element.addEventListener("click", flexJustifyChange);
    });
  getRoot().querySelectorAll("[id^='in_align_items_']").forEach((element) => {
    element.addEventListener("click", flexAlignChange);
  });

  $id("in_gap").addEventListener("input", gapChange);

  //POSITION
  // Handle position select open/close for arrow rotation
  const positionSelect = $id("in_position");
  if (positionSelect) {
    positionSelect.addEventListener('click', () => {
      positionSelect.classList.toggle('open');
    });

    positionSelect.addEventListener("change", positionChange);
  }

  //PASTE CSS
  btn_paste_css_props_panel.addEventListener("click", function () {
    navigator.clipboard.readText().then((text) => {
      //if (isCssDeclarationBlock(text.replace(/(\r\n|\n|\r)/gm,""))) {
      const cssText = cleanupCss(text);
      if (isCssDeclarationBlock(cssText)) {
        const cssName = extractFirstCssComment(text);
        pastedStyleObject = cssTextToStyleObject(cssText.trim());
        onApplyCssClick();
      }
      else {
        console.log('not css');
      }
    });
  });

  // In inputsEventRegisterForProperties, add:
  const objectFitSelect = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector('#in_object_fit_select') : document.querySelector('#in_object_fit_select');
  if (objectFitSelect) {
    objectFitSelect.addEventListener('change', function (e) {
      if (window.target && window.target.nodeName && window.target.nodeName.toLowerCase() === 'img') {
        window.target.style.objectFit = e.target.value;
        generateInspectaCss('objectFit', e.target.value);
      }
    });
  }
}

//-----------UTILS------------
function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    }
    : null;
}
//
/**
 *Prevent Event bubbling
 *  */
// function stopBubbling(e) {
//   e.stopPropagation();
//   e.preventDefault();
//   e.stopImmediatePropagation()

// }

// show selected element in panel header
function showElement(target) {
  if (!target) return;
  try {
    let name = target.nodeName.toLowerCase();
    if (target.id) name += `#${target.id}`;
    if (target.className && typeof target.className === 'string') {
      // Remove inspecta classes, global color classes, and extra spaces
      let classStr = target.className
        .replace(/inspecta-inspect-active|inspecta-inspect|inspecta-inspect-isolated/g, '')
        .replace(/inspecta-global-color-[^\s.]*/g, '') // Remove all inspecta-global-color-* classes
        .trim()
        .replace(/\s+/g, '.');
      if (classStr) name += `.${classStr}`;
    }

    $id("el_name").innerHTML = name;
  } catch (e) {
    console.log(e);
    $id("el_name").innerHTML = target.nodeName;
  }
}

function showProperties() {
  pnl_overview.style.display = "none";
  pnl_elements.style.display = "block";
  btn_back.style.display = "flex";
  pnl_title.innerHTML = "Properties";
  // pnl_element_selection_arrows.style.display = "flex";
  inspect_hint.style.display = "none";
  figma_compare_panel.style.display = "none";
}

//let selectingElement = false; // Flag to track whether an element is being selected

// Prevent interactions while selecting an element
// function preventInteractions(event) {
//   if (selectingElement || event.target.tagName === "A") {
//     event.preventDefault();
//   }
// }

// Data Population
function populateMargin() {
  $id("in_mt").value = toNumb(targetStyles.marginTop);
  $id("in_mr").value = toNumb(targetStyles.marginRight);
  $id("in_mb").value = toNumb(targetStyles.marginBottom);
  $id("in_ml").value = toNumb(targetStyles.marginLeft);
}

// Data Population - Display

function populateDisplay() {
  // Remove Display Active classess
  $id("in_dis_block").classList.remove("action_icon_radio_active");
  $id("in_dis_flex").classList.remove("action_icon_radio_active");
  $id("in_dis_grid").classList.remove("action_icon_radio_active");
  $id("in_dis_inline-block").classList.remove("action_icon_radio_active");
  $id("in_dis_inline").classList.remove("action_icon_radio_active");
  $id("in_dis_none").classList.remove("action_icon_radio_active");

  // Remove icon-fill_active from all display SVGs
  getRoot().querySelectorAll("[id^='in_dis_'] svg").forEach((svg) => {
    svg.classList.remove("icon-fill_active");
  });
  // Remove Flex Active classess
  $id("in_flex_dir_row").classList.remove("action_icon_radio_active");
  $id("in_flex_dir_column").classList.remove("action_icon_radio_active");
  $id("in_flex_dir_row-reverse").classList.remove("action_icon_radio_active");
  $id("in_flex_dir_column-reverse").classList.remove("action_icon_radio_active");

  // Remove icon-fill_active from all flex direction SVGs
  getRoot().querySelectorAll("[id^='in_flex_dir_'] svg").forEach((svg) => {
    svg.classList.remove("icon-fill_active");
  });

  // Remove Align-items Active classess
  getRoot().querySelectorAll("[id^='in_align_items_']").forEach((element) => {
    element.classList.remove("action_icon_radio_active");
    // Remove icon-fill_active from SVG
    const svg = element.querySelector("svg");
    if (svg) svg.classList.remove("icon-fill_active");
  });

  // Set default align-items selection (stretch is the CSS default for flex containers)
  if (targetStyles.display === "flex" && targetStyles.flexDirection) {
    if (!targetStyles.alignItems || targetStyles.alignItems === "normal" || targetStyles.alignItems === "stretch") {
      const defaultAlignElement = $id(`in_align_items_${targetStyles.flexDirection}_stretch`);
      if (defaultAlignElement) {
        defaultAlignElement.classList.add("action_icon_radio_active");
        const svg = defaultAlignElement.querySelector("svg");
        if (svg) svg.classList.add("icon-fill_active");
      }
    }
  }

  // Remove justify-content Active classess

  getRoot()
    .querySelectorAll("[id^='in_justify_content_']")
    .forEach((element) => {
      element.classList.remove("action_icon_radio_active");
      // Remove icon-fill_active from SVG
      const svg = element.querySelector("svg");
      if (svg) svg.classList.remove("icon-fill_active");
    });

  // Remove wrap Active classess
  getRoot().querySelectorAll("[id^='in_flex_wrap_']").forEach((element) => {
    element.classList.remove("action_icon_radio_active");
    // Remove icon-fill_active from SVG
    const svg = element.querySelector("svg");
    if (svg) svg.classList.remove("icon-fill_active");
  });

  // display
  switch (targetStyles.display) {
    case "block":
      $id("in_dis_block").classList.add("action_icon_radio_active");
      $id("in_dis_block").querySelector("svg")?.classList.add("icon-fill_active");
      break;
    case "flex":
      $id("in_dis_flex").classList.add("action_icon_radio_active");
      $id("in_dis_flex").querySelector("svg")?.classList.add("icon-fill_active");
      break;
    case "grid":
      $id("in_dis_grid").classList.add("action_icon_radio_active");
      $id("in_dis_grid").querySelector("svg")?.classList.add("icon-fill_active");
      break;
    case "inline-block":
      $id("in_dis_inline-block").classList.add("action_icon_radio_active");
      $id("in_dis_inline-block").querySelector("svg")?.classList.add("icon-fill_active");
      break;
    case "inline":
      $id("in_dis_inline").classList.add("action_icon_radio_active");
      $id("in_dis_inline").querySelector("svg")?.classList.add("icon-fill_active");
      break;
    case "none":
      $id("in_dis_none").classList.add("action_icon_radio_active");
      $id("in_dis_none").querySelector("svg")?.classList.add("icon-fill_active");
  }

  $id("in_dis_current").innerHTML = targetStyles.display;
  $id('in_gap').value = toNumb(targetStyles.gap);
  showHideFlexSettings(targetStyles.display);
  try {
    if (targetStyles.flexDirection) {
      $id("pnl_flex_dir_settings_row").style.display = "none";
      $id("pnl_flex_dir_settings_column").style.display = "none";
      $id("pnl_flex_dir_settings_" + targetStyles.flexDirection).style.display =
        "block";
      $id("in_flex_dir_" + targetStyles.flexDirection).classList.add(
        "action_icon_radio_active"
      );
      // Add icon-fill_active to SVG
      const svg = $id("in_flex_dir_" + targetStyles.flexDirection).querySelector("svg");
      if (svg) svg.classList.add("icon-fill_active");

      // Show/hide flex wrap panels based on flex direction
      getRoot().querySelectorAll("[id^='pnl_flex_warp']").forEach((element) => {
        element.style.display = "none";
      });
      getRoot().getElementById(
        "pnl_flex_warp_" + targetStyles.flexDirection.replace("-reverse", "")
      ).style.display = "block";
    }
    if (
      targetStyles.flexDirection &&
      targetStyles.alignItems &&
      targetStyles.alignItems !== "normal"
    ) {
      // Map CSS values to HTML element ID values
      let alignValue = targetStyles.alignItems;
      if (alignValue === 'flex-start') alignValue = 'start';
      else if (alignValue === 'flex-end') alignValue = 'end';

      const item_property_name =
        "in_align_items_" +
        targetStyles.flexDirection +
        "_" +
        alignValue;



      $id(item_property_name)?.classList.add("action_icon_radio_active");
      // Add icon-fill_active to SVG
      const svg = $id(item_property_name)?.querySelector("svg");
      if (svg) svg.classList.add("icon-fill_active");
    }
    // Set default justify-content selection (flex-start is the CSS default)
    if (targetStyles.flexDirection && !targetStyles.justifyContent ||
      targetStyles.justifyContent === "normal" ||
      targetStyles.justifyContent === "initial" ||
      targetStyles.justifyContent === "flex-start") {

      // Select the default flex-start option
      const defaultJustifyElement = $id(`in_justify_content_${targetStyles.flexDirection}_start`);
      if (defaultJustifyElement) {
        defaultJustifyElement.classList.add("action_icon_radio_active");
        const svg = defaultJustifyElement.querySelector("svg");
        if (svg) svg.classList.add("icon-fill_active");
      }
    } else if (
      targetStyles.flexDirection &&
      targetStyles.justifyContent &&
      targetStyles.justifyContent !== "normal" &&
      targetStyles.justifyContent !== "initial"
    ) {
      // Map CSS values to HTML element ID values
      let justifyValue = targetStyles.justifyContent;
      if (justifyValue === 'flex-start') justifyValue = 'start';
      else if (justifyValue === 'flex-end') justifyValue = 'end';

      const item_property_name =
        "in_justify_content_" +
        targetStyles.flexDirection +
        "_" +
        justifyValue;



      $id(item_property_name)?.classList.add("action_icon_radio_active");
      // Add icon-fill_active to SVG
      const svg = $id(item_property_name)?.querySelector("svg");
      if (svg) svg.classList.add("icon-fill_active");
    }

    // Handle flex wrap - simplified logic
    // Clear all flex-wrap radio buttons first
    getRoot().querySelectorAll("[id^='in_flex_wrap_']").forEach((element) => {
      element.classList.remove("action_icon_radio_active");
      // Remove icon-fill_active from SVG
      const svg = element.querySelector("svg");
      if (svg) svg.classList.remove("icon-fill_active");
    });

    let flexWrapValue = targetStyles.flexWrap;
    let shouldSelectWrap = false;

    // Always check CSS rules first for flex-wrap (including child element rules)
    if (window.target && window.findApplicableCssRules) {
      const flexWrapRule = window.findApplicableCssRules(window.target, 'flex-wrap') || window.findApplicableCssRules(window.target, 'flexWrap');
      if (flexWrapRule && flexWrapRule.enabled) {
        flexWrapValue = flexWrapRule.value;
        shouldSelectWrap = true;
      }
    }

    // Fallback to computed styles if no CSS rule found
    if (!shouldSelectWrap && flexWrapValue) {
      shouldSelectWrap = true;
    }

    // Set default flex-wrap selection (nowrap is the CSS default)
    if (!shouldSelectWrap && targetStyles.display === "flex" && targetStyles.flexDirection) {
      const direction = targetStyles.flexDirection.replace('-reverse', '');
      const defaultWrapElement = $id(`in_flex_wrap_${direction}_nowrap`);
      if (defaultWrapElement) {
        defaultWrapElement.classList.add("action_icon_radio_active");
        const svg = defaultWrapElement.querySelector("svg");
        if (svg) svg.classList.add("icon-fill_active");
      }
    } else if (shouldSelectWrap) {
      const direction = targetStyles.flexDirection.replace("-reverse", "");
      const wrapValue = flexWrapValue;
      const elementId = "in_flex_wrap_" + direction + "_" + wrapValue;

      const flexWrapElement = $id(elementId);

      if (flexWrapElement) {
        flexWrapElement.classList.add("action_icon_radio_active");
        // Add icon-fill_active to SVG
        const svg = flexWrapElement.querySelector("svg");
        if (svg) svg.classList.add("icon-fill_active");
      }
    }
  } catch (e) {
    console.log(e);
  }
}
function showHideFlexSettings(displayType) {
  if (displayType === "flex") {
    $id("flex-settings").style.display = "block";
  } else {
    $id("flex-settings").style.display = "none";
  }
}

// Data Population - Padding
function populatePadding() {
  $id("in_pt").value = parseInt(targetStyles.paddingTop);
  $id("in_pr").value = parseInt(targetStyles.paddingRight);
  $id("in_pb").value = parseInt(targetStyles.paddingBottom);
  $id("in_pl").value = parseInt(targetStyles.paddingLeft);
}

// Data Population - Size
function populateSize() {
  restoreUnitInputForElement('width', '#in_width', '#widthUnitHint', targetStyles.width);
  restoreUnitInputForElement('min-width', '#in_min_width', '#minWidthUnitHint', targetStyles.minWidth);
  restoreUnitInputForElement('max-width', '#in_max_width', '#maxWidthUnitHint', targetStyles.maxWidth);
  restoreUnitInputForElement('height', '#in_height', '#heightUnitHint', targetStyles.height);
  restoreUnitInputForElement('min-height', '#in_min_height', '#minHeightUnitHint', targetStyles.minHeight);
  restoreUnitInputForElement('max-height', '#in_max_height', '#maxHeightUnitHint', targetStyles.maxHeight);

  // Show/hide min/max fields based on values
  const minW = $id('in_min_width');
  const minH = $id('in_min_height');
  const maxW = $id('in_max_width');
  const maxH = $id('in_max_height');

  // Get their parent .item_values containers
  const minContainer = minW.closest('.item_values');
  const maxContainer = maxW.closest('.item_values');

  // Helper to check if a value is set (not empty, not auto, not none, not 0px)
  function isSet(val) {
    return val && val !== '' && val !== 'auto' && val !== 'none' && val !== undefined && val !== null && val !== '0px';
  }

  // Set input values to empty if not set
  if (!isSet(targetStyles.minWidth)) minW.value = '';
  if (!isSet(targetStyles.minHeight)) minH.value = '';
  if (!isSet(targetStyles.maxWidth)) maxW.value = '';
  if (!isSet(targetStyles.maxHeight)) maxH.value = '';

  // Show/hide min
  if (isSet(targetStyles.minWidth) || isSet(targetStyles.minHeight)) {
    if (minContainer) minContainer.style.display = '';
  } else {
    if (minContainer) minContainer.style.display = 'none';
  }
  // Show/hide max
  if (isSet(targetStyles.maxWidth) || isSet(targetStyles.maxHeight)) {
    if (maxContainer) maxContainer.style.display = '';
  } else {
    if (maxContainer) maxContainer.style.display = 'none';
  }

  // Add click listeners to Min/Max header labels to toggle
  const minLabel = $id('in_min');
  const maxLabel = $id('in_max');
  // Set initial state
  if (minLabel && minContainer) {
    minLabel.classList.toggle('active', minContainer.style.display !== 'none');
    minLabel.classList.toggle('inactive', minContainer.style.display === 'none');
    minLabel.onclick = (e) => {
      e.stopPropagation();
      const isNowVisible = minContainer.style.display === 'none';
      minContainer.style.display = isNowVisible ? '' : 'none';
      minLabel.classList.toggle('active', isNowVisible);
      minLabel.classList.toggle('inactive', !isNowVisible);
    };
  }
  if (maxLabel && maxContainer) {
    maxLabel.classList.toggle('active', maxContainer.style.display !== 'none');
    maxLabel.classList.toggle('inactive', maxContainer.style.display === 'none');
    maxLabel.onclick = (e) => {
      e.stopPropagation();
      const isNowVisible = maxContainer.style.display === 'none';
      maxContainer.style.display = isNowVisible ? '' : 'none';
      maxLabel.classList.toggle('active', isNowVisible);
      maxLabel.classList.toggle('inactive', !isNowVisible);
    };
  }
}

// Data Population - Position
// Helper to get the correct relative parent label for a given element and position
function getRelativeParentLabel(element, position) {
  if (position === 'fixed') {
    return 'body'; // Always body for fixed
  }
  let parent = element ? element.parentElement : null;
  while (parent && parent !== document.body) {
    const parentStyle = window.getComputedStyle(parent);
    if (parentStyle.position === 'relative') {
      return parent.tagName.toLowerCase() + (parent.id ? '#' + parent.id : '');
    }
    parent = parent.parentElement;
  }
  return 'body';
}

function populatePosition() {
  // Get the most up-to-date computed styles
  const currentPosition = window.target ? window.getComputedStyle(window.target).position : targetStyles.position;
  $id("in_position").value = currentPosition;
  // Show/hide position-related panels
  const show = currentPosition !== 'static';
  const showPositioning = currentPosition === 'absolute' || currentPosition === 'fixed';
  const absVals = $id('pnl_absolute_position_values');
  const absSpacing = $id('pnl_absolute_poisition_spacing_values');
  const zIndex = $id('pnl_z_index');
  const relativeTo = $id('relative_to');
  if (absVals && absVals.style) absVals.style.display = showPositioning ? '' : 'none';
  if (absSpacing && absSpacing.style) absSpacing.style.display = show ? '' : 'none';
  if (zIndex && zIndex.style) zIndex.style.display = show ? '' : 'none';
  if (relativeTo && relativeTo.style) {
    relativeTo.style.display = show ? '' : 'none';

    // Populate relative parent options
    if (show) {
      populateRelativeParentOptions();
    }
  }

  // Handle position radio group selection
  if (show) {
    // Remove active class from all position buttons
    const positionButtons = ['pos_tl', 'pos_tr', 'pos_br', 'pos_bl', 'pos_center', 'pos_t', 'pos_r', 'pos_b', 'pos_l'];
    positionButtons.forEach(id => {
      const button = $id(id);
      if (button) {
        button.classList.remove('action_icon_radio_active');
        const svg = button.querySelector('svg');
        if (svg) svg.classList.remove('icon-fill_active');
      }
    });

    // Determine which position button should be active based on current values
    const top = targetStyles.top;
    const right = targetStyles.right;
    const bottom = targetStyles.bottom;
    const left = targetStyles.left;
    const transform = targetStyles.transform;

    // Check for specific position patterns
    if (top === '0px' && left === '0px' && right === 'auto' && bottom === 'auto') {
      setActivePositionButton('pos_tl');
    } else if (top === '0px' && right === '0px' && left === 'auto' && bottom === 'auto') {
      setActivePositionButton('pos_tr');
    } else if (bottom === '0px' && right === '0px' && top === 'auto' && left === 'auto') {
      setActivePositionButton('pos_br');
    } else if (bottom === '0px' && left === '0px' && top === 'auto' && right === 'auto') {
      setActivePositionButton('pos_bl');
    } else if (top === '50%' && left === '50%' && transform && transform.includes('translate(-50%, -50%)')) {
      setActivePositionButton('pos_center');
    } else if (top === '0px' && left === 'auto' && right === 'auto' && bottom === 'auto') {
      setActivePositionButton('pos_t');
    } else if (right === '0px' && top === 'auto' && left === 'auto' && bottom === 'auto') {
      setActivePositionButton('pos_r');
    } else if (bottom === '0px' && top === 'auto' && left === 'auto' && right === 'auto') {
      setActivePositionButton('pos_b');
    } else if (left === '0px' && top === 'auto' && right === 'auto' && bottom === 'auto') {
      setActivePositionButton('pos_l');
    }
  }

  function setActivePositionButton(buttonId) {
    const button = $id(buttonId);
    if (button) {
      button.classList.add('action_icon_radio_active');
      const svg = button.querySelector('svg');
      if (svg) svg.classList.add('icon-fill_active');
    }
  }

  // Populate manual absolute position inputs with units
  function showAutoIfEmpty(val) {
    if (val === undefined || val === null || val === '' || isNaN(toNumb(val))) {
      return 'auto';
    }
    // Extract numeric value and unit
    const match = val.match(/^(-?\d*\.?\d+)(px|em|rem|%|vw|vh)?$/);
    if (!match) return val;
    const [_, num, unit = 'px'] = match;
    return { num, unit };
  }

  const positions = [
    { input: 'in_pos_mt', value: targetStyles.top, unitHint: 'topUnitHint' },
    { input: 'in_pos_mb', value: targetStyles.bottom, unitHint: 'bottomUnitHint' },
    { input: 'in_pos_mr', value: targetStyles.right, unitHint: 'rightUnitHint' },
    { input: 'in_pos_ml', value: targetStyles.left, unitHint: 'leftUnitHint' }
  ];

  positions.forEach(({ input, value, unitHint }) => {
    const inputEl = $id(input);
    const unitHintEl = $id(unitHint);
    if (inputEl && unitHintEl) {
      const val = showAutoIfEmpty(value);
      if (val === 'auto') {
        inputEl.value = 'auto';
        unitHintEl.textContent = '-';
      } else if (typeof val === 'object') {
        inputEl.value = val.num;
        unitHintEl.textContent = val.unit;
      } else {
        inputEl.value = val;
        unitHintEl.textContent = 'px';
      }
    }
  });

  // Use helper to set relative_parent content
  const relParentLabel = $id('realative_parent');
  if (relParentLabel) {
    relParentLabel.textContent = getRelativeParentLabel(target, targetStyles.position);
  }

  // Z-INDEX: Prefer custom CSS rule, then inline, then computed
  let zIndexValue = null;
  if (window.findApplicableCssRules) {
    const zIndexRule = window.findApplicableCssRules(target, 'z-index');
    if (zIndexRule && zIndexRule.enabled) {
      zIndexValue = zIndexRule.value;
    }
  }
  if (zIndexValue !== null && zIndexValue !== undefined && zIndexValue !== "") {
    if ($id("in_z_index")) $id("in_z_index").value = zIndexValue;
  } else if (target && target.style && target.style.zIndex) {
    if ($id("in_z_index")) $id("in_z_index").value = target.style.zIndex;
  } else if (target instanceof Element) {
    const computedZIndex = window.getComputedStyle(target).zIndex;
    if ($id("in_z_index")) $id("in_z_index").value = computedZIndex === "auto" ? "auto" : computedZIndex;
  }
}

// Data Population - Opacity
function populateOpacity() {
  $id("in_el_opac").value = targetStyles.opacity * 100;
}

// Data Population - Border

function populateBorder(e) {
  // width
  $id("in_bt").value = parseInt(targetStyles.borderTopWidth);
  $id("in_bb").value = parseInt(targetStyles.borderBottomWidth);
  $id("in_bl").value = parseInt(targetStyles.borderLeftWidth);
  $id("in_br").value = parseInt(targetStyles.borderRightWidth);
  $id("in_bc").value = parseInt(targetStyles.borderWidth);
  checkIfAllBordersEqual();
  // Add guard for getComputedStyle
  let targetStylesLocal = null;
  if (target instanceof Element) {
    targetStylesLocal = window.getComputedStyle(target);
  }
  // // rgb to hex

  const hasVisibleBorder = parseInt(targetStyles.borderWidth) > 0;
  const colorValue = rgba2hexAdvanced(targetStyles.borderColor);

  // First, clear any existing active classes from style buttons
  getRoot().querySelectorAll("[id^='in_border_style_']").forEach((element) => {
    element.classList.remove("action_icon_radio_active");
    const svg = element.querySelector("svg");
    if (svg) svg.classList.remove("icon-fill_active");
    const span = element.querySelector("span");
    if (span) span.style.color = "var(--in-color-text-1)";
  });

  const borderStyle = targetStyles.borderStyle;

  if (hasVisibleBorder && borderStyle && borderStyle !== 'none') {
    // If there's a visible border with a specific style, select that style
    const styleButton = getRoot().querySelector(`#in_border_style_${borderStyle}`);
    if (styleButton) {
      styleButton.classList.add("action_icon_radio_active");
      const svg = styleButton.querySelector("svg");
      if (svg) svg.classList.add("icon-fill_active");
    }
  } else {
    // If no border or style is 'none', select the 'none' button
    const noneButton = getRoot().querySelector("#in_border_style_none");
    if (noneButton) {
      noneButton.classList.add("action_icon_radio_active");
      const span = noneButton.querySelector("span");
      if (span) span.style.color = "var(--in-color-primary)";
    }
  }

  if (hasVisibleBorder && targetStyles.borderColor !== 'rgba(0, 0, 0, 0)' && targetStyles.borderColor !== 'transparent') {
    $id("in_border_color").style.backgroundColor = colorValue.color;
    $id("in_border_color_hex").value = colorValue.color;
    $id("in_border_color_opac").value = colorValue.opacityPCT; // Only number
  } else {
    $id("in_border_color").style.backgroundColor = 'unset';
    $id("in_border_color_hex").value = '';
    $id("in_border_color_opac").value = '';
  }
}

// Data Population - Border radius
function populateBorderRadius(e) {
  $id("in_radius_tl").value = parseInt(targetStyles.borderTopLeftRadius);
  $id("in_radius_tr").value = parseInt(targetStyles.borderTopRightRadius);
  $id("in_radius_br").value = parseInt(targetStyles.borderBottomLeftRadius);
  $id("in_radius_bl").value = parseInt(targetStyles.borderBottomRightRadius);
  $id("in_radius").value = parseInt(targetStyles.borderRadius);
  checkIfAllRadiusEqual();
}
function populateGradientFromPicker(gradientColor, hexInputId, colorContainerId, opacityInputId) {
  // Defensive: If gradientColor is not an object or not a gradient, do nothing
  if (!gradientColor || typeof gradientColor !== 'object' || gradientColor.type !== 'gradient') {
    return;
  }
  // Set the background to the gradient CSS string
  const container = $id(colorContainerId);
  if (container && gradientColor.cssString) {
    container.style.background = gradientColor.cssString;
  }
  // Extract and display the gradient type instead of the full CSS string
  const hexInput = $id(hexInputId);
  if (hexInput) {
    let gradientType = '';
    if (gradientColor.gradientType) {
      // Use the gradientType property if available
      switch (gradientColor.gradientType) {
        case 'linear':
          gradientType = 'Linear';
          break;
        case 'radial':
          gradientType = 'Radial';
          break;
        case 'conic':
          gradientType = 'Conic';
          break;
        default:
          gradientType = gradientColor.gradientType.charAt(0).toUpperCase() + gradientColor.gradientType.slice(1);
      }
    } else if (gradientColor.cssString) {
      // Fallback: extract from CSS string
      if (gradientColor.cssString.includes('linear-gradient')) {
        gradientType = 'Linear';
      } else if (gradientColor.cssString.includes('radial-gradient')) {
        gradientType = 'Radial';
      } else if (gradientColor.cssString.includes('conic-gradient')) {
        gradientType = 'Conic';
      }
    }
    hexInput.value = gradientType;
  }
  // Set opacity input to the first stop's opacity if available, else 100
  const opacityInput = $id(opacityInputId);
  if (opacityInput) {
    if (gradientColor.stops && gradientColor.stops.length > 0) {
      opacityInput.value = Math.round((gradientColor.stops[0].opacity ?? 1) * 100);
    } else {
      opacityInput.value = 100;
    }
  }
}

function populateImageFromPicker(imageData) {
  // Defensive: If imageData is not an object or not an image, do nothing
  if (!imageData || typeof imageData !== 'object' || imageData.type !== 'image') {
    return;
  }

  // Set the background to show "Image" in the hex input
  const hexInput = $id("in_bg_color_hex");
  if (hexInput) {
    hexInput.value = imageData.url ? 'Image' : '';
  }

  // Set the background color container to show a preview or placeholder
  const container = $id("in_bg_color");
  if (container) {
    if (imageData.url) {
      // Create a CSS background-image string
      const backgroundImageCss = `url("${imageData.url}")`;
      container.style.backgroundImage = backgroundImageCss;
      container.style.backgroundSize = imageData.size || 'auto';
      container.style.backgroundPosition = imageData.position || 'center center';
      container.style.backgroundRepeat = imageData.repeat || 'no-repeat';
    } else {
      // Clear background image and reset to default background color
      container.style.backgroundImage = 'none';
      container.style.backgroundSize = '';
      container.style.backgroundPosition = '';
      container.style.backgroundRepeat = '';
      // Reset to use backgroundColor instead of background
      container.style.backgroundColor = '';
    }
  }

  // Set opacity input to 100 for images (images don't have opacity in the same way)
  const opacityInput = $id("in_bg_color_opac");
  if (opacityInput) {
    opacityInput.value = 100;
  }
}
function populateColorFromPicker(
  rgbaColor,
  valueInputId,
  colorElementId,
  opacityInputId
) {
  let colorValue = !isHexAColor(rgbaColor)
    ? rgba2hexAdvanced(rgbaColor)
    : { color: rgbaColor, opacityPCT: getOpacityFromHexA(rgbaColor) };

  // Update the values
  $id(valueInputId).value = colorValue.color.toUpperCase();

  // Set the thumbnail with color and opacity
  if (colorValue.opacityPCT < 100) {
    // If opacity is less than 100%, use the color with alpha
    const colorWithAlpha = hexColorWithOptionalAlpha(colorValue.color, colorValue.opacityPCT);
    $id(colorElementId).style.backgroundColor = colorWithAlpha;
  } else {
    // If opacity is 100%, use the regular color
    $id(colorElementId).style.backgroundColor = colorValue.color;
  }

  $id(opacityInputId).value =
    colorValue.opacityPCT === 0 ? 100 : colorValue.opacityPCT;
}
// Function to update background label dynamically
function updateBackgroundLabel() {
  // Get the background label element
  const backgroundLabel = shadow.querySelector('#pnl_background_values .property_label');
  if (!backgroundLabel) return;

  let labelText = 'Background Color';

  // Handle background property for gradient
  if (targetStyles.background && typeof targetStyles.background === 'string' &&
    (targetStyles.background.includes('linear-gradient') ||
      targetStyles.background.includes('radial-gradient'))) {
    labelText = 'Gradient';
  }
  // Handle background-image property
  else if (targetStyles.backgroundImage && targetStyles.backgroundImage !== 'none') {
    labelText = 'Background Image';
  }
  // Default to Background Color for solid colors and transparent
  else {
    labelText = 'Background Color';
  }

  backgroundLabel.textContent = labelText;
}

// Data Population - background color
function populateBackgroundColor() {
  // Update the background label first
  updateBackgroundLabel();

  // Handle background property for gradient
  if (targetStyles.background && typeof targetStyles.background === 'string' &&
    (targetStyles.background.includes('linear-gradient') ||
      targetStyles.background.includes('radial-gradient'))) {
    // It's a gradient background - extract the gradient type
    let gradientType = '';
    if (targetStyles.background.includes('linear-gradient')) {
      gradientType = 'Linear';
    } else if (targetStyles.background.includes('radial-gradient')) {
      gradientType = 'Radial';
    }

    $id("in_bg_color_hex").value = gradientType;
    $id("in_bg_color_opac").value = '';
    $id("in_bg_color").style.background = targetStyles.background;

    // Hide opacity input for gradients
    const opacityInput = $id("in_bg_color_opac");
    const percentageLabel = opacityInput ? opacityInput.nextElementSibling : null;
    if (opacityInput) {
      opacityInput.style.display = 'none';
    }
    if (percentageLabel && percentageLabel.classList.contains('value_type_prec')) {
      percentageLabel.style.display = 'none';
    }
    return;
  }

  // Handle background-image property
  if (targetStyles.backgroundImage && targetStyles.backgroundImage !== 'none') {

    // Extract the image URL from the background-image CSS
    const imageUrlMatch = targetStyles.backgroundImage.match(/url\(['"]?([^'"]+)['"]?\)/);
    if (imageUrlMatch) {
      const imageUrl = imageUrlMatch[1];

      // Set the hex input to show "Image"
      $id("in_bg_color_hex").value = 'Image';
      $id("in_bg_color_opac").value = '';

      // Hide opacity input for images
      const opacityInput = $id("in_bg_color_opac");
      const percentageLabel = opacityInput ? opacityInput.nextElementSibling : null;
      if (opacityInput) {
        opacityInput.style.display = 'none';
      }
      if (percentageLabel && percentageLabel.classList.contains('value_type_prec')) {
        percentageLabel.style.display = 'none';
      }

      // Set the thumbnail to show the background image
      const container = $id("in_bg_color");
      if (container) {
        container.style.backgroundImage = targetStyles.backgroundImage;
        container.style.backgroundSize = 'cover';
        container.style.backgroundPosition = targetStyles.backgroundPosition || 'center center';
        container.style.backgroundRepeat = targetStyles.backgroundRepeat || 'no-repeat';
      }

      return;
    }
  }



  // Also clear any gradient background from the thumbnail
  $id("in_bg_color").style.background = '';
  $id("in_bg_color").style.backgroundImage = '';
  $id("in_bg_color").style.backgroundSize = '';
  $id("in_bg_color").style.backgroundRepeat = '';
  $id("in_bg_color").style.backgroundPosition = '';
  // Reset to use backgroundColor instead of background
  $id("in_bg_color").style.backgroundColor = '';

  // rgb to hex - use the same approach as font color
  const colorValue = rgba2hexAdvanced(targetStyles.backgroundColor);

  if (targetStyles.backgroundColor !== 'rgba(0, 0, 0, 0)' && targetStyles.backgroundColor !== 'transparent') {
    $id("in_bg_color_hex").value = colorValue.color;
    $id("in_bg_color_opac").value = colorValue.opacityPCT === 0 ? +100 : colorValue.opacityPCT;

    // Show opacity input for solid colors
    const opacityInput = $id("in_bg_color_opac");
    const percentageLabel = opacityInput ? opacityInput.nextElementSibling : null;
    if (opacityInput) {
      opacityInput.style.display = '';
    }
    if (percentageLabel && percentageLabel.classList.contains('value_type_prec')) {
      percentageLabel.style.display = '';
    }

    // Set the thumbnail with proper opacity
    if (colorValue.opacityPCT < 100) {
      // If opacity is less than 100%, use the color with alpha
      const colorWithAlpha = hexColorWithOptionalAlpha(colorValue.color, colorValue.opacityPCT);
      $id("in_bg_color").style.backgroundColor = colorWithAlpha;
    } else {
      // If opacity is 100%, use the regular color
      $id("in_bg_color").style.backgroundColor = colorValue.color;
    }
  } else {
    $id("in_bg_color_hex").value = '';
    $id("in_bg_color_opac").value = '';
    $id("in_bg_color").style.backgroundColor = 'transparent';

    // Show opacity input for transparent (solid) colors
    const opacityInput = $id("in_bg_color_opac");
    const percentageLabel = opacityInput ? opacityInput.nextElementSibling : null;
    if (opacityInput) {
      opacityInput.style.display = '';
    }
    if (percentageLabel && percentageLabel.classList.contains('value_type_prec')) {
      percentageLabel.style.display = '';
    }
  }
}

// Data Population - Typography
function populateTypography() {
  // Remove Active classes from text alignment
  getRoot().querySelectorAll("[id^='in_txt_align_']").forEach((element) => {
    element.classList.remove("action_icon_radio_active");
    const svg = element.querySelector("svg");
    if (svg) svg.classList.remove("icon-fill_active");
  });

  // Remove Active classes from text decoration
  getRoot().querySelectorAll("[id^='in_txt_decoration_'], [id^='in_txt_underline'], [id^='in_txt_line_through']").forEach((element) => {
    element.classList.remove("action_icon_radio_active");
    const svg = element.querySelector("svg");
    if (svg) svg.classList.remove("icon-fill_active");
    const span = element.querySelector("span");
    if (span) span.style.color = "var(--in-color-text-1)";
  });

  // Font family - Initialize font selector if not already done
  const fontFamilyContainer = $id("font-family-selector-container");

  if (!window.fontSelector && typeof FontSelector !== 'undefined' && fontFamilyContainer) {
    window.fontSelector = new FontSelector(fontFamilyContainer, {
      placeholder: "Select font...",
      onFontSelect: (fontFamily) => {
        applyFontFamily(fontFamily);
        updateFontWeightOptions(fontFamily);
      }
    });
  }

  // Set the current font family
  const currentFontFamily = targetStyles.fontFamily.indexOf(",") > 0
    ? targetStyles.fontFamily.substring(0, targetStyles.fontFamily.indexOf(","))
    : targetStyles.fontFamily;

  if (window.fontSelector) {
    window.fontSelector.setValue(currentFontFamily);
  }

  // Update font weight options for the current font
  updateFontWeightOptions(currentFontFamily);

  // Font weight - Set after options are updated
  const fontWeightSelect = $id("in_font_weight");
  const targetFontWeight = targetStyles.fontWeight;

  // Try to find a matching option
  let foundMatch = false;
  for (let option of fontWeightSelect.options) {
    if (option.value === targetFontWeight) {
      fontWeightSelect.value = targetFontWeight;
      foundMatch = true;
      break;
    }
  }

  // If no exact match, try to find a numeric match
  if (!foundMatch) {
    const numericWeight = targetFontWeight.replace(/[^\d]/g, '');
    for (let option of fontWeightSelect.options) {
      const optionNumeric = option.value.replace(/[^\d]/g, '');
      if (optionNumeric === numericWeight) {
        fontWeightSelect.value = option.value;
        foundMatch = true;
        break;
      }
    }
  }

  // If still no match, handle special cases like "regular" = "400"
  if (!foundMatch) {
    if (targetFontWeight === '400') {
      // Look for "regular" option
      for (let option of fontWeightSelect.options) {
        if (option.value === 'regular') {
          fontWeightSelect.value = option.value;
          foundMatch = true;
          break;
        }
      }
    } else if (targetFontWeight === 'regular') {
      // Look for "400" option
      for (let option of fontWeightSelect.options) {
        if (option.value === '400') {
          fontWeightSelect.value = option.value;
          foundMatch = true;
          break;
        }
      }
    }
  }

  // If still no match, set to first available option
  if (!foundMatch && fontWeightSelect.options.length > 0) {
    fontWeightSelect.value = fontWeightSelect.options[0].value;
  }

  // Font size
  const fontSizeUnitHint = getRoot().querySelector('#fontSizeUnitHint');
  if (window.elementFontSizeUnits && target && window.elementFontSizeUnits.has(target)) {
    const { value, unit } = window.elementFontSizeUnits.get(target);
    $id("in_font_size").value = value;
    if (fontSizeUnitHint) {
      fontSizeUnitHint.textContent = unit;
    }
  } else {
    const fontSizeMatch = targetStyles.fontSize.match(/^([\d.]+)(px|em|rem|%|vw|vh)$/i);
    if (fontSizeMatch) {
      $id("in_font_size").value = fontSizeMatch[1];
      if (fontSizeUnitHint) {
        fontSizeUnitHint.textContent = fontSizeMatch[2];
      }
    } else {
      $id("in_font_size").value = toNumb(targetStyles.fontSize);
      if (fontSizeUnitHint) {
        fontSizeUnitHint.textContent = 'px'; // fallback to px if no unit found
      }
    }
  }

  // Font line Height
  $id("in_line_height").value = toNumb(targetStyles.lineHeight);

  // Font letter Spacing
  $id("in_letter_spacing").value = toNumb(targetStyles.letterSpacing);

  // rgb to hex
  const colorValue = rgba2hexAdvanced(targetStyles.color);
  $id("in_font_color_hex").value = colorValue.color;
  $id("in_font_color").style.backgroundColor = colorValue.color;
  $id("in_font_color_opac").value = colorValue.opacityPCT;

  // Check text decoration
  if (targetStyles.textDecoration.includes("underline")) {
    $id("in_txt_underline").classList.add("action_icon_radio_active");
    const svg = $id("in_txt_underline").querySelector("svg");
    if (svg) svg.classList.add("icon-fill_active");
  } else if (targetStyles.textDecoration.includes("line-through")) {
    $id("in_txt_line_through").classList.add("action_icon_radio_active");
    const svg = $id("in_txt_line_through").querySelector("svg");
    if (svg) svg.classList.add("icon-fill_active");
  } else {
    // No decoration - set to "None"
    $id("in_txt_decoration_none").classList.add("action_icon_radio_active");
    const span = $id("in_txt_decoration_none").querySelector("span");
    if (span) span.style.color = "var(--in-color-primary)";
  }

  // Text Alignment
  switch (targetStyles.textAlign) {
    case "left":
    case "start": // CSS 'start' maps to 'left' in HTML
      $id("in_txt_align_left").classList.add("action_icon_radio_active");
      const svgLeft = $id("in_txt_align_left").querySelector("svg");
      if (svgLeft) svgLeft.classList.add("icon-fill_active");
      break;
    case "right":
    case "end": // CSS 'end' maps to 'right' in HTML
      $id("in_txt_align_right").classList.add("action_icon_radio_active");
      const svgRight = $id("in_txt_align_right").querySelector("svg");
      if (svgRight) svgRight.classList.add("icon-fill_active");
      break;
    case "center":
      $id("in_txt_align_center").classList.add("action_icon_radio_active");
      const svgCenter = $id("in_txt_align_center").querySelector("svg");
      if (svgCenter) svgCenter.classList.add("icon-fill_active");
      break;
    case "justify":
      $id("in_txt_align_justify").classList.add("action_icon_radio_active");
      const svgJustify = $id("in_txt_align_justify").querySelector("svg");
      if (svgJustify) svgJustify.classList.add("icon-fill_active");
      break;
    default:
      // Handle initial, inherit, unset - default to left
      $id("in_txt_align_left").classList.add("action_icon_radio_active");
      const svgDefault = $id("in_txt_align_left").querySelector("svg");
      if (svgDefault) svgDefault.classList.add("icon-fill_active");
      break;
  }
  restoreUnitInputForElement('font-size', '#in_font_size', '#fontSizeUnitHint', targetStyles.fontSize);
}

function populateBoxShadow() {
  const shadow = targetStyles.boxShadow;
  // if there is no box shadow, reset the box shadow object and UI
  if (shadow === 'none' || !shadow) {
    boxshadow = { x: 0, y: 0, blure: 0, spread: 0, color: { color: '#000000', opacityPCT: 15, opacityHEX: '26' } };
    $id('in_bxsh_x').value = 0;
    $id('in_bxsh_y').value = 0;
    $id('in_bxsh_blur').value = 0;
    $id('in_bxsh_spread').value = 0;
    $id('in_bxsh_hex').value = '#000000';
    $id('in_bxsdc').style.backgroundColor = '#000000';
    $id('in_bxsh_opac').value = 15;
    return;
  }
  // if there is a box shadow, parse it
  const shadowArray = shadow.split(' ');
  const colors = shadow.match(/rgba?\(.+?\)/g);
  if (!colors) return; // No color found

  // Parse values with error handling
  const x = getPx(shadowArray[0]);
  const y = getPx(shadowArray[1]);
  const blur = getPx(shadowArray[2]);
  const spread = getPx(shadowArray[3]);

  // Use fallback values if parsing fails
  boxshadow.x = isNaN(x) ? 0 : x;
  boxshadow.y = isNaN(y) ? 0 : y;
  boxshadow.blure = isNaN(blur) ? 0 : blur;
  boxshadow.spread = isNaN(spread) ? 0 : spread;
  boxshadow.color = rgba2hexAdvanced(colors[0]);

  // Update UI with safe values
  $id('in_bxsh_x').value = boxshadow.x;
  $id('in_bxsh_y').value = boxshadow.y;
  $id('in_bxsh_blur').value = boxshadow.blure;
  $id('in_bxsh_spread').value = boxshadow.spread;
  $id('in_bxsh_hex').value = boxshadow.color.color;
  $id('in_bxsdc').style.backgroundColor = boxshadow.color.color;
  $id('in_bxsh_opac').value = boxshadow.color.opacityPCT;
}

function opacityPCTToHex(opacityPCT) {
  let val = parseFloat(opacityPCT / 100);
  return Math.floor(val * 255).toString(16);
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

function initColorPicker() {
  //color picker
  // Get the color picker trigger element
  const colorPickerTrigger = document.getElementById("color-picker-trigger");

  // Create a color picker popup
  const colorPickerPopup = document.createElement("div");
  colorPickerPopup.classList.add("color-picker-popup");

  // Create an input element for the color value
  const colorInput = document.createElement("input");
  colorInput.type = "color";
  colorInput.addEventListener("change", () => {
    //console.log(`Selected color: ${colorInput.value}`);
  });

  // Add the color input to the popup
  colorPickerPopup.appendChild(colorInput);

  // Add a click event listener to the trigger element
  colorPickerTrigger.addEventListener("click", () => {
    // Show the color picker popup
    colorPickerPopup.style.display = "block";
  });

  // Add the color picker popup to the body element
  document.appendChild(colorPickerPopup);
}

// --- Begin: Border and Border Radius Arrow Key & Validation Logic ---
function setupArrowKeyValidation(input, onChange, allowNegative = false) {
  let lastValidValue = input.value;

  // Arrow key support
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      let val = parseInt(input.value) || 0;
      const direction = e.key === 'ArrowUp' ? 1 : -1;
      val = allowNegative ? val + direction : Math.max(0, val + direction);
      input.value = val;
      lastValidValue = val;
      onChange({ target: input });
    }
  });

  // Input validation
  input.addEventListener('input', function (e) {
    const val = input.value.trim();
    if (allowNegative ? /^-?\d+$/.test(val) : /^\d+$/.test(val)) {
      lastValidValue = val;
      onChange({ target: input });
    }
  });
}
// --- End: Border and Border Radius Arrow Key & Validation Logic ---

// --- Begin: Opacity Arrow Key & Validation Logic ---
function setupOpacityArrowKeyValidation(input, onChange) {
  let lastValidValue = input.value;

  // Arrow key support
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      let val = parseInt(input.value) || 0;
      const direction = e.key === 'ArrowUp' ? 1 : -1;
      val = Math.max(0, Math.min(100, val + direction));
      input.value = val;
      lastValidValue = val;
      onChange({ target: input });
    }
  });

  // Input validation - only apply defaults when user manually types
  input.addEventListener('input', function (e) {
    let val = input.value.replace(/[^\d]/g, '');
    // Only default to 100 if the user actually cleared the input (not programmatically)
    if (val === "" && input.value === "") {
      val = 100;
      input.value = 100;
    } else if (val !== "") {
      val = Math.max(0, Math.min(100, parseInt(val)));
      input.value = val;
    }
    lastValidValue = val;
    onChange({ target: input });
  });
}
// --- End: Opacity Arrow Key & Validation Logic ---

// At the end of initProperties, after setupAllOpacityInputsScrollValidation(), add robust event listeners for border opacity:
function setupBorderOpacityInputEvents() {
  const borderOpacityInput = $id('in_border_color_opac');
  if (!borderOpacityInput) return;
  // Remove any existing listeners to avoid duplicates
  borderOpacityInput.oninput = null;
  borderOpacityInput.onwheel = null;
  borderOpacityInput.onkeydown = null;
  borderOpacityInput.onblur = null;
  // Attach all relevant events
  ['input', 'wheel', 'keydown', 'blur'].forEach(eventType => {
    borderOpacityInput.addEventListener(eventType, borderColorOpacityChange);
  });
}
// Call this at the end of initProperties
// setupBorderOpacityInputEvents();

function borderColorOpacityChange(e) {
  let opacityValue = parseInt(e.target.value, 10);
  if (isNaN(opacityValue)) opacityValue = 100;
  opacityValue = Math.max(0, Math.min(100, opacityValue));
  const cssOpacity = opacityValue / 100;
  const colorHEX = $id("in_border_color_hex").value;
  // Support both 6-character hex (without #) and 7-character hex (with #)
  if ((colorHEX.length === 7 && colorHEX.startsWith('#')) || (colorHEX.length === 6 && /^[0-9A-Fa-f]{6}$/.test(colorHEX))) {
    combineBorderProperties();
  }
  // Update the changes panel
  if (typeof window.generateCssChangesCounter === 'function') {
    window.generateCssChangesCounter();
  }
}

// Attach for letter-spacing input (allow negative)
function setupLetterSpacingArrowKeyValidation() {
  const letterSpacingInput = $id('in_letter_spacing');
  if (letterSpacingInput) {
    setupArrowKeyValidation(letterSpacingInput, letterSpacingChange, true);
  }
}



function setupAbsolutePositionActionIcons() {
  const actions = [
    { id: 'pos_tl', css: { top: '0', left: '0', right: 'auto', bottom: 'auto' } },
    { id: 'pos_tr', css: { top: '0', right: '0', left: 'auto', bottom: 'auto' } },
    { id: 'pos_bl', css: { bottom: '0', left: '0', top: 'auto', right: 'auto' } },
    { id: 'pos_br', css: { bottom: '0', right: '0', top: 'auto', left: 'auto' } },
    { id: 'pos_t', css: { top: '0', left: 'auto', right: 'auto', bottom: 'auto' } },
    { id: 'pos_b', css: { bottom: '0', left: 'auto', right: 'auto', top: 'auto' } },
    { id: 'pos_l', css: { left: '0', top: 'auto', right: 'auto', bottom: 'auto' } },
    { id: 'pos_r', css: { right: '0', top: 'auto', left: 'auto', bottom: 'auto' } },
    { id: 'pos_center', css: { top: '50%', left: '50%', right: 'auto', bottom: 'auto', transform: 'translate(-50%, -50%)' } }
  ];

  actions.forEach(action => {
    const el = $id(action.id);
    if (el) {
      el.addEventListener('click', function () {
        if (!target) return;

        // Clear active state from all position buttons
        actions.forEach(btnAction => {
          const btn = $id(btnAction.id);
          if (btn) {
            btn.classList.remove('action_icon_radio_active');
            const svg = btn.querySelector('svg');
            if (svg) svg.classList.remove('icon-fill_active');
          }
        });

        // Set active state for clicked button
        el.classList.add('action_icon_radio_active');
        const svg = el.querySelector('svg');
        if (svg) svg.classList.add('icon-fill_active');

        // Set the top/left/right/bottom/transform values
        Object.entries(action.css).forEach(([prop, value]) => {
          generateInspectaCss(prop, value);
        });
        // Update the manual inputs to reflect the new values
        if ('top' in action.css) $id('in_pos_mt').value = action.css.top;
        if ('bottom' in action.css) $id('in_pos_mb').value = action.css.bottom;
        if ('right' in action.css) $id('in_pos_mr').value = action.css.right;
        if ('left' in action.css) $id('in_pos_ml').value = action.css.left;
      });
    }
  });
}

function getZIndexValue(element) {
  if (!element) return "auto";
  const inline = element.style.zIndex;
  if (inline !== "" && inline !== undefined) return inline;
  const computed = window.getComputedStyle(element).zIndex;
  return computed === "auto" ? "auto" : computed;
}

function isValidZIndex(value) {
  return value === "auto" || (!isNaN(Number(value)) && value !== "");
}

function handleZIndexInput(e) {
  if (!target) return;
  const inputEl = e.target;
  let value = inputEl.value.trim();
  const selector = window.generateElSelector
    ? window.generateElSelector(target)
    : (typeof generateElSelector === 'function' ? generateElSelector(target) : null);
  if (!selector) return;

  // On input: allow any value, but if valid, save as last valid
  if (e.type === 'input') {
    if (isValidZIndex(value)) {
      generateInspectaCss("z-index", value, true, false, selector);
      lastValidZIndexMap.set(target, value);
    } else {
      // Allow typing, do not revert
      generateInspectaCss("z-index", value, true, false, selector);
    }
    if (typeof generateCssChangesCounter === 'function') generateCssChangesCounter();
    if (typeof generateInspectaFullCss === 'function') generateInspectaFullCss();
    return;
  }

  // On blur: validate and revert if needed
  if (e.type === 'blur') {
    if (isValidZIndex(value)) {
      lastValidZIndexMap.set(target, value);
      generateInspectaCss("z-index", value, true, false, selector);
    } else if (value === "") {
      inputEl.value = "auto";
      lastValidZIndexMap.set(target, "auto");
      generateInspectaCss("z-index", "auto", true, false, selector);
    } else {
      let lastValid = lastValidZIndexMap.get(target);
      if (!lastValid) lastValid = "auto";
      inputEl.value = lastValid;
      generateInspectaCss("z-index", lastValid, true, false, selector);
    }
    if (typeof generateCssChangesCounter === 'function') generateCssChangesCounter();
    if (typeof generateInspectaFullCss === 'function') generateInspectaFullCss();
    $id("in_z_index").value = getZIndexValue(target);
  }
}

// Remove any number-only restrictions from the input
if ($id("in_z_index")) {
  // Remove any existing event listeners
  const zIndexInput = $id("in_z_index");
  const newZIndexInput = zIndexInput.cloneNode(true);
  zIndexInput.parentNode.replaceChild(newZIndexInput, zIndexInput);

  // Add event listeners to the new input
  ["input", "change", "blur"].forEach(evt => {
    newZIndexInput.addEventListener(evt, handleZIndexInput);
  });
}

function setupAbsolutePositionManualInputs() {
  const map = [
    { id: 'in_pos_mt', prop: 'top', unitHintId: 'topUnitHint' },
    { id: 'in_pos_mb', prop: 'bottom', unitHintId: 'bottomUnitHint' },
    { id: 'in_pos_mr', prop: 'right', unitHintId: 'rightUnitHint' },
    { id: 'in_pos_ml', prop: 'left', unitHintId: 'leftUnitHint' }
  ];
  map.forEach(({ id, prop, unitHintId }) => {
    const input = $id(id);
    if (input) {
      // Add unit hint span
      let unitHint = input.parentElement.querySelector(`#${unitHintId}`);
      if (!unitHint) {
        unitHint = document.createElement('span');
        unitHint.id = unitHintId;
        unitHint.className = 'unit-hint';
        unitHint.textContent = 'px';
        // Insert unit hint as sibling after the input
        input.parentNode.insertBefore(unitHint, input.nextSibling);
      }
      // Hide unit hint by default for position inputs
      unitHint.style.display = 'none';
      // Center align by default
      input.style.textAlign = 'center';
      // Set padding to 2 for position inputs only
      input.style.padding = '2';
      // Use shared setupUnitInputWidget
      if (!input.parentElement.contains(unitHint)) {
        input.parentNode.insertBefore(unitHint, input.nextSibling);
      }
      if (typeof setupUnitInputWidget === 'function') {
        setupUnitInputWidget({
          input,
          unitHint,
          property: prop,
          getTarget: () => target,
          generateCss: (property, value) => generateInspectaCss(property, value),
          allowedUnits: ['px', 'em', 'rem', '%', 'vw', 'vh', 'auto']
        });
      }
      // Show unit hint on hover, hide on mouse leave (for position inputs only)
      const container = input.parentElement;
      container.addEventListener('mouseenter', () => {
        unitHint.style.display = '';
        input.style.textAlign = 'left';
      });
      container.addEventListener('mouseleave', () => {
        unitHint.style.display = 'none';
        input.style.textAlign = 'center';
      });
      // Also trigger input hover when hovering unit-hint
      unitHint.addEventListener('mouseenter', () => {
        input.classList.add('hover');
      });
      unitHint.addEventListener('mouseleave', () => {
        input.classList.remove('hover');
      });
    }
  });
}

// ... existing code ...

function setupFrameMarginPaddingUnitInputs() {
  const map = [
    { id: 'in_mt', prop: 'marginTop', unitHintId: 'marginTopUnitHint' },
    { id: 'in_mr', prop: 'marginRight', unitHintId: 'marginRightUnitHint' },
    { id: 'in_mb', prop: 'marginBottom', unitHintId: 'marginBottomUnitHint' },
    { id: 'in_ml', prop: 'marginLeft', unitHintId: 'marginLeftUnitHint' },
    { id: 'in_pt', prop: 'paddingTop', unitHintId: 'paddingTopUnitHint' },
    { id: 'in_pr', prop: 'paddingRight', unitHintId: 'paddingRightUnitHint' },
    { id: 'in_pb', prop: 'paddingBottom', unitHintId: 'paddingBottomUnitHint' },
    { id: 'in_pl', prop: 'paddingLeft', unitHintId: 'paddingLeftUnitHint' }
  ];
  map.forEach(({ id, prop, unitHintId }) => {
    const input = $id(id);
    if (input) {
      // Add .unit-input class if not present
      if (!input.classList.contains('unit-input')) {
        input.classList.add('unit-input');
      }
      // Add unit hint span if not present
      let unitHint = input.parentElement.querySelector(`#${unitHintId}`);
      if (!unitHint) {
        unitHint = document.createElement('span');
        unitHint.id = unitHintId;
        unitHint.className = 'unit-hint';
        unitHint.textContent = 'px';
        // Insert unit hint as sibling after the input
        input.parentNode.insertBefore(unitHint, input.nextSibling);
      }
      // Hide unit hint by default
      unitHint.style.display = 'none';
      // Center align by default, padding 2px
      input.style.textAlign = 'center';
      input.style.padding = '2px';
      // Use shared setupUnitInputWidget
      if (typeof setupUnitInputWidget === 'function') {
        setupUnitInputWidget({
          input,
          unitHint,
          property: prop,
          getTarget: () => target,
          generateCss: (property, value) => generateInspectaCss(property, value),
          allowedUnits: ['px', 'em', 'rem', '%', 'vw', 'vh', 'auto']
        });
      }
      // Show unit hint on hover, hide on mouse leave
      const wrapper = input.parentElement;
      wrapper.addEventListener('mouseenter', () => {
        unitHint.style.display = '';
        input.style.textAlign = 'left';
      });
      wrapper.addEventListener('mouseleave', () => {
        unitHint.style.display = 'none';
        input.style.textAlign = 'center';
      });
      // Also trigger input hover when hovering unit-hint
      unitHint.addEventListener('mouseenter', () => {
        input.classList.add('hover');
      });
      unitHint.addEventListener('mouseleave', () => {
        input.classList.remove('hover');
      });
    }
  });
}
// ... existing code ...

function setupFrameMarginPaddingManualInputs() {
  const map = [
    { id: 'in_mt', prop: 'marginTop', unitHintId: 'marginTopUnitHint' },
    { id: 'in_mr', prop: 'marginRight', unitHintId: 'marginRightUnitHint' },
    { id: 'in_mb', prop: 'marginBottom', unitHintId: 'marginBottomUnitHint' },
    { id: 'in_ml', prop: 'marginLeft', unitHintId: 'marginLeftUnitHint' },
    { id: 'in_pt', prop: 'paddingTop', unitHintId: 'paddingTopUnitHint' },
    { id: 'in_pr', prop: 'paddingRight', unitHintId: 'paddingRightUnitHint' },
    { id: 'in_pb', prop: 'paddingBottom', unitHintId: 'paddingBottomUnitHint' },
    { id: 'in_pl', prop: 'paddingLeft', unitHintId: 'paddingLeftUnitHint' }
  ];
  map.forEach(({ id, prop, unitHintId }) => {
    const input = $id(id);
    if (input) {
      // Add .unit-input class if not present
      if (!input.classList.contains('unit-input')) {
        input.classList.add('unit-input');
      }
      // Add unit hint span if not present
      let unitHint = input.parentElement.querySelector(`#${unitHintId}`);
      if (!unitHint) {
        unitHint = document.createElement('span');
        unitHint.id = unitHintId;
        unitHint.className = 'unit-hint';
        unitHint.textContent = 'px';
        // Insert unit hint as sibling after the input
        input.parentNode.insertBefore(unitHint, input.nextSibling);
      }
      // Hide unit hint by default
      unitHint.style.display = 'none';
      // Center align by default, padding 2px
      input.style.textAlign = 'center';
      input.style.padding = '2px';
      // Use shared setupUnitInputWidget
      if (typeof setupUnitInputWidget === 'function') {
        setupUnitInputWidget({
          input,
          unitHint,
          property: prop,
          getTarget: () => target,
          generateCss: (property, value) => generateInspectaCss(property, value),
          allowedUnits: ['px', 'em', 'rem', '%', 'vw', 'vh', 'auto']
        });
      }
      // Show unit hint on hover, hide on mouse leave
      const wrapper = input.parentElement;
      wrapper.addEventListener('mouseenter', () => {
        unitHint.style.display = '';
        input.style.textAlign = 'left';
      });
      wrapper.addEventListener('mouseleave', () => {
        unitHint.style.display = 'none';
        input.style.textAlign = 'center';
      });
      // Also trigger input hover when hovering unit-hint
      unitHint.addEventListener('mouseenter', () => {
        input.classList.add('hover');
      });
      unitHint.addEventListener('mouseleave', () => {
        input.classList.remove('hover');
      });
    }
  });
}

function showImagePanelOnly(imageElement) {
  if (!window.inspectaIsActive) return;

  // Delegate to ImageEditor if available
  if (window.imageEditor && typeof window.imageEditor.showImagePanel === 'function') {
    window.imageEditor.showImagePanel(imageElement);
    return;
  }

  const imgPanel = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector('#selected_img') : document.getElementById('selected_img');
  const svgPanel = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector('#selected_svg') : document.getElementById('selected_svg');

  // Hide both panels first
  if (imgPanel) imgPanel.style.display = 'none';
  if (svgPanel) svgPanel.style.display = 'none';

  if (imageElement && imageElement.nodeName && imageElement.nodeName.toLowerCase() === 'svg') {
    window.target = imageElement; // Ensure window.target is set to the selected SVG
    if (svgPanel) svgPanel.style.display = 'block';
    // Show pnl_svg_values as flex
    const pnlSvgValues = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector('#pnl_svg_values') : document.querySelector('#pnl_svg_values');
    if (pnlSvgValues) pnlSvgValues.style.display = 'block';
    // ... SVG panel logic ...
    const svgPreview = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector('#svg_preview') : document.querySelector('#svg_preview');
    const svgInfoValue = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector('.svg_info_item_value') : document.querySelector('.svg_info_item_value');
    const svgCodeContainer = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector('.svg_code_container') : document.querySelector('.svg_code_container');
    const svgCodeTextarea = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector('#svg_code') : document.querySelector('#svg_code');

    if (svgPreview) {
      svgPreview.innerHTML = '';
      svgPreview.appendChild(imageElement.cloneNode(true));
    }
    if (svgInfoValue) {
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(imageElement);
      const size = `${Math.round(new Blob([svgString]).size / 1024)}KB`;
      svgInfoValue.textContent = `svg+xml, ${size}`;
    }
    if (svgCodeContainer && svgCodeTextarea) {
      svgCodeContainer.style.display = 'block';
      svgCodeTextarea.value = imageElement.outerHTML;
    }
  } else if (
    imageElement &&
    imageElement.nodeName &&
    (imageElement.nodeName.toLowerCase() === 'img' ||
      imageElement.nodeName.toLowerCase() === 'image')
  ) {
    window.target = imageElement; // Ensure window.target is set to the selected IMG
    if (imgPanel) {
      imgPanel.style.display = 'block';
    }
    // Show pnl_img_values as flex
    const pnlImgValues = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector('#pnl_img_values') : document.querySelector('#pnl_img_values');
    if (pnlImgValues) pnlImgValues.style.display = 'block';
    // ... IMG panel logic ...
    const imgPreview = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector('#img_preview') : document.querySelector('#img_preview');
    const typeValue = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector('.img_info_item_value') : document.querySelector('.img_info_item_value');
    const downloadBtn = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector('#in_img_download') : document.querySelector('#in_img_download');

    // Set object-fit - respect webpage's existing value, only set default if none exists
    const objectFitSelect = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector('#in_object_fit_select') : document.querySelector('#in_object_fit_select');
    let objectFit = '';
    if (imageElement.style && imageElement.style.objectFit) {
      objectFit = imageElement.style.objectFit;
    } else {
      const computed = window.getComputedStyle(imageElement);
      objectFit = computed.objectFit;
    }
    if (!objectFit || objectFit === 'initial' || objectFit === 'unset') {
      if (objectFitSelect) objectFitSelect.value = 'auto';
    } else {
      if (objectFitSelect) objectFitSelect.value = objectFit;
    }

    if (imgPreview) {
      imgPreview.src = imageElement.src;
      imgPreview.alt = imageElement.alt || '';
    }
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
    if (downloadBtn) {
      downloadBtn.onclick = function () {
        fetch(imgPreview.src)
          .then(res => res.blob())
          .then(blob => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            let filename = (imgPreview.src.split('/').pop() || 'image.png').split('?')[0];
            if (!filename.includes('.')) filename += '.png';
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          });
      };
    }
  }
  // else: both panels remain hidden
}

function showImageInPanel(imageElement) {
  if (!window.inspectaIsActive) return;

  // Delegate to ImageEditor if available
  if (window.imageEditor && typeof window.imageEditor.showImagePanel === 'function') {
    window.imageEditor.showImagePanel(imageElement);
    return;
  }

  const imgPanel = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector('#selected_img') : document.getElementById('selected_img');
  const svgPanel = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector('#selected_svg') : document.getElementById('selected_svg');

  // Hide both panels first
  if (imgPanel) imgPanel.style.display = 'none';
  if (svgPanel) svgPanel.style.display = 'none';

  if (imageElement && imageElement.nodeName && imageElement.nodeName.toLowerCase() === 'svg') {
    window.target = imageElement; // Ensure window.target is set to the selected SVG
    if (svgPanel) svgPanel.style.display = 'block';
    // Show pnl_svg_values as flex
    const pnlSvgValues = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector('#pnl_svg_values') : document.querySelector('#pnl_svg_values');
    if (pnlSvgValues) pnlSvgValues.style.display = 'block';
    // ... SVG panel logic ...
    const svgPreview = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector('#svg_preview') : document.querySelector('#svg_preview');
    const svgInfoValue = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector('.svg_info_item_value') : document.querySelector('.svg_info_item_value');
    const svgCodeContainer = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector('.svg_code_container') : document.querySelector('.svg_code_container');
    const svgCodeTextarea = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector('#svg_code') : document.querySelector('#svg_code');

    if (svgPreview) {
      svgPreview.innerHTML = '';
      svgPreview.appendChild(imageElement.cloneNode(true));
    }
    if (svgInfoValue) {
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(imageElement);
      const size = `${Math.round(new Blob([svgString]).size / 1024)}KB`;
      svgInfoValue.textContent = `svg+xml, ${size}`;
    }
    if (svgCodeContainer && svgCodeTextarea) {
      svgCodeContainer.style.display = 'block';
      svgCodeTextarea.value = imageElement.outerHTML;
    }
  } else if (
    imageElement &&
    imageElement.nodeName &&
    (imageElement.nodeName.toLowerCase() === 'img' ||
      imageElement.nodeName.toLowerCase() === 'image')
  ) {
    window.target = imageElement; // Ensure window.target is set to the selected IMG
    if (imgPanel) {
      imgPanel.style.display = 'block';
    }
    // Show pnl_img_values as flex
    const pnlImgValues = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector('#pnl_img_values') : document.querySelector('#pnl_img_values');
    if (pnlImgValues) pnlImgValues.style.display = 'block';
    // ... IMG panel logic ...
    const imgPreview = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector('#img_preview') : document.querySelector('#img_preview');
    const typeValue = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector('.img_info_item_value') : document.querySelector('.img_info_item_value');
    const downloadBtn = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector('#in_img_download') : document.querySelector('#in_img_download');

    // Set object-fit - respect webpage's existing value, only set default if none exists
    const objectFitSelect = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector('#in_object_fit_select') : document.querySelector('#in_object_fit_select');
    let objectFit = '';
    if (imageElement.style && imageElement.style.objectFit) {
      objectFit = imageElement.style.objectFit;
    } else {
      const computed = window.getComputedStyle(imageElement);
      objectFit = computed.objectFit;
    }
    if (!objectFit || objectFit === 'initial' || objectFit === 'unset') {
      if (objectFitSelect) objectFitSelect.value = 'auto';
    } else {
      if (objectFitSelect) objectFitSelect.value = objectFit;
    }

    if (imgPreview) {
      imgPreview.src = imageElement.src;
      imgPreview.alt = imageElement.alt || '';
      imgPreview.onerror = function () {
        imgPreview.onerror = null;
        imgPreview.src = 'data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"150\" height=\"150\"><rect width=\"100%25\" height=\"100%25\" fill=\"#eee\"/><text x=\"50%25\" y=\"50%25\" dominant-baseline=\"middle\" text-anchor=\"middle\" fill=\"#888\" font-size=\"16\">Not found</text></svg>';
      };
    }
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
    if (downloadBtn) {
      downloadBtn.onclick = function () {
        fetch(imgPreview.src)
          .then(res => res.blob())
          .then(blob => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            let filename = (imgPreview.src.split('/').pop() || 'image.png').split('?')[0];
            if (!filename.includes('.')) filename += '.png';
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          });
      };
    }
  }
  // else: both panels remain hidden
}

function updatePanelContent(node) {
  if (!window.inspectaIsActive) return;
  const imgPanel = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector('#selected_img') : document.querySelector('#selected_img');
  if (imgPanel) imgPanel.style.display = 'none';
  if (node && node.nodeName) {
    // Exclude overlay images from being processed
    if (node.id === 'overlayImage' || node.classList.contains('image-overlay')) {
      return; // Don't process overlay images
    }

    // For images, only show the panel without restoring from storage
    // This prevents overwriting newly uploaded/pasted images
    if (node.nodeName.toLowerCase() === 'img' || node.nodeName.toLowerCase() === 'image') {
      showImagePanelOnly(node);
    } else {
      showImageInPanel(node);
    }
    // Removed: if (imgPanel) imgPanel.style.display = 'block';
  } else if (imgPanel) {
    imgPanel.style.display = 'none';
  }
  // ... existing code for other node types ...
}

document.addEventListener('click', function (e) {
  if (!window.inspectaIsActive) return;
  // Ignore clicks on the download button
  if (e.target.closest && e.target.closest('#in_img_download')) return;

  // Only show the image panel if an image is clicked, but exclude overlay images
  if (e.target && e.target.nodeName && e.target.nodeName.toLowerCase() === 'img') {
    // Exclude overlay images from being selected
    if (e.target.id === 'overlayImage' || e.target.classList.contains('image-overlay')) {
      return; // Don't show image panel for overlay images
    }
    showImageInPanel(e.target);
  } else {
    // Check if we clicked on a container that has an img child
    const imgChild = e.target.querySelector('img');
    if (imgChild) {
      showImageInPanel(imgChild);
    }
  }
  // Do NOT close the panel on other clicks!
}, true);

document.addEventListener('click', function (e) {
  if (!window.inspectaIsActive) return;
  // Only show the image panel if an image is clicked, but exclude overlay images
  if (e.target && e.target.nodeName && e.target.nodeName.toLowerCase() === 'img') {
    // Exclude overlay images from being selected
    if (e.target.id === 'overlayImage' || e.target.classList.contains('image-overlay')) {
      return; // Don't show image panel for overlay images
    }
    updatePanelContent(e.target);
  }
  // Do NOT close the panel on other clicks!
}, true);

// In initProperties, after setupAbsolutePositionManualInputs():
// setupFrameMarginPaddingManualInputs();

// pasteImageOrSVGFromClipboard function removed - now handled by ImageEditor class

// Add event listener for the clipboard CSS button with debug logging
if (typeof applyClipboardCSS === 'function') {
  document.addEventListener('DOMContentLoaded', function () {
    const btn = document.getElementById('btn_apply_clipboard_css');
    if (btn) {
      btn.addEventListener('click', async function () {
        //console.log('Clipboard CSS button clicked');
        //console.log('applyClipboardCSS:', typeof applyClipboardCSS);
        //console.log('window.inspectaCurrentlySelected:', window.inspectaCurrentlySelected);
        if (!window.inspectaCurrentlySelected) {
          if (typeof showToast === 'function') {
            showToast('No element selected.', 2000);
          }
          return;
        }
        try {
          const result = await applyClipboardCSS(window.inspectaCurrentlySelected);
          console.log('applyClipboardCSS result:', result);
          // Update the properties panel values to reflect new styles
          if (typeof populateCSS === 'function') {
            populateCSS();
          }
          if (result && (Object.keys(result.applied).length > 0 || Object.keys(result.reset).length > 0)) {
            if (typeof showToast === 'function') {
              showToast('Clipboard CSS applied!', 2000);
            } else {
              alert('Clipboard CSS applied!');
            }
          } else {
            if (typeof showToast === 'function') {
              showToast('No changes applied.', 2000);
            } else {
              alert('No changes applied.');
            }
          }
        } catch (err) {
          console.error('Failed to apply clipboard CSS:', err);
          if (typeof showToast === 'function') {
            showToast('Failed to apply clipboard CSS.', 2000);
          } else {
            alert('Failed to apply clipboard CSS.');
          }
        }
      });
    }
  });
}

function selectElementForInspecta(element) {
  inspectaCurrentlySelected = element;
  showSelectedOverlay(element);
  startSelectedOverlayLoop(element);
  hideHoverOverlay(); // Always hide hover overlay when selecting
}

// ... existing code ...
// SVG upload button
const svgUploadBtn = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector('#in_svg_upload') : document.querySelector('#in_svg_upload');
let svgUploadInput = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector('#svg_upload_input') : document.querySelector('#svg_upload_input');

if (svgUploadBtn) {
  if (!svgUploadInput) {
    svgUploadInput = document.createElement('input');
    svgUploadInput.type = 'file';
    svgUploadInput.accept = '.svg';
    svgUploadInput.style.display = 'none';
    svgUploadInput.id = 'svg_upload_input';
    if (typeof shadow !== 'undefined' && shadow) {
      shadow.appendChild(svgUploadInput);
    } else {
      document.body.appendChild(svgUploadInput);
    }
  }

  svgUploadBtn.addEventListener('click', function () {
    svgUploadInput.click();
  });

  svgUploadInput.addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file && file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = function (e) {
        const svgContent = e.target.result;
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
        const parserError = svgDoc.querySelector('parsererror');
        if (parserError) {
          showToast('Invalid SVG file!', 2000);
          return;
        }
        const newSvg = svgDoc.documentElement;
        if (newSvg.namespaceURI !== 'http://www.w3.org/2000/svg') {
          showToast('Invalid SVG file!', 2000);
          return;
        }
        // Replace the old SVG with the new one
        const oldSvg = document.querySelector('svg');
        if (oldSvg) {
          oldSvg.parentNode.replaceChild(newSvg, oldSvg);
          // Update the text area with the new SVG code
          const svgCodeTextarea = (typeof shadow !== 'undefined' && shadow) ? shadow.querySelector('#svg_code') : document.querySelector('#svg_code');
          if (svgCodeTextarea) {
            svgCodeTextarea.value = newSvg.outerHTML;
          }
          showToast('SVG uploaded and displayed!', 2000);
        } else {
          showToast('No SVG element found to replace!', 2000);
        }
      };
      reader.readAsText(file);
    } else {
      showToast('Please upload a valid SVG file!', 2000);
    }
  });
}
// ... existing code ...

// Image panel initialization removed - now handled by ImageEditor class

// Object-fit select handler removed - now handled by ImageEditor class

// ... existing code ...
// Remove toast for 'No element selected.' and disable Paste CSS button if no element is selected
const btnPasteCss = document.getElementById('btn_apply_clipboard_css');
function updatePasteCssButtonState() {
  if (btnPasteCss) {
    btnPasteCss.disabled = !window.inspectaCurrentlySelected;
  }
}
// Call this on DOMContentLoaded and whenever selection changes
if (btnPasteCss) {
  updatePasteCssButtonState();
}
// Listen for selection changes (you may need to trigger this from your selection logic)
window.addEventListener('inspectaSelectionChanged', updatePasteCssButtonState);
// ... existing code ...

// --- Begin: Box Shadow Scroll & Validation Logic ---
function setupBoxShadowArrowKeyValidation(input, onChange, allowNegative = false) {
  let lastValidValue = input.value;

  // Mouse wheel support (using shared handler)
  // const wheelHandler = createFocusAwareWheelHandler(input, onChange, allowNegative);
  // input.addEventListener('wheel', wheelHandler, { passive: false });

  // Arrow key support
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      let val = parseInt(input.value) || 0;
      const direction = e.key === 'ArrowUp' ? 1 : -1;
      val = allowNegative ? val + direction : Math.max(0, val + direction);
      input.value = val;
      lastValidValue = val;
      onChange({ target: input });
    }
  });

  // Input validation
  input.addEventListener('input', function (e) {
    const val = input.value.trim();
    if (allowNegative ? /^-?\d+$/.test(val) : /^\d+$/.test(val)) {
      lastValidValue = val;
      onChange({ target: input });
    }
  });

  // Restore last valid value on blur if invalid
  // input.addEventListener('blur', function () {
  //   if (!(allowNegative ? /^-?\d+$/.test(input.value.trim()) : /^\d+$/.test(input.value.trim()))) {
  //     input.value = lastValidValue;
  //     onChange({ target: input });
  //   }
  // });
}

function setupAllBoxShadowArrowKeyValidation() {
  const boxShadowInputs = [
    { input: $id('in_bxsh_x'), onChange: boxShadowChangeX, allowNegative: true },
    { input: $id('in_bxsh_y'), onChange: boxShadowChangeY, allowNegative: true },
    { input: $id('in_bxsh_blur'), onChange: boxShadowChangeBlur, allowNegative: false },
    { input: $id('in_bxsh_spread'), onChange: boxShadowChangeSpread, allowNegative: true },
    { input: $id('in_bxsh_opac'), onChange: boxShadowChangeOpacity, allowNegative: false }
  ];

  // Attach for box shadow inputs
  boxShadowInputs.forEach(({ input, onChange, allowNegative }) => {
    if (input) setupBoxShadowArrowKeyValidation(input, onChange, allowNegative);
  });
}
// --- End: Box Shadow Scroll & Validation Logic ---

// --- Begin: Main Element Opacity Scroll & Validation Logic ---
function setupMainElementOpacity() {
  const mainOpacityInput = $id('in_el_opac');
  if (mainOpacityInput) {
    // Remove any existing listeners to avoid conflicts
    mainOpacityInput.onkeydown = null;
    // Arrow key support
    mainOpacityInput.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        let val = parseInt(mainOpacityInput.value) || 100;
        const direction = e.key === 'ArrowUp' ? 1 : -1;
        val = Math.max(0, Math.min(100, val + direction));
        mainOpacityInput.value = val;
        opacityChange({ target: mainOpacityInput });
      }
    });
  }
}
// --- End: Main Element Opacity Scroll & Validation Logic ---

// --- Begin: Z-Index Scroll & Validation Logic ---
function setupZIndexArrowKeyValidation() {
  const zIndexInput = $id('in_z_index');
  if (zIndexInput) {
    zIndexInput.onkeydown = null;
    zIndexInput.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        let val = parseInt(zIndexInput.value) || 0;
        const direction = e.key === 'ArrowUp' ? 1 : -1;
        val = val + direction;
        zIndexInput.value = val;
        handleZIndexInput({ target: zIndexInput, type: 'input' });
      }
    });
  }
}
// --- End: Z-Index Scroll & Validation Logic ---

// --- Begin: Gap Scroll & Validation Logic ---
function setupGapArrowKeyValidation() {
  const gapInput = $id('in_gap');
  if (gapInput) {
    gapInput.onkeydown = null;
    gapInput.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        let val = parseInt(gapInput.value) || 0;
        const direction = e.key === 'ArrowUp' ? 1 : -1;
        val = Math.max(0, val + direction);
        gapInput.value = val;
        gapChange({ target: gapInput });
      }
    });
  }
}
// --- End: Gap Scroll & Validation Logic ---

// --- End: Border and Border Radius Scroll & Validation Logic ---

function setupBorderAndRadiusArrowKeyValidation() {
  const borderInputs = [
    $id('in_bc'), $id('in_bl'), $id('in_bt'), $id('in_br'), $id('in_bb')
  ];
  const borderRadiusInputs = [
    $id('in_radius'), $id('in_radius_tl'), $id('in_radius_tr'), $id('in_radius_bl'), $id('in_radius_br')
  ];
  // Attach for border
  borderInputs.forEach(input => {
    if (input) {
      // Use the correct handler for each input
      switch (input.id) {
        case 'in_bc': setupArrowKeyValidation(input, borderWidthChange); break;
        case 'in_bl': setupArrowKeyValidation(input, borderLeftChange); break;
        case 'in_bt': setupArrowKeyValidation(input, borderToptChange); break;
        case 'in_br': setupArrowKeyValidation(input, borderRightChange); break;
        case 'in_bb': setupArrowKeyValidation(input, borderBottomChange); break;
      }
    }
  });
  // Attach for border radius
  borderRadiusInputs.forEach(input => {
    if (input) setupArrowKeyValidation(input, function (e) {
      // Use the correct handler for each input
      switch (input.id) {
        case 'in_radius': borderRadiusChange(e); break;
        case 'in_radius_tl': borderRadiusTopLeftChange(e); break;
        case 'in_radius_tr': borderRadiusTopRightChange(e); break;
        case 'in_radius_bl': borderRadiusBottomLeftChange(e); break;
        case 'in_radius_br': borderRadiusBottomRighChange(e); break;
      }
    });
  });
}

// --- Begin: Opacity Scroll & Validation Logic ---

function setupAllOpacityInputs() {
  const opacityInputs = [
    $id('in_bg_color_opac'),
    $id('in_font_color_opac'),
    $id('in_border_color_opac'),
    $id('in_bxsh_opac'),
    $id('in_el_opac')
  ];
  const opacityHandlers = [
    backgroundOpacityChange,
    fontColorOpacityChange,
    borderColorOpacityChange,
    boxShadowChangeOpacity,
    opacityChange
  ];
  opacityInputs.forEach((input, idx) => {
    if (input) setupOpacityArrowKeyValidation(input, opacityHandlers[idx]);
  });
}

// At the end of initProperties, after setupAllOpacityInputsScrollValidation(), add robust event listeners for border opacity:

