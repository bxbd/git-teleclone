
var TelecloneConfig = require('./teleclone-config');
var TelecloneTarget = require('./teleclone-target');
// var Gaze = require('gaze').Gaze;
global._ = require('lodash');
global.chalk = require('chalk');


// var filesize = require('filesize');
// var fmt_filesize = function(size) { return filesize(size).replace(' ', ''); }


var Vantage = require('vantage');
// var commons = require("./vantage-commons");
var urlparse = require("urlparse");
var repl = require("vorpal-repl");

global.safe_call = function(self, c, args) {
	if( !Array.isArray(args) ) args = [args];
	try {
		c.apply(self, args);
	}
	catch(e) {
		console.log(e.stack);
	}
}


function Teleclone(repo) {

	var self = this;

	if (!(this instanceof Teleclone)) { return new Teleclone(); }

	self.repo = repo;

	var vantage = new Vantage();
	vantage.use(setup_commands(this));
	this.vantage = vantage;

	var config = new TelecloneConfig(this);
	this.config = config;

	this.teleclone = {};

	return this;
}

function command_handler(cmd, args, cb){
    console.log('cmd: ' + cmd + '!');
    console.log('-----------');
    console.log(arguments);
    console.log('-----------');
    console.log(cb);
    console.log('-----------');

    return cb();
}

function setup_commands(tc) {
    //add a note in the help thet [target] can mean by name or by url
	return function(program) {

		//Command defaults
		function _define_cmd(cmd, desc) {
			var c = program.command(cmd);
			c.action(tc._command());
		 	c.description(desc);

			//just use this func for defaults
			// if( opts && opts.length > 0 ) {
			// 	for(var o = 0; o < opts.length; o++) {
			// 		c.option(opts[o]);
			// 	}
			// }

			return c;
		}

	    // program.command('target [name]').description('List and manage your targets')
	    //     .action(tc._command('target'))
	    //         .option('-a, --add <name> <url>', 'Add a target') //this is going to reverse the args in the handler
	    //         .option(    '--del <target>', 'Delete a target')
	    //         .option('-m, --make-default <target>', 'Make a target your default')
	    //         .option('-t, --test <target>', 'Test a target\'s connection')
	    //         .option('-c, --connect <target>', 'Connect to a target (shortcut for connect <name>)' )

		_define_cmd('target', 'List targets')

		_define_cmd('target add <name|url> [url]', 'Add a target');
		_define_cmd('target del <name|url>', 'Delete a target')
			.alias('target delete');

	            // .option('-m, --make-default <target>', 'Make a target your default')
	            // .option('-t, --test <target>', 'Test a target\'s connection')
	            // .option('-c, --connect <target>', 'Connect to a target (shortcut for connect <name>)' )

	    program.command('connect [target]').description('Initiate connection to a target')
	        .action(tc._command('connect'))
	            .option('-t, --test <target>', 'Test a target\'s connection')

	    program.command('watch [target]', 'Starts the loop to monitor files and *handle* them, optionally specifying alternative target')
	        .action(tc._command('watch'))
	            .option('-a, --all', 'Watch and clone to all targets')


	    program
	        .command('unwatch [target]').description('Stops watch loops, all watches by default')
	        .alias('pause')
	        .action(tc._command('unwatch'))
	            .option('-1, --one [target]', 'Just stop one watch, or the default watch')
	            .option('-x, --except [target]', 'Stop all but <name>d watch, or all but the default watch')

	    program.command('disconnect [target]').description('Disconnects from targets, all connected by default, also stops any watches')
	        .alias('stop')
	        .action(tc._command('disconnect'))
	            .option('-1, --one [target]', 'Just disconnect from one <name>d target, or the default target')
	            .option('-x, --except [target]', 'Disconnect all but <name>d target, or all but the default target')


	    program
	        .command('fill [path]')
	        .description('Download files from target, by default just mirror the remotes file tree with empty files in the current directory')
	        // .option('-e, --empty', 'Just create empty files mirroring the remote, this is the default behavior with no options')
	        .option('-n, --target-name <target>', 'Fetch from named target')
	        .option('-F, --full', 'Fetch file contents too')
	        .option('-M, --max-size <n>', 'When fetching file contents, skip files over <n> KB')
	        .option('-m, --match <pattern>', 'When fetching file contents, only download them if they match <pattern>')
	        .option('-x, --exclude <pattern>', 'When fetching file contents, do not download them if they match <pattern>')
	        .option('-p, --pretend', 'Pretend and don\'t actually do anything (we still connect to and scan the target)')
	        .option('-c, --clean', 'Remove files locally that aren\'t on the target (requires --force)')
	        .option('-f, --force', 'Do fills and removes that may overwrite local files')
	        .action(command_handler);


	    program
	        .command('sync [path]')
	        .description('Make the target update to your current repository')
	        .option('-n, --target <target>', 'Sync named target')
	        .option('-q, --quick', 'Just sync filenames of target, no content or meta information')
	        .option('-s, --scan', 'Analyze the target, but don\'t actually alter it in any way')
	        .option('-F, --full', 'Actually read file contents too (on some targets this may mean basically downloading the entire target path)')
	        .option('-M, --max-size <n>', 'When scanning file contents, skip files over <n> KB')
	        .option('-m, --match <pattern>', 'When syncing files, do so only if them if they match <pattern>')
	        .option('-x, --exclude <pattern>', 'When syncing files, do so only if they do not match <pattern>')
	        .option('-c, --clean', 'Remove files on the target that aren\'t in the local repository (requires --force)')
	        .option('-f, --force', 'Do syncs and removes that may overwrite remote files')
	        .action(command_handler);


	    program.command('touch <file>')
	        .description('Trigger save event on file')
	        .action(command_handler)
	            .option('-f, --force', 'Allow touch on a non-existent file')

	    program.command('disappear <file>')
	        .description('Trigger delete event on file, it\'ll be removed from the target')


	    //TODO, interactive
	    /*
	        must be structured so that command line `git teleclone abc 123`
	        is the same as command on tc prompt: @ abc 123
	        difference is that from the command line we do an implicit `login` first
	            or v2, we use a daemon system where command line execs are piped to a port of a running teleclone connection
	            (so on startup, say a pid file exists, pipe to its port, output the output and exit)
	        but a most of commandline commands aren't appropriate for a logged in prompt
	            otoh, all of the interactive commands make sense on the command line (execpt the l* commands)

	        command('login')  ..like watch but no fs watch...

	        interactive must support ...
	            watch
	                pause
	                stop
	                status

	            cd, lcd
	            ls, lls (-l, -a at least)
	            pwd, lpwd

	            get
	            put
	            hash, lhash
	            stat, lstat (or info, linfo?)

	            sftp <cmd>
	            if ssh, exec <cmd>

	            v2, scan, find
	    */

	    // var default_cmd = program.command('*').action(cmd_watch);

	    //~ program.on('err', function() { console.log(arguments) } );
	    // program.parse(process.argv);
	    // default_cmd.action(function() { pa.outputHelp() });
	// program.emit('help', program);
	//     if( pa.args.length == 0 ) {
	//         return cmd_watch();
	//     }
	//     else if( typeof(pa.args[0]) == 'undefined' ) {
	//         pa.outputHelp('fill');
	//     }
	//     else {
	//         console.log("Unknown command: " + pa.args);
	//         pa.help();
	//     }
	//



		//   Vorpal.call(this);
		// return this;
	}
}

global.util = require('util');

_.extend(Teleclone.prototype, {
	_safe_call: global.safe_call,

	show: function(delimiter) {
		if( !delimiter ) {
			delimiter = this.current_branch + "@" + (this.target_name || 'localhost') + "$";
		}
		this.vantage
            .delimiter(delimiter)
            .show();
	},
	output: function(msg) {
		// this.vantage.log.apply(this.vantage, arguments);
		for( var i = 0; i < arguments.length; i++ ) {
			var v = arguments[i];
			this.vantage.log(
				chalk.cyan(
					typeof(v) == "string" ? arguments[0] : util.inspect(arguments[0])
				)
			);
		}
	},
	output_error: function(e) {
		// this.vantage.log.apply(this.vantage, arguments);
		for( var i = 0; i < arguments.length; i++ ) {
			var v = arguments[i];
			this.vantage.log(
				chalk.red(
					typeof(v) == "string" ? arguments[0] : util.inspect(arguments[0])
				)
			);
		}
	},
	init: function(cb) {
		var _cb = cb;
		var self = this;
		var repo = this.repo;
		repo.getCurrentBranch().then(function(branch) {
			self.current_branch = branch.shorthand();
			self._safe_call(self, _cb)
		});
	},
	_command: function() {
		var self = this;

		return function(args, cb) {
			var command_parts = this.commandObject._name.split(' ');
			var cmd = command_parts.shift();
			self.vantage.log(chalk.yellow(
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
	connect: function(session, cmd, args, cb) {
		var _cb = cb;
		var target = args.target;
		var self = this;

		if( !target ) {
			var targets = self.config.get_targets();
			target = Object.keys(targets).shift(); //TODO, no.. use the one marked *default*
		}

	    return new TelecloneTarget(this, target, function(tc) {
			self.teleclone[target] = tc;
		    if( !tc ) {
				this.log('Error connecting to ' + target);
				return cb();
			}

		    console.log('Telecloning local branch ' + self.current_branch + ' to ' + tc.target_name);
			self._safe_call(tc, tc.connect, { callback: function() {
				console.log('Connected to ' + self.target_name);
		        _cb();
		    }});
			return;
		});
	}
};

exports = module.exports = Teleclone;