import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "books",
  password: "myPostgreSQL",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

async function getBooks() {
  const result = await db.query("SELECT * FROM book_list");
  let books = [];
  result.rows.forEach((book) => {
    books.push(book);
  });
  return books;
}

app.get("/", async (req, res) => {
  const books = await getBooks();
  let success;
  if (req.query.success) {
    success = req.query.success;
  } else {
    success = null;
  }
  res.render("index.ejs", {books: books, success: success});
});

app.post("/order", async (req, res) => {
  let option = req.body.option;
  let query;
  if (option === "Recency") {
    query = "SELECT * FROM book_list ORDER BY publication_date ASC";
  } else if (option === "Rating") {
    query = "SELECT * FROM book_list ORDER BY rating DESC";
  }

  try {
    const result = await db.query(query);
    const books = result.rows;
    res.render("index.ejs", {books: books})
  } catch (error) {
    console.log("Error querying the database", error);
    res.redirect("/");
  }
});

app.post("/add", (req, res) => {
  res.render("new.ejs");
});

app.post("/new", async (req, res) => {
  let isbn = req.body.isbn;
  let review = req.body.review;
  let rating = req.body.rating;
  try {
    const existingBook = await db.query("SELECT * FROM book_list WHERE isbn = $1", [isbn]);
    if(existingBook.rows.length > 0) {
      res.render("new.ejs", {error: "This book already exsists in the database."})
    } else {
      const response = await axios.get(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
      const result = response.data[`ISBN:${isbn}`];
      
      if (result) {
        const bookTitle = result.title;
        const bookAuthor = result.authors[0].name;
        const bookRelease = result.publish_date;
        let bookCover = null;
        if (result.cover) {
          bookCover = result.cover.small;
        }

        await db.query("INSERT INTO book_list (isbn,title,author,cover,review,publication_date,rating) VALUES ($1, $2, $3, $4, $5, $6, $7)",
          [isbn, bookTitle, bookAuthor, bookCover, review, bookRelease, rating]
        );
        res.redirect("/")
      } else {
        res.render("new.ejs", {error: "No book with this ISBN found."})
      }
    }

  } catch (error) {
    console.log(error)
    res.render("new.ejs", {error: "An error occured, while processing your request."});
  }
});

app.post("/edit", async (req, res) => {
  let bookId = parseInt(req.body.book_id);
  let books = await getBooks();
  let chosenBook = books.find((book) => book.id === bookId);
  let error;
  if (req.body.error) {
    error = req.body.error;
  } else { error = null; }
  res.render("new.ejs", {book: chosenBook, error: error});
});

app.post("/edited", async (req,res) => {
  let bookId = parseInt(req.body.book_id);
  try {
    await db.query("UPDATE book_list SET review = $1, rating = $2 WHERE id = $3", [req.body.review, req.body.rating, bookId]);
    res.redirect("/");
  } catch (error) {
    console.log(error);
    res.send(`
      <html>
          <body>
              <form id="redirectForm" method="post" action="/edit">
                  <input type="hidden" name="book_id" value='${bookId}' />
                  <input type="hidden" name="error" value='${"An Error occured while editing, please try again."}' />
              </form>
              <script>
                  document.getElementById('redirectForm').submit();
              </script>
          </body>
      </html>
  `);
  }
});

app.post("/delete", async (req, res) => {
  let bookId = req.body.book_id;
  try {
    await db.query("DELETE FROM book_list WHERE id = $1;", [bookId]);
    res.redirect("/?success=true");
  } catch (error) {
    console.log(error);
    res.redirect("/?success=false")
  }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}.`);
})