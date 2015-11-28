
// Definitions of interactive commands.
//   commands from shell will be written in terms of these

var _ = require('lodash');

var self = module.exports = {
	_dispatcher: function(req, res, next) {
		console.log('dispatch! ');
		var line = req.command.split(/\s+/);
		console.log( line.shift(), line );
		_.attempt( line.shift(), line );
		res.prompt();
	},

	login: function() {
		console.log('login', arguments);
		return 0;
	},

	create: function() {
		console.log('create');
		return 0;
	},
	delete: function() {
		console.log('delete');
		return 0;
	},
	update: function() {
		console.log('update', arguments);
		return 0;
	},
};
