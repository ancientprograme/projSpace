"use strict";
const express = require("express");
const app = express();
const path = require("path");
app.use(express.json());
const axios = require('axios');
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
const portNumber = 5000;
const NASA_KEY = "s5o12LAnqfnHeBib8vmWH4LUldPYo9OOJLZKsiHD"

app.use(express.static(path.join(__dirname, 'static')));

require("dotenv").config({ path: path.resolve(__dirname, 'credentialsDontPost/.env') })
const { MongoClient, ServerApiVersion } = require('mongodb');
const { console } = require("inspector");
const uri = process.env.MONGO_CONNECTION_STRING;
 /* Our database and collection */
const databaseAndCollection = {db: "CMSC335DB", collection:process.env.MONGO_COLLECTION};

app.set("views", path.resolve(__dirname, "templates"));
app.set('view engine', 'ejs');

 app.get('/', (req, res) => {
    res.render('index');
});



app.get('/apod',  (req, res) => {
    const url = "https://api.nasa.gov/planetary/apod";
    const params = {
    api_key: NASA_KEY,
    date: '' // deafult is todays date (when code is ran)
  };

    const queryString = new URLSearchParams(params).toString();
    const fullUrl = `${url}?${queryString}`;



    fetch(fullUrl)
    .then(response => {
        return response.json(); // Parse the JSON data
    })
    .then(data => {
        res.render('apod', { apod: data });
        
    })
    .catch(error => {
        console.error('There was a problem with the fetch operation:', error);
    });



});

app.get('/file-search', (req, res) => {
    console.log("TESST")
    res.render('search');
});

app.post('/file-search', async (req, res) => {
    const { query, type_media } = req.body; // Get the search term and media type

    const url = "https://images-api.nasa.gov/search";
    const params = {
        q: query,
        media_type: type_media
    };
    const queryString = new URLSearchParams(params).toString();
    const fullUrl = `${url}?${queryString}`;
    console.log("TESST");
    console.log(fullUrl);

    try {
        const response = await fetch(fullUrl);
        const data = await response.json();
        const items = data.collection.items;
        console.log(items);
        console.log(fullUrl);
      

        // Filter results based on media type
        if (type_media === "image") {
          
            const images = items.slice(0, 5); // Limit to 5 images
            res.render('search-results', { type: "image", items: images });

        } 
    } catch (error) {
        console.error('Error fetching data from NASA API:', error);
        res.status(500).send('Error fetching data');
    }
});




app.post('/save-media', async (req, res) => {
    const { title, url, type } = req.body;

    if (!title || !url || !type) {
        return res.status(400).json({ message: 'Invalid data received.' });
    }

    try {
        const result = await addMedia(title, url, type); // Save to MongoDB
        res.status(200).json({ message: 'Media saved successfully!' });
    } catch (error) {
        console.error('Error saving media:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});




async function addMedia(title, url, type) {
    const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
    try {
        await client.connect();
        /* Inserting one Media Item */
        console.log("***** Inserting one media item *****");
        const mediaItem = { title, url, type };
        const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(mediaItem);
        console.log(`Media inserted with ID: ${result.insertedId}`);
        return { success: true, message: "Media saved successfully!" };
    } catch (e) {
        console.error("Error inserting media:", e);
        return { success: false, message: "Failed to save media." };
    } finally {
        await client.close();
    }
}











app.listen(portNumber);
process.stdout.write(`Web server is running at http://localhost:${portNumber}\n`); 
process.stdin.setEncoding("utf8");
process.stdin.on("readable", function () {
    const dataInput = process.stdin.read();
    if (dataInput !== null) {
        const command = dataInput.trim();
        if (command === "stop") {
            process.stdout.write("Shutting down the server:");
            process.exit(0);
        }
    }
});