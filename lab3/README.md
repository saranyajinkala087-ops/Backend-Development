# Backend Development Fundamentals - Lab 3: REST API with Query Parameters, Validation & SQL Security

This project contains the complete implementation for **Lab 3: REST API with Advanced Query Filtering, Request Validation, and SQL Injection Prevention** built using Node.js, Express.js, and SQLite.

---

## 🛠️ Tech Stack
- **Node.js**: JavaScript runtime environment
- **Express.js**: Web framework providing clean REST noun endpoints
- **SQLite / SQLite3 (`sqlite` & `sqlite3`)**: File-based relational database engine
- **Nodemon**: Auto-reloading development server

---

## 🗄️ Database Schema

### Table: `book`
| Field | Type | Constraint | Description |
|---|---|---|---|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Unique identifier for each book |
| `title` | `TEXT` | `NOT NULL` | Title of the book |
| `author` | `TEXT` | `NOT NULL` | Author of the book |
| `price` | `INTEGER` | `NOT NULL` | Price of the book |
| `pages` | `INTEGER` | | Total number of pages |

---

## 🚀 API Endpoints Specification

### 1. `GET /books` — Retrieve & Filter Books
Fetches all books with optional search, sorting, price range filtering, and pagination.

#### Query Parameters:
| Parameter | Type | Default Value | Description |
|---|---|---|---|
| `search_q` | String | `""` (empty string) | Partial match search on book title using SQL `LIKE ?` (`%search_q%`) |
| `order_by` | String | `"id"` | Column to sort results by (`id`, `title`, `author`, `price`, `pages`) |
| `order` | String | `"ASC"` | Sort direction (`ASC` or `DESC`) |
| `limit` | Integer | `10` | Maximum number of books to return (pagination page size) |
| `offset` | Integer | `0` | Number of records to skip (pagination offset) |
| `min_price` | Number | *(optional)* | Minimum price filter (inclusive) using SQL `BETWEEN ? AND ?` |
| `max_price` | Number | *(optional)* | Maximum price filter (inclusive) using SQL `BETWEEN ? AND ?` |

#### Example Requests:
- **Default query (first 10 books sorted by ID):**
  ```http
  GET /books
  ```
- **Search by keyword in title:**
  ```http
  GET /books?search_q=Gatsby
  ```
- **Price range filter using BETWEEN:**
  ```http
  GET /books?min_price=300&max_price=450
  ```
- **Sort by price descending:**
  ```http
  GET /books?order_by=price&order=DESC
  ```
- **Pagination (page 2 with limit 5):**
  ```http
  GET /books?limit=5&offset=5
  ```
- **Combined query:**
  ```http
  GET /books?search_q=The&min_price=300&max_price=450&order_by=price&order=ASC&limit=5&offset=0
  ```

---

### 2. `GET /books/:bookId` — Retrieve a Book by ID
- **Status 200 OK**: Returns the book object when found.
- **Status 404 Not Found**: Returns `{ "message": "Book Not Found" }` when the ID does not exist.

---

### 3. `POST /books` — Create a New Book
Adds a new book record with robust request body validation.

#### Validation Rules:
- **Title**: Required, must be a non-empty string.
- **Author**: Required, must be a non-empty string.
- **Price**: Required, must be a numeric value (non-numeric, missing, or boolean values are rejected).

#### Response Codes:
- **Status 400 Bad Request**: If validation fails, returns a JSON error message:
  ```json
  { "message": "Title is required and must be a non-empty string" }
  ```
  or
  ```json
  { "message": "Author is required and must be a non-empty string" }
  ```
  or
  ```json
  { "message": "Price is required and must be a numeric value" }
  ```
- **Status 201 Created**: On success, returns:
  ```json
  {
    "message": "Book Added Successfully",
    "bookId": 11
  }
  ```

#### Example Valid Payload:
```json
{
  "title": "Clean Architecture",
  "author": "Robert C. Martin",
  "price": 520,
  "pages": 432
}
```

---

### 4. `PUT /books/:bookId` — Update an Existing Book
Updates an existing book by its unique ID.
- **Status 200 OK**: On success, returns `{ "message": "Book Updated Successfully" }`.
- **Status 404 Not Found**: If the book ID does not exist, returns `{ "message": "Book Not Found" }`.

---

### 5. `DELETE /books/:bookId` — Delete a Book
Removes a book by its unique ID.
- **Status 200 OK**: On success, returns `{ "message": "Book Deleted Successfully" }`.
- **Status 404 Not Found**: If the book ID does not exist, returns `{ "message": "Book Not Found" }`.

---

## 🔒 SQL Injection Prevention & Security

All database interactions follow strict secure coding practices:
1. **Parameterized Queries (`?` placeholders)**: All user-supplied inputs (`search_q`, `min_price`, `max_price`, `limit`, `offset`, `bookId`, `title`, `author`, `price`, `pages`) are passed as SQL query parameters. Values are never interpolated or concatenated into raw SQL strings.
2. **Whitelist Validation**:
   - `order_by` is validated against an allowed set of columns: `['id', 'title', 'author', 'price', 'pages']`. Unrecognized values default safely to `'id'`.
   - `order` is strictly checked against `['ASC', 'DESC']`. Any other value defaults safely to `'ASC'`.
3. **Type Parsing**: Numeric parameters are validated and converted using strict checks before execution.

---

## 📦 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Initialize the Database
Creates the `book` table and seeds 10 sample books into `books.db`:
```bash
npm run init-db
```

### 3. Run the Automated Test Suite
Executes the full test suite covering all requirements, status codes, validations, and SQL injection security checks:
```bash
npm test
```

### 4. Start the Server
- **Production Mode:**
  ```bash
  npm start
  ```
- **Development Mode (Auto-reload on file changes):**
  ```bash
  npm run dev
  ```

Server will run at: `http://localhost:3000/`

