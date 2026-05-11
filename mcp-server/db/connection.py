import logging
import os
import pymysql
import pymysql.cursors
from dotenv import load_dotenv

load_dotenv()

log = logging.getLogger(__name__)


def get_connection():
    host = os.environ["DB_HOST"]
    port = int(os.environ.get("DB_PORT", 3306))
    user = os.environ["DB_USER"]
    db   = os.environ["DB_NAME"]
    log.info("DB connect → %s@%s:%s/%s", user, host, port, db)
    conn = pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=os.environ["DB_PASSWORD"],
        database=db,
        cursorclass=pymysql.cursors.DictCursor,
    )
    log.info("DB connected OK")
    return conn
