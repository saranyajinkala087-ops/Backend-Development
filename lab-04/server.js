const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("./database");

// Create Express application instance
const app = express();
const PORT = process.env.PORT || 3000;

// Temporary secret key for signing JWTs
const SECRET_KEY = "MY_TEMPORARY_SECRET_KEY";

// Middleware to parse incoming JSON request bodies
app.use(express.json());

// Root endpoint for deployment health checks and browser verification
app.get("/", (req, res) => {
  res.send("Lab 4 Authentication API is running");
});

// Helper function to query a single row using a Promise for async/await
const dbGet = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

// Helper function to execute an INSERT/UPDATE query using a Promise for async/await
const dbRun = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
};

// POST /register - Register a new user
app.post("/register", async (req, res) => {
  try {
    const { username, name, password } = req.body;

    // 1. Validate that all three fields are provided
    if (!username || !name || !password) {
      return res.status(400).send("All fields (username, name, password) are required");
    }

    // 2. Check if the username already exists in the users table
    const checkUserQuery = `SELECT * FROM users WHERE username = ?;`;
    const existingUser = await dbGet(checkUserQuery, [username]);

    if (existingUser) {
      return res.status(400).send("User already exists");
    }

    // 3. Hash the password with 10 salt rounds (never store plain-text passwords)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Insert the new user into the database using parameterized query to prevent SQL injection
    const insertUserQuery = `
      INSERT INTO users (username, name, password)
      VALUES (?, ?, ?);
    `;
    await dbRun(insertUserQuery, [username, name, hashedPassword]);

    // 5. Send success response with status 201 (Created)
    return res.status(201).send("User registered successfully");
  } catch (error) {
    console.error("Error during registration:", error.message);
    return res.status(500).send("Internal Server Error");
  }
});

// POST /login - Authenticate user and return JWT
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. Validate that both username and password are provided
    if (!username || !password) {
      return res.status(400).send("Both username and password are required");
    }

    // 2. Find user in the SQLite database by username
    const getUserQuery = `SELECT * FROM users WHERE username = ?;`;
    const user = await dbGet(getUserQuery, [username]);

    // 3. Return status 400 if the user does not exist
    if (!user) {
      return res.status(400).send("Invalid user");
    }

    // 4. Verify password with bcrypt.compare against stored hashed password
    const isPasswordMatched = await bcrypt.compare(password, user.password);

    // 5. Return status 400 if the password does not match
    if (!isPasswordMatched) {
      return res.status(400).send("Invalid password");
    }

    // 6. Generate JWT containing ONLY username in payload (never passwords/hashes)
    const payload = { username: user.username };
    const jwtToken = jwt.sign(payload, SECRET_KEY);

    // 7. Return status 200 with JSON containing jwt_token
    return res.status(200).json({ jwt_token: jwtToken });
  } catch (error) {
    console.error("Error during login:", error.message);
    return res.status(500).send("Internal Server Error");
  }
});

// Start the Express server on all network interfaces (0.0.0.0) for cloud deployment
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running at http://0.0.0.0:${PORT}/`);
});

// Export app for testing or modular usage
module.exports = app;
