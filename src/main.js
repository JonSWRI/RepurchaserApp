/// Main entry point for backend
const server = require("./server.js");
const routing = require("./routes.js");
const config = require("../config.json");
const moment = require('moment');
const util = require('util');
const Log = require('./log.js');

// BIG TODO go through and look at usage of var & let - I got this confused as let is const in swift

let now = moment().format('YYYY-MM-DD HH:mm:ss');
Log.l("Starting BidPro");
Log.l(`config : \n ${util.inspect(config,false,null,true)}`);
// TODO theres probably too much logging to console
// Create main instance of backbone framework
let framework = new server.Framework(config);
// Setting up navigation
routing.setup(server, framework);
// Bind to port
framework.start();



