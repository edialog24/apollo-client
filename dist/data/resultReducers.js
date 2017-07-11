'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.createStoreReducer = createStoreReducer;

var _readFromStore = require('./readFromStore');

var _writeToStore = require('./writeToStore');

function createStoreReducer(resultReducer, document, variables, config) {
    return function (store, action) {
        var _a = (0, _readFromStore.diffQueryAgainstStore)({
            store: store,
            query: document,
            variables: variables,
            returnPartialData: true,
            fragmentMatcherFunction: config.fragmentMatcher,
            config: config
        }),
            result = _a.result,
            isMissing = _a.isMissing;
        if (isMissing) {
            return store;
        }
        var nextResult;
        try {
            nextResult = resultReducer(result, action, variables);
        } catch (err) {
            console.warn('Unhandled error in result reducer', err);
            throw err;
        }
        if (result !== nextResult) {
            return (0, _writeToStore.writeResultToStore)({
                dataId: 'ROOT_QUERY',
                result: nextResult,
                store: store,
                document: document,
                variables: variables,
                dataIdFromObject: config.dataIdFromObject,
                fragmentMatcherFunction: config.fragmentMatcher
            });
        }
        return store;
    };
}
//# sourceMappingURL=resultReducers.js.map