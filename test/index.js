var path = require('path');
process.chdir(path.dirname(__filename));
var tap = require('agraddy.test.tap')(__filename);
var fs = require('fs');
var path = require('path');
var stream = require('stream');

var smtp = require('agraddy.smtp.server');
var mod = require('../');
var config = require('agraddy.config');

var date;
var message_id;

var server = smtp.createServer(function(req, res) {
	var writable = new stream.Writable();
	var content = '';
	writable._write = function(chunk, encoding, callback) {
		content += chunk.toString();
		callback();
	}

	if(req.to == 'accept@example.com') {
		tap.assert.equal(req.from, 'from@example.com', 'The from field should be set.');

		req.pipe(writable).on('finish', function() {
			message_id = content.match(/Message-Id: (.*)\r\n/)[1];
			fs.readFile(path.join('fixtures', 'accept.eml'), function(err, data) {
				data = data.toString().replace(/\r?\n/g, '\r\n');
				data = data.replace('{{date}}', date);
				data = data.replace('{{message_id}}', message_id);
				// May fail from time to time if the date is a second off
				// Consider moving date generation to when the email is sent
				tap.assert.equal(content, data, 'The content of the email should be sent.');
				res.accept();
			});

		});
	} else if(req.to == 'reject@example.com') {
		// Just a simple test to make sure the request is received
		tap.assert.equal(req.from, 'from@example.com', 'The from field should be set.');

		res.reject();
	} else if(req.to == 'never@example.com') {
		console.log('THIS CODE SHOULD NEVER BE REACHED if config.mail.send = false');
	} else if(req.to == 'dkim@example.com') {
		req.pipe(writable).on('finish', function() {
			//console.log(content);
			//console.log(req.rawHeaders);
			tap.assert.equal(req.rawHeaders[0], 'DKIM-Signature', 'The DKIM-Signature header should be set.');
			res.accept();

		});
	}
});

//server.listen(0, '127.0.0.1');

server.listen(function() {
	port = server.address().port;

	mod.port(port);
	mod.testHost('localhost');

	accept();
});

// Must set config.mail.fqdn
// Must set config.mail.send

function accept() {
	// Create date sent at the same time that email is sent
	date =  new Date().toUTCString().replace('GMT', '+0000');
	// Eventually need to add an html argument after the text argument
	mod('accept@example.com', 'from@example.com', 'Test Subject', 'This is a test message that is long enough that the content should wrap to the next line.', function(err) {
		tap.assert.equal(err, null, 'Should be equal.');
		dkim();
	});
}

function dkim() {
	// Create date sent at the same time that email is sent
	date =  new Date().toUTCString().replace('GMT', '+0000');
	// Eventually need to add an html argument after the text argument
	mod('dkim@example.com', 'from@example.com', 'Test Subject', 'This is a test message that is long enough that the content should wrap to the next line.', '', {private_key_location: './fixtures/private_key.pem', d: 'example.com', s: 'alpha', h: ['From']}, function(err) {
		tap.assert.equal(err, null, 'Should be equal.');
		reject();
	});
}

function reject() {
	mod('reject@example.com', 'from@example.com', 'Test Subject', 'Test Message', function(err) {
		tap.assert.equal(err.message, '550 Message rejected.', 'The email should be rejected. The error message should be the response returned by the server.');
		noAccount();
	});
}

function noAccount() {
	//console.log('noAccount');
	mod('no_account@example.com', 'from@example.com', 'Test Subject', 'Test Message', function(err) {
		tap.assert.equal(err.message, '550 Unknown recipient', 'The email should be rejected. The error message should be the response returned by the server.');
		turnedOff();
	});
}

function turnedOff() {
	mod.send(false);
	// Eventually need to add an html argument after the text argument
	mod('never@example.com', 'from@example.com', 'Test Subject', 'This is a test message that should never be sent but should look like it was sent because config.mail.send = false.', function(err) {
		tap.assert.equal(err, null, 'Should be equal.');
		end();
	});
}


function end() {
	process.exit();
}



