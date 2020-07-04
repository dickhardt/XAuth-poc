/*
*   options.js - returns the GS options
*   
*/

const options = {
    'sample': 'value'
}

exports.read = (req, res, next) => {
    res.json( options )
}