'use strict';

var path = require('path'),
	util = require('util'),
	fs = require('fs');

var _ = require('lodash'),
	request = require('request'),
	moment = require('moment');

var blesta = function(options){
	if(!this instanceof blesta){
		return new blesta(options);
	}

	this.options = _.defaults(options, {
		url: 'http://localhost:80',
		auth: {
			username: "admin",
			password: "password"
		}
	});

	// returns moment date
	this.parseDate = function(date){
		return moment(date)
	}

	// create format: YYYY-MM-DDThh:mm:ssZ / 2021-12-31T12:00:00Z
	this.createDate = function(date){
		if(date){
			date = moment();
		}else{
			date = moment(date);
		}
		return date.format("Y");
	}

	// default errors
	this.errors = {
		"blesta.bad_request": "The request cannot be fulfilled due to bad syntax.",
		"blesta.unauthorized": "The request cannot be fulfilled due to bad syntax.",
		"blesta.forbidden": "The requested resource is not accessible.",
		"blesta.not_found": "The requested resource does not exist.",
		"blesta.not_supported": "The format requested is not supported by the server.",
		"blesta.error": "An unexpected error occured.",
		"blesta.maintenance": "The requested resource is currently unavailable due to maintenance.",
		"blesta.not_handled": "The request response returned an unexpected code."
	};

	this.error = function(code, data){
		//Error.captureStackTrace(this, this.constructor);
		if(!this.errors[code]){
			throw new Error('Invalid error code `'+ code + '` provided.');
		}
		var error = new Error(this.errors[code]);
		error.name = 'blestaError';
		error.code = code;
		error.message = this.errors[code];
		error.data = data || {};
		return error;
	}

	this.request = function(method, url, body, callback){
		var self = this;
		if(body && !callback){
			callback = body;
			body = null;
		}
		method = String(method).toLowerCase();
		if(url.slice(0, 1) !== '/'){
			url = '/' + url;
		}
		var req = {
			url: util.format('%s/api%s.json', options.url, url),
			auth: options.auth,
			json: true,
			method: method
		};
		if(body && method === 'get'){
			req.qs = body;
		}else if(body){
			req.form = body;
		}

		return request(req, function(err, res, body){
			switch(res.statusCode){
				case 400:
					return callback(self.error('blesta.bad_request', body));
				break;
				case 401:
					return callback(self.error('blesta.unauthorized', body));
				break;
				case 403:
					return callback(self.error('blesta.forbidden', body));
				break;
				case 404:
					body.url = req.url;
					return callback(self.error('blesta.not_found', body));
				break;
				case 415:
					return callback(self.error('blesta.not_supported', body));
				break;
				case 500:
					return callback(self.error('blesta.error', body));
				break;
				case 503:
					return callback(self.error('blesta.maintenance', body));
				break;
				case 200:
					var response = body.response;
					if(response && response.settings){
						delete response.settings;
					}
					return callback(null, response, res);
				break;
				default:
					return callback(self.error('blesta.not_handled', body));
				break;
			}
		});
	};


	var self = this;
	_.each(fs.readdirSync(__dirname + '/api'), function(folder){
		var dir = __dirname + '/api/' + folder;
		_.each(fs.readdirSync(dir), function(file){
			self[path.basename(file, '.js')] = require(dir + '/' + file)(self);
		});
	});
}

module.exports = blesta;