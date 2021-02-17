# Lirio Analytics Beacon

## The analytics beacon is designed to capture user interactions including page views, browser errors, and links clicked within a web site or web application. These events will be transmitted individually if the Beacon API is not supported or in batches if it is.

### Usage

Import the analaytics library then capture and pass in the user's unique ID.

```
<script language="javascript" src="analytics.js"></script>
<script>
    beacon.config.uniqueId = 123456789
</script>
```

### Comments

Only clicks that have a `href` property are captured.

Debug mode can be activated with `beacon.debug = true`.

Debug output can be sent to an element with `beacon.debugTarget = "elementId"`.