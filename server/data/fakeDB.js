/*
*   fakeDB.js - in memory DB for PoC*/
const util = require('util');

const { uuid } = require('uuidv4');

var data = {
    users : require('./users.json'),
    registeredClients : require('./registered_clients'),
    dynamicClients : {},
    grants : {},
    authorizations :{},
    sessions : {},
    interactions: {}
};

var completions = {};

function DB (name) {
    if (!name) throw('no name!');
    if (!data[name]) throw("'"+name + "' does not exist in DB");
    this.table = data[ name ];
    this.name = name;
    }


DB.prototype.create = function ( obj ) {
    var item = uuid();

console.log('DB.create %s item %s', this.name, item);
// console.log(util.inspect(obj,true,null));

    var newObj = JSON.parse( JSON.stringify( obj ) );
    this.table[ item ] = newObj;
    return item;
}   

DB.prototype.exists = function ( item ) {
    return this.table.hasOwnProperty( item )
}

DB.prototype.list = function () {
    return Object.keys(this.table);
}

DB.prototype.read = function ( item ) {
    if (!this.table[ item ])
        return undefined;
    return JSON.parse( JSON.stringify( this.table[ item ] ) );
}

DB.prototype.update = function ( item, obj ) {
    if (this.table[item])
        this.table[item] = JSON.parse( JSON.stringify( obj ) );
    else
        return new Error(item + ' does not exist in table ' + this.name);

console.log('DB.update %s item %s', this.name, item);
// console.log(util.inspect(obj,true,null));

    // check if a completion function is waiting for an update to this item
    let completion = completions?.[item]
    if (!completion) 
        return null;
    delete completions[item];
    completion(obj);
}

DB.prototype.delete = function ( item ) {
    if (this.table[item])
        delete this.table[item];
    else
        return new Error(item + ' does not exist in table ' + this.name);
}

DB.prototype.wait = function ( item, completion ) {
    if (!item) throw(item+" not found")
    completions[item] = completion;
} 

module.exports = DB;