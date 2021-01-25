/// Setting up routes for navigation 
const util = require('util');
let UID = 1; // JON THIS IS HARDCODED UID RIGHT NOW 
function setup(server,framework) {
    // pass in main server obj from main.js
    /// Setting the content for the landing page '/'
    server.app.get('/login', function (req, res, next) {
        res.render('login');
    });

    server.app.get('/signUp', function (req, res, next) {
        res.render('signUp');
    });

    server.app.get('/home', function (req, res, next) {
        res.render('home');
    });

    server.app.get('/searches', function (req, res) {
        var search = 10
        
        framework.getSearchesToBrowser(function (results) {
            trigger(results)
        });

        function trigger(results) {
            search = results
            res.render('searches', {
                data : search,
        });

    };
});

    server.app.get('/', function (req, res) {
              /// Search for items currently out for bid
      // TODO hardcoded for UID = 1 !!! change after login
      let time = new Date(Date.now());  
      let info = {
            uid : parseInt(req.query.uid == null ? -1 : req.query.uid)
        };
        let data = framework.active_data.get(info);
        console.log(`Got results for ${util.inspect(info,false,null,true)}`);
        res.render('landing', {
            newData: data,
            t: time
        });
    });
};

module.exports = {
    'setup': setup
};