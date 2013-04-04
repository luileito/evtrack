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
   * Default settings -- can be overridden on init.
   */
  settings: {
    // The server where logs will be stored.
    postServer: "http://my.server.org/save.script",
    // The interval (in seconds) to post data to the server.
    postInterval: 30,
    // Sampling frequency (in ms) to register events.
    // If set to 0, every single event will be recorded.
    pollingMs: 150,
    // A name that identifies the current task.
    // Useful to filter logs by e.g. tracking campaign ID.
    taskName: "evtrack",
    // Main layout content diagramation; a.k.a 'how page content flows'. XXX: Actually not used.
    // Possible values are the following ones: 
    //   "left" (fixed), "right" (fixed), "center" (fixed and centered), or "liquid" (adaptable, default behavior).
    layoutType: "liquid",
  },
  /**
   * Unique user ID assigned by the server.
   */
  uid: 0,
  /**
   * Tracking time for pollingMs.
   */  
  time: new Date().getTime(),
  /**
   * Registered information is: id, timestamp, xpos, ypos, event, element
   */
  info: [],
  /**
   * Init method. Registers event listeners.
   * @param {object} config  Tracking Settings
   * @return void
   */
  record: function(config) {
    // Override settings, if need be
    for (var prop in this.settings) if (config.hasOwnProperty(prop) && config[prop] !== null) {
      this.settings[prop] = config[prop];
    }
    
    var mouseEvts = ["mousedown", "mouseup", "mousemove", "mouseover", "mouseout", "mousewheel", "click", "scroll"],
        touchEvts = ["touchstart", "touchend", "touchmove"],
        keyEvts = ["keydown", "keyup", "keypress"],
        winEvts = ["blur", "focus", "resize"],
        i;
    for (i = 0; i < mouseEvts.length; ++i) TrackLib.Events.add(document, mouseEvts[i], TrackUI.mouseHandler);
    for (i = 0; i < touchEvts.length; ++i) TrackLib.Events.add(document, touchEvts[i], TrackUI.touchHandler);
    for (i = 0; i < keyEvts.length; ++i) TrackLib.Events.add(document, keyEvts[i], TrackUI.keyHandler);
    for (i = 0; i < winEvts.length; ++i) TrackLib.Events.add(window, winEvts[i], TrackUI.winHandler);
    // This is for IE compatibility, grrr
    if (document.attachEvent) {
      // See http://todepoint.com/blog/2008/02/18/windowonblur-strange-behavior-on-browsers/
      TrackLib.Events.add(document.body, "focusout", TrackUI.winHandler);
      TrackLib.Events.add(document.body, "focusin",  TrackUI.winHandler);
    }
    setTimeout(function(){
      TrackUI.initNewData(true);
    }, TrackUI.settings.postInterval*1000);
    
    var unload = (typeof window.onbeforeunload === 'function') ? "beforeunload" : "unload";
    TrackLib.Events.add(window, unload, TrackUI.flush);
  },
  /**
   * Sets data for the first time for a given user.
   * @param {boolean} async  Whether the request should be asynchronous or not
   * @return void
   */
  initNewData: function(async) {
    var win = TrackLib.Dimension.getWindowSize(), 
        doc = TrackLib.Dimension.getDocumentSize(),
        data  = "url="      + escape(window.location.href);
        data += "&screenw=" + screen.width;
        data += "&screenh=" + screen.height;
        data += "&winw="    + win.width;
        data += "&winh="    + win.height;
        data += "&docw="    + doc.width;
        data += "&doch="    + doc.height;
        data += "&cookies=" + doc.cookie;
        data += "&info="    + TrackUI.info;
        data += "&task="    + TrackUI.settings.taskName;
        data += "&layout="  + TrackUI.settings.layoutType;
        data += "&action="  + "init";
    // Send request
    TrackUI.send({
      async:    async,    
      postdata: data, 
      callback: TrackUI.setUserId
    });
    // Clean up
    TrackUI.info = [];
  },
  /**
   * Sets the user ID, to append data for the same session.
   * @param {string} response  XHR response text
   * @return void
   */
  setUserId: function(response) {
    TrackUI.uid = parseInt(response);
    if (TrackUI.uid) {
      setInterval(function(){
        TrackUI.appendData(true);
      }, TrackUI.settings.postInterval*1000);
    }
  },
  /**
   * Continues saving data for the same (previous) user.
   * @param {boolean} async  Whether the request should be asynchronous or not
   * @return void
   */
  appendData: function(async) {
    var data  = "uid="     + TrackUI.uid;
        data += "&info="   + TrackUI.info;
        data += "&action=" + "append";
    // Send request
    TrackUI.send({
      async:    async,
      postdata: data
    });
    // Clean up
    TrackUI.info = [];
  },
  /**
   * A common sending method with CORS support.
   * @param {object} req  Ajax request
   * @return void
   */
  send: function(req) {
    req.url = TrackUI.settings.postServer;
    TrackLib.XHR.sendAjaxRequest(req);
  },
  /**
   * Handles mouse events.
   * @param {object} e  Event
   * @return void
   */
  mouseHandler: function(e) {
    TrackUI.eventHandler(e);
  },
  /**
   * Handles keyboard events.
   * @param {object} e  Event
   * @return void
   */
  keyHandler: function(e) {
    TrackUI.eventHandler(e);
  },
  /**
   * Handles window events.
   * @param {object} e  Event
   * @return void
   */
  winHandler: function(e) {
    TrackUI.eventHandler(e);
  },
  /**
   * Generic callback for event listeners.
   * @param {object} e  Event
   * @return void
   */
  eventHandler: function(e) {
    e = TrackLib.Events.fix(e);

    var timeNow  = new Date().getTime(), register = true;
    if (TrackUI.settings.pollingMs > 0) {
      register = (timeNow - TrackUI.time >= TrackUI.settings.pollingMs);
    }
    
    if (register) {
      var cursorPos = TrackUI.getMousePos(e), 
          elemXpath = TrackLib.XPath.getXPath(e.target),
          elemAttrs = TrackLib.Util.serializeAttrs(e.target);
      TrackUI.fillInfo(e.id, timeNow, cursorPos.x, cursorPos.y, e.type, elemXpath, elemAttrs);
      TrackUI.time = timeNow;
    }
  },
  /**
   * Callback for touch event listeners.
   * @param {object} e  Event
   * @return void
   */
  touchHandler: function(e) {
    e = TrackLib.Events.fix(e);
    
    var touches = e.changedTouches; // better
    if (touches) for (var i = 0, touch; i < touches.length; ++i) {
      touch = touches[i];
      touch.type = e.type;
      TrackUI.eventHandler(touch);
    }
  },
  /**
   * Cross-browser way to register the mouse position.
   * @param {object} e  Event
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
    // Sometimes the mouse coordinates are negative (e.g., in Opera)
    if (!cx || cx < 0) cx = 0;
    if (!cy || cy < 0) cy = 0;
    
    return { x:cx, y:cy };
  },
  /**
   * Fills in a log data row.
   * @param {integer} id      Cursor ID
   * @param {integer} time    Current timestamp
   * @param {integer} posX    Cursor X position
   * @param {integer} posY    Cursor Y position
   * @param {string}  event   Related event name
   * @param {string}  xpath   Related element in XPath notation
   * @param {string}  attrs   Serialized node attributes
   * @return void
   */
  fillInfo: function() {
    var args = Array.prototype.slice.call(arguments);
    TrackUI.info.push( args.join(" ") );
  },
  /**
   * Transmit remaining (if any) data to server.
   * @param {object} e  Event
   * @return void
   */
  flush: function(e) {
    // Don't use asynchronous requests here, otherwise this won't work
    if (TrackUI.uid) {
      TrackUI.appendData(false);
    } else {
      TrackUI.initNewData(false);
    }
  }

};
