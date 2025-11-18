// This is the service worker script, which executes in its own context
// when the extension is installed or refreshed (or when you access its console).
// It would correspond to the background script in chrome extensions v2.

// Importing and using functionality from external files is also possible.
importScripts('service-worker-utils.js')

// If you want to import a file that is deeper in the file hierarchy of your
// extension, simply do `importScripts('path/to/file.js')`.
// The path should be relative to the file `manifest.json`.
/**
 * Notify content.js when users clicked on app logo 
 * */
// --- BEGIN: Programmatic content script injection for existing tabs ---
// This block injects the content script (js/main.js) if it is missing when the extension icon is clicked.
// Remove this block if you want to revert to default behavior (content script only on new page loads).
chrome.action.onClicked.addListener(async function (activeTab) {
  console.log('Extension icon clicked, checking tab:', activeTab.id);

  try {
    // First, check if the main script is already injected by trying to send a message
    try {
      const response = await chrome.tabs.sendMessage(activeTab.id, 'check_inspecta_status');
      console.log('Inspecta already active, toggling app');
      // If we get a response, the scripts are already injected, just toggle the app
      chrome.tabs.sendMessage(activeTab.id, 'toggle_app', response => {
        console.log('Toggle message sent, response:', response);
      });
      return;
    } catch (error) {
      console.log('Inspecta not active, injecting scripts');
      // If we get an error, the scripts are not injected, proceed with injection
    }

    // Inject CSS files first
    const cssFiles = [
      'css/style.css',
      'css/ruler-guides.css',
      'css/inspecta-color-picker.css',
      'css/filters.css',
      'css/simplebar.min.css'
    ];

    for (const cssFile of cssFiles) {
      try {
        await chrome.scripting.insertCSS({
          target: { tabId: activeTab.id },
          files: [cssFile]
        });
        console.log(`CSS injected: ${cssFile}`);
      } catch (error) {
        console.error(`Failed to inject CSS ${cssFile}:`, error);
      }
    }

    // Inject JavaScript files in order
    const jsFiles = [
      'js/utils.js',
      'js/notifications.js',
      'js/cssgenerator.js',
      'js/distances.js',
      'js/applyClipboardCSS.js',
      'js/colorpicker/iro.min.js',
      'js/colorpicker/inspecta-color-picker.js',
      'js/bottombar.js',
      'js/changes.js',
      'js/google-fonts.js',
      'js/font-selector.js',
      'js/text-editor.js',
      'js/image-editor.js',
      'js/properties.js',
      'js/tooltips.js',
      'js/settings.js',
      'js/overview.js',
      'js/figmaIntegration.js',
      'js/rulers/ruler.js',
      'js/rulers/RulersGuides.js',
      'js/rulers/Event.js',
      'js/rulers/Dragdrop.js',
      'js/overlay/overlay.js',
      'js/simplebar.min.js',
      'js/DOMTreeVisualizer.js',
      'js/constants.js',
      'js/info-popover.js',
      'js/element-toolbar.js',
      'js/property-delete.js',
      'js/main.js' // Main.js should be injected last
    ];

    for (const jsFile of jsFiles) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          files: [jsFile]
        });
        console.log(`JavaScript injected: ${jsFile}`);
      } catch (error) {
        console.error(`Failed to inject JavaScript ${jsFile}:`, error);
      }
    }

    // Send toggle message after all files are injected
    chrome.tabs.sendMessage(activeTab.id, 'toggle_app', response => {
      console.log('Toggle message sent, response:', response);
    });

  } catch (error) {
    console.error('Error during script injection:', error);
  }
});
// --- END: Programmatic content script injection for existing tabs ---


chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.runtime.setUninstallURL('https://inspecta.design/goodbye');
    // Set flag to show setup guide popup on first install
    chrome.storage.local.set({ 'showSetupGuide': true });
  } else if (details.reason === chrome.runtime.OnInstalledReason.UPDATE) {
    // Set flag to show setup guide popup on update
    chrome.storage.local.set({ 'showSetupGuide': true });
  }
});

//---HOT SWAP--- REMOVE BEFORE DEPLOYMENT
chrome.commands.onCommand.addListener((shortcut) => {
  console.log('lets reload');
  console.log(shortcut);
  if (shortcut.includes("+M")) {
    chrome.runtime.reload();
  }
})
//-------------------------------------
/**
* Register Right click menu item
* contextMenu item
* **/
// chrome.contextMenus.create({
// title: "Inspecta Editor", 
// contexts:["all"], 
// id: "INSPECTA_EDITOR",
// onclick: toggleWebApp
// });



function toggleWebApp(info, activeTab) {
  chrome.tabs.sendMessage(activeTab.id, 'context')
}

// --- MANUAL CLEANUP FUNCTION ---
// This function can be called to clean up injected scripts from all tabs
function cleanupInjectedScripts() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
        // Send cleanup message to content script to trigger fullCleanupInspecta()
        chrome.tabs.sendMessage(tab.id, 'toggle_app').catch(() => {
          // Tab might not have content script, ignore errors
        });
      }
    });
  });
}

// Make cleanup function available globally for debugging
self.cleanupInjectedScripts = cleanupInjectedScripts;

// Google Fonts API handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'loadGoogleFonts') {
    loadGoogleFontsFromAPI()
      .then(fonts => {
        sendResponse({ success: true, fonts: fonts });
      })
      .catch(error => {
        console.error('Failed to load Google Fonts:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep the message channel open for async response
  }

  if (message.action === 'capture-screenshot') {
    captureElementScreenshot(message.bounds, sender.tab)
      .then(result => {
        sendResponse(result);
      })
      .catch(error => {
        console.error('Screenshot capture failed:', error);
        sendResponse({ error: error.message });
      });
    return true; // Keep the message channel open for async response
  }
});

async function loadGoogleFontsFromAPI() {
  const apiKey = 'AIzaSyBm8xC7vrZDB1in3miijcolVpqGp-fb6uI';
  const url = `https://www.googleapis.com/webfonts/v1/webfonts?key=${apiKey}&sort=popularity`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Google Fonts API error:', error);
    throw error;
  }
}

async function captureElementScreenshot(bounds, tab) {
  try {
    // Capture the visible tab as PNG
    const screenshotUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });

    // Fetch the screenshot as a blob
    const response = await fetch(screenshotUrl);
    const screenshotBlob = await response.blob();

    // Create an ImageBitmap from the blob
    const imageBitmap = await createImageBitmap(screenshotBlob);

    // The bounds are already adjusted for device pixel ratio, so we can use them directly
    // Create canvas for cropping with the exact element dimensions
    const canvas = new OffscreenCanvas(bounds.width, bounds.height);
    const ctx = canvas.getContext('2d');

    // Draw the cropped portion of the screenshot
    ctx.drawImage(
      imageBitmap,
      bounds.x, bounds.y, bounds.width, bounds.height, // Source rectangle
      0, 0, bounds.width, bounds.height // Destination rectangle
    );

    // Convert canvas to blob
    const croppedBlob = await canvas.convertToBlob({ type: 'image/png' });

    // Convert blob to base64
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onloadend = () => {
        resolve({ base64: reader.result });
      };
      reader.onerror = () => {
        reject(new Error('Failed to convert blob to base64'));
      };
      reader.readAsDataURL(croppedBlob);
    });
  } catch (error) {
    throw new Error(`Screenshot capture failed: ${error.message}`);
  }
}