/*
*   client.js - processes Grant Request client object
*   
*/

const error = require('./error');
const jose = require('./jose');
const DB = require('./data/fakeDB');

const dynDB = new DB('dynamicClients');
const regDB = new DB('registeredClients');


// Grant processing

exports.response = (grant, response) => {
    if (grant.context.client.handle) {
        response.client = { "handle":  grant.context.client.handle };
    };
    return null;
}

// middleware

exports.fetch = ( req, res, next ) => {
    if (!req.gnap)
        req.gnap = {}
    var client = null;
    var clientObj = {};
    if (req.gnap?.grant?.context?.client)
        client = req.gnap.grant.context.client;
    if (req.gnap?.az?.context?.client)
        client = req.gnap.az.context.client;    
    if (!client) {
        if (req.gnap.auth.none)
            client = req?.body?.client;
        if (req.gnap.auth.jose) {
            let decode = jose.decode( req, res, next);
            if (!decode) return next(error.response(501,'no decode returned'));
            client = decode.payload?.client;
            let jwk = decode.header.jwk;
            if (jwk) clientObj.jwks = [jwk];
        }
        if (!client) next(error.response(401,'client object not found'));
        let items = 0
        if (client.id) items++;
        if (client.handle) items++;
        if (client.display) items++;
        if (items < 1)
            return next(error.response(401,'client object needs one recognized attribute'));
        if (items > 1)
            return next(error.response(401,'Only one attribute in client object allowed'));
        if (req.gnap.auth.jose && clientObj.jwks && !client.display)
            return next(error.response(401,'jwk header not allowed with client.id or client.handle'));
        if (client.display) {
            if (!client.display.name || !client.display.uri)
                return next(error.response(401,'client.display needs name and uri'));
            clientObj.name = client.display.name;
            clientObj.uri = client.display.uri;
            clientObj.handle = dynDB.create(clientObj);
        }
    }
    if (client.handle) {
        clientObj = dynDB.read(client.handle);
        clientObj.handle = client.handle;
    }
    if (client.id) {
        clientObj = regDB.read(client.id);
        clientObj.id = client.id;
    }
    let context = {}
    if (clientObj.handle) context.handle = clientObj.handle;
    if (clientObj.id) context.id = clientObj.id;
    clientObj.context = context;
    req.gnap.client = clientObj;
    next();
}