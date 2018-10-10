const questionType = targetIndex => ((targetIndex % 2 === 0) ? 'drawing' : 'guessing');
const fileSuffix = targetIndex => ((targetIndex % 2 === 0) ? 'jpeg' : 'txt');

module.exports = {
  questionType,
  fileSuffix,
};
