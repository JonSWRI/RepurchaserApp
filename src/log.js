// Really simple wrapper over console.log - I hate console.log bs

const config = require("../config.json");
let debug = config.debug ? config.debug : 0;

function isDebug(level){
    return debug >= level;
}

function l(msg, level){
    if(!level || debug >= level){
        console.log(msg);
    }
}

function w(msg,level){
    if(!level || debug >= level){
        console.log("[WARNING] " + msg);
    }
}

function e(msg,level){
    if(!level || debug >= level){
        console.log("[ERROR] " + msg);
    }
}

function i(msg,level){
    if(!level || debug >= level){
        console.log("[INFO] " + msg);
    }
}

module.exports = {
    l, w, e, isDebug
}