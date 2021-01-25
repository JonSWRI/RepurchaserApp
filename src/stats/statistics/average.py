from stats.statistics.statistic import Statistic
import numpy as np
'''
example of implementation of simple statistic - The standard average
'''
class Average(Statistic):

    def grafter(self, items):
        i = [x[1] for x in items]
        mean = np.mean(i)
        err = np.sqrt(np.var(i))
        return (mean, err)

    def transform(self,item):
        return {}

        