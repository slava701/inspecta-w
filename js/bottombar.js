let btn_inspect_preview_toggle;
let btn_eye_dropper;
let btn_ruler;
let btn_view_overlay;
let pnl_overlay;
let btn_theme_light;
let btn_theme_drak;
let btn_toggle_properties;
let btn_remove_inspecta;
let rulers;
let toggle_fill;
let btn_outline;
let btn_distances;
let ic_inspect_on;
let ic_inspect_off;
let btn_toggle_overlay;
let bottom_toolbar_toggle_fill;
let btn_toggle_changes;
let bottom_toolbar_toggle_fill_changes;
let btn_info;
let btn_settings;

let in_overlay_image_collapse;
let in_overlay_image_expand;

let btn_view_tree_navigator;
// let domTreeVisualizer;

// Make bottom toolbar draggable
function initDraggableBottomToolbar() {
    const dragHandle = shadow.getElementById('btn_drag_bottom_toolbar');
    const toolbar = shadow.getElementById('bottom_toolbar');
    let isDragging = false;
    let hasMovedAway = false; // Track if toolbar has moved away from original position
    let currentX;
    let currentY;
    let initialMouseX;
    let initialMouseY;

    if (!dragHandle || !toolbar) return;

    dragHandle.style.cursor = 'grab';

    dragHandle.addEventListener('mousedown', function (e) {
        isDragging = true;
        hasMovedAway = false; // Reset the flag for each new drag
        dragHandle.style.cursor = 'grabbing';

        // Don't show outline when starting to drag

        // Get the current toolbar position
        const rect = toolbar.getBoundingClientRect();
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

        // Get viewport and toolbar dimensions
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const toolbarWidth = toolbar.offsetWidth;
        const toolbarHeight = toolbar.offsetHeight;

        // Add padding and enforce boundaries
        const padding = 8;
        newX = Math.max(padding, Math.min(viewportWidth - toolbarWidth - padding, newX));
        newY = Math.max(padding, Math.min(viewportHeight - toolbarHeight - padding, newY));

        // Apply the new position
        toolbar.style.left = `${newX}px`;
        toolbar.style.top = `${newY}px`;
        toolbar.style.bottom = 'auto'; // Remove bottom positioning when dragging

        // Check if toolbar has moved away from original position
        const moveDx = e.clientX - initialMouseX;
        const moveDy = e.clientY - initialMouseY;
        const totalDistance = Math.sqrt(moveDx * moveDx + moveDy * moveDy);

        // If moved more than 50px from start position, mark as moved away
        if (totalDistance > 50) {
            hasMovedAway = true;
        }

        // Check for proximity to original position and show/hide outline accordingly
        const dropZone = shadow.getElementById('bottom_toolbar_drop_zone');
        if (dropZone) {
            const dropZoneRect = dropZone.getBoundingClientRect();
            const toolbarRect = toolbar.getBoundingClientRect();

            // Calculate distance between toolbar center and drop zone center
            const toolbarCenterX = toolbarRect.left + (toolbarRect.width / 2);
            const toolbarCenterY = toolbarRect.top + (toolbarRect.height / 2);
            const dropZoneCenterX = dropZoneRect.left + (dropZoneRect.width / 2);
            const dropZoneCenterY = dropZoneRect.top + (dropZoneRect.height / 2);

            const distanceToCenter = Math.sqrt(
                Math.pow(toolbarCenterX - dropZoneCenterX, 2) +
                Math.pow(toolbarCenterY - dropZoneCenterY, 2)
            );

            // Check if toolbar is overlapping the drop zone (touching the outline)
            const isOverlapping = !(toolbarRect.right < dropZoneRect.left ||
                toolbarRect.left > dropZoneRect.right ||
                toolbarRect.bottom < dropZoneRect.top ||
                toolbarRect.top > dropZoneRect.bottom);

            // Show outline when within 100px of original position
            if (distanceToCenter < 100) {
                dropZone.classList.add('show');

                // If toolbar has moved away and is now touching the outline, snap back
                if (hasMovedAway && isOverlapping) {
                    // Snap back to original position immediately
                    toolbar.style.left = 'calc(50% - 214px)';
                    toolbar.style.top = 'auto';
                    toolbar.style.bottom = '5px';

                    // Stop dragging
                    isDragging = false;
                    dragHandle.style.cursor = 'grab';

                    // Hide drop zone outline
                    dropZone.classList.remove('show');
                }
            } else {
                // Hide outline when not within 100px
                dropZone.classList.remove('show');
            }
        }
    });

    document.addEventListener('mouseup', function () {
        if (isDragging) {
            isDragging = false;
            hasMovedAway = false; // Reset the flag when dragging stops
            dragHandle.style.cursor = 'grab';

            // Hide drop zone outline
            const dropZone = shadow.getElementById('bottom_toolbar_drop_zone');
            if (dropZone) {
                dropZone.classList.remove('show');
            }

            // No additional snap-back logic needed - handled by overlap detection during drag
        }
    });
}
function initBottomBar() {
    initElements();

    // Reset panel states
    isPnlPropertiesVisible = true;
    isPnlPropertiesContentVisible = true;
    isPnlChangesVisible = false;

    // Reset all bottom toolbar toggles
    if (shadow) {
        const allToggles = shadow.querySelectorAll('.bottom_toolbar_toggle, .toggle_fill, #bottom_toolbar_toggle_fill_changes');
        allToggles.forEach(toggle => {
            toggle.classList.remove('fill_active');
        });
    }

    // Set properties toggle as active by default
    if (btn_toggle_properties) {
        btn_toggle_properties.classList.add('fill_active');
    }
    if (toggle_fill) {
        toggle_fill.classList.add('fill_active');
    }

    // Ensure changes panel is hidden and properties panel is visible
    if (pnl_properties) {
        pnl_properties.style.display = 'block';
    }
    if (pnl_properties_content) {
        pnl_properties_content.style.display = 'block';
    }
    if (pnl_changes) {
        pnl_changes.style.display = 'none';
    }

    // Reset changes panel toggle
    if (btn_toggle_changes) {
        btn_toggle_changes.classList.remove('fill_active');
    }
    if (bottom_toolbar_toggle_fill_changes) {
        bottom_toolbar_toggle_fill_changes.classList.remove('fill_active');
    }

    registerEvents();
    initDraggableBottomToolbar();
}
function initElements() {
    btn_toggle_properties = shadow.querySelector("#btn_toggle_pnl");
    btn_eye_dropper = shadow.querySelector("#btn_eye_dropper");
    btn_ruler = shadow.querySelector("#btn_ruler");
    btn_inspect_preview_toggle = shadow.querySelector("#btn_inspect_preview_toggle");
    btn_view_overlay = shadow.querySelector("#btn_view_overlay");
    pnl_overlay = shadow.querySelector("#pnl_overlay");
    btn_theme_light = shadow.querySelector('#btn_theme_light');
    btn_theme_drak = shadow.querySelector('#btn_theme_dark');
    btn_remove_inspecta = shadow.querySelector('#btn_remove_inspecta');
    rulers = shadow.querySelector("#rulers");
    toggle_fill = shadow.querySelector("#toggle_fill");
    btn_outline = shadow.querySelector("#btn_outline");
    btn_distances = shadow.querySelector("#btn_distances");
    ic_inspect_on = shadow.querySelector("#ic_inspect_on");
    ic_inspect_off = shadow.querySelector("#ic_inspect_off");

    btn_toggle_overlay = shadow.querySelector("#btn_toggle_overlay");
    bottom_toolbar_toggle_fill = shadow.querySelector("#bottom_toolbar_toggle_fill");

    btn_toggle_changes = shadow.querySelector("#btn_toggle_changes");
    bottom_toolbar_toggle_fill_changes = shadow.querySelector("#bottom_toolbar_toggle_fill_changes");
    in_overlay_image_collapse = shadow.querySelector("#in_overlay_image_collapse");
    in_overlay_image_expand = shadow.querySelector("#in_overlay_image_expand");
    btn_view_tree_navigator = shadow.querySelector("#btn_view_tree_navigator");
    btn_info = shadow.querySelector('#btn_info');
    btn_settings = shadow.querySelector('#btn_settings');
}
function registerEvents() {
    //  toggle properties pnl
    btn_toggle_properties.addEventListener('click', onTogglePropertiesClick);
    btn_inspect_preview_toggle.addEventListener('click', onInspectToggleClick);
    btn_eye_dropper.addEventListener('click', onEyeDropperClick);

    btn_ruler.addEventListener('click', onBtnRulerClick);
    btn_view_overlay.addEventListener('click', onBtnOverleyClick);
    btn_theme_light.addEventListener('click', onBtnThemeLightClick);

    btn_theme_drak.addEventListener('click', onBtnThemeDarkClick);
    btn_remove_inspecta.addEventListener('click', removeInspectaApp);
    btn_outline.addEventListener('click', onOutlineClick);
    btn_distances.addEventListener('click', onDistancesClick);
    btn_toggle_overlay.addEventListener('click', onBtnOverleyClick);

    btn_toggle_changes.addEventListener('click', onToggleChangesClick);

    in_overlay_image_collapse.addEventListener('click', overlayImageCollapse);
    in_overlay_image_expand.addEventListener('click', overlayImageExpand);
    btn_view_tree_navigator.addEventListener('click', onBtnViewTreeNavigatorClick);

    btn_info.addEventListener('click', onInfoPopoverToggleClick);
    // btn_settings event listener moved to settings.js

    //temporary
    domTreeVisualizer = new DOMTreeVisualizer('inspecta_app', shadow);
    domTreeVisualizer.init();
    //domTreeVisualizer.show();
}
// function onInspectToggleClick() {
//     if (inspectMode) {
//         inspectMode = false;
//         previewMode = true;
//         btn_inspect_preview_toggle.classList.add("btn_inspect_preview_mode");
//         ic_inspect_on.style.display = "none";
//         ic_inspect_off.style.display = "block";
//         pnl_properties.style.display = "none";
//         pnl_overlay.style.display = "none";

//         btn_eye_dropper.classList.remove("inspecta-active");
//         console.log("preview-mode");
//         appToggle = false;
//         if ($qs('.inspecta-inspect-active')) {
//             $qs('.inspecta-inspect-active').classList.remove('inspecta-inspect-active');
//         }
//         console.log('bottom_toolbar_toggle_fill.classList', bottom_toolbar_toggle_fill.classList);
//         bottom_toolbar_toggle_fill.classList.remove("fill_active");
//         hideGuides();
//         unloadOverlay();

//         applyInspector();
//     }
//     else {
//         inspectMode = true;
//         previewMode = false;
//         btn_inspect_preview_toggle.classList.remove("btn_inspect_preview_mode");
//         btn_eye_dropper.classList.remove("inspecta-active");
//         ic_inspect_on.style.display = "block";
//         ic_inspect_off.style.display = "none";
//         console.log("inspect-mode");
//         appToggle = true;
//         if (target)
//             target.classList.add('inspecta-inspect-active');
//         pnl_properties.style.display = "block";
//         applyInspector();

//         if (btn_view_overlay.classList.contains("inspecta-active")) {
//             resumeOverlay();
//             pnl_overlay.style.display = "flex";

//         }
//         if (btn_ruler.classList.contains("inspecta-active")) {
//             showGuides();
//         }
//     }
// }
function onEyeDropperClick() {
    btn_eye_dropper.classList.add("inspecta-active");
    applyInspector();
    showEyeDropper();
}

function onBtnRulerClick() {
    if (rulers.style.display === "block") {
        //toggleDraggableLines(false);
        hideGuides();
        rulers.style.display = "none";
        btn_ruler.classList.remove("inspecta-active");
        // btn_ruler.classList.remove("inspecta-active");
        pnl_properties.style.top = "5px";
        //isDraggableLinesEnabled = false;
    } else {
        showGuides();
        //toggleDraggableLines(true);
        rulers.style.display = "block";
        // btn_ruler.classList.add("inspecta-active");
        btn_ruler.classList.add("inspecta-active");
        pnl_properties.style.top = "25px";
    }
}
function onBtnOverleyClick() {
    hideNavigator();
    if (pnl_overlay.style.display === "flex") {
        pnl_overlay.style.display = "none";
        btn_view_overlay.classList.remove("fill_active");
        bottom_toolbar_toggle_fill.classList.remove("fill_active");
        // btn_view_overlay.classList.remove("inspecta-active");
        unloadOverlay();
    } else {
        pnl_overlay.style.display = "flex";
        // btn_view_overlay.classList.add("inspecta-active");
        bottom_toolbar_toggle_fill.classList.add("fill_active");
        btn_view_overlay.classList.add("fill_active");
        resumeOverlay();
    }
}

function onBtnThemeLightClick() {
    btn_theme_light.style.display = 'none';
    btn_theme_drak.style.display = 'flex';
    shadow.querySelector('#inspecta_app').setAttribute('data-theme', 'light');
    //shadow.setAttribute('data-theme', 'light');
    //document.documentElement.setAttribute('data-theme', 'light');
}

function onBtnThemeDarkClick() {
    btn_theme_light.style.display = 'flex';
    btn_theme_drak.style.display = 'none';
    shadow.querySelector('#inspecta_app').setAttribute('data-theme', 'dark');
    //shadow.setAttribute('data-theme', 'dark');
    //document.documentElement.setAttribute('data-theme', 'dark');
}
function removeInspectaApp() {
    // Use the same comprehensive cleanup as the extension icon
    if (typeof ensureInspectaUIState === 'function') {
        ensureInspectaUIState(false);
    } else {
        // Fallback to fullCleanupInspecta if ensureInspectaUIState is not available
        if (typeof fullCleanupInspecta === 'function') {
            fullCleanupInspecta();
        }
    }

    // Reset all states
    appToggle = false;
    mainAppToggle = false;
    inspectMode = false;
    previewMode = false;
}
function onOutlineClick() {
    if (btn_outline.classList.contains("inspecta-active")) {
        //btn_outline.classList.remove("inspecta-active");
        enableDisableOutline(false);
    } else {
        //btn_outline.classList.add("inspecta-active");
        enableDisableOutline(true);
    }
}

function enableDisableOutline(enable = true) {
    let outline_style_container = document.querySelector("#outline_style_container");
    if (!outline_style_container) {
        outline_style_container = document.createElement('style');
        outline_style_container.setAttribute('id', 'outline_style_container');
        document.body.appendChild(outline_style_container);
    }

    if (enable) {
        // outline_style_container.innerHTML = `
        //     body *:not(#pnl_properties):not(#pnl_properties *):not(svg *):not(#bottom_toolbar):not(#bottom_toolbar *) {
        //         outline: 1px solid red;
        //         background-color: #ff000008;
        //     }
        //     `;
        outline_style_container.innerHTML = `
            body *:not(#pnl_properties):not(#pnl_properties *):not(svg *):not(#bottom_toolbar):not(#bottom_toolbar *):not([class^="inspecta-lines"]):not(.inspecta-inspect):not(#pnl_overlay):not(#pnl_overlay *):not(#inspecta-rg-overlay):not(#inspecta-rg-overlay *):not(#eye_dropper_result_bg):not(#eye_dropper_result_bg *) {
                background-color: #ffffff72!important;
                background: #ffffff6e !important;
                background-image: none !important;
                border-color: transparent !important;
                color: #111 !important;
                outline: 1px solid #333 !important;
                outline-offset: -1px !important;
                background-blend-mode: darken !important;
                box-shadow: none!important; 
                text-shadow: none!important;
                border-radius: 0 !important;
                -webkit-filter: none !important;
                -moz-filter: none !important;
                filter: none !important;
                list-style-image: none !important;
            }
            `;
        btn_outline.classList.add("inspecta-active");
    }
    else {
        outline_style_container.innerHTML = '';
        btn_outline.classList.remove("inspecta-active");
    }
}
function onDistancesClick() {
    if (btn_distances.classList.contains("inspecta-active")) {
        enableDisableDistances(false);
    } else {
        // btn_distances.classList.add("inspecta-active");
        // resumeDistances();
        enableDisableDistances(true);
    }
}
function enableDisableDistances(enable) {
    if (enable === undefined) enable = enableDistances;
    if (enable) {
        btn_distances.classList.add("inspecta-active");
        resumeDistances();
    }
    else {
        btn_distances.classList.remove("inspecta-active");
        hideDistances();
    }
}
let isPnlPropertiesVisible = true;
let isPnlPropertiesContentVisible = true;
let isPnlChangesVisible = false;
function onTogglePropertiesClick() {
    if (!isPnlPropertiesContentVisible) {
        // Show properties panel
        pnl_properties.style.display = "block";
        pnl_properties_content.style.display = "block";
        pnl_changes.style.display = "none";
        toggle_fill.classList.add("fill_active");
        bottom_toolbar_toggle_fill_changes.classList.remove("fill_active");
        isPnlPropertiesContentVisible = true;
        isPnlChangesVisible = false;
    }
}
function onToggleChangesClick() {
    console.log('🔍 onToggleChangesClick called');
    console.log('🔍 isPnlChangesVisible:', isPnlChangesVisible);
    console.log('🔍 pnl_changes element:', pnl_changes);

    if (!isPnlChangesVisible) {
        console.log('🔍 Showing changes panel...');
        // Show changes panel
        pnl_changes.style.display = 'block';
        pnl_properties_content.style.display = 'none';
        bottom_toolbar_toggle_fill_changes.classList.add("fill_active");
        toggle_fill.classList.remove("fill_active");
        isPnlChangesVisible = true;
        isPnlPropertiesContentVisible = false;

        console.log('🔍 Panel display set to:', pnl_changes.style.display);
        console.log('🔍 Calling generateInspectaFullCss...');
        if (typeof window.generateInspectaFullCss === 'function') {
            window.generateInspectaFullCss();
        } else {
            console.error('❌ window.generateInspectaFullCss is not available!');
        }
        console.log('🔍 Calling generateCssChangesCounter...');
        if (typeof window.generateCssChangesCounter === 'function') {
            window.generateCssChangesCounter();
        } else {
            console.error('❌ window.generateCssChangesCounter is not available!');
        }

        // Check if content is visible after generation
        setTimeout(() => {
            const fullCssContent = $id('full_css_content');
            console.log('🔍 After generation - full_css_content:', fullCssContent);
            console.log('🔍 After generation - children count:', fullCssContent ? fullCssContent.children.length : 'element not found');
            console.log('🔍 After generation - display style:', fullCssContent ? fullCssContent.style.display : 'element not found');

            // Also check the parent container
            const pnlChangesContent = shadow.querySelector('#pnl_changes_content');
            console.log('🔍 pnl_changes_content:', pnlChangesContent);
            console.log('🔍 pnl_changes_content display:', pnlChangesContent ? pnlChangesContent.style.display : 'element not found');
        }, 100);
    } else {
        console.log('🔍 Changes panel is already visible');
    }
}

// function tabChangesClick(e) {
//     tab_changes.classList.add('tab_selected');
//     tab_properties.classList.remove('tab_selected');
//     tab_compare.classList.remove('tab_selected');
//     tab_overlay.classList.remove('tab_selected');
//     pnl_changes.style.display = 'block';
//     pnl_properties_content.style.display = 'none';
//     pnl_compare.style.display = 'none';
//     pnl_overlay.style.display = 'none';
//     generateInspectaFullCss();
//     generateCssChangesCounter();

// }
// function onBtnOverleyClick() {
//     if (pnl_overlay.style.display === "flex") {
//         pnl_overlay.style.display = "none";
//         btn_view_overlay.classList.remove("fill_active");
//         bottom_toolbar_toggle_fill.classList.remove("fill_active");
//         // btn_view_overlay.classList.remove("inspecta-active");
//         unloadOverlay();
//     } else {
//         pnl_overlay.style.display = "flex";
//         // btn_view_overlay.classList.add("inspecta-active");
//         bottom_toolbar_toggle_fill.classList.add("fill_active");
//         btn_view_overlay.classList.add("fill_active");
//         resumeOverlay();
//     }
// }

function overlayImageCollapse() {
    in_overlay_image_collapse.style.display = "none";
    in_overlay_image_expand.style.display = "flex";
    pnl_overlay.classList.add('pnl_overlay_collapsed');

    //pnl_overlay.style.display = "none";
    //btn_view_overlay.classList.remove("fill_active");
    //bottom_toolbar_toggle_fill.classList.remove("fill_active");
    //unloadOverlay();
}
function overlayImageExpand() {
    in_overlay_image_collapse.style.display = "flex";
    in_overlay_image_expand.style.display = "none";
    pnl_overlay.classList.remove('pnl_overlay_collapsed');
    //pnl_overlay.style.display = "flex";
    //btn_view_overlay.classList.add("fill_active");
    //bottom_toolbar_toggle_fill.classList.add("fill_active");
    //resumeOverlay();
}

function onBtnViewTreeNavigatorClick(e) {

    hidImageOverlay();
    if (!domTreeVisualizer) {
        domTreeVisualizer = new DOMTreeVisualizer('inspecta_app', shadow);
    }
    if (shadow.querySelector('#pnl_navigator').style.display === "block") {
        domTreeVisualizer.hide();
        shadow.querySelector('#bottom_toolbar_toggle_fill_navigator').classList.remove("fill_active");

    }
    else {
        domTreeVisualizer.show();
        shadow.querySelector('#bottom_toolbar_toggle_fill_navigator').classList.add("fill_active");

    }
}

function hideNavigator() {
    if (shadow.querySelector('#pnl_navigator').style.display === "block") {
        shadow.querySelector('#pnl_navigator').style.display = "none";
        shadow.querySelector('#bottom_toolbar_toggle_fill_navigator').classList.remove("fill_active");
    }
}
function hidImageOverlay() {
    if (pnl_overlay.style.display === "flex") {
        pnl_overlay.style.display = "none";
        btn_view_overlay.classList.remove("fill_active");
        bottom_toolbar_toggle_fill.classList.remove("fill_active");
        unloadOverlay();
    }
}
function onInfoPopoverToggleClick() {
    // If in preview mode, switch to inspect mode first (like ruler/distances)
    if (window.previewMode) {
        window.previewMode = false;
        window.inspectMode = true;
        if (typeof onInspectToggleClick === 'function') {
            onInspectToggleClick();
        }
    }
    if (!btn_info) return;
    const isActive = btn_info.classList.toggle('inspecta-active');
    window.inspectaInfoPopoverActive = isActive;
    if (!isActive) {
        const popover = document.querySelector('.info-popover');
        if (popover && popover.parentNode) popover.parentNode.removeChild(popover);
    }
}
function deactivateInfoPopover() {
    if (!btn_info) return;
    btn_info.classList.remove('inspecta-active');
    window.inspectaInfoPopoverActive = false;
    const popover = document.querySelector('.info-popover');
    if (popover && popover.parentNode) popover.parentNode.removeChild(popover);
}
// Ensure deactivateInfoPopover is called whenever preview mode is entered
if (typeof onInspectToggleClick === 'function') {
    const originalOnInspectToggleClick = onInspectToggleClick;
    window.onInspectToggleClick = function () {
        originalOnInspectToggleClick.apply(this, arguments);
        if (window.previewMode) {
            deactivateInfoPopover();
        }
    };
}
// Robustly handle previewMode changes to always deactivate info popover
(function () {
    let _previewMode = false;
    Object.defineProperty(window, 'previewMode', {
        get() { return _previewMode; },
        set(val) {
            _previewMode = val;
            if (val) {
                if (typeof deactivateInfoPopover === 'function') deactivateInfoPopover();
            }
        },
        configurable: true
    });
})();

// onSettingsClick function moved to settings.js