'''
 wrapper for db connections
'''
import mysql.connector
from mysql.connector import errorcode
from mysql.connector import Error
from mysql.connector.connection import MySQLConnection
from mysql.connector import pooling
import sys
from log import Log


class Db:
    def __init__(self, config):
        self.config = config
        self.ctx = mysql.connector.pooling.MySQLConnectionPool(pool_name='statinizer',**self.config)

    def inList(self, l):
        if not l:
            return "()"
        return "({a})".format(a=', '.join(l))

    def execute(self, command):
        '''
            This executes a given command - you must close cursor after use
        '''
        conn = None
        cursor = None
        try:
            # see https://pynative.com/python-database-connection-pooling-with-mysql/
            # see https://stackoverflow.com/questions/29772337/python-mysql-connector-unread-result-found-when-using-fetchone
            conn = self.ctx.get_connection()
            if conn.is_connected():
                cursor = conn.cursor(buffered=True)
                if Log.isDebug(2):
                    Log.l("executing '%s'"%command)
                cursor.execute(command)
                return (conn, cursor)
            else:
                Log.e('Failed to get connection for execution')
                return
        except mysql.connector.Error as err:
            if err.errno == errorcode.ER_TABLE_EXISTS_ERROR:
                Log.e("already exists.")
            else:
                Log.e(err.msg)
            self.close((conn,cursor))
        except:
            Log.e('on execute : %s'%(sys.exc_info()[0]))
            self.close((conn,cursor))

        return None

    def close(self, conncursor):
        # safe cursor closing function
        # Make sure you always call this or bad things happen and you don't know why ...
        try:
            if not conncursor:
                Log.e('[ERROR] connection-cursor invalid')
                return
            if(conncursor[0].is_connected()):
                if conncursor[1] is not None:
                    conncursor[1].close()
                conncursor[0].close()
        except:
            Log.e("[ERROR] closing cursor failed")
