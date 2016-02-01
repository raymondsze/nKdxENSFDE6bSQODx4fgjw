'use strict';
const util = require('util');
const _ = require('lodash');
const co = require('co');
const XeScraper = require('./xe_scraper');
const XeProducer = require('../producers/xe_producer');
const ExchangeRate = require('../models/exchange_rate');

/**
 * Xe consumer, to reserve job from beanstakld tube.
 */
class XeConsumer {
	/**
	 * Xe consumer constrcutor.
	 * @param  {object} beanstakld_client 	- the beanstakld client object.
	 * @param  {string} tube_name 			- the tube name of tube where job being reserved.
	 * @constructor
	 */
	constructor(beanstakld_client, tube_name) {
		this.client = beanstakld_client;
		this.tube_name = tube_name;
		this.xe_producer = new XeProducer(beanstakld_client, tube_name);
	}

	/**
	 * Watch the tube
	 * @return {Promise<number>} 	- the promise to number of tube watched
	 */
	watch() {
		return co(function* () {
			console.log(util.format('Watch beanstalkd tube "%s"', this.tube_name));
			return this.client.watchAsync(this.tube_name);
		}.bind(this));
	}

	/**
	 * Reserve the job from beanstakld tube.
	 * @param  {object} options									- the options
	 * @param  {number} [options.priority = 0] 					- the priority of the job if re-put into tube.
	 * @param  {number} [options.ttr = 10] 						- the time to run in seconds of the job if re-put into tube.
	 * @param  {number} [options.success_delay = 60]   			- payload
	 * @param  {number} [options.failure_delay = 3]				- the unit of currency being convert.
	 * @param  {number} [options.success_trials = 10]			- the unit of currency to be converted.
	 * @param  {number} [options.tolerance = 2] 				- the count of success.
	 * @return {Promise} 								- the promise.
	 */
	consume(options) {
		const this_options = _.merge({
			success_delay: 60,
			failure_delay: 3,
			success_trials: 10,
			tolerance: 2,
			priority: 0,
			ttr: 10
		}, options);

		const consume = co.wrap(function* () {
			// reserve the job from the tube
			let data;
			try {
				data = yield this.client.reserveAsync();
				console.log(util.format('Reserved a job "%s" from beanstalkd tube "%s" with payload "%s"', data[0], this.tube_name, data[1]));
			} catch (error) {
				if (error.message === 'TIMED_OUT') {
					return;
				}
				consume();
			}
			const job_id = data[0];
			const payload = JSON.parse(data[1]);

			const this_payload = _.clone(payload);
			// get default success_count and failure_count
			this_payload.success_count = this_payload.success_count || 0;
			this_payload.failure_count = this_payload.failure_count || 0;
			// if success times lower than required
			if (this_payload.success_count < this_options.success_trials) {
				// start the scraper
				try {
					const scraper = new XeScraper(this_payload);
					console.log(util.format('Scrape exchange rate from xe.com with payload "%s"', JSON.stringify(this_payload)));
					const rate = yield scraper.scrape();
					yield ExchangeRate.create({
						from: this_payload.from,
						to: this_payload.to,
						rate: rate
					});
					if (++ this_payload.success_count < this_options.success_trials) {
						// reput the job into tube
						yield this.xe_producer.use();
						console.log(util.format('SUCCESS: "%s", FAILURE: "%s"', this_payload.success_count, this_payload.failure_count));
						console.log('Re-put (simulate release) job');
						// reput the job into tube again with success_count + 1
						yield this.xe_producer.produce(_.merge(
							{priority: this_options.priority, ttr: this_options.ttr},
							{payload: this_payload, delay: this_options.success_delay}
						));
					}
					// destroy the current job
					console.log(util.format('Destroy the job %s from beanstakld tube "%s"', job_id, this.tube_name));
					yield this.client.destroyAsync(job_id);
				} catch (error) {
					// if failure is under tolerance
					if (++ this_payload.failure_count <= this_options.tolerance) {
						// reput the job into tube
						yield this.xe_producer.use();
						console.log(util.format('SUCCESS: "%s", FAILURE: "%s"', this_payload.success_count, this_payload.failure_count));
						console.log('Re-put (simulate release) job');
						// reput the job into tube again with failure_count + 1
						yield this.xe_producer.produce(_.merge(
							{priority: this_options.priority, ttr: this_options.ttr},
							{payload: this_payload, delay: this_options.failure_delay}
						));
						// destroy the current job
						console.log(util.format('Destroy the job "%s" from beanstakld tube "%s"', job_id, this.tube_name));
						yield this.client.destroyAsync(job_id);
					} else {
						// bury the job if failure reach tolerance
						console.log(util.format('Bury the job "%s" from beanstakld tube "%s"', job_id, this.tube_name));
						yield this.client.buryAsync(job_id, 0);
					}
				}
			}
			consume();
		}.bind(this));
		return consume();
	}
}

module.exports = XeConsumer;
