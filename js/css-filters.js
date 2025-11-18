(function () {
  // Utilities
  function buildFilterString(f) {
    const parts = [];
    if (f.blur) parts.push(`blur(${f.blur})`);
    if (f.brightness) parts.push(`brightness(${f.brightness})`);
    if (f.contrast) parts.push(`contrast(${f.contrast})`);
    if (f.saturate) parts.push(`saturate(${f.saturate})`);
    if (f.hueRotate) parts.push(`hue-rotate(${f.hueRotate})`);
    if (f.sepia) parts.push(`sepia(${f.sepia})`);
    if (f.grayscale) parts.push(`grayscale(${f.grayscale})`);
    if (f.invert) parts.push(`invert(${f.invert})`);
    return parts.join(' ');
  }

  function applyFiltersToSelector(selector, filters) {
    const els = document.querySelectorAll(selector || 'body');
    const filterStr = buildFilterString(filters || {});
    els.forEach(el => {
      el.style.setProperty('filter', filterStr || 'none', 'important');
    });
  }

  function setBlendMode(selector, mode) {
    const els = document.querySelectorAll(selector || 'body');
    els.forEach(el => {
      el.style.setProperty('mix-blend-mode', mode || 'normal', 'important');
    });
  }

  function clearFilters(selector) {
    const els = document.querySelectorAll(selector || 'body');
    els.forEach(el => {
      el.style.removeProperty('filter');
      el.style.removeProperty('mix-blend-mode');
    });
  }

  // Export for other modules / console
  window.InspectaCSSFilters = {
    applyFiltersToSelector,
    setBlendMode,
    clearFilters
  };

  // UI: create pnl_item inside pnl_properties
  function createPnlItem() {
    const container = document.querySelector('.pnl_properties') || document.querySelector('#pnl_properties');
    if (!container) return false;

    if (container.querySelector('.inspecta-filters-item')) return true; // already added

    const item = document.createElement('div');
    item.className = 'pnl_item inspecta-filters-item';
    item.innerHTML = `
      <div class="pnl_item__header">Filters & Blend</div>
      <div class="pnl_item__body">
        <label class="row">Selector: <input class="inspecta-filter-selector" value="body" /></label>

        <label class="row">Blend mode:
          <select class="inspecta-blend-mode">
            <option>normal</option><option>multiply</option><option>screen</option><option>overlay</option>
            <option>darken</option><option>lighten</option><option>color-dodge</option><option>color-burn</option>
            <option>hard-light</option><option>soft-light</option><option>difference</option><option>exclusion</option>
            <option>hue</option><option>saturation</option><option>color</option><option>luminosity</option>
          </select>
        </label>

        <div class="inspecta-filters-controls">
          <label class="row">blur <input type="range" min="0" max="50" value="0" class="inspecta-filter-range" data-name="blur" /><span class="val">0px</span></label>
          <label class="row">brightness <input type="range" min="0" max="300" value="100" class="inspecta-filter-range" data-name="brightness" /><span class="val">100%</span></label>
          <label class="row">contrast <input type="range" min="0" max="300" value="100" class="inspecta-filter-range" data-name="contrast" /><span class="val">100%</span></label>
          <label class="row">saturate <input type="range" min="0" max="300" value="100" class="inspecta-filter-range" data-name="saturate" /><span class="val">100%</span></label>
          <label class="row">hue-rotate <input type="range" min="0" max="360" value="0" class="inspecta-filter-range" data-name="hueRotate" /><span class="val">0deg</span></label>
          <label class="row">sepia <input type="range" min="0" max="100" value="0" class="inspecta-filter-range" data-name="sepia" /><span class="val">0%</span></label>
          <label class="row">grayscale <input type="range" min="0" max="100" value="0" class="inspecta-filter-range" data-name="grayscale" /><span class="val">0%</span></label>
          <label class="row">invert <input type="range" min="0" max="100" value="0" class="inspecta-filter-range" data-name="invert" /><span class="val">0%</span></label>
        </div>

        <div class="pnl_item__actions">
          <button class="inspecta-filters-apply">Apply</button>
          <button class="inspecta-filters-clear">Clear</button>
        </div>
      </div>
    `;

    container.appendChild(item);

    const selectorInput = item.querySelector('.inspecta-filter-selector');
    const blendSelect = item.querySelector('.inspecta-blend-mode');
    const ranges = Array.from(item.querySelectorAll('.inspecta-filter-range'));
    const applyBtn = item.querySelector('.inspecta-filters-apply');
    const clearBtn = item.querySelector('.inspecta-filters-clear');

    function readFiltersFromUI() {
      const f = {};
      ranges.forEach(r => {
        const name = r.dataset.name;
        const v = r.value;
        if (name === 'blur') {
          if (v && Number(v) > 0) f.blur = `${v}px`;
        } else if (name === 'hueRotate') {
          if (v && Number(v) !== 0) f.hueRotate = `${v}deg`;
        } else if (name === 'brightness') {
          if (Number(v) !== 100) f.brightness = `${v}%`;
        } else if (name === 'contrast') {
          if (Number(v) !== 100) f.contrast = `${v}%`;
        } else if (name === 'saturate') {
          if (Number(v) !== 100) f.saturate = `${v}%`;
        } else {
          if (Number(v) !== 0) f[name] = `${v}%`;
        }
      });
      return f;
    }

    // UI update helpers
    ranges.forEach(r => {
      const valSpan = r.parentElement.querySelector('.val');
      function updateVal() {
        const name = r.dataset.name;
        if (name === 'blur') valSpan.textContent = `${r.value}px`;
        else if (name === 'hueRotate') valSpan.textContent = `${r.value}deg`;
        else valSpan.textContent = `${r.value}%`;
      }
      r.addEventListener('input', updateVal);
      updateVal();
    });

    // debounce apply
    let t;
    function doApply() {
      const selector = selectorInput.value || 'body';
      const filters = readFiltersFromUI();
      const mode = blendSelect.value || 'normal';

      // Prefer local API if present
      if (window.InspectaCSSFilters && typeof window.InspectaCSSFilters.applyFiltersToSelector === 'function') {
        window.InspectaCSSFilters.applyFiltersToSelector(selector, filters);
        window.InspectaCSSFilters.setBlendMode(selector, mode);
      } else {
        // fallback: dispatch custom event (other scripts can listen) 
        const ev = new CustomEvent('inspecta:applyCssFilters', { detail: { selector, filters, mode } });
        window.dispatchEvent(ev);
      }
    }

    function scheduleApply() {
      clearTimeout(t);
      t = setTimeout(doApply, 120);
    }

    ranges.forEach(r => r.addEventListener('input', scheduleApply));
    blendSelect.addEventListener('change', scheduleApply);
    selectorInput.addEventListener('change', scheduleApply);

    applyBtn.addEventListener('click', (e) => { e.preventDefault(); doApply(); });
    clearBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const selector = selectorInput.value || 'body';
      if (window.InspectaCSSFilters && typeof window.InspectaCSSFilters.clearFilters === 'function') {
        window.InspectaCSSFilters.clearFilters(selector);
      } else {
        const ev = new CustomEvent('inspecta:clearCssFilters', { detail: { selector } });
        window.dispatchEvent(ev);
      }
      // reset UI to defaults
      ranges.forEach(r => {
        if (r.dataset.name === 'blur') r.value = 0;
        else if (r.dataset.name === 'hueRotate') r.value = 0;
        else if (r.dataset.name === 'brightness' || r.dataset.name === 'contrast' || r.dataset.name === 'saturate') r.value = 100;
        else r.value = 0;
        const evt = new Event('input'); r.dispatchEvent(evt);
      });
      blendSelect.value = 'normal';
    });

    return true;
  }

  // Try immediate insert, otherwise observe DOM for pnl_properties
  if (!createPnlItem()) {
    const obs = new MutationObserver((mutations, o) => {
      if (createPnlItem()) o.disconnect();
    });
    obs.observe(document.documentElement || document.body, { childList: true, subtree: true });
  }

  // Allow background/content to call UI-less methods via messages
  if (chrome && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (!msg) return;
      if (msg.type === 'applyCssFilters') {
        applyFiltersToSelector(msg.selector || 'body', msg.filters || {});
        if (msg.mode) setBlendMode(msg.selector || 'body', msg.mode);
        sendResponse({ success: true });
      } else if (msg.type === 'setBlendMode') {
        setBlendMode(msg.selector || 'body', msg.mode);
        sendResponse({ success: true });
      } else if (msg.type === 'clearCssFilters') {
        clearFilters(msg.selector || 'body');
        sendResponse({ success: true });
      }
    });
  }
})();