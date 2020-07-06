/*
*   gnap.js - routes Grant Server requests
*   
*/

const express = require('express');

const grant = require('./grant');
const az = require('./authorization');
const auth = require('./authentication');
const options = require('./options');
const client = require('./client');
const config = require('./config');

const router = express.Router();

// middleware
router.use(express.text({type:'application/jose'}));
router.use(express.json({type:'application/json'}));
router.use(auth.detect);
router.use('/grant/:grant', grant.fetch);
router.use('/az/:az', az.fetch);
router.use(client.fetch);
router.use(auth.verify);

// GNAP APIs
router.options( '/', options.read);
if (config.gs?.auth?.required)
    router.use(auth.confirm);
router.post(    '/', grant.create);

router.get(     '/grant/:grant', grant.read);
router.put(     '/grant/:grant', grant.update);
router.patch(   '/grant/:grant', grant.verify);
router.delete(  '/grant/:grant', grant.delete);
router.options( '/grant/:grant', grant.options);

router.get(     '/az/:az', az.read);
router.put(     '/az/:az', az.update);
router.delete(  '/az/:az', az.delete);
router.options( '/az/:az', az.options);

module.exports = router;