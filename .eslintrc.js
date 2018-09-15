module.exports = {
  root: true,
  parserOptions: {
    sourceType: 'module'
  },
  env: {
    es6: true,
    node: true,
  },
  extends: 'airbnb-base',
  // add your custom rules here
  'rules': {
    // allow debugger during development
    'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0,
    'no-console': 0,
    'no-multiple-empty-lines': ["error", {"max": 3}],
    'max-len': ["error", 180],
    'no-unused-vars': ["error", { "args": "none" }]
  }
}
