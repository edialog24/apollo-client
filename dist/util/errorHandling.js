"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.tryFunctionOrLogError = tryFunctionOrLogError;
function tryFunctionOrLogError(f) {
    try {
        return f();
    } catch (e) {
        if (console.error) {
            console.error(e);
        }
    }
}
//# sourceMappingURL=errorHandling.js.map