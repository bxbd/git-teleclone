
//~ var shell = require('shelljs');
//~ var fs = require('fs');

var concat = require('concat-stream');
var os = require('os');
var path = require('path');

TelecloneTarget_ssh.prototype._run_remote = function(cmd, cb, quiet) {
    console.log('   % ' + cmd);
    this._conn.exec(cmd + ' ; echo $?',
        function(err, stdout) {
            stdout.pipe(concat(function(output) {
                var ret = {};
                output = output.toString().replace(/\n$/m, '');

                var ll = output.lastIndexOf("\n");
                if( ll > 0 ) {
                    try {
                        ret.code = parseInt(output.substring(ll, output.length));
                    }
                    catch(e) {}
                    ret.output = output.substring(0, ll);
                }
                else {
                    ret.output = output;
                }

                ret.output = ret.output.replace(/(^\s*)|(\s*$)/g, '');
                ret.lines = ret.output.split("\n");

                console.log('     %? ' + ret.code);
                if( !quiet ) {
                    console.log('     %>', ret.output);
                }

                if( cb ) cb(ret);
            }));
        },
        function(stderr) {
            console.log('   %>! ');
            stderr.pipe(process.stdout);
        }
    );
    return this._conn;
}

TelecloneTarget_ssh.prototype._git_run_remote = function (cmd, cb, quiet) {
    return this._run_remote('git ' + cmd, cb);
}

function TelecloneTarget_ssh(target_name, target) {
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

TelecloneTarget_ssh.prototype.connect = function(args) {
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
    var platform = os.platform();
    if( !platform.match(/^win/) ) {
        if( ( 1 || allow_ssh_agent) && process.env.SSH_AUTH_SOCK ) {
            ssh_args['agent'] = process.env.SSH_AUTH_SOCK;
        }
        else {
            ssh_args['privateKey'] = fs.readFileSync( _default_key() );
        }
    }
    else {
        ssh_args['privateKey'] = fs.readFileSync( _default_key() );
    }

    var ssh = new SSH();
    console.log(ssh_args);
    ssh.connect(ssh_args);

    this._conn = ssh;

    var _this = this;
    ssh.on('error', function(err) {
        return process.exit();
    });
    ssh.on('ready', function() {
        _this._connected = true;
        _this._run_remote('ls ' + _this.target.pathname, function(ret) {
            if( !ret.code == 0 ) {
                console.log('Connected to ' + _this.target_name + ' but target path ' +  _this.target.pathname + ' doesn\'t appear to exist');
                return process.exit();
            }
            console.log('Connected to ' + _this.target_name);

            if( args && args['callback'] ) args['callback']();
        }, true);
    });

    return this;
}

TelecloneTarget_ssh.prototype._do_sftp = function(cb) {
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

TelecloneTarget_ssh.prototype.remote_hash = function(fn, cb, args) {
    var cmd = 'hash-object -- ' + this.target.pathname + '/' + fn;
    return this._git_run_remote(cmd, function(ret) { cb(ret.lines[0]) } );
}

TelecloneTarget_ssh.prototype._readdir = function(sftp, pn, found_files, found_dirs, cb) {
    var _this = this;
    var remotepath = this.target.pathname + '/' + pn;
    sftp.readdir(remotepath, function(err, files) {
        if(err) console.log(err);
        //~ console.log('Reading ' + remotepath );
        if( files ) {
            files.forEach(function(v, i, a) {
                if( v.filename == '.' ) return;
                if( v.filename == '..' ) return;
                if( v.filename == '.git' ) return; //TODO, ignore config

                var prefix = pn ? pn + '/' : '';
                if( v.longname.substring(0, 1) == 'd' ) {
                    found_dirs.push(prefix + v.filename);
                }
                else {
                    v.fullname = prefix + v.filename;
                    found_files.push(v);
                }
            });

            if( found_dirs.length > 0 ) {
                var fd = found_dirs.shift();
                _this._readdir(sftp, fd, found_files, found_dirs, function(files) {
                    //~ console.log('/Reading ' + remotepath );
                    cb(found_files);
                });
            }
            else {
                //~ console.log('/Reading ' + remotepath );
                cb(found_files);
            }
        }
    })

}

TelecloneTarget_ssh.prototype.readdir_recurse = function(pn, cb) {
    var args, cb;
    if( typeof(arguments[0]) == "function" ) {
        args = {};
        cb = arguments[0];
    }
    else {
        args = arguments[0];
        cb = arguments[1];
    }

    var _this = this;
    this._do_sftp(function(sftp) {
        var _pn = pn;
        var _t_start = new Date().getTime();
        _this._readdir(sftp, pn, [], [], function(files) {
            var _t = new Date().getTime();
            //~ console.log(pn);
            console.log('# Readdir ' + pn + ' in ' + (_t - _t_start) + 'ms');
            if( cb ) cb(files);
        });

    });
}

TelecloneTarget_ssh.prototype.put = function(fn, cb, args) {
    var _this = this;
    this._do_sftp(function(sftp) {
        var _t_start = new Date().getTime();
        var upfn = _this.target.pathname + '/' + fn;
        sftp.fastPut(fn, upfn, function(err) {
            var _t = new Date().getTime();
            console.log('# Uploaded ' + fn + ' in ' + (_t - _t_start) + 'ms');
            if(err) console.log(err);
            if (cb) cb(err)
        } );
    });
}

TelecloneTarget_ssh.prototype.get = function(fn, cb, args) {
    var _this = this;
    this._do_sftp(function(sftp) {
        var _t_start = new Date().getTime();
        var remotefn = _this.target.pathname + '/' + fn;
        sftp.fastGet(remotefn, git_root + '/' + fn, function(err) {
            var _t = new Date().getTime();
            console.log('# Downloaded ' + fn + ' in ' + (_t - _t_start) + 'ms');
            if(err) console.log(err);
            if (cb) cb(err)
        } );
    });
}

TelecloneTarget_ssh.prototype.del = function(fn, cb, args) {
    var _this = this;
    this._do_sftp(function(sftp) {
    var upfn = _this.target.pathname + '/' + fn;
        sftp.unlink(upfn, function(err) {
            if(err) console.log(err);
            if(cb) cb(err)
        } );
    });
}

module.exports = TelecloneTarget_ssh;
