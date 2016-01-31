'use strict';

const util = require('util');
const _ = require('lodash');
const co = require('co');
const request = require('co-request');
const cheerio = require('cheerio');
const CustomError = require('es6-error');

const XeCurrencyConvertorURL = 'http://www.xe.com/currencyconverter/convert';

/**
 * This function is declared here to make it private.
 * Get the amount rounded to 2 decimal places from the text grabed from xe, with unit defined.
 * If the whole text not match or the unit specified does not match, null is returned.
 * @param  {string} text - this text should follow pattern <amount> <unit>, example: 0.128341 USD.
 * @param  {string} unit - the currency unit, example: USD.
 * @return {number}      - the amount.
 * @private
 */
function getCurrency(text, unit) {
	// The regular expression, example: 0.128 USD
	const reg_exp = /([0-9]\.[0-9]+)\s([A-Z]+)/;
	const matches = text.match(reg_exp);
	// check whether matched and the unit match
	if (matches && matches[2] === unit) {
		// round off to 2 decimal places, do not use toFixed(2) here because of parseFloat('0.135').toFixed(2) will get result 0.13 instead of 0.14
		return parseFloat(Math.round(matches[1] * 100) / 100, 2);
	}
	return null;
}

/**
 * Custom error type for unexpected status code.
 */
class UnexpectedStatusCode extends CustomError {
}

/**
 * Custom error type for unit format not match.
 */
class UnitFormatNotMatch extends CustomError {
}

/**
 * Xe scrapper, it contain a scrape function which could be used to scrape the currency rate
 */
class XeScraper {
	/**
	 * Xe scrapper constrcutor
	 * @param  {object} [payload] 					- the payload.
	 * @param  {string} [payload.from = 'HKD']	 	- the unit of currency being convert.
	 * @param  {string} [payload.to = 'USD']		- the unit of currency to be converted.
	 * @constructor
	 */
	constructor(payload) {
		const this_payload = _.merge({
			from: 'HKD',
			to: 'USD'
		}, payload);
		this.from = this_payload.from;
		this.to = this_payload.to;
		this.URL = XeCurrencyConvertorURL;
		this.Error = {
			UnexpectedStatusCode: UnexpectedStatusCode,
			UnitFormatNotMatch: UnitFormatNotMatch
		};
	}
	/**
	 * Scrape the exchange rate from xe.com.
	 * @return {Promise<number>} - the promise to the exchange rate.
	 */
	scrape() {
		return co(function* () {
			const response = yield request({
				url: this.URL,
				qs: {
					From: this.from,
					To: this.to,
					Amount: 1
				}
			});
			// the status code is expected 200.
			if (response.statusCode !== 200) {
				throw new this.Error.UnexpectedStatusCode(util.format('%s responded unexpected status code: %s.', this.URL, response.statusCode));
			}
			// grab the currency from the dom structure...
			const $ = cheerio.load(response.body);
			const left = getCurrency($('tr.uccRes>td.leftCol').text(), this.from);
			const right = getCurrency($('tr.uccRes>td.rightCol').text(), this.to);
			let rate;
			// get the exchange rate if all is well
			if (left !== null && right !== null) {
				console.log(util.format('Exchange rate from "%s" to "%s": %s', this.from, this.to, right / left));
				rate = String(right / left);
			} else {
				throw new this.Error.UnitFormatNotMatch('Unable to retreive the exhcange rate due to currency format not match.');
			}
			return rate;
		}.bind(this));
	}
}

module.exports = XeScraper;
