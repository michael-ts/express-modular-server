Modular plug-in framework for express.js
========================================
Framework for handling the details of setting up an express.js server by specifying server options, plug-ins to load, and then starting the server.

# Install

    npm install express-modular-server

# Usage

The work is done in the function returned when you require the module.  This function takes a single argument, which is an object taking configuration values.  All functions returns the module, allowing you to chain calls.  The module contains two function: `API` to load a plug-in, and `start` to start the server.  The start function should come last.  However, new code should not use the `API` call and instead should use the `autoload` option to automatically detect and load services.  This allows for service modules to be dynamically added or removed without (in most cases) the need to change the main server module, simply by running "npm install" or "npm uninstall" for the desired service.

The following example uses the new "2.0" methodology to autoload all available express-modular-server services:



```
var server = require("express-modular-server")({
    http:true,
    autoload:true
}).start("127.0.0.1")
```

The following example uses the old methodology to configure a single http server on the default port (8080) and loads the plug-ins "gpio", "mma8451", "mx28adc", and "app" before starting the server.

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

## http
When this key is present, express.js will service requests using the `http` network protocol.  If this value is `true` the default port is used.   If the environment variable `PORT` is present, its numerical values is used as the default, otherwise `8080` is the default.  If this value is a number, the specified number is used.  An invalid value may also be interpreted as using the default.

## https
When this key is present, express.js will service requests using the `https` network protocol.   The value of this key must be an object containing keys which are the host name to listen on, and values corresponding to the directory containing the credentials files for each server.   The following files must be present in each directory: `cert.pem` containing the SSL certificate for the host name, `privkey.pem` containing the private key, and `chain.pem` containing the SSL chain.

## autoload
When this key is present and is a true value, all modules beginning with `service-` will be loaded and initialized before the require function returns.  The search path starts in the node_modules directory of the top-level module and in every parent directory to the root and to find all immediate sub-directories beginning with `service-` in every node_modules directory found along that path.  After loading, if the `module.exports` is a function it will be called, passing the `app`, `express`, and `options` parameters.

The `options` parameter to each module will be determined by applying any configuration found in the `EMS.cfg` file and the `autoconfig` parameter (in that order) to the default of 
```
{
    "last": "service-app"
}
```

If the resulting object has a key which is the full name of the module, then its value will be passed as the `options` parameter to that module.

The search path for the `EMS.cfg` file is the directory the top-level module is in and every parent directory *until the file is found* (at most one config file will be loaded) or *no more directores are left*.  The `EMS.cfg` format is JSON.

See the next secton for the full format of the autoconfig object.

## autoconfig

When this key is present it must be an object containing autload configuration information.  This configuration takes precedence over any configuration in an `EMS.cfg` file, which takes precedence over the default (see last section).

The following keys are recognized:

### last 
Must be a string value containing the full name of the module which is to be initialized last.  The default is `service-app`.  The purpose of having a last module is generally to create an express default route.

### disable
Must be an array containing strings where each string is the full name of a module which is to be ignored and not loaded.  This provides a way to avoid loading a module without uninstalling it, as well as to avoid autloading non-EMS modules which happen to start with "service-".

### service-...

Any other key starting with "service-" is interpreted as the full name of a module which might be loaded.  The value associated with this key is the value to pass as the `options` parameter to the function exported by the module for initialization.  If the specified service is not loaded this value is ignored.

## log
This key can be either a string, or an array of strings.  Each string specifies the path to a file to log messages logged by the `Log` function.  If no log is specifed, messages will be logged to the console.

In addition to calls to the `Log` function, all requests that express.js is about to service will be logged with the format:

    <ISO8601Time>:<IPAddress>:<METHOD> <URL>

# Plug-ins

A plug-in is a separate package that adheres to the following conventions.  Its name must begin with `service-`.  The `API` call to load this plug-in must omit this prefix, but all references to it in the autoconfig must *not*.  If the `API` call is used, then the top-level code invoking the server must include all plug-ins used in its list of dependencies.  If the `autoload` feature is used, this is not necessary, instead, services can be installed and uninstalled in whatever manner is desired with only a server restart required to reflect the change.

A plug-in must declare its `module.exports` to be a function taking the following arguments: the `app` express object, the `express` express object, and an `options` argument.  Often the second and third arguments will be optional.   In this function, the plug-in must set up any endpoints via the `app` and/or `express` objects provided, as well as define any functionality needed to service these requests.

The following example defines a GPIO service utilizing the `gpio` function.  It provides one available option to change the endpoint, and displays an initialization message to the log.

```
function gpio(req,res) {
    // actual implementation would go here
}

var endpoint = "/gpio/"

module.exports = function(app,express,options) {
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

# Changes from 1.0 to 2.0

There are a few changes in version 2.0 which technically make it incompatible with 1.0:
1. Support for [express-streamline](https://github.com/aseemk/express-streamline) has been removed in favor of promises and the new async/await syntax which now has widespread support.
2. The behavior of loading modules has been reverted to simply *requiring* the specified modules, rather than trying to autoload the entire directory.
3. Support for the obsolete "server-" prefix has been removed: all modules must now begin with "service-".

# Copyright

Written by Michael Schmidt.

# License

GPL 3.0
