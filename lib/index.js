var dns = require('dns');
var net = require('net');
var config = require('agraddy.config');

var port;
var host;

var mod = function(to, from, subject, text, cb) {
	var built = false;
	var client;
	var index = 0;
	var commands = [];
	var quit = false;
	var error;

	if(host) {
		start();
	} else {
		dns.resolveMx(to.split('@').pop(), mxResults);
	}

	function mxResults(err, addresses) {
		if(addresses && addresses.length) {
			host = addresses[0].exchange;
		} else if(err) {
			dns.resolve(to.split('@').pop(), aResults);
		} else {
			cb(new Error('Host could not be determined from MX records.'));
		}
	}
	function aResults(err, addresses) {
		if(addresses && addresses.length) {
			host = addresses[0];
		} else if(err) {
			cb(new Error('Host could not be determined from MX or A records.'));
		} else {
			cb(new Error('Host could not be determined from A records.'));
		}
	}

	function start() {
		if(config.fqdn) {
			commands.push('HELO ' + config.fqdn + '\r\n');
		} else {
			throw new Error('The config.fqdn value has not been set.');
		}
		commands.push('MAIL FROM: <' + from + '>\r\n');
		commands.push('RCPT TO: <' + to + '>\r\n');
		commands.push('DATA\r\n');

		var mail = [];
		mail.push('From: ' + from + '\r\n');
		mail.push('To: ' + to + '\r\n');
		mail.push('Subject: ' + subject + '\r\n');
		mail.push('Date: ' + new Date().toUTCString().replace('GMT', '+0000') + '\r\n');
		mail.push('\r\n');
		mail.push(text + '\r\n');
		mail.push('.' + '\r\n');

		client = net.createConnection(port, host);

		client.on('data', function(data) {
			//console.log('CLIENT RECEIVED: ' + data.toString());
			if(index < commands.length) {
				//console.log(commands[index]);
				client.write(commands[index]);
			} else {
				if(quit) {
					// Do nothing if quit
				} else if(built) {
					if(data.toString()[0] == '5') {
						error = new Error(data.toString().split(/\r?\n/)[0]);
					}
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

mod.host = function(input) {
	host = input;
};

module.exports = mod;
