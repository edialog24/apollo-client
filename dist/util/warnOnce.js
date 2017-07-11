'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.warnOnceInDevelopment = warnOnceInDevelopment;

var _environment = require('./environment');

var haveWarned = Object.create({});
function warnOnceInDevelopment(msg, type) {
    if (type === void 0) {
        type = 'warn';
    }
    if ((0, _environment.isProduction)()) {
        return;
    }
    if (!haveWarned[msg]) {
        if (!(0, _environment.isTest)()) {
            haveWarned[msg] = true;
        }
        switch (type) {
            case 'error':
                console.error(msg);
                break;
            default:
                console.warn(msg);
        }
    }
}
//# sourceMappingURL=warnOnce.js.map