'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.data = data;

var _actions = require('../actions');

var _writeToStore = require('./writeToStore');

var _proxy = require('../data/proxy');

var _getFromAST = require('../queries/getFromAST');

var _storeUtils = require('./storeUtils');

var _replaceQueryResults = require('./replaceQueryResults');

var _readFromStore = require('./readFromStore');

var _errorHandling = require('../util/errorHandling');

var __assign = undefined && undefined.__assign || Object.assign || function (t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) {
            if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
    }
    return t;
};
function data(previousState, action, config) {
    if (previousState === void 0) {
        previousState = {};
    }
    var constAction = action;
    if ((0, _actions.isQueryResultAction)(action)) {
        if (!(0, _storeUtils.graphQLResultHasError)(action.result)) {
            var clonedState = __assign({}, previousState);
            var newState_1 = (0, _writeToStore.writeResultToStore)({
                result: action.result.data,
                dataId: 'ROOT_QUERY',
                document: action.document,
                variables: action.variables,
                store: clonedState,
                dataIdFromObject: config.dataIdFromObject,
                fragmentMatcherFunction: config.fragmentMatcher
            });
            if (action.extraReducers) {
                action.extraReducers.forEach(function (reducer) {
                    newState_1 = reducer(newState_1, constAction);
                });
            }
            return newState_1;
        }
    } else if ((0, _actions.isSubscriptionResultAction)(action)) {
        if (!(0, _storeUtils.graphQLResultHasError)(action.result)) {
            var clonedState = __assign({}, previousState);
            var newState_2 = (0, _writeToStore.writeResultToStore)({
                result: action.result.data,
                dataId: 'ROOT_SUBSCRIPTION',
                document: action.document,
                variables: action.variables,
                store: clonedState,
                dataIdFromObject: config.dataIdFromObject,
                fragmentMatcherFunction: config.fragmentMatcher
            });
            if (action.extraReducers) {
                action.extraReducers.forEach(function (reducer) {
                    newState_2 = reducer(newState_2, constAction);
                });
            }
            return newState_2;
        }
    } else if ((0, _actions.isMutationResultAction)(constAction)) {
        if (!constAction.result.errors) {
            var clonedState = __assign({}, previousState);
            var newState_3 = (0, _writeToStore.writeResultToStore)({
                result: constAction.result.data,
                dataId: 'ROOT_MUTATION',
                document: constAction.document,
                variables: constAction.variables,
                store: clonedState,
                dataIdFromObject: config.dataIdFromObject,
                fragmentMatcherFunction: config.fragmentMatcher
            });
            var updateQueries_1 = constAction.updateQueries;
            if (updateQueries_1) {
                Object.keys(updateQueries_1).filter(function (id) {
                    return updateQueries_1[id];
                }).forEach(function (queryId) {
                    var _a = updateQueries_1[queryId],
                        query = _a.query,
                        reducer = _a.reducer;
                    var _b = (0, _readFromStore.diffQueryAgainstStore)({
                        store: previousState,
                        query: query.document,
                        variables: query.variables,
                        returnPartialData: true,
                        fragmentMatcherFunction: config.fragmentMatcher,
                        config: config
                    }),
                        currentQueryResult = _b.result,
                        isMissing = _b.isMissing;
                    if (isMissing) {
                        return;
                    }
                    var nextQueryResult = (0, _errorHandling.tryFunctionOrLogError)(function () {
                        return reducer(currentQueryResult, {
                            mutationResult: constAction.result,
                            queryName: (0, _getFromAST.getOperationName)(query.document),
                            queryVariables: query.variables
                        });
                    });
                    if (nextQueryResult) {
                        newState_3 = (0, _writeToStore.writeResultToStore)({
                            result: nextQueryResult,
                            dataId: 'ROOT_QUERY',
                            document: query.document,
                            variables: query.variables,
                            store: newState_3,
                            dataIdFromObject: config.dataIdFromObject,
                            fragmentMatcherFunction: config.fragmentMatcher
                        });
                    }
                });
            }
            if (constAction.update) {
                var update_1 = constAction.update;
                var proxy_1 = new _proxy.TransactionDataProxy(newState_3, config);
                (0, _errorHandling.tryFunctionOrLogError)(function () {
                    return update_1(proxy_1, constAction.result);
                });
                var writes = proxy_1.finish();
                newState_3 = data(newState_3, { type: 'APOLLO_WRITE', writes: writes }, config);
            }
            if (constAction.extraReducers) {
                constAction.extraReducers.forEach(function (reducer) {
                    newState_3 = reducer(newState_3, constAction);
                });
            }
            return newState_3;
        }
    } else if ((0, _actions.isUpdateQueryResultAction)(constAction)) {
        return (0, _replaceQueryResults.replaceQueryResults)(previousState, constAction, config);
    } else if ((0, _actions.isStoreResetAction)(action)) {
        return {};
    } else if ((0, _actions.isWriteAction)(action)) {
        return action.writes.reduce(function (currentState, write) {
            return (0, _writeToStore.writeResultToStore)({
                result: write.result,
                dataId: write.rootId,
                document: write.document,
                variables: write.variables,
                store: currentState,
                dataIdFromObject: config.dataIdFromObject,
                fragmentMatcherFunction: config.fragmentMatcher
            });
        }, __assign({}, previousState));
    }
    return previousState;
}
//# sourceMappingURL=store.js.map