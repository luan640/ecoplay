import sqlite3, os
db_path = os.path.join(os.path.dirname(__file__), 'db.sqlite3')
print('DB path:', db_path)
conn = sqlite3.connect(db_path)
c = conn.cursor()
c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('platforms','categories')")
tables = [r[0] for r in c.fetchall()]
print('Found tables:', tables)
for t in tables:
    c.execute(f'SELECT COUNT(*) FROM {t}')
    print(f'  {t}: {c.fetchone()[0]} rows')
conn.close()
