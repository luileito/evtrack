/*! evtrack -- UI module */

/**
 * A small lib to track the user activity by listening to browser events.
 * @author Luis Leiva
 * @version 0.2
 * @requires tracklib.js
 * @license Dual licensed under the MIT and GPL licenses.
 */
var TrackUI = {
  /**
   * Default settings -- can be overriden on init.
   */
  settings: {
    postServer: "http://my.server.org/save.script",
    postInterval: 10
  },
  /**
   * Unique user ID.
   */
  uid: 0,
  /**
   * Registered information is timestamp, xpos, ypos, event, element
   */
  info: [],
  /**
   * Registers event listeners.
   * @return void
   */
  record: function(config) {
    // override, if need be
    for (var prop in this.settings) if (config.hasOwnProperty(prop) && config[prop] !== null) {
      this.settings[prop] = config[prop];
    }
    
    var mouseEvts = ["mousedown", "mouseup", "mousemove", "click", "scroll", "mousewheel"],
        touchEvts = ["touchstart", "touchend", "touchmove"],
        keyEvts = ["keydown", "keyup", "keypress"],
        winEvts = ["blur", "focus", "resize"],
        i;
    
    for (i = 0; i < mouseEvts.length; ++i) TrackLib.Events.add(document, mouseEvts[i], TrackUI.mouseHandler);
    for (i = 0; i < touchEvts.length; ++i) TrackLib.Events.add(document, touchEvts[i], TrackUI.touchHandler);
    for (i = 0; i < keyEvts.length; ++i) TrackLib.Events.add(document, keyEvts[i], TrackUI.keyHandler);
    for (i = 0; i < winEvts.length; ++i) TrackLib.Events.add(window, winEvts[i], TrackUI.winHandler);
    // this is for IE compatibility, grrr
    if (document.attachEvent) {
      // see http://todepoint.com/blog/2008/02/18/windowonblur-strange-behavior-on-browsers/
      TrackLib.Events.add(document.body, "focusout", TrackUI.winHandler);
      TrackLib.Events.add(document.body, "focusin",  TrackUI.winHandler);
    }
    setTimeout(TrackUI.initNewData, config.postInterval*1000);
    
    var unload = (typeof window.onbeforeunload === 'function') ? "beforeunload" : "unload";
    TrackLib.Events.add(window, unload, TrackUI.flush);
  },
  /**
   * Sets data for the first time for a given user.
   */
  initNewData: function() {
    var win = TrackLib.Dimension.getWindowSize(), 
        doc = TrackLib.Dimension.getDocumentSize(),
        data  = "url="      + escape(window.location.href);
        data += "&screenw=" + screen.width;
        data += "&screenh=" + screen.height;
        data += "&winw="    + win.width;
        data += "&winh="    + win.height;
        data += "&docw="    + doc.width;
        data += "&doch="    + doc.height;
        data += "&info="    + TrackUI.info;
        data += "&action="  + "init";
    // send request
    TrackUI.send({
      postdata: data, 
      callback: TrackUI.setUserId
    });
    // clean up
    TrackUI.info = [];
  },
  /**
   * Sets the user ID, to append data for the same session.
   * @return void
   * @param {string} response  XHR response text
   */
  setUserId: function(response) {
    TrackUI.uid = parseInt(response);
    if (TrackUI.uid) {
      setInterval(TrackUI.appendData, TrackUI.settings.postInterval*1000);
    }
  },
  /**
   * Continues saving data for the same (previous) user.
   */
  appendData: function() {
    var data  = "uid="     + TrackUI.uid;
        data += "&info="   + TrackUI.info;
        data += "&action=" + "append";
    // send request
    TrackUI.send({
      postdata: data
    });
    // clean up
    TrackUI.info = [];
  },
  /**
   * A common sending method with CORS support.
   */
  send: function(req) {
    req.url = TrackUI.settings.postServer;
    req.async = false;
    TrackLib.XHR.sendAjaxRequest(req);
  },
  /**
   * Handles mouse events.
   * @param {object}  e Event.
   * @return void
   */
  mouseHandler: function(e) {
    TrackUI.eventHandler(e);
  },
  /**
   * Handles keyboard events.
   * @param {object}  e Event.
   * @return void
   */
  keyHandler: function(e) {
    TrackUI.eventHandler(e);
  },
  /**
   * Handles window events.
   * @param {object}  e Event.
   * @return void
   */
  winHandler: function(e) {
    TrackUI.eventHandler(e);
  },
  /**
   * Generic callback for event listeners.
   * @return void
   */
  eventHandler: function(e) {
    e = TrackLib.Events.fix(e);
    
    var coords = TrackUI.getMousePos(e), elem = TrackUI.findElement(e);
    TrackUI.fillInfo(coords.x, coords.y, e.type, elem);
  },
  /**
   * Callback for touch event listeners.
   * @return void
   */
  touchHandler: function(e) {
    e = TrackLib.Events.fix(e);
    
    var touch = e.touches[0] || e.targetTouches[0] || e.changedTouches[0];
    if (touch) {
      touch.type = e.type;
      TrackUI.eventHandler(touch);
    }
  },
  /**
   * Cross-browser way to register the mouse position.
   * @return {object} Coordinates
   *   @config {int} x Horizontal component
   *   @config {int} y Vertical component
   */
  getMousePos: function(e) {
    e = TrackLib.Events.fix(e);
    
    var cx = 0, cy = 0;
    if (e.pageX || e.pageY) {
      cx = e.pageX;
      cy = e.pageY;
    } else if (e.clientX || e.clientY) {
      cx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
      cy = e.clientY + document.body.scrollTop  + document.documentElement.scrollTop;
    }
    // sometimes the mouse coordinates are negative (e.g., in Opera)
    if (!cx || cx < 0) cx = 0;
    if (!cy || cy < 0) cy = 0;
    
    return { x:cx, y:cy };
  },
  /**
   * Gets the interacted element.
   * @return {string} XPath
   */
  findElement: function(e) {
    e = TrackLib.Events.fix(e);
    
    return TrackLib.XPath.getXPath(e.target);
  },
  /**
   * Callback for touch event listeners.
   * @param {int} x Cursor X position
   * @param {int} y Cursor Y position
   * @param {string} event    Related event
   * @param {string} element  Related element
   * @return void
   */ 
  fillInfo: function(x,y,event,element) {
    TrackUI.info.push( new Date().getTime() +" "+ x +" "+ y +" "+ event +" "+ element );
  },
  /**
   * Transmit remaining (if any) data to server.
   * @return void
   */
  flush: function(e) {
    if (TrackUI.uid) {
      TrackUI.appendData();
    } else {
      TrackUI.initNewData();
    }
  }

};
