const bpu = require('./bputils.js');
const util = require('util');
const Log = require('./log.js')
/// This is in memory cache - effectively meant to mirror database tables
class Actives{
    // TODO We could make this more cpu efficient by potentially having one of these caches per active logged in user or per search
                /// Obviously this would be less memory efficient - potentially some network optimizations in here somewhere too.

    /// map of item ids to bidpro item info
    #items = {};

    // map of user IDs -> [search IDs]
    #user_searches = {};

    // map of search IDs -> [itemIDs]
    #search_items = {};

    // Statistics holder
    #stats = {
        search : {},
        item : {} 
    // NOTE add other stat types here
    
    };


    constructor(server){
        // pointer to server - used to query the statistian to run maths on data
        this.server = server;
    }

    /// update the active cache with new search results
    update(sid,uid,isNew,data){
        var now = Date.now();
        // sid = searchID
        // uid = userID
        // isNew = if old search data should be discarded pass TRUE
        // data = ebay item results
        if(!bpu.isNum(sid) || !bpu.isNum(uid)){
            console.error("[ERROR] Failed to add active search data - invalid sid or uid");
            return;
        }
        var u_s = this.#user_searches;
        // update the user with a new search 
        if(u_s[uid] == null){
            u_s[uid] = new Set();
        }
        u_s[uid].add(sid);
        let c_items = bpu.isValidEbayResult(data)
        if(c_items == null){
            return;
        } 
        var self = this;
        var s_i = this.#search_items;
        // once the search is performed again discard the old results
        if(s_i[sid] == null || isNew){
            s_i[sid] = []; 
        }
        var s_i_s = s_i[sid];
        // update items with new data
        var numberAdded = 0
        for(var i in c_items){
            let bp = bpu.convertEbayToBidpro(c_items[i]);
            if(!bp){
                continue;
            }
            // check to see if statistics should be updated
            var update_stat = true;
            var item = self.#items[bp.id];
            if(item && item.stat){
                // found previous statistic
                if(item.stat.update_after > now){
                    // move store of temporary statistic
                    bp.stat = item.stat;
                    update_stat = false;
                }
            }
            if (!self.#items[bp.id]){
                s_i_s.push(bp.id);
                self.#items[bp.id] = bp;
                numberAdded++
            }         
            if(update_stat){
                item = self.#items[bp.id];
                self.update_search_statistic(item, sid, now);     
            }
        }
        if (Log.isDebug(1)){
            Log.l(`Stored ${numberAdded} ${isNew ? "" : "more"} active items for search ${sid} for user ${uid}`);    
        } 
    }

    // TODO we will need some sort of paging at some point !???!
    get(info){
        // info = obj where .sid to return results for a search and .uid to return results for a user
        // TODO only user done at the moment
        if(!info || !bpu.isNum(info.uid)){return;}
        let self = this;
        let results = [];
        let s = this.#user_searches[info.uid];
        if (!s){
            return []
        }
        let s_k = s.keys();
        let result = s_k.next();
        while(!result.done){
            let s_i = self.#search_items[result.value];
            if(s_i){
                for(let v_i in s_i){
                    let item = self.#items[s_i[v_i]];
                    if(item){
                        results.push(item);
                    }
                }
            }
            result = s_k.next();
        }
        //sort by listing start time (newest first) Could add more sorting here if/when required
        let sorted = results.sort((a, b) => (a.list_start < b.list_start) ? 1 : -1)
        let sliced = sorted.slice(1,50);
        return sliced
    }

    

    update_search_statistic(bp, sid, now){
        // Update statistic for `bp` bidpro item in #items map for the corresponding `sid`
        // NOTE This could have unintended consequences if you store one ruling statistic for a particular item
        // This function has control of what ruling statistic should be used against which item
        var self = this;
        // ======================================================================================================
        // For now we only care about the average of a particular search
        var search = self.#stats.search[sid];
        if ( search ){
            if( search.running ){
                // statistic is currently running - it will update of next iteration
                return;
            }else{
                // stats data exists
                if( search.update_after > now ){
                    // no need to update statistic just copy it
                    bp.stat = search;
                    return;
                }
            }
        }else{
            self.#stats.search[sid] = {};
            search = self.#stats.search[sid];
        }
        // If we get here - we need to update the statistic
        // let the statistics owner know that you are currently running this statistic
        search.running = true;
        this.server.getStatistic(`stats?group=search&sids=${sid}`, (response) => {
            if(!response || !response.data || !response.data.score){
                Log.e(`[ERROR] Failed to get statistic for sid=${sid}, recieved : ${util.inspect(response)}`);
                self.#stats.search[sid].running = false;
                return;
            }
            if(Log.isDebug(1)){
                Log.l(`Received search statistic for sid=${sid} : ${util.inspect(response.data)}`);
            }
            response.data.update_after = (Date.now() + (60*60*1000) );
            response.data.running = false;
            // store response for the next iteration
            self.#stats.search[sid] = response.data;
        });
    }

    update_item_statistic(bp, sid, now){
        // Update statistic for `bp` bidpro item in #items map for the corresponding `sid`
        // NOTE This could have unintended consequences if you store one ruling statistic for a particular item
        // This function has control of what ruling statistic should be used against which item
        var self = this;
        // ======================================================================================================
        // For now we only care about the average of a particular search
        var item = self.#stats.item[bp.id];
        if ( item ){
            if( item.running ){
                // statistic is currently running - it will update of next iteration
                return;
            }else{
                // stats data exists
                if( item.update_after > now ){
                    // no need to update statistic just copy it
                    bp.stat = item;
                    return;
                }
            }
        }else{
            self.#stats.item[bp.id] = {};
            item = self.#stats.item[bp.id];
        }
        // If we get here - we need to update the statistic
        // let the statistics owner know that you are currently running this statistic
        item.running = true;
        this.server.getStatistic(`stats?group=match&sids=${sid}`, bp, (response) => {
            if(!response || !response.data || !response.data.score){
                Log.e(`[ERROR] Failed to get statistic for sid=${bp.id}, recieved : ${util.inspect(response)}`);
                self.#stats.item[bp.id].running = false;
                return;
            }
            if(Log.isDebug(1)){
                Log.l(`Received item statistic for Item id=${bp.id} : ${util.inspect(response.data)}`);
            }
            response.data.update_after = (Date.now() + (60*60*1000) );
            response.data.running = false;
            // store response for the next iteration
            self.#stats.item[bp.id] = response.data;
        });
    }
    
    //Takes sid and returns the most recent start time.
    //New active searches will only look for items listed since this time
    getLastSearchTime(sid){

        let items = this.#search_items[sid];
        if (!items){
            return
        }
        let dates = []
        for (var i = 0; i < items.length; i++) {
             dates.push(new Date(this.#items[items[i]].list_start))
        }
        
        var latest = new Date(Math.max.apply(null,dates));
        console.log(latest)
        console.log(new Date(this.#items[items[0]].list_start))    
               
        return latest;            
    }


}

module.exports = { Actives }