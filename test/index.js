var tap = require('agraddy.test.tap')(__filename);
var fs = require('fs');
var path = require('path');
var stream = require('stream');

process.chdir('test');

var smtp = require('agraddy.smtp.server');
var mod = require('../');

var date;

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
			fs.readFile(path.join('fixtures', 'accept.eml'), function(err, data) {
				data = data.toString().replace(/\r?\n/g, '\r\n');
				data = data.replace('{{date}}', date);
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
	}
});

//server.listen(0, '127.0.0.1');

server.listen(function() {
	port = server.address().port;

	mod.port(port);

	accept();
});

function accept() {
	// Create date sent at the same time that email is sent
	date =  new Date().toUTCString().replace('GMT', '+0000');
	// Eventually need to add an html argument after the text argument
	mod('accept@example.com', 'from@example.com', 'Test Subject', 'Test Message', function(err) {
		tap.assert.equal(err, null, 'Should be equal.');
		reject();
	});
}

function reject() {
	mod('reject@example.com', 'from@example.com', 'Test Subject', 'Test Message', function(err) {
		tap.assert.equal(err.message, '550 Message rejected.', 'The email should be rejected. The error message should be the response returned by the server.');
		end();
	});
}

function end() {
	process.exit();
}



