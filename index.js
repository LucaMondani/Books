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

}

app.get("/", (req, res) => {
  res.render("index.ejs");
});

app.listen(port, () => {
    console.log(`Server running on port ${port}.`);
})