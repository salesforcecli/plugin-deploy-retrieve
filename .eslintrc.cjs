/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
module.exports = {
  extends: ['eslint-config-salesforce-typescript', 'eslint-config-salesforce-license', 'plugin:sf-plugin/recommended'],
  rules: {
    // allow deleting object properties via rest operator
    '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
    // Disable unsafe any rules due to @oclif/core autocomplete tag typing
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
  },
  ignorePatterns: ['test/nuts/specialTypes/*Project/**', 'test/nuts/retrieve/partialBundleDeleteProject/**'],
};
