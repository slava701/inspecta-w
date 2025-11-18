let enableDistances = false;

// Helper function to get the correct DOM context (shadow DOM or main document)
function getDOMContext() {
    return window.shadow || document;
}
function drawDistanceXParentChild(rect1, rect2, isHoverElementParent, isHoverElementChild) {
    let leftDistanceX = Math.abs(rect1.left - rect2.left);
    let rightDistanceX = Math.abs(rect1.right - rect2.right);
    let leftLineXPositionLeft = isHoverElementParent ? rect2.left : rect1.left;
    let leftLabelXPositionLeft = (isHoverElementParent ? rect2.left : rect1.left) + leftDistanceX / 2;
    let rightLineXPositionLeft = isHoverElementParent ? rect1.right : rect2.right;
    let rightLabelXPositionLeft = (isHoverElementParent ? rect1.right : rect2.right) + rightDistanceX / 2;
    let linesXPositionTop = (isHoverElementChild ? rect2.top + rect2.height / 2 : rect1.top + rect1.height / 2) + window.scrollY;

    // Left side distance line
    let leftLineX = getDOMContext().querySelector('#distanceLineX-parent-left');
    let leftLabelX = getDOMContext().querySelector('#labelX-parent-left');
    let rightLineX = getDOMContext().querySelector('#distanceLineX-parent-right');
    let rightLabelX = getDOMContext().querySelector('#labelX-parent-right');

    if (!isHoverElementParent && !isHoverElementChild && (leftLineX !== undefined && leftLineX !== null)) leftLineX.style.display = 'none';
    if (!isHoverElementParent && !isHoverElementChild && (leftLabelX !== undefined && leftLabelX !== null)) leftLabelX.style.display = 'none';
    if (!isHoverElementParent && !isHoverElementChild && (rightLineX !== undefined && rightLineX !== null)) rightLineX.style.display = 'none';
    if (!isHoverElementParent && !isHoverElementChild && (rightLabelX !== undefined && rightLabelX !== null)) rightLabelX.style.display = 'none';
    if (!isHoverElementParent && !isHoverElementChild) return;

    if (leftLineX === undefined || leftLineX === null) {
        leftLineX = document.createElement('div');
        leftLineX.id = 'distanceLineX-parent-left';
        leftLineX.classList.add('inspecta-lines-distance-x');
        getDOMContext().appendChild(leftLineX);
    }

    if (leftLabelX === undefined || leftLabelX === null) {
        leftLabelX = document.createElement('div');
        leftLabelX.id = 'labelX-parent-left';
        leftLabelX.classList.add('inspecta-lines-distance-label-x');
        getDOMContext().appendChild(leftLabelX);
    }
    if (leftDistanceX >= 0) {
        leftLineX.style.display = 'block';
        leftLineX.style.width = leftDistanceX + 'px';
        leftLineX.style.left = leftLineXPositionLeft + 'px'; //rect1.left > rect2.right ? rect2.right + 'px' : (rect1.right < rect2.left ? rect1.right : 0  );
        leftLineX.style.top = linesXPositionTop + 'px';//(rect2.top + rect2.height / 2) + window.scrollY + 'px';
        leftLabelX.textContent = Math.round(leftDistanceX);

        leftLabelX.style.left = leftLabelXPositionLeft + 'px';
        leftLabelX.style.top = linesXPositionTop + 'px';//(rect2.top + rect2.height / 2) + window.scrollY + 'px';
        leftLabelX.style.display = 'block';
    }
    else {
        leftLineX.style.display = 'none';
        leftLabelX.style.display = 'none';
    }

    // Right side distance line
    if (rightLineX === undefined || rightLineX === null) {
        rightLineX = document.createElement('div');
        rightLineX.id = 'distanceLineX-parent-right';
        rightLineX.classList.add('inspecta-lines-distance-x');
        getDOMContext().appendChild(rightLineX);
    }

    if (rightLabelX === undefined || rightLabelX === null) {
        rightLabelX = document.createElement('div');
        rightLabelX.id = 'labelX-parent-right';
        rightLabelX.classList.add('inspecta-lines-distance-label-x');
        getDOMContext().appendChild(rightLabelX);
    }
    if (rightDistanceX >= 0) {
        rightLineX.style.display = 'block';
        rightLineX.style.width = rightDistanceX + 'px';
        rightLineX.style.left = rightLineXPositionLeft + 'px'; //rect1.left > rect2.right ? rect2.right + 'px' : (rect1.right < rect2.left ? rect1.right : 0  );
        rightLineX.style.top = linesXPositionTop + 'px';//(rect2.top + rect2.height / 2) + window.scrollY + 'px';
        rightLabelX.textContent = Math.round(rightDistanceX);

        rightLabelX.style.left = rightLabelXPositionLeft + 'px';
        rightLabelX.style.top = linesXPositionTop + 'px';//(rect2.top + rect2.height / 2) + window.scrollY + 'px';
        rightLabelX.style.display = 'block';
    }
    else {
        rightLineX.style.display = 'none';
        rightLabelX.style.display = 'none';
    }


}

function drawDistanceYParentChild(rect1, rect2, isHoverElementParent, isHoverElementChild) {
    let topDistanceY = Math.abs(rect1.top - rect2.top);
    let bottomDistanceY = Math.abs(rect1.bottom - rect2.bottom);
    let topLineYtop = isHoverElementParent ? rect2.top : rect1.top;
    let topLabelYTop = (isHoverElementParent ? rect2.top : rect1.top) + topDistanceY / 2;
    let bottomLineYtop = isHoverElementParent ? rect1.bottom : rect2.bottom;
    let bottomLabelYTop = (isHoverElementParent ? rect1.bottom : rect2.bottom) + bottomDistanceY / 2;


    let topLineY = getDOMContext().querySelector('#distanceLineY-parent-top');
    let topLabelY = getDOMContext().querySelector('#labelY-parent-top');
    let bottomLineY = getDOMContext().querySelector('#distanceLineY-parent-bottom');
    let bottomLabelY = getDOMContext().querySelector('#labelY-parent-bottom');

    if (!isHoverElementParent && !isHoverElementChild && (topLineY !== undefined && topLineY !== null)) topLineY.style.display = 'none';
    if (!isHoverElementParent && !isHoverElementChild && (topLabelY !== undefined && topLabelY !== null)) topLabelY.style.display = 'none';
    if (!isHoverElementParent && !isHoverElementChild && (bottomLineY !== undefined && bottomLineY !== null)) bottomLineY.style.display = 'none';
    if (!isHoverElementParent && !isHoverElementChild && (bottomLabelY !== undefined && bottomLabelY !== null)) bottomLabelY.style.display = 'none';
    if (!isHoverElementParent && !isHoverElementChild) return;

    if (topLineY === undefined || topLineY === null) {
        topLineY = document.createElement('div');
        topLineY.id = 'distanceLineY-parent-top';
        topLineY.classList.add('inspecta-lines-distance-y');
        getDOMContext().appendChild(topLineY);
    }

    if (topLabelY === undefined || topLabelY === null) {
        topLabelY = document.createElement('div');
        topLabelY.id = 'labelY-parent-top';
        topLabelY.classList.add('inspecta-lines-distance-label-y');
        getDOMContext().appendChild(topLabelY);
    }

    if (bottomLineY === undefined || bottomLineY === null) {
        bottomLineY = document.createElement('div');
        bottomLineY.id = 'distanceLineY-parent-bottom';
        bottomLineY.classList.add('inspecta-lines-distance-y');
        getDOMContext().appendChild(bottomLineY);
    }
    if (bottomLabelY === undefined || bottomLabelY === null) {
        bottomLabelY = document.createElement('div');
        bottomLabelY.id = 'labelY-parent-bottom';
        bottomLabelY.classList.add('inspecta-lines-distance-label-y');
        getDOMContext().appendChild(bottomLabelY);
    }

    if (topDistanceY >= 0) {
        //topLabelYTop = topLabelYTop; //+ (isHoverElementAbove ? 0 : 10);
        topLineY.style.height = topDistanceY + 'px';
        topLineY.style.left = (rect2.left + rect2.width / 2) + 'px';
        topLineY.style.top = topLineYtop + window.scrollY + 'px';
        topLineY.style.display = 'block';

        topLabelY.style.position = 'absolute';
        topLabelY.style.left = (rect2.left + rect2.width / 2) + 'px';
        topLabelY.style.top = topLabelYTop + window.scrollY + 'px';//(Math.min(rect2.bottom, rect1.top) + distanceY / 2) + 'px';
        // labelY.style.left = (rect1.left + rect1.width / 2) + 'px';
        // labelY.style.top = (Math.min(rect1.top, rect2.top) + distanceY / 2) + 'px';
        topLabelY.textContent = Math.round(topDistanceY);
        topLabelY.style.display = 'block';
    }
    else {
        topLineY.style.display = 'none';
        topLabelY.style.display = 'none';
    }
    if (bottomDistanceY >= 0) {
        bottomLabelYTop = bottomLabelYTop;// + (isHoverElementBelow ? 0 : 10);
        bottomLineY.style.height = bottomDistanceY + 'px';
        bottomLineY.style.left = (rect2.left + rect2.width / 2) + 'px';
        bottomLineY.style.top = bottomLineYtop + window.scrollY + 'px';
        bottomLineY.style.display = 'block';

        bottomLabelY.style.position = 'absolute';
        bottomLabelY.style.left = (rect2.left + rect2.width / 2) + 'px';
        bottomLabelY.style.top = bottomLabelYTop + window.scrollY + 'px';//(Math.min(rect2.bottom, rect1.top) + distanceY / 2) + 'px';
        bottomLabelY.textContent = Math.round(bottomDistanceY);
        bottomLabelY.style.display = 'block';
    }
    else {
        bottomLineY.style.display = 'none';
        bottomLabelY.style.display = 'none';
    }
    //if the hover element is above the target element

}


function drawDistanceX(element1, element2) {
    const rect1 = element1.getBoundingClientRect();
    const rect2 = element2.getBoundingClientRect();

    let isHoverElementOnLeft = rect1.left > rect2.right;
    let isHoverElementOnRight = rect1.right < rect2.left;
    let isHoverElementInside = rect1.left >= rect2.left && rect1.right <= rect2.right && rect1.top >= rect2.top && rect1.bottom <= rect2.bottom;

    let distanceX;
    let lineXPositionLeft = 0;
    let labelXPositionLeft;
    if (isHoverElementOnLeft) {
        distanceX = Math.abs(rect1.left - rect2.right);
        lineXPositionLeft = rect2.right;
        labelXPositionLeft = rect2.right + distanceX / 2;
    }
    else {
        if (isHoverElementOnRight) {
            distanceX = Math.abs(rect1.right - rect2.left);
            lineXPositionLeft = rect1.right;
            labelXPositionLeft = rect1.right + distanceX / 2;
        }
    }
    let lineX = getDOMContext().querySelector('#distanceLineX');
    if (lineX === undefined || lineX === null) {
        lineX = document.createElement('div');
        lineX.id = 'distanceLineX';
        lineX.classList.add('inspecta-lines-distance-x');
        getDOMContext().appendChild(lineX);
    }
    let labelX = getDOMContext().querySelector('#labelX');
    if (labelX === undefined || labelX === null) {
        labelX = document.createElement('div');
        labelX.id = 'labelX';
        labelX.classList.add('inspecta-lines-distance-label-x');
        getDOMContext().appendChild(labelX);
    }
    if (distanceX >= 0) {
        lineX.style.display = 'block';
        lineX.style.width = distanceX + 'px';
        lineX.style.left = lineXPositionLeft + 'px'; //rect1.left > rect2.right ? rect2.right + 'px' : (rect1.right < rect2.left ? rect1.right : 0  );
        lineX.style.top = (rect2.top + rect2.height / 2) + window.scrollY + 'px';
        labelX.textContent = Math.round(distanceX);

        labelX.style.left = labelXPositionLeft + 'px';
        labelX.style.top = (rect2.top + rect2.height / 2) + window.scrollY + 'px';
        labelX.style.display = 'block';
    }
    else {
        lineX.style.display = 'none';
        labelX.style.display = 'none';
    }
}




function drawDistanceY(element1, element2) {
    const rect1 = element1.getBoundingClientRect();
    const rect2 = element2.getBoundingClientRect();


    let isHoverElementAbove = rect1.top > rect2.bottom;
    let isHoverElementBelow = rect1.bottom < rect2.top;
    let isHoverElementInside = rect1.left > rect2.left && rect1.right < rect2.right && rect1.top > rect2.top && rect1.bottom < rect2.bottom;

    let distanceY;
    let lineYtop = 0;
    let labelYTop;

    //if the hover element is above the target element
    if (isHoverElementAbove) {
        distanceY = Math.abs(rect1.top - rect2.bottom); //+ window.scrollY;
        lineYtop = rect2.bottom + window.scrollY;
        labelYTop = (rect2.bottom + distanceY / 2) + window.scrollY - 10;
    }
    else {
        if (isHoverElementBelow) {
            distanceY = Math.abs(rect1.bottom - rect2.top);// + window.scrollY;
            lineYtop = rect1.bottom + window.scrollY;
            labelYTop = (rect1.bottom + distanceY / 2) + window.scrollY - 20;
        }
    }
    // Create new div elements for the lines
    let lineY = getDOMContext().querySelector('#distanceLineY');
    if (lineY === undefined || lineY === null) {
        lineY = document.createElement('div');
        lineY.id = 'distanceLineY';
        lineY.classList.add('inspecta-lines-distance-y');
        getDOMContext().appendChild(lineY);
    }

    let labelY = getDOMContext().querySelector('#labelY');
    if (labelY === undefined || labelY === null) {
        labelY = document.createElement('div');
        labelY.id = 'labelY';
        labelY.classList.add('inspecta-lines-distance-label-y');
        getDOMContext().appendChild(labelY);
    }

    if (distanceY >= 0) {
        labelYTop = labelYTop + (isHoverElementAbove ? 0 : 10);
        lineY.style.height = distanceY + 'px';
        lineY.style.left = (rect2.left + rect2.width / 2) + 'px';
        lineY.style.top = lineYtop + 'px';
        lineY.style.display = 'block';

        labelY.style.position = 'absolute';
        labelY.style.left = (rect2.left + rect2.width / 2) + 'px';
        labelY.style.top = labelYTop + 'px';//(Math.min(rect2.bottom, rect1.top) + distanceY / 2) + 'px';
        labelY.textContent = Math.round(distanceY);
        labelY.style.display = 'block';
    }
    else {
        lineY.style.display = 'none';
        labelY.style.display = 'none';
    }
}

function drawDistance(element1, element2) {
    const rect1 = element1.getBoundingClientRect();
    const rect2 = element2.getBoundingClientRect();

    let isHoverElementOnLeft = rect1.left > rect2.right;
    let isHoverElementOnRight = rect1.right < rect2.left;
    let isHoverElementParent = rect1.left >= rect2.left && rect1.right <= rect2.right && rect1.top >= rect2.top && rect1.bottom <= rect2.bottom;
    let isHoverElementChild = rect2.left >= rect1.left && rect2.right <= rect1.right && rect2.top >= rect1.top && rect2.bottom <= rect1.bottom;

    // Only draw distances if we have valid elements and distances are enabled
    if (enableDistances && element1 && element2) {
        drawDistanceX(element1, element2);
        drawDistanceXParentChild(rect1, rect2, isHoverElementParent, isHoverElementChild);
        drawDistanceYParentChild(rect1, rect2, isHoverElementParent, isHoverElementChild);
        drawDistanceY(element1, element2);
    }
}
let lineTop;
let lineBottom;
let lineLeft;
let lineRight;
function drawLines(element) {
    // Get the bounding client rect of the element
    const rect = element.getBoundingClientRect();

    // Create new div elements for the lines
    lineTop = getDOMContext().querySelector('.inspecta-lines-top');
    if (lineTop === undefined || lineTop === null) {
        lineTop = document.createElement('div');
        lineTop.classList.add('inspecta-lines-top');
        lineTop.style.display = 'none';
        getDOMContext().appendChild(lineTop);
    }
    lineBottom = getDOMContext().querySelector('.inspecta-lines-bottom');
    if (lineBottom === undefined || lineBottom === null) {
        lineBottom = document.createElement('div');
        lineBottom.classList.add('inspecta-lines-bottom');
        lineBottom.style.display = 'none';
        getDOMContext().appendChild(lineBottom);
    }
    lineLeft = getDOMContext().querySelector('.inspecta-lines-left');
    if (lineLeft === undefined || lineLeft === null) {
        lineLeft = document.createElement('div');
        lineLeft.classList.add('inspecta-lines-left');
        lineLeft.style.display = 'none';
        getDOMContext().appendChild(lineLeft);
    }
    lineRight = getDOMContext().querySelector('.inspecta-lines-right');
    if (lineRight === undefined || lineRight === null) {
        lineRight = document.createElement('div');
        lineRight.classList.add('inspecta-lines-right');
        lineRight.style.display = 'none';
        getDOMContext().appendChild(lineRight);
    }
    lineTop.style.top = rect.top + window.scrollY + 'px';
    lineBottom.style.top = rect.bottom + window.scrollY + 'px';
    lineLeft.style.left = rect.left + 'px';
    lineRight.style.left = rect.right + 'px';
}
function hideDistances() {
    enableDistances = false;
    if (lineTop) lineTop.style.display = 'none';
    if (lineBottom) lineBottom.style.display = 'none';
    if (lineLeft) lineLeft.style.display = 'none';
    if (lineRight) lineRight.style.display = 'none';
    let lineX = getDOMContext().querySelector('#distanceLineX');
    if (lineX) lineX.style.display = 'none';
    let labelX = getDOMContext().querySelector('#labelX');
    if (labelX) labelX.style.display = 'none';
    let lineY = getDOMContext().querySelector('#distanceLineY');
    if (lineY) lineY.style.display = 'none';
    let labelY = getDOMContext().querySelector('#labelY');
    if (labelY) labelY.style.display = 'none';
    let lineXParentLeft = getDOMContext().querySelector('#distanceLineX-parent-left');
    if (lineXParentLeft) lineXParentLeft.style.display = 'none';
    let labelXParentLeft = document.querySelector('#labelX-parent-left');
    if (labelXParentLeft) labelXParentLeft.style.display = 'none';
    let lineXParentRight = getDOMContext().querySelector('#distanceLineX-parent-right');
    if (lineXParentRight) lineXParentRight.style.display = 'none';
    let labelXParentRight = document.querySelector('#labelX-parent-right');
    if (labelXParentRight) labelXParentRight.style.display = 'none';
    let lineYParentTop = getDOMContext().querySelector('#distanceLineY-parent-top');
    if (lineYParentTop) lineYParentTop.style.display = 'none';
    let labelYParentTop = document.querySelector('#labelY-parent-top');
    if (labelYParentTop) labelYParentTop.style.display = 'none';
    let lineYParentBottom = getDOMContext().querySelector('#distanceLineY-parent-bottom');
    if (lineYParentBottom) lineYParentBottom.style.display = 'none';
    let labelYParentBottom = document.querySelector('#labelY-parent-bottom');
    if (labelYParentBottom) labelYParentBottom.style.display = 'none';
}
function resumeDistances() {
    enableDistances = true;
    if (lineTop) lineTop.style.display = 'block';
    if (lineBottom) lineBottom.style.display = 'block';
    if (lineLeft) lineLeft.style.display = 'block';
    if (lineRight) lineRight.style.display = 'block';
    let lineX = getDOMContext().querySelector('#distanceLineX');
    if (lineX) lineX.style.display = 'block';
    let labelX = getDOMContext().querySelector('#labelX');
    if (labelX) labelX.style.display = 'block';
    let lineY = getDOMContext().querySelector('#distanceLineY');
    if (lineY) lineY.style.display = 'block';
    let labelY = getDOMContext().querySelector('#labelY');
    if (labelY) labelY.style.display = 'block';
    let lineXParentLeft = getDOMContext().querySelector('#distanceLineX-parent-left');
    if (lineXParentLeft) lineXParentLeft.style.display = 'block';
    let labelXParentLeft = document.querySelector('#labelX-parent-left');
    if (labelXParentLeft) labelXParentLeft.style.display = 'block';
    let lineXParentRight = getDOMContext().querySelector('#distanceLineX-parent-right');
    if (lineXParentRight) lineXParentRight.style.display = 'block';
    let labelXParentRight = document.querySelector('#labelX-parent-right');
    if (labelXParentRight) labelXParentRight.style.display = 'block';
    let lineYParentTop = getDOMContext().querySelector('#distanceLineY-parent-top');
    if (lineYParentTop) lineYParentTop.style.display = 'block';
    let labelYParentTop = document.querySelector('#labelY-parent-top');
    if (labelYParentTop) labelYParentTop.style.display = 'block';
    let lineYParentBottom = getDOMContext().querySelector('#distanceLineY-parent-bottom');
    if (lineYParentBottom) lineYParentBottom.style.display = 'block';
    let labelYParentBottom = document.querySelector('#labelY-parent-bottom');
    if (labelYParentBottom) labelYParentBottom.style.display = 'block';
}