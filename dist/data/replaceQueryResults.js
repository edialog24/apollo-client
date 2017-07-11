'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.replaceQueryResults = replaceQueryResults;

var _writeToStore = require('./writeToStore');

var __assign = undefined && undefined.__assign || Object.assign || function (t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) {
            if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
    }
    return t;
};
function replaceQueryResults(state, _a, config) {
    var variables = _a.variables,
        document = _a.document,
        newResult = _a.newResult;
    var clonedState = __assign({}, state);
    return (0, _writeToStore.writeResultToStore)({
        result: newResult,
        dataId: 'ROOT_QUERY',
        variables: variables,
        document: document,
        store: clonedState,
        dataIdFromObject: config.dataIdFromObject,
        fragmentMatcherFunction: config.fragmentMatcher
    });
}
//# sourceMappingURL=replaceQueryResults.js.map