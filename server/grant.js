/*
*   grant.js - processes Grant requests
*   
*/

const DB = require('./data/fakeDB');
const client = require('./client');
const user = require('./user');
const claims = require('./claims');
const authorization = require('./authorization');
const interaction = require('./interaction');
const utils = require('../utils/utils')
const error = require('./error');
const config = require('./config');
const { uuid } = require('uuidv4');

const grantDB = new DB('grants');

const makeGrantURI = ( grantID ) => {
    return config.gs.uri + '/grant/' + grantID;    
}

const checkPolicy = ( grant ) => {
    // indirect interaction not allowed if write scope requested
    if (grant.context.authorization.scope.write ) {
        grant.verification = uuid();
        if (grant.context.interaction.indirect) {
            delete grant.context.interaction.indirect;
            if (0 == Object.keys(grant.context.interaction).length)
                return error.response( 403, 'write scope not available for provided interaction modes')
        } 
    }
    return null
}

const validate = ( createRequest ) => {
    // TODO: use JSON schema to validate JSON rather than hand coding
    return null;
}


exports.complete = ( grantID, userID, authorized ) => {
    let grant = grantDB.read( grantID )
    if (!grant)
        return new Error("Grant"+grantID+" not found")
    grant.authorized = authorized;
    if (authorized) {
        // client.complete(grant, userID);
        // user.complete(grant, userID);
        claims.complete(grant, userID);
        authorization.complete(grant, userID);
    }
    grant.complete = true;
    return grantDB.update(grantID,grant);
} 

// middleware

exports.fetch = ( req, res, next ) => {
    let id = req.params.grant;
    if (!id) return next(error.response(401,'no grant ID in URI'));    
    let grant = grantDB.read(id);
    if (!grant) return next(error.notFound);

    if (!req.gnap)
        req.gnap = {}
    req.gnap.grant = grant;
    return next();
}

// Grant APIs

exports.create = (req, res, next) => {

    let err = null;
    if ( err = validate( req.body ) )
        return next(err);

    let grant = { request: req.body,
                  context: {
                    client: req.gnap.client.context,
                    user: {},
                    interaction: {},
                    authorization: {},
                    claims: {}
                },
                complete: false
                };

    if (err = user.validate( grant )) return next(err);
    if (err = interaction.validate( grant )) return next(err);
    if (err = authorization.validate( grant )) return next(err);
    if (err = claims.validate( grant )) return next(err);

    if (err = checkPolicy( grant )) return next(err);

    let grantID = grantDB.create( grant )
    let grantURI = config.gs.uri + '/grant/' + grantID;

    grant.uri = grantURI;
    grant.id = grantID;
    grantDB.update(grantID, grant);
    
    let response = {
        iat: utils.now(),
        nonce: grant.request.nonce,
        uri: makeGrantURI(grantID)
    }

    if (err = client.response(grant, response))return next(err);
    if (err = interaction.response(grant, response)) return next(err);
    if (grant.warnings)
        response.warnings = grant.warnings;

    res.status(201).json( response )
}


exports.read = (req, res, next) => {
    if (!req?.gnap?.grant)
        return next(error.response(501,'req.gnap.grant missing'));
    var grant = req.gnap.grant;
    var grantID = req.params.grant;
    if (grant.verification && !grant.verified)
        return next(error.response(401,'grant has not been verified'));    
    if (grant.complete) {
        if (!grant.authorized) {
            console.error(`... grant ${grantID} was not authorized.`);
            return next(error.response(200,"User declined.")); // TODO need a better error for this!
        }
        let response = {
            iat: utils.now(),
            nonce: grant.request.nonce,
            uri: grant.uri
        }        
        if (err = client.response(grant, response))return next(err);
        if (err = user.response(grant, response))return next(err);
        if (err = claims.response(grant, response))return next(err);
        if (err = authorization.response(grant, response))return next(err);
        console.log(`... grant ${grantID} authorized.`);
        return res.json(response);
    }

    console.log(`waiting on ${grantID} authorization ... `);
    // we are intentionally hanging the HTTP request 
    // while we wait for the Grant to be completed
    return grantDB.wait( grantID, function ( grant ) {
        req.gnap.grant = grant;
        // try again
        exports.read(req, res, next);
    });
}


exports.update = (req, res, next) => {

    next(error.notImplemented);
}

exports.verify = (req, res, next) => {
    var verification = req.body?.interaction?.verification
    if (!verification) 
        return next(error.response(401,'no client.verification'))
    var grant = req.gnap?.grant;
    if (!grant) 
        return next(error.response(500,'grant not in request'));
    if (!grant.verification) 
        return next(error.response(401,'no verification needed for grant '+grant.id));
    if ( verification != grant.verification)
        return next(error.response(401,'invalid verification'))
    grant.verified = true;
    grantDB.update(grant.id,grant);
    exports.read(req,res,next);
}

exports.delete= (req, res, next) => {

    next(error.notImplemented);
}

exports.options = (req, res, next) => {

    next(error.notImplemented);
}


