'use strict';

const co = require('co');
const config = require('./config');
const XeProducer = require('./worker/producers/xe_producer');
const connectToBeanstalkd = require('./server/beanstalkd');

co(function* () {
	const producer = new XeProducer(yield connectToBeanstalkd(config.beanstalkd), config.xe.tube);
	yield producer.use();
	yield producer.produce(config.xe.producer);
	yield producer.client.quitAsync();
});
