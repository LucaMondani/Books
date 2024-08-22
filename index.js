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
  res.render("index.ejs", {books: books});
});

app.post("/order", async (req, res) => {
  let option = req.body.option;
  let query;
  if (option === "Recency") {
    query = "SELECT * FROM book_list ORDER BY publication_date DESC";
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
        let bookCover = null;
        const bookRelease = result.publish_date;
        
        if (result.cover.medium) {
          bookCover = result.cover.medium;
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

app.listen(port, () => {
    console.log(`Server running on port ${port}.`);
})