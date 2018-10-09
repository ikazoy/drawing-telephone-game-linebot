const Firestore = require('@google-cloud/firestore');

// const serviceAccount = require('../firestore-admin-key.json');
const firestore = new Firestore({
  projectId: 'drawing-telephone-game-linebot',
  keyFilename: '../firestore-admin-key.json',
  timestampsInSnapshots: true,
});

module.exports = firestore;
