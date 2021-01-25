from log import Log
from fuzzywuzzy import fuzz

class Matcher:
    # Takes an item 'title' and list of sold 'items' and returns sold items matching title
    # This only works well if one is a subset of the other
    def matching(self, items, title):
        matched = []
        for val in items:
            Str1 = val[4]
            Str2 = title
            # Partial Ratio: if the short string has length k and the longer string has the length m, then the algorithm seeks the score of the best matching length-k substring.
            #Partial_Ratio = fuzz.partial_ratio(Str1.lower(),Str2.lower())
            # Token Sort Ratio: the string tokens get sorted alphabetically and then joined together. After that, a simple fuzz.ratio() is applied to obtain the similarity percentage
            #Token_Sort_Ratio = fuzz.token_sort_ratio(Str1,Str2)
            # token_set_ratio performs a set operation that takes out the common tokens (the intersection) and then makes fuzz.ratio() pairwise comparisons between the following new strings:
            Token_Set_Ratio = fuzz.token_set_ratio(Str1,Str2)
            Token_Set_RatioRev = fuzz.token_set_ratio(Str2,Str1)
            if Token_Set_Ratio == 100 or Token_Set_RatioRev == 100:
                if Log.isDebug(1):
                    Log.l(val[4])
                matched.append(val)
        return matched