'use strict'; // ???
const eBay = require('ebay-node-api');
const util = require('util');
const express = require('express');
const router = express.Router();
const moment = require('moment');
const bpu = require('./bputils.js');
const actor = require('./actives.js');
const axios = require('axios');
const Log = require('./log.js');
const statics = require('./statics.js')



// Constants
const HOST = '0.0.0.0';

// server hosting setup
const app = express();
app.set('views', 'views');
app.set('view engine', 'pug');
// 'serving' everything in ./public to the client side 
// so everything placed in ./public/will be accessible to the client
app.use(express.static('./src/public'));


class Framework {
  // ebay client
  #ebay = null;

  // Active item data - cache for active search results
  active_data = null;
  config = null;

  constructor(config) {
    // local config store
    this.config = config;
    // setting up ebay client with credentials
    this.#ebay = new eBay(config.ebay);

    // cache of memory objects
    this.active_data = new actor.Actives(this);
    this.stats_endpoint = `http://localhost:${config.stats.port}`
  }

  start() {
    // setup tables and dummy data
    var self = this;
    // creating a set of periodic functions, these can be anything, separate from the standard item looping.
    // all periodic function keys are stored in the database along with their periods.
    // the actual body of the functions that should be called are stored in this.periodics 
    this.createPeriods(self);
    let port = self.config.server.port;
    app.listen(port, HOST);
    console.log(`Running BidPro on http://localhost:${port}`);
    console.log(`Running statistitian on ${this.stats_endpoint}`);
    this.loopPeriodics(self);
    this.loopSearches(self);
  }

  destroy() {
    // TODO kill timer before it starts and interrupt
  }

  getSearchesToBrowser(callback) {
    if (Log.isDebug(2)) {
      Log.l('Performing seearches for direct api');
    }
    var self = this;
    var search = 1
    var itemsProcessed = 0;
    let searches = statics.statics.searches
      if (!searches) {
        let time = moment();
        console.log(`No searches to Fetch @ ${time}`);
        callback(true);
        return;
      }
      if (!Array.isArray(searches)) {
        console.error("Invalid searches array object");
        callback(false);
        return;
      }

      searches.forEach((search) => {
          itemsProcessed++;
          if (itemsProcessed === searches.length) {
            callback(searches);
          }
        });
  };

  loopSearches(self) {
    // series of smaller search opperations
    self.performAllSearches(() => {
      let time = self.config.server.searchPeriod;
      console.log(`Waiting ${time} until searching again`);
      self.refreshSearches = setTimeout(self.loopSearches, time, self);
    });
  }

  loopPeriodics(self) {
    // series of longer periodic function with a much greater periods
    // 
    self.performPeriodics();
    let time = self.config.server.periodicsPeriod;
    console.log(`Waiting ${time} until checking periodics`);
    self.refreshPeriodics = setTimeout(self.loopPeriodics, time, self);
  }

  // for a given Category ID this returns the required and recomended aspects (Specifics)
  // Category tree is sprecific for each country    //3=uk 0=US 

  getCategoryAspects(categoryId, categoryTree){
    if (!categoryTree) {
      var categoryTree = 3
    }
    let self = this;
    self.#ebay.getAccessToken().then((data) => {
        self.#ebay.getItemAspectsForCategory(categoryTree, categoryId).then((data) => {
            console.log(data);
            let required = []
            let recomended = []
            for(var j=0;j<data.aspects.length;j++){
              if (data.aspects[j].aspectConstraint.aspectRequired === true){
                required.push(data.aspects[j])
                console.log(required)
              } else {
                recomended.push(data.aspects[j])
              }
            }
              // need to use this to create Database Structure for Specifics
        });
    });
  }

  performAllSearches(callback) {
    let self = this;
    Log.l(`Performing all searches @ ${moment()}`);
    //TODO efficiency of checking every time ???
      self.performActiveSearches(success => {
        Log.l("Finished active searches");
        if (callback) {
          callback();
        }
      });
  }



  // callback should point to a function that handles the 'data' returned by ebays api call
  getItems(uid, callback) {
    // ???
  }

  performExpiredSearches(callback) {
    this.performSearches(false, callback);
  }

  performActiveSearches(callback) {
    this.performSearches(true, callback);
  }

  // used the `getSearchesToPerform` function to get searches then performs each one async
  performSearches(active, callback) {
    // pass active = false past searches, true for active searches for users
    // callback = function (bool success)
    let searches = statics.statics.searches
    var self = this;
      if (!searches || searches.length == 0) {
        let time = moment();
        Log.l(`No searches ${active ? "ACTIVE" : "HISTORIC"} to perform @ ${time}`);
        callback(true);
        return;
      }
      if (!Array.isArray(searches)) {
        Log.e("Invalid searches array object");
        callback(false);
        return;
      }
      console.log(`${active ? "ACTIVE" : "HISTORIC"} searches to perform: ${searches.length}`);
      let expiredSearchesCounter = new bpu.AsyncCounter(searches.length, () => {
        callback(true);
      });
      searches.forEach((search) => {
          self.performSearch(search, active, success => {
            expiredSearchesCounter.increment();
          });
        });
  }

  /**
   * Takes an internal 'search' object (a row from the searches table) 
   * and returns object with ebay = {specification for ebay api}, bpu = {additional useful info}
   */
  createEbaySearch(search, searchTime) {
    // TODO update to add previous sold item here ???
    if (!search) {
      return null;
    }
    var keywords = null;
    if (search.keywords && search.keywords.length > 0) {
      keywords = "";
      for (var i in search.keywords) {
        keywords += `${search.keywords[i].word} `; // NOTE there are much cleaner ways of doing this using the Ramda library - but its pretty intense
      }
    }
    // The order of items in ebaySearch Matters. If item filters dont come first then API request throws error 46 'Value is required'. Thus below if Statment. Probably could be neater - Jon
    if(searchTime){
      var ebaySearch = {
        StartTimeFrom: searchTime.toISOString(),
        ListingType: search.listing_type,
        entriesPerPage: 100,
        pageNumber: 1,
        categoryId: search.cat_id,
        sortOrder: 'StartTimeNewest',
      }
    } else {
      var ebaySearch = {
        entriesPerPage: 100,
        pageNumber: 1,
        ListingType: search.listing_type,
        categoryId: search.cat_id,
        sortOrder: 'StartTimeNewest',
      }
    }       
      
    if (search.max_price) {
      ebaySearch.MaxPrice = search.max_price;
    }
    if (keywords) {
      ebaySearch.keywords = keywords;
    }

    let info = {
      ebay: ebaySearch,
      bp: search,
      processed: 0 // Track number of results processed from each search
    };
    return info;
  }

  performSearch(search, active, callback) {
    // callback = function (bool success);
    if (!search) {
      callback(false);
      return;
    }
    if (Log.isDebug(2)) {
      Log.l(`performing ${active ? "ACTIVE" : "HISTORIC"} search @ ${moment().format('DD HH:mm:ss')} ${util.inspect(search,false,null,true)}`);
    }
    let sid = search.sid;
    let uid = search.uid;
    var self = this;
    if (active){
      let searchTime = this.active_data.getLastSearchTime(sid)
      if (!searchTime) {
        let info = this.createEbaySearch(search);
        if (!info) {
          callback(false);
          return;
        }
        this.performActiveSearch(sid, uid, info, callback)
      } else {
        let info = this.createEbaySearch(search, searchTime);
        if (!info) {
          callback(false);
          return;
        }
        this.performActiveSearch(sid, uid, info, callback)
      }
    } else {
      let info = this.createEbaySearch(search);
      if (!info) {
        callback(false);
        return;
      }
      this.performHistoricSearch(sid, info, callback)
    }
  }

  /**
   * Returns true if there are more results of the 
   */
  isMoreToProcess(info, data) {
    if (!info || !data || !data[0]) {
      return false;
    }
    let perPage = bpu.ebayInt(data[0], "paginationOutput/entriesPerPage");
    if (!perPage) {
      return false;
    }
    // adding additional search returns
    info.processed += perPage;
    if (info.processed >= info.bp.max_results) {
      return false;
    }
    let totalPages = bpu.ebayInt(data[0], "paginationOutput/totalPages");
    if (!totalPages || info.ebay.pageNumber >= totalPages) {
      return false;
    }
    info.ebay.pageNumber += 1;
    return true;
  }

  /// Active search results are stored in an in memory cache and forwarded to user
  /// We should place a limit on how many items we process for every search, probably only process 50 per search or something ???
  // do not traverse multiple pages ???
  performActiveSearch(sid, uid, info, callback) {
    let self = this;
    this.#ebay.findItemsAdvanced(info.ebay).then((data) => {
      if (!data) {
        callback(false);
        return;
      }
      //var current = self.active_data.get({uid: uid})
      let isNew = false //(info.ebay.pageNumber == 1);
      self.active_data.update(sid, uid, isNew, data);
      if (self.isMoreToProcess(info, data)) {
        self.performActiveSearch(sid, uid, info, callback);
      } else {
        callback(true);
        return;
      }
    }, (error) => {
      console.log(error);
      callback(false);
    });
  }

  #specificItems = [];
  #isSpecificsRunning = false;
  addItemToSearchSpecifics(item){
    this.#specificItems.push(item);
    this.prodSpecificItems();
  }

  prodSpecificItems(){
    if(this.#isSpecificsRunning){
      return;
    }
    this.#isSpecificsRunning = true;
    this.runSpecifics(this);
  }

  runSpecifics(self){
    self.performSpecifics(()=>{
      if(self.#specificItems.length > 0){
          self.specificsRunner = setTimeout(self.runSpecifics, 1.0, self);
      }else{
        Log.l(`Finished pulls specific data for items`);
        self.#isSpecificsRunning = false;
      }
    });
  }

  /*
  Takes items returned from finding api call and and returns item specifics
  getMultipleItems Call will only take 20 items at a time, therfore data is chunked before passing

  This is probably inifecient and should check if we have specifics in data before calling

  There is a limit on the rate of GetMultipleItem calls, I think this is arround 10 calls per second but isnt publicly stated
  */
  performSpecifics(onSpecificsFinished){
    if(this.#specificItems.length == 0){
      onSpecificsFinished();
      return;
    }
    let limitPerSecond = 5;
    let counter = new bpu.AsyncCounter(limitPerSecond, ()=>{
      onSpecificsFinished();
    })
    for(var i=0;i<limitPerSecond;i++){
      let limitPerSearch = 20;
      let startIndex = 0;
      let endIndex = (this.#specificItems.length > limitPerSearch ? limitPerSearch : this.#specificItems.length);
      let itemSplice = this.#specificItems.splice(startIndex,endIndex);
      let itemIds = itemSplice.map((item)=>{return item.itemId[0]})
      if(itemIds.length == 0) {
        counter.increment();
      } else {
        this.#ebay.getMultipleItems({
          itemId: itemIds,
          IncludeSelector: 'ItemSpecifics'
        }).then((data) => {
          // insert specifics data in database here JON !!
          counter.increment();
          /*
          for (let k = 0; k < data.Item.length; k++) {
            for (let l = 0; l < items[0].searchResult[0].item.length; l++) {
              if (items[0].searchResult[0].item[l].itemId[0] == data.Item[k].ItemID) {
                items[0].searchResult[0].item[l].specifics = data.Item[k].ItemSpecifics
              }
            }
          }
          if (count == chunked.length) {
            callback(items)
          }
          */
        }, (error) => {
          console.log('Failed to fetch specifics' + error);
          // if failed to fetch specifics end the items to the end of the items to search specifics array
          for(failedItem in itemSplice){
            this.#specificItems.push(failedItem);
          }
          counter.increment();
        });
      }
    } 
  }

  

  chunkdata(array, size) {
    let result = []
    for (let i = 0; i < array.length; i += size) {
      let chunk = array.slice(i, i + size)
      result.push(chunk)
    }
    return result
  }
  /*
    Queries the statistitian for the most relevant statistic for a particular item given properties in `criteria`
    criteria = a set of 
  */
  getStatistic(extension, bp, callback) {
    if (!callback) {
      return;
    }
    if (!extension) {
      callback(null);
      return;
    }
    // currently only query based on itemid for search grouping - but it theory we could query on many things
    var query = `${this.stats_endpoint}/${extension}`;
    console.log(`GET stat: ${query}`);
    axios.post(query, bp)
      .then(response => {
        callback(response);
      })
      .catch(error => {
        console.log(`[ERROR] Failed to get stat for ${query} : ${error}`);
        callback(null);
      });
  }

  /// Historic search results are stored in database
  performHistoricSearch(sid, info, callback) {
    let self = this;
    this.#ebay.findCompletedItems(info.ebay).then((data) => {
      if (!data) {
        callback(false);
        return;
      }
        // on item inserted callback
        if(success){
          // get specifics for this item
          self.addItemToSearchSpecifics(item);
        }
      }, success => {
        // on search inserted callback
        if (success) {
          console.log(`Successfully added results from search data sid=${sid}, page ${info.ebay.pageNumber}`);
          if (self.isMoreToProcess(info, data)) {
            self.performHistoricSearch(sid, info, callback);
          } else {
            callback(success);
            return;
          }
        } else {
          console.log(`Failed to get search results for ${util.inspect(ebaySearch)}`);
          callback(success);
          return;
        }
      });
  }

  createPeriods(self) {
    this.periodics = {
      categories: {
        running: false, // Some longer periodic functions take a long time to run - best to signal when then finish
        f: function (tag, period, callback) {
          }
        }
      }
  }

  /** ALL PERIODICS  */
  performPeriodics() {
    let self = this;
    let periodics = {
      pid: 1,
      tag: "categories",
      period: 604800,
      active: 1,
      last_updated: null,
      update_after: null
    }
      console.log("Performing periodic functions");
      if (periodics && Array.isArray(periodics) && periodics.length > 0) {
        for (var i = 0; i < periodics.length; i++) {
          let tag = periodics[i].tag;
          let period = periodics[i].period;
          if (!period || !tag) {
            continue;
          }
          let p = self.periodics[tag];
          if (p) {
            if (!p.running) {
              p.f(tag, period);
            }
          } else {
            console.error(`Failed to perform periodic ${tag}`);
          }
        }
      } else {
        Log.l('No periodics to perform')
      }

  }



}


module.exports = {
  app,
  Framework
};