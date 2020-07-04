/*
*   interaction.js - processes Grant Request interaction object
*   
*/

const url = require('url');

const config = require('./config');
const warnings = require('./warnings');
const error = require('./error');
const utils = require('../utils/utils');
const grant = require('./grant');
const DB = require('./data/fakeDB');

const interactionDB = new DB('interactions')
const grantDB = new DB('grants');
const userDB = new DB('users');
const dynamicClientDB = new DB('dynamicClients')
const registeredClientDB = new DB('registeredClients')

////////////////////////////
// HTML page generation
///////////////////////////

const pageStart =
    '<!doctype html>' +
    '<html lang="en">' +
    '<head>' + 
        '<meta charset="utf-8">' +
        '<title>XAuth Auth Server</title>' + 
        '<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.0/css/bootstrap.min.css" integrity="sha384-9aIt2nRpC12Uk9gS9baDl411NQApFmC26EwAOH8WgZl5MYYxFfc+NcPb1dKGj7Sk" crossorigin="anonymous"></link>'+
        '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no"></meta>' + 
    '</head>' +
    '<body>' + 
        '<div>';

const pageEnd = 
        '</div>' +
    '</body>' +
    '</html>';


function sendUserPage( res ) {
    res.writeHeader(200, {"Content-Type": "text/html"});  
    res.write(pageStart);
    res.write(
        '<h3>Select who you want to be:</h3>' +
        '<div>');
    let userIDs = userDB.list();
    userIDs.forEach( (id) => {
        let user = userDB.read(id);
        let userURI = config.page.uri + '/user/' + id; 
        res.write(
            '<div><h1>' +
                '<a href="' + userURI + '">' + user.name + '</a>' +
            '</h1></div>');
    })
    res.write(
        '</div>');
    res.write(pageEnd);
    res.end();    
}

function getClient(grant) {
    let obj = {};
    let c = grant.context.client;
    if (c.handle) {
        let dynClient = dynamicClientDB.read(c.handle);
        obj.name = dynClient.name;
        obj.uri = dynClient.uri;
    } else if (c.id) {
        let regClient = registeredClientDB.read(c.id);
        obj.name = regClient.name;
        obj.uri = regClient.uri;
    }

    return obj;

}

function sendConsentPage( res, grant, user ) {
    res.writeHeader(200, {"Content-Type": "text/html"});  
    res.write(pageStart);

    let clientObj = getClient(grant);

    res.write(
        '<div><h2>'+
            '<a href="'+clientObj.uri+'">'+clientObj.name+'</a>'+
        '</h2></div>'+
        '<div><h3>'+
            'would like access to:'+
        '</h3></div>');

    if (grant.context.claims.oidc.userinfo.hasOwnProperty('name'))
        res.write(
            '<div>name: '+user?.name+'</div>'
            );
    if (grant.context.claims.oidc.userinfo.hasOwnProperty('email'))
        res.write(
            '<div>email: '+user?.email+'</div>'
            );
    
    res.write(
        '<div><h1>' +
        '<div><a href="'+config.page.uri+'/consent/ok'+'">Ok</a></div>' +
        '<div><a href="'+config.page.uri+'/consent/cancel'+'">Cancel</a></div>' +
        '</h1></div>');
    res.write(pageEnd);
    res.end();    
}
/////////////////////////
// User Interaction 
/////////////////////////
exports.indirect = (req, res, next) => {
    let i = req.params.id;
    if (!i)
        return next(error.response(404,"no interaction id found."))
    let grantID = interactionDB.read(i)?.grant;
    if (!grantID)
        return next(error.response(404,i + " interaction not found."))
    if (!grantDB.exists(grantID))
        return next(error.response(404,grantID + " grant not found."))
    
    res.cookie('grant',grantID,{signed:true});
    sendUserPage( res );
}

exports.redirect  = (req, res, next) => {
    // redirect and indirect currently are the same logic
    return exports.indirect(req,res,next);
}

exports.user  = (req, res, next) => {
    let userID = req.params.id;
    let userObj = userDB.read(userID);
    if (!userObj)
        return next(error.response(404,"no user id found."))
    let grantID = req.signedCookies.grant;
    if (!grantID)
        return next(error.response(401,"no grant cookie found."))
    let grantObj = grantDB.read(grantID);
    if (!grantObj)
        return next(error.response(404,grantID + " grant not found."))
    res.cookie('user',userID,{signed:true});
    sendConsentPage(res,grantObj,userObj);
}

exports.consent  = (req, res, next) => {
    let consent = ('ok' === req.params.consent);

    let grantID = req.signedCookies.grant;
    if (!grantID)
        return next(error.response(401,"no grant cookie found."))
    let grantObj = grantDB.read(grantID);
    if (!grantObj)
        return next(error.response(404,grantID + " grant not found."))
    let userID = req.signedCookies.user;
    if (!userID)
        return next(error.response(401,"no user cookie found."))

    let uri = grantObj.context?.interaction?.redirect?.completion_uri 
           || grantObj.context?.interaction?.indirect?.information_uri;

// console.error(grantObj);

    if (!uri)
        return next(error.response(401,"no completion or information URI found."))
    if (grantObj.verification) {
        let url = new URL(uri);
        url.searchParams.append('verification',grantObj.verification);
        uri = url.toString();
    }   

    grant.complete( grantID, userID, consent);
    res.redirect(uri);


}

/////////////////////
// Grant processing
/////////////////////

exports.validate = (grant) => {
    let i = grant.request.interaction
    if (!i)
        return error.response( 401, 'interaction object required in request');
    let iRequest = Object.keys(i);
    let iSupported = ['redirect','indirect'].filter( x => iRequest.includes( x ))
    if (0 === iSupported.length)
        return error.response( 401, 'no supported interactions requested.');
    if (i.redirect && !i.redirect.completion_uri)
        return error.response( 401, 'redirect interaction requires completion_uri');
    warnings.checkIgnored(i,['redirect','indirect'],grant,'interaction.');
    if (i.redirect) {
        warnings.checkIgnored(i.redirect,['completion_uri'],grant,'interaction.redirect');
        grant.context.interaction.redirect = { completion_uri: i.redirect.completion_uri };
    }
    if (i.indirect) {
        warnings.checkIgnored(i.indirect,['information_uri'],grant,'interaction.indirect');
        grant.context.interaction.indirect = {};
        if (i.indirect.information_uri)
            grant.context.interaction.indirect.information_uri = i.indirect.information_uri;
    }
    return null;
}

exports.response = (grant, response) => {
    let i = grant.context.interaction;
    response.interaction = {}
    if (i.redirect) {
        grant.redirect = { 
            uuid: interactionDB.create({grant: grant.id}),
            iat: utils.now()
        };
        let redirectURI = config.page.uri + '/redirect/' + grant.redirect.uuid;
        response.interaction.redirect = { redirect_uri: redirectURI };
        if (grant.verification) {
            response.interaction.redirect.verification = true;
            return null
        }
    }
    if (i.indirect) {
        grant.indirect = { 
            uuid: interactionDB.create({grant: grant.id}),
            iat: utils.now()
        };
        let indirectURI = config.page.uri + '/indirect/' + grant.indirect.uuid;
        response.interaction.indirect = { indirect_uri: indirectURI };
    }

    return null;
}