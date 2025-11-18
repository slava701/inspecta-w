//const DEFAULT_OPACITY = 50;
let overlayImage;
let opacitySlider;
let in_upload_img;
let in_upload_img_hint;
let in_over_delete_image;
let in_paste_img;
let in_paste_img_hint;
// let in_upload_paster_image_hint_text;


let in_overlay_image_invert;

//overlay image arrows
let in_overlay_image_center;
let over_up;
let over_down;
let over_left;
let over_right;
let over_top_left;
let over_top_right;
let over_bottom_left;
let over_bottom_right;

let in_overlay_image_hide_show;
let in_overlay_image_lock;
let overlay_device_input_ratio;
let overlay_image_name;
//let in_overlay_image_mask;
let over_selected_img;
let txt_overlay_image_size;
let isDragging = false;
let isLocked = false; // Variable to track disabled state
let isInvertOn = false; // Variable to track Invert state
let isSepiaOn = false; // Variable to track Sepia state
let offsetX, offsetY;

function initOverlay() {

    in_upload_img = shadow.getElementById('in_upload_img');
    in_upload_img_hint = shadow.getElementById('in_upload_img_hint');
    // in_upload_paster_image_hint_text = shadow.getElementById('in_upload_paster_image_hint_text');

    in_over_delete_image = shadow.getElementById('in_over_delete_image');
    in_paste_img = shadow.getElementById('in_paste_img');
    in_paste_img_hint = shadow.getElementById('in_paste_img_hint');
    in_overlay_image_invert = shadow.getElementById('in_overlay_image_invert');

    //overlay image arrows
    in_overlay_image_center = shadow.getElementById('in_overlay_image_center');
    over_up = shadow.getElementById('over_up');
    over_down = shadow.getElementById('over_down');
    over_left = shadow.getElementById('over_left');
    over_right = shadow.getElementById('over_right');
    over_top_left = shadow.getElementById('over_top_left');
    over_top_right = shadow.getElementById('over_top_right');
    over_bottom_left = shadow.getElementById('over_bottom_left');
    over_bottom_right = shadow.getElementById('over_bottom_right');



    over_selected_img = shadow.getElementById('over_selected_img');
    in_overlay_image_hide_show = shadow.getElementById('in_overlay_image_hide_show');
    in_overlay_image_lock = shadow.getElementById('in_overlay_image_lock');
    txt_overlay_image_size = shadow.getElementById('txt_overlay_image_size');
    overlay_image_name = shadow.getElementById('overlay_image_name');
    overlay_device_input_ratio = shadow.getElementById('overlay_device_input_ratio');
    //in_overlay_image_mask = shadow.getElementById('in_overlay_image_mask');
    overlayImage = shadow.getElementById('overlayImage');
    if (overlayImage === null) {
        overlayImage = document.createElement('img');
        overlayImage.id = 'overlayImage';
        //overlayImage.src = 'https://www.w3schools.com/w3images/lights.jpg';
        overlayImage.classList.add('image-overlay');
        document.body.appendChild(overlayImage);

        uploadImageInput = document.createElement('input');
        uploadImageInput.type = 'file';
        uploadImageInput.id = 'imageUploadInput';
        uploadImageInput.accept = 'image/*';
        uploadImageInput.addEventListener('change', handleImageUpload);
        uploadImageInput.style.display = 'none';

    }
    overlayImage.style.opacity = 0.5;
    opacitySlider = shadow.getElementById('opacitySlider');
    opacitySlider.addEventListener('input', opacitySliderChange);
    //over_selected_img.addEventListener('click', onUploadImage);
    //ZZZ
    overlay_device_input_ratio.value = (1 / window.devicePixelRatio).toFixed(2);
    initEventsListeners();
}
function initEventsListeners() {
    /// Event listeners for drag and drop
    // Event listeners for drag and drop
    overlayImage.addEventListener('mousedown', startDragging);
    document.addEventListener('mousemove', dragImage);
    document.addEventListener('mouseup', stopDragging);
    //aaa

    // Event listener to change label after locking image
    // shadow.getElementById('draggingButton').addEventListener('click', function () {
    //     if (isDisabled) {
    //         shadow.getElementById('draggingButton').innerText = 'Unlock Image';
    //     } else {
    //         shadow.getElementById('draggingButton').innerText = 'Lock Image';
    //     }
    // });

    // Event listeners for move buttons
    over_up.addEventListener('click', moveUp);
    over_down.addEventListener('click', moveDown);
    over_left.addEventListener('click', moveLeft);
    over_right.addEventListener('click', moveRight);

    in_over_delete_image.addEventListener('click', function (e) {
        overlayImage.style.display = 'none';
        // in_over_delete_image.classList.add('hide-delete-image');
        over_selected_img.style.backgroundImage = '';
        overlayImage.style.width = null;
        overlayImage.style.height = null;
        e.preventDefault();
        e.stopPropagation();
        in_over_delete_image.classList.add('hide-delete-image');
        overlay_image_name.innerText = '';
        //overlayImage.src = 'unset';
        overlayImage.removeAttribute('src');
        uploadImageInput.value = '';
        showHideUploadAndPasteButtonsHint(true);
        pnl_overlay.classList.add('pnl_overlay_no_image_selected');
        //overlayImage.src = '';
    });



    in_paste_img.addEventListener('click', onPasteImage);
    in_paste_img_hint.addEventListener('click', onPasteImage);
    in_upload_img.addEventListener('click', onUploadImage);
    in_upload_img_hint.addEventListener('click', onUploadImage);

    in_overlay_image_invert.addEventListener('click', function () {
        toggleInvert();
        if (isInvertOn) {
            in_overlay_image_invert.classList.add('inspecta-active');
        }
        else {
            in_overlay_image_invert.classList.remove('inspecta-active');
        }
    });
    in_overlay_image_center.addEventListener('click', function () {
        centerImage();
    });

    over_top_left.addEventListener('click', topLeftOverlay);
    over_top_right.addEventListener('click', topRightOverlay);
    over_bottom_right.addEventListener('click', bottomRightOverlay);
    over_bottom_left.addEventListener('click', bottomLeftOverlay);

    in_overlay_image_hide_show.addEventListener('click', function () {
        toggleOverlayImage();
        if (overlayImage.style.display === 'none') {
            in_overlay_image_hide_show.classList.add('inspecta-active');
        }
        else {
            in_overlay_image_hide_show.classList.remove('inspecta-active');
        }
    });
    in_overlay_image_lock.addEventListener('click', function () {
        toggleDragging();
        if (isLocked) {
            in_overlay_image_lock.classList.add('inspecta-active');
            overlayImage.style.pointerEvents = 'none';
        }
        else {
            in_overlay_image_lock.classList.remove('inspecta-active');
            overlayImage.style.pointerEvents = 'unset';
        }
    });
    // overlay_device_input_ratio.addEventListener('keyup', function (e) {

    // });
    // overlay_device_input_ratio.addEventListener('keyup', function (e) {
    //     //overlay_device_input_ratio.value = 1 / window.devicePixelRatio;
    //     todo: 'change the image size according to the screen density and zoom';
    //     console.log('e.target.value', e.target.value);
    //     var adjustedWidth = originalImageWidth * e.target.value;
    //     var adjustedHeight = originalImageHeight * e.target.value;
    //     overlayImage.style.width = adjustedWidth + 'px';
    //     overlayImage.style.height = adjustedHeight + 'px';
    //     txt_overlay_image_size.innerText = parseInt(adjustedWidth) + 'px' + ' x ' + parseInt(adjustedHeight) + 'px';
    // });
    overlay_device_input_ratio.addEventListener('keyup', onScaleChange);
    overlay_device_input_ratio.addEventListener('change', onScaleChange);
    // overlay_device_input_ratio.addEventListener('change', function (e) {
    //     //overlay_device_input_ratio.value = 1 / window.devicePixelRatio;
    //     console.log('e.target.value', e.target.value);
    //     var adjustedWidth = originalImageWidth * e.target.value;
    //     var adjustedHeight = originalImageHeight * e.target.value;
    //     overlayImage.style.width = adjustedWidth + 'px';
    //     overlayImage.style.height = adjustedHeight + 'px';
    //     txt_overlay_image_size.innerText = parseInt(adjustedWidth) + 'px' + ' x ' + parseInt(adjustedHeight) + 'px';
    // });
    // in_overlay_image_mask.addEventListener('click', function () {
    //     toggleHD();
    // });
    // Event listener for the input file change event
    //shadow.getElementById('imageUploadInput').addEventListener('change', handleImageUpload);
}
function onScaleChange(e) {
    var adjustedWidth = originalImageWidth * e.target.value;
    var adjustedHeight = originalImageHeight * e.target.value;
    overlayImage.style.width = adjustedWidth + 'px';
    overlayImage.style.height = adjustedHeight + 'px';
    //txt_overlay_image_size.innerText = parseInt(adjustedWidth) + 'px' + ' x ' + parseInt(adjustedHeight) + 'px';
}
function opacitySliderChange() {
    updateOpacity();
    //updateMask();
}
// Optional: Toggle the image overlay visibility
function toggleOverlayImage() {

    overlayImage.style.display = (overlayImage.style.display === 'flex') ? 'none' : 'flex';
}

function updateOpacity() {
    var opacityValue = opacitySlider.value / 100;
    overlayImage.style.opacity = opacityValue;
}

// Function to toggle Invert
function toggleInvert() {
    isInvertOn = !isInvertOn;
    overlayImage.style.filter = isInvertOn ? "invert(100%)" : "invert(0%)";
    //shadow.getElementById('invertButton').innerText = isInvertOn ? 'Invert On' : 'Invert Off';
}

// Function to toggle Sepia
function toggleSepia() {
    isSepiaOn = !isSepiaOn;
    overlayImage.style.filter = isSepiaOn ? "sepia(100%)" : "sepia(0%)";
    shadow.getElementById('sepiaButton').innerText = isSepiaOn ? 'Sepia On' : 'Sepia Off';
}



// Function to mask overlay image
function updateMask() {
    //const slider = shadow.getElementById("slider");
    //const image = shadow.getElementById("overlayImage");
    const percentage = opacitySlider.value;
    overlayImage.style.clipPath = `inset(0% ${100 - percentage}% 0% 0% round 0% 0% 0% 0%)`;
}

// // Trigger the updateMask function on page load
// document.addEventListener("DOMContentLoaded", updateMask);

// // Event listener for slider input
// shadow.getElementById("slider").addEventListener("input", updateMask);





function centerImage() {
    // Calculate the dimensions of the overlay image
    var imgWidth = overlayImage.offsetWidth;
    var imgHeight = overlayImage.offsetHeight;

    // Calculate the dimensions of the viewport
    var viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    var viewportHeight = window.innerHeight || document.documentElement.clientHeight;

    // Get the current scroll position
    var scrollX = window.scrollX || window.pageXOffset;
    var scrollY = window.scrollY || window.pageYOffset;

    // Calculate the position to center the overlay image
    var leftPosition = Math.max(0, (viewportWidth - imgWidth) / 2 + scrollX) + 'px';
    var topPosition = Math.max(0, (viewportHeight - imgHeight) / 2 + scrollY) + 'px';

    // Apply styles to position the overlay image
    overlayImage.style.position = 'absolute';
    overlayImage.style.left = leftPosition;
    overlayImage.style.top = topPosition;
}

function topLeftOverlay() {
    var leftPosition = '0px'; // No padding from the left edge
    var topPosition = (window.scrollY) + 'px'; // Use current scroll position
    overlayImage.style.position = 'absolute';
    overlayImage.style.left = leftPosition;
    overlayImage.style.top = topPosition;
    overlayImage.style.bottom = null;
}

function topRightOverlay() {
    var rightPosition = '0px'; // No padding from the right edge
    var topPosition = (window.scrollY) + 'px'; // Use current scroll position
    overlayImage.style.position = 'absolute';
    overlayImage.style.left = null;
    overlayImage.style.right = rightPosition;
    overlayImage.style.top = topPosition;
    overlayImage.style.bottom = null;
}
function bottomRightOverlay() {
    var rightPosition = '0px'; // Stick to right edge
    var topPosition = (window.scrollY + window.innerHeight - overlayImage.offsetHeight) + 'px'; // Top position from scroll
    overlayImage.style.position = 'absolute';
    overlayImage.style.left = null;
    overlayImage.style.right = rightPosition;
    overlayImage.style.top = topPosition;
    overlayImage.style.bottom = null; // Clear this
}

function bottomLeftOverlay() {
    var leftPosition = '0px'; // Stick to left edge
    var topPosition = (window.scrollY + window.innerHeight - overlayImage.offsetHeight) + 'px'; // Top position from scroll
    overlayImage.style.position = 'absolute';
    overlayImage.style.right = null;
    overlayImage.style.left = leftPosition;
    overlayImage.style.top = topPosition;
    overlayImage.style.bottom = null; // Clear this
}
// Function to start dragging
function startDragging(e) {
    e.preventDefault();
    if (isLocked) return; // Do nothing if disabled
    isDragging = true;

    // Add border while dragging
    overlayImage.style.border = '1px solid black';

    // Get the initial mouse position
    offsetX = e.offsetX;
    offsetY = e.offsetY;
}

// Function to drag the image
function dragImage(e) {
    if (!isDragging) return;

    // Calculate the new position based on mouse movement
    var x = e.pageX - offsetX;
    var y = e.pageY - offsetY;
    // Update the position of the dragged image
    overlayImage.style.left = x + 'px';
    overlayImage.style.top = y + 'px';
}

// Function to stop dragging
function stopDragging() {
    if (!isDragging) return;

    isDragging = false;

    // Remove border after dragging
    overlayImage.style.border = 'none';
}

// Function to toggle dragging on button click
function toggleDragging() {
    isLocked = !isLocked;
    overlayImage.style.cursor = isLocked ? 'default' : 'grab'; // Set cursor accordingly
    // shadow.getElementById('draggingButton').innerText = isLocked ? 'Lock Image' : 'Unlock Image';
}

// Function to move the image up
function moveUp() {
    overlayImage.style.top = parseInt(overlayImage.style.top ? overlayImage.style.top : 0) - 1 + 'px';
}

// Function to move the image down
function moveDown() {
    overlayImage.style.top = parseInt(overlayImage.style.top ? overlayImage.style.top : 0) + 1 + 'px';
}

// Function to move the image left
function moveLeft() {
    overlayImage.style.left = parseInt(overlayImage.style.left ? overlayImage.style.left : 0) - 1 + 'px';
}

// Function to move the image right
function moveRight() {
    overlayImage.style.left = parseInt(overlayImage.style.left ? overlayImage.style.left : 0) + 1 + 'px';
}




// Function to update computed size
function updateComputedSize() {
    var computedWidth = parseFloat(window.getComputedStyle(overlayImage).width);
    var computedHeight = parseFloat(window.getComputedStyle(overlayImage).height);

    // Update the content of the elements
    shadow.getElementById('width').innerText = computedWidth + 'px';
    shadow.getElementById('height').innerText = computedHeight + 'px';
}

let isHD = false; // Variable to track HD state
let originalImageWidth; // Store the original width
let originalImageHeight; // Store the original height

// Function to toggle between original dimensions and 50%
function toggleHD() {
    if (!originalWidth) {
        originalWidth = overlayImage.width; // Initialize originalWidth if not set
    }

    if (isHD) {
        // Set the dimensions back to the original size
        overlayImage.style.width = originalWidth + 'px';
    } else {
        // Set the new width (50% of the original)
        overlayImage.style.width = Math.floor(originalWidth * 0.5) + 'px';
    }

    // Toggle the HD state
    isHD = !isHD;
}

// Function to handle pasting images from clipboard
function triggerPaste() {
    navigator.clipboard.readText().then((text) => {
        if (text) {
            // Check if the clipboard content is a valid image URL
            if (text.match(/\.(jpeg|jpg|gif|png)$/) != null) {
                // Set the source of the overlay image
                overlayImage.src = text;
                // Display the image when pasted
                overlayImage.style.display = 'flex';
            } else {
                console.error('Invalid image URL in clipboard');
            }
        } else {
            console.error('No image URL found in clipboard');
        }
    }).catch((err) => {
        console.error('Error reading clipboard text: ', err);
    });
}
function pasteImageFromClipboard(imageElementId) {
    imageElementId = imageElementId || 'overlayImage';
    navigator.clipboard.read().then(items => {
        for (let i = 0; i < items.length; i++) {
            if (items[i].types.includes('image/png')) {
                const blob = items[i].getType('image/png');
                blob.then(response => {
                    let reader = new FileReader();
                    reader.onload = function (e) {
                        var image = new Image();

                        //Set the Base64 string return from FileReader as source.
                        image.src = e.target.result;

                        //Validate the File Height and Width.
                        image.onload = function () {
                            var height = this.height;
                            var width = this.width;
                            originalImageWidth = width;
                            originalImageHeight = height;
                            overlayImage.style.display = 'flex';
                            overlayImage.style.width = this.width + 'px';
                            overlayImage.style.height = this.height + 'px';
                            overlayImage.setAttribute('src', e.target.result);
                            overlayImage.src = e.target.result;
                            overlayImage.style.display = 'flex';
                            overlay_device_input_ratio.value = (1 / window.devicePixelRatio).toFixed(2);;
                            // Update the original width when a new image is uploaded
                            originalWidth = overlayImage.width;
                            // over_selected_img.style.backgroundImage = 'url(' + URL.createObjectURL(file) + ')';
                            // over_selected_img.style.backgroundSize = 'cover';
                            var computedWidth = parseFloat(window.getComputedStyle(overlayImage).width);
                            var computedHeight = parseFloat(window.getComputedStyle(overlayImage).height);
                            // Calculate the image size according to the screen density and zoom
                            var adjustedWidth = computedWidth / window.devicePixelRatio;
                            var adjustedHeight = computedHeight / window.devicePixelRatio;
                            overlayImage.style.width = adjustedWidth + 'px';
                            overlayImage.style.height = adjustedHeight + 'px';
                            //txt_overlay_image_size.innerText = parseInt(adjustedWidth) + 'px' + ' x ' + parseInt(adjustedHeight) + 'px';
                            in_over_delete_image.classList.remove('hide-delete-image');
                            //overlay_image_name.innerText = 'From Clipboard';
                            centerImage();
                            pnl_overlay.classList.remove('pnl_overlay_no_image_selected');
                            //return true;
                        };
                        // shadow.getElementById(imageElementId).src = event.target.result;
                        // shadow.getElementById(imageElementId).style.display = 'flex';
                        over_selected_img.style.backgroundImage = 'url(' + e.target.result + ')';
                        over_selected_img.style.backgroundSize = 'cover';
                        in_over_delete_image.classList.remove('hide-delete-image');
                        showHideUploadAndPasteButtonsHint(false);
                        //toggleHD();
                    };
                    reader.readAsDataURL(response);
                });
            }
        }
    });
}
// Function to handle uploading images from local storage
function handleImageUpload(event) {
    const fileInput = event.target;
    const file = fileInput.files[0];
    overlayImage.style.display = 'flex';
    if (file) {
        const reader = new FileReader();
        // reader.onload = function (e) {
        //     // Set the source of the overlay image
        //     overlayImage.src = e.target.result;
        //     overlayImage.style.display = 'flex';
        //     // Update the original width when a new image is uploaded
        //     originalWidth = overlayImage.width;
        //     over_selected_img.style.backgroundImage = 'url(' + URL.createObjectURL(file) + ')';
        //     over_selected_img.style.backgroundSize = 'cover';
        //     var computedWidth = parseFloat(window.getComputedStyle(overlayImage).width);
        //     var computedHeight = parseFloat(window.getComputedStyle(overlayImage).height);
        //     txt_overlay_image_size.innerText = computedWidth + 'px' + ' x ' + computedHeight + 'px';
        //     in_over_delete_image.classList.remove('hide-delete-image');
        //     //toggleHD();
        // };


        //FROM CHATGPT
        reader.onload = function (e) {
            // Set the source of the overlay image
            var image = new Image();

            //Set the Base64 string return from FileReader as source.
            image.src = e.target.result;

            //Validate the File Height and Width.
            image.onload = function () {
                var height = this.height;
                var width = this.width;
                originalImageWidth = width;
                originalImageHeight = height;

                overlayImage.style.display = 'flex';
                overlayImage.style.width = this.width + 'px';
                overlayImage.style.height = this.height + 'px';
                overlayImage.setAttribute('src', e.target.result);
                overlayImage.src = e.target.result;
                overlayImage.style.display = 'flex';

                overlay_device_input_ratio.value = (1 / window.devicePixelRatio).toFixed(2);;
                // Update the original width when a new image is uploaded
                originalWidth = overlayImage.width;
                over_selected_img.style.backgroundImage = 'url(' + URL.createObjectURL(file) + ')';
                over_selected_img.style.backgroundSize = 'cover';
                var computedWidth = parseFloat(window.getComputedStyle(overlayImage).width);
                var computedHeight = parseFloat(window.getComputedStyle(overlayImage).height);

                // Calculate the image size according to the screen density and zoom
                var adjustedWidth = computedWidth / window.devicePixelRatio;
                var adjustedHeight = computedHeight / window.devicePixelRatio;
                overlayImage.style.width = adjustedWidth + 'px';
                overlayImage.style.height = adjustedHeight + 'px';
                txt_overlay_image_size.innerText = parseInt(adjustedWidth) + 'px' + ' x ' + parseInt(adjustedHeight) + 'px';
                in_over_delete_image.classList.remove('hide-delete-image');
                //overlay_image_name.innerText = file.name;
                showHideUploadAndPasteButtonsHint(false);
                centerImage();
                pnl_overlay.classList.remove('pnl_overlay_no_image_selected');
                //return true;
            };


            // overlayImage.src = e.target.result;
            // overlayImage.style.display = 'flex';
            // // Update the original width when a new image is uploaded
            // originalWidth = overlayImage.width;
            // over_selected_img.style.backgroundImage = 'url(' + URL.createObjectURL(file) + ')';
            // over_selected_img.style.backgroundSize = 'cover';
            // var computedWidth = parseFloat(window.getComputedStyle(overlayImage).width);
            // var computedHeight = parseFloat(window.getComputedStyle(overlayImage).height);
            // console.log('window.devicePixelRatio', window.devicePixelRatio);

            // // Calculate the image size according to the screen density and zoom
            // var adjustedWidth = computedWidth / window.devicePixelRatio;
            // var adjustedHeight = computedHeight / window.devicePixelRatio;
            // overlayImage.style.width = adjustedWidth + 'px';
            // overlayImage.style.height = adjustedHeight + 'px';
            // txt_overlay_image_size.innerText = parseInt(adjustedWidth) + 'px' + ' x ' + parseInt(adjustedHeight) + 'px';
            // in_over_delete_image.classList.remove('hide-delete-image');
            //toggleHD();
        };
        reader.readAsDataURL(file);
        overlayImage.style.display = 'flex';

    }
}

function unloadOverlay() {
    try {
        overlayImage.style.display = 'none';
        //overlayImage.src = '';
        in_over_delete_image.classList.add('hide-delete-image');
        overlay_image_name.innerText = '';
    }
    catch (e) {
        console.log('e', e);
    }
    //overlayImage.style.display = 'none';
    //overlayImage.style.display = 'none';
    //overlayImage.style.display = 'none';
}
function resumeOverlay() {
    if (overlayImage && overlayImage.src !== '') {

        overlayImage.style.display = 'flex';
        in_over_delete_image.classList.remove('hide-delete-image');
    }

}

function onPasteImage() {
    pasteImageFromClipboard('overlayImage');
    // hiding the hint is handles in the pasteImageFromClipboard function
    // showHideUploadAndPasteButtonsHint(false);

}
function onUploadImage() {
    uploadImageInput.click();
    // hiding the hint is handles in the uploadImageInput change event
    // showHideUploadAndPasteButtonsHint(false);

}

function showHideUploadAndPasteButtonsHint(isShow = false) {
    in_paste_img_hint.style.display = isShow ? 'flex' : 'none';
    in_upload_img_hint.style.display = isShow ? 'flex' : 'none';
    // in_upload_paster_image_hint_text.style.display = isShow ? 'flex' : 'none';
}
// Initially hide the image overlay
//overlayImage.style.display = 'none';
