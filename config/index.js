'use strict';

const util = require('util');
/**
 * development config, use localhost settings
 * @type {object}
 */
const config_development = {
	beanstalkd: {
		// beanstalkd host
		host: 'localhost',
		// beanstalkd port
		port: 11300
	},
	mongodb: {
		// mongodb host
		host: 'localhost',
		// mongodb port
		port: 27017,
		// mongodb database
		database: 'exchange_rates'
	},
	xe: {
		// tube name
		tube: 'raymondsze',
		producer: {
			// the priority to put the job
			priority: 0,
			// the delay in second to put the job
			delay: 0,
			// time to run in second
			ttr: 10,
			// the payload
			payload: {
				from: 'HKD',
				to: 'USD'
			}
		},
		consumer: {
			// after success, the delay in second to release the job (retry)
			success_delay: 5,
			// after fail, the delay in second to release the job (retry)
			failure_delay: 0,
			// total trials
			success_trials: 10,
			// the minimum number of failure. If exceeds, the job buried.
			tolerance: 2
		}
	}
};

/**
 * production config
 * @type {object}
 */
const config_production = {
	beanstalkd: {
		// beanstalkd host
		host: 'challenge.aftership.net',
		// beanstalkd port
		port: 11300
	},
	mongodb: {
		// mongodb host
		host: 'ds055565.mongolab.com',
		// mongodb port
		port: 55565,
		// username
		username: 'raymondsze',
		// password
		password: '12345',
		// mongodb database
		database: 'raymondsze'
	},
	xe: {
		// tube name
		tube: 'raymondsze',
		producer: {
			// the priority to put the job
			priority: 0,
			// the delay in second to put the job
			delay: 0,
			// time to run in second
			ttr: 20,
			// the payload
			payload: {
				from: 'HKD',
				to: 'USD'
			}
		},
		consumer: {
			// after success, the delay in second to release the job (retry)
			success_delay: 60,
			// after fail, the delay in second to release the job (retry)
			failure_delay: 3,
			// total trials
			success_trials: 10,
			// the minimum number of failure. If exceeds, the job buried.
			tolerance: 2
		}
	}
};

// export config by NODE_ENV
console.log(util.format('NODE_ENV: %s', process.env.NODE_ENV));
switch (process.env.NODE_ENV) {
	case 'production':
		module.exports = config_production;
		break;
	case 'development':
	default:
		module.exports = config_development;
		break;
}
