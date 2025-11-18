// This file can be imported inside the service worker,
// which means all of its functions and variables will be accessible
// inside the service worker.
// The importation is done in the file `service-worker.js`.

console.log("External file is also loaded!")
// fetch(chrome.runtime.getURL('/test.html')).then(r => r.text()).then(html => {
//     console.log('here',html)
//     //document.body.insertAdjacentHTML('beforeend', html);
//     // not using innerHTML as it would break js event listeners of the page
//   });