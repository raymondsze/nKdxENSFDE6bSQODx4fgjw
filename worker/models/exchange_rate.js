'use strict';

const mongoose = require('mongoose');
// switch mPromise to bluebird promise.
mongoose.Promise = require('bluebird');

/**
 * The mongoose schema of exhcnage rate.
 * @type {object}
 */
const schema = new mongoose.Schema({
	from: {
		type: String
	},
	to: {
		type: String
	},
	rate: {
		type: String
	},
	// may be better use option timestamps, but it will also generate updatedAt.
	created_at: {
		type: Date,
		default: Date.now
	}
}, {
	// to remove generated __v from mongoose
	versionKey: false
});

module.exports = mongoose.model('exchange_rate', schema, 'exchange_rates');
