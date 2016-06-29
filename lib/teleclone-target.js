
// var shell = require('shelljs');
// //~ var fs = require('fs');
var urlparse = require('url').parse;
// var crypto = require('crypto');
// var shasum = crypto.createHash('sha1');
// var os = require('os');
// var stackTrace = require('stack-trace');

function TelecloneTarget(owner, target_name, cb) {
	var self = this;
    var _cb = cb;

	if (!(this instanceof TelecloneTarget)) { return new TelecloneTarget(); }

	this.owner = owner;

    var target_url;
    if(target_name) {
        if( target_name.match(/^.+:\/\//) ) {
            //on-the-fly url
            target_url = target_name;
        }
        else {
            target_url = self.owner.config._read_config(target_name);
            if( !target_url ) {
                console.log('teleclone ' + target_name + ' does not exist');
                return;
            }
        }
    }

    var target = urlparse(target_url);
    target.protocol = target.protocol.replace(/:$/, '');
    if( !target_name ) target_name = target.host;
    // self.target_name = target_name;

        // console.log(repo.tree());
        if( target.protocol.match(/^(ssh|sftp)$/) ) {
            var tc_sftp = require('./protocol/sftp'); //we see ssh is an extension to sftp
            _.extend(self, new tc_sftp(target_name, target));
        }
        else {
            console.log('Not sure how to connect to remote with protocol ' + target.protocol);
            return safe_call(this, cb());
        }

	    return safe_call(this, cb, self);
    // });
}

TelecloneTarget.prototype.log = function() {
	for( var i = 0; i < arguments.length; i++ ) {
		var v = arguments[i];
		this.owner.vantage.log(
			chalk.cyan(
				typeof(v) == "string" ? arguments[0] : util.inspect(arguments[0])
			)
		);
	}
};


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
