
//~ var shell = require('shelljs');
//~ var fs = require('fs');
var urlparse = require('url').parse;
var crypto = require('crypto');
var shasum = crypto.createHash('sha1');


function _run(cmd, quiet) {
   console.log('   $ ' + cmd); 
   var ret = shell.exec(cmd, {silent: true});
   
   ret.output = ret.output.replace(/^\s*|\s*$/g, '');
   ret.lines = ret.output.split("\n");

   console.log('     >? ' + ret.code); 
   if( !quiet ) {
      console.log('     >> ' + ret.output); 
   }
   return ret;
}

function _git_run(cmd, quiet) {
    return _run('git ' + cmd, quiet);
}

function wrap(cmd, fn, _quiet) {
    var quiet = _quiet;
    return function() {
        if( !quiet ) console.log('  !! ' + cmd, arguments );
        var ret = fn.apply(this, arguments);
        if( !quiet ) console.log('  !? ' + cmd, ret );
        return ret
   }
}

global.runcmd = _run;
global.git = _git_run;
global.git_current_branch = wrap('git_current_branch', function() {
   return git('rev-parse --abbrev-ref HEAD').output;
})

global.git_is_tracked = wrap('git_is_tracked', function(fn) {
   return !git('ls-files --error-unmatch -- ' + fn).code;
});

global.git_root_dir = wrap('git_root_dir', function() {
   return git('rev-parse --show-toplevel', true);
}, true)

function GitTeleclone() {
    return this;
}

GitTeleclone.prototype.start = function(target_name) {
    //read config etc, check git env, construct backend
    if(target_name) {
        if( target_name.match(/^.+:\/\//) ) {
            //on-the-fly url
            this.target_url = target_name;
        }
        else {
            this.target_url = _read_config(target_name);
        }
    }
    else {
        var configs = _read_all_config();
        if( Object.keys(configs).length == 1 ) {
            this.target_url = configs[ Object.keys(configs)[0] ];
            
        }
        else {
            console.log( Object.keys(configs) );
        }
    }
    
    var target = urlparse(this.target_url);
    target.protocol = target.protocol.replace(/:$/, '');
    if( !target_name ) target_name = target.host;
    var engine = require('./protocol/' + target.protocol);
    return new engine(target_name, target);
    //~ return this;
}

function _init_config() {
    if( !shell.test('-d', '.git/teleclone') ) {
        fs.mkdirSync('.git/teleclone');
    }
    return {};
}

function _delete_config(name) {
    if( !shell.test('-d', '.git/teleclone') ) {
        return;
    }
    var cfn = '.git/teleclone/' + name;
    fs.unlinkSync(cfn);
    console.log("config removed from " + cfn);
}

function _write_config(name, config) {
    if( !shell.test('-d', '.git/teleclone') ) {
        fs.mkdirSync('.git/teleclone');
    }
    var cfn = '.git/teleclone/' + name;
    fs.writeFileSync(cfn, config + "\n");
    console.log("config saved to " + cfn);
}

function _read_config(target) {
    if( !shell.test('-d', '.git/teleclone') ) {
        return {};
    }
    
    var cfn = '.git/teleclone/' + target;
    if( !shell.test('-e', cfn) ) {
        return {};
    }
    
    config = fs.readFileSync(cfn,  "utf-8").trim();
    
    return config;
}

function _read_all_config() {
    if( !shell.test('-d', '.git/teleclone') ) {
        return {};
    }
    
    var configs = {};
    var cfgs = fs.readdirSync('.git/teleclone');
    cfgs.forEach(function(v, i, a) {
        configs[v] = _read_config(v);
    });
    return configs;
}

GitTeleclone.prototype.url = function() {
    return this.config;
}

GitTeleclone.prototype.add_config = function(name, url) {
    var configs = _read_all_config();
    if( configs[name] ) {
        console.log('teleclone ' + name + ' exists');
        return false;
    }
    
    this.set_config(name, url);
}

GitTeleclone.prototype.set_config = function(name, url) {
    var configs = _read_all_config();
    if( !configs[name] ) {
        console.log('teleclone ' + name + 'does not exist');
        return false;
    }

    _write_config(name, url);
}


GitTeleclone.prototype.del_config = function(name, url) {
    var configs = _read_all_config();
    if( configs[name] ) {
        _delete_config(name);
        return false;
    }
    else {
        console.log('config not found, ' + name);
    }
}

module.exports = new GitTeleclone();

function _check_tree(sha, tree) {
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

global.git_find_blob = function(sha) {
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

global.git_hash = function(filename, cb) { //just the way git used to do it! (and still does)
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
