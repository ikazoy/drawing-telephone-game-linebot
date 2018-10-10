const db = require('./firebaseInit');

const extractBundleId = source => source.groupId || source.roomId;
const latestGameDocRef = gameId => db.collection('games').doc(gameId).collection('latest').doc('latest');
const doneGameDocRef = gameId => db.collection('games').doc(gameId).collection('latest').doc('done');
const oldGameCollectionRef = gameId => db.collection('games').doc(gameId).collection('old');

const latestGameDocRefFromSource = (source) => {
  const gameId = `${(extractBundleId(source))}-game`;
  return latestGameDocRef(gameId);
};

const doneGameDocRefFromSource = (source) => {
  const gameId = `${(extractBundleId(source))}-game`;
  return doneGameDocRef(gameId);
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
  doneGameDocRef,
  latestGameDocRefFromSource,
  doneGameDocRefFromSource,
  currentIndex,
  usersDocRef,
  latestBundleIdOfUser,
  oldGameCollectionRef,
};
