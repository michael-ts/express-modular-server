"use strict";

global.btoa = function (str) {return new Buffer(str).toString("base64")}
global.atob = function (str) {return new Buffer(str, "base64").toString()};

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

var express = require("express"),
    http = require("http"),
    https = require("https"),
    app = express(),
    port = Number(process.env.PORT || 8080),
    port2 = Number(process.env.SSLPORT || 8082),
    tls = require("tls"),
    fs = require("fs")

var opts = { }
var loaded
module.exports = function(options) {
    if (options) opts = options
    if (options.express) express = options.express
    if (typeof opts == "object" && "log" in opts && log.length == 0) {
	if (typeof opts.log == "string") {
	    log.push(fs.createWriteStream(opts.log, {flags:"a"}))
	} else if (opts.log instanceof Array) {
	    for (var i=0;i<opts.log.length;i++) {
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
	if (opts.autoload) ems_autoload(options.autoconfig)
	loaded = true
    }
    module.API = function(plugin,options) {
	var service = "service-"+plugin
	try {
	    console.log(service,require.resolve(service))
	    require(service)(app,express,options)
	} catch(e) {
	    console.log(e)
	}
	return module
    }
    module.start = function(host) {
	// if already started, return?
	if (opts.http) {
	    if (typeof opts.http == "number") port = opts.http
	    Log("server.js:Starting HTTP")
	    if (host) {
		http.createServer(app).listen(port, host, function() {
		    Log("server.js:HTTP listening on "+host+" port ",port)
		})
	    } else {
		http.createServer(app).listen(port, function() {
		    Log("server.js:HTTP listening on port ",port)
		})
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
	    }, app).listen(port2, function() {
		Log("server.js:HTTPS listening on port ",port2)
	    })
	}
    }
    return module
}

var verbose
function ems_autoload(autoconf) {
    var p = path.resolve("."), p0=p, path0
    if (verbose) console.log("EMS2 begins in ",p)
    var config = {
	last: "service-app",
	disable: [] 
    }
    if (typeof autoconf == "object") {
	for (var i in autoconf) {
	    config[i] = autoconf[i]
	}
    }
    var last, lastfile
    while (true) {
	path0 = p+path.sep+"EMS.cfg"
	if (verbose) console.log(`looking for ${path0}`)
	if (fs.existsSync(path0)) {
	    if (verbose) console.log(`found ${path0}`)
	    var conf
	    try {
		var i
		conf = JSON.parse(fs.readFileSync(path0))
		for (i in conf) {
		    config[i] = conf[i]
		}
		if (!config.last) config.last = [ ]
		else if (typeof config.last == "string") config.last = [ config.last ]
	    } catch (e) {
		console.log(`Error parsing ${path0}`)
	    }
	    break
	}
	if (p == path.sep) break
	p = path.resolve(p+path.sep+"..")
    }
    if (verbose) console.log(`config: ${JSON.stringify(config,null,1)}`)
    p = p0
    p = __dirname
    while (true) {
	path0 = p+path.sep+"node_modules"
	if (verbose) console.log(`looking for ${path0}`)
	if (fs.existsSync(path0)) {
	    var tmp = fs.readdirSync(path0)
		.filter(file=>{
		    return file.slice(0,8) == "service-"
			&& fs.statSync(path0+path.sep+file).isDirectory()
		})
		.map(file=>{
		    if (verbose) console.log("EMS2:",path0+path.sep+file)
		    try {
			if (config.disable.indexOf(file) >= 0) {
			    if (verbose) console.log(`disabled: ${file}`)
			    return
			}
			if (file == config.last) {
			    if (verbose) console.log(`deferring load of ${file}`)
			    last = path0+path.sep+file
			    lastfile = file
			    return
			}
			var tmp = require(path0+path.sep+file)
			if (typeof tmp == "function") {
			    tmp(app, express, config[file])
			}
		    } catch (e) {
			console.log(`error loading ${file}: ${e}`)
		    }
		})
	}
	if (p == path.sep) break
	p = path.resolve(p+path.sep+"..")
    }
    if (last) {
	if (verbose) console.log(`loading last ${last}`)
	var tmp = require(last)
	if (typeof tmp == "function") {
	    tmp(app, express, config[lastfile])
	}
    }
    if (verbose) console.log("EMS2 ends")
}

function process_hosts(hosts,config) {
    // hostname:path [, ... ]
    var i,hosts = hosts.split(","), hostobj={}
    for (i=0;i<hosts.length;i++) {
	var ha,host,sslpath
	ha=hosts[i].split(":")
	host = ha[0]
	sslpath = ha[1]
	hostobj[host] = sslpath
    }
    config.https = hostobj
    //delete config.http
}

/*
  recognized arguments
  --port=<HTTP port number>
  --sslport=<HTTPS port number>
  --hosts=<hostname:path[,...]>

  arguments override environment variables
*/
if (require.main === module) {
    console.log("Starting Server...")
    var i, config = {
	http:true,
	autoload:true
    }
    if (process.env.HOSTS) {
	// hostname:path [, ... ]
	var i,hosts = process.env.HOSTS.split(","), hostobj={}
	for (i=0;i<hosts.length;i++) {
	    var ha,host,sslpath
	    ha=hosts[i].split(":")
	    host = ha[0]
	    sslpath = ha[1]
	    hostobj[host] = sslpath
	}
	config.https = hostobj
	//delete config.http
    }
    var ip
    for (i=1;i<process.argv.length;i++) {
	var arg = process.argv[i].split("=")
	if (arg.length < 2) continue
	var name = arg.shift()
	var value = arg.join("=")
	switch (name) {
	case "--port":  port=Number(value); break
	case "--sslport": port2=Number(value); break
	case "--hosts": process_hosts(value,config); break
	case "--ip": ip = value
	}
    }
    module.exports(config).start(ip || process.env.IP || "0.0.0.0")
} else {
    // Not called directly, use API interface
}
