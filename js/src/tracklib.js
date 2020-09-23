/*! evtrack -- Lib module */

/**
 * Auxiliary functions to track the user activity.
 * Written in plain 'ol JavaScript. No dependencies. Also works in old browsers.
 * @namespace TrackLib
 * @author Luis Leiva
 * @version 0.3
 * @license Dual licensed under the MIT and GPL licenses.
 */
var TrackLib = window.TrackLib || {};
/**
 * XPath functions.
 * Code adapted from `window.js`.
 * @see http://code.google.com/p/xpathchecker/
 * @memberof TrackLib
 * @namespace TrackLib.XPath
 * @author Brian Slesinsky (http://slesinsky.org)
 */
TrackLib.XPath = {
    /**
     * Setup DOM iterator.
     * @param {object} document - Source DOM
     * @param {string} xpath - XPath expression
     * @return {object}
     */
    queryXPath: function(document, xpath) {
        var iterator;
        if (typeof document.evaluate === 'function') {
            iterator = document.evaluate(xpath, document.documentElement, null, XPathResult.ANY_TYPE, null);
        } else {
            try {
                // IE5 and later has implemented that [0] should be the first node,
                // but according to the W3C standard it should have been [1]!
                document.setProperty('SelectionLanguage', 'XPath');
                iterator = document.selectNodes(xpath);
            } catch(err) {
                iterator = false;
            }
        }

        return iterator;
    },
    /**
     * Get DOM nodes.
     * @param {object} document - Source DOM
     * @param {string} xpath - XPath expression
     * @return {array}
     */
    getXPathNodes: function(document, xpath) {
        var iterator = this.queryXPath(document, xpath);
        var result = [];
        var item = iterator.iterateNext();
        while (item) {
            result.push(item);
            item = iterator.iterateNext();
        }

        return result;
    },
    /**
     * Get relative (default) or absolute XPath expression of a DOM node.
     * @param {object} targetNode - DOM node
     * @param {boolean} absolute - Flag to return absolute path
     * @return {string}
     */
    getXPath: function(targetNode, absolute) {
        var lowerCase = (targetNode.ownerDocument instanceof HTMLDocument);
        var xNodePath = this.getNodePath(targetNode, absolute);
        var nodeNames = [];
        for (var i in xNodePath) {
            var node = xNodePath[i];
            var nIdx;
            if (node.nodeType == 1) {
                if (i == 0 && !absolute && node.hasAttribute('id')) {
                    nodeNames.push('/*[@id=\'' + node.getAttribute('id') + '\']');
                } else {
                    var tagName = node.tagName;
                    if (lowerCase) {
                        tagName = tagName.toLowerCase();
                    }
                    nIdx = this.getNodeIndex(node);
                    if (nIdx > -1) {
                        nodeNames.push(tagName + '[' + nIdx + ']');
                    } else {
                        nodeNames.push(tagName);
                    }
                }
            } else if (node.nodeType == 3) {
                nIdx = this.getTextNodeIndex(node);
                if (nIdx > -1) {
                    nodeNames.push('text()[' + nIdx + ']');
                } else {
                    nodeNames.push('text()');
                }
            }
        }

        return '/' + nodeNames.join('/');
    },
    /**
     * Get index of DOM node.
     * @param {object} node - DOM node
     * @return {number}
     */
    getNodeIndex: function(node) {
        if (node.nodeType != 1 || node.parentNode == null) return null;
        var list = this.getChildNodesWithTagName(node.parentNode, node.tagName);
        if (list.length == 1 && list[0] == node) return null;
        for (var i = 0; i < list.length; i++) {
            if (list[i] == node) return i + 1;
        }

        return -1;
    },
    /**
     * Get index of text node.
     * @param {object} node - Text node
     * @return {number}
     */
    getTextNodeIndex: function(node) {
        var list = this.getChildTextNodes(node.parentNode);
        if (list.length == 1 && list[0] == node) return null;
        for (var i = 0; i < list.length; i++) {
            if (list[i] == node) return i + 1;
        }

        return -1;
    },
    /**
     * Get DOM node children matching a given tag name.
     * @param {object} parent - DOM node
     * @param {string} tagName - Node tag name
     * @return {array}
     */
    getChildNodesWithTagName: function(parent, tagName) {
        var result = [];
        var child = parent.firstChild;
        while (child != null) {
            if (child.tagName && child.tagName == tagName) {
                result.push(child);
            }
            child = child.nextSibling;
        }

        return result;
    },
    /**
     * Get Text node children of a given node.
     * @param {object} parent - DOM node
     * @return {array}
     */
    getChildTextNodes: function(parent) {
        var result = [];
        var child = parent.firstChild;
        while (child != null) {
            if (child.nodeType == 3) {
                result.push(child);
            }
            child = child.nextSibling;
        }

        return result;
    },
    /**
     * Get list of parent nodes until finding a "good" reference (i.e. a node with an ID attribute).
     * @param {object} node - DOM node
     * @param {boolean} absolute - Flag to return absolute path
     * @return {array}
     */
    getNodePath: function(node, absolute) {
        var result = [];
        while (node.nodeType == 1 || node.nodeType == 3) {
            result.unshift(node);
            if (node.nodeType == 1 && node.hasAttribute('id') && !absolute) return result;
            node = node.parentNode;
        }

        return result;
    },
};
/**
 * Ajax handling.
 * @memberof TrackLib
 * @namespace TrackLib.XHR
 */
TrackLib.XHR = {
    /**
   * Creates an XML/HTTP request to provide async communication with the server.
   * @return {object} XHR object
   * @autor Peter-Paul Koch (http://quirksMode.org)
   */
    createXMLHTTPObject: function() {
        var xmlhttp = false;
        // Current AJAX flavors
        var factories = [
            function() {
                return new XMLHttpRequest();
            },
            function() {
                return new ActiveXObject('Msxml2.XMLHTTP');
            },
            function() {
                return new ActiveXObject('Msxml3.XMLHTTP');
            },
            function() {
                return new ActiveXObject('Microsoft.XMLHTTP');
            },
        ];
        // Check AJAX flavor
        for (var i = 0; i < factories.length; ++i) {
            try {
                xmlhttp = factories[i]();
            } catch(e) {
                continue;
            }
            break; // found
        }

        return xmlhttp;
    },
    /**
     * Makes an asynchronous XMLHTTP request (XHR) via GET or POST.
     * Inspired by Peter-Paul Koch's XMLHttpRequest function.
     * Note: CORS on IE will work only for version 8 or higher.
     * @param  {object} setup - Request properties
     * @param {string} setup.url - Request URL
     * @param {boolean} [setup.async] - Asynchronous request (or not)
     * @param {function} [setup.callback] - Response function
     * @param {object} [setup.postdata] POST vars, as a regular JS object
     * @param {object} [setup.xmlhttp] A previous XMLHTTP object can be reused
     * @return {void}
     */
    sendAjaxRequest: function(setup) {
        // Create XHR object or reuse it
        var request = setup.xmlhttp ? setup.xmlhttp : this.createXMLHTTPObject();
        var cors = !TrackLib.Util.sameDomain(window.location.href, setup.url);
        // CORS does work with XMLHttpRequest on modern browsers, except IE
        if (cors && window.XDomainRequest) {
            request = new XDomainRequest();
        }
        if (!request) return false;

        var method = setup.postdata ? 'POST' : 'GET';
        var asynchronous = setup.hasOwnProperty('async') ? setup.async : true;
        // Start request
        request.open(method, setup.url, asynchronous);

        var iecors = window.XDomainRequest && (request instanceof XDomainRequest);
        // Post requests must set the correct content type (not allowed under CORS + IE, though)
        if (setup.postdata && !iecors) {
            request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        }
        // Add load listener
        if (iecors) {
            request.onload = function() {
                if (typeof setup.callback === 'function') setup.callback(request);
            };
        } else {
            // Check for the 'complete' request state
            request.onreadystatechange = function() {
                if (request.readyState == 4 && typeof setup.callback === 'function') {
                    setup.callback(request);
                }
            };
        }
        // Include credentials on cross-origin requests (has no effect on same-site requests)
        request.withCredentials = true;

        if (typeof setup.postdata === 'object') {
            setup.postdata = TrackLib.Util.serializeQuery(setup.postdata);
        }

        request.send(setup.postdata);
    },
};
/**
 * Event handling.
 * @memberof TrackLib
 * @namespace TrackLib.Events
 */
TrackLib.Events = {
    /**
     * Add event listeners unobtrusively.
     * @author John Resig (http://ejohn.org)
     * @param {object} obj - Object to add listener(s) to.
     * @param {string} type - Event type.
     * @param {function} fn - Function to execute.
     * @return {void}
     */
    add: function(obj, type, fn) {
        if (!obj) return false;
        if (obj.addEventListener) { // W3C standard
            obj.addEventListener(type, fn, false);
        } else if (obj.attachEvent) { // IE versions
            obj.attachEvent('on'+type, fn);
        } else { // Really old browser
            obj[type+fn] = function() {
                fn(window.event);
            };
        }
    },
    /**
     * Remove event listeners unobtrusively.
     * @author John Resig (http://ejohn.org)
     * @param {object} obj - Object to remove listener(s) from
     * @param {string} type - Event type
     * @param {function} fn - Function to remove from event
     * @return {void}
     */
    remove: function(obj, type, fn) {
        if (!obj) return false;
        if (obj.removeEventListener) { // W3C standard
            obj.removeEventListener(type, fn, false);
        } else if (obj.detachEvent) { // IE versions
            obj.detachEvent('on'+type, fn);
        } else { // Really old browser
            obj[type+fn] = null;
        }
    },
    /**
     * Normalize event inconsistencies between browsers.
     * @param {object} e - DOM Event
     * @return {object} Fixed event
     */
    fix: function(e) {
        e = e || window.event;
        // Fix target property, if necessary (IE 6/7/8 & Safari 2)
        if (!e.target) e.target = e.srcElement || document;
        // Target should not be a text node (Safari bug)
        if (e.target.nodeType == 3) e.target = e.target.parentNode;
        // For mouse/key events; add metaKey if it's not there (IE 6/7/8)
        if (typeof e.metaKey === 'undefined') e.metaKey = e.ctrlKey;
        // Support multitouch events (index 0 is consistent with mobile devices)
        e.id = e.identifier || 0;

        return e;
    },
    /**
     * Executes callback on DOM load.
     * @param {function} callback - Callback function to execute
     * @return {void}
     */
    domReady: function(callback) {
        if (document.addEventListener) {
            // W3C browsers
            document.addEventListener('DOMContentLoaded', callback, false);
        } else if (document.attachEvent) {
            // Internet Explorer ¬¬
            try {
                document.write('<scr'+'ipt id=__ie_onload defer=true src=//:><\/scr'+'ipt>');
                var script = document.getElementById('__ie_onload');
                script.onreadystatechange = function() {
                    if (this.readyState === 'complete') {
                        callback();
                    }
                };
            } catch(err) {}
        } else {
            // Really old browsers
            TrackLib.Events.add(window, 'load', callback);
        }
    },
};
/**
 * Dimension handling.
 * @memberof TrackLib
 * @namespace TrackLib.Dimension
 */
TrackLib.Dimension = {
    /**
     * Get the browser's window size (aka 'the viewport').
     * @return {Size} dim - Window dimmensions
     */
    getWindowSize: function() {
        var d = document;
        var w = (window.innerWidth) ? window.innerWidth
            : (d.documentElement && d.documentElement.clientWidth) ? d.documentElement.clientWidth
                : (d.body && d.body.clientWidth) ? d.body.clientWidth
                    : 0;
        var h = (window.innerHeight) ? window.innerHeight
            : (d.documentElement && d.documentElement.clientHeight) ? d.documentElement.clientHeight
                : (d.body && d.body.clientHeight) ? d.body.clientHeight
                    : 0;
        /**
         * @typedef {object} Size
         * @property {number} width - The width
         * @property {number} height - The height
         */
        return {width: w, height: h};
    },
    /**
     * Get the document's size.
     * @return {Size} dim - Document dimensions
     */
    getDocumentSize: function() {
        var d = document;
        var w = (window.innerWidth && window.scrollMaxX) ? window.innerWidth + window.scrollMaxX
            : (d.body && d.body.scrollWidth > d.body.offsetWidth) ? d.body.scrollWidth
                : (d.body && d.body.offsetWidth) ? d.body.offsetWidth
                    : 0;
        var h = (window.innerHeight && window.scrollMaxY) ? window.innerHeight + window.scrollMaxY
            : (d.body && d.body.scrollHeight > d.body.offsetHeight) ? d.body.scrollHeight
                : (d.body && d.body.offsetHeight) ? d.body.offsetHeight
                    : 0;

        return {width: w, height: h};
    },
    /**
     * Gets the max value from both window (viewport's size) and document's size.
     * @return {Size} dim - Viewport dimensions
     */
    getPageSize: function() {
        var win = this.getWindowSize();
        var doc = this.getDocumentSize();

        // Find max values from this group
        var w = (doc.width < win.width) ? win.width : doc.width;
        var h = (doc.height < win.height) ? win.height : doc.height;

        return {width: w, height: h};
    },
};
/**
 * Utility methods.
 * @memberof TrackLib
 * @namespace TrackLib.Util
 */
TrackLib.Util = {
    /**
     * Test whether a set of URLs come from the same domain.
     * @param {...string} args - Source URLs
     * @return {boolean}
     */
    sameDomain: function(args) {
        var currDomain;
        var prevDomain;
        var sameDomain = true;
        for (var i = 0, l = arguments.length; i < l; ++i) {
            if (i > 0) {
                currDomain = arguments[i];
                sameDomain = this.getDomain(prevDomain) == this.getDomain(currDomain);
            }
            prevDomain = arguments[i];
        }

        return sameDomain;
    },
    /**
     * Get domain of a given URL.
     * @param {string} url - Source URL
     * @return {string}
     */
    getDomain: function(url) {
        var d;
        var link = document.createElement('a');
        link.href = url;
        d = link.hostname;
        link = null; // free

        return d;
    },
    /**
     * Serialize attributes of a DOM node.
     * Only *specified* attributes are considered.
     * @see https://www.w3.org/TR/DOM-Level-2-Core/core.html#ID-637646024
     * @param {object} elem - DOM node
     * @return {string} JSON representation of the node attributes
     */
    serializeAttrs: function(elem) {
        var obj = {};
        if (elem && elem.attributes) {
            obj[elem.nodeName] = {};
            for (var i = 0, t = elem.attributes.length; i < t; i++) {
                var attrib = elem.attributes[i];
                if (attrib.specified) {
                    obj[elem.nodeName][attrib.name] = attrib.value;
                }
            }
        }

        return JSON.stringify(obj);
    },
    /**
     * Serialize object as a query string.
     * @param {object} obj - Source Object
     * @return {string} Query string representation of the object
     */
    serializeQuery: function(obj) {
        var queryStr = '';
        var i = 0;
        for (var p in obj) {
            if (!obj.hasOwnProperty(p)) continue;
            if (i > 0) queryStr += '&';
            queryStr += p + '=' + obj[p];
            i++;
        }

        return queryStr;
    },
};
