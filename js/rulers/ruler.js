let rulersGuidesObj;
let windowHeight = document.body.scrollHeight;
function initRuler() {
    var evt = new Event();
    let dragdrop = new Dragdrop(evt);
    rulersGuidesObj = new RulersGuides(evt, dragdrop, windowHeight);
    setTimeout(() => { rulersGuidesObj.disable(); }, 100);
}
function hideGuides() {
    rulersGuidesObj.disable();
}
function showGuides() {
    rulersGuidesObj.enable();
}