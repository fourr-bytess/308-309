export default {
    transform: {
        "^.+\\.[t|j]sx?$": "babel-jest"
    },
    moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.js$": "$1",
    },
    collectCoverage: true,
    collectCoverageFrom: [
        "packages/**/*.js",
        "!**/node_modules/**"
    ]
};