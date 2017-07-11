'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.isQueryResultAction = isQueryResultAction;
exports.isQueryErrorAction = isQueryErrorAction;
exports.isQueryInitAction = isQueryInitAction;
exports.isQueryResultClientAction = isQueryResultClientAction;
exports.isQueryStopAction = isQueryStopAction;
exports.isMutationInitAction = isMutationInitAction;
exports.isMutationResultAction = isMutationResultAction;
exports.isMutationErrorAction = isMutationErrorAction;
exports.isUpdateQueryResultAction = isUpdateQueryResultAction;
exports.isStoreResetAction = isStoreResetAction;
exports.isSubscriptionResultAction = isSubscriptionResultAction;
exports.isWriteAction = isWriteAction;
function isQueryResultAction(action) {
    return action.type === 'APOLLO_QUERY_RESULT';
}
function isQueryErrorAction(action) {
    return action.type === 'APOLLO_QUERY_ERROR';
}
function isQueryInitAction(action) {
    return action.type === 'APOLLO_QUERY_INIT';
}
function isQueryResultClientAction(action) {
    return action.type === 'APOLLO_QUERY_RESULT_CLIENT';
}
function isQueryStopAction(action) {
    return action.type === 'APOLLO_QUERY_STOP';
}
function isMutationInitAction(action) {
    return action.type === 'APOLLO_MUTATION_INIT';
}
function isMutationResultAction(action) {
    return action.type === 'APOLLO_MUTATION_RESULT';
}
function isMutationErrorAction(action) {
    return action.type === 'APOLLO_MUTATION_ERROR';
}
function isUpdateQueryResultAction(action) {
    return action.type === 'APOLLO_UPDATE_QUERY_RESULT';
}
function isStoreResetAction(action) {
    return action.type === 'APOLLO_STORE_RESET';
}
function isSubscriptionResultAction(action) {
    return action.type === 'APOLLO_SUBSCRIPTION_RESULT';
}
function isWriteAction(action) {
    return action.type === 'APOLLO_WRITE';
}
//# sourceMappingURL=actions.js.map