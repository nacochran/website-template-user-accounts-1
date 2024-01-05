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
    loggedIn : false,
    name : "testuser"
};

app.get("/", (req, res) => {
    if (authUser.loggedIn) {
        res.redirect(`/${authUser.name}/dashboard`);
    } else {
        res.render("index.ejs");
    }
});

app.get("/:username/dashboard", (req, res) => {
    const requestedUsername = req.params.username;

    if (authUser.loggedIn && authUser.name === requestedUsername) {
        res.render("dashboard.ejs", { username: authUser.name });
    } else {
        res.send("Must be logged in as the correct user to see the dashboard.");
    }
});

app.get("/signup", (req, res) => {
    if (authUser.loggedIn) {
        console.log("User already logged in.");
        res.redirect(`/`);
    } else {
        res.render("signup.ejs");
    }
});

/**
 * Min Length : 5 characters
 * Max Length : 25 characters
 * Allowed Characters : a-z, A-Z, 0-9, -
 */
function validateUsername(users, u) {
    const duplicateUser = users.some(user => user.username === u);
    if (duplicateUser) {
        return "A user with this username already exists";
    } else {
        if (u.length < 5) {
            return "Usernames must be at least 5 characters in length."
        } else if (u.length > 25) {
            return "Usernames must be less than 26 characters in length."
        } else if (!/^[a-zA-Z]/.test(u)) {
            return "Usernames must start with a letter.";
        }
    }

    return false;
}

function validateEmail(users, email) {
    // Check if the email format is valid
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validEmailFormat = emailRegex.test(email);

    if (!validEmailFormat) {
        return "Please enter a valid email address.";
    }

    // Check if the email already exists in the users array
    const duplicateEmail = users.some(user => user.email === email);

    if (duplicateEmail) {
        return "A user with this email already exists.";
    }

    return false;
}

/**
 * Rules: 8+ characters, at least 1 number, and at least 1 special character
 */
function validatePassword(password) {
    // Check if the password is at least 8 characters in length
    if (password.length < 8) {
        return "Password must be at least 8 characters in length.";
    }

    // Check if the password contains at least one digit
    const containsDigit = /\d/.test(password);
    if (!containsDigit) {
        return "Password must contain at least one digit.";
    }

    // Check if the password contains at least one non-letter, non-number character
    const containsSpecialChar = /[^\w\d]/.test(password);
    if (!containsSpecialChar) {
        return "Password must contain at least one special character.";
    }

    return false;
}

app.post("/signup", async (req, res) => {
    try {
        const username = req.body.username;
        const password = req.body.password;
        const email = req.body.email;

        const result = await db.query("SELECT * FROM users");
        users = result.rows;

        let errors = { username: validateUsername(users, username), email: validateEmail(users, email), password: validatePassword(password) };

        // Check for errors
        const hasErrors = Object.values(errors).some(value => typeof value === "string");

        if (hasErrors) {
            // Render signup page with errors and submitted values
            res.render("signup.ejs", { errors: errors, values: { username, password, email } });
        } else {
            // User with the given username does not exist
            // Proceed to add the user to the database or perform other actions
            await db.query("INSERT INTO users (username, password, email) VALUES ($1, $2, $3)", [username, password, email]);
            authUser.loggedIn = true;
            authUser.name = username;
            res.redirect("/");
        }
    } catch (err) {
        console.log(err);
        res.status(500).send("Internal Server Error");
    }
});



app.get("/login", (req, res) => {
    if (authUser.loggedIn) {
        console.log("User already logged in.");
        //res.redirect(`/${authUser.name}`);
    } else {
        res.render("login.ejs");
    }
});
app.post("/login", async (req, res) => {
    try {
        const identifier = req.body.identifier; // Access username or email from the form
        const password = req.body.password; // Access password from the form
        
        const result = await db.query("SELECT * FROM users");
        users = result.rows;

        // Check if the identifier is an email or username
        const isEmail = identifier.includes('@');
        const user = isEmail ? users.find(user => user.email === identifier) : users.find(user => user.username === identifier);

        let errors = { user: !user ? "User does not exist" : false, password: false };

        if (user) {
            // User with the given identifier exists
            // Check if the password matches
            if (user.password !== password) {
                // Incorrect password
                errors.password = "Incorrect password";
            }
        }

        const hasErrors = Object.values(errors).some(value => typeof value === "string");

        if (hasErrors) {
            // Render login page with errors and submitted values
            res.render("login.ejs", { errors, values: { identifier } });
        } else {
            // User is authenticated
            authUser.loggedIn = true;
            authUser.name = user.username;
            res.redirect("/");
        }
    } catch (err) {
        console.log(err);
        res.status(500).send("Internal Server Error");
    }
});


app.post("/signout", (req, res) => {
    authUser.loggedIn = false;
    authUser.name = "";
    res.redirect("/");
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});