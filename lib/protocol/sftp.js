
//~ var shell = require('shelljs');
var fs = require('fs');

var concat = require('concat-stream');
var os = require('os');
var path = require('path');



TelecloneTarget_sftp.prototype = require('../teleclone-target').prototype;
TelecloneTarget_sftp.prototype._safe_call = global.safe_call;

TelecloneTarget_sftp.prototype._run_remote = function(cmd, cb, quiet) {
    if( !quiet ) _this.log('   % ' + cmd);
    if( this.has_ssh() ) {
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

                    if( !quiet ) _this.log('     %? ' + ret.code);
                    if( !quiet ) _this.log('     %>', ret.output);

                    if( cb ) cb(ret);
                }));
            },
            function(stderr) {
                if( !quiet ) _this.log('   %>! ');
                stderr.pipe(process.stdout);
            }
        );
    }
    else {
        this._conn.exec(cmd,
            function(err, stdout) {
                stdout.pipe(concat(function(output) {
                    var ret = {};
                    output = output.toString().replace(/\n$/m, '');

                    ret.output = output.replace(/(^\s*)|(\s*$)/g, '');
                    ret.lines = ret.output.split("\n");

                    if( !quiet ) {
                        if( !quiet ) _this.log('     %>', ret.output);
                    }

                    if( cb ) cb(ret);
                }));
            },
            function(stderr) {
                _this.log('   %>! ');
                stderr.pipe(process.stdout);
            }
        );

    }
    return this._conn;
}

TelecloneTarget_sftp.prototype._git_run_remote = function (cmd, cb, quiet) {
    return this._run_remote('git ' + cmd, cb);
}

function TelecloneTarget_sftp(target) {
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

function _read_ssh_key(keyfile) {
    var kfn = keyfile ? keyfile : _default_key();
    if( !fs.existsSync( kfn ) ) {
        _this.log('Keyfile not found: ' + kfn);
        return;
    }
    return fs.readFileSync( kfn );
}

var allow_ssh_agent = true; //TODO, configurable
TelecloneTarget_sftp.prototype._setup_ssh_args = function() {
    var ssh_args = {
        hostname: this.target.hostname,
        tryKeyboard: true,
        //~ pass: 'password'
    };
    if( this.target.port ) ssh_args.port = this.target.port;

    //lots of ifs here...

    if( this.target.auth ) {
        var auth = this.target.auth.split(':', 2);
        ssh_args['username'] = auth[0];
        if( auth.length > 1 ) {
            ssh_args['password'] = auth[1];
        }
    }
    else {
        ssh_args['username'] = process.env.USER; //TODO, platform
    }
    var platform = os.platform();
    if( !platform.match(/^win/) ) {
        // if( !ssh_args['password'] ) { //force password use
            var agent_listening = false;
            if( process.env.SSH_AUTH_SOCK ) {
                agent_listening = fs.existsSync( process.env.SSH_AUTH_SOCK );
            }

            if( allow_ssh_agent && agent_listening ) {
                ssh_args['agent'] = process.env.SSH_AUTH_SOCK;
            }
            else {
                var pk = _read_ssh_key();
                if( pk ) ssh_args['privateKey'] = pk;
            }
        // }
    }
    else {//windows
        var pk = _read_ssh_key();
        if( pk ) ssh_args['privateKey'] = pk;
    }
    return ssh_args;
}

TelecloneTarget_sftp.prototype._connect = function(ssh_args, cb) {
    /* to clear the confusing naming organization:
        sftp & ssh both use ssh to *connect*, so we use an SSH object to connect here
        sftp may be an extension to ssh in the "real world" but in our world, sftp is the basics of what we need and ssh is a bonus
        so we connect and then test our limits enabling ssh capabilities if available
    */
    var _args = { 'callback': cb };
    // debuglog(args);
    var SSH = require('ssh2');
    var ssh = new SSH();
    this._safe_call( ssh, ssh.connect, ssh_args );
    // ssh.connect(ssh_args);

    this._conn = ssh;

    var _this = this;
    ssh.on('error', function(err) {

        if( err.level == 'client-authentication' ) {
            if( ssh_args['agent'] ) {
                _this.log('ssh-agent auth failed, trying default key');
                delete ssh_args['agent'];
                ssh_args['privateKey'] = _read_ssh_key();
                ssh.connect(ssh_args);
                return;
            }
            else if( ssh_args['privateKey'] ) {
                _this.log('publickey auth failed');
                var yn = 'y';
                // input.get("Attempt to authorize key with target? [y/n]", function(yn) {
                    if( yn.match(/^y/i) ) {
                        _this.ssh_copy_id(ssh_args, _default_key(), function() {
                            ssh.connect(ssh_args);
                        });
                    }
                    else {
                        // return process.exit();
                    }
                // });
            }
        }
        else {
            _this.log(err);
            if( _args && _args['callback'] ) _args['callback']();
        }
    });
    ssh.on('banner', function(msg) {
        _this.log(msg);
    });
    ssh.on('ready', function() {
        _this._connected = true;
        if( _this.has_ssh() ) {
            _this._run_remote('ls ' + _this.target.pathname, function(ret) {
                if( !ret.code == 0 ) {
                    _this.log('Connected to ' + _this.target_name + ' but target path ' +  _this.target.pathname + ' doesn\'t appear to exist');
                    return process.exit();
                }
                _this.log('Connected to ' + _this.target_name);

                if( args && args['callback'] ) args['callback']();
            }, true);
        }
        else {
            _this._do_sftp(function(sftp) {
                _this.log('Connected to ' + _this.target_name);
                if( args && args['callback'] ) args['callback']();
            });
        }
    });

    return this;
}

TelecloneTarget_sftp.prototype.has_ssh = function(args) {
    //TODO, actually check capabilities of the server
    return this.target.protocol == 'ssh';
}

TelecloneTarget_sftp.prototype.connect = function(cb) {
    var ssh_args = this._setup_ssh_args();
    var _cb = cb;

    var _this = this;
    if( ssh_args['password'] && ssh_args['password'] == '-' ) {
        delete ssh_args['agent'];
        delete ssh_args['privateKey'];

        input.get('password for ' + ssh_args['username'] + '@' + ssh_args['host'], {hidden: true}, function(pass) {
            ssh_args['password'] = pass;
            return _this._connect(ssh_args, _cb);
        });
    }
    else {
        if( ssh_args["privateKey"] || ssh_args["agent"] ) {
            _this._connect(ssh_args, _cb);
        }
        else {
            input.get("Couldn't find an ssh key to use, do you want to generate one now? [y/n]", function(yn) {
                if( yn.match(/^y/i) ) {
                    var kfn = _default_key();
                    runcmd('ssh-keygen -q -t rsa -N "" -f ' + kfn);
                    var pubkey = fs.readFileSync(kfn + '.pub');
                    _this.log( "Your public key is in " + kfn + ".pub and is\n" + pubkey );

                    input.get("Attempt to authorize key with target? [y/n]", function(yn) {
                        if( yn.match(/^y/i) ) {
                            _this.ssh_copy_id(ssh_args, kfn );
                        }
                        // cb( fs.readFileSync(kfn) );
                    });
                }
            });
        }
    }
}

/* nobody ever implemented this in node that i could find, it really should be its own module */
TelecloneTarget_sftp.prototype.ssh_copy_id = function(ssh_args, pkfn) {
    // input.get('password for ' + ssh_args['username'] + '@' + ssh_args['host'], {hidden: true}, function(pass) {
        // ssh_args['password'] = pass;
        var SSH = require('ssh2');
        var ssh = new SSH();
        ssh_args['debug'] = true;
        ssh_args['agent'] = process.env.SSH_AUTH_SOCK;
        ssh.connect(ssh_args);
        ssh.on('debug', function() {
            _this.log('DEBUG', arguments);
        });
        ssh.on('error', function(err) {
            _this.log(err.toString());
            return process.exit();
        });
        ssh.on('ready', function() {
            ssh.sftp(function(err, sftp) {
                if( err ) {
                    errout('error opening sftp connection');
                    process.exit();
                }
                var fill_authorized_keys = function(err) {
                    if( err ) {
                        errout(err);
                        process.exit();
                    }
                    sftp.open('.ssh/authorized_keys', 'a+', function(err, handle) {
                        if( err ) {
                            errout(err);
                            process.exit();
                        }
                        sftp.setstat( '.ssh/authorized_keys', { mode: '0600' }, function(err) {
                            if( err ) {
                                errout(err);
                                process.exit();
                            }

                            var sendkey = fs.readFileSync(pkfn + '.pub');
                            var sendkey_check = sendkey.toString().split(' ');
                            sendkey_check.pop();
                            sendkey_check = sendkey_check.join(' ');

                            var bufsize = 128;
                            var keyline = '';
                            var read_authkeys = function(err, bytesRead, buffer, pos) {
                                if( bytesRead ) {
                                    keyline += buffer.toString();
                                    var nl = keyline.indexOf("\n");
                                    while( nl > 0 ) {
                                        var key = keyline.substring(0, nl).split(' ');
                                        key.pop();
                                        key = key.join(' ');
                                        if( key == sendkey_check ) {
                                            _this.log("Target authorized_keys already contains this key");
                                            process.exit();
                                        }

                                        keyline = keyline.substring(nl + 1);
                                        nl = keyline.indexOf("\n");
                                    }
                                    sftp.read(handle, new Buffer(bufsize), 0, bufsize, pos + bytesRead, read_authkeys);
                                }
                                else {
                                    //TODO, write a string?? we're reading the keyfile for the 2nd time here...
                                    var pkstream = fs.createReadStream(pkfn + '.pub');
                                    pkstream.on('data', function(stream) {
                                        var pkbuf = new Buffer(stream);
                                        sftp.write(handle, pkbuf, 0, pkbuf.length, 0, function() {
                                            _this.log('Added key to target');
                                            process.exit();
                                        })
                                    });
                                }
                            }

                            sftp.read(handle, new Buffer(bufsize), 0, bufsize, 0, read_authkeys);
                        });
                    });
                };
                sftp.open('.ssh', 'r', function(err, handle) {
                    if( err ) {
                        sftp.mkdir('.ssh', { mode: '0700' }, fill_authorized_keys);
                    }
                    else {
                        fill_authorized_keys();
                    }
                })
            });
        });
    // });
}

TelecloneTarget_sftp.prototype._do_sftp = function(cb) {
    var _this = this;
    if( !this._sftp ) {
        this._conn.sftp(function(err, sftp) {
            if( err ) {
                _this.log('error opening sftp connection');
            }
            else {
                _this.log('sftp on');
                _this._sftp = sftp;
                cb(_this._sftp);
            }
        })
    }
    else {
        cb(this._sftp);
    }
}

TelecloneTarget_sftp.prototype.remote_hash = function(fn, cb, args) {
    if( !args ) args = {};

    if( this.has_ssh() ) {
        var cmd = 'hash-object -- ' + this.target.pathname + '/' + fn;
        return this._git_run_remote(cmd, function(ret) { cb(ret.lines[0]) } );
    }
    else {
        args['tmp'] = true;
        this.get(fn, function(err, localfn) {
            if( err ) cb();
            git_hash(localfn, function(hash) {
                cb(hash, localfn);
            });
        }, args);
    }
}

TelecloneTarget_sftp.prototype._readdir = function(sftp, pn, found_files, found_dirs, cb) {
    var _this = this;
    var remotepath = this.target.pathname + '/' + pn;
    sftp.readdir(remotepath, function(err, files) {

        process.stdout.clearLine();
        process.stdout.write("Reading " + remotepath + "\r");

        if(err) {
            _this.log(err.toString(), remotepath);
        }
        else if( files ) {
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
        }

        if( found_dirs.length > 0 ) {
            var fd = found_dirs.shift();
            _this._readdir(sftp, fd, found_files, found_dirs, function(files) {
                //~ _this.log('/Reading ' + remotepath );
                cb(found_files);
            });
        }
        else {
            //~ _this.log('/Reading ' + remotepath );
            cb(found_files);
        }
    })

}

TelecloneTarget_sftp.prototype.readdir_recurse = function(pn) {
    var args, cb;
    if( typeof(arguments[1]) == "function" ) {
        args = {};
        cb = arguments[1];
    }
    else {
        args = arguments[1];
        cb = arguments[2];
    }

    var _this = this;
    this._do_sftp(function(sftp) {
        var _pn = pn;
        var rn = _this.target.pathname + '/' + pn;
        var _t_start = new Date().getTime();
        _this.log('# Readdir ' + _pn);
        _this._readdir(sftp, _pn, [], [], function(files) {
            var _t = new Date().getTime();
            //~ _this.log(pn);
            _this.log('# Readdir ' + _pn + ' in ' + (_t - _t_start) + 'ms');
            if( cb ) cb(files);
        });

    });
}

TelecloneTarget_sftp.prototype.put = function(fn, cb, args) {
    var _this = this;
    this._do_sftp(function(sftp) {
        var _t_start = new Date().getTime();
        var upfn = _this.target.pathname + '/' + fn;
        sftp.fastPut(fn, upfn, function(err) {
            var _t = new Date().getTime();
            _this.log('# Uploaded ' + fn + ' in ' + (_t - _t_start) + 'ms');
            if(err) _this.log(err);
            if (cb) cb(err)
        } );
    });
}

TelecloneTarget_sftp.prototype.get = function(fn, cb, args) {
    var _this = this;
    args = args ? args : {};
    this._do_sftp(function(sftp) {
        var _t_start = new Date().getTime();
        var remotefn = _this.target.pathname + '/' + fn;

        sftp.stat( remotefn, function(err, stats) {
            var localfn = args['tmp'] ? path.join(git_root, '.git', 'teleclone', '.tmp', fn) : path.join(git_root, fn);
            fs.mkdirp( path.dirname(localfn) );

            sftp.fastGet(remotefn, localfn, function(err) {
                var _t = new Date().getTime();
                _this.log('# Downloaded ' + fn + ' in ' + (_t - _t_start) + 'ms');
                _this.log(stats);
                fs.utimesSync(localfn, stats.atime, stats.mtime);
                if(err) _this.log(err);
                if (cb) cb(err, localfn)
            } );
        });
    });
}

TelecloneTarget_sftp.prototype.del = function(fn, cb, args) {
    var _this = this;
    this._do_sftp(function(sftp) {
    var upfn = _this.target.pathname + '/' + fn;
        sftp.unlink(upfn, function(err) {
            if(err) _this.log(err);
            if(cb) cb(err)
        } );
    });
}

module.exports = TelecloneTarget_sftp;
