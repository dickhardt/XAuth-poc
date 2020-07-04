/*
* page.js - serves pages for web client
*
*/

const DB = require('./fakeDB');

const sessionDB = new DB('sessions');

exports.home = function ( req, res, next ) {

    let user = null;
    let sessionObj = null;

    let sessionID = req.signedCookies.session;
    if (sessionID) {
        sessionObj = sessionDB.read(sessionID);
        user = sessionObj?.user
    }

    res.writeHeader(200, {"Content-Type": "text/html"});  
    res.write(
        '<!doctype html>' +
        '<html lang="en">' +
        '<head>' + 
            '<meta charset="utf-8">' +
            '<title>XAuth Web Client</title>' + 
            '<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.0/css/bootstrap.min.css" integrity="sha384-9aIt2nRpC12Uk9gS9baDl411NQApFmC26EwAOH8WgZl5MYYxFfc+NcPb1dKGj7Sk" crossorigin="anonymous"></link>'+
            '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no"></meta>' + 
        '</head>' +
        '<body>' + 
            '<div><h2>' +
                '<a href="/grant">Get Grant</a>' +
            '</div></h2>');
    if (user) {
        res.write('<hr> <div>User Info:<div>') 
        if (user.name)
            res.write('<div>name: '+user?.name+'</div>');                
        if (user.email)
            res.write('<div>email: '+user?.email+'</div>');                
    }
    res.write(
        '</body>' +
        '</html>');
    res.end();
}

