/*
* config data for PoC
*/

const configServer = require("../server/config.js");

var temp = {
    gs: { uri: configServer.gs.uri },
    cookieSecret: '31b22755-14e0-49e1-bb83-866fb85d9193',
    host: 'localhost',
    port: '8081',
    jwk: {
        "kty": "EC",
        "kid": "4D1E-PIJsgIviiRdgUWpio1ECQFb_Cfxfo0PQcVB_lY",
        "use": "sig",
        "alg": "ES256",
        "crv": "P-256",
        "x": "dM3PPezvIjF6KGZVWQ1irW-70FzDN5IokBAj0LmaO3o",
        "y": "uIdYHYYK1Nkk9SfV2LhIh-3KJ8u5a-vI2x0vYARTm7Q",
        "d": "YP4SF5b5ZNsyyKeUseqrRRvwV5Jqz5LzPH1IX4L5X4s"
    }
};

temp.uri = 'http://'+temp.host+':'+temp.port+'/';
const config = temp;

module.exports = config;