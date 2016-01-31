'use strict';

const util = require('util');
const fivebeans = require('fivebeans');
const bluebird = require('bluebird');
const sigintBind = require('./sigint_bind');

/**
 * Connect to beanstakld server.
 * @return {Promise<object>} 		- promise to fivebeans client object, which is promisified by bluebird.
 */
function connectToBeanstalkd(config) {
	return new Promise((resolve, reject) => {
		const client = new fivebeans.client(config.host, config.port);
		// bind the connect, error, close event and try to connect to bluestakld server.
		client.on('connect', () => {
			console.log(util.format('Connected to beanstalkd server %s with port %s', config.host, config.port));
			resolve(bluebird.promisifyAll(client, {multiArgs: true}));
		}).on('error', (err) => {
			console.error(util.format('Unable to connect to beanstalkd server %s with port %s', config.host, config.port));
			reject(err);
		}).on('close', () => {
			console.log(util.format('beanstalkd server %s with port %s is closed.', config.host, config.port));
		}).connect();

		// disconnect when Ctrl-C
		sigintBind(() => {
			return new Promise((sigint_resolve, sigint_reject) => {
				client.quit(() => {
					console.log(util.format('beanstalkd server %s with port %s is closed.', config.host, config.port));
					sigint_resolve();
				});
			});
		});
	});
}

module.exports = connectToBeanstalkd;
