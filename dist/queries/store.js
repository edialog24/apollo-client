'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.queries = queries;

var _actions = require('../actions');

var _storeUtils = require('../data/storeUtils');

var _isEqual = require('../util/isEqual');

var _networkStatus = require('./networkStatus');

var __assign = undefined && undefined.__assign || Object.assign || function (t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) {
            if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
    }
    return t;
};
function queries(previousState, action) {
    if (previousState === void 0) {
        previousState = {};
    }
    if ((0, _actions.isQueryInitAction)(action)) {
        var newState = __assign({}, previousState);
        var previousQuery = previousState[action.queryId];
        if (previousQuery && previousQuery.queryString !== action.queryString) {
            throw new Error('Internal Error: may not update existing query string in store');
        }
        var isSetVariables = false;
        var previousVariables = null;
        if (action.storePreviousVariables && previousQuery && previousQuery.networkStatus !== _networkStatus.NetworkStatus.loading) {
            if (!(0, _isEqual.isEqual)(previousQuery.variables, action.variables)) {
                isSetVariables = true;
                previousVariables = previousQuery.variables;
            }
        }
        var newNetworkStatus = _networkStatus.NetworkStatus.loading;
        if (isSetVariables) {
            newNetworkStatus = _networkStatus.NetworkStatus.setVariables;
        } else if (action.isPoll) {
            newNetworkStatus = _networkStatus.NetworkStatus.poll;
        } else if (action.isRefetch) {
            newNetworkStatus = _networkStatus.NetworkStatus.refetch;
        } else if (action.isPoll) {
            newNetworkStatus = _networkStatus.NetworkStatus.poll;
        }
        newState[action.queryId] = {
            queryString: action.queryString,
            document: action.document,
            variables: action.variables,
            previousVariables: previousVariables,
            networkError: null,
            graphQLErrors: [],
            networkStatus: newNetworkStatus,
            metadata: action.metadata
        };
        if (typeof action.fetchMoreForQueryId === 'string') {
            newState[action.fetchMoreForQueryId] = __assign({}, previousState[action.fetchMoreForQueryId], { networkStatus: _networkStatus.NetworkStatus.fetchMore });
        }
        return newState;
    } else if ((0, _actions.isQueryResultAction)(action)) {
        if (!previousState[action.queryId]) {
            return previousState;
        }
        var newState = __assign({}, previousState);
        var resultHasGraphQLErrors = (0, _storeUtils.graphQLResultHasError)(action.result);
        newState[action.queryId] = __assign({}, previousState[action.queryId], { networkError: null, graphQLErrors: resultHasGraphQLErrors ? action.result.errors : [], previousVariables: null, networkStatus: _networkStatus.NetworkStatus.ready });
        if (typeof action.fetchMoreForQueryId === 'string') {
            newState[action.fetchMoreForQueryId] = __assign({}, previousState[action.fetchMoreForQueryId], { networkStatus: _networkStatus.NetworkStatus.ready });
        }
        return newState;
    } else if ((0, _actions.isQueryErrorAction)(action)) {
        if (!previousState[action.queryId]) {
            return previousState;
        }
        var newState = __assign({}, previousState);
        newState[action.queryId] = __assign({}, previousState[action.queryId], { networkError: action.error, networkStatus: _networkStatus.NetworkStatus.error });
        if (typeof action.fetchMoreForQueryId === 'string') {
            newState[action.fetchMoreForQueryId] = __assign({}, previousState[action.fetchMoreForQueryId], { networkError: action.error, networkStatus: _networkStatus.NetworkStatus.error });
        }
        return newState;
    } else if ((0, _actions.isQueryResultClientAction)(action)) {
        if (!previousState[action.queryId]) {
            return previousState;
        }
        var newState = __assign({}, previousState);
        newState[action.queryId] = __assign({}, previousState[action.queryId], { networkError: null, previousVariables: null, networkStatus: action.complete ? _networkStatus.NetworkStatus.ready : _networkStatus.NetworkStatus.loading });
        return newState;
    } else if ((0, _actions.isQueryStopAction)(action)) {
        var newState = __assign({}, previousState);
        delete newState[action.queryId];
        return newState;
    } else if ((0, _actions.isStoreResetAction)(action)) {
        return resetQueryState(previousState, action);
    }
    return previousState;
}
function resetQueryState(state, action) {
    var observableQueryIds = action.observableQueryIds;
    var newQueries = Object.keys(state).filter(function (queryId) {
        return observableQueryIds.indexOf(queryId) > -1;
    }).reduce(function (res, key) {
        res[key] = __assign({}, state[key], { networkStatus: _networkStatus.NetworkStatus.loading });
        return res;
    }, {});
    return newQueries;
}
//# sourceMappingURL=store.js.map