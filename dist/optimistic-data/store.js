'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.getDataWithOptimisticResults = getDataWithOptimisticResults;
exports.optimistic = optimistic;

var _actions = require('../actions');

var _store = require('../data/store');

var _assign = require('../util/assign');

var __assign = undefined && undefined.__assign || Object.assign || function (t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) {
            if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
    }
    return t;
};

var optimisticDefaultState = [];
function getDataWithOptimisticResults(store) {
    if (store.optimistic.length === 0) {
        return store.data;
    }
    var patches = store.optimistic.map(function (opt) {
        return opt.data;
    });
    return _assign.assign.apply(void 0, [{}, store.data].concat(patches));
}
function optimistic(previousState, action, store, config) {
    if (previousState === void 0) {
        previousState = optimisticDefaultState;
    }
    if ((0, _actions.isMutationInitAction)(action) && action.optimisticResponse) {
        var optimisticResponse = void 0;
        if (typeof action.optimisticResponse === 'function') {
            optimisticResponse = action.optimisticResponse(action.variables);
        } else {
            optimisticResponse = action.optimisticResponse;
        }
        var fakeMutationResultAction = {
            type: 'APOLLO_MUTATION_RESULT',
            result: { data: optimisticResponse },
            document: action.mutation,
            operationName: action.operationName,
            variables: action.variables,
            mutationId: action.mutationId,
            extraReducers: action.extraReducers,
            updateQueries: action.updateQueries,
            update: action.update
        };
        var optimisticData = getDataWithOptimisticResults(__assign({}, store, { optimistic: previousState }));
        var patch = getOptimisticDataPatch(optimisticData, fakeMutationResultAction, store.queries, store.mutations, config);
        var optimisticState = {
            action: fakeMutationResultAction,
            data: patch,
            mutationId: action.mutationId
        };
        var newState = previousState.concat([optimisticState]);
        return newState;
    } else if (((0, _actions.isMutationErrorAction)(action) || (0, _actions.isMutationResultAction)(action)) && previousState.some(function (change) {
        return change.mutationId === action.mutationId;
    })) {
        return rollbackOptimisticData(function (change) {
            return change.mutationId === action.mutationId;
        }, previousState, store, config);
    }
    return previousState;
}
function getOptimisticDataPatch(previousData, optimisticAction, queries, mutations, config) {
    var optimisticData = (0, _store.data)(previousData, optimisticAction, config);
    var patch = {};
    Object.keys(optimisticData).forEach(function (key) {
        if (optimisticData[key] !== previousData[key]) {
            patch[key] = optimisticData[key];
        }
    });
    return patch;
}
function rollbackOptimisticData(filterFn, previousState, store, config) {
    if (previousState === void 0) {
        previousState = optimisticDefaultState;
    }
    var optimisticData = (0, _assign.assign)({}, store.data);
    var newState = previousState.filter(function (item) {
        return !filterFn(item);
    }).map(function (change) {
        var patch = getOptimisticDataPatch(optimisticData, change.action, store.queries, store.mutations, config);
        (0, _assign.assign)(optimisticData, patch);
        return __assign({}, change, { data: patch });
    });
    return newState;
}
//# sourceMappingURL=store.js.map