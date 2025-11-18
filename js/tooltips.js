// Tooltip configuration
if (typeof window.tooltipConfig === 'undefined') {
    window.tooltipConfig = {
        'btn_distances': 'Toggle Distances',
        'btn_info': 'Toggle Info Popover',
        'btn_ruler': 'Toggle Rulers',
        'btn_outline': 'Toggle Outlines',
        'btn_eye_dropper': 'Sample Color',
        'btn_toggle_overlay': 'Toggle Image Overlay',
        'btn_view_tree_navigator': 'Toggle Navigator',
        'btn_toggle_changes': 'Toggle Changes Panel',
        'btn_toggle_pnl': 'Toggle Properties Panel',
        'btn_settings': 'Settings',
        'btn_remove_inspecta': 'Close Inspecta',
        'btn_theme_light': 'Switch to Light Theme',
        'btn_theme_dark': 'Switch to Dark Theme',
        'btn_properties_position': 'Reset Panel Position',
        'btn_inspect_preview_toggle': 'Toggle Inspect Mode Off',
        'btn_close_properties_pnl': 'Collapse Panel',
        'in_paste_img_hint': 'Paste Image from clipboard',
        'in_upload_img_hint': 'Upload Image',
        'btn_toggle_pnl_items': 'Collapse All ',
        'btn_isolate_element': 'Isolate element',
        'btn_navigator_collapse': 'Collapse All',
        'changes_action_export_to_file': 'Export to File',
        'changes_action_copy_to_clipboard': 'Copy All Changes',
        'changes_action_copy_all_to_ai': 'Copy All Changes to AI',
        'changes_action_send_to_cursor': (() => {
            const hostname = window.location.hostname;
            const isLocal = hostname === 'localhost' ||
                hostname === '127.0.0.1' ||
                hostname === '0.0.0.0' ||
                hostname.startsWith('192.168.') ||
                hostname.startsWith('10.') ||
                hostname.endsWith('.local');
            return isLocal ? 'Send to Cursor' : 'Send to Cursor only works on localhost';
        })(),
        'changes_action_delete': 'Delete All Changes',
        'btn_copy_ai_prompt': 'Copy for AI',
        'btn_send_to_cursor': (() => {
            const hostname = window.location.hostname;
            const isLocal = hostname === 'localhost' ||
                hostname === '127.0.0.1' ||
                hostname === '0.0.0.0' ||
                hostname.startsWith('192.168.') ||
                hostname.startsWith('10.') ||
                hostname.endsWith('.local');
            return isLocal ? 'Send to Cursor' : 'Send to Cursor only works on localhost';
        })(),
        'paste_figma_style': 'Paste Figma Style',
        'in_svg_upload': 'Upload',
        'in_svg_download': 'Download',
        'svg_code_copy_abs': 'Copy',
        'in_svg_paste': 'Paste from clipboard',
        'in_img_paste': 'Paste from clipboard',
        'in_paste_img': 'Paste from clipboard',
        'in_upload_img': 'Upload',
        'in_img_upload': 'Upload',
        'in_img_download': 'Download'
    };
}

if (typeof window.TooltipManager === 'undefined') {
    window.TooltipManager = class {
        constructor() {
            if (window.shadow) {
                this.initializeTooltips();
            } else {
                // Wait for shadow DOM to be ready
                const checkShadow = setInterval(() => {
                    if (window.shadow) {
                        this.initializeTooltips();
                        clearInterval(checkShadow);
                    }
                }, 100);
            }
        }

        initializeTooltips() {
            // Create tooltips for each button
            Object.entries(window.tooltipConfig).forEach(([buttonId, tooltipText]) => {
                const button = window.shadow.querySelector(`#${buttonId}`);
                if (!button) {
                    // Only log missing buttons in debug mode to reduce console spam
                    if (window.debugMode) {
                        console.log(`Tooltip: Button #${buttonId} not found in DOM`);
                    }
                    return;
                }
                if (button && !button.querySelector('.tooltip')) {
                    const tooltip = document.createElement('div');
                    tooltip.className = 'tooltip';
                    tooltip.textContent = tooltipText;

                    // Check button location
                    const isWindowBarButton = button.closest('#window_bar') !== null;
                    const isOverlayButton = button.closest('#pnl_overlay') !== null;
                    const isNavigatorButton = button.closest('#pnl_navigator') !== null;
                    const isPropertiesButton = button.closest('#pnl_properties') !== null;
                    const isElementActionPanel = button.closest('.element-action-panel') !== null;

                    // Add appropriate class based on position
                    if (isWindowBarButton) {
                        tooltip.classList.add('tooltip-bottom');
                    } else if (isOverlayButton) {
                        tooltip.classList.add('tooltip-bottom');
                    } else if (isNavigatorButton) {
                        tooltip.classList.add('tooltip-bottom');
                    } else if (isPropertiesButton) {
                        tooltip.classList.add('tooltip-bottom');
                    } else if (isElementActionPanel) {
                        tooltip.classList.add('tooltip-bottom');
                    } else {
                        tooltip.classList.add('tooltip-top');
                    }

                    // Special case: always force tooltip-bottom for navigator buttons
                    if (buttonId === 'btn_navigator_collapse' || buttonId === 'btn_navigator_close') {
                        tooltip.classList.remove('tooltip-top');
                        tooltip.classList.add('tooltip-bottom');
                    }

                    // Special case: use right positioning for download and paste buttons
                    if (buttonId.includes('download') || buttonId.includes('paste')) {
                        tooltip.classList.remove('tooltip-top');
                        tooltip.classList.add('tooltip-bottom');
                        // Add class to use existing right positioning CSS
                        tooltip.classList.add('tooltip-right');
                    }

                    // Append tooltip as a child of the button for correct positioning
                    button.appendChild(tooltip);

                    // Add hover effects
                    button.addEventListener('mouseenter', () => {
                        tooltip.style.opacity = '1';
                    });

                    button.addEventListener('mouseleave', () => {
                        tooltip.style.opacity = '0';
                    });

                    // Set relative positioning for all buttons except specific ones
                    if (buttonId !== 'btn_remove_inspecta' && !buttonId.startsWith('btn_theme') && buttonId !== 'btn_settings') {
                        button.style.position = 'relative';
                    }

                    // console.log(`Tooltip: Successfully initialized tooltip for #${buttonId}`);
                }
            });
        }

        toggleTooltipMode(buttonId, mode) {
            const button = window.shadow.querySelector(`#${buttonId}`);
            if (button) {
                const tooltip = button.querySelector('.tooltip');
                if (tooltip) {
                    // Update tooltip text based on mode
                    switch (buttonId) {
                        case 'btn_close_properties_pnl':
                            tooltip.textContent = mode === 'maximize' ? 'Expand Panel' : 'Collapse Panel';
                            break;
                        case 'btn_inspect_preview_toggle':
                            tooltip.textContent = mode === 'preview' ? 'Toggle Inspect Mode On' : 'Toggle Inspect Mode Off';
                            break;
                        case 'btn_toggle_pnl_items':
                            // Get the current icon to determine state
                            const expandIcon = button.querySelector("use");
                            const isExpanded = expandIcon && expandIcon.getAttribute("href") === "#ic_expand_all";
                            tooltip.textContent = isExpanded ? 'Expand All' : 'Collpase All';
                            break;
                        default:
                            // Keep original tooltip text for other buttons
                            tooltip.textContent = window.tooltipConfig[buttonId] || tooltip.textContent;
                    }
                }
            }
        }
    };
}

// Initialize tooltips when the document is ready
document.addEventListener('DOMContentLoaded', () => {
    window.tooltipManager = new window.TooltipManager();
}); 