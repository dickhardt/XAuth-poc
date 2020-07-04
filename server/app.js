/*
*   app.js - Grant Server PoC
*   
*/

const express = require('express');
const cookieParser = require('cookie-parser');

const gnap = require('./gnap');
const pages = require('./pages');
const resource = require('./resource');
const config = require('./config');

const app = express();

// the Grant Server
app.use(config.gs.path, gnap);

// interaction pages
app.use(config.page.path, cookieParser(config.gs.cookieSecret));
app.use(config.page.path, pages);

// PoC resource server
app.get(config.resource.path, resource.read);
app.put(config.resource.path, resource.update);

// something bad happened
app.use((error, req, res, next) => {
    console.log(error);
    const status = error.statusCode || 500;
    const message = error.message || "no message";
    res.status(status).json({message: message});
});

app.listen(config.gs.port, 
    () => console.log('Server started on port '+config.gs.port ));
