from stats.groups.search_group import SearchGroup  
from stats.db import Db
from stats.statistics.average import Average
from flask import Response
from stats.groups.fuzzy_group import Matcher
import json
from log import Log
'''
 * The main manager for statistics
'''
class StatsHandler:

    def __init__(self, config):
        # wrapper for database
        self.db = Db(config['db'])
                

    def runAllStatistics(self):
        '''
        First pass of all statistics
        '''
        # TODO potentially run all stats at the beginning of the run

    def runStatistic(self, groupType, props = {}):
        '''
        Run statistics over items within a group of `groupType`
        `props` = additional properties and constraints to the statistc
        NOTE input should have already been validated - this handles beginning of execution 
        '''
        if groupType == 'search':
            # Run statistics for items in catagories
            # Define your group
            group = SearchGroup()
            # get sids
            sids = props['sids']
            sid_list = sids.split(',')
            # Get items within that group
            if Log.isDebug(1):
                Log.l('calculating search average sid=%s\n'%props)
            items = group.seeker(self.db,sid_list)
            if not items:
                return ('{}', 200)
            # Run statistics on those items
            average = Average()
            result = average.grafter(items)
            json = group.toJson(result)
            if Log.isDebug(1):
                Log.l('calculated statistic : %s\n' % (json,))
            return (json,200)
        # TODO add any more stats types here
        if groupType == 'match':
            # Run statistics for items in catagories
            # Define your group
            group = SearchGroup()
            fuzzy = Matcher()
            # get sids
            sids = props['sids']
            title = props['title']
            sid_list = sids.split(',')
            # Get items within that group
            if Log.isDebug(1):
                Log.l('attempting to match=%s\n'%props)
            items = group.seeker(self.db,sid_list)
            matchedItems = fuzzy.matching(items,title)
            if not matchedItems:
                json = group.fail()
                return (json,200)
            # Run statistics on those items
            average = Average()
            result = average.grafter(matchedItems)
            json = group.toJson(result)
            if Log.isDebug(1):
                Log.l('calculated statistic : %s\n' % (json,))
            return (json,200)

        else:
            return None


