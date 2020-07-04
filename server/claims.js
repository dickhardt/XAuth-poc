/*
*   claims.js - processes Grant Request claims object
*   
*/

const warnings = require('./warnings')
const error = require('./error')
const DB = require('./data/fakeDB');

const userDB = new DB('users');



// Grant claims processing

exports.validate = ( grant ) => {
    let c = grant.request.claims
    if (!c || c === {})
        return null;
    if (!c.oidc)
        return error.response( 401, "Only oidc claims are supported.");
    if (!c.oidc.userinfo)
        return error.response( 401, "Only oidc.userinfo claims are supported.");
    let length = Object.keys(c.oidc.userinfo).length;
    if (!length)
        return error.response( 401, "Claims must be requested in oidc.userinfo.");
    let w = warnings.checkIgnored(c.oidc.userinfo,['name','email'],grant,'claims.oidc.userinfo.')
    if (w && (w.length >= length))
        return error.response( 401, "Only oidc.userinfo name and email claims are supported.");

    grant.context.claims = { oidc: { userinfo: {} } };
    if (c.oidc.userinfo.hasOwnProperty('name'))
        grant.context.claims.oidc.userinfo.name = c.oidc.userinfo.name;
    if (c.oidc.userinfo.hasOwnProperty('email'))
        grant.context.claims.oidc.userinfo.email = c.oidc.userinfo.email;

    return null;
}


exports.complete = (grant, userID) => {
    grant.userID = userID;
    return null;
}


exports.response = (grant, response) => {
    if (!grant.context.claims)
        return null
    let user = userDB.read( grant.userID)
    if (!user)
        return error.response( 404, "user not found");
    response.claims = {
        oidc: {
            userinfo: {}
        }
    }
    if (grant.context.claims.oidc.userinfo.hasOwnProperty('name'))
        response.claims.oidc.userinfo.name = user.name;
    if (grant.context.claims.oidc.userinfo.hasOwnProperty('email'))
        response.claims.oidc.userinfo.email = user.email;
    return null;
}

