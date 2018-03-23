// Sever setup & route setup goes here //
const express = require('express');
const bodyParser = require('body-parser');
const logger = require('morgan');
const mongoose = require('mongoose');
const path = require('path');

// Handlebars
const exphbs = require('express-handlebars');

// Requiring Note and Article models 
const Note = require("./models/Note.js");
const Article = require("./models/Article.js");

// Require request and cheerio. This makes the scraping possible
const request = require("request");
const cheerio = require("cheerio");

// Set mongoose to leverage built in JavaScript ES6 Promises
mongoose.Promise = Promise;

//Define port
const port = process.env.PORT || 3000;
 
// Initialize Express
const app = express();

// Use morgan and body parser with our app
app.use(logger("dev"));
app.use(bodyParser.urlencoded({
    extended: false
}));

// Make public a static dir
app.use(express.static("public"));


app.engine('handlebars', exphbs({ 
    defaultLayout: 'main',
    partialsDir: path.join(__dirname, "/views/layouts/partial")
}));
app.set('view engine', 'handlebars');


// Database configuration with mongoose
mongoose.connect("mongodb://rbern412:VdMUPx7KLgJZApj@ds115569.mlab.com:15569/heroku_rwlqgbv0");

//mongoose.connect("mongodb://localhost/mongoscraper");

// Hook mongojs configuration to the db variable
const db = mongoose.connection;

// Log any mongoose errors 
db.on("error", function (error) {
    console.log("Database Error:", error);
});

db.once("open", function(){
    console.log("Mongoose connection established, successfully!")
});

// ROUTES ========================================================
//GET requests to render Handlebars pages
app.get("/", function (req, res) {
    Article.find({ "saved": false }, function (error, data) {
        var hbsObject = {
            article: data
        };
        console.log(hbsObject);
        res.render("home", hbsObject);
    });
});

app.get("/saved", function (req, res) {
    Article.find({ "saved": true }).populate("notes").exec(function (error, articles) {
        var hbsObject = {
            article: articles
        };
        res.render("saved", hbsObject);
    });
});

// A GET request to scrape the echojs website
app.get("/scrape", function (req, res) {
    // First, we grab the body of the html with request
    request("https://www.nytimes.com", function (error, response, html) {
        // Then, we load that into cheerio and save it to $ for a shorthand selector
        var $ = cheerio.load(html);
        // Now, we grab every h2 within an article tag, and do the following:
        $("article").each(function (i, element) {

            // Save an empty result object
            var result = {};

            // Add the title and summary of every link, and save them as properties of the result object
            result.title = $(this).children("h2").text();
            result.summary = $(this).children(".summary").text();
            result.link = $(this).children("h2").children("a").attr("href");

            // Using our Article model, create a new entry
            // This effectively passes the result object to the entry (and the title and link)
            var entry = new Article(result);

            // Now, save that entry to the db
            entry.save(function (err, doc) {
                // Log any errors
                if (err) {
                    console.log(err);
                }
                // Or log the doc
                else {
                    console.log(doc);
                }
            });

        });
        res.send("Scrape Complete");

    });
    // Tell the browser that we finished scraping the text
});

// This will get the articles we scraped from the mongoDB
app.get("/articles", function (req, res) {
    // Grab every doc in the Articles array
    Article.find({}, function (error, doc) {
        // Log any errors
        if (error) {
            console.log(error);
        }
        // Or send the doc to the browser as a json object
        else {
            res.json(doc);
        }
    });
});

// Grab an article by it's ObjectId
app.get("/articles/:id", function (req, res) {
    // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
    Article.findOne({ "_id": req.params.id })
        // ..and populate all of the notes associated with it
        .populate("note")
        // now, execute our query
        .exec(function (error, doc) {
            // Log any errors
            if (error) {
                console.log(error);
            }
            // Otherwise, send the doc to the browser as a json object
            else {
                res.json(doc);
            }
        });
});


// Save an article
app.post("/articles/save/:id", function (req, res) {
    // Use the article id to find and update its saved boolean
    Article.findOneAndUpdate({ "_id": req.params.id }, { "saved": true })
        // Execute the above query
        .exec(function (err, doc) {
            // Log any errors
            if (err) {
                console.log(err);
            }
            else {
                // Or send the document to the browser
                res.send(doc);
            }
        });
});

// Delete an article
app.post("/articles/delete/:id", function (req, res) {
    // Use the article id to find and update its saved boolean
    Article.findOneAndUpdate({ "_id": req.params.id }, { "saved": false, "notes": [] })
        // Execute the above query
        .exec(function (err, doc) {
            // Log any errors
            if (err) {
                console.log(err);
            }
            else {
                // Or send the document to the browser
                res.send(doc);
            }
        });
});


// Create a new note
app.post("/notes/save/:id", function (req, res) {
    // Create a new note and pass the req.body to the entry
    var newNote = new Note({
        body: req.body.text,
        article: req.params.id
    });
    console.log(req.body)
    // And save the new note the db
    newNote.save(function (error, note) {
        // Log any errors
        if (error) {
            console.log(error);
        }
        // Otherwise
        else {
            // Use the article id to find and update it's notes
            Article.findOneAndUpdate({ "_id": req.params.id }, { $push: { "notes": note } })
                // Execute the above query
                .exec(function (err) {
                    // Log any errors
                    if (err) {
                        console.log(err);
                        res.send(err);
                    }
                    else {
                        // Or send the note to the browser
                        res.send(note);
                    }
                });
        }
    });
});

// Delete a note
app.delete("/notes/delete/:note_id/:article_id", function (req, res) {
    // Use the note id to find and delete it
    Note.findOneAndRemove({ "_id": req.params.note_id }, function (err) {
        // Log any errors
        if (err) {
            console.log(err);
            res.send(err);
        }
        else {
            Article.findOneAndUpdate({ "_id": req.params.article_id }, { $pull: { "notes": req.params.note_id } })
                // Execute the above query
                .exec(function (err) {
                    // Log any errors
                    if (err) {
                        console.log(err);
                        res.send(err);
                    }
                    else {
                        // Or send the note to the browser
                        res.send("Note Deleted");
                    }
                });
        }
    });
});

// Listen on port
app.listen(port, function () {
    console.log("App running on port " + port);
});
