/*! evtrack -- UI module */
(function(window) {
    var document = window.document;

    // Define default events at the document level
    var _docEvents = 'mousedown mouseup mousemove mouseover mouseout mousewheel wheel';
    _docEvents += ' touchstart touchend touchmove deviceorientation keydown keyup keypress';
    _docEvents += ' click dblclick scroll change select submit reset contextmenu cut copy paste';
    // Define default events at the window level
    var _winEvents = 'load unload beforeunload blur focus resize error abort online offline';
    _winEvents += ' storage popstate hashchange pagehide pageshow message beforeprint afterprint';
    // Convert these event lists to actual array lists
    _docEvents = _docEvents.split(' ');
    _winEvents = _winEvents.split(' ');
    // Save a shortcut for "*" events
    var _allEvents = _docEvents.concat(_winEvents);

    // Arguments separator for the logged data
    var ARGS_SEPARATOR = ' ';
    // This one must match that of save.php (INFSEP)
    var INFO_SEPARATOR = '|||';

    // Unique user ID, assigned by the server
    var _uid = 0;
    // Tracking time, for pollingMs
    var _time = 0;
    // Registered information is: cursorId, timestamp, xpos, ypos, event, xpath, attrs
    var _info = [];

    /**
     * A small lib to track the user activity by listening to browser events.
     * Written in plain 'ol JavaScript. No dependencies. Also works in old browsers.
     * @namespace TrackUI
     * @author Luis Leiva
     * @version 0.3
     * @requires tracklib.js
     * @license Dual licensed under the MIT and GPL licenses.
     */
    var TrackUI = {
        /**
         * Default settings -- can be overridden on init.
         * @see README.md
         * @memberof TrackUI
         */
        settings: {
            // The server where logs will be stored.
            // You MUST specify this.
            postServer: '//my.server.org/save.script',
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
            regularEvents: '*',
            // Events to be polled, because some events are not always needed (e.g. mousemove).
            // If this property is empty (default value), no events will be polled.
            // Use space-separated values to indicate multiple events, e.g. "mousemove touchmove".
            // The "*" wildcard can be used to specify all events.
            // Events in pollingEvents will override those specified in regularEvents.
            // You can leave regularEvents empty and use only pollingEvents, if need be.
            pollingEvents: '',
            // Sampling frequency (in ms) to register events.
            // If set to 0, every single event will be recorded.
            pollingMs: 150,
            // A name that identifies the current task.
            // Useful to filter logs by e.g. tracking campaign ID.
            taskName: 'evtrack',
            // A custom function to execute on each recording tick.
            callback: null,
            // Whether to dump element attributes together with each recorded event.
            saveAttributes: true,
            // Enable this to display some debug information
            debug: false,
        },
        /**
         * Init method.
         * @memberof TrackUI
         * @param {object} config - Tracking Settings
         * @see TrackUI.settings
         * @return {void}
         */
        record: function(config) {
            _time = new Date().getTime();
            // Override settings
            for (var prop in TrackUI.settings) {
                if (config.hasOwnProperty(prop) && config[prop] !== null) {
                    TrackUI.settings[prop] = config[prop];
                }
            }
            TrackUI.log('Recording starts...', _time, TrackUI.settings);
            TrackUI.addEventListeners();
            setTimeout(function() {
                TrackUI.initNewData(true);
            }, TrackUI.settings.postInterval*1000);
        },
        /**
         * Register event listeners.
         * @memberof TrackUI
         * @return {void}
         */
        addEventListeners: function() {
            if (TrackUI.settings.regularEvents == '*') {
                TrackUI.addCustomEventListeners(_allEvents);
            } else {
                TrackUI.log('Settings regular events...');
                TrackUI.settings.regularEvents = TrackUI.settings.regularEvents.split(' ');
                TrackUI.addCustomEventListeners(TrackUI.settings.regularEvents);
            }
            // All events in this set will override those defined in regularEvents
            if (TrackUI.settings.pollingEvents == '*') {
                TrackUI.addCustomEventListeners(_allEvents);
            } else {
                TrackUI.log('Settings polling events...');
                TrackUI.settings.pollingEvents = TrackUI.settings.pollingEvents.split(' ');
                TrackUI.addCustomEventListeners(TrackUI.settings.pollingEvents);
            }
            // Flush data on closing the window/tab
            TrackLib.Events.add(window, 'beforeunload', TrackUI.flush);
            TrackLib.Events.add(window, 'unload', TrackUI.flush);
        },
        /**
         * Register custom event listeners.
         * @memberof TrackUI
         * @param {array} eventList - List of DOM events (strings)
         * @return {void}
         */
        addCustomEventListeners: function(eventList) {
            TrackUI.log('Adding event listeners:', eventList);
            for (var i = 0; i < eventList.length; ++i) {
                var ev = eventList[i];
                if (!ev) continue;
                if (_docEvents.indexOf(ev) > -1) {
                    TrackLib.Events.add(document, ev, TrackUI.docHandler);
                    TrackUI.log('Adding document event:', ev);
                    // This is for IE compatibility, grrr
                    if (document.attachEvent) {
                        // See http://todepoint.com/blog/2008/02/18/windowonblur-strange-behavior-on-browsers/
                        if (ev == 'focus') TrackLib.Events.add(document.body, 'focusin', TrackUI.winHandler);
                        if (ev == 'blur') TrackLib.Events.add(document.body, 'focusout', TrackUI.winHandler);
                    }
                } else if (_winEvents.indexOf(ev) > -1) {
                    TrackLib.Events.add(window, ev, TrackUI.winHandler);
                    TrackUI.log('Adding window event:', ev);
                }
            }
        },
        /**
         * Send data for the first time for a given (new) user.
         * @memberof TrackUI
         * @param {boolean} async - Whether the request should be asynchronous or not
         * @return {void}
         */
        initNewData: function(async) {
            var win = TrackLib.Dimension.getWindowSize();
            var doc = TrackLib.Dimension.getDocumentSize();
            var data = {
                url: encodeURIComponent(window.location.href),
                screenw: screen.width,
                screenh: screen.height,
                winw: win.width,
                winh: win.height,
                docw: doc.width,
                doch: doc.height,
                info: encodeURIComponent(_info.join(INFO_SEPARATOR)),
                task: encodeURIComponent(TrackUI.settings.taskName),
                // cookies: encodeURIComponent(document.cookie),
                action: 'init',
            };
            // Try newer browser APIs for async Ajax requests
            // NB: the data is sent as text/plain
            if (!async && typeof navigator.sendBeacon === 'function') {
                data.beacon = true;
                var params = JSON.stringify(data);
                navigator.sendBeacon(TrackUI.settings.postServer, params);
            } else {
                // Send request
                TrackUI.send({
                    async: async,
                    postdata: data,
                    callback: TrackUI.setUserId,
                });
            }
            // Clean up
            _info = [];
        },
        /**
         * Set user ID for the current session.
         * @memberof TrackUI
         * @param {object} xhr - XHR response object
         * @return {void}
         */
        setUserId: function(xhr) {
            _uid = xhr.responseText;
            TrackUI.log('setUserId:', _uid);
            if (_uid) {
                setInterval(function() {
                    TrackUI.appendData(true);
                }, TrackUI.settings.postInterval*1000);
            }
        },
        /**
         * Send data for the same (previous) user.
         * @memberof TrackUI
         * @param {boolean} async - Whether the request should be asynchronous or not
         * @return {void}
         */
        appendData: function(async) {
            var data = {
                uid: _uid,
                info: encodeURIComponent(_info.join(INFO_SEPARATOR)),
                action: 'append',
            };
            // Try newer browser APIs for async Ajax requests
            // NB: the data is sent as text/plain
            if (!async && typeof navigator.sendBeacon === 'function') {
                data.beacon = true;
                var params = JSON.stringify(data);
                navigator.sendBeacon(TrackUI.settings.postServer, params);
            } else if (_info.length > 0) {
                // Send request
                TrackUI.send({
                    async: async,
                    postdata: data,
                });
            } else {
                TrackUI.log('Skipping empty request...');
            }
            // Clean up
            _info = [];
        },
        /**
         * Common sending method with CORS support.
         * @memberof TrackUI
         * @param {object} req - XHR request
         * @return {void}
         */
        send: function(req) {
            req.url = TrackUI.settings.postServer;
            TrackLib.XHR.sendAjaxRequest(req);
        },
        /**
         * Handle document events.
         * @memberof TrackUI
         * @param {object} e - DOM event
         * @return {void}
         */
        docHandler: function(e) {
            if (e.type.indexOf('touch') > -1) {
                TrackUI.touchHandler(e);
            } else {
                TrackUI.eventHandler(e);
            }
        },
        /**
         * Handle window events.
         * @memberof TrackUI
         * @param {object} e - DOM event
         * @return {void}
         */
        winHandler: function(e) {
            TrackUI.eventHandler(e);
        },
        /**
         * Generic callback for event listeners.
         * @memberof TrackUI
         * @param {object} e - DOM event
         * @return {void}
         */
        eventHandler: function(e) {
            e = TrackLib.Events.fix(e);

            if ('isTrusted' in e && !e.isTrusted) return;

            var timeNow = new Date().getTime();
            var eventName = e.type;
            var register = true;
            if (TrackUI.settings.pollingMs > 0 && TrackUI.settings.pollingEvents.indexOf(eventName) > -1) {
                register = (timeNow - _time >= TrackUI.settings.pollingMs);
            }

            if (register) {
                var cursorPos = TrackUI.getMousePos(e);
                var elemXpath = TrackLib.XPath.getXPath(e.target);
                var elemAttrs = TrackUI.settings.saveAttributes ? TrackLib.Util.serializeAttrs(e.target) : '{}';
                var extraInfo = '{}';
                if (typeof TrackUI.settings.callback === 'function') {
                    extraInfo = JSON.stringify(TrackUI.settings.callback(e));
                }
                TrackUI.fillInfo(e.id, timeNow, cursorPos.x, cursorPos.y, eventName, elemXpath, elemAttrs, extraInfo);
                _time = timeNow;
            }
        },
        /**
         * Callback for touch event listeners.
         * @memberof TrackUI
         * @param {object} e - DOM event
         * @return {void}
         */
        touchHandler: function(e) {
            e = TrackLib.Events.fix(e);

            if ('isTrusted' in e && !e.isTrusted) return;

            var touches = e.changedTouches; // better
            if (touches) for (var i = 0, touch; i < touches.length; ++i) {
                touch = touches[i];
                touch.type = e.type;
                TrackUI.eventHandler(touch);
            }
        },
        /**
         * Cross-browser way to register the mouse position.
         * @memberof TrackUI
         * @param {object} e - DOM event
         * @return {Point} pos - Coordinates
         */
        getMousePos: function(e) {
            e = TrackLib.Events.fix(e);

            var cx = 0;
            var cy = 0;
            if (e.pageX || e.pageY) {
                cx = e.pageX;
                cy = e.pageY;
            } else if (e.clientX || e.clientY) {
                cx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
                cy = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
            }
            // Sometimes the mouse coordinates are negative (e.g., in Opera)
            if (!cx || cx < 0) cx = 0;
            if (!cy || cy < 0) cy = 0;
            /**
             * @typedef {object} Point
             * @property {number} x - The X coordinate
             * @property {number} y - The Y coordinate
             */
            return {x: cx, y: cy};
        },
        /**
         * Fill in a log data row.
         * @memberof TrackUI
         * @param {...mixed} args - Any number of arguments
         * @return {void}
         */
        fillInfo: function(args) {
            var args = [].slice.apply(arguments);
            _info.push(args.join(ARGS_SEPARATOR));
            TrackUI.log(args);
        },
        /**
         * Send remaining data (if any) to the backend server.
         * @memberof TrackUI
         * @param {object} e - DOM event
         * @return {void}
         */
        flush: function(e) {
            TrackUI.log('Flushing data...');
            var i;
            for (i = 0; i < _docEvents.length; ++i) {
                TrackLib.Events.remove(document, _docEvents[i], TrackUI.docHandler);
            }
            for (i = 0; i < _winEvents.length; ++i) {
                TrackLib.Events.remove(window, _winEvents[i], TrackUI.winHandler);
            }
            // Don't use asynchronous requests here, otherwise this won't work
            // NB: Some browsers disallow sync AJAX requests on page unload
            if (_uid) {
                TrackUI.appendData(false);
            } else {
                TrackUI.initNewData(false);
            }
        },
        /**
         * Show debug information in the JS console.
         * @memberof TrackUI
         * @param {...mixed} args - Any number of arguments
         * @return {void}
         */
        log: function(args) {
            if (TrackUI.settings.debug && typeof console.log === 'function') {
                console.log.apply(console, arguments);
            }
        },

    };

    // Expose
    window.TrackUI = TrackUI;
})(this);
