# Ebay Deal FInder

Makes API call
Returns items as html table

Uses NodeJS

Need to add: search terms, links to listings in html, more columns to table.

Needs much more testing before production but should work.

<b>special comment types:</b>
- Open questions are suffixed with '???'
- Open todos are prefixed with 'TODO'
- useful notes for understanding prefixed with NOTE
- useful code for reference, commented out prefixed with INFO

## Setup
- <b>BidPro</b> uses mySQL with nodejs connector backend and a pug frontend.
- Download and install mySQL community server from https://dev.mysql.com/downloads/windows/installer/8.0.html (call me)
- https://overiq.com/installing-mysql-windows-linux-and-mac/
- its useful to add mysql to PATH, see `env-var.png` and call me.
- NOTE : I had to do this https://stackoverflow.com/questions/50093144/mysql-8-0-client-does-not-support-authentication-protocol-requested-by-server
- `npm install` downloads deps in package.json
- for the root directory `node ./src/main.js` starts server - `main.js` = main entry point
- all server side js files in `./src` project folder e.g. main.js & server.js
- all client side js files are in `./src/public`. NOTE : anything in this folder may be served to the client side browser.

## Statistics
The current idea around statistics is the following:
- Each `group` has:
    - A uniquie `tag`.
    - A human readable description that explains the purpose of the `group`.
    - `seeker` function that defines a set of `itemids` to be used in the statistical function.
        - `seeker` function example 1: *all items in search sid=4*
        - `seeker` function example 2: *all items that are given by a fuzzy function for a set of keywords*
    - a `gatekeeper` function defines whether an individual item belongs to a `group`.
- Every statistic `stat` will have:
    - A unique `tag`.
    - A humand readable description of the statistic
    - A `period` for which to wait between running.
        * if this period is `0` then its considered an **active** function and t he stat should be updated every time a new `member` is added to a `group`.
    - A `grafter` function - the function that performs the statistic over the items returned by the `gatekeeper`.
- Each group will have a set of `stats`
    - A single `score` for this stat on this `group`.
    - An `error` (optional) for this `score`.
- There will be a set of `Jury` functions:
    - Each `Jury` may trigger if something like **trigger when `stat` X for `group` Y > T_{statX}**
    - An `inquisitor` takes an item ID, finds which `groups` this Id belongs to and collects the relevant `stats` and works out if the `Juries` will be **triggered**.
- **Question - does it make more sense to have a period for groups or statistical functions ???**


## Useful for Jon
### Debugging
- Use VS code, the javascript debugger looks at `./.vscode/launch.json` for launch configuration. So you can launch the server through the vs code terminal `Run -> start debugging` and set breakpoints etc. (It's often much easier than printing everything out).

### Workflow
- Server side and client side code should be and mostly has to be completely separate.
- communicate to ebay on server side with your personal api details and serve results to client.
- pages are served to the client using `app.get` i.e. in this case `server.app.get` in main.js
    - e.g. `server.app.get('/'...)` is called when client navigates to `localhost:PORT/` as `server.app.get('/beef'...)` would be  `localhost:PORT/beef`.
- IMPORTANT === the 2nd argument to `app.get('/', function ...) talk about this tomorrow. 
- The refresh timer is called on the client side. And this refresh to `/` triggers the backend to pull more data from ebay and directly serve this data to the request.
- It's currently set to refresh every 20 seconds - see `client.js` -> `AutoRefresh(20000)`
- ... more tomorrow

### Git commands
- `git add .` - adds add file changes under this directory `.` recursively.
- `git commit -m "Some commit message"` - commits changes
- `git push` - uploads commit to git servers
- `git checkout dev` - checkouts out `dev` branch
- while on `dev` - `git merge master` will merge changes from `master` into `dev`.
- If there is a conflict on merge then search for "<<<" in all source files and you will see the changes. 

### mySQL stuff
- We are using MySQL.
- convension is to put all user defined parts of a query in lowercase and all SQL keywords in UPPERCASE - this is convension and it would work anyway.
- Background and information on types : https://www.digitalocean.com/community/tutorials/sqlite-vs-mysql-vs-postgresql-a-comparison-of-relational-database-management-systems  
- Add `mysql` to windows system path, `C:\Program Files\MySQL\MySQL Server 8.0\bin`
- Its useful to have a mySQL shell open to play around with the database: `mysql -u [USERNAME] -p` then enter password when prompted.
- Make sure that the terminal is in <b>sql mode</b> with `\sql`, <b>all commands end in `;`</b>
- NOTE theres an annoying auth issue, in sql mode run :  `ALTER USER '[USER]' IDENTIFIED WITH mysql_native_password BY '[PASS]';`
- List all databases : `show databases;`
- Open a database : `use DBNAME;`
- show list of tables : `show tables;`
- `show columns from [TABLE];`
- Once in a database standard sql syntax can be used to look around.
- NOTE foreign keys can be confusing at first - they're just references to other tables see https://dev.mysql.com/doc/refman/5.6/en/create-table-foreign-keys.html
- Create database : `create database [NAME];`
- Delete database : `drop database [NAME];`
- delete rows : `delete from [TABLE] [where ...];`
- After running the fill categories periodic function you can look in our local db of categories:
    - e.g. `select * from categories where name like '%camera%';`
- 


# PLAN OF ACTION 
- For every historical item added to the db, check its catagory and get the `category specifics`, create a new table for those specifics, linked to an item id.
- For every historical item, get the specifics for that item and store it
- Only after all historical items have been processed, that were listed or sold between now and the last time we ran that search (or 2 months ago) do we start to process active items
- For each active item listed in the last hour, or since the last active search time, farm these off to a list where you pull the item specifics.
- Once the specifics are pulled, run your stats engine over the set of items with those specifics to get the maths.
- Then find if the item is interesting
- if it is farm this off to a separate watcher.
- TODO handle emojis in name ? with string encoding 