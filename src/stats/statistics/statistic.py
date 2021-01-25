# Holder class for the mathematics behind a given statistical function
class Statistic:
    
    def grafter(self,items):
        '''
        The Grafter function is the function that defines the maths to run on items in a specific group.   
        should return a score for that group along with a given error
        Accepts a list of `items` to use during calculation 
        '''
        return {
            "score": 0,
            "error" : 0
        }

    def transform(self, item):
        '''
        The transform function is required to provide a meaningful value
        to compare to the Grafter's output
        '''
        return 0
     