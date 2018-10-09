const db = require('./firebaseInit');

const extractBundleId = source => source.groupId || source.roomId;
const latestGameDocRef = gameId => db.collection('games').doc(gameId).collection('latest').doc('latest');
const oldGameDocRef = gameId => db.collection('games').doc(gameId).collection('latest').doc('old');

const latestGameDocRefFromSource = (source) => {
  const gameId = `${(extractBundleId(source))}-game`;
  return latestGameDocRef(gameId);
};

const oldGameDocRefFromSource = (source) => {
  const gameId = `${(extractBundleId(source))}-game`;
  return oldGameDocRef(gameId);
};

const usersDocRef = userId => db.collection('users').doc(userId);
const latestBundleIdOfUser = async (userId) => {
  const docRef = usersDocRef(userId);
  const docSnapshot = await docRef.get();
  return docSnapshot.get('bundleId');
};

const currentIndex = async (bundleId) => {
  const latestDocRef = latestGameDocRef(`${bundleId}-game`);
  console.log('bundleId2', bundleId);
  const docSnapshot = await latestDocRef.get();
  if (docSnapshot.exists) {
    return docSnapshot.get('currentIndex');
  }
  return null;
};

module.exports = {
  extractBundleId,
  latestGameDocRef,
  oldGameDocRef,
  latestGameDocRefFromSource,
  oldGameDocRefFromSource,
  currentIndex,
  usersDocRef,
};
