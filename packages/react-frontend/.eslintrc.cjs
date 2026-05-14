module.exports = {
    env: {
        browser: true,
        es2020: true,
        jest: true
    },
    extends: [
        'eslint:recommended',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended'
    ],
    rules: {
        "no-unused-vars": "warn",
        "react/react-in-jsx-scope": "off",
        "react-hooks/set-state-in-effect": "warn"
    }
};