// TODO - Need to hook into local storage to persist session state.

// Instantiates the beacon and sets its default properties.
var beacon = {
    "events": [],
    "config": {
        "uniqueId": null,
        "destination": "https://dataops.dev.liriotech.com/api/v1/redox/events/0/0",
        "token": "OiUQeNYT0j3t14WfICZDe6Jjf43uztRb957w1OOn"
    },
    "session": {
        "beaconApiSupported": !!navigator.sendBeacon,
        "fetchApiSupported": !!window.fetch,
        "userAgent": navigator.userAgent
    },
    "debug": false  // Should this be rolled into beacon.config?
}

// Purges all events in the internal event store.
// This is typically invoked after delivering the events.
beacon.purge = function() {
    beacon.events = []
}

// Sends tracking events from the browser to the destination when the Beacon API isn't supported.
// If the Fetch API isn't available, fall back to XHR.
beacon.send = function(events) {
    if (events.length > 0) {
        if (beacon.session.fetchApiSupported) {
            var request = fetch(beacon.config.destination, {
                method: "POST",
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Content-Type": "application/json",
                    "verification-token": beacon.config.token
                },
                body: JSON.stringify(beacon.events),
                cache: "no-cache",
                mode: "cors",
                keepalive: true,
                window: window
            })
            .then(function(response) {
                if (response.status == 200) {
                    beacon.purge()
                }
            })

        }
        else {
            var xhr = new XMLHttpRequest()
            xhr.onload = beacon.purge
            xhr.open("POST", beacon.config.destination, false)
            xhr.setRequestHeader("verification-token", beacon.config.token);
            xhr.setRequestHeader("Access-Control-Allow-Origin", "*");
            xhr.send(events)
        }
    }
}

// Adds an abstraction around logging.
beacon.log = function(message) {
    console.log(message)
}

// Adds an event to the internal event store.
beacon.event = function(description, event) {
    var metadata = {
        "userId": beacon.config.uniqueId,
        "eventOrigin": "lirio-analytics-beacon",
        "eventType": description,
        "url": window.location.href,
        "userAgent": beacon.session.userAgent,
        "timestamp": Date.now()
    }
    var payload = Object.assign(metadata, event)

    // Append to internal event store if beacon API is supported.
    // Otherwise, immediately attempt to deliver event so it isn't lost.
    if (beacon.session.beaconApiSupported) {
        beacon.events.push(payload)
    }
    else {
        beacon.events.push(payload)
        beacon.send(beacon.events)
    }
}

// Attach to global onload event to set initial session state.
document.addEventListener("DOMContentLoaded", function(event) {
    // Debugging
    if (beacon.debug) {
        beacon.log("A DOMContentLoaded event has been triggered.")
        console.log(beacon.config.uniqueId)
        console.log(beacon.session.userAgent)
    }

    // DOMContentLoaded Event
    beacon.session.loaded = Date.now()
    var data = {
        "referrer": document.referrer,
        "loaded": beacon.session.loaded
    }
    beacon.event('pageview', data)
})

// Attach to global click events to capture clicked elements.
document.addEventListener("click", function(event) {
    // Click Event
    // We only want to capture clicks on valid links.
    if (event.target.href) {
        // Debugging
        if (beacon.debug) {
            beacon.log("A click event has been triggered.")
        }
        
        var data = {
            "target": event.target.href
        }
        beacon.event('click', data)
    }
})

// Attach to global error events to capture browser errors.
window.addEventListener("error", function(message, url, line, column, error) {
    // Debugging
    if (beacon.debug) {
        beacon.log("An error event has been triggered.")
    }

    // Error Event
    var data = {
        "message": message
    }
    beacon.event('error', data)
})

// Attach to global unload events to invoke the beacon API on page unload.
document.addEventListener("visibilitychange", function(event) {
    // Debugging
    if (beacon.debug) {
        beacon.log("A visibility change event has been triggered.")
    }

    // Visibility Change Event
    // The Beacon API is supported, go ahead and send the events.
    if (beacon.session.beaconApiSupported) {
        if (beacon.events.length > 0) {
            //navigator.sendBeacon(beacon.config.destination, beacon.events)
            beacon.send(beacon.events)
        }
    }
})

// Safari doesn't properly fire visibility change events when the property transitions to hidden.
document.addEventListener("pagehide", function(event) {
    // Debugging
    if (beacon.debug) {
        beacon.log("A page hide event has been triggered.")
    }

    // Page Hide Event
    // The Beacon API is supported, go ahead and send the events.
    if (beacon.session.beaconApiSupported) {
        if (beacon.events.length > 0) {
            //navigator.sendBeacon(beacon.config.destination, beacon.events)
            beacon.send(beacon.events)
        }
    }
})