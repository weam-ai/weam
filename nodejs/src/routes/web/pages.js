const express = require('express');
const router = express.Router();
const pageController = require('../../controller/web/pageController');
const { createPageKeys, updatePageKeys, getAllPagesKeys } = require('../../utils/validations/page');

// Create page from edited response
router.post('/create', validate(createPageKeys), pageController.createPageFromResponse);

// Get all pages
router.post('/list', validate(getAllPagesKeys), pageController.getAllPages);

// Get page by ID
router.get('/:id', pageController.getPageById);

// Update page
router.put('/:id', validate(updatePageKeys), pageController.updatePage);

// Delete page
router.delete('/:id', pageController.deletePage);

module.exports = router;

