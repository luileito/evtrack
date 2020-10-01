# evtrack-An Event Tracker site

Event tracking on websites using plain old JavaScript.
No third-party libraries or external dependencies. :smiley:

## Usage

* For web pages:
  Just add `load.min.js` to your page (e.g. inside `<head>` element or right before the closing `</body>` tag) and configure tracking options.

* For browser extensions:
  Add `tracklib.min.js` and `trackui.min.js` (in this order) to your `manifest.json` (or similar) and configure tracking options.

### Example 1

Default configuration.
Capture [any](https://github.com/luileito/evtrack/blob/master/js/src/trackui.js#L6) browser event whenever it happens.

```javascript
<script src="/path/to/load.min.js"></script>
<script>
(function(){

  TrackUI.record({
    // Remember to point to save.php (or similar) to write the log files.
    postServer: "/path/to/save.php"
  });

})();
</script>
```

### Example 2

Capture all mouse clicks whenever they happen.
Also capture every mouse movement at 50 ms.
All other browser events are ignored.

```javascript
<script src="/path/to/load.min.js"></script>
<script>
(function(){

  TrackUI.record({
    postServer: "/path/to/save.php",
    regularEvents: "click",
    pollingEvents: "mousemove",
    pollingMs: 50,
  });

})();
</script>
```

### Example 3

Capture any browser event every 500 ms.

```javascript
<script src="/path/to/load.min.js"></script>
<script>
(function(){

  TrackUI.record({
    postServer: "/path/to/save.php",
    regularEvents: "",
    pollingEvents: "*",
    pollingMs: 500,
  });

})();
</script>
```

### Example 4

Use the default settings within a Chrome extension:

1. Add the following snippet to your `manifest.json` file:

```javascript
"content_scripts": [{
  "js": [
    "path/to/evtrack/tracklib.min.js",
    "path/to/evtrack/trackui.min.js",
    "main.js"
  ]
}],
```

2. Add `TrackUI.record(settings)` in `main.js`, where `settings` holds your tracking options.


## Default tracking settings

The `settings` object has the following defaults:

```javascript
TrackUI.record({
  // The server where logs will be stored.
  postServer: "//my.server.org/save.script",
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
  // A custom function to execute on each recording tick.
  callback: null,
  // Whether to dump element attributes together with each recorded event.
  saveAttributes: true,
  // Enable this to display some debug information
  debug: false
})
```

### Result

For each browsed page, you'll have in the `logs` directory the following files:

1. A space-delimited CSV-like file with 8 columns.
2. An XML file with some metadata.

#### CSV file example

```csv
cursor timestamp xpos ypos event xpath attrs extras
0 1405503114382 0 0 load / {}
```
Where:
* The `cursor` column indicates the cursor ID.
  Will be `0` for a regular computer mouse, or an integer indicating the finger ID for touch-capable browsers.
* The `timestamp` column indicates the timestamp of the event, with millisecond precision.
* The `xpos` and `ypos` columns indicate the `x` and `y` position of the cursor, respectively.
  For events that do *not* relate to any mouse event (e.g. `load` or `blur`), these values will be `0`.
* The `event` column indicates the browser's event name.
* The `xpath` column indicates the target element that relates to the event, [in XPath notation](https://en.wikipedia.org/wiki/XPath).
* The `attrs` column indicates the element attributes, if any.
* The `extras` column is populated with the result of the `callback` setting you've set.

#### XML file example

```xml
<?xml version="1.0" encoding="UTF-8"?>
<data>
 <ip>127.0.0.1</ip>
 <date>Wed, 16 Jul 2014 11:32:24 +0200</date>
 <url>http://localhost/evtrack/test.html</url>
 <ua>Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.153 Safari/537.36</ua>
 <screen>1600x900</screen>
 <window>1551x548</window>
 <document>1551x548</document>
 <task>evtrack</task>
</data>
```

The `<task />` element is the value you've set in the `taskName` setting.
This is useful to annotate a particular tracking campaign's ID, an experimental user group, etc.

## Citation

If you use this software in any academic project, please cite it as:

* Leiva, L.A. and Vivó, R. Web Browsing Behavior Analysis and Interactive Hypervideo. _ACM Transactions on the Web_ **7**(4), 2013.
```bibtex
@Article{Leiva13-tweb,
 author   = {Luis A. Leiva and Roberto Viv\'o},
 title    = {Web Browsing Behavior Analysis and Interactive Hypervideo},
 journal  = {ACM Transactions on the Web},
 volume   = {7},
 number   = {4},
 year     = {2013},
}
```

## License

This software is dual-licensed under the MIT and LGPL v3 licenses.
See the [license](https://github.com/luileito/evtrack/blob/master/license) dir.
