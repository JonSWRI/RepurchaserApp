'''
All mathematics is handled in python

NOTE TODO before production deploy with waitress :  
    https://medium.com/brillio-data-science/exposing-your-data-science-project-to-the-world-flask-with-a-waitress-8592f0356b27
'''
import json
from flask import Flask
from stats.stats_handler import StatsHandler
from flask import request
from flask import Response
from log import Log

config = None
### Extracting config
with open('./config.json', 'r') as fconfig: # TODO handle error
    config = json.loads(fconfig.read())
    
# Updating db config for python only values
config['db'].update(config['db_py'])
### Defining handler for statistics module
handler = StatsHandler(config)
### Defining server
app = Flask(__name__)
### Defining route note all these routes will be accessible only to internal processes
def json_error(msg):
    err = {'error' : msg}
    return json.dumps(err)

@app.route('/')
def hello_world():
    return 'Enter the void'

@app.route('/stats', methods=['POST'])
def statistitian():
    '''
        Triggering a statistics update of some type
        NOTE all input validation should be here
    '''
    group = request.args.get('group')
    queryResponse = {}
    json = request.get_json('title')

    if not group:
        return Response(json_error('invalid group'), status=400)  
    if Log.isDebug(2):
        Log.l('Updating statistic from group type `%s`\n'%group)
    try:
        if group == "search" and 'sids' in request.args:
            # running statistics over set of sids
            sids = request.args.get('sids')
            queryResponse = handler.runStatistic(group, {'sids':sids})
        elif group == "match" and 'sids' in request.args:
            # running statistics over set of sids
            sids = request.args.get('sids')
            title = json.get('title')
            #title = request.data.json.get('title')
            #Log.l('this is the title: `%s`\n'%request.data.get('title'))

            queryResponse = handler.runStatistic(group, {'sids':sids, 'title':title})
        
        else:
            queryResponse =  (json_error('invalid group'), 400)
    except:
        queryResponse = (json_error('generic error'), 400)
    #og.l('[STAT] [RESPONSE] %s\n'%(json.dumps(queryResponse)))
    return Response(queryResponse[0], status=queryResponse[1], mimetype='application/json')


# Running app after setup
app.run(debug=config['stats']['debug'], port=config['stats']['port'], host='127.0.0.1')

