import sqlite3, os
db_path = os.path.join(os.path.dirname(__file__), 'db.sqlite3')
conn = sqlite3.connect(db_path)
c = conn.cursor()
c.execute("SELECT name, app, applied FROM django_migrations WHERE app='products' ORDER BY id")
for r in c.fetchall():
    print(r)
conn.close()
