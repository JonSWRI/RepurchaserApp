const bpu = require('./bputils.js');
const Log = require('./log.js');
/**
 * Class to handle getting and organising item specifics
 */
class Specifics {
    #server = null;
    #ebay = null;
    constructor(server, ebay) {
        this.#server = server;
        this.#ebay = ebay;
    }
    // list of categories IDs that need to be checked to see if a table of category specifics exist.
    #categoriesToPull = []
    // list of item IDs that need to be checked to see if specifics about that item need to be pulled.
    #specificItems = [];
    #isSpecificsRunning = false;

    addItemIdToSearchSpecfics(itemId,catId){
        this.#server.checkCategorySpecifics(catId, success => {
            if(success){
                Log.l(`Adding item ${itemId} to item specifics list`)
                this.#specificItems.push(itemId);
                this.prodSpecificItems();
            }
        })
        
    }

    addItemToSearchSpecifics(item, catId) {
        if(!item || !item.itemId){
            Log.e(`Failed to pull item specifics for invalid item ${item}`);
            return;
        }
        this.addItemIdToSearchSpecfics(item.itemId, catId);
    }

    prodSpecificItems() {
        if (this.#isSpecificsRunning) {
            return;
        }
        this.#isSpecificsRunning = true;
        this.runSpecifics(this);
    }

    runSpecifics(self) {
        self.performSpecifics(() => {
            if (self.#specificItems.length > 0) {
                self.specificsRunner = setTimeout(self.runSpecifics, 5000, self);
            } else {
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
    performSpecifics(onSpecificsFinished) {
        if (this.#specificItems.length == 0) {
            onSpecificsFinished();
            return;
        }
        let limitPerSecond = 5;
        let counter = new bpu.AsyncCounter(limitPerSecond, () => {
            onSpecificsFinished();
        })
        for (var i = 0; i < limitPerSecond; i++) {
            let limitPerSearch = 20;
            let startIndex = 0;
            let endIndex = (this.#specificItems.length > limitPerSearch ? limitPerSearch : this.#specificItems.length);
            let itemIds = this.#specificItems.splice(startIndex, endIndex);
            if (itemIds.length == 0) {
                counter.increment();
            } else {
                this.#ebay.getMultipleItems({
                    itemId: itemIds,
                    IncludeSelector: 'ItemSpecifics'
                }).then((data) => {
                    // insert specifics data in database here JON !!
                    counter.increment();
                    console.log(`Fetched item specifics for ${startIndex} -> ${endIndex}`);
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
                    for (failedItem in itemSplice) {
                        this.#specificItems.push(failedItem);
                    }
                    counter.increment();
                });
            }
        }
    }


}



module.exports = {
    Specifics
};