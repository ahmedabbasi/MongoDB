// Using this template, the cheerio documentation,
// and what you've learned in class so far, scrape a website
// of your choice, save information from the page in a result array, and log it to the console.
var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
var cheerio = require("cheerio");
var request = require("request");
var axios = require("axios");
var app = express();


// Use morgan logger for logging requests
app.use(logger("dev"));
// Use body-parser for handling form submissions
app.use(bodyParser.urlencoded({ extended: false }));


app.use(express.static("public"));


var db = require("./models/index.js");
console.log(db);

var PORT = 3000;

//var databaseUri = "mongodb://localhost/scraper";
//
//mongoose.connect(databaseUri)

var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/scraper";

// Set mongoose to leverage built in JavaScript ES6 Promises
// Connect to the Mongo DB
mongoose.Promise = Promise;
mongoose.connect(MONGODB_URI);

// Routes

// A GET route for scraping the echoJS website
app.get("/scrape", function (req, res) {
  // First, we grab the body of the html with request
  axios.get("http://www.sacbee.com/").then(function (response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);

    // Now, we grab every h4 within an article tag, and do the following:
    $("article h4").each(function (i, element) {
      // Save an empty result object
      var result = {};

      // Add the text and href of every link, and save them as properties of the result object
      result.title = $(this)
        .children("a")
        .text();
      result.link = $(this)
        .children("a")
        .attr("href");

      // Create a new Article using the `result` object built from scraping
      db.Article.create(result)
        .then(function (dbArticle) {
          // View the added result in the console
          console.log(dbArticle);
        })
        .catch(function (err) {
          // If an error occurred, send it to the client
          console.log(err);
          return res.json(err);
        });
    });

    // If we were able to successfully scrape and save an Article, send a message to the client
    res.send("Scrape Complete");
  });
});

app.get("/articles", function(req, res) {
  // Grab every document in the Articles collection
  db.Article.find()
    .then(function(dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.json.toString(dbArticle);
      res.render(dbArticle);
    })
    .catch(function(err) {
      console.log(err);
      // If an error occurred, send it to the client
      res.json(err);
    });
});

app.get("/comments", function (req, res) {
  // Using our Book model, "find" every book in our db
  db.Comment.find({})
    .then(function (dbComment) {
      // If any Books are found, send them to the client
      res.json(dbComment);
      res.render(dbComment);
    })
    .catch(function (err) {
      // If an error occurs, send it back to the client
      res.json(err);
    });
});

app.get("/populated", function (req, res) {
  // Using our Library model, "find" every library in our db and populate them with any associated books
  db.Comment.find({})
    // Specify that we want to populate the retrieved libraries with any associated books
    .populate("comments")
    .then(function (dbComment) {
      // If any Libraries are found, send them to the client with any associated Books
      res.json(dbComment);
    })
    .catch(function (err) {
      // If an error occurs, send it back to the client
      res.json(err);
    });
});

app.post("/submit", function(req, res) {
  // Create a new Note in the db
  db.Comment.create(req.body)
    .then(function(dbComment) {
      // If a Note was created successfully, find one User (there's only one) and push the new Note's _id to the User's `notes` array
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.Article.findOneAndUpdate({}, { $push: { comments: dbComment._id } }, { new: true });
    })
    .then(function(dbArticle) {
      // If the User was updated successfully, send it back to the client
      res.json(dbArticle);
      res.render(dbArticle)
    })
    .catch(function(err) {
      // If an error occurs, send it back to the client
      res.json(err);
    });
});



app.listen(PORT, function () {
  console.log("App running on port " + PORT + "!");
});