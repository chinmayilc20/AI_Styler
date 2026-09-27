import sqlite3
import os

DB_FILE = "wardrobe.db"
DATABASE_URL = os.getenv("DATABASE_URL")
P = "%s" if DATABASE_URL else "?"   # SQL parameter placeholder


def get_db_connection():
    if DATABASE_URL:
        import psycopg2
        import psycopg2.extras
        conn = psycopg2.connect(DATABASE_URL)
        conn.cursor_factory = psycopg2.extras.RealDictCursor
        return conn
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def _col_exists(cursor, table, column):
    cursor.execute(f"PRAGMA table_info({table})")
    return any(row[1] == column for row in cursor.fetchall())


def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    if DATABASE_URL:
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS items (
                id SERIAL PRIMARY KEY,
                user_id TEXT NOT NULL DEFAULT 'dev-user',
                image_path TEXT NOT NULL,
                category TEXT,
                sub_type TEXT,
                color TEXT,
                formality TEXT,
                description TEXT,
                availability TEXT DEFAULT 'available',
                availability_updated_at TIMESTAMP,
                available BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS feedback (
                id SERIAL PRIMARY KEY,
                user_id TEXT NOT NULL DEFAULT 'dev-user',
                outfit_items TEXT, weather_fit TEXT, event_fit TEXT,
                overall_note TEXT, feedback_type TEXT, feedback_text TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS outfit_history (
                id SERIAL PRIMARY KEY,
                user_id TEXT NOT NULL DEFAULT 'dev-user',
                item_ids TEXT NOT NULL,
                event_description TEXT,
                date TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        # PostgreSQL column migrations (idempotent via DO blocks)
        for table, col, defn in [
            ('items',         'user_id', "TEXT NOT NULL DEFAULT 'dev-user'"),
            ('feedback',      'user_id', "TEXT NOT NULL DEFAULT 'dev-user'"),
            ('outfit_history','user_id', "TEXT NOT NULL DEFAULT 'dev-user'"),
        ]:
            cursor.execute(f"""
                DO $$ BEGIN
                  ALTER TABLE {table} ADD COLUMN {col} {defn};
                EXCEPTION WHEN duplicate_column THEN NULL;
                END $$;
            """)
    else:
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL DEFAULT 'dev-user',
                image_path TEXT NOT NULL,
                category TEXT,
                sub_type TEXT,
                color TEXT,
                formality TEXT,
                description TEXT,
                availability TEXT DEFAULT 'available',
                availability_updated_at TIMESTAMP,
                available BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL DEFAULT 'dev-user',
                outfit_items TEXT, weather_fit TEXT, event_fit TEXT,
                overall_note TEXT, feedback_type TEXT, feedback_text TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS outfit_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL DEFAULT 'dev-user',
                item_ids TEXT NOT NULL,
                event_description TEXT,
                date TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # SQLite column migrations (add any missing columns)
        migrations = [
            ('items',          'sub_type',                'TEXT'),
            ('items',          'availability',            "TEXT DEFAULT 'available'"),
            ('items',          'availability_updated_at', 'TIMESTAMP'),
            ('items',          'user_id',                 "TEXT NOT NULL DEFAULT 'dev-user'"),
            ('feedback',       'user_id',                 "TEXT NOT NULL DEFAULT 'dev-user'"),
            ('outfit_history', 'user_id',                 "TEXT NOT NULL DEFAULT 'dev-user'"),
        ]
        for table, col, defn in migrations:
            if not _col_exists(cursor, table, col):
                cursor.execute(f'ALTER TABLE {table} ADD COLUMN {col} {defn}')

        # Backfill availability from old boolean column
        cursor.execute(
            "UPDATE items SET availability = 'available' WHERE availability IS NULL AND available = 1"
        )
        cursor.execute(
            "UPDATE items SET availability = 'damaged' WHERE availability IS NULL AND available = 0"
        )
        # Backfill user_id for pre-auth rows so dev-user can still see them
        cursor.execute("UPDATE items SET user_id = 'dev-user' WHERE user_id IS NULL OR user_id = ''")
        cursor.execute("UPDATE feedback SET user_id = 'dev-user' WHERE user_id IS NULL OR user_id = ''")
        cursor.execute("UPDATE outfit_history SET user_id = 'dev-user' WHERE user_id IS NULL OR user_id = ''")

    conn.commit()
    conn.close()


if __name__ == "__main__":
    init_db()
    print("Database initialized.")
