const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Resolve the absolute path to users.db in the current directory
const dbPath = path.join(__dirname, "users.db");

// Connect to the SQLite database file (creates the file if it does not exist)
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error connecting to the SQLite database:", err.message);
  } else {
    console.log("Connected to SQLite database: users.db");
  }
});

// SQL query to create the users table if it does not already exist
const createUsersTableQuery = `
  CREATE TABLE IF NOT EXISTS users (
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password TEXT NOT NULL
  );
`;

// Execute the table creation query automatically on startup
db.run(createUsersTableQuery, (err) => {
  if (err) {
    console.error("Error creating users table:", err.message);
  } else {
    console.log("Users table initialized successfully.");
  }
});

// Export the database instance for use in server.js
module.exports = db;
