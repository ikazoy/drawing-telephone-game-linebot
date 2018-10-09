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

module.exports = {
  extractBundleId,
  latestGameDocRef,
  oldGameDocRef,
  latestGameDocRefFromSource,
  oldGameDocRefFromSource,
};
