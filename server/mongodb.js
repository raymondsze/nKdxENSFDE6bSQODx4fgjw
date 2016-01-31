'use strict';

const util = require('util');
const mongoose = require('mongoose');
const bluebird = require('bluebird');
const sigintBind = require('./sigint_bind');

// switch mPromise to bluebird promise.
mongoose.Promise = bluebird;

/**
 * Connect to mongodb.
 * @return {Promise<object>} 	- promise to mongoose object. No promisify needed because mongoose already support switch promise library.
 */
function connectToMongoDB(config) {
	return new Promise((resolve, reject) => {
		// construct the mongodb path from config
		const mongodb_path = config.username ?
			'mongodb://' + config.username + ':' + config.password + '@' + config.host + ':' + config.port + '/' + config.database :
			'mongodb://' + config.host + ':' + config.port + '/' + config.database;
		console.log(mongodb_path);
		mongoose.connect(mongodb_path, error => {
			if (error) {
				reject(error);
			}
			resolve(mongoose);
		});

		// bind connected event and log
		mongoose.connection.on('connected', () => {
			console.log(util.format('Connected to mongodb %s with port %s.', config.host, config.port));
		});

		// bind error event and log
		mongoose.connection.on('error', (error) => {
			console.log(util.format('Error encoutered in mongodb %s with port %s.', config.host, config.port));
			console.log(error);
		});

		// bind disconnected event and log
		mongoose.connection.on('disconnected', () => {
			console.log(util.format('mongodb %s with port %s is closed.', config.host, config.port));
		});

		// disconnect when Ctrl-C
		sigintBind(() => {
			return new Promise((sigint_resolve, sigint_reject) => {
				mongoose.disconnect(() => {
					console.log(util.format('mongodb %s with port %s is closed.', config.host, config.port));
					sigint_resolve();
				});
			});
		});
	});
}

module.exports = connectToMongoDB;
