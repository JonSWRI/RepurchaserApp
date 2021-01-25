# Really simple wrapper over console.log - I hate console.log bs
import json
config = None
### Extracting config
with open('./config.json', 'r') as fconfig: # TODO handle error
    config = json.loads(fconfig.read())
    
debug = config['debug'] if config['debug'] else 0

class Log:
    @staticmethod
    def isDebug(l):
        return (debug >= l) if l else False

    @staticmethod
    def l(msg,level=0):
        if debug >= level:
            print(msg)
    @staticmethod
    def w(msg,level=0):
        if debug >= level:
            print(msg)
    @staticmethod
    def w(msg,level=0):
        if debug >= level:
            print(msg)

