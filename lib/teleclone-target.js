
// var shell = require('shelljs');
// //~ var fs = require('fs');
var _ = require('lodash');
var urlparse = require('url').parse;
var chalk = require('chalk');
var util = require('util');

var TelecloneProtocol = require('./teleclone-protocol');
// var crypto = require('crypto');
// var shasum = crypto.createHash('sha1');
// var os = require('os');
// var stackTrace = require('stack-trace');

function TelecloneTarget(owner, target_url) {
	this.owner = owner;

	var self = this;

	_.extend(self, new TelecloneProtocol(target_url));

	return this;
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

TelecloneTarget.prototype.watch = function() {

	
}

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

exports = module.exports = TelecloneTarget;
