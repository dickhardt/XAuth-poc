# XAuth-poc
XAuth (GNAP) Proof of Concept

This is an implementation of (https://tools.ietf.org/html/draft-hardt-xauth-protocol-11)

## /server
Grant Server and demo resource server.
Runs on port 8080 and uses machine IP address so that it can be called from mobile.
See server/client.js to change ports and other options.

    npm install
    npm start

## /web-client
Server side registered client.
Runs on port 8081 and uses machine IP address so that it can be called from mobile.
See web-client/client.js to change ports and other options.

    npm install
    npm start

## /cli-client
CLI dynamic client with QR code.

    npm install
    npm start       
    npm start -- -f (will run a fake user - for testing and dev)
    npm start -- -n (will not use JOSE client authentication)


Shows a QR code to scan. Server IP must be available to your mobile, for example on the same network.


