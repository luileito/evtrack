/*! evtrack -- Load module */

/**
 * A small lib to track the user activity by listening to browser events.
 * @author Luis Leiva
 * @version 0.3
 * @license Dual licensed under the MIT and GPL licenses.
 */
(function() {
    // Grab path of currently executing script
    var scripts = document.getElementsByTagName('script');
    var currentScript = scripts[scripts.length - 1];
    // Remove filename
    var pathParts = currentScript.src.split('/');
    pathParts.splice(pathParts.length - 1, 1);
    // Now we have the full script path
    var PATH = pathParts.join('/');
    // Load libs accordingly
    var EXT = pathParts[pathParts.length - 1] == 'src' ? '.js' : '.min.js';

    var deferredInit;
    // Delay tracking execution until everything is loaded
    window.TrackUI = {
        record: function(opts) {
            deferredInit = function() {
                window.TrackUI.record(opts);
            };
        },
    };

    var loaders = ['json2', 'tracklib', 'trackui'];
    for (var lib in loaders) {
        loadLibFile(loaders[lib], done);
    }

    function loadLibFile(jsModule, callback) {
        var lib = createScript(PATH + '/' + jsModule + EXT);
        currentScript.parentNode.insertBefore(lib, currentScript);
        lib.onload = function() {
            callback();
        };
    };

    function done() {
        loaders.shift();
        if (loaders.length === 0) {
            // Remove load.js and execute init fn
            currentScript.parentNode.removeChild(currentScript);
            if (typeof deferredInit === 'function') deferredInit();
        }
    };

    function createScript(filepath) {
        var scriptElem = document.createElement('script');
        scriptElem.type = 'text/javascript';
        scriptElem.src = filepath;
        return scriptElem;
    };
})();
