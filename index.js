import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
// create config.js file and setup dtabase object with info
import config from "./config.js";

const app = express();
const port = 3000;

const db = new pg.Client(config.database);
db.connect();

app.use(bodyParser.urlencoded({ extended : true }));
app.use(express.static("public"));

let users = [];
// authenticated user
let authUser = {
    isLoggedIn : false,
    name : "testuser"
};

app.get("/", async (req, res) => {
    if (authUser.isLoggedIn) {
        res.redirect(`/${authUser.name}`);
    } else {
        res.render("index.ejs");
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});