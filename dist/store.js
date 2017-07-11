'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.getDataWithOptimisticResults = undefined;
exports.createApolloReducer = createApolloReducer;
exports.createApolloStore = createApolloStore;

var _redux = require('redux');

var _store = require('./data/store');

var _store2 = require('./queries/store');

var _store3 = require('./mutations/store');

var _store4 = require('./optimistic-data/store');

var _actions = require('./actions');

var __assign = undefined && undefined.__assign || Object.assign || function (t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) {
            if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
    }
    return t;
};
exports.getDataWithOptimisticResults = _store4.getDataWithOptimisticResults;

var crashReporter = function crashReporter(store) {
    return function (next) {
        return function (action) {
            try {
                return next(action);
            } catch (err) {
                console.error('Caught an exception!', err);
                console.error(err.stack);
                throw err;
            }
        };
    };
};
var createReducerError = function createReducerError(error, action) {
    var reducerError = { error: error };
    if ((0, _actions.isQueryResultAction)(action)) {
        reducerError.queryId = action.queryId;
    } else if ((0, _actions.isSubscriptionResultAction)(action)) {
        reducerError.subscriptionId = action.subscriptionId;
    } else if ((0, _actions.isMutationResultAction)(action)) {
        reducerError.mutationId = action.mutationId;
    }
    return reducerError;
};
function createApolloReducer(config) {
    return function apolloReducer(state, action) {
        if (state === void 0) {
            state = {};
        }
        try {
            var newState = {
                queries: (0, _store2.queries)(state.queries, action),
                mutations: (0, _store3.mutations)(state.mutations, action),
                data: (0, _store.data)(state.data, action, config),
                optimistic: [],
                reducerError: null
            };
            newState.optimistic = (0, _store4.optimistic)(state.optimistic, action, newState, config);
            if (state.data === newState.data && state.mutations === newState.mutations && state.queries === newState.queries && state.optimistic === newState.optimistic && state.reducerError === newState.reducerError) {
                return state;
            }
            return newState;
        } catch (reducerError) {
            return __assign({}, state, { reducerError: createReducerError(reducerError, action) });
        }
    };
}
function createApolloStore(_a) {
    var _b = _a === void 0 ? {} : _a,
        _c = _b.reduxRootKey,
        reduxRootKey = _c === void 0 ? 'apollo' : _c,
        initialState = _b.initialState,
        _d = _b.config,
        config = _d === void 0 ? {} : _d,
        _e = _b.reportCrashes,
        reportCrashes = _e === void 0 ? true : _e,
        logger = _b.logger;
    var enhancers = [];
    var middlewares = [];
    if (reportCrashes) {
        middlewares.push(crashReporter);
    }
    if (logger) {
        middlewares.push(logger);
    }
    if (middlewares.length > 0) {
        enhancers.push(_redux.applyMiddleware.apply(void 0, middlewares));
    }
    if (typeof window !== 'undefined') {
        var anyWindow = window;
        if (anyWindow.devToolsExtension) {
            enhancers.push(anyWindow.devToolsExtension());
        }
    }
    var compose = _redux.compose;
    if (initialState && initialState[reduxRootKey] && initialState[reduxRootKey]['queries']) {
        throw new Error('Apollo initial state may not contain queries, only data');
    }
    if (initialState && initialState[reduxRootKey] && initialState[reduxRootKey]['mutations']) {
        throw new Error('Apollo initial state may not contain mutations, only data');
    }
    return (0, _redux.createStore)((0, _redux.combineReducers)((_f = {}, _f[reduxRootKey] = createApolloReducer(config), _f)), initialState, compose.apply(void 0, enhancers));
    var _f;
}
//# sourceMappingURL=store.js.map