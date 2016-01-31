'use strict';
const co = require('co');

let callbacks = [];

// disconnect when Ctrl-C
process.on('SIGINT', co.wrap(function* () {
	// trigger all registered callback
	yield callbacks;
	process.exit();
}));

/**
 * register callback which would be executed when Ctrl-C
 * @param  {Function} callback - callback being registered
 */
module.exports = function (callback) {
	callbacks.push(callback);
};
