/*
* authentication.js - client authentication middleware
*/

const error = require('./error');
const jose = require("./jose");

exports.detect = ( req, res, next ) => {

    if (!req.accepts('application/json'))
        return error.response(406,'Client must accept application/json.');

    let gnap = {}
    if (!req.gnap)
        req.gnap = gnap
    let hasBody = ( ('PUT' === req.method) || ('POST' === req.method));
    let headerAuthN = req.header('Authorization');
    let scheme = null;
    if (headerAuthN)
        scheme = headerAuthN.split(' ')[0].toLowerCase();

    if ( hasBody && req.is('application/json') && !headerAuthN )
        gnap.auth = { none: true };
    if ( !hasBody && !headerAuthN )
        gnap.auth = { none: true };

    if ( !hasBody && ('jose' === scheme))
        gnap.auth = { jose: { header: true }};
    if (hasBody && req.is('application/jose') && !headerAuthN)
        gnap.auth = { jose: { body: true }};
    
    if (!gnap.auth)
        return next(error.response(401,"unknown authentication mechanism"));

    next();
}

exports.verify = ( req, res, next ) => {
    let auth = req?.gnap?.auth

    if (auth?.none)
        return next();
    if (auth?.jose)
        return jose.verify(req,res,next);

    return next(error.response(401,"unknown authentication mechanism"));
}

exports.confirm = ( req, res, next ) => {
    if (req?.gnap?.auth?.none)
        return next(error.response(403));
    next();
}

