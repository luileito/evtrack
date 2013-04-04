/*! evtrack -- Load module */

/**
 * A small lib to track the user activity by listening to browser events.
 * @author Luis Leiva
 * @version 0.2
 * @license Dual licensed under the MIT and GPL licenses.
 */
(function(){

  // Delay recording function until all libs are fully loaded
  var _cache;
  window.TrackUI = {
    record: function(opts) {
      _cache = function() { window.TrackUI.record(opts); }
    }
  };
  
  function createScript(filepath) {
    var scriptElem = document.createElement('script');
    scriptElem.type = "text/javascript";
    scriptElem.src = filepath;
    return scriptElem;
  };
  
  // Grab path of currently executing script
  var scripts = document.getElementsByTagName('script');
  var currentScript = scripts[scripts.length - 1];
  // Remove filename
  var pathParts = currentScript.src.split("/");
  pathParts.splice(pathParts.length - 1, 1);
  // Now we have the full script path
  var path = pathParts.join("/");
  // Load libs accordingly. TODO: implement a 'promise' load pattern
  var ext = pathParts[pathParts.length - 1] == "src" ? ".js" : ".min.js";
  var aux = createScript(path + "/" + "tracklib" + ext);
  currentScript.parentNode.insertBefore(aux, currentScript.nextSibling);
  aux.onload = function() {
    var record = createScript(path + "/" + "trackui" + ext);  
    currentScript.parentNode.insertBefore(record, aux.nextSibling);
    record.onload = function() {
      _cache();
    };
    // Finally remove loader script
    currentScript.parentNode.removeChild(currentScript);
  };

})();
