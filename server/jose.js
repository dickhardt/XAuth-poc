/*
* JOSE client authentication mechanism for GNAP
*
*/
const jwt = require('jsonwebtoken'); // used to decode
const jose = require('node-jose');   // using because it works with a keystore
const error = require('./error');

const getCompactToken = ( req, res, next ) => {
    if (!req?.gnap?.auth?.jose) {
        next(error.response(501,'not jose client authentication'));
        return null;
    } else {
        var auth = req.gnap.auth;
    }
    let compactToken = null;
    if (auth.jose?.header)
        compactToken = headerAuthN.split(' ')[1];
    if (auth.jose?.body)
        compactToken = req.body;
    if (compactToken) 
        return compactToken;
    next(error.response(401,'jose token not found'));
    return null;
}

// decodes payload from JOSE header or body
exports.decode = ( req, res, next ) => {
    let compactToken = getCompactToken( req, res, next );
    if (!compactToken)
        return null;
    try {
        let decoded = jwt.decode(compactToken,{json:true,complete:true});
        return decoded;
    } catch (err) {
        err.statusCode = 401;
        return next(err);
    }
}

exports.verify = ( req, res, next ) => {
    let compactToken = getCompactToken( req, res, next );
    if (!compactToken)
        return;

    let jwks = req.gnap?.client?.jwks;
    if (!jwks) 
        return next(error.response(501,'no jwks found'));
    
    jose.JWK.asKeyStore(jwks).then( keystore => {
        jose.JWS.createVerify(keystore)
            .verify(compactToken)
            .then( decoded => {
                let payload = decoded.payload.toString();
                try {
                    payload = JSON.parse(payload);
                } catch (err) {
                    err.statusCode = 401;
                    return next(err);
                }
                let uri = req.protocol+'://'+req.header('host') + req.originalUrl;
                if (uri != payload.uri)
                    return next(error.response(401,'signed URI does not match request URI'));
                if (payload.method.toUpperCase() != req.method.toUpperCase())
                    return next(error.response(401,'signed method does not match request method'));
                if (req.gnap.auth?.jose?.body)
                    req.body = payload;
                return next();
            })
            .catch( err => { return next(err) });
    });
}

