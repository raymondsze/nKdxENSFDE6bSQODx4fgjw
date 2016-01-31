'use strict';

const util = require('util');
const co = require('co');
const _ = require('lodash');

/**
 * Xe producer, to put job into beanstakld tube.
 */
class XeProducer {
	/**
	 * Xe scrapper constrcutor.
	 * @param  {object} beanstakld_client 	- the beanstakld client object.
	 * @param  {string} tube_name 			- the tube name of tube where job being put.
	 * @constructor
	 */
	constructor(beanstakld_client, tube_name) {
		this.client = beanstakld_client;
		this.tube_name = tube_name;
	}

	/**
	 * Use the tube
	 * @return {Promise<string>} 	- the promise to the tube name
	 */
	use() {
		return co(function* () {
			console.log(util.format('Use beanstalkd tube "%s"', this.tube_name));
			return this.client.useAsync(this.tube_name);
		}.bind(this));
	}

	/**
	 * Put the job into beanstakld tube.
	 * @param  {object} options 								- the options
	 * @param  {object} options.payload   						- payload
	 * @param  {string} options.payload.from 					- the unit of currency being convert.
	 * @param  {string} options.payload.to 						- the unit of currency to be converted.
	 * @param  {string} [options.payload.success_count] 		- the count of success.
	 * @param  {string} [options.payload.failure_count] 		- the count of failure.
	 * @param  {number} [options.priority = 0]  				- job priority
	 * @param  {number} [options.delay = 0]     				- delay in seconds
	 * @param  {number} [options.ttr = 60] 						- time to run in seconds
	 * @return {Promise<string>} 								- the promise to the job id.
	 */
	produce(options) {
		return co(function* () {
			const producer_options = _.merge({
				priority: 0,
				delay: 0,
				ttr: 60
			}, options);
			console.log(util.format('Put job into beanstalkd tube "%s" with payload "%s" (priority: %s, delay: %s, ttr: %s)',
				this.tube_name, JSON.stringify(producer_options.payload), producer_options.priority, producer_options.delay, producer_options.ttr
			));
			return this.client.putAsync(producer_options.priority, producer_options.delay, producer_options.ttr, JSON.stringify(producer_options.payload));
		}.bind(this));
	}
}

module.exports = XeProducer;
