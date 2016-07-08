
// var shell = require('shelljs');
// //~ var fs = require('fs');
var _ = require('lodash');
var urlparse = require('url').parse;
var chalk = require('chalk');
var util = require('util');

var Gaze = require('gaze').Gaze;

var TelecloneProtocol = require('./teleclone-protocol');
// var crypto = require('crypto');
// var shasum = crypto.createHash('sha1');
// var os = require('os');
// var stackTrace = require('stack-trace');

function TelecloneTarget(owner, target_url) {
	this.owner = owner;

	var self = this;
	// debuglog(typeof(target_url));
	// debuglog(arguments);

    this.target_url = target_url;
	this.target = new TelecloneProtocol(target_url);


	    return this;
    // });
}

TelecloneTarget.prototype.log = function() {
	var stack = new Error().stack.split("\n");
	stack.shift();
	stack.shift();
	for( var i = 0; i < arguments.length; i++ ) {
		var v = arguments[i];
		// this.owner.vantage.log(
		console.log(
			chalk.cyan(
				typeof(v) == "string" ? arguments[0] : util.inspect(arguments[0])
			)

		);
	}
	console.log(stack.join("\n"));
};

TelecloneTarget.prototype.toString = function() {
	return this.target_url;
}

TelecloneTarget.prototype.target = function() {
	return this.config.target.apply(this.config, arguments);
}
TelecloneTarget.prototype.targets = function() {
	return this.config.targets.apply(this.config, arguments);
}
TelecloneTarget.prototype.add_target = function() {
	return this.config.add_target.apply(this.config, arguments);
}
TelecloneTarget.prototype.del_target = function() {
	return this.config.del_target.apply(this.config, arguments);
}

TelecloneTarget.prototype.connect = function() {
	return this.target.connect.apply(this.target, arguments);
}
TelecloneTarget.prototype.disconnect = function() {
	return this.target.disconnect.apply(this.target, arguments);
}

TelecloneTarget.prototype.watch = function() {
    var gaze = new Gaze( path.join('**', '*'), {}, function(err, watcher) {
        if( err ) {
            console.log(err);
            process.exit();
        }

        watcher.watched(function(err, files) {
            if( err ) {
                console.log(err);
                process.exit();
            }

            console.log('Watching ' + cwd);
        });
    });
    gaze.on('all', this.target.touch);

	return this.target.connect.apply(this.target, arguments);
}


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


/* other terms for this pair of functions, ..
	for copying a remote to your local:
		bring get grab
		take obtain receive
		reap glean gather collect

	for copying your local to a remote:
		deliver spread disperse
		put yield cast send issue

	how about in & out?
*/
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


// TelecloneTarget.prototype.errout = function(msg) {
//     var caller = stackTrace.get()[1];
//     console.log( caller.getFileName() + ':' + caller.getLineNumber(), msg );
// }
//
// TelecloneTarget.prototype.runcmd = _run;
// TelecloneTarget.prototype.git = _git_run;
// TelecloneTarget.prototype.git_current_branch = wrap('git_current_branch', function() {
//     // console.log(this.owner.repo.getCurrentBranch());
//     return this.owner.repo;
//     var rd = this.git_root_dir().output;
//     var head = this.runcmd('cat ' + rd + '/.git/HEAD').output;
//     if( head.match(/^[0-9A-F]{40}$/i) ) {
//         var res = this.git('rev-parse --abbrev-ref HEAD');
//         return res.output;
//     }
//     else {
//         var refs = head.split('/');
//         return refs[ refs.length - 1 ];
//     }
// });
//
// TelecloneTarget.prototype.git_is_tracked = wrap('git_is_tracked', function(fn) {
//    return !git('ls-files --error-unmatch -- ' + fn, true).code;
// });
//
// TelecloneTarget.prototype.git_root_dir = wrap('git_root_dir', function() {
//    // return this.git('rev-parse --show-toplevel', true);
//    return this.owner.repo.path();
// }, true)

TelecloneTarget.prototype._check_tree = function(sha, tree) {
    var subtree = [];
    var found;
    git("ls-tree " + tree, true).lines.every(function(v, i, a) {
        var m = v.match(/^[0-7]{6} (\S+) (\S+)/);
        if( !m ) {
            console.log("Unexpected git-ls-tree output", v);
            return false;//stop the loop
        }
        if( m[2] == sha ) {
            //that's the one
            found = true;
            return false;
        }

        if( m[1] == 'tree' ) {
            subtree.push(m[2]);
        }

        return true;
    });
    subtree.every(function(v, i, a) {
        if( _check_tree(sha, v) ) {
            found = true;
            return false;
        }
        return true;
    });

    return found;
}

TelecloneTarget.prototype.git_find_blob = function(sha) {
    var full_sha = git('rev-parse --verify ' + sha, true);
    if( !!full_sha.code ) {
        return undefined;
    }
    else {
        full_sha = full_sha.lines[0];
        var found;
        git("log --pretty='format:%T %h %s'", true).lines.every(function(v, i, a) {
            var parts = v.split(/ /, 3);
            if( _check_tree(full_sha, parts[0]) ) {
                found = parts;
                return false;
            }
            return true;
        });
        return found ? found[1] : undefined;
    }
}

TelecloneTarget.prototype.git_hash = function(filename, cb) { //just the way git used to do it! (and still does)
    var _t_start = new Date().getTime();
    console.log('   @ git_hash', filename);
    fs.stat(filename, function(err, stat) {
        var s = fs.ReadStream(filename);
        var shasum = crypto.createHash('sha1');

        shasum.update('blob ' + stat.size + "\0"); //the secret sauce, a prefix
        s.on('data', function(d) {
            shasum.update(d);
        });
        s.on('end', function() {
            var d = shasum.digest('hex');
            var _t = new Date().getTime();
            console.log('   @ git_hash', filename, d, '(' + (_t - _t_start) + 'ms)');
            cb(d);
        });

    });
};
/*
find a commit by file hash:

#!/usr/bin/perl
use 5.008;
use strict;
use Memoize;

my $obj_name;

sub check_tree {
    my ( $tree ) = @_;
    my @subtree;

    {
        open my $ls_tree, '-|', git => 'ls-tree' => $tree
            or die "Couldn't open pipe to git-ls-tree: $!\n";

        while ( <$ls_tree> ) {
            /\A[0-7]{6} (\S+) (\S+)/
                or die "unexpected git-ls-tree output";
            return 1 if $2 eq $obj_name;
            push @subtree, $2 if $1 eq 'tree';
        }
    }

    check_tree( $_ ) && return 1 for @subtree;

    return;
}

memoize 'check_tree';

die "usage: git-find-blob <blob> [<git-log arguments ...>]\n"
    if not @ARGV;

my $obj_short = shift @ARGV;
$obj_name = do {
    local $ENV{'OBJ_NAME'} = $obj_short;
     `git rev-parse --verify \$OBJ_NAME`;
} or die "Couldn't parse $obj_short: $!\n";
chomp $obj_name;

open my $log, '-|', git => log => @ARGV, '--pretty=format:%T %h %s'
    or die "Couldn't open pipe to git-log: $!\n";

while ( <$log> ) {
    chomp;
    my ( $tree, $commit, $subject ) = split " ", $_, 3;
    print "$commit $subject\n" if check_tree( $tree );
}
*/

exports = module.exports = TelecloneTarget;
