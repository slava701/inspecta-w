// This script gets injected into any opened page
// whose URL matches the pattern defined in the manifest
// (see "content_script" key).
// Several foreground scripts can be declared
// and injected into the same or different pages.
// function loadLibrary(src, type) {
//   return new Promise(function (resolve, reject) {
//     let scriptEle = document.createElement("script");
//     scriptEle.setAttribute("type", type);
//     scriptEle.setAttribute("src", src);
//     document.body.appendChild(scriptEle);
//     scriptEle.addEventListener("load", () => {
//       console.log(src + " loaded")
//       resolve(true);
//     });
//     scriptEle.addEventListener("error", (ev) => {
//       console.log("Error on loading " + src, ev);
//       reject(ev);
//     });
//   });
// }
//init();
// async function init() {
//   const resourcesURL = new URL(chrome.runtime.getURL("/js/"));
//   await loadLibrary(resourcesURL + "myjs.js", "text/javascript");
//   await loadLibrary(resourcesURL + "main.js", "text/javascript");
//   await loadLibrary(resourcesURL + "utils.js", "text/javascript");
//   await loadLibrary(resourcesURL + "cssgenerator.js", "text/javascript");
// }
// fetch(chrome.runtime.getURL('/index.html')).then(r => r.text()).then(html => {
//   document.body.insertAdjacentHTML('beforeend', html);
// }).catch(error => {
//   console.log('error', error)
// });

// chrome.runtime.onMessage.addListener(messageReciver);
// function messageReciver(msg, sender, sendResponse) {
//   // let isContext = msg === 'context';
 
//   if (appToggle) {
//     console.log('appToggle true, removing');
//     appToggle = false;
//     removeWEApp();
//     return
//   }
//   else {
//     console.log('appToggle false, adding');
//     appToggle = true;
//     // Always show WE APP from context and extention nav
//     showInspectaApp()
//   }

// }