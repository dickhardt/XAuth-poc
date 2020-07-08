/*
* grant.js - creates and reads grants for web client
*
*/
const util = require('util');
const { uuid, jsonSchema } = require('uuidv4');
const fetch = require('node-fetch');

const config = require('./config');
const utils = require('../utils/utils');
const DB = require('./fakeDB');
const { post } = require('../server/gnap');

const completionDB = new DB('completions');
const sessionDB = new DB('sessions');

exports.create = function ( req, res, next ) {
    // clean up an old session if it exists
    let sessionID = req.signedCookies.session;
    if (sessionID)
        sessionDB.delete( sessionID )

    let grantRequest = {
        iat: utils.now(),
        nonce: uuid(),
        uri: config.gs.uri,
        method: 'POST', 
        client: {
            id: 'id_1'
        },
        interaction: { redirect: { completion_uri: null } },
        authorizations: {
            reader: {
                type: "oauth_scope",
                scope: "read"
            },
            writer: {
                type: "oauth_scope",
                scope: "write"
            }
        },
        claims: {
            oidc: { 
                userinfo: {
                    name: null,
                    email: null
                }
            }
        }
    };

    let completionID = completionDB.create(grantRequest);
    grantRequest.interaction.redirect.completion_uri = 
            config.uri + 'complete/' + completionID;
    fetch(config.gs.uri, {
        method:     'POST',
        body:       JSON.stringify(grantRequest),
        headers:    { 'Content-Type': 'application/json'}
        })
    .then( res => {
        if (res.status != 201) return next(new Error('did not get a 201'));
        return res;
    })
    .then( res => res.json())
    .then( json => {

console.error( json )

        let grantURI = json.uri;
        let redirectURI = json.interaction.redirect.redirect_uri;
        let sessionID = sessionDB.create({
            completionID: completionID,
            grantURI: grantURI,
            verification: json.interaction?.redirect?.verification
        });
        res.cookie('session',sessionID,{signed:true});
        res.redirect(redirectURI);
    })    
}


exports.complete = function ( req, res, next ) {
    let completionID = req.params.id;
    if (!completionID) return next(new Error('no completionID'));
    let completionObj = completionDB.read(completionID);
    if (!completionObj) return next(new Error('invalid completionID'));
    let sessionID = req.signedCookies.session;
    if (!sessionID) return next(new Error('no sessionID'));
    let sessionObj = sessionDB.read(sessionID);
    if (!sessionObj) return next(new Error('invalid sessionID'));
    if (sessionObj.completionID != completionID) 
        return next(new Error('completion and session mismatch'))
    let opts = {headers:{'Accept':'application/json'}};
    if (sessionObj.verification) {
        let verification = req.query.verification;
        if (!verification)
            return next(new Error('no verification in query string'));
        opts.method = 'PATCH';
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify({
            iat: utils.now(),
            nonce: uuid(),
            uri: sessionObj.grantURI,
            method: 'PATCH', 
            interaction: { verification: verification }    
        });
    }
    fetch(sessionObj.grantURI,opts)
    .then( res => {
        if (res.status != 200) return next(new Error('did not get a 200'));
        return res;
    })
    .then( res => res.json())
    .then( json => {
        if (!json?.claims?.oidc?.userinfo)
            return next(new Error(JSON.stringify(json)))
        // TODO check the response matches the request
        console.log( json );

        completionDB.delete(completionID);
        sessionObj.user = json.claims.oidc.userinfo;
        sessionObj.authorizations = json.authorizations;
        sessionDB.update(sessionID, sessionObj);
        res.redirect('/')
    });
}