const moment = require('moment');
const Log = require('./log.js');
/// random functions used across project - BidPro utils
/// I really hate the typeof BS
function isString(arg){
    return (typeof arg == "string");
}

function isNum(arg){
    return (typeof arg == "number");
}

function isBool(arg){
    return (typeof arg == "boolean");
}

/// NOTE isArray == Array.isArray(arg)

function probsStringArray(arg){
    return (Array.isArray(arg) && arg.length > 0 && isString(arg[0]));
}


// compare 2 objects with different mapping ??? 
function compareObjects(obj1, obj2, mapping){

}

let DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss';

function sqlBool(v){
    if(isBool(v)){
        return v;
    }
    if(isString(v)){
        return v == "true";
    }
    if(isNum(v)){
        return v == 1;
    }
    return "NULL"
}


function sqlValue(v){
    // NOTE returning "null" is useful for generating SQL statements
    if(isBool(v)){
        return v;
    }
    return (v ? (isString(v) ? `\"${v}\"` : v) : "NULL");
}

function sqlList(l, positions){
    // NOTE positions - similar to ebayValue is bputils.js
    if(!l || !Array.isArray(l) || l.length == 0){
        console.warn("SQL list arg not array with length : Returning empty sql list");
        return "()";
    }
    var enc = "";
    if(isString(l[0])){
        enc = "\"";
    }
    var list = "(";
    let len = l.length;
    for (var i = 0; i < len; i++) {
        let element = nValue(l[i], positions);
        if (element) {
            if (i < (len - 2)) {
                list += (enc + element + enc + ",");
            } else {
                list += (enc + element + enc);
            }
        }
    }
    list += ")";
    return list
}

function nValue(obj, positions){
    // for getting nesting values in easy list - NOTE not particularly efficient
    if(!positions){
        return obj;
    }
    // at this point positions = layer1/layer2/layer3....
    let split = positions.split('/');
    var layer = obj;
    for(var l in split){
        let s = split[l];
        if(!layer[s]){
            return null;
        }
        layer = layer[s];
    }
    return layer;
}
/// NOTE the ebay api seems to return all propertise as arrays of strings
function ebayValue(obj, positions){
   
    // ask me about this
    if(!positions){
        if(!obj || !Array.isArray(obj) || obj.length < 1){
            return null;
        }
        return obj[0];
    }
    // at this point positions = layer1/layer2/layer3....
    let split = positions.split('/');
    var layer = obj;
    for(var l in split){
        let s = split[l];
        if(!layer[s] || !Array.isArray(layer[s]) || layer[s].length < 1){
            return null;
        }
        layer = layer[s][0];
    }
    return layer;
} 

function ebayInt(obj,positions){
    let o = ebayValue(obj,positions);
    let io = parseInt(o);
    return isNaN(io) ? null : io;
}

function ebayFloat(obj,positions){
    let o = ebayValue(obj,positions);
    let f = parseFloat(o);
    return isNaN(f) ? null : f;
}

/// Checks the result from an ebay call and returns true if there is valid ebay style item data
function isValidEbayResult(data){
    if (!data || !Array.isArray(data) || data.length == 0 || !data[0].searchResult || data[0].searchResult.length == 0) {
        console.error("Received invalid data structure from ebay");
        return null;
    }
    let items = data[0].searchResult[0].item;
    if (!Array.isArray(items) || items.length == 0) {
        if (Log.isDebug(1)){
            Log.l(`Recieved no new data from ebay`);    
        } 
        return null;
    }
    return items;
}

function convertEbayToBidpro(ebay){
    if(!ebay){
        return null;
    }
    var bp = {
    }
    bp.id = ebayInt(ebay.itemId);
    let productId = ebayValue(ebay, "productId");
    bp.title = ebayValue(ebay.title);
    let listStart = ebayValue(ebay,"listingInfo/startTime");
    bp.list_start = (listStart ? moment(listStart).format(DATE_FORMAT) : null)
    let listEnd = ebayValue(ebay,"listingInfo/endTime");
    bp.list_end = (listEnd ? moment(listEnd).format(DATE_FORMAT) : null)
    bp.list_type = ebayValue(ebay,"listingInfo/listingType");
    bp.best_offer = ebayValue(ebay,"listingInfo/bestOfferEnabled") == "true";
    bp.buy_now = ebayValue(ebay, "listingInfo/bestOfferEnabled") == "true";
    bp.country_code = ebayValue(ebay.country);
    bp.gallery_url = ebayValue(ebay.galleryURL);
    bp.postcode = ebayValue(ebay.postalCode);
    let price = ebayValue(ebay,"sellingStatus/currentPrice");

    if(price){
        bp.price = parseFloat(price.__value__);
        bp.currency_id = price['@currencyId'];
    }
    if(productId){
        bp.productId = parseFloat(productId.__value__);
    }
    let converted = ebayValue(ebay, "sellingStatus/convertedCurrentPrice");
    if(converted){
        bp.converted_price = parseFloat(converted.__value__);
        bp.converted_id = converted['@currencyId'];
    }
    bp.bid_count = ebayValue(ebay,"sellingStatus/bidCount");
    bp.status = ebayValue(ebay, "sellingStatus/sellingState");
    return bp;
}

function isValidBidPro(bp){
    return isNum(bp.int) && isString(bp.title) && isString(bp.postcode) && isNum(bp.price);
}

// compares an ebay item with a bidpro item and returns an object filled with the differences
function compareEbayItemWithBPItem(ebay, bp) {
    if (!ebay) {
        return bp;
    }
    if (!bp) {
        return ebay;
    }
    var diff = {
        changed : {},
        db: {
            changed: false,
            values: "set "
        }
    };

    function addChange(key, e, b, useEbay) {
        diff.changed[key] = {
            ebay: e,
            bp: b
        }
        if (diff.db.changed) {
            diff.db.values += ",";
        } else {
            diff.db.changed = true;
        }
        diff.db.values += `${key} = ${(useEbay ? sqlValue(e) : sqlValue(b))}`;
    }
    let eiid = (ebay.itemId && ebay.itemId[0]) ? parseInt(ebay.itemId[0]) : -1;
    if (eiid && eiid != bp.iid) {
        addChange('id', eiid, bp.id, true);
    }
    let etitle = ebay.title[0];
    if (etitle && etitle != bp.title) {
        addChange('title', etitle, `\'${bp.title}\'`, true);
    }
    let listEnd = moment(ebay.listingInfo[0].endTime[0]).format(DATE_FORMAT);
    if (listEnd && listEnd != bp.list_end) {
        addChange('list_end', listEnd, `\'${bp.list_end}\'`, true);
    }
    let type = ebay.listingInfo[0].listingType[0];
    if (type && type != bp.list_type) {
        addChange('list_type', type, `\'${bp.list_type}\'`, true);
    }
    let bestOffer = ebay.listingInfo[0].bestOfferEnabled[0];
    if (bestOffer != bp.best_offer) {
        addChange('best_offer', (bestOffer == "true"), bp.best_offer, true);
    }
    let buyItNow = ebay.listingInfo[0].buyItNowAvailable[0];
    if (buyItNow != bp.buy_it_now) {
        addChange('buy_now', (buyItNow == "true"), bp.buy_now, true);
    }
    let countryCode = ebayValue(ebay,"country");
    if (countryCode && countryCode != bp.country_code) {
        addChange('country_code', countryCode, `\'${bp.country_code}\'`, true);
    }
    let image = ebayValue(ebay,"galleryURL");
    if (image && image != bp.gallery_url) {
        addChange('gallery_url', image, `\'${bp.gallery_url}\'`, true);
    }
    let postcode = ebayValue(ebay,"postalCode");
    if(postcode && postcode != bp.postcode){
        addChange('postcode',postcode,bp.postcode, true);
    }
    let price = ebayValue(ebay,"sellingStatus/currentPrice");
    let p = parseFloat(price.__value__);
    if(price && p && p != bp.price){
        addChange('price',p ,bp.price, true);
        addChange('currency_id',price['@currencyId'], bp.currency_id , true);
    }
    let converted = ebayValue(ebay, "sellingStatus/convertedCurrentPrice");
    let cp = parseFloat(converted.__value__);
    if(converted && cp && cp != bp.converted_price){
        addChange('converted_price',cp ,bp.price, true);
        addChange('converted_id', converted['@currencyId'], bp.converted_id, true);
    }
    return diff;
}

function objLength(obj){
    /// Apparently this doesn't exist ???
    if(!obj){
        return 0;
    }
    if(typeof obj != "object"){
        return 0;
    }
    return Object.keys(obj).length;
}

class AsyncCounter{
    // class to help with counting total number of asynchronous calls
    constructor(total, callback){
        // callback = function () to call when counter hits total
        this.total = total;
        this.callback = callback;
        this.count = 0;
        this.check();
    }

    increment(){
        this.count++;
        this.check();
    }

    check(){
        if(this.count >= this.total){
            // trigger total callback
            this.callback();
        }
    }


}

module.exports = {
    isString, isNum, isBool, probsStringArray, compareObjects, objLength, convertEbayToBidpro, ebayValue, ebayInt, ebayFloat, AsyncCounter, nValue, isValidBidPro, compareEbayItemWithBPItem, sqlValue, sqlList, sqlBool, isValidEbayResult
}
