// Playground for javascript

const config = require("./config.json");
const moment = require('moment');
const util = require('util');
const eBay = require('ebay-node-api');
const bpu = require('./src/bputils.js');
console.log(util.inspect(config));

let ebay = new eBay(config.ebay);


var b = {
    search : {
        a : 'b'
    }
}

var g = b.search;
g.a = 'g';
console.log(`Sending ${g.a} -> ${b.search.a}`);


if(bpu.isNum(null)){
    
}
/*
ebay.getAccessToken().then((token) =>{
    console.log(util.inspect(token));
    ebay.getCategoryTree(0).then((data) =>{
        console.log(util.inspect(data,false,3,true));
    }); 
});
*/

var beef = {
    pork : 0,
    b : null
}

console.log(util.inspect(beef));

//let l = (let c = (isNaN(p) ? 1: 2) == 2 ? "4" : "5" );

"insert into items (id, title,list_start, list_end, list_type, best_offer, buy_it_now, country_code,gallery_uri, postcode) values (153874365275,'Lorus Chronograph Mens Quartz (Seiko Movement) Watch -Used','2020-03-23 11:15:21','2020-03-30 12:15:21','Auction',false,false,'GB','https://thumbs4.ebaystatic.com/m/mCzpK7934nVmMmuy-hA3ccA/140.jpg','WN73JX')"



153873586718
2147483647
4294967295