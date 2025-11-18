/*
TODO: add to manifest.json under content_scripts:
"js/csstooltip/popper.min.js",
"js/csstooltip/tippy.min.js",
"js/csstooltip/csstooltip.js",
*/

let tippyInstance = null;
function showCssTooltip(element) {
    console.log("showCssTooltip")
    if (tippyInstance) {
        tippyInstance.destroy();
    }
    tippyInstance = tippy(element, {
        content: "I'm a Tippy tooltip!",
    });
    let compStyles = window.getComputedStyle(element);
    console.log('-------------------------------------')
    //logStyles(element);
    console.log('element.nodeType:', element.nodeType);
    console.log('element.nodeName:', element.nodeName);
}

function logStyles(element) {
    // Log inline styles
    if (element.style.cssText.length > 0) {
        console.log('Inline styles:');
        console.log(element.style.cssText);
    }

    // Log stylesheet class styles
    for (let sheet of document.styleSheets) {
        try {
            for (let rule of sheet.cssRules) {
                if (rule.selectorText && element.matches(rule.selectorText)) {
                    console.log('Stylesheet class styles:');
                    console.log(rule.style.cssText);
                }
            }
        } catch (error) {
            console.error('Error accessing stylesheet rules:', error);
        }
    }
}
