const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'database.sqlite'));

db.pragma('journal_mode = WAL');

const initDb = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS guilds (
      guild_id TEXT PRIMARY KEY,
      locale TEXT DEFAULT 'en',
      panel_channel_id TEXT,
      panel_message_id TEXT,
      embed_color TEXT DEFAULT '#0099ff',
      embed_footer TEXT DEFAULT 'Support Tickets by FroglyStudios',
      embed_logo TEXT,
      embed_title TEXT DEFAULT 'Support Tickets',
      embed_description TEXT DEFAULT 'Please select a category below to open a support ticket.',
      moderator_roles TEXT DEFAULT '[]',
      enable_feedback INTEGER DEFAULT 1,
      panel_type TEXT DEFAULT 'dropdown'
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT,
      name TEXT,
      require_reason INTEGER DEFAULT 1,
      emoji TEXT,
      custom_id TEXT,
      button_color TEXT DEFAULT '1',
      ticket_message TEXT DEFAULT 'Please wait for a staff member to assist you.'
    );

    CREATE TABLE IF NOT EXISTS messages (
      guild_id TEXT,
      message_key TEXT,
      content TEXT,
      PRIMARY KEY (guild_id, message_key)
    );

    CREATE TABLE IF NOT EXISTS tickets (
      ticket_id TEXT PRIMARY KEY,
      guild_id TEXT,
      user_id TEXT,
      channel_id TEXT,
      status TEXT DEFAULT 'open',
      category_id INTEGER,
      reason TEXT,
      priority TEXT DEFAULT 'none',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT,
      name TEXT,
      content TEXT,
      regex TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(guild_id, name)
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
      label TEXT,
      type TEXT DEFAULT 'TEXT',
      required INTEGER DEFAULT 1,
      min_length INTEGER DEFAULT 0,
      max_length INTEGER DEFAULT 4000,
      placeholder TEXT,
      style INTEGER DEFAULT 2
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT,
      ticket_id TEXT,
      user_id TEXT,
      stars INTEGER,
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS archived_messages (
      id TEXT PRIMARY KEY,
      ticket_id TEXT,
      author_id TEXT,
      author_username TEXT,
      author_avatar TEXT,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_bot INTEGER DEFAULT 0
    );
  `);

  // Migrations for existing tables (ignore errors if columns already exist)
  const addColumn = (table, column, definition) => {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    } catch (e) {
      // Ignore "duplicate column name" error
    }
  };

  // Expand categories table
  addColumn('categories', 'staff_roles', 'TEXT DEFAULT "[]"');
  addColumn('categories', 'ping_roles', 'TEXT DEFAULT "[]"');
  addColumn('categories', 'required_roles', 'TEXT DEFAULT "[]"');
  addColumn('categories', 'description', 'TEXT DEFAULT ""');

  // Expand tickets table
  addColumn('tickets', 'claimed_by_id', 'TEXT');
  addColumn('tickets', 'closed_by_id', 'TEXT');
  addColumn('tickets', 'closed_reason', 'TEXT');
  addColumn('tickets', 'priority', 'TEXT');
  addColumn('tickets', 'topic', 'TEXT');
  addColumn('tickets', 'closed_at', 'DATETIME');

  // Expand guilds table
  addColumn('guilds', 'log_channel_id', 'TEXT');
  addColumn('guilds', 'moderator_roles', 'TEXT');
  addColumn('guilds', 'enable_feedback', 'INTEGER DEFAULT 1');
  addColumn('guilds', 'panel_type', 'TEXT DEFAULT "dropdown"');
  addColumn('categories', 'button_color', 'TEXT DEFAULT "1"');
  addColumn('categories', 'ticket_message', 'TEXT DEFAULT "Please wait for a staff member to assist you."');
  addColumn('tickets', 'priority', 'TEXT DEFAULT "none"');
};

initDb();

module.exports = db;
