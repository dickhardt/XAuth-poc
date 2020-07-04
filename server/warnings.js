/*
*   warning.js - generates GNAP warnings and adds them to response
*   
*/

exports.checkIgnored = ( obj, allowed, grant, root ) => {
    let values = [];
    if (obj.isArray)
        values = obj;
    else 
        values = Object.keys(obj);
    let warnings = values.filter( v => !allowed.includes(v));
    if (!warnings.length)
        return null;
    if (!grant.warnings) 
        grant.warnings = [];
    warnings.forEach( w => grant.warnings.push(root + w + ' was ignored.'));
    return warnings;
}

