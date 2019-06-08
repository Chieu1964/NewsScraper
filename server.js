
//==== DEPENDENCIES ===========

var express = require("express");
var exphbs = require("express-handlebars");
var bodyParser = require("body-parser");
var axios = require("axios");
var logger = require("morgan");
var cheerio = require("cheerio");
var request = require("request");
var mongoose = require("mongoose");

// mongodb://heroku_9jsmz754:lqdras21t52as2l7v6avge2i4f@ds133187.mlab.com:33187/heroku_9jsmz754

// set port

var port = process.env.PORT || 3001;

// require all models
const models = require("./models");

// =======MIDDLEWARE ==========

// initialize express
const app = express();

// configure handlebars as view engine

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

// configure body parser to handle form submissions
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// configure morgan to log requests to console
app.use(logger("dev"));

// Use express.static to serve "public" folder as a static folder
app.use(express.static("public"));

// ======== MONGOOSE CONFIG ====================

// set up mongoose to leverage built-in JavaScript ES6 Promises
mongoose.Promise = Promise;

// connect to the MongoDB

var MONGODB_URI = process.env.MONGODB_URI || "mongodb://user:Chieu1964@ds133137.mlab.com:33137/heroku_74z0d8kv";

mongoose.connect(MONGODB_URI, { useNewUrlParser: true });

mongoose.set("useCreateIndex", true);

// ======== ROUTES ================

app.get("/", (req, res) => {
    models.Article.find({})
        .then(dbArticles => {
            res.render("index", { articles: dbArticles });
        })
        .catch(err => {
            console.log(err);
        });
});

app.get("/scrape", (req, res) => {

    // Create an Array to store scrapped result:
    var resultArr = [];

    // =========================================
    // Try to scrape from echojs.com
    // ============================================
    axios.get("http://www.echojs.com/")
        .then(response => {
            var $ = cheerio.load(response.data);

            // Now, we grab every h2 within an article tag:
            $("article h2").each(function (i, element) {

                // Save an empty result object
                var result = {};

                // Add the text and href of every link and save them as properties of the result object
                result.title = $(this)
                    .children("a")
                    .text();
                result.link = $(this)
                    .children("a")
                    .attr("href");
                    
// Store what was scrapped in the result array
                resultArr.push(result);
            });

            console.log("resultArr length 1:");
            console.log(resultArr.length); // 30

            models.Article.insertMany(resultArr)
                .then(newArticles => {
                    console.log("scrape complete!");
                    res.redirect("/");
                })
                .catch(err => {
                    res.redirect("/");
                    throw err;
                });
        })
        .catch(err => {
            res.send(err);
        });

    // THIS WILL CONSOLE OUT 0 BECAUSE THE AXIOS GET REQUEST IS ASYNCHRONOUS!!!
    console.log("resultArr length 2:");
    console.log(resultArr.length);
});

app.get("/saved", (req, res) => {
    models.Article.find({ saved: true })
        .then(savedArticles => {
            res.render("saved", { articles: savedArticles });
        })
        .catch(err => {
            console.log(err);
        });
});

app.get("/api/articles/:id", (req, res) => {
    id = req.params.id;
    models.Article.findOneAndUpdate({ _id: id }, { saved: true }, { new: true })
        .populate("note")
        .then(dbArticle => {
            res.send(dbArticle);
        })
        .catch(err => {
            console.error(err);
        });
})

app.post("/api/articles/:id", (req, res) => {
    id = req.params.id;
    models.Note.create(req.body)
        .then(newNote => {
            console.log(newNote);
            return models.Article.findOneAndUpdate({ _id: id }, { note: newNote._id }, { new: true });
        })
        .then(updatedArticle => {
            res.send(updatedArticle);
        })
        .catch(err => {
            console.log(err);
        });
});

app.get("/api/unsave/:id", (req, res) => {
    id = req.params.id;
    models.Article.findOneAndUpdate({ _id: id }, { $unset: { note: "", saved: "" } }, { new: true })
        .then(unsavedArticle => {
            console.log(`article ${unsavedArticle._id} saved: ${unsavedArticle.saved}`);
            res.send(unsavedArticle);
        })
        .catch(err => {
            console.error(err);
        });
});

app.get("/api/clear", (req, res) => {
    models.Article.remove({})
        .then(articleResponse => {
            return models.Note.remove({});
        })
        .then(noteResponse => {
            console.log("articles & notes removed!");
            res.send("articles & notes removed!");
        })
        .catch(err => {
            console.log(err);
            res.send(err);
        });
});

// =====================================================================================
// LISTENING
// =====================================================================================
app.listen(port, () => {
    console.log(`App running on port ${port}`);
});