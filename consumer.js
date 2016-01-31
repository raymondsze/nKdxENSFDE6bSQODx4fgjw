'use strict';

const co = require('co');
const _ = require('lodash');
const XeConsumer = require('./worker/consumers/xe_consumer');

const connectToBeanstalkd = require('./server/beanstalkd');
const connectToMongoDB = require('./server/mongodb');
const config = require('./config');

co(function* () {
	yield connectToMongoDB(config.mongodb);
	const consumer = new XeConsumer(yield connectToBeanstalkd(config.beanstalkd), config.xe.tube);
	yield consumer.watch();
	consumer.consume(_.merge(
		{priority: config.xe.producer.priority, ttr: config.xe.producer.ttr},
		config.xe.consumer
	));
});
