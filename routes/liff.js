const express = require('express');

const router = express.Router();

router.get('/liff', (req, res, next) => {
  console.log(req);
  res.render('index', { title: 'Express' });
});

module.exports = router;
