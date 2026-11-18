process.env.NODE_ENV = "test";
const http = require("http");
const { Socket } = require("net");
const assert = require("assert");
const app = require("./app");

const request = (method, url, body = null) => {
  return new Promise((resolve, reject) => {
    const socket = new Socket();
    const req = new http.IncomingMessage(socket);
    req.method = method;
    req.url = url;
    req.headers = {
      host: "localhost:3000",
    };

    let payload = null;
    if (body !== null) {
      payload = Buffer.from(typeof body === "string" ? body : JSON.stringify(body));
      req.headers["content-type"] = "application/json";
      req.headers["content-length"] = payload.length;
    }

    const res = new http.ServerResponse(req);
    let resBody = "";

    res.write = function (chunk, encoding, callback) {
      if (chunk) {
        resBody += Buffer.isBuffer(chunk) ? chunk.toString() : chunk;
      }
      if (typeof encoding === "function") encoding();
      if (typeof callback === "function") callback();
      return true;
    };

    res.end = function (chunk, encoding, callback) {
      if (chunk) {
        resBody += Buffer.isBuffer(chunk) ? chunk.toString() : chunk;
      }
      if (typeof encoding === "function") encoding();
      if (typeof callback === "function") callback();

      let json = null;
      try {
        json = JSON.parse(resBody);
      } catch (e) {
        // Not JSON
      }

      resolve({
        status: res.statusCode,
        statusCode: res.statusCode,
        text: resBody,
        json,
      });
    };

    app.handle(req, res);

    if (payload) {
      req.push(payload);
    }
    req.push(null);
  });
};

const runTests = async () => {
  console.log("=== Starting Lab 3 Backend Test Suite ===\n");

  let passed = 0;
  let failed = 0;

  const test = async (name, fn) => {
    try {
      await fn();
      console.log(` PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(` FAIL: ${name}`);
      console.error(`   Error: ${err.message}\n`);
      failed++;
    }
  };

  // 1. GET /books - Default values
  await test("GET /books returns 200 and default 10 books sorted by id ASC", async () => {
    const res = await request("GET", "/books");
    assert.strictEqual(res.status, 200);
    assert.strictEqual(Array.isArray(res.json), true);
    assert.strictEqual(res.json.length, 10);
    assert.strictEqual(res.json[0].id, 1);
    assert.strictEqual(res.json[9].id, 10);
  });

  // 2. GET /books - search_q partial match using SQL LIKE
  await test("GET /books?search_q=Gatsby filters by title LIKE partial match", async () => {
    const res = await request("GET", "/books?search_q=Gatsby");
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.length, 1);
    assert.strictEqual(res.json[0].title, "The Great Gatsby");
  });

  // 3. GET /books - order_by and order DESC
  await test("GET /books?order_by=price&order=DESC sorts properly", async () => {
    const res = await request("GET", "/books?order_by=price&order=DESC");
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json[0].price >= res.json[1].price, true);
    assert.strictEqual(res.json[0].title, "Crime and Punishment"); // 499
  });

  // 4. GET /books - limit and offset
  await test("GET /books?limit=3&offset=2 paginates correctly", async () => {
    const res = await request("GET", "/books?limit=3&offset=2");
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.length, 3);
    assert.strictEqual(res.json[0].id, 3);
    assert.strictEqual(res.json[1].id, 4);
    assert.strictEqual(res.json[2].id, 5);
  });

  // 5. GET /books - price-range filter using BETWEEN
  await test("GET /books?min_price=300&max_price=400 filters price BETWEEN 300 AND 400", async () => {
    const res = await request("GET", "/books?min_price=300&max_price=400");
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.length > 0, true);
    for (const book of res.json) {
      assert.strictEqual(book.price >= 300 && book.price <= 400, true);
    }
  });

  // 6. GET /books - Combined search_q, min_price, max_price, and sorting
  await test("GET /books with combined search_q and price BETWEEN", async () => {
    const res = await request(
      "GET",
      "/books?search_q=The&min_price=300&max_price=450&order_by=price&order=ASC"
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.length > 0, true);
    for (const book of res.json) {
      assert.strictEqual(book.title.includes("The"), true);
      assert.strictEqual(book.price >= 300 && book.price <= 450, true);
    }
  });

  // 7. GET /books/:bookId - Existing book
  await test("GET /books/:bookId returns 200 and single book object", async () => {
    const res = await request("GET", "/books/1");
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.id, 1);
    assert.strictEqual(res.json.title, "The Great Gatsby");
  });

  // 8. GET /books/:bookId - Non-existent ID returns 404
  await test("GET /books/:bookId returns 404 if ID does not exist", async () => {
    const res = await request("GET", "/books/9999");
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.json.message, "Book Not Found");
  });

  // 9. POST /books - Validation: Missing title
  await test("POST /books rejects request with missing title (400 and JSON message)", async () => {
    const res = await request("POST", "/books", { author: "Jane Doe", price: 299 });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(typeof res.json.message, "string");
    assert.strictEqual(res.json.message.length > 0, true);
  });

  // 10. POST /books - Validation: Missing author
  await test("POST /books rejects request with missing author (400 and JSON message)", async () => {
    const res = await request("POST", "/books", { title: "New Book", price: 299 });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(typeof res.json.message, "string");
    assert.strictEqual(res.json.message.length > 0, true);
  });

  // 11. POST /books - Validation: Non-numeric price
  await test("POST /books rejects request with non-numeric price (400 and JSON message)", async () => {
    const res = await request("POST", "/books", {
      title: "New Book",
      author: "Jane Doe",
      price: "not-a-number",
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(typeof res.json.message, "string");
    assert.strictEqual(res.json.message.length > 0, true);
  });

  // 12. POST /books - Success (201 Created)
  let createdBookId;
  await test("POST /books successfully creates a book with 201 status code", async () => {
    const res = await request("POST", "/books", {
      title: "Clean Code",
      author: "Robert C. Martin",
      price: 499,
      pages: 464,
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.json.message, "Book Added Successfully");
    assert.strictEqual(typeof res.json.bookId, "number");
    createdBookId = res.json.bookId;
  });

  // 13. PUT /books/:bookId - Success (200 OK)
  await test("PUT /books/:bookId updates an existing book with 200 status code", async () => {
    const res = await request("PUT", `/books/${createdBookId}`, { price: 550 });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.message, "Book Updated Successfully");

    const check = await request("GET", `/books/${createdBookId}`);
    assert.strictEqual(check.status, 200);
    assert.strictEqual(check.json.price, 550);
  });

  // 14. PUT /books/:bookId - Non-existent ID returns 404
  await test("PUT /books/:bookId returns 404 if ID does not exist", async () => {
    const res = await request("PUT", "/books/9999", { price: 550 });
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.json.message, "Book Not Found");
  });

  // 15. DELETE /books/:bookId - Success (200 OK)
  await test("DELETE /books/:bookId deletes book with 200 status code", async () => {
    const res = await request("DELETE", `/books/${createdBookId}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.message, "Book Deleted Successfully");

    const check = await request("GET", `/books/${createdBookId}`);
    assert.strictEqual(check.status, 404);
  });

  // 16. DELETE /books/:bookId - Non-existent ID returns 404
  await test("DELETE /books/:bookId returns 404 if ID does not exist", async () => {
    const res = await request("DELETE", "/books/9999");
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.json.message, "Book Not Found");
  });

  // 17. Security / SQL Injection Prevention
  await test("Prevents SQL injection in search_q, order_by, order, and limit", async () => {
    const res = await request(
      "GET",
      "/books?search_q=' OR '1'='1&order_by=id; DROP TABLE book;--&order=DESC; DROP TABLE book;--"
    );
    assert.strictEqual(res.status, 200);
    // Ensure book table still exists and data is intact
    const verify = await request("GET", "/books");
    assert.strictEqual(verify.status, 200);
    assert.strictEqual(verify.json.length >= 10, true);
  });

  console.log(`\n=== Test Results: ${passed} Passed, ${failed} Failed ===`);
  if (failed > 0) {
    process.exit(1);
  }
};

runTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("Test Suite Fatal Error:", err);
    process.exit(1);
  });
