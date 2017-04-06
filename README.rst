Modular plug-in framework for express.js
========================================
Framework for handling the details of setting up an express.js server by specifying server options, plug-ins to load, and then starting the server.

Install
=======

::
   npm install express-modular-server

Usage
=====

The work is done in the function returned when you require the module.  This function takes a single argument, which is an object taking configuration values.  All functions returns the module, allowing you to chain calls to the API function.  The module contains two function: API to load a plug-in, and start() to start the server.  The start function should come last.

The following example configures a single http server on the default port (8080) and loads the plug-ins "gpio", "mma8451", "mx28adc", and "app" before starting the server.

::
   var server = require("express-modular-server")({
     http:true
   })
    .API("gpio")
    .API("mma8451")
    .API("mx28adc")
    .API("app")
    .start()

