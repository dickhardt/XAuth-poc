/*
*   authorizations.js - middleware and AZ URI API   
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




// processing authorizations in a grant request

exports.validate = ( grant ) => {
    function validate ( request, context, objectName ) {
        if (!request.type)
            throw error.response( 401,'authorization.type is required in '+objectName);
        if (request.type != 'oauth_scope')
            throw error.response( 501,'authorization.type '+a.type+' is not supported in '+ObjectName);
        if (!request.scope)
            throw error.response( 401,'authorization.scope is required '+ObjectName);

        let scopesAll = request.scope.split(' ');
        let scopesSupported = ['read','write'].filter( x => scopesAll.includes(x));
        if (0 === scopesSupported.length)
            throw error.response( 401,'no supported scopes were provided');
        if (scopesSupported.length != scopesAll.length)
            warnings.checkIgnored(scopesAll,['read','write'],grant,'authorization.scopes '+ObjectName)
        let scopeObject = {}
        scopesSupported.forEach( s => scopeObject[s] = true );
        context.type = request.type;
        context.scope = scopeObject;
    }
    let a = grant.request.authorizations;
    if (!a)
        return null;
    try {
        if (a.type) {
            validate( a, grant.context.authorizations, 'authorizations' )
        } else {
            Object.keys(a).forEach( key => { 
                grant.context.authorizations[key] = {};
                validate( a[key], grant.context.authorizations[key], 'authorizations.'+key);
            });
        }
    } catch ( err ) {
        return err
    }
    return null;
}

exports.complete = (grant, userID) => {
    function complete ( az ) {
        az.userID = userID;
        az.client = grant.context.client;
        let a = authorizationDB.create(az);
        if (!a)
            throw new Error('creating authorization failed');
        az.id = a ;
        return null;
    
    }
    if (!grant.context.authorizations)
        return null;
    try {
        if (grant.context.authorizations.type) {
            complete( grant.context.authorizations )
        } else {
            Object.values(grant.context.authorizations).forEach( complete );
        }
    } catch ( err ) {
        return err
    }
}


exports.response = (grant, response) => {
    try {
        if (grant.context.authorizations.type) {
            response.authorizations = refreshAZ( grant.context.authorizations.id )
        } else {
            response.authorizations = {};
            Object.keys(grant.context.authorizations).forEach( key => { 
                response.authorizations[key] = refreshAZ( grant.context.authorizations[key]?.id) });
        }
    } catch ( err ) {
        return err
    }
}



// AZ URI middleware

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


