const Fuse= require('fuse.js');


function fuzzyCompare(activeItems) {
    const options = {
        isCaseSensitive: false,
        findAllMatches: false,
        includeMatches: false,
        includeScore: false,
        useExtendedSearch: false,
        minMatchCharLength: 1,
        shouldSort: true,
        threshold: 0.6,
        location: 0,
        distance: 100,
        keys: [
        "title"
        ]
    };
    
    const fuse = new Fuse(activeItems, options);
    
    // Change the pattern
    const pattern = "Canon ef-s 18-135mm F3.5-5.6 IS Lens"
    
    return fuse.search(activeitems)
    

};

module.exports = {
    'fuzzyCompare': fuzzyCompare
};