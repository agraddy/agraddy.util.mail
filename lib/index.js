var net = require('net');
var config = require('agraddy.config');

var port;

var mod = function(to, from, subject, text, cb) {
	var built = false;
	var client = net.createConnection(port);
	var index = 0;
	var commands = [];
	var quit = false;
	var err;
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
					err = new Error(data.toString().split(/\r?\n/)[0]);
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
		cb(err);
	});
};

mod.port = function(input) {
	port = input;
};

module.exports = mod;
