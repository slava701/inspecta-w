let changes_action_delete;
let changes_action_export_to_file;
let changes_action_copy_to_clipboard;
let changes_action_copy_all_to_ai;
let changes_action_send_to_cursor;
let apply_css_changes;
// let store_css_changes;
let css_changes_counter;

function initChanges() {
  initChangesElements();
  registerChangesEvents();
}
function initChangesElements() {
  changes_action_delete = shadow.querySelector("#changes_action_delete");
  changes_action_export_to_file = shadow.querySelector("#changes_action_export_to_file");
  changes_action_copy_to_clipboard = shadow.querySelector("#changes_action_copy_to_clipboard");
  changes_action_copy_all_to_ai = shadow.querySelector("#changes_action_copy_all_to_ai");
  changes_action_send_to_cursor = shadow.querySelector("#changes_action_send_to_cursor");
  apply_css_changes = shadow.querySelector("#apply_css_changes");
  //store_css_changes = shadow.querySelector("#store_css_changes");
  css_changes_counter = shadow.querySelector("#css_changes_counter");
}
function registerChangesEvents() {
  changes_action_delete.addEventListener('click', btnDeleteCssClick);
  apply_css_changes.checked = true;
  apply_css_changes.addEventListener('change', onApplyCssChangesClick);

  changes_action_export_to_file.addEventListener('click', onExportToFileClick);
  changes_action_copy_to_clipboard.addEventListener('click', onCopyToClipboardClick);
  changes_action_copy_all_to_ai.addEventListener('click', onCopyAllToAIClick);
  changes_action_send_to_cursor.addEventListener('click', onSendToCursorClick);

}
function btnDeleteCssClick(e) {
  deleteCss();

  // Additional cleanup for isolate mode elements
  // Remove all Inspecta-applied inline styles from all styled elements
  if (window.inspectaStyledElements) {
    window.inspectaStyledElements.forEach(el => {
      if (typeof window.removeAllInspectaInlineStyles === 'function') {
        window.removeAllInspectaInlineStyles(el);
      } else if (el && el.style) {
        el.removeAttribute('style');
      }
    });
    window.inspectaStyledElements.clear();
  }

  // Clean up any remaining isolate mode elements
  document.querySelectorAll('.inspecta-inspect-isolated').forEach(element => {
    element.classList.remove('inspecta-inspect-isolated');
    // Remove any remaining inline styles using the proper function
    if (typeof window.removeAllInspectaInlineStyles === 'function') {
      window.removeAllInspectaInlineStyles(element);
    } else {
      element.removeAttribute('style');
    }
    // Clean up originalSelector property
    if (element.originalSelector) {
      delete element.originalSelector;
    }
  });

  // Remove any remaining isolation wrappers
  const isolationWrapper = document.getElementById('inspecta_isolation_wrapper');
  if (isolationWrapper) {
    isolationWrapper.remove();
  }

  // Reset body background color
  document.body.style.backgroundColor = '';

  if (window.target instanceof Element) {
    populateCSS();
  }
  generateInspectaFullCss();
  generateCssChangesCounter();

  // Refresh overview thumbnails to show original colors
  if (typeof clearAndRefreshOverview === 'function') {
    clearAndRefreshOverview();
    // Update mismatch indicators after overview is refreshed
    setTimeout(() => {
      if (typeof window.updateColorMismatchUI === 'function') {
        window.updateColorMismatchUI();
      }
    }, 100);
  }
}
function onApplyCssChangesClick(e) {
  if (!apply_css_changes.checked) {
    document.querySelector('#inspectaStylesheet').sheet.disabled = true;
    // Remove all Inspecta-applied inline styles from all styled elements
    if (window.inspectaStyledElements) {
      window.inspectaStyledElements.forEach(el => {
        if (typeof window.removeAllInspectaInlineStyles === 'function') {
          window.removeAllInspectaInlineStyles(el);
        } else if (el && el.style) {
          el.removeAttribute('style');
        }
      });
      window.inspectaStyledElements.clear();
    }
  }
  else {
    document.querySelector('#inspectaStylesheet').sheet.disabled = false;
  }
  toggleStoreCSS(apply_css_changes.checked);
}

function onExportToFileClick(e) {
  exportToFile();
}
function onCopyToClipboardClick(e) {
  copyToClipboard();
}
function onCopyAllToAIClick(e) {
  if (typeof window.copyAllChangesToAI === 'function') {
    window.copyAllChangesToAI();
  } else {
    console.error('copyAllChangesToAI function not available');
    if (window.showToast) window.showToast('Copy All to AI function not available');
  }
}

function onSendToCursorClick(e) {
  console.log('🎯 Send to Cursor button clicked!');

  if (typeof window.sendToCursor === 'function') {
    console.log('✅ sendToCursor function found, calling it...');
    window.sendToCursor();
  } else {
    console.error('❌ sendToCursor function not available');
    if (window.showToast) window.showToast('Send to Cursor function not available');
  }
}
function generateCssChangesCounter() {
  const inspectaStylesheet = document.getElementById('inspectaStylesheet').sheet;
  // const propertyCount = countPropertiesInStylesheet(inspectaStylesheet);
  const propertyCountJson = countPropertiesInJSONCSS();
  if (propertyCountJson === 0) {
    css_changes_counter.innerText = 'No changes';
  } else if (propertyCountJson === 1) {
    css_changes_counter.innerText = '1 change';
  } else {
    css_changes_counter.innerText = propertyCountJson + ' changes';
  }

  // Also call updatePropertyChangeIndicators
  if (typeof window.updatePropertyChangeIndicators === 'function') {
    window.updatePropertyChangeIndicators();
  }
  // Enable/disable export, copy, and delete buttons based on changes
  if (typeof changes_action_export_to_file !== 'undefined' && typeof changes_action_copy_to_clipboard !== 'undefined' && typeof changes_action_delete !== 'undefined' && typeof changes_action_copy_all_to_ai !== 'undefined' && typeof changes_action_send_to_cursor !== 'undefined') {
    if (propertyCountJson === 0) {
      changes_action_export_to_file.classList.add('disabled');
      changes_action_export_to_file.setAttribute('disabled', 'true');
      changes_action_copy_to_clipboard.classList.add('disabled');
      changes_action_copy_to_clipboard.setAttribute('disabled', 'true');
      changes_action_copy_all_to_ai.classList.add('disabled');
      changes_action_copy_all_to_ai.setAttribute('disabled', 'true');
      changes_action_send_to_cursor.classList.add('disabled');
      changes_action_send_to_cursor.setAttribute('disabled', 'true');
      changes_action_delete.classList.add('disabled');
      changes_action_delete.setAttribute('disabled', 'true');
    } else {
      changes_action_export_to_file.classList.remove('disabled');
      changes_action_export_to_file.removeAttribute('disabled');
      changes_action_copy_to_clipboard.classList.remove('disabled');
      changes_action_copy_to_clipboard.removeAttribute('disabled');
      changes_action_copy_all_to_ai.classList.remove('disabled');
      changes_action_copy_all_to_ai.removeAttribute('disabled');
      changes_action_send_to_cursor.classList.remove('disabled');
      changes_action_send_to_cursor.removeAttribute('disabled');
      changes_action_delete.classList.remove('disabled');
      changes_action_delete.removeAttribute('disabled');
    }

    // Update Send to Cursor button states based on localhost
    if (typeof window.updateSendToCursorButtons === 'function') {
      window.updateSendToCursorButtons();
    }
  }

  // Sync dots with CSS changes panel
  setTimeout(() => {
    if (typeof window.syncDotsWithCssChanges === 'function') {
      window.syncDotsWithCssChanges();
    }
  }, 50);
}