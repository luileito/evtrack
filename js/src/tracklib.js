/*! evtrack -- Lib module */

/**
 * Auxiliary functions to track the user activity.
 * @author Luis Leiva
 * @version 0.2
 * @license Dual licensed under the MIT and GPL licenses.
 */
var TrackLib = {};
/**
 * XPath functions.
 * Not documented yet.
 * Code extracted from window.js @ http://code.google.com/p/xpathchecker/
 * @author Brian Slesinsky (http://slesinsky.org)
 */
TrackLib.XPath = {

    queryXPath: function(document, xpath) {
      var iterator;
      if (typeof document.evaluate === 'function') {
        iterator = document.evaluate(xpath, document.documentElement, null, XPathResult.ANY_TYPE, null);
      } else {
        try {
          // IE5 and later has implemented that [0] should be the first node, 
          // but according to the W3C standard it should have been [1]!
          document.setProperty("SelectionLanguage", "XPath");
          iterator = document.selectNodes(xpath);
        } catch(err) {
          iterator = false;
        }
      }
      
      return iterator;
    },
    
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

    getXPath: function(targetNode) {
      var useLowerCase = (targetNode.ownerDocument instanceof HTMLDocument);
      var nodePath = this.getNodePath(targetNode), nodeNames = [];
      for (var i in nodePath) {
        var node = nodePath[i], nodeIndex;
        if (node.nodeType == 1) { // && node.tagName != "TBODY") {
          if (i == 0 && node.hasAttribute("id")) {
            nodeNames.push("/*[@id='" + node.getAttribute("id") + "']");
          } else {
            var tagName = node.tagName;
            if (useLowerCase) {
              tagName = tagName.toLowerCase();
            }
            nodeIndex = this.getNodeIndex(node);
            if (nodeIndex != null) {
              nodeNames.push(tagName + "[" + nodeIndex + "]");
            } else {
              nodeNames.push(tagName);
            }
          }
        } else if (node.nodeType == 3) {
          nodeIndex = this.getTextNodeIndex(node);
          if (nodeIndex != null) {
            nodeNames.push("text()[" + nodeIndex + "]");
          } else {
            nodeNames.push("text()");
          }
        }
      }
      
      return "/" + nodeNames.join("/");
    },

    getNodeIndex: function(node) {
      if (node.nodeType != 1 || node.parentNode == null) return null;
      var list = this.getChildNodesWithTagName(node.parentNode, node.tagName);
      if (list.length == 1 && list[0] == node) return null;
      for (var i = 0; i < list.length; i++) {
        if (list[i] == node) return i + 1;
      }
      
      throw "couldn't find node in parent's list: " + node.tagName;
    },

    getTextNodeIndex: function(node) {
      var list = this.getChildTextNodes(node.parentNode)
      if (list.length == 1 && list[0] == node) return null;
      for (var i = 0; i < list.length; i++) {
        if (list[i] == node) return i + 1;
      }
      
      throw "couldn't find node in parent's list: " + node.tagName;
    },

    getChildNodesWithTagName: function(parent, tagName) {
      var result = [], child = parent.firstChild;
      while (child != null) {
        if (child.tagName && child.tagName == tagName) {
          result.push(child);
        }
        child = child.nextSibling;
      }
      
      return result;
    },

    getChildTextNodes: function(parent) {
      var result = [], child = parent.firstChild;
      while (child != null) {
        if (child.nodeType == 3) {
          result.push(child);
        }
        child = child.nextSibling;
      }
      
      return result;
    },

    getNodePath: function(node) {
      var result = [];
      while (node.nodeType == 1 || node.nodeType == 3) {
        result.unshift(node);
        if (node.nodeType == 1 && node.hasAttribute("id")) return result;
        node = node.parentNode;
      }
      
      return result;
    },

    getNodeValues: function(resultList) {
      var result = [];
      for (var i in resultList) {
        result.push(resultList[i].nodeValue);
      }
      
      return result;
    }
  
};
/**
 * Ajax handling object.
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
      function(){ return new XMLHttpRequest(); },
      function(){ return new ActiveXObject("Msxml2.XMLHTTP"); },
      function(){ return new ActiveXObject("Msxml3.XMLHTTP"); },
      function(){ return new ActiveXObject("Microsoft.XMLHTTP"); }
    ];
    // Check AJAX flavor
    for (var i = 0; i < factories.length; ++i) {
      try {
        xmlhttp = factories[i]();
      } catch(e) { continue; }
      break;
    }
    
    return xmlhttp;
  },
  /**
   * Makes an asynchronous XMLHTTP request (XHR) via GET or POST.
   * Inspired by Peter-Paul Koch's XMLHttpRequest function.
   * Note: CORS on IE will work only for version 8 or higher.
   * @return void
   * @param  {object} setup Request properties
   *    @config {string}    url       Request URL
   *    @config {boolean}  [async]    Asynchronous request (or not)
   *    @config {function} [callback] Response function
   *    @config {string}   [postdata] POST vars in the form "var1=name&var2=name..."
   *    @config {object}   [xmlhttp]  A previous XMLHTTP object can be reused
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
    
    var method = setup.postdata ? "POST" : "GET";
    var asynchronous = setup.hasOwnProperty('async') ? setup.async : true;
    // Start request
    request.open(method, setup.url, asynchronous);
    
    var iecors = window.XDomainRequest && (request instanceof XDomainRequest);
    // Post requests must set the correct content type (not allowed under CORS + IE, though)
    if (setup.postdata && !iecors) {
      request.setRequestHeader('Content-Type', "application/x-www-form-urlencoded");
    }
    // Add load listener
    if (iecors) {
      request.onload = function(){
        if (typeof setup.callback === 'function') setup.callback(request.responseText);
      };
    } else {
      // Check for the 'complete' request state
      request.onreadystatechange = function(){
        if (request.readyState == 4 && typeof setup.callback === 'function') {
          setup.callback(request.responseText);
        }
      };
    }
    request.send(setup.postdata);
  }

};
/**
 * Event handling object.
 */
TrackLib.Events = {
    /**
     * Adds event listeners unobtrusively.
     * @author John Resig (http://ejohn.org)
     * @param {object}    obj   Object to add listener(s) to.
     * @param {string}    type  Event type.
     * @param {function}  fn    Function to execute.
     * @return void
     */
    add: function(obj, type, fn) {
      if (!obj) return false;
      if (obj.addEventListener) { // W3C standard
        obj.addEventListener(type, fn, false);
      } else if (obj.attachEvent) { // IE versions
        obj.attachEvent("on"+type, fn);
      } else { // Really old browser
        obj[type+fn] = function(){ fn(window.event); };
      }
    },
    /**
     * Removes event listeners unobtrusively.
     * @author John Resig (http://ejohn.org)
     * @param {object}    obj   Object to remove listener(s) from
     * @param {string}    type  Event type
     * @param {function}  fn    Function to remove from event
     * @return void
     */
    remove: function(obj, type, fn) {
      if (!obj) return false;
      if (obj.removeEventListener) { // W3C standard
        obj.removeEventListener(type, fn, false);
      } else if (obj.detachEvent) { // IE versions
        obj.detachEvent("on"+type, fn);
      } else { // Really old browser
        obj[type+fn] = null;
      }
    }, 
    /**
     * Fixes event handling inconsistencies between browsers.
     * @param {object}  e Event
     * @return {object}   Fixed event
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
    }

};
/**
 * Dimension handling object.
 */
TrackLib.Dimension = {
  /**
   * Gets the browser's window size (aka 'the viewport').
   * @return {object} window dimmensions
   *    @config {integer} width
   *    @config {integer} height
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
    
    return { width: w, height: h };
  },
  /**
   * Gets the document's size.
   * @return {object} document dimensions
   *    @config {integer} width
   *    @config {integer} height
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
    
    return { width: w, height: h };
  },
  /**
   * Gets the max value from both window (viewport's size) and document's size.
   * @return {object} viewport dimensions
   *    @config {integer} width
   *    @config {integer} height
   */
  getPageSize: function() {
    var win = this.getWindowSize(),
        doc = this.getDocumentSize();
    
    // Find max values from this group
    var w = (doc.width < win.width) ? win.width : doc.width;
    var h = (doc.height < win.height) ? win.height : doc.height;
    
    return { width: w, height: h };
  }

};
/**
 * Some utilies.
 */
TrackLib.Util = {
  /**
   * Tests whether a set of URLs come from the same domain.
   * @return {boolean}
   */
  sameDomain: function() {
    var prevDomain, sameDomain = true;
    for (var i = 0, l = arguments.length; i < l; ++i) {
      if (i > 0) {
        sameDomain = (this.getDomain(prevDomain) == this.getDomain(arguments[i]));
      }
      prevDomain = arguments[i];
    }
    
    return sameDomain;
  },
  /**
   * Gets the domain of a given URL.
   * @return {string}
   */
  getDomain: function(url) {
    var d, link = document.createElement("a");
    link.href = url;
    d = link.hostname;
    link = null; // free
    
    return d;
  },
  /**
   * Executes callback on DOM load.
   * @param {function} callback
   * @return void
   */
  onDOMload: function(callback) {
    if (arguments.callee.done) return;
    arguments.callee.done = true;
    
    if (document.addEventListener) {
      // W3C browsers
      document.addEventListener('DOMContentLoaded', callback, false);
    }
    else if (document.attachEvent) {
      // Internet Explorer ¬¬
      try {
        document.write("<scr"+"ipt id=__ie_onload defer=true src=//:><\/scr"+"ipt>");
        var script = document.getElementById("__ie_onload");
        script.onreadystatechange = function() {
          if (this.readyState === 'complete') { callback(); }
        };
      } catch(err) {}
    }
    else {
      // Really old browsers
      TrackLib.Events.add(window, 'load', callback);
    }
  },
  /**
   * Serializes a DOM node.
   * @param {object} elem  DOM node
   * @return {string} HTML representation of the DOM node
   */  
  serialize: function(elem) {
    var txt, node = document.createElement("div");
    node.appendChild(elem);
    txt  = node.innerHTML;
    node = null; // free

    return txt;
  },
  /**
   * Serializes the attributes of a DOM node.
   * @param {object} elem  DOM node
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
  }
  
};
