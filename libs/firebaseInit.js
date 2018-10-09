const admin = require('firebase-admin');

// const serviceAccount = require('../firestore-key.json');
const serviceAccount = require('../firestore-admin-key.json');

const settings = {
  timestampsInSnapshots: true,
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  admin.firestore.setLogFunction(console.log);
  admin.firestore().settings(settings);
}

module.exports = admin.firestore();
