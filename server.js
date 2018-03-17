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
const databaseUrl = "NEWZscraper";
const collections = ["NEWScrapeData"];

// Hook mongojs configuration to the db variable
var db = mongojs(databaseUrl, collections);
db.on("error", function (error) {
    console.log("Database Error:", error);
});


app.get('/', function (req, res) {
    res.render('home');
});


app.get("/all", function(req,res){

})

// Listen on port 3000
app.listen(3000, function () {
    console.log("App running on port 3000!");
});
