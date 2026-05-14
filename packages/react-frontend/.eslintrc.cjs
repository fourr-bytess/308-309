module.exports = {
    env: {
        root: true,
        browser: true,
        es2020: true,
        jest: true
    },
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true
        }
    },
    plugins: ['react', 'react-hooks'],
    extends: [
        'eslint:recommended',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended'
    ],
    rules: {
        "no-unused-vars": "warn",
        "react/react-in-jsx-scope": "off",
        "react/prop-types": "off",
        "react-hooks/set-state-in-effect": "warn"
    },
    settings: {
        react: {
            version: 'detect'
        }
    }
};