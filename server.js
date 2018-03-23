import { Mongoose } from 'mongoose';

// Sever setup & route setup goes here //
const express = require('express');
const mongojs = require("mongojs")
const exphbs = require('express-handlebars');

// Require request and cheerio. This makes the scraping possible
const request = require("request");
const cheerio = require("cheerio");
 
// Initialize Express
const app = express();

app.engine('handlebars', exphbs({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');

// Database configuration
// Database configuration with mongoose
mongoose.connect("mongodb://rbern412:VdMUPx7KLgJZApj@ds115569.mlab.com:15569/heroku_rwlqgbv0");

//mongoose.connect("mongodb://localhost/mongoscraper");

// Hook mongojs configuration to the db variable
var db = mongoose.connection;
db.on("error", function (error) {
    console.log("Database Error:", error);
});

// Main lading route 
app.get('/', function (req, res) {
    res.render('home');
});

// Retrive all data from DB. 
app.get("/all", function(req,res){
// Find all results of the NEWScrapeData collection 
    db.NEWScrapeData.find({}, function(err, found){
        if(err) {
            console.log(err);
        }
        // If no errors detected, send data to the browser as JSON
        else{
            res.json(found);
        }
    });
});


// Scrape data from target site and place into mongoDB
app.get("/scrape", function(req, res){
    // Make a request to TechCrunch 
    request("https://techcrunch.com/", function(err, res, html){
        // Load HTML body from req into cheerio
        let $ = cheerio.load(html);
        // Each element with 
        $(".post-block").each(function (i, element) {
            // Save the text and href of each link enclosed in the current element
            let title = $(element).children("h2").text();
            let link = $(element).children("h2").attr("href");
            let content = $(element).siblings("p").text();

            // If this found element had both a title and a link
            if (title && link && content) {
                // Insert the data in the scrapedData db
                db.scrapedData.insert({
                    title: title,
                    link: link,
                    content: content
                },
                    function (err, inserted) {
                        if (err) {
                            // Log the error if one is encountered during the query
                            console.log(err);
                        }
                        else {
                            // Otherwise, log the inserted data
                            console.log(inserted);
                        }
                    });
            }
        });

    });
    // Send a "Scrape Complete" message to the browser
    res.send("Scrape Complete");
});




// Listen on port 3000
app.listen(3000, function () {
    console.log("App running on port 3000!");
});
