"use strict";

var os = require("os")
var path=require("path")

if (typeof os.homedir != "function") {
    var osHomeDir=require("os-homedir")
    os.homedir = osHomeDir
}

global.btoa = function (str) {return new Buffer(str).toString("base64")}
global.atob = function (str) {return new Buffer(str, "base64").toString()};
global.HOST=os.hostname()
global.HOME=os.homedir()

var log = [ ]
var path = require("path")
global.Log = function() {
    var t = (new Date()).toISOString()
    var data = t+":"+Array.prototype.slice.call(arguments).join("")
    var i
    if (log.length == 0) {
	console.log(data)
    } else for (i=0;i<log.length;i++) {
	log[i].write(data+"\n")
    }
}

function LogRequest(req,res,next) {
    // var template = /^:(ffff)?:(?!0)(?!.*\.$)((1?\d?\d|25[0-5]|2[0-4]\d)(\.|$)){4}$/
    // var has_ipv4_version = template.test(address)
    var IP = req.ip.replace(/^.*:/, '')
    var str = IP+":"+req.method+" "+req.path
    Log(str)
    next()
}

function check_log(str) {
    if (str == "default") return "log"+path.sep+HOST+".txt"
    return str
}

var express = require("express-streamline"),
    http = require("http"),
    https = require("https"),
    app = express(),
    port = Number(process.env.PORT || 8080),
    tls = require("tls"),
    fs = require("fs"),
    autoload = require("auto-load")

var opts = { }
var loaded
module.exports = function(options) {
    if (options) opts = options
    var mainport=8080
    if (opts.port) mainport = opts.port
    if ("PORT" in process.env && Number(process.env.PORT) != mainport) {
	opts.log = [ ]
    }
    if ("log" in opts && log.length == 0) {
	if (typeof opts.log == "string") {
	    opts.log = check_log(opts.log)
	    log.push(fs.createWriteStream(opts.log, {flags:"a"}))
	} else if (opts.log instanceof Array) {
	    for (var i=0;i<opts.log.length;i++) {
		opts.log[i] = check_log(opts.log[i])
		log.push(fs.createWriteStream(opts.log[i], {flags:"a"}))
	    }
	}
	if (!loaded) {
	    try {
		fs.mkdirSync("log")
	    } catch (e) { // will throw if dir already exists
	    }
	}
    }
    if (!loaded) {
	Log("server.js required")
	app.disable("x-powered-by")
	app.use(LogRequest)
	app.use(function(req, res, next) {
	    //res.header("Access-Control-Allow-Origin", "*")
	    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
	    next()
	})
	app.options("*",function(req,res) {
	    res.set({
		//"Access-Control-Allow-Origin":"*",
		"Access-Control-Allow-Methods":"POST, GET, OPTIONS",
		"Access-Control-Allow-Credentials":false,
		"Access-Control-Max-Age":"86400",
		"Access-Control-Allow-Headers":"Content-Type, Accept"
	    })
	    res.sendStatus(200)
	})
	loaded = true
    }
    module.API = function(plugin,options) {
	var i, dir, service = "service-"+plugin
	try {
	    dir = require.resolve(service).split(path.sep)
	    dir.pop()
	    dir = dir.join(path.sep)
	    var services = autoload(dir,{deep:false,json:false})
	    for (i in services) {
		services[i](app,express,options)
	    }
	} catch(e) {
	    console.log("error:",e)
	    console.log("Ignoring missing "+service+" in ",process.cwd())
	}
	//require(service)(app,express,options)
	return module
    }
    module.start = function(host,errf) {
	if (!errf) errf = function(err) {
	    console.log("express-modular-server: error starting server:",err)
	    throw err
	}
	if (opts.http) {
	    if (typeof opts.http == "number") port = opts.http
	    Log("server.js:Starting HTTP")
	    if (host) {
		http.createServer(app).listen(port, host, function() {
		    Log("server.js:HTTP listening on "+host+" port ",port)
		}).once("error",errf)
	    } else {
		http.createServer(app).listen(port, function() {
		    Log("server.js:HTTP listening on port ",port)
		}).once("error",errf)
	    }
	}
	var creds = { }
	if (opts.https) {
	    Log("server.js:Starting HTTPS")
	    for (var i in opts.https) {
		var dir = opts.https[i]
		creds[i] = tls.createSecureContext({
		    key: fs.readFileSync(dir+"/privkey.pem", "utf8"),
		    cert: fs.readFileSync(dir+"/cert.pem", "utf8"),
		    ca: fs.readFileSync(dir+"/chain.pem","utf8")
		})
	    }
	    https.createServer({
		SNICallback: function (domain,cb) {
		    if (creds[domain]) {
			if (cb) {
			    cb(null,creds[domain])
			} else {
			    return creds[domain]
			}
		    } else {
			throw new Error("No credentials for domain "+domain)
		    }
		}
	    }, app).listen(port, function() {
		Log("server.js:HTTPS listening on port ",port)
	    })
	}
    }
    return module
}

