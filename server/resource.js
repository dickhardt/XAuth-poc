/*
*   resource.js
*   
*/

const jwt = require('jsonwebtoken');

const config = require('./config');
const error = require('./error');
const DB = require('./data/fakeDB');
const userDB = new DB('users');

function checkAccess ( req, scope ) {
    if (!req.accepts('application/json'))
        return error.response(406,'must accept "application/json"');
    let headerAuthN = req.header('Authorization');
    if (!headerAuthN)
        return error.response(401,'Authorization header required');
    let scheme = headerAuthN.split(' ')[0].toLowerCase();
    if ( !scheme || ('bearer' != scheme) )
        return error.response(401,'Only authorization "bearer" supported');
    let token = headerAuthN.split(' ')[1];
    if (!token)
        return error.response(401,'Token required');
    // jwt.verify will throw an error if invalid token
    let payload = jwt.verify( token, config.resource.secret, {
            audience: config.resource.audience,
            issuer: config.gs.uri
        });
    if (!payload?.scope[scope])
        return error.response(401,scope + ' scope required.');
    return payload;
} 

exports.read = (req, res, next) => {
    let payload = checkAccess(req, 'read');
    if (payload instanceof Error ) return next(payload);
    let userObj = userDB.read( payload?.sub );
    res.json(userObj);
}

exports.update = (req, res, next) => {
    let payload = checkAccess(req, 'write');
    if (payload instanceof Error ) return next(payload);
    let userObj = req.body;
    let err = userDB.update( payload.sub, userObj);
    if (err)
        return next(err);
    res.json(userObj)

}