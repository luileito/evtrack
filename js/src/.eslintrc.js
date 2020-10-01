module.exports = {
  'env': {
    'browser': true,
  },
  'extends': [
    'google',
  ],
  'rules': {
    'indent': ['error', 4],
    'max-len': 0,
    'no-var': 0,
    'require-jsdoc': 0,
    'prefer-rest-params': 0,
    'prefer-spread': 0,
    'no-unused-vars': 1,
    'guard-for-in': 1,
    'spaced-comment': ["error", "always", {
      "block": {
        "markers": ["!"],
      },
    }],
  },
};
