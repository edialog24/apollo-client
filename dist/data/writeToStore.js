'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.writeQueryToStore = writeQueryToStore;
exports.writeResultToStore = writeResultToStore;
exports.writeSelectionSetToStore = writeSelectionSetToStore;

var _getFromAST = require('../queries/getFromAST');

var _storeUtils = require('./storeUtils');

var _directives = require('../queries/directives');

var _environment = require('../util/environment');

var _assign = require('../util/assign');

var __extends = undefined && undefined.__extends || function () {
    var extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function (d, b) {
        d.__proto__ = b;
    } || function (d, b) {
        for (var p in b) {
            if (b.hasOwnProperty(p)) d[p] = b[p];
        }
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() {
            this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
}();
var __assign = undefined && undefined.__assign || Object.assign || function (t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) {
            if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
    }
    return t;
};

var WriteError = function (_super) {
    __extends(WriteError, _super);
    function WriteError() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.type = 'WriteError';
        return _this;
    }
    return WriteError;
}(Error);
function enhanceErrorWithDocument(error, document) {
    var enhancedError = new WriteError("Error writing result to store for query " + (document.loc && document.loc.source && document.loc.source.body));
    enhancedError.message += '/n' + error.message;
    enhancedError.stack = error.stack;
    return enhancedError;
}
function writeQueryToStore(_a) {
    var result = _a.result,
        query = _a.query,
        _b = _a.store,
        store = _b === void 0 ? {} : _b,
        variables = _a.variables,
        dataIdFromObject = _a.dataIdFromObject,
        _c = _a.fragmentMap,
        fragmentMap = _c === void 0 ? {} : _c,
        fragmentMatcherFunction = _a.fragmentMatcherFunction;
    var queryDefinition = (0, _getFromAST.getQueryDefinition)(query);
    variables = (0, _assign.assign)({}, (0, _getFromAST.getDefaultValues)(queryDefinition), variables);
    try {
        return writeSelectionSetToStore({
            dataId: 'ROOT_QUERY',
            result: result,
            selectionSet: queryDefinition.selectionSet,
            context: {
                store: store,
                processedData: {},
                variables: variables,
                dataIdFromObject: dataIdFromObject,
                fragmentMap: fragmentMap,
                fragmentMatcherFunction: fragmentMatcherFunction
            }
        });
    } catch (e) {
        throw enhanceErrorWithDocument(e, query);
    }
}
function writeResultToStore(_a) {
    var dataId = _a.dataId,
        result = _a.result,
        document = _a.document,
        _b = _a.store,
        store = _b === void 0 ? {} : _b,
        variables = _a.variables,
        dataIdFromObject = _a.dataIdFromObject,
        fragmentMatcherFunction = _a.fragmentMatcherFunction;
    var operationDefinition = (0, _getFromAST.getOperationDefinition)(document);
    var selectionSet = operationDefinition.selectionSet;
    var fragmentMap = (0, _getFromAST.createFragmentMap)((0, _getFromAST.getFragmentDefinitions)(document));
    variables = (0, _assign.assign)({}, (0, _getFromAST.getDefaultValues)(operationDefinition), variables);
    try {
        return writeSelectionSetToStore({
            result: result,
            dataId: dataId,
            selectionSet: selectionSet,
            context: {
                store: store,
                processedData: {},
                variables: variables,
                dataIdFromObject: dataIdFromObject,
                fragmentMap: fragmentMap,
                fragmentMatcherFunction: fragmentMatcherFunction
            }
        });
    } catch (e) {
        throw enhanceErrorWithDocument(e, document);
    }
}
function writeSelectionSetToStore(_a) {
    var result = _a.result,
        dataId = _a.dataId,
        selectionSet = _a.selectionSet,
        context = _a.context;
    var variables = context.variables,
        store = context.store,
        dataIdFromObject = context.dataIdFromObject,
        fragmentMap = context.fragmentMap;
    selectionSet.selections.forEach(function (selection) {
        var included = (0, _directives.shouldInclude)(selection, variables);
        if ((0, _storeUtils.isField)(selection)) {
            var resultFieldKey = (0, _storeUtils.resultKeyNameFromField)(selection);
            var value = result[resultFieldKey];
            if (included) {
                if (typeof value !== 'undefined') {
                    writeFieldToStore({
                        dataId: dataId,
                        value: value,
                        field: selection,
                        context: context
                    });
                } else {
                    if (context.fragmentMatcherFunction) {
                        if (!(0, _environment.isProduction)()) {
                            console.warn("Missing field " + resultFieldKey + " in " + JSON.stringify(result, null, 2).substring(0, 100));
                        }
                    }
                }
            }
        } else {
            var fragment = void 0;
            if ((0, _storeUtils.isInlineFragment)(selection)) {
                fragment = selection;
            } else {
                fragment = (fragmentMap || {})[selection.name.value];
                if (!fragment) {
                    throw new Error("No fragment named " + selection.name.value + ".");
                }
            }
            var matches = true;
            if (context.fragmentMatcherFunction && fragment.typeCondition) {
                var idValue = { type: 'id', id: 'self', generated: false };
                var fakeContext = {
                    store: { 'self': result },
                    returnPartialData: false,
                    hasMissingField: false,
                    customResolvers: {}
                };
                matches = context.fragmentMatcherFunction(idValue, fragment.typeCondition.name.value, fakeContext);
                if (fakeContext.returnPartialData) {
                    console.error('WARNING: heuristic fragment matching going on!');
                }
            }
            if (included && matches) {
                writeSelectionSetToStore({
                    result: result,
                    selectionSet: fragment.selectionSet,
                    dataId: dataId,
                    context: context
                });
            }
        }
    });
    return store;
}
function isGeneratedId(id) {
    return id[0] === '$';
}
function mergeWithGenerated(generatedKey, realKey, cache) {
    var generated = cache[generatedKey];
    var real = cache[realKey];
    Object.keys(generated).forEach(function (key) {
        var value = generated[key];
        var realValue = real[key];
        if ((0, _storeUtils.isIdValue)(value) && isGeneratedId(value.id) && (0, _storeUtils.isIdValue)(realValue)) {
            mergeWithGenerated(value.id, realValue.id, cache);
        }
        delete cache[generatedKey];
        cache[realKey] = __assign({}, generated, real);
    });
}
function isDataProcessed(dataId, field, processedData) {
    if (!processedData) {
        return false;
    }
    if (processedData[dataId]) {
        if (processedData[dataId].indexOf(field) >= 0) {
            return true;
        } else {
            processedData[dataId].push(field);
        }
    } else {
        processedData[dataId] = [field];
    }
    return false;
}
function writeFieldToStore(_a) {
    var field = _a.field,
        value = _a.value,
        dataId = _a.dataId,
        context = _a.context;
    var variables = context.variables,
        dataIdFromObject = context.dataIdFromObject,
        store = context.store,
        fragmentMap = context.fragmentMap;
    var storeValue;
    var storeFieldName = (0, _storeUtils.storeKeyNameFromField)(field, variables);
    var shouldMerge = false;
    var generatedKey = '';
    if (!field.selectionSet || value === null) {
        storeValue = value != null && (typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object' ? { type: 'json', json: value } : value;
    } else if (Array.isArray(value)) {
        var generatedId = dataId + "." + storeFieldName;
        storeValue = processArrayValue(value, generatedId, field.selectionSet, context);
    } else {
        var valueDataId = dataId + "." + storeFieldName;
        var generated = true;
        if (!isGeneratedId(valueDataId)) {
            valueDataId = '$' + valueDataId;
        }
        if (dataIdFromObject) {
            var semanticId = dataIdFromObject(value);
            if (semanticId && isGeneratedId(semanticId)) {
                throw new Error('IDs returned by dataIdFromObject cannot begin with the "$" character.');
            }
            if (semanticId) {
                valueDataId = semanticId;
                generated = false;
            }
        }
        if (!isDataProcessed(valueDataId, field, context.processedData)) {
            writeSelectionSetToStore({
                dataId: valueDataId,
                result: value,
                selectionSet: field.selectionSet,
                context: context
            });
        }
        storeValue = {
            type: 'id',
            id: valueDataId,
            generated: generated
        };
        if (store[dataId] && store[dataId][storeFieldName] !== storeValue) {
            var escapedId = store[dataId][storeFieldName];
            if ((0, _storeUtils.isIdValue)(storeValue) && storeValue.generated && (0, _storeUtils.isIdValue)(escapedId) && !escapedId.generated) {
                throw new Error("Store error: the application attempted to write an object with no provided id" + (" but the store already contains an id of " + escapedId.id + " for this object."));
            }
            if ((0, _storeUtils.isIdValue)(escapedId) && escapedId.generated) {
                generatedKey = escapedId.id;
                shouldMerge = true;
            }
        }
    }
    var newStoreObj = __assign({}, store[dataId], (_b = {}, _b[storeFieldName] = storeValue, _b));
    if (shouldMerge) {
        mergeWithGenerated(generatedKey, storeValue.id, store);
    }
    if (!store[dataId] || storeValue !== store[dataId][storeFieldName]) {
        store[dataId] = newStoreObj;
    }
    var _b;
}
function processArrayValue(value, generatedId, selectionSet, context) {
    return value.map(function (item, index) {
        if (item === null) {
            return null;
        }
        var itemDataId = generatedId + "." + index;
        if (Array.isArray(item)) {
            return processArrayValue(item, itemDataId, selectionSet, context);
        }
        var generated = true;
        if (context.dataIdFromObject) {
            var semanticId = context.dataIdFromObject(item);
            if (semanticId) {
                itemDataId = semanticId;
                generated = false;
            }
        }
        if (!isDataProcessed(itemDataId, selectionSet, context.processedData)) {
            writeSelectionSetToStore({
                dataId: itemDataId,
                result: item,
                selectionSet: selectionSet,
                context: context
            });
        }
        var idStoreValue = {
            type: 'id',
            id: itemDataId,
            generated: generated
        };
        return idStoreValue;
    });
}
//# sourceMappingURL=writeToStore.js.map