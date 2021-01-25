'''
    Definition for groups that are defined by grouping results of specific catagories 
'''
from stats.groups.group import Group
import json
from log import Log
class SearchGroup(Group):

    def seeker(self, db, sids):
        if Log.isDebug(2):
            Log.l('Getting items in sids = %s'%(tuple(sids)))
        result = db.execute('SELECT it.id, it.converted_price, it.converted_id, sit.sid, it.title FROM items AS it JOIN search_items AS sit ON it.id = sit.iid WHERE sit.sid IN {l}'.format(l=db.inList(sids)))
        if not result:
            return None
        items = result[1].fetchall()
        db.close(result)
        self.sids = sids
        return items

    def toJson(self, result):
        if not result:
            return '{}'
        try:
            r = {
                'type' : 'search',
                'score' : result[0],
                'error' : result[1],
                'sids' : self.sids
            }
            
            return json.dumps(r)
        except:
            return '{}'
    
    def fail(self):
        try:
            r = {
                'type' : 'search',
                'score' : 'Not Matched',
                'error' : 'N/A',
                'sids' : '1'
            }
            
            return json.dumps(r)
        except:
            return '{}'
