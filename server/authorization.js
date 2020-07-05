/*
*   authorization.js - middleware and AZ URI API   
*/

const jwt = require('jsonwebtoken');

const config = require('./config');
const error = require('./error');
const warnings = require('./warnings')
const DB = require('./data/fakeDB');

const authorizationDB = new DB('authorizations');

function createToken ( id, az, access ) {
    let token = jwt.sign({
        scope: access.scope,
        az: id 
    }, config.resource.secret, {
        expiresIn: az.expires_in,
        subject: access.userID,
        audience: config.resource.uri,
        issuer: config.gs.uri
    });
    return token;
}

function refreshAZ ( id, access ) {
    if (!access)
        access = authorizationDB.read(id);
    let az = {
        uri: config.gs.uri + '/az/' + id,
        expires_in: 3600,
        mechanism: 'bearer',
        access: {
            type: 'oauth_scope',
            scope: Object.keys(access.scope).join(' ')
        }
    }
    let token = createToken( id, az, access );
    if (!token)
        throw('createToken Failed')
    az.token = token;
    return az;
};



exports.validate = ( grant ) => {
    if (grant.request.authorizations)
        return error.response( 501,'The "authorizations" feature is not supported.' );
    let a = grant.request.authorization;
    if (!a)
        return null;
    if (!a.type)
        return error.response( 401,'authorization.type is required.');
    if (a.type != 'oauth_scope')
        return error.response( 501,'authorization.type '+a.type+' is not supported.');
    if (!a.scope)
        return error.response( 401,'authorization.scope is required.');
    warnings.checkIgnored(a,['type','scope'],grant,'authorization.')

    let scopesAll = a.scope.split(' ');
    let scopesSupported = ['read','write'].filter( x => scopesAll.includes(x));
    if (0 === scopesSupported.length)
        return error.response( 401,'no supported scopes were provided');
    if (scopesSupported.length != scopesAll.length)
        warnings.checkIgnored(scopesAll,['read','write'],grant,'authorization.scopes ')
    let scopeObject = {}
    scopesSupported.forEach( s => scopeObject[s] = true );
    grant.context.authorization.type = a.type;
    grant.context.authorization.scope = scopeObject;
    return null;
}


exports.complete = (grant, userID) => {
    if (!grant.context.authorization)
        return null;
    grant.context.authorization.userID = userID;
    grant.context.authorization.client = grant.context.client;
    let a = authorizationDB.create(grant.context.authorization);
    if (!a)
        return new Error('creating authorization failed');
    grant.context.authorization = { id: a };
    return null;
}


exports.response = (grant, response) => {
    let az = refreshAZ( grant.context.authorization?.id );
    if (!az)
        return new Error("could not refresh authorization");
    response.authorization = az;
    return null;
}



// AZ middleware

exports.fetch = (req, res, next) => {
    let id = req.params.az;
    if (!id) return next(error.response(401,'no authorization ID in URI'));    
    let az = authorizationDB.read(id);
    if (!az) return next(error.notFound);

    if (!req.gnap)
        req.gnap = {}
    req.gnap.az = az;
    next();
}

// AZ URI APIs

exports.read = (req, res, next) => {
    if (!req?.gnap?.az)
        return next(error.response(501,'req.gnap.az missing'));
    res.json( refreshAZ( req.params.az, req.gnap.az) );
}

exports.update = (req, res, next) => {
    next(error.notImplemented);;
}


exports.delete = (req, res, next) => {
    next(error.notImplemented);;  
}

exports.options = (req, res, next) => {
    next(error.notImplemented);    
}


