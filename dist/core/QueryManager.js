'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.QueryManager = undefined;

var _Deduplicator = require('../transport/Deduplicator');

var _isEqual = require('../util/isEqual');

var _assign = require('../util/assign');

var _types = require('./types');

var _networkStatus = require('../queries/networkStatus');

var _store = require('../store');

var _getFromAST = require('../queries/getFromAST');

var _queryTransform = require('../queries/queryTransform');

var _resultReducers = require('../data/resultReducers');

var _fragmentMatcher = require('../data/fragmentMatcher');

var _environment = require('../util/environment');

var _maybeDeepFreeze = require('../util/maybeDeepFreeze');

var _maybeDeepFreeze2 = _interopRequireDefault(_maybeDeepFreeze);

var _printer = require('graphql/language/printer');

var _readFromStore = require('../data/readFromStore');

var _scheduler = require('../scheduler/scheduler');

var _Observable = require('../util/Observable');

var _ApolloError = require('../errors/ApolloError');

var _ObservableQuery = require('./ObservableQuery');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var __assign = undefined && undefined.__assign || Object.assign || function (t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) {
            if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
    }
    return t;
};

var QueryManager = function () {
    function QueryManager(_a) {
        var networkInterface = _a.networkInterface,
            store = _a.store,
            reduxRootSelector = _a.reduxRootSelector,
            _b = _a.reducerConfig,
            reducerConfig = _b === void 0 ? { mutationBehaviorReducers: {} } : _b,
            fragmentMatcher = _a.fragmentMatcher,
            _c = _a.addTypename,
            addTypename = _c === void 0 ? true : _c,
            _d = _a.queryDeduplication,
            queryDeduplication = _d === void 0 ? false : _d,
            _e = _a.ssrMode,
            ssrMode = _e === void 0 ? false : _e;
        var _this = this;
        this.idCounter = 1;
        this.lastRequestId = {};
        this.networkInterface = networkInterface;
        this.deduplicator = new _Deduplicator.Deduplicator(networkInterface);
        this.store = store;
        this.reduxRootSelector = reduxRootSelector;
        this.reducerConfig = reducerConfig;
        this.pollingTimers = {};
        this.queryListeners = {};
        this.queryDocuments = {};
        this.addTypename = addTypename;
        this.queryDeduplication = queryDeduplication;
        this.ssrMode = ssrMode;
        if (typeof fragmentMatcher === 'undefined') {
            this.fragmentMatcher = new _fragmentMatcher.HeuristicFragmentMatcher();
        } else {
            this.fragmentMatcher = fragmentMatcher;
        }
        this.scheduler = new _scheduler.QueryScheduler({
            queryManager: this
        });
        this.fetchQueryPromises = {};
        this.observableQueries = {};
        this.queryIdsByName = {};
        if (this.store['subscribe']) {
            var currentStoreData_1;
            this.store['subscribe'](function () {
                var previousStoreData = currentStoreData_1 || {};
                var previousStoreHasData = Object.keys(previousStoreData).length;
                currentStoreData_1 = _this.getApolloState();
                if ((0, _isEqual.isEqual)(previousStoreData, currentStoreData_1) && previousStoreHasData) {
                    return;
                }
                _this.broadcastQueries();
            });
        }
    }
    QueryManager.prototype.broadcastNewStore = function (store) {
        this.broadcastQueries();
    };
    QueryManager.prototype.mutate = function (_a) {
        var _this = this;
        var mutation = _a.mutation,
            variables = _a.variables,
            optimisticResponse = _a.optimisticResponse,
            updateQueriesByName = _a.updateQueries,
            _b = _a.refetchQueries,
            refetchQueries = _b === void 0 ? [] : _b,
            updateWithProxyFn = _a.update;
        if (!mutation) {
            throw new Error('mutation option is required. You must specify your GraphQL document in the mutation option.');
        }
        var mutationId = this.generateQueryId();
        if (this.addTypename) {
            mutation = (0, _queryTransform.addTypenameToDocument)(mutation);
        }
        variables = (0, _assign.assign)({}, (0, _getFromAST.getDefaultValues)((0, _getFromAST.getMutationDefinition)(mutation)), variables);
        var mutationString = (0, _printer.print)(mutation);
        var request = {
            query: mutation,
            variables: variables,
            operationName: (0, _getFromAST.getOperationName)(mutation)
        };
        this.queryDocuments[mutationId] = mutation;
        var generateUpdateQueriesInfo = function generateUpdateQueriesInfo() {
            var ret = {};
            if (updateQueriesByName) {
                Object.keys(updateQueriesByName).forEach(function (queryName) {
                    return (_this.queryIdsByName[queryName] || []).forEach(function (queryId) {
                        ret[queryId] = {
                            reducer: updateQueriesByName[queryName],
                            query: _this.getApolloState().queries[queryId]
                        };
                    });
                });
            }
            return ret;
        };
        this.store.dispatch({
            type: 'APOLLO_MUTATION_INIT',
            mutationString: mutationString,
            mutation: mutation,
            variables: variables || {},
            operationName: (0, _getFromAST.getOperationName)(mutation),
            mutationId: mutationId,
            optimisticResponse: optimisticResponse,
            extraReducers: this.getExtraReducers(),
            updateQueries: generateUpdateQueriesInfo(),
            update: updateWithProxyFn
        });
        return new Promise(function (resolve, reject) {
            _this.networkInterface.query(request).then(function (result) {
                if (result.errors) {
                    var error = new _ApolloError.ApolloError({
                        graphQLErrors: result.errors
                    });
                    _this.store.dispatch({
                        type: 'APOLLO_MUTATION_ERROR',
                        error: error,
                        mutationId: mutationId
                    });
                    delete _this.queryDocuments[mutationId];
                    reject(error);
                    return;
                }
                _this.store.dispatch({
                    type: 'APOLLO_MUTATION_RESULT',
                    result: result,
                    mutationId: mutationId,
                    document: mutation,
                    operationName: (0, _getFromAST.getOperationName)(mutation),
                    variables: variables || {},
                    extraReducers: _this.getExtraReducers(),
                    updateQueries: generateUpdateQueriesInfo(),
                    update: updateWithProxyFn
                });
                var reducerError = _this.getApolloState().reducerError;
                if (reducerError && reducerError.mutationId === mutationId) {
                    reject(reducerError.error);
                    return;
                }
                if (typeof refetchQueries[0] === 'string') {
                    refetchQueries.forEach(function (name) {
                        _this.refetchQueryByName(name);
                    });
                } else {
                    refetchQueries.forEach(function (pureQuery) {
                        _this.query({
                            query: pureQuery.query,
                            variables: pureQuery.variables,
                            fetchPolicy: 'network-only'
                        });
                    });
                }
                delete _this.queryDocuments[mutationId];
                resolve(result);
            }).catch(function (err) {
                _this.store.dispatch({
                    type: 'APOLLO_MUTATION_ERROR',
                    error: err,
                    mutationId: mutationId
                });
                delete _this.queryDocuments[mutationId];
                reject(new _ApolloError.ApolloError({
                    networkError: err
                }));
            });
        });
    };
    QueryManager.prototype.fetchQuery = function (queryId, options, fetchType, fetchMoreForQueryId) {
        var _this = this;
        var _a = options.variables,
            variables = _a === void 0 ? {} : _a,
            _b = options.metadata,
            metadata = _b === void 0 ? null : _b,
            _c = options.fetchPolicy,
            fetchPolicy = _c === void 0 ? 'cache-first' : _c;
        var queryDoc = this.transformQueryDocument(options).queryDoc;
        var queryString = (0, _printer.print)(queryDoc);
        var storeResult;
        var needToFetch = fetchPolicy === 'network-only';
        if (fetchType !== _types.FetchType.refetch && fetchPolicy !== 'network-only') {
            var _d = (0, _readFromStore.diffQueryAgainstStore)({
                query: queryDoc,
                store: this.reduxRootSelector(this.store.getState()).data,
                variables: variables,
                returnPartialData: true,
                fragmentMatcherFunction: this.fragmentMatcher.match,
                config: this.reducerConfig
            }),
                isMissing = _d.isMissing,
                result = _d.result;
            needToFetch = isMissing || fetchPolicy === 'cache-and-network';
            storeResult = result;
        }
        var shouldFetch = needToFetch && fetchPolicy !== 'cache-only' && fetchPolicy !== 'standby';
        var requestId = this.generateRequestId();
        this.queryDocuments[queryId] = queryDoc;
        this.store.dispatch({
            type: 'APOLLO_QUERY_INIT',
            queryString: queryString,
            document: queryDoc,
            operationName: (0, _getFromAST.getOperationName)(queryDoc),
            variables: variables,
            fetchPolicy: fetchPolicy,
            queryId: queryId,
            requestId: requestId,
            storePreviousVariables: shouldFetch,
            isPoll: fetchType === _types.FetchType.poll,
            isRefetch: fetchType === _types.FetchType.refetch,
            fetchMoreForQueryId: fetchMoreForQueryId,
            metadata: metadata
        });
        this.lastRequestId[queryId] = requestId;
        var shouldDispatchClientResult = !shouldFetch || fetchPolicy === 'cache-and-network';
        if (shouldDispatchClientResult) {
            this.store.dispatch({
                type: 'APOLLO_QUERY_RESULT_CLIENT',
                result: { data: storeResult },
                variables: variables,
                document: queryDoc,
                operationName: (0, _getFromAST.getOperationName)(queryDoc),
                complete: !shouldFetch,
                queryId: queryId,
                requestId: requestId
            });
        }
        if (shouldFetch) {
            var networkResult = this.fetchRequest({
                requestId: requestId,
                queryId: queryId,
                document: queryDoc,
                options: options,
                fetchMoreForQueryId: fetchMoreForQueryId
            }).catch(function (error) {
                if ((0, _ApolloError.isApolloError)(error)) {
                    throw error;
                } else {
                    if (requestId >= (_this.lastRequestId[queryId] || 1)) {
                        _this.store.dispatch({
                            type: 'APOLLO_QUERY_ERROR',
                            error: error,
                            queryId: queryId,
                            requestId: requestId,
                            fetchMoreForQueryId: fetchMoreForQueryId
                        });
                    }
                    _this.removeFetchQueryPromise(requestId);
                    throw new _ApolloError.ApolloError({
                        networkError: error
                    });
                }
            });
            if (fetchPolicy !== 'cache-and-network') {
                return networkResult;
            }
        }
        return Promise.resolve({ data: storeResult });
    };
    QueryManager.prototype.queryListenerForObserver = function (queryId, options, observer) {
        var _this = this;
        var lastResult;
        var previouslyHadError = false;
        return function (queryStoreValue) {
            if (!queryStoreValue) {
                return;
            }
            queryStoreValue = _this.getApolloState().queries[queryId];
            var storedQuery = _this.observableQueries[queryId];
            var fetchPolicy = storedQuery ? storedQuery.observableQuery.options.fetchPolicy : options.fetchPolicy;
            if (fetchPolicy === 'standby') {
                return;
            }
            var shouldNotifyIfLoading = queryStoreValue.previousVariables || fetchPolicy === 'cache-only' || fetchPolicy === 'cache-and-network';
            var networkStatusChanged = lastResult && queryStoreValue.networkStatus !== lastResult.networkStatus;
            if (!(0, _networkStatus.isNetworkRequestInFlight)(queryStoreValue.networkStatus) || networkStatusChanged && options.notifyOnNetworkStatusChange || shouldNotifyIfLoading) {
                if (queryStoreValue.graphQLErrors && queryStoreValue.graphQLErrors.length > 0 || queryStoreValue.networkError) {
                    var apolloError_1 = new _ApolloError.ApolloError({
                        graphQLErrors: queryStoreValue.graphQLErrors,
                        networkError: queryStoreValue.networkError
                    });
                    previouslyHadError = true;
                    if (observer.error) {
                        try {
                            observer.error(apolloError_1);
                        } catch (e) {
                            setTimeout(function () {
                                throw e;
                            }, 0);
                        }
                    } else {
                        setTimeout(function () {
                            throw apolloError_1;
                        }, 0);
                        if (!(0, _environment.isProduction)()) {
                            console.info('An unhandled error was thrown because no error handler is registered ' + 'for the query ' + queryStoreValue.queryString);
                        }
                    }
                } else {
                    try {
                        var _a = (0, _readFromStore.diffQueryAgainstStore)({
                            store: _this.getDataWithOptimisticResults(),
                            query: _this.queryDocuments[queryId],
                            variables: queryStoreValue.previousVariables || queryStoreValue.variables,
                            config: _this.reducerConfig,
                            fragmentMatcherFunction: _this.fragmentMatcher.match,
                            previousResult: lastResult && lastResult.data
                        }),
                            data = _a.result,
                            isMissing = _a.isMissing;
                        var resultFromStore = void 0;
                        if (isMissing && fetchPolicy !== 'cache-only') {
                            resultFromStore = {
                                data: lastResult && lastResult.data,
                                loading: (0, _networkStatus.isNetworkRequestInFlight)(queryStoreValue.networkStatus),
                                networkStatus: queryStoreValue.networkStatus,
                                stale: true
                            };
                        } else {
                            resultFromStore = {
                                data: data,
                                loading: (0, _networkStatus.isNetworkRequestInFlight)(queryStoreValue.networkStatus),
                                networkStatus: queryStoreValue.networkStatus,
                                stale: false
                            };
                        }
                        if (observer.next) {
                            var isDifferentResult = !(lastResult && resultFromStore && lastResult.networkStatus === resultFromStore.networkStatus && lastResult.stale === resultFromStore.stale && lastResult.data === resultFromStore.data);
                            if (isDifferentResult || previouslyHadError) {
                                lastResult = resultFromStore;
                                try {
                                    observer.next((0, _maybeDeepFreeze2.default)(resultFromStore));
                                } catch (e) {
                                    setTimeout(function () {
                                        throw e;
                                    }, 0);
                                }
                            }
                        }
                        previouslyHadError = false;
                    } catch (error) {
                        previouslyHadError = true;
                        if (observer.error) {
                            observer.error(new _ApolloError.ApolloError({
                                networkError: error
                            }));
                        }
                        return;
                    }
                }
            }
        };
    };
    QueryManager.prototype.watchQuery = function (options, shouldSubscribe) {
        if (shouldSubscribe === void 0) {
            shouldSubscribe = true;
        }
        if (options.returnPartialData) {
            throw new Error('returnPartialData option is no longer supported since Apollo Client 1.0.');
        }
        if (options.forceFetch) {
            throw new Error('forceFetch option is no longer supported since Apollo Client 1.0. Use fetchPolicy instead.');
        }
        if (options.noFetch) {
            throw new Error('noFetch option is no longer supported since Apollo Client 1.0. Use fetchPolicy instead.');
        }
        if (options.fetchPolicy === 'standby') {
            throw new Error('client.watchQuery cannot be called with fetchPolicy set to "standby"');
        }
        var queryDefinition = (0, _getFromAST.getQueryDefinition)(options.query);
        if (queryDefinition.variableDefinitions && queryDefinition.variableDefinitions.length) {
            var defaultValues = (0, _getFromAST.getDefaultValues)(queryDefinition);
            options.variables = (0, _assign.assign)({}, defaultValues, options.variables);
        }
        if (typeof options.notifyOnNetworkStatusChange === 'undefined') {
            options.notifyOnNetworkStatusChange = false;
        }
        var transformedOptions = __assign({}, options);
        var observableQuery = new _ObservableQuery.ObservableQuery({
            scheduler: this.scheduler,
            options: transformedOptions,
            shouldSubscribe: shouldSubscribe
        });
        return observableQuery;
    };
    QueryManager.prototype.query = function (options) {
        var _this = this;
        if (!options.query) {
            throw new Error('query option is required. You must specify your GraphQL document in the query option.');
        }
        if (options.query.kind !== 'Document') {
            throw new Error('You must wrap the query string in a "gql" tag.');
        }
        if (options.returnPartialData) {
            throw new Error('returnPartialData option only supported on watchQuery.');
        }
        if (options.pollInterval) {
            throw new Error('pollInterval option only supported on watchQuery.');
        }
        if (options.forceFetch) {
            throw new Error('forceFetch option is no longer supported since Apollo Client 1.0. Use fetchPolicy instead.');
        }
        if (options.noFetch) {
            throw new Error('noFetch option is no longer supported since Apollo Client 1.0. Use fetchPolicy instead.');
        }
        if (typeof options.notifyOnNetworkStatusChange !== 'undefined') {
            throw new Error('Cannot call "query" with "notifyOnNetworkStatusChange" option. Only "watchQuery" has that option.');
        }
        options.notifyOnNetworkStatusChange = false;
        var requestId = this.idCounter;
        var resPromise = new Promise(function (resolve, reject) {
            _this.addFetchQueryPromise(requestId, resPromise, resolve, reject);
            return _this.watchQuery(options, false).result().then(function (result) {
                _this.removeFetchQueryPromise(requestId);
                resolve(result);
            }).catch(function (error) {
                _this.removeFetchQueryPromise(requestId);
                reject(error);
            });
        });
        return resPromise;
    };
    QueryManager.prototype.generateQueryId = function () {
        var queryId = this.idCounter.toString();
        this.idCounter++;
        return queryId;
    };
    QueryManager.prototype.stopQueryInStore = function (queryId) {
        this.store.dispatch({
            type: 'APOLLO_QUERY_STOP',
            queryId: queryId
        });
    };
    QueryManager.prototype.getApolloState = function () {
        return this.reduxRootSelector(this.store.getState());
    };
    QueryManager.prototype.selectApolloState = function (store) {
        return this.reduxRootSelector(store.getState());
    };
    QueryManager.prototype.getInitialState = function () {
        return { data: this.getApolloState().data };
    };
    QueryManager.prototype.getDataWithOptimisticResults = function () {
        return (0, _store.getDataWithOptimisticResults)(this.getApolloState());
    };
    QueryManager.prototype.addQueryListener = function (queryId, listener) {
        this.queryListeners[queryId] = this.queryListeners[queryId] || [];
        this.queryListeners[queryId].push(listener);
    };
    QueryManager.prototype.addFetchQueryPromise = function (requestId, promise, resolve, reject) {
        this.fetchQueryPromises[requestId.toString()] = { promise: promise, resolve: resolve, reject: reject };
    };
    QueryManager.prototype.removeFetchQueryPromise = function (requestId) {
        delete this.fetchQueryPromises[requestId.toString()];
    };
    QueryManager.prototype.addObservableQuery = function (queryId, observableQuery) {
        this.observableQueries[queryId] = { observableQuery: observableQuery };
        var queryDef = (0, _getFromAST.getQueryDefinition)(observableQuery.options.query);
        if (queryDef.name && queryDef.name.value) {
            var queryName = queryDef.name.value;
            this.queryIdsByName[queryName] = this.queryIdsByName[queryName] || [];
            this.queryIdsByName[queryName].push(observableQuery.queryId);
        }
    };
    QueryManager.prototype.removeObservableQuery = function (queryId) {
        var observableQuery = this.observableQueries[queryId].observableQuery;
        var definition = (0, _getFromAST.getQueryDefinition)(observableQuery.options.query);
        var queryName = definition.name ? definition.name.value : null;
        delete this.observableQueries[queryId];
        if (queryName) {
            this.queryIdsByName[queryName] = this.queryIdsByName[queryName].filter(function (val) {
                return !(observableQuery.queryId === val);
            });
        }
    };
    QueryManager.prototype.resetStore = function () {
        var _this = this;
        Object.keys(this.fetchQueryPromises).forEach(function (key) {
            var reject = _this.fetchQueryPromises[key].reject;
            reject(new Error('Store reset while query was in flight.'));
        });
        this.store.dispatch({
            type: 'APOLLO_STORE_RESET',
            observableQueryIds: Object.keys(this.observableQueries)
        });
        var observableQueryPromises = [];
        Object.keys(this.observableQueries).forEach(function (queryId) {
            var storeQuery = _this.reduxRootSelector(_this.store.getState()).queries[queryId];
            var fetchPolicy = _this.observableQueries[queryId].observableQuery.options.fetchPolicy;
            if (fetchPolicy !== 'cache-only' && fetchPolicy !== 'standby') {
                observableQueryPromises.push(_this.observableQueries[queryId].observableQuery.refetch());
            }
        });
        return Promise.all(observableQueryPromises);
    };
    QueryManager.prototype.startQuery = function (queryId, options, listener) {
        this.addQueryListener(queryId, listener);
        this.fetchQuery(queryId, options).catch(function (error) {
            return undefined;
        });
        return queryId;
    };
    QueryManager.prototype.startGraphQLSubscription = function (options) {
        var _this = this;
        var query = options.query;
        var transformedDoc = query;
        if (this.addTypename) {
            transformedDoc = (0, _queryTransform.addTypenameToDocument)(transformedDoc);
        }
        var variables = (0, _assign.assign)({}, (0, _getFromAST.getDefaultValues)((0, _getFromAST.getOperationDefinition)(query)), options.variables);
        var request = {
            query: transformedDoc,
            variables: variables,
            operationName: (0, _getFromAST.getOperationName)(transformedDoc)
        };
        var subId;
        var observers = [];
        return new _Observable.Observable(function (observer) {
            observers.push(observer);
            if (observers.length === 1) {
                var handler = function handler(error, result) {
                    if (error) {
                        observers.forEach(function (obs) {
                            if (obs.error) {
                                obs.error(error);
                            }
                        });
                    } else {
                        _this.store.dispatch({
                            type: 'APOLLO_SUBSCRIPTION_RESULT',
                            document: transformedDoc,
                            operationName: (0, _getFromAST.getOperationName)(transformedDoc),
                            result: { data: result },
                            variables: variables,
                            subscriptionId: subId,
                            extraReducers: _this.getExtraReducers()
                        });
                        observers.forEach(function (obs) {
                            if (obs.next) {
                                obs.next(result);
                            }
                        });
                    }
                };
                subId = _this.networkInterface.subscribe(request, handler);
            }
            return {
                unsubscribe: function unsubscribe() {
                    observers = observers.filter(function (obs) {
                        return obs !== observer;
                    });
                    if (observers.length === 0) {
                        _this.networkInterface.unsubscribe(subId);
                    }
                },
                _networkSubscriptionId: subId
            };
        });
    };
    QueryManager.prototype.removeQuery = function (queryId) {
        delete this.queryListeners[queryId];
        delete this.queryDocuments[queryId];
    };
    QueryManager.prototype.stopQuery = function (queryId) {
        this.removeQuery(queryId);
        this.stopQueryInStore(queryId);
    };
    QueryManager.prototype.getCurrentQueryResult = function (observableQuery, isOptimistic) {
        if (isOptimistic === void 0) {
            isOptimistic = false;
        }
        var _a = this.getQueryParts(observableQuery),
            variables = _a.variables,
            document = _a.document;
        var lastResult = observableQuery.getLastResult();
        var queryOptions = observableQuery.options;
        var readOptions = {
            store: isOptimistic ? this.getDataWithOptimisticResults() : this.getApolloState().data,
            query: document,
            variables: variables,
            config: this.reducerConfig,
            previousResult: lastResult ? lastResult.data : undefined,
            fragmentMatcherFunction: this.fragmentMatcher.match
        };
        try {
            var data = (0, _readFromStore.readQueryFromStore)(readOptions);
            return (0, _maybeDeepFreeze2.default)({ data: data, partial: false });
        } catch (e) {
            return (0, _maybeDeepFreeze2.default)({ data: {}, partial: true });
        }
    };
    QueryManager.prototype.getQueryWithPreviousResult = function (queryIdOrObservable, isOptimistic) {
        if (isOptimistic === void 0) {
            isOptimistic = false;
        }
        var observableQuery;
        if (typeof queryIdOrObservable === 'string') {
            if (!this.observableQueries[queryIdOrObservable]) {
                throw new Error("ObservableQuery with this id doesn't exist: " + queryIdOrObservable);
            }
            observableQuery = this.observableQueries[queryIdOrObservable].observableQuery;
        } else {
            observableQuery = queryIdOrObservable;
        }
        var _a = this.getQueryParts(observableQuery),
            variables = _a.variables,
            document = _a.document;
        var data = this.getCurrentQueryResult(observableQuery, isOptimistic).data;
        return {
            previousResult: data,
            variables: variables,
            document: document
        };
    };
    QueryManager.prototype.getQueryParts = function (observableQuery) {
        var queryOptions = observableQuery.options;
        var transformedDoc = observableQuery.options.query;
        if (this.addTypename) {
            transformedDoc = (0, _queryTransform.addTypenameToDocument)(transformedDoc);
        }
        return {
            variables: queryOptions.variables,
            document: transformedDoc
        };
    };
    QueryManager.prototype.transformQueryDocument = function (options) {
        var queryDoc = options.query;
        if (this.addTypename) {
            queryDoc = (0, _queryTransform.addTypenameToDocument)(queryDoc);
        }
        return {
            queryDoc: queryDoc
        };
    };
    QueryManager.prototype.getExtraReducers = function () {
        var _this = this;
        return Object.keys(this.observableQueries).map(function (obsQueryId) {
            var query = _this.observableQueries[obsQueryId].observableQuery;
            var queryOptions = query.options;
            if (queryOptions.reducer) {
                return (0, _resultReducers.createStoreReducer)(queryOptions.reducer, _this.addTypename ? (0, _queryTransform.addTypenameToDocument)(queryOptions.query) : queryOptions.query, query.variables || {}, _this.reducerConfig);
            }
            return null;
        }).filter(function (reducer) {
            return reducer !== null;
        });
    };
    QueryManager.prototype.fetchRequest = function (_a) {
        var _this = this;
        var requestId = _a.requestId,
            queryId = _a.queryId,
            document = _a.document,
            options = _a.options,
            fetchMoreForQueryId = _a.fetchMoreForQueryId;
        var variables = options.variables;
        var request = {
            query: document,
            variables: variables,
            operationName: (0, _getFromAST.getOperationName)(document)
        };
        var retPromise = new Promise(function (resolve, reject) {
            _this.addFetchQueryPromise(requestId, retPromise, resolve, reject);
            _this.deduplicator.query(request, _this.queryDeduplication).then(function (result) {
                var extraReducers = _this.getExtraReducers();
                if (requestId >= (_this.lastRequestId[queryId] || 1)) {
                    _this.store.dispatch({
                        type: 'APOLLO_QUERY_RESULT',
                        document: document,
                        variables: variables ? variables : {},
                        operationName: (0, _getFromAST.getOperationName)(document),
                        result: result,
                        queryId: queryId,
                        requestId: requestId,
                        fetchMoreForQueryId: fetchMoreForQueryId,
                        extraReducers: extraReducers
                    });
                }
                _this.removeFetchQueryPromise(requestId);
                if (result.errors) {
                    throw new _ApolloError.ApolloError({
                        graphQLErrors: result.errors
                    });
                }
                return result;
            }).then(function (result) {
                var resultFromStore;
                if (fetchMoreForQueryId) {
                    resultFromStore = result.data;
                } else {
                    try {
                        resultFromStore = (0, _readFromStore.readQueryFromStore)({
                            store: _this.getApolloState().data,
                            variables: variables,
                            query: document,
                            config: _this.reducerConfig,
                            fragmentMatcherFunction: _this.fragmentMatcher.match
                        });
                    } catch (e) {}
                }
                var reducerError = _this.getApolloState().reducerError;
                if (reducerError && reducerError.queryId === queryId) {
                    return Promise.reject(reducerError.error);
                }
                _this.removeFetchQueryPromise(requestId);
                resolve({ data: resultFromStore, loading: false, networkStatus: _networkStatus.NetworkStatus.ready, stale: false });
                return Promise.resolve();
            }).catch(function (error) {
                reject(error);
            });
        });
        return retPromise;
    };
    QueryManager.prototype.refetchQueryByName = function (queryName) {
        var _this = this;
        var refetchedQueries = this.queryIdsByName[queryName];
        if (refetchedQueries === undefined) {
            console.warn("Warning: unknown query with name " + queryName + " asked to refetch");
            return;
        } else {
            return Promise.all(refetchedQueries.map(function (queryId) {
                return _this.observableQueries[queryId].observableQuery.refetch();
            }));
        }
    };
    QueryManager.prototype.broadcastQueries = function () {
        var _this = this;
        var queries = this.getApolloState().queries;
        Object.keys(this.queryListeners).forEach(function (queryId) {
            var listeners = _this.queryListeners[queryId];
            if (listeners) {
                listeners.forEach(function (listener) {
                    if (listener) {
                        var queryStoreValue = queries[queryId];
                        listener(queryStoreValue);
                    }
                });
            }
        });
    };
    QueryManager.prototype.generateRequestId = function () {
        var requestId = this.idCounter;
        this.idCounter++;
        return requestId;
    };
    return QueryManager;
}();
exports.QueryManager = QueryManager;
//# sourceMappingURL=QueryManager.js.map