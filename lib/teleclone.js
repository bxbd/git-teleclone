
var _ = require('lodash');
var urlparse = require("urlparse");

function Teleclone(repo) {

	var self = this;

	// if (!(this instanceof Teleclone)) { return new Teleclone(); }

	self.repo = repo;

	// var vantage = new Vantage();
	// vantage.use(setup_commands(this));
	// this.vantage = vantage;

	var config = new Teleclone.TelecloneConfig(this);
	this.config = config;

	this.teleclone = {};

	return this;
}

_.extend(Teleclone.prototype, {
	_safe_call: global.safe_call,

	log: debuglog,
	// function() {
	// 	console.log.apply(arguments);
	// },


	show: function(delimiter) {
		if( !delimiter ) {
			delimiter = this.current_branch + "@" + (this.target_name || 'localhost') + "$";
		}
		// this.vantage
        //     .delimiter(delimiter)
        //     .show();
	},
	output: function(msg) {
		// this.vantage.log.apply(this.vantage, arguments);
		for( var i = 0; i < arguments.length; i++ ) {
			var v = arguments[i];
			console.log(typeof(v) == "string" ? arguments[0] : util.inspect(arguments[0]));
			// this.vantage.log(
			// 	chalk.cyan(
			// 		typeof(v) == "string" ? arguments[0] : util.inspect(arguments[0])
			// 	)
			// );
		}
	},
	output_error: function(e) {
		// this.vantage.log.apply(this.vantage, arguments);
		for( var i = 0; i < arguments.length; i++ ) {
			var v = arguments[i];
			console.log(
			// this.vantage.log(
				chalk.red(
					typeof(v) == "string" ? arguments[0] : util.inspect(arguments[0])
				)
			);
		}
	},
	open: function(cb) {
		var _cb = cb;
		var self = this;
		var repo = this.repo;
		repo.getCurrentBranch().then(function(branch) {
			self.current_branch = branch.shorthand();
			_cb();
			// self._safe_call(self, _cb)
		});

	},
	targets: function() {
		var x = this.config.get_targets.apply(this.config, arguments);
		return x;
	},

	// config: function() {
	// 	return this.config
	// }
	//
	connect: function(cb, target) {
		if( !this.current_branch ) {
			console.log('Repo not opened yet'); //do i have to do this?
			return;
		}
		if( typeof(cb) == 'undefined' ) cb = function(){};

		var _cb = cb;
		var self = this;

		if( !target ) {
			var targets = self.config.get_targets();
			target = targets[ Object.keys(targets).shift() ]; //TODO, no.. use the one marked *default*
		}

	    return target.connect( function(tc) {
		    if( !tc ) {
				self.log('Error connecting to ' + target );
				return _cb ? _cb() : null;
			}

		    console.log('Telecloning local branch ' + self.current_branch + ' to ' + tc.target_name);
			self._safe_call(tc, tc.connect, { callback: function() {
				console.log('Connected to ' + self.target_name);
		        _cb();
		    }});
			return;
		});
	},

	_command: function() {
		var self = this;

		return function(args, cb) {
			var command_parts = this.commandObject._name.split(' ');
			var cmd = command_parts.shift();
			// self.vantage.log(chalk.yellow(
			console.log(chalk.yellow(
				cmd + ( command_parts.length > 0 ? '::' + Array(command_parts).join('.') : '' )
				// + ' ' + Array(args).join(' ')
			));
			console.log(args);
			try {
				commands[cmd].apply(self, [this, command_parts, args, cb]);
			}
			catch(e) {
				self.output_error(e.stack);
				cb();
			}
		};
	},
});

var commands = {
	target: function(session, cmd, args, cb) {
		var self = this;
		//if no args, list target config

		if( cmd.length > 0 ) {
			if( cmd[0] == 'add' ) {
				var tc_url, tc_name;
				if( args['url'] ) {
					tc_name = args['name|url'];
					tc_url = args['url'];
				}
				else {
		        	tc_url = args['name|url'];
				}

				var url = urlparse(tc_url);
				if( !url.scheme ) {
					self.log( 'Invalid target url: ' + tc_url );
					return cb();
				}

		        if( !tc_name ) {
		            tc_name = url.host;
		        }

		        self.config.add_target(tc_name, tc_url);
			}
			else if( cmd[0] == 'del' ) {
				var targets = self.config.get_targets();
				var dmw = args['name|url']; //dead man walking
				var _cb = cb;
				for( t in targets ) {
					if( t == dmw || targets[t] == dmw ) {
						return session.prompt({
							type: "confirm",
							name: 'ok',
							message: 'Delete target ' + t + '?',
							'default': false,
						}, function(result) {
							if( result.ok ) {
								self.config.del_target(t);
							}
							return _cb();
						});
					}
				}
				this.log( 'No targets found for "' + dmw + '"' );
				return _cb();
			}
		}
		else {
			var targets = self.config.get_targets();
			if( Object.keys(targets).length > 0 ) {
				for( t in targets ) {
					//TODO display (and store!) default target
					self.output(t + ' => ' + targets[t]);
				}
			}
			else {
				self.log('No targets, use target add');
			}
		}
		cb();
	},

};

exports = module.exports = Teleclone;
