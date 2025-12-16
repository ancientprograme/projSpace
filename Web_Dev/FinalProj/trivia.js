"use strict";
const express = require("express");
const app = express();
const path = require("path"); 
const bodyParser = require("body-parser");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config({ path: path.resolve(__dirname, "credentialsDontPost/.env") });

const portNumber = 5000;
const uri = process.env.MONGO_CONNECTION_STRING;
const databaseAndCollection = { db: "CMSC335DB", collection: process.env.MONGO_COLLECTION };

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.set("views", path.resolve(__dirname, "templates"));

app.use(express.static(path.join(__dirname, 'static')));
app.set("view engine", "ejs");


console.log("Views directory:", path.resolve(__dirname, "templates"));

// Home Page
app.get("/", (req, res) => {
  res.render("home");
});

app.get("/quiz-gen", (req, res) => {
  res.render("quiz-gen");
});

// Start Quiz
app.post("/start", async (req, res) => {
  const { category, difficulty, username } = req.body;

  const apiUrl = `https://opentdb.com/api.php?amount=5&category=${category}&difficulty=${difficulty}&type=multiple`;
  fetch(apiUrl)
  .then(response => response.json())
  .then(data =>res.render("quiz", { questions: data.results, username }) );
}); 

// Save Quiz Results
app.post("/save", async (req, res) => {
  const { username, date, ...answers } = req.body;
  console.log(answers);
  const totalQuestions = Object.keys(answers).length/2;
  console.log('-----------------------------');
  let score = 0;

  for (let i = 0; i < totalQuestions; i++) {
    const userAnswer = answers[`question${i}`];
    const correctAnswer = answers[`correctAnswer${i}`];

    if (userAnswer === correctAnswer) {
      score++;
    }
  }

  await saveQuiz(username, score, date);
  res.redirect("/history");
});

// View Quiz History
app.get("/history", async (req, res) => {
 const results = await displaAll();
 res.render("history", { results });

});

// View Quiz History
app.get("/clear", async (req, res) => {
await clearAll()
res.redirect("history");
});

// Save Quiz Result to MongoDB
async function saveQuiz(user, score, date) {
  const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
  try {
    await client.connect();
    const result = {
      name: user || "Guest",
      score: score || 0,
      when: date || new Date().toISOString(),
    };

    await client.db(databaseAndCollection.db)
      .collection(databaseAndCollection.collection)
      .insertOne(result);

    console.log("***** Saved Quiz Results *****", result);
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }
}

async function clearAll() {
    const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
    try {
        await client.connect();
        console.log("***** Clearing Collection *****");
        const result = await client.db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .deleteMany({});
        return result.deletedCount;        
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

async function displaAll() {
  const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
  try {
    await client.connect();
    const results = await client.db(databaseAndCollection.db)
      .collection(databaseAndCollection.collection)
      .find()
      .toArray();
    return results;
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to fetch quiz history");
  } finally {
    await client.close();
  }
  
}


// Start Server
app.listen(portNumber);
console.log(`Web server is running at http://localhost:${portNumber}`);
process.stdin.setEncoding("utf8");
process.stdin.on("readable", function () {
  const dataInput = process.stdin.read();
  if (dataInput !== null) {
    const command = dataInput.trim();
    if (command === "stop") {
      console.log("Shutting down the server.");
      process.exit(0);
    }
  }
});
