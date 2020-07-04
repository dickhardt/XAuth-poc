/*
*   app.js - Web Client Server PoC
*   
*/

const express = require('express');
const cookieParser = require('cookie-parser');
const open = require('open');

const page = require('./page');
const grant = require('./grant');
const config = require('./config');

const app = express();

app.use('/', cookieParser(config.cookieSecret) );
app.get('/',page.home);
app.get('/grant',grant.create)
app.get('/complete/:id', grant.complete);

// something bad happened
app.use((error, req, res, next) => {
    console.log(error);
    const status = error.statusCode || 500;
    const message = error.message || "no message";
    res.status(status).json({message: message});
});


app.listen(config.port, 
    () => {
        console.log('Server started on port '+config.port );
        open(config.uri);
    });
