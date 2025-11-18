// Make querySelector simple
const $qs = (el) => {
  return document.querySelector(el)
}

// Get elemnet by id 
const $id = (el) => {
  return window.shadow ? window.shadow.getElementById(el) : null;
}

const removeNumb = (strng) => {
  return strng.replace(/[0-9.]/g, '');
}


const toNumb = (strng) => {
  const parsed = parseInt(strng);
  return isNaN(parsed) ? null : parsed;
};

const getPx = (val) => {
  let pxValue;
  // %
  if (val.includes('%')) {
    pxValue = parseInt(targetStyles.width) * (parseInt(val) / 100);
  } else if (val.includes('rem')) {
    const root = document.querySelector(':root');
    const rootFontSize = window.getComputedStyle(root).getPropertyValue('font-size');
    pxValue = parseInt(val) * parseInt(rootFontSize);
  } else {
    pxValue = parseInt(val);
  }
  return pxValue;
}

const rgba2hex = (orig, includeOpacity) => {
  if (!orig || orig === 'transparent' || orig === 'rgba(0, 0, 0, 0)') {
    return null;
  }

  // If it's already a hex color, return it
  if (orig.startsWith('#')) {
    return orig.toUpperCase();
  }

  let a,
    rgb = orig.replace(/\s/g, '').match(/^rgba?\((\d+),(\d+),(\d+),?([^,\s)]+)?/i);

  if (!rgb) {
    return null; // Return null for invalid colors
  }

  const alpha = (rgb && rgb[4] || "").trim();
  const hex = rgb ?
    (rgb[1] | 1 << 8).toString(16).slice(1) +
    (rgb[2] | 1 << 8).toString(16).slice(1) +
    (rgb[3] | 1 << 8).toString(16).slice(1) : null;

  if (!hex) {
    return null;
  }

  a = alpha !== "" ? alpha : 0o1;
  let newA = Math.round(a * 100) / 100;
  let newAlpha = Math.round(newA * 255);
  let hexAlpha = (newAlpha + 0x10000).toString(16).substr(-2).toUpperCase();
  let hexResult = '#' + hex + (includeOpacity !== false ? hexAlpha : '');
  return hexResult;
}
const rgba2hexAdvanced = (orig) => {

  // Handle null, undefined, or empty values
  if (!orig || orig === 'transparent' || orig === 'rgba(0, 0, 0, 0)') {
    return { color: '', opacity: '00', opacityPCT: 0 };
  }

  // If it's already a hex color, return it properly formatted
  if (isHexAColor(orig)) {
    // Check if it's an 8-digit hex color with alpha
    if (orig.length === 9) { // #RRGGBBAA format
      const colorPart = orig.substring(0, 7); // #RRGGBB
      const alphaPart = orig.substring(7, 9); // AA
      const opacityPCT = hexToAlpha(alphaPart);
      return { color: colorPart, opacity: alphaPart.toUpperCase(), opacityPCT: opacityPCT };
    } else if (orig.length === 7) { // #RRGGBB format
      // 6-digit hex color without alpha
      return { color: orig, opacity: 'FF', opacityPCT: 100 };
    } else if (orig.length === 4) { // #RGB format
      // 3-digit hex color without alpha
      return { color: orig, opacity: 'FF', opacityPCT: 100 };
    }
  }

  // If it's a hex color without # prefix, add it
  if (/^[0-9A-Fa-f]{6}$/.test(orig)) {
    return { color: '#' + orig, opacity: 'FF', opacityPCT: 100 };
  }

  // Handle RGB/RGBA format
  let a,
    rgb = orig.replace(/\s/g, '').match(/^rgba?\((\d+),(\d+),(\d+),?([^,\s)]+)?/i),
    alpha = (rgb && rgb[4] || "").trim();

  if (rgb) {
    let hex = (rgb[1] | 1 << 8).toString(16).slice(1) +
      (rgb[2] | 1 << 8).toString(16).slice(1) +
      (rgb[3] | 1 << 8).toString(16).slice(1);
    a = alpha !== "" ? alpha : 1;
    let newA = Math.round(a * 100) / 100;
    let newAlpha = Math.round(newA * 255);
    let hexAlpha = (newAlpha + 0x10000).toString(16).substr(-2).toUpperCase();
    const result = { color: '#' + hex, opacity: hexAlpha, opacityPCT: hexToAlpha(hexAlpha) };
    return result;
  }

  // If we can't parse it, return empty
  return { color: '', opacity: '00', opacityPCT: 0 };
}
const normalize = (val, max, min) => { return (val - min) / (max - min); };

const hexToAlpha = (alphaHexString) => {
  return Math.round(normalize(parseInt(alphaHexString, 16), 255, 0) * 100);
}

function isHexAColor(hex) {
  return /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)|(^#[0-9A-F]{8}$)/i.test(hex)
}
function getOpacityFromHexA(hex) {
  let alpha = hex.replace('#', '').substring(6);
  return hexToAlpha(alpha === '' ? 'FF' : alpha);
}

/**
 * Creates a reusable custom checkbox component
 * @param {Object} options - Configuration options
 * @param {boolean} options.checked - Initial checked state
 * @param {boolean} options.indeterminate - Initial indeterminate state
 * @param {string} options.id - Optional ID for the checkbox
 * @param {string} options.className - Optional additional CSS class
 * @param {Function} options.onChange - Optional change event handler
 * @param {Object} options.dataset - Optional data attributes
 * @returns {Object} - Object containing the label element and input element
 */
function createCustomCheckbox(options = {}) {
  const {
    checked = false,
    indeterminate = false,
    id = null,
    className = '',
    onChange = null,
    dataset = {}
  } = options;

  // Create the label container
  const label = document.createElement('label');
  label.className = `custom-checkbox ${className}`.trim();

  // Create the hidden input
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.indeterminate = indeterminate;

  if (id) {
    input.id = id;
  }

  // Add data attributes
  Object.entries(dataset).forEach(([key, value]) => {
    input.dataset[key] = value;
  });

  // Add change handler if provided
  if (onChange) {
    input.addEventListener('change', onChange);
  }

  // Create the visual checkbox box
  const checkboxBox = document.createElement('div');
  checkboxBox.className = 'custom-checkbox-box';
  if (indeterminate) {
    checkboxBox.classList.add('indeterminate');
  }

  // Assemble the checkbox
  label.appendChild(input);
  label.appendChild(checkboxBox);

  return {
    label,
    input,
    checkboxBox
  };
}

/**
 * Calculates the luminance of a color (RGB values)
 * @param {number} r - Red value (0-255)
 * @param {number} g - Green value (0-255)
 * @param {number} b - Blue value (0-255)
 * @returns {number} - Luminance value
 */
function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculates contrast ratio between two luminance values
 * @param {number} l1 - First luminance value
 * @param {number} l2 - Second luminance value
 * @returns {number} - Contrast ratio
 */
function getContrastRatio(l1, l2) {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Parses a color string (hex, rgb, rgba) to RGB values
 * @param {string} color - Color string
 * @returns {Object|null} - Object with r, g, b values or null if invalid
 */
function parseColor(color) {
  if (!color || color === 'transparent') {
    return null;
  }

  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return { r, g, b };
  }

  // Handle rgb/rgba colors (including transparent ones)
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (match) {
    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    const alpha = match[4] ? parseFloat(match[4]) : 1;

    // If alpha is 0 (transparent), treat it as white background
    if (alpha === 0) {
      return { r: 255, g: 255, b: 255 };
    }

    return { r, g, b };
  }

  return null;
}

/**
 * Determines if a color swatch needs a border based on contrast with background
 * @param {string} swatchColor - The color of the swatch (hex, rgb, rgba)
 * @param {string} backgroundColor - The background color (hex, rgb, rgba)
 * @param {number} threshold - Contrast ratio threshold (default: 3.0)
 * @returns {Object} - Object with border properties
 */
function getSwatchBorderStyle(swatchColor, backgroundColor = '#ffffff', threshold = 3.0) {
  const swatchRGB = parseColor(swatchColor);
  const bgRGB = parseColor(backgroundColor);

  if (!swatchRGB || !bgRGB) {
    // Fallback: return no border for invalid colors
    return {
      border: 'none',
      needsBorder: false
    };
  }

  const swatchLuminance = getLuminance(swatchRGB.r, swatchRGB.g, swatchRGB.b);
  const bgLuminance = getLuminance(bgRGB.r, bgRGB.g, bgRGB.b);

  const contrastRatio = getContrastRatio(swatchLuminance, bgLuminance);

  // If contrast is too low, add a border
  if (contrastRatio < threshold) {
    return {
      border: '1px solid var(--in-color-divider)',
      needsBorder: true,
      contrastRatio: contrastRatio
    };
  }

  return {
    border: 'none',
    needsBorder: false,
    contrastRatio: contrastRatio
  };
}

/**
 * Applies appropriate border styling to a color swatch element
 * @param {HTMLElement} element - The swatch element
 * @param {string} swatchColor - The color of the swatch
 * @param {string} backgroundColor - The background color (optional, defaults to white)
 * @param {number} threshold - Contrast ratio threshold (optional, defaults to 3.0)
 */
function applySwatchBorder(element, swatchColor, backgroundColor = '#ffffff', threshold = 3.0) {
  const borderStyle = getSwatchBorderStyle(swatchColor, backgroundColor, threshold);

  // Always set the border style explicitly
  if (borderStyle.needsBorder) {
    element.style.border = borderStyle.border;
  } else {
    // Explicitly set no border
    element.style.border = 'none';
  }

  return borderStyle;
}
