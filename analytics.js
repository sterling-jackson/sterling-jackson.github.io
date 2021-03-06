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

// Sends events from the browser to the destination endpoint.
// If the Fetch API isn't available, fall back to XHR.
beacon.send = function(events) {
    if (events.length > 0) {
        if (beacon.debug) {
            beacon.log(`Sending ${events.length} events to endpoint.`)
        }
        if (beacon.session.fetchApiSupported) {
            var request = fetch(beacon.config.destination, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    "verification-token": beacon.config.token
                },
                body: JSON.stringify(beacon.events),
                cache: "no-cache",
                mode: "cors",
                keepalive: true
            })
            .then(function(response) {
                if (response.status == 200) {
                    if (beacon.debug) {
                        beacon.log("Events delivered successfully.")
                    }
                    beacon.purge()
                }
                else {
                    beacon.log(`Failed to deliver events - ${response.errors}`)
                }
            })
            .catch(function(error) {
                beacon.log(error)
            })
        }
        else {
            var xhr = new XMLHttpRequest()
            xhr.onload = beacon.purge
            xhr.open("POST", beacon.config.destination, false)
            xhr.setRequestHeader("content-type", "application/json");
            xhr.setRequestHeader("verification-token", beacon.config.token);
            xhr.setRequestHeader("Connection", "keep-alive");
            xhr.setRequestHeader("Keep-Alive", "timeout=5, max=60");
            xhr.send(events)
        }
    }
}

// Adds an abstraction around logging.
beacon.log = function(message) {
    console.log(message)

    if (beacon.debug && beacon.debugTarget) {
        document.getElementById(beacon.debugTarget).innerHTML += `${message}<br>`;
    }
}

// Adds an event to the internal event store.
beacon.event = function(description, event) {
    var metadata = {
        "eventId": beacon.uuid(),
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

// Create valid version 4 UUIDs with high entropy.
beacon.uuid = function() {
    var template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
    var uuid = ""
    var seed = Math.random() * 16
    var random = Math.random()
    var entropy = (performance && performance.now && (performance.now() * 1000)) || Date.now()
    var character = ""

    for (i = 0; i < template.length; i++) { 
        character = template[i]
        seed = Math.random() * 16
        random = (entropy + seed) % 16 | 0
        entropy = Math.floor(entropy / 16)
        value = character === 'x' ? random : (random & 0x3 | 0x8)
        uuid += (character === '-' || character === '4') ? character : value.toString(16)
    }

    return uuid
}

// Attach to global onload event to set initial session state.
document.addEventListener("DOMContentLoaded", function(event) {
    // Debugging
    if (beacon.debug) {
        beacon.log("A DOMContentLoaded event has been triggered.")
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
window.addEventListener("error", function(event) {
    // Debugging
    if (beacon.debug) {
        beacon.log("An error event has been triggered.")
    }

    // Error Event
    var data = {
        "message": event.message
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
    // The Fetch API is supported, go ahead and send the events.
    if (beacon.session.fetchApiSupported) {
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
    // The Fetch API is supported, go ahead and send the events.
    if (beacon.session.fetchApiSupported) {
        if (beacon.events.length > 0) {
            beacon.send(beacon.events)
        }
    }
})

// Safari doesn't properly fire visibility change events when the property transitions to hidden.
document.addEventListener("beforeunload", function(event) {
    // Debugging
    if (beacon.debug) {
        beacon.log("An unload event has been triggered.")
    }

    // Page Hide Event
    // The Fetch API is supported, go ahead and send the events.
    if (beacon.session.fetchApiSupported) {
        if (beacon.events.length > 0) {
            beacon.send(beacon.events)
        }
    }
})