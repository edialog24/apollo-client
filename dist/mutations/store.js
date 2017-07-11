'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.mutations = mutations;

var _actions = require('../actions');

var __assign = undefined && undefined.__assign || Object.assign || function (t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) {
            if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
    }
    return t;
};
function mutations(previousState, action) {
    if (previousState === void 0) {
        previousState = {};
    }
    if ((0, _actions.isMutationInitAction)(action)) {
        var newState = __assign({}, previousState);
        newState[action.mutationId] = {
            mutationString: action.mutationString,
            variables: action.variables,
            loading: true,
            error: null
        };
        return newState;
    } else if ((0, _actions.isMutationResultAction)(action)) {
        var newState = __assign({}, previousState);
        newState[action.mutationId] = __assign({}, previousState[action.mutationId], { loading: false, error: null });
        return newState;
    } else if ((0, _actions.isMutationErrorAction)(action)) {
        var newState = __assign({}, previousState);
        newState[action.mutationId] = __assign({}, previousState[action.mutationId], { loading: false, error: action.error });
    } else if ((0, _actions.isStoreResetAction)(action)) {
        return {};
    }
    return previousState;
}
//# sourceMappingURL=store.js.map