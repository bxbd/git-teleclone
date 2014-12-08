
//~ var shell = require('shelljs');
//~ var fs = require('fs');

var concat = require('concat-stream');

GitTeleclone_ssh.prototype._run_remote = function(cmd, cb, quiet) {
    console.log('    % ' + cmd); 
    this._conn.exec(cmd,
        function(err, stdout) {
            stdout.pipe(concat(function(output) {
                var ret = {};
                ret.output = output.toString();
                ret.lines = ret.output.split("\n");
                ret.output = ret.output.replace(/(^\s*)|(\s*$)/g, '');

                console.log('    %? ' + 'TODO, remote exit code'); 
                if( !quiet ) {
                    console.log('    %>', ret.output);
                }    
                
                cb(ret);
            }));
        },
        function(stderr) {
            console.log('   %>! ');
            stderr.pipe(process.stdout);
        }
    );
    return this._conn;
}

GitTeleclone_ssh.prototype._git_run_remote = function (cmd, cb, quiet) {
    return this._run_remote('git ' + cmd, cb);
}

function GitTeleclone_ssh(target_name, target) {
    this.target_name = target_name;
    this.target = target;
    this.target_url = target.href;
    return this;
}

function __getUserHome() {
  return process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
}

function _default_key() {
    var key = __getUserHome() + '/.ssh/id_rsa';
    return key;
}

GitTeleclone_ssh.prototype.connect = function(args) {
    var SSH = require('ssh2');
    var ssh_args = {
        host: this.target.host,
        //~ pass: 'password'
    };
    if( this.target.auth ) {
        ssh_args['username'] = this.target.auth;
    }
    else {
        ssh_args['username'] = process.env.USER; //TODO, platform
    }
    
    //lots of ifs here... 
    if( 1 || allow_ssh_agent ) {
        if( 1 || platform_nix ) {
            if( process.env.SSH_AUTH_SOCK ) {
                ssh_args['agent'] = process.env.SSH_AUTH_SOCK;
            }
            else {
                ssh_args['privateKey'] = process.env.HOME + '/.ssh/id_rsa';
            }
        }
    }
    
    var ssh = new SSH();
    ssh.connect(ssh_args);
    this._conn = ssh;
    
    var _this = this;
    ssh.on('ready', function() {
        _this._connected = true;
        console.log('Connected to ' + _this.target_name);
    });
    
    return this;
}

GitTeleclone_ssh.prototype.sftp = function(cb) {
    var _this = this;
    if( !this._sftp ) {
        this._conn.sftp(function(err, sftp) {
            if( err ) {
                console.log('error opening sftp connection');
            }
            else {
                console.log('sftp on');
                _this._sftp = sftp;
                cb(_this._sftp);
            }
        })
    }
    else {
        cb(this._sftp);
    }
}

GitTeleclone_ssh.prototype.remote_hash = function(fn, cb, args) {
    var cmd = 'hash-object -- ' + this.target.pathname + '/' + fn;
    return this._git_run_remote(cmd, function(ret) { cb(ret.lines[0]) } );
    //~ runcmd('ssh ' + target.hostname + ' git hash-object -- ' +  target.pathname + '/' + fn);
}

GitTeleclone_ssh.prototype.put = function(fn, cb, args) {
    var _this = this;
    this.sftp(function(sftp) {
        sftp.fastPut(fn, _this.target.pathname + '/' + fn, function(err) { 
            if(cb) cb(err) 
        } );
    });
}

GitTeleclone_ssh.prototype.del = function(fn, cb, args) {
    var _this = this;
    this.sftp(function(sftp) {
        sftp.unlink(_this.target.pathname + '/' + fn, function(err) { 
            if(cb) cb(err) 
        } );
    });
}

module.exports = GitTeleclone_ssh;
