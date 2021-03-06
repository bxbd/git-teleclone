
var TelecloneConfig = require('./teleclone-config');
// var Gaze = require('gaze').Gaze;

// var filesize = require('filesize');
// var fmt_filesize = function(size) { return filesize(size).replace(' ', ''); }


var Vantage = require('vantage');
// var commons = require("./vantage-commons");
var repl = require("vorpal-repl");


function Teleclone() {

	var self = this;

	if (!(this instanceof Teleclone)) { return new Teleclone(); }

	var vantage = new Vantage();
	vantage.use(setup_commands(this));
	this.vantage = vantage;

	var config = new TelecloneConfig(this);
	this.config = config;

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

		_define_cmd('target add <name> <url>', 'Add a target');
		_define_cmd('target del <name|url>', 'Delete a target');

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

_.extend(Teleclone.prototype, {
	show: function() {
		this.vantage
            .delimiter("$")
            .show();

	},
	log: function() {
		this.vantage.log.apply(this.vantage, arguments);
	},
	_command: function() {
		var self = this;

		return function(args, cb) {
			var command_parts = this.commandObject._name.split(' ');
			var cmd = command_parts.shift();
			commands[cmd].apply(self, [this, command_parts, args, cb]);
		};
	},
});

var commands = {
	target: function(session, cmd, args, cb) {
	//
		//if no args, list target config
		this.log(cmd, args);
		if( cmd.length > 0 ) {
			if( cmd[0] == 'add' ) {
		        var tc_url = args.url;
		        var name = args.name;
		        if( !name ) {
		            var url = urlparse(tc_url);
		            name = url.host;
		        }

		        this.config.add_target(name, tc_url);
			}
		}
		else {
			this.log( this.config.get_target() );
		}

		cb();

		//if adding ..
	    // if( args.list ) {
	    //     var configs = this.config(name)
	    //     Object.keys(configs).forEach(function(v, i, a) {
	    //         console.log(v, configs[v]);
	    //     });
	    // }
	    // else if( args.add ) {
	    //     var tcurl = args.add;
	    //     var name = args['targetName'];
	    //     if( !name ) {
	    //         var url = urlparse(tcurl);
	    //         name = url.host;
	    //     }
		//
	    //     GitTeleclone.add_remote(name, tcurl);
	    // }
	    // else {
	    //     program.emit('help');
	    //     process.exit();
	    //     function cmd_del(name, url) {
	    //         GitTeleclone.del_remote(name, url);
	    //     }
		//
	    //     function cmd_set(tcurl, args) {
	    //         var name = args['targetName'];
	    //         if( !name ) {
	    //             var url = urlparse(tcurl);
	    //             name = url.host;
	    //         }
		//
	    //         GitTeleclone.set_remote(name, tcurl);
	    //     }
		//
	    //     if( !pn ) {
	    //         pn = path.relative(git_root, calling_dir);
	    //     }
	    //     else {
	    //         pn = path.join( path.relative(git_root, calling_dir), pn);
	    //     }
		//
	    //     if( !telec ) process.exit();
	    //     console.log(telec.target_url);
	    // }
		cb();
	},
};

exports = module.exports = Teleclone;
