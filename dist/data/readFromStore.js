'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.ID_KEY = undefined;
exports.readQueryFromStore = readQueryFromStore;
exports.diffQueryAgainstStore = diffQueryAgainstStore;
exports.assertIdValue = assertIdValue;

var _graphqlAnywhere = require('graphql-anywhere');

var _graphqlAnywhere2 = _interopRequireDefault(_graphqlAnywhere);

var _storeUtils = require('./storeUtils');

var _getFromAST = require('../queries/getFromAST');

var _isEqual = require('../util/isEqual');

var _assign = require('../util/assign');

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
var ID_KEY = exports.ID_KEY = typeof Symbol !== 'undefined' ? Symbol('id') : '@@id';
function readQueryFromStore(options) {
    var optsPatch = { returnPartialData: false };
    return diffQueryAgainstStore(__assign({}, options, optsPatch)).result;
}
var readStoreResolver = function readStoreResolver(fieldName, idValue, args, context, _a) {
    var resultKey = _a.resultKey,
        directives = _a.directives;
    assertIdValue(idValue);
    var objId = idValue.id;
    var obj = context.store[objId];
    var storeKeyName = (0, _storeUtils.getStoreKeyName)(fieldName, args, directives);
    var fieldValue = (obj || {})[storeKeyName];
    if (typeof fieldValue === 'undefined') {
        if (context.customResolvers && obj && (obj.__typename || objId === 'ROOT_QUERY')) {
            var typename = obj.__typename || 'Query';
            var type = context.customResolvers[typename];
            if (type) {
                var resolver = type[fieldName];
                if (resolver) {
                    return resolver(obj, args);
                }
            }
        }
        if (!context.returnPartialData) {
            throw new Error("Can't find field " + storeKeyName + " on object (" + objId + ") " + JSON.stringify(obj, null, 2) + ".");
        }
        context.hasMissingField = true;
        return fieldValue;
    }
    if ((0, _storeUtils.isJsonValue)(fieldValue)) {
        if (idValue.previousResult && (0, _isEqual.isEqual)(idValue.previousResult[resultKey], fieldValue.json)) {
            return idValue.previousResult[resultKey];
        }
        return fieldValue.json;
    }
    if (idValue.previousResult) {
        fieldValue = addPreviousResultToIdValues(fieldValue, idValue.previousResult[resultKey]);
    }
    return fieldValue;
};
function diffQueryAgainstStore(_a) {
    var store = _a.store,
        query = _a.query,
        variables = _a.variables,
        previousResult = _a.previousResult,
        _b = _a.returnPartialData,
        returnPartialData = _b === void 0 ? true : _b,
        _c = _a.rootId,
        rootId = _c === void 0 ? 'ROOT_QUERY' : _c,
        fragmentMatcherFunction = _a.fragmentMatcherFunction,
        config = _a.config;
    var queryDefinition = (0, _getFromAST.getQueryDefinition)(query);
    variables = (0, _assign.assign)({}, (0, _getFromAST.getDefaultValues)(queryDefinition), variables);
    var context = {
        store: store,
        returnPartialData: returnPartialData,
        customResolvers: config && config.customResolvers || {},
        hasMissingField: false
    };
    var rootIdValue = {
        type: 'id',
        id: rootId,
        previousResult: previousResult
    };
    var result = (0, _graphqlAnywhere2.default)(readStoreResolver, query, rootIdValue, context, variables, {
        fragmentMatcher: fragmentMatcherFunction,
        resultMapper: resultMapper
    });
    return {
        result: result,
        isMissing: context.hasMissingField
    };
}
function assertIdValue(idValue) {
    if (!(0, _storeUtils.isIdValue)(idValue)) {
        throw new Error("Encountered a sub-selection on the query, but the store doesn't have an object reference. This should never happen during normal use unless you have custom code that is directly manipulating the store; please file an issue.");
    }
}
function addPreviousResultToIdValues(value, previousResult) {
    if ((0, _storeUtils.isIdValue)(value)) {
        return __assign({}, value, { previousResult: previousResult });
    } else if (Array.isArray(value)) {
        var idToPreviousResult_1 = {};
        if (Array.isArray(previousResult)) {
            previousResult.forEach(function (item) {
                if (item && item[ID_KEY]) {
                    idToPreviousResult_1[item[ID_KEY]] = item;
                }
            });
        }
        return value.map(function (item, i) {
            var itemPreviousResult = previousResult && previousResult[i];
            if ((0, _storeUtils.isIdValue)(item)) {
                itemPreviousResult = idToPreviousResult_1[item.id] || itemPreviousResult;
            }
            return addPreviousResultToIdValues(item, itemPreviousResult);
        });
    }
    return value;
}
function resultMapper(resultFields, idValue) {
    if (idValue.previousResult) {
        var currentResultKeys_1 = Object.keys(resultFields);
        var sameAsPreviousResult = Object.keys(idValue.previousResult).reduce(function (sameKeys, key) {
            return sameKeys && currentResultKeys_1.indexOf(key) > -1;
        }, true) && currentResultKeys_1.reduce(function (same, key) {
            return same && areNestedArrayItemsStrictlyEqual(resultFields[key], idValue.previousResult[key]);
        }, true);
        if (sameAsPreviousResult) {
            return idValue.previousResult;
        }
    }
    Object.defineProperty(resultFields, ID_KEY, {
        enumerable: false,
        configurable: false,
        writable: false,
        value: idValue.id
    });
    return resultFields;
}
function areNestedArrayItemsStrictlyEqual(a, b) {
    if (a === b) {
        return true;
    }
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
        return false;
    }
    return a.reduce(function (same, item, i) {
        return same && areNestedArrayItemsStrictlyEqual(item, b[i]);
    }, true);
}
//# sourceMappingURL=readFromStore.js.map