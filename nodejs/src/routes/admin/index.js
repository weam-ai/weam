const express = require('express');
const teamMemberRouter = require('./teamMember');

const router = express.Router();

router.use('/role', require('./role'));
router.use('/auth', require('./auth'));
router.use('/user', require('./user'));
router.use('/permission', require('./permission'));
router.use('/country', require('./country'));
router.use('/state', require('./state'));
router.use('/city', require('./city'));
router.use('/company', require('./company'));
router.use('/bot', require('./bot'));
router.use('/log', require('./log'));
router.use('/dashboard', require('./dashboard'));
router.use('/brain', require('./brain'));
router.use('/workspace', require('./workspace'));
router.use('/workspaceuser', require('./workspaceuser'));
router.use('/customgpt', require('./customgpt'));
router.use('/members', require('./member'));
router.use('/billing', require('./billing'));
router.use('/team', teamMemberRouter);
router.use('/storagerequest', require('./storagerequest'));
router.use('/invoice', require('./invoice'));
router.use('/report', require('./report'));
router.use('/credit-control', require('./creditControl'));
router.use('/super-solution', require('./superSolution'));

module.exports = router;
