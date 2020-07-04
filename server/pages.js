
/*
* pages.js = page router
*/

const express = require('express');

const interaction = require('./interaction');

const router = express.Router();


//GS web interface
router.get( '/indirect/:id', interaction.indirect);
router.get( '/redirect/:id', interaction.redirect);
router.get( '/user/:id', interaction.user);
router.get( '/consent/:consent', interaction.consent);


module.exports = router;