/*
*   error.js - error messages
*/

var errNotImplemented = new Error("not implemented");
errNotImplemented.statusCode = 501;
Object.freeze(errNotImplemented)
exports.notImplemented = errNotImplemented;


var errNotFound = new Error("not found");
errNotFound.statusCode = 404;
Object.freeze(errNotFound)
exports.notFound = errNotFound;


exports.response = ( statusCode, message ) => {
    let err = new Error(message);
    err.statusCode = statusCode;
    return err;
}


