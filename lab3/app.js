const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "books.db");

let db = null;
let dbInitPromise = null;

const initializeDB = async () => {
  if (!dbInitPromise) {
    dbInitPromise = (async () => {
      const database = await open({
        filename: dbPath,
        driver: sqlite3.Database,
      });
      db = database;
      return database;
    })();
  }
  return dbInitPromise;
};

// Middleware to ensure DB connection is ready before handling requests
app.use(async (request, response, next) => {
  if (!db) {
    try {
      await initializeDB();
    } catch (err) {
      return response.status(500).json({ error: `Database connection error: ${err.message}` });
    }
  }
  next();
});

const initializeDBAndServer = async () => {
  try {
    await initializeDB();
    if (require.main === module || process.env.NODE_ENV !== "test") {
      app.listen(3000, () => {
        console.log("Server Running at http://localhost:3000/");
      });
    }
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

// 1. GET /books - Retrieve books with search, sorting, price range, and pagination
app.get(["/books", "/books/"], async (request, response) => {
  try {
    const {
      search_q = "",
      order_by = "id",
      order = "ASC",
      limit = 10,
      offset = 0,
      min_price,
      max_price,
    } = request.query;

    // Allowed columns for ORDER BY whitelist to prevent SQL injection
    const allowedColumns = ["id", "title", "author", "price", "pages"];
    const normalizedOrderBy = String(order_by).trim().toLowerCase();
    const sanitizedOrderBy = allowedColumns.includes(normalizedOrderBy) ? normalizedOrderBy : "id";

    // Whitelist sorting direction
    const sanitizedOrder = String(order).trim().toUpperCase() === "DESC" ? "DESC" : "ASC";

    // Sanitize pagination parameters
    const parsedLimit = parseInt(limit, 10);
    const sanitizedLimit = !Number.isNaN(parsedLimit) && parsedLimit > 0 ? parsedLimit : 10;

    const parsedOffset = parseInt(offset, 10);
    const sanitizedOffset = !Number.isNaN(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;

    // WHERE clause conditions and parameters
    const whereConditions = ["title LIKE ?"];
    const queryParams = [`%${search_q}%`];

    // Price-range filter using SQL BETWEEN
    if (min_price !== undefined || max_price !== undefined) {
      const min = min_price !== undefined && !Number.isNaN(Number(min_price)) ? Number(min_price) : 0;
      const max = max_price !== undefined && !Number.isNaN(Number(max_price)) ? Number(max_price) : 1000000000;
      whereConditions.push("price BETWEEN ? AND ?");
      queryParams.push(min, max);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    // Parameterized SQL query
    const getBooksQuery = `
      SELECT
        *
      FROM
        book
      ${whereClause}
      ORDER BY
        ${sanitizedOrderBy} ${sanitizedOrder}
      LIMIT ? OFFSET ?;
    `;

    queryParams.push(sanitizedLimit, sanitizedOffset);

    const booksArray = await db.all(getBooksQuery, queryParams);
    response.status(200).json(booksArray);
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

// 2. GET /books/:bookId - Retrieve a single book using its ID
app.get(["/books/:bookId", "/books/:bookId/"], async (request, response) => {
  try {
    const { bookId } = request.params;
    const getBookQuery = `
      SELECT
        *
      FROM
        book
      WHERE
        id = ?;
    `;
    const book = await db.get(getBookQuery, [bookId]);

    if (!book) {
      return response.status(404).json({ message: "Book Not Found" });
    }

    response.status(200).json(book);
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

// 3. POST /books - Add a new book with body validation
app.post(["/books", "/books/"], async (request, response) => {
  try {
    const { title, author, price, pages } = request.body || {};

    // Validate title: must be present and a non-empty string
    if (title === undefined || title === null || typeof title !== "string" || title.trim() === "") {
      return response.status(400).json({ message: "Title is required and must be a non-empty string" });
    }

    // Validate author: must be present and a non-empty string
    if (author === undefined || author === null || typeof author !== "string" || author.trim() === "") {
      return response.status(400).json({ message: "Author is required and must be a non-empty string" });
    }

    // Validate price: must be present, numeric, and not boolean
    if (
      price === undefined ||
      price === null ||
      price === "" ||
      typeof price === "boolean" ||
      Number.isNaN(Number(price))
    ) {
      return response.status(400).json({ message: "Price is required and must be a numeric value" });
    }

    const numericPrice = Number(price);
    const numericPages = pages !== undefined && pages !== null && !Number.isNaN(Number(pages)) ? Number(pages) : null;

    const addBookQuery = `
      INSERT INTO
        book (title, author, price, pages)
      VALUES
        (?, ?, ?, ?);
    `;
    const result = await db.run(addBookQuery, [
      title.trim(),
      author.trim(),
      numericPrice,
      numericPages,
    ]);

    response.status(201).json({
      message: "Book Added Successfully",
      bookId: result.lastID,
    });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

// 4. PUT /books/:bookId - Update an existing book using its ID
app.put(["/books/:bookId", "/books/:bookId/"], async (request, response) => {
  try {
    const { bookId } = request.params;
    const { title, author, price, pages } = request.body || {};

    const checkBookQuery = `
      SELECT
        *
      FROM
        book
      WHERE
        id = ?;
    `;
    const existingBook = await db.get(checkBookQuery, [bookId]);

    if (!existingBook) {
      return response.status(404).json({ message: "Book Not Found" });
    }

    const updatedTitle = title !== undefined && typeof title === "string" ? title.trim() : existingBook.title;
    const updatedAuthor = author !== undefined && typeof author === "string" ? author.trim() : existingBook.author;
    const updatedPrice = price !== undefined && !Number.isNaN(Number(price)) ? Number(price) : existingBook.price;
    const updatedPages = pages !== undefined && !Number.isNaN(Number(pages)) ? Number(pages) : existingBook.pages;

    const updateBookQuery = `
      UPDATE
        book
      SET
        title = ?,
        author = ?,
        price = ?,
        pages = ?
      WHERE
        id = ?;
    `;
    await db.run(updateBookQuery, [
      updatedTitle,
      updatedAuthor,
      updatedPrice,
      updatedPages,
      bookId,
    ]);

    response.status(200).json({ message: "Book Updated Successfully" });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

// 5. DELETE /books/:bookId - Delete a book using its ID
app.delete(["/books/:bookId", "/books/:bookId/"], async (request, response) => {
  try {
    const { bookId } = request.params;

    const checkBookQuery = `
      SELECT
        *
      FROM
        book
      WHERE
        id = ?;
    `;
    const existingBook = await db.get(checkBookQuery, [bookId]);

    if (!existingBook) {
      return response.status(404).json({ message: "Book Not Found" });
    }

    const deleteBookQuery = `
      DELETE FROM
        book
      WHERE
        id = ?;
    `;
    await db.run(deleteBookQuery, [bookId]);

    response.status(200).json({ message: "Book Deleted Successfully" });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

module.exports = app;
