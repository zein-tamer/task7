const express = require('express');
const path = require('path');
const router = require('express').Router();

router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'index.html'));
});

router.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'index.html'));
});

router.get('/new-page.html', (req, res) => {
 res.sendFile(path.join(__dirname, '..', 'views', 'new-page.html'));
});

router.get('/old-page.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'old-page.html'));
});

module.exports = router;