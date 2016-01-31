'use strict';
const mockgoose = require('mockgoose');
const mongoose = require('mongoose');
mockgoose(mongoose);
const co = require('co');
const _ = require('lodash');
const sinon = require('sinon');
const assert = require('assert');
const XeConsumer = require('../../worker/consumers/xe_consumer');
const XeScraper = require('../../worker/consumers/xe_scraper');
const XeProducer = require('../../worker/producers/xe_producer');
const ExchangeRate = require('../../worker/models/exchange_rate');

describe('XeConsumer', function () {
	this.timeout(10000);
	let config;
	let mock_beanstakld_client;
	let mock_scrape;
	let mock_xe_producer_use;
	let mock_xe_producer_produce;

	const mockBeanstalkdClient = (reserve_data) => {
		const reserve_return = reserve_data instanceof Error ? Promise.reject(reserve_data) : Promise.resolve(reserve_data);
		const reserveAsync = sinon.stub();
		reserveAsync.onFirstCall().returns(reserve_return);
		reserveAsync.onSecondCall().returns(Promise.reject(Error('error')));
		reserveAsync.returns(Promise.reject(Error('TIMED_OUT')));
		mock_beanstakld_client = {
			watchAsync: sinon.stub().returns(Promise.resolve([])),
			destroyAsync: sinon.stub().returns(Promise.resolve([])),
			reserveAsync: reserveAsync,
			buryAsync: sinon.stub().returns(Promise.resolve([]))
		};
	};

	const mockScrape = (exchange_rate) => {
		const exchange_rate_return = exchange_rate instanceof Error ? Promise.reject(exchange_rate) : Promise.resolve(exchange_rate);
		mock_scrape = sinon.stub(XeScraper.prototype, 'scrape', () => exchange_rate_return);
	};

	const mockXeProducer = () => {
		mock_xe_producer_use = sinon.stub(XeProducer.prototype, 'use', () => Promise.resolve());
		mock_xe_producer_produce = sinon.stub(XeProducer.prototype, 'produce', () => Promise.resolve());
	};

	before((done) => {
		config = {
			// tube name
			tube: 'raymondsze',
			consume: {
				// the priority to put the job
				priority: 0,
				// time to run in second
				ttr: 10,
				// after success, the delay in second to release the job (retry)
				success_delay: 0,
				// after fail, the delay in second to release the job (retry)
				failure_delay: 0,
				// total trials
				success_trials: 10,
				// the minimum number of failure. If exceeds, the job buried.
				tolerance: 2
			}
		};
		mongoose.connect('mongodb://localhost/test', (err) => {
			console.log('connected');
			done(err);
		});
	});

	beforeEach((done) => {
		mockgoose.reset((err) => {
			done(err);
		});
	});

	afterEach(() => {
		mock_scrape && mock_scrape.restore();
		mock_xe_producer_use && mock_xe_producer_use.restore();
		mock_xe_producer_produce && mock_xe_producer_produce.restore();
	});

	after(() => {
		mongoose.disconnect();
	});

	describe('#constructor()', () => {
		it('tube_name and client should set correctly after instantiation', () => {
			mockBeanstalkdClient();
			const xe_consumer = new XeConsumer(mock_beanstakld_client, config.tube);
			assert.equal(mock_beanstakld_client, xe_consumer.client);
			assert.equal(config.tube, xe_consumer.tube_name);
		});
	});

	describe('#watch()', () => {
		it('should trigger beanstalkd watch', co.wrap(function* () {
			mockBeanstalkdClient();
			const xe_consumer = new XeConsumer(mock_beanstakld_client, config.tube);
			yield xe_consumer.watch();
			assert(mock_beanstakld_client.watchAsync.calledOnce);
			assert(mock_beanstakld_client.watchAsync.calledWith(config.tube));
		}));
	});

	describe('#consume()', () => {
		const default_payload = {
			from: 'HKD',
			to: 'USD'
		};

		it('reput job with success_count + 1 if scrape successfully', co.wrap(function* () {
			mockBeanstalkdClient(['0', JSON.stringify(default_payload)]);
			mockScrape('0.13');
			mockXeProducer();
			yield new XeConsumer(mock_beanstakld_client, config.tube).consume(config.consume);
			assert(mock_beanstakld_client.reserveAsync.called);
			assert(mock_xe_producer_use.calledOnce);
			assert(mock_xe_producer_produce.calledOnce);
			const produce_options = mock_xe_producer_produce.args[0][0];
			assert(_.isEqual(produce_options, {
				priority: config.consume.priority,
				ttr: config.consume.ttr,
				payload: {
					from: default_payload.from, to: default_payload.to, success_count: 1, failure_count: 0
				},
				delay: config.consume.success_delay
			}));
		}));

		it('save one exchange_rate to mongodb if scrape successfully', co.wrap(function* () {
			mockBeanstalkdClient(['0', JSON.stringify(default_payload)]);
			mockScrape('0.13');
			mockXeProducer();
			yield new XeConsumer(mock_beanstakld_client, config.tube).consume(config.consume);
			const count = yield ExchangeRate.count();
			assert.equal(count, 1);
		}));

		it('should not scrape and put job if success_count >= success_trials', co.wrap(function* () {
			const payload = _.merge({
				success_count: config.consume.success_trials
			}, default_payload);
			mockBeanstalkdClient(['0', JSON.stringify(payload)]);
			mockScrape('0.13');
			mockXeProducer();
			yield new XeConsumer(mock_beanstakld_client, config.tube).consume(config.consume);
			assert(!mock_scrape.called);
			assert(!mock_xe_producer_use.called);
			assert(!mock_xe_producer_produce.called);
		}));

		it('do not reput job if scrape successfully when payload success_count = success_trials - 1', co.wrap(function* () {
			const payload = _.merge({
				success_count: config.consume.success_trials - 1
			}, default_payload);
			mockBeanstalkdClient(['0', JSON.stringify(payload)]);
			mockScrape('0.13');
			mockXeProducer();
			yield new XeConsumer(mock_beanstakld_client, config.tube).consume(config.consume);
			assert(mock_scrape.calledOnce);
			assert(!mock_xe_producer_use.called);
			assert(!mock_xe_producer_produce.called);
		}));

		it('reput job with failure_count + 1 if scrape with error', co.wrap(function* () {
			mockBeanstalkdClient(['0', JSON.stringify(default_payload)]);
			mockScrape(Error('error'));
			mockXeProducer();
			yield new XeConsumer(mock_beanstakld_client, config.tube).consume(config.consume);
			assert(mock_beanstakld_client.reserveAsync.called);
			assert(mock_xe_producer_use.calledOnce);
			assert(mock_xe_producer_produce.calledOnce);
			const produce_options = mock_xe_producer_produce.args[0][0];
			assert(_.isEqual(produce_options, {
				priority: config.consume.priority,
				ttr: config.consume.ttr,
				payload: {
					from: default_payload.from, to: default_payload.to, success_count: 0, failure_count: 1
				},
				delay: config.consume.success_delay
			}));
		}));

		it('bury job if scrape with error when payload failure_count = tolerance', co.wrap(function* () {
			const payload = _.merge({
				failure_count: config.consume.tolerance
			}, default_payload);
			mockBeanstalkdClient(['0', JSON.stringify(payload)]);
			mockScrape(Error('error'));
			mockXeProducer();
			yield new XeConsumer(mock_beanstakld_client, config.tube).consume(config.consume);
			assert(mock_beanstakld_client.buryAsync.calledOnce);
			assert(mock_beanstakld_client.buryAsync.calledWith('0'));
		}));

		it('do not reput job if scrape with error when payload failure_count = tolerance', co.wrap(function* () {
			const payload = _.merge({
				failure_count: config.consume.tolerance
			}, default_payload);
			mockBeanstalkdClient(['0', JSON.stringify(payload)]);
			mockScrape(Error('error'));
			mockXeProducer();
			yield new XeConsumer(mock_beanstakld_client, config.tube).consume(config.consume);
			assert(mock_beanstakld_client.buryAsync.calledOnce);
			assert(mock_beanstakld_client.buryAsync.calledWith('0'));
			assert(mock_scrape.calledOnce);
			assert(!mock_xe_producer_use.called);
			assert(!mock_xe_producer_produce.called);
		}));
	});
});
