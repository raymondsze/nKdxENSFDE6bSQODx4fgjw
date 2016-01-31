'use strict';

const XeProducer = require('../../worker/producers/xe_producer');
const assert = require('assert');
const sinon = require('sinon');
const co = require('co');
const _ = require('lodash');

describe('XeProducer', () => {
	let config;
	let mock_beanstakld_client;

	before(() => {
		config = {
			tube: 'test',
			produce: {
				// the priority to put the job
				priority: 0,
				// the delay in second to put the job
				delay: 60,
				// time to run in second
				ttr: 10,
				// the payload
				payload: {
					from: 'HKD',
					to: 'USD'
				}
			}
		};
	});

	beforeEach(() => {
		mock_beanstakld_client = {
			useAsync: sinon.stub().returns(Promise.resolve()),
			putAsync: sinon.stub().returns(Promise.resolve())
		};
	});

	describe('#constructor()', () => {
		it('tube_name and client should set correctly after instantiation', () => {
			const xe_producer = new XeProducer(mock_beanstakld_client, config.tube);
			assert.equal(mock_beanstakld_client, xe_producer.client);
			assert.equal(config.tube, xe_producer.tube_name);
		});
	});

	describe('#use()', () => {
		it('should trigger beanstalkd use', co.wrap(function* () {
			const xe_producer = new XeProducer(mock_beanstakld_client, config.tube);
			yield xe_producer.use();
			assert(mock_beanstakld_client.useAsync.calledOnce);
		}));
	});

	describe('#produce()', () => {
		it('should trigger beanstalkd put job with correct payload, priority, delay and ttr', co.wrap(function* () {
			const xe_producer = new XeProducer(mock_beanstakld_client, config.tube);
			yield xe_producer.use();
			yield xe_producer.produce(config.produce);
			assert(mock_beanstakld_client.putAsync.calledOnce);
			const put_args = mock_beanstakld_client.putAsync.args[0];
			assert.equal(put_args[0], config.produce.priority);
			assert.equal(put_args[1], config.produce.delay);
			assert.equal(put_args[2], config.produce.ttr);
			assert(_.isEqual(JSON.parse(put_args[3]), config.produce.payload));
		}));
	});
});
