# A collection of itemIds to run the statistics over defines a group
class Group:

    def seeker(self,db):
        '''
         seeker is a function that returns a list of items to run a certain 
        // statistic over
        // db = database handler from which to extract items
        '''

    def gatekeeper(self,item):
        '''
        // Gatekeeper is very similar to the seeker function.
        // except the seekers finds historical items
        // and gatekeeper returns whether an item belongs to this group
        '''
        return False
    