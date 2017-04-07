Modular plug-in framework for express.js
========================================
Framework for handling the details of setting up an express.js server by specifying server options, plug-ins to load, and then starting the server.

# Install

    npm install express-modular-server

# Usage

The work is done in the function returned when you require the module.  This function takes a single argument, which is an object taking configuration values.  All functions returns the module, allowing you to chain calls.  The module contains two function: `API` to load a plug-in, and `start` to start the server.  The start function should come last.

The following example configures a single http server on the default port (8080) and loads the plug-ins "gpio", "mma8451", "mx28adc", and "app" before starting the server.

```
   var server = require("express-modular-server")({
     http:true
   })
    .API("gpio")
    .API("mma8451")
    .API("mx28adc")
    .API("app")
    .start()
```

# Configuration

The following configuration keys are recognized:

##http
When this key is present, express.js will service requests using the `http` network protocol.  If this value is `true` the default port is used.   If the environment variable `PORT` is present, its numerical values is used as the default, otherwise `8080` is the default.  If this value is a number, the specified number is used.  An invalid value may also be interpreted as using the default.

##https
When this key is present, express.js will service requests using the `https` network protocol.   The value of this key must be an object containing keys which are the host name to listen on, and values corresponding to the directory containing the credentials files for each server.   The following files must be present in each directory: `cert.pem` containing the SSL certificate for the host name, `privkey.pem` containing the private key, and `chain.pem` containing the SSL chain.

##log
This key can be either a string, or an array of strings.  Each string specifies the path to a file to log messages logged by the `Log` function.  If no log is specifed, messages will be logged to the console.

In addition to calls to the `Log` function, all requests that express.js is about to service will be logged with the format:

    <ISO8601Time>:<IPAddress>:<METHOD> <URL>

# Plug-ins

A plug-in is a separate package that adheres to the following conventions.  Its name must begin with `service-`.  The `API` call to load this plug-in must omit this prefix.  The top-level code invoking the server must include all plug-ins used in its list of dependencies.

A plug-in must declare its `module.exports` to be a function taking the following arguments: the `app` express object, the `express` express object, and an `options` argument.  Often the second and third arguments will be optional.   In this function, the plug-in must set up any endpoints via the `app` and/or `express` objects provided, as well as define any functionality needed to service these requests.

The following example defines a GPIO service utilizing the `gpio` function.  It provides one available option to change the endpoint, and displays an initialization message to the log.

```
function gpio(req,res) {
    // actual implementation would go here
}

var endpoint = "/gpio/"

module.exports = function(app,exports,options) {
    if (options && typeof options == "string") {
	    endpoint = options
    }
    Log("service gpio ",endpoint)
    app.get(endpoint, gpio)
}
```


# Functions

The server defines a few convenience functions which plug-in can call.

## Log

Logs a message to wherever messages are configured to be logged to.  All arguments to this function are combined into a single string with the current time and a colon prepended.


## atob

Converts a buffer to Base-64.  Takes the value to convert as a parameter and returns the converted value.

## btoa

Converts from Base-64.  Takes the value to convert as a parameter and returns the converted value.

# Copyright

Written by Michael Schmidt.

# License

TBD
