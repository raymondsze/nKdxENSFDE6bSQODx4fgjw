'use strict';

const XeScraper = require('../../worker/consumers/xe_scraper');
const assert = require('assert');
const nock = require('nock');
const fs = require('fs');

describe('XeScraper', () => {
	before(() => {
		// interrupt request to simulate http://www.xe.com/currencyconverter/convert, to prevent network issue make the test case failure.
		nock('http://www.xe.com')
			.get('/currencyconverter/convert')
			.query({From: 'HKD', To: 'USD', Amount: 1})
			.reply(200, fs.readFileSync('test/resources/xe_hkd_to_usd.html', {encoding: 'utf-8'}));

		// interrupt request to simulate currency unit format not match
		// i.e USD to HKD but return a page with HKD to USD
		nock('http://www.xe.com')
			.get('/currencyconverter/convert')
			.query({From: 'USD', To: 'HKD', Amount: 1})
			.reply(200, fs.readFileSync('test/resources/xe_hkd_to_usd.html', {encoding: 'utf-8'}));

		// interrupt request to simulate invalid DOM structure
		// i.e HKD to EUR but both leftCol and rightCol not exists.
		nock('http://www.xe.com')
			.get('/currencyconverter/convert')
			.query({From: 'HKD', To: 'EUR', Amount: 1})
			.reply(200, fs.readFileSync('test/resources/xe_invalid.html', {encoding: 'utf-8'}));

		// interrupt request to simulate invalid DOM structure
		// i.e HKD to EUR but both leftCol and rightCol not exists.
		nock('http://www.xe.com')
			.get('/currencyconverter/convert')
			.query({From: 'USD', To: 'EUR', Amount: 1})
			.reply(201, '');
	});

	describe('#scrape()', () => {
		it('exchange rate from HKD to USD should equal to 0.13', () => {
			const xe_scraper = new XeScraper({from: 'HKD', to: 'USD'});
			return xe_scraper.scrape().then(rate => {
				assert.equal('0.13', rate);
			}).catch(err => {
				throw err;
			});
		});
		it('error should be thrown if the unit does not mtach with payload', () => {
			const xe_scraper = new XeScraper({from: 'USD', to: 'HKD'});
			return xe_scraper.scrape().then(rate => {
				throw Error('should not able to get the exchange rate due to unit format not match.');
			}).catch(err => {
				assert.equal(err instanceof xe_scraper.Error.UnitFormatNotMatch, true);
			});
		});
		it('error should be thrown if DOM structure is not same as expected.', () => {
			const xe_scraper = new XeScraper({from: 'HKD', to: 'EUR'});
			return xe_scraper.scrape().then(rate => {
				throw Error('should not able to get the exchange rate due to DOM structure is not same as expected.');
			}).catch(err => {
				assert.equal(err instanceof xe_scraper.Error.UnitFormatNotMatch, true);
			});
		});
		it('error should be thrown if response status code other than 200.', () => {
			const xe_scraper = new XeScraper({from: 'USD', to: 'EUR'});
			return xe_scraper.scrape().then(rate => {
				throw Error('should not able to get the exchange rate due to status code not equal to 200.');
			}).catch(err => {
				assert.equal(err instanceof xe_scraper.Error.UnexpectedStatusCode, true);
			});
		});
	});
});
