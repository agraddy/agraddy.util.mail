var dns = require('dns');
var net = require('net');
var qp = require('quoted-printable');
var config = require('agraddy.config');
var sign = require('agraddy.dkim.sign');
var sort = require('agraddy.util.array.sort.object');
var uuid = require('uuid');

var port = 25;
var host;
var test_host;

var mod = function(to, from, subject, text, html, options, cb) {
	if(typeof html == 'function') {
		cb = html;
	} else if(typeof options == 'function') {
		cb = options;
	}
    if(typeof html == 'object') {
        options = html;
    }

	if(!config.mail.send) {
		// If config.mail.send is not set, act like the mail is sent (used for dev servers)
		return cb();
	}

	var built = false;
	var client;
	var index = 0;
	var commands = [];
	var quit = false;
	var error;
	var message_id;
	var from_host = from.split('@').pop();
	var dkim_private_key_location;

	text = qp.encode(text);

	if(test_host) {
		host = test_host;
		start();
	} else {
		dns.resolveMx(to.split('@').pop(), mxResults);
	}

	function mxResults(err, addresses) {
		if(addresses && addresses.length) {
			addresses.sort(sort('priority'));
			host = addresses[0].exchange;
			start();
		} else if(err) {
			dns.resolve(to.split('@').pop(), aResults);
		} else {
			cb(new Error('Host could not be determined from MX records.'));
		}
	}
	function aResults(err, addresses) {
		if(addresses && addresses.length) {
			host = addresses[0];
			start();
		} else if(err) {
			cb(new Error('Host could not be determined from MX or A records.'));
		} else {
			cb(new Error('Host could not be determined from A records.'));
		}
	}

	function start() {
        var i;

		message_id = '<' + uuid.v4() + '@' + from_host + '>';
		if(config.mail.fqdn) {
			commands.push('HELO ' + config.mail.fqdn + '\r\n');
		} else {
			throw new Error('The config.mail.fqdn value has not been set.');
		}
		commands.push('MAIL FROM: <' + from + '>\r\n');
		commands.push('RCPT TO: <' + to + '>\r\n');
		commands.push('DATA\r\n');

        var headers = {};
        if(typeof options == 'object') {
            headers = Object.keys(options);
            delete headers['dkim'];
        }

		var mail = [];
		mail.push('From: ' + from + '\r\n');
		mail.push('To: ' + to + '\r\n');
		mail.push('Subject: ' + subject + '\r\n');
        for(i = 0; i < headers.length; i++) {
            mail.push(headers[i] + ': ' + options[headers[i]] + '\r\n');
        }
		mail.push('Date: ' + new Date().toUTCString().replace('GMT', '+0000') + '\r\n');
		mail.push('Message-Id: ' + message_id + '\r\n');
		mail.push('Content-Transfer-Encoding: quoted-printable' + '\r\n');
		mail.push('\r\n');
		mail.push(text + '\r\n');
		mail.push('.' + '\r\n');

		if(typeof options == 'object' && typeof options.dkim == 'object') {
			dkim_private_key_location = options.dkim.private_key_location;
			delete options.dkim.private_key_location;
			mail.unshift(sign(mail.join('').slice(0, -3), options.dkim, dkim_private_key_location));
		}

		client = net.createConnection(port, host);

		client.on('data', function(data) {
			//console.log('CLIENT RECEIVED: ' + data.toString());
			if(data.toString()[0] == '5') {
				error = new Error(data.toString().split(/\r?\n/)[0]);
				client.write('QUIT\r\n');
				quit = true;
			} else if(data.toString()[0] == '4') {
				error = new Error(data.toString().split(/\r?\n/)[0]);
				client.write('QUIT\r\n');
				quit = true;
			} else if(index < commands.length) {
				//console.log(commands[index]);
				client.write(commands[index]);
			} else {
				if(quit) {
					// Do nothing if quit
				} else if(built) {
					//console.log('QUIT\r\n');
					client.write('QUIT\r\n');
					quit = true;
				} else {
					for(i = 0; i < mail.length; i++) {
						client.write(mail[i]);
					}
					built = true;
				}
			}
			index++;
		});

		client.on('end', function(data) {
			cb(error);
		});
	}
};

mod.port = function(input) {
	port = input;
};

mod.testHost = function(input) {
	test_host = input;
};

mod.send = function(input) {
	config.mail.send = input;
};

module.exports = mod;
