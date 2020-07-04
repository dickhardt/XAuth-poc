/*
* config data for PoC
*/

const ip = require('ip');

var temp = {
    gs: {
        auth: { required: false }, // true - require JOSE authentication
        host: ip.address(),
        port: "8080",
        path: "/gs",
        cookieSecret: '47d4e33c-e115-4391-9516-9f14dcefef58'
    },
    page: {
        path: '/html'
    },
    resource: {
        path: '/resource',
        secret: 'KnNnY3BklEMyrFEmuGEag7B7O-uJbEvViqfbV6yvQ_M'
    }
};

temp.gs.uri = 'http://'+temp.gs.host+":"+temp.gs.port+temp.gs.path;
temp.page.uri = 'http://'+temp.gs.host+":"+temp.gs.port+temp.page.path;
temp.resource.uri = 'http://'+temp.gs.host+":"+temp.gs.port+temp.resource.path;
const config = temp;

module.exports = config;