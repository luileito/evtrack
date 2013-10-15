/*! evtrack -- UI module */
(function(window){

var document = window.document;

// Define default events, as if they were set in `settings` object
var _docEvents  = "mousedown mouseup mousemove mouseover mouseout mousewheel ";
    _docEvents += "touchstart touchend touchmove keydown keyup keypress ";
    _docEvents += "click dblclick scroll change select submit reset contextmenu cut copy paste";

var _winEvents = "load unload beforeunload blur focus resize error online offline";

// Convert these event lists to actual array lists
_docEvents = _docEvents.split(" ");
_winEvents = _winEvents.split(" ");
// Save a shortcut for "*" events
var _allEvents = _docEvents.concat(_winEvents);

var _uid  = 0  // Unique user ID, assigned by the server
  , _time = 0  // Tracking time, for pollingMs
  , _info = [] // Registered information is: cursorId, timestamp, xpos, ypos, event, xpath, attrs
  ;

  
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
    // Events to be tracked whenever the browser fires them. Default:
    //      mouse-related: "mousedown mouseup mousemove mouseover mouseout mousewheel click dblclick"
    //      touch-related: "touchstart touchend touchmove"
    //   keyboard-related: "keydown keyup keypress"
    //     window-related: "load unload beforeunload blur focus resize error online offline"
    //             others: "scroll change select submit reset contextmenu cut copy paste"
    // If this property is empty, no events will be tracked.
    // Use space-separated values to indicate multiple events, e.g. "click mousemove touchmove".
    // The "*" wildcard can be used to specify all events.
    regularEvents: "*",
    // Events to be polled, because some events are not always needed (e.g. mousemove).
    // If this property is empty (default value), no events will be polled.
    // Use space-separated values to indicate multiple events, e.g. "mousemove touchmove".
    // The "*" wildcard can be used to specify all events.
    // Events in pollingEvents will override those specified in regularEvents.
    // You can leave regularEvents empty and use only pollingEvents, if need be.
    pollingEvents: "",
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
    // Enable this to display some debug information
    debug: false
  },
  /**
   * Init method. Registers event listeners.
   * @param {object} config  Tracking Settings
   * @return void
   */
  record: function(config) {
    _time = new Date().getTime();
    // Override settings
    for (var prop in TrackUI.settings) if (config.hasOwnProperty(prop) && config[prop] !== null) {
      TrackUI.settings[prop] = config[prop];
    }
    TrackUI.log("Recording starts...", _time, TrackUI.settings);
    TrackUI.addEventListeners();
    setTimeout(function(){
      TrackUI.initNewData(true);
    }, TrackUI.settings.postInterval*1000);
  },
  /**
   * Adds required event listeners.
   * @return void
   */
  addEventListeners: function() {
    if (TrackUI.settings.regularEvents == "*") {
      TrackUI.addCustomEventListeners(_allEvents);
    } else {
      TrackUI.log("Settings regular events...");
      TrackUI.settings.regularEvents = TrackUI.settings.regularEvents.split(" ");
      TrackUI.addCustomEventListeners(TrackUI.settings.regularEvents);
    }
    // All events in this set will override those defined in regularEvents
    if (TrackUI.settings.pollingEvents == "*") {
      TrackUI.addCustomEventListeners(_allEvents);
    } else {
      TrackUI.log("Settings polling events...");
      TrackUI.settings.pollingEvents = TrackUI.settings.pollingEvents.split(" ");    
      TrackUI.addCustomEventListeners(TrackUI.settings.pollingEvents);
    }
    // Flush data on closing the window/tab
    var unload = (typeof window.onbeforeunload === 'function') ? "beforeunload" : "unload";
    TrackLib.Events.add(window, unload, TrackUI.flush);
  },
  /**
   * Adds custom event listeners.
   * @return void
   */
  addCustomEventListeners: function(eventList) {
    TrackUI.log("Adding event listeners:", eventList);
    for (var i = 0; i < eventList.length; ++i) {
      var ev = eventList[i];
      if (!ev) continue;
      if (_docEvents.indexOf(ev) > -1) {
        TrackLib.Events.add(document, ev, TrackUI.docHandler);
        TrackUI.log("Adding document event:", ev);
        // This is for IE compatibility, grrr
        if (document.attachEvent) {
          // See http://todepoint.com/blog/2008/02/18/windowonblur-strange-behavior-on-browsers/
          if (ev == "focus") TrackLib.Events.add(document.body, "focusin", TrackUI.winHandler);
          if (ev == "blur") TrackLib.Events.add(document.body, "focusout", TrackUI.winHandler);
        }
      } else if (_winEvents.indexOf(ev) > -1) {
        TrackLib.Events.add(window, ev, TrackUI.winHandler);
        TrackUI.log("Adding window event:", ev);
      }
    }
  },
  /**
   * Sets data for the first time for a given user.
   * @param {boolean} async  Whether the request should be asynchronous or not
   * @return void
   */
  initNewData: function(async) {
    var win = TrackLib.Dimension.getWindowSize(), 
        doc = TrackLib.Dimension.getDocumentSize(),
        data  = "url="      + encodeURIComponent(window.location.href);
        data += "&screenw=" + screen.width;
        data += "&screenh=" + screen.height;
        data += "&winw="    + win.width;
        data += "&winh="    + win.height;
        data += "&docw="    + doc.width;
        data += "&doch="    + doc.height;
        data += "&info="    + encodeURIComponent(_info.join("|||"));
        data += "&task="    + encodeURIComponent(TrackUI.settings.taskName);
        //data += "&layout="  + TrackUI.settings.layoutType;
        //data += "&cookies=" + document.cookie;
        data += "&action="  + "init";
    // Send request
    TrackUI.send({
      async:    async,    
      postdata: data, 
      callback: TrackUI.setUserId
    });
    // Clean up
    _info = [];
  },
  /**
   * Sets the user ID, to append data for the same session.
   * @param {string} response  XHR response object
   * @return void
   */
  setUserId: function(xhr) {
    _uid = parseInt(xhr.responseText);
    TrackUI.log("setUserId:", _uid);
    if (_uid) {
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
    var data  = "uid="     + _uid;
        data += "&info="   + encodeURIComponent(_info.join("|||"));
        data += "&action=" + "append";
    // Send request
    TrackUI.send({
      async:    async,
      postdata: data
    });
    // Clean up
    _info = [];
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
   * Handles document events.
   * @param {object} e  Event
   * @return void
   */
  docHandler: function(e) {
    if (e.type.indexOf("touch") > -1) {
      TrackUI.touchHandler(e);
    } else {
      TrackUI.eventHandler(e);
    }
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

    var timeNow  = new Date().getTime(), eventName = e.type, register = true;
    if (TrackUI.settings.pollingMs > 0 && TrackUI.settings.pollingEvents.indexOf(eventName) > -1) {
      register = (timeNow - _time >= TrackUI.settings.pollingMs);
    }
    
    if (register) {
      var cursorPos = TrackUI.getMousePos(e), 
          elemXpath = TrackLib.XPath.getXPath(e.target),
          elemAttrs = TrackLib.Util.serializeAttrs(e.target);
      TrackUI.fillInfo(e.id, timeNow, cursorPos.x, cursorPos.y, eventName, elemXpath, elemAttrs);
      _time = timeNow;
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
    var args = [].slice.apply(arguments);
    _info.push( args.join(" ") );
    TrackUI.log(args);
  },
  /**
   * Transmit remaining (if any) data to server.
   * @param {object} e  Event
   * @return void
   */
  flush: function(e) {
    TrackUI.log("Flushing data...", _uid);
    var i;
    for (i = 0; i < _docEvents.length; ++i) TrackLib.Events.remove(document, _docEvents[i], TrackUI.docHandler);
    for (i = 0; i < _winEvents.length; ++i) TrackLib.Events.remove(window, _winEvents[i], TrackUI.winHandler);
      
    // Don't use asynchronous requests here, otherwise this won't work
    if (_uid) {
      TrackUI.appendData(false);
    } else {
      TrackUI.initNewData(false);
    }
  },
  
  log: function() {
    if (TrackUI.settings.debug && typeof console.log === 'function') {
      console.log.apply(console, arguments);
    }
  }

};

// Expose
window.TrackUI = TrackUI;

})(this);
