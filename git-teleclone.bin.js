#!/usr/bin/env node

global.program = require('commander');
global.shell = require('shelljs');
global.fs = require('fs.extra');
global.prompt = require('prompt');

var filesize = require('filesize');
var fmt_filesize = function(size) {
    return filesize(size).replace(' ', '');
}
var Gaze = require('gaze').Gaze;

var path = require('path');

var pid_file = '.git/git-watch.pid';
var lock_watch_file = '.git/git-watch.LCK';
var _update_hold_ms = 750;
var tagstamp_prefix = 'AUTO-';

/*
    Console output legend:
        !! a function wrapping other system calls has begun
        !? the result of the previous !! function

         $ a system command that was run
           >? the exit code of the last command
           >> the output of the last command

         % a system command run on a teleclone target
           %? the exit code of the last teleclone target command (TODO)
           %> the output of the last teleclone target command

        # an informative notice
        Anything else, something actual action that occurred or is being taken
*/

require('console-stamp')(console, '[HH:MM:ss.l]');

//this probably has to be on the filesystem
global._update_last_to = {};

var GitTeleclone = require('./lib/git-teleclone.js');

//move input out later, and we can reroute questions into a gui wrapper hopefully
global.input = (function() {
    return {
        'get': function() {
            var txt, extraargs, cb;

            var txt = arguments[0];
            if( arguments.length > 2 ) {
                extraargs = arguments[1];
                cb = arguments[2];
            }
            else {
                extraargs = {};
                cb = arguments[1];
            }

            var args = {
                'properties': {
                    'the_q': {
                        'message': ':'
                    }
                }
            };
            Object.keys(extraargs).forEach(function(v, i, a) {
                args.properties.the_q[v] = extraargs[v];
            });

            prompt.message = txt;
            prompt.colors = false;
            prompt.delimiter = '';
            prompt.start();
            prompt.get(args, function(err, result) {
                cb(result ? result['the_q'] : '');
            });
        }
    };
})();

function main() {
    global.calling_dir = process.cwd();
    var rdo = git_root_dir();
    if( !!rdo.code ) {
        console.log('Not a git tracked directory, run git init');
        process.exit();
    }
    global.git_root = rdo.output;
    process.chdir(git_root);

    program
        .command('show-remote [name]')
        .description('Show a remote by name')
        .action(cmd_show);


    program
        .command('add-remote <name> <url>')
        .description('Add a remote to teleclone to')
        .action(cmd_add);

    program
        .command('set-remote <name> <url>')
        .description('Change a remote to teleclone to')
        .action(cmd_set);

    program
        .command('remove-remote <name>')
        .description('Remove a remote to teleclone to')
        .action(cmd_del);

    program
        .command('watch [name|url]')
        .description('Starts the loop to monitor files and *handle* them, optionally specifying remote')
        .action(cmd_watch);

    program
        .command('unwatch [name]')
        .description('Stops watch loops, all by default')
        .action(cmd_unwatch);

    program
        .command('fill [path]')
        .description('Download files from target, by default just mirror the remotes file tree with empty files in the current directory')
        .option('-n, --target-name <target>', 'Fetch from named remote')
        .option('-u, --url <url>', 'Fetch from url remote')
        .option('-e, --empty', 'Just create empty files mirroring the remote')
        .option('-F, --full', 'Fetch file contents too')
        .option('-r, --remove', 'Remove files locally that aren\'t on the remote (requires --force)')
        .option('-M, --max-size <n>', 'When fetching file contents, skip files over n KB')
        .option('-p, --dry-run', 'Pretend and don\'t actually do anything (we still connect and scan the remote paths)')
        .option('-f, --force', 'Do fetches and removes without compunction')
        .action(cmd_fill);

    /* controls, watch and hook end up calling these, TODO: don't let them be called from command line while watch is on */
    program.command('update <file>')
        .description('Trigger save event on file')
        .action(cmd_updated);

    program.command('create <file>')
        .description('Trigger create event on file')

    program.command('delete <file>')
        .description('Trigger delete event on file')

    var default_cmd = program.command('*');

    var pa = program.parse(process.argv);
    default_cmd.action(function() { pa.outputHelp });

    if( pa.args.length == 0 ) {
        return cmd_watch();
    }
    else if( typeof(pa.args[1]) == 'string' ) {
        // console.log(pa);
        // pa.outputHelp();
    }
    return pa;
}

function cmd_init(remote) {
    console.log(remote);
}

function cmd_del(name, url) {
    GitTeleclone.del_remote(name, url);
}

function cmd_set(name, url) {
    GitTeleclone.set_remote(name, url);
}

function cmd_add(name, url) {
    GitTeleclone.add_remote(name, url);
}

function teleclone_file(update_type, fn) {//finally, do the thing we're here for
    if( update_type != 'delete' ) {
        console.log('Uploading ' + fn + ' to ' + telec.target_name);
        telec.put(fn, function(err) {
            if( err ) {
                console.log('Error uploading file', err);
            }
            else {
                console.log('Staging commit');
                git('add -- ' + fn);
            }
        });
    }
    else {
        telec.del(fn, function(err) {
            if( err ) {
                console.log('Error deleting file', err);
            }
            else {
                console.log('Staging commit (delete)');
                git('add -- ' + fn);
            }
        });
    }
}

function on_update(event, fn, force) {
    if( !fn ) {
        //might be a platform "surprise"
        console.log('fs watcher isn\'t passing filenames!', event, fn);
        return;
    }

    if( fn.match(/^\.git\b/ ) ) { //TODO, we'll need some kind of .ignore system maybe
	    return;
    }
    if( !force ) {
        if( shell.test('-e', lock_watch_file) ) {
            return;
        }
    }

    if( _update_last_to[fn] ) {
        clearTimeout(_update_last_to[fn]);
    }
    else {
        console.log('Update to ' + fn + '....'); //no output on extra updates
    }

    _update_last_to[fn] = setTimeout(_on_update, _update_hold_ms, event, fn);
}

function _on_update(event, fn) {
    console.log('Responding to update to ' + fn);
    if( _update_last_to[fn] ) {
        clearTimeout(_update_last_to[fn]);
        delete _update_last_to[fn];
    }

    var update_type;
    if( event == 'changed' ) {
        update_type = 'save';
    }
    else if( event == 'rename' ) {
        update_type = fs.existsSync(fn) ? 'create' : 'delete';
    }
    else {
        console.log('unexpected fs watcher event!', event, fn);
        return;
    }

    //is it git tracked
    var git_tracked = git_is_tracked(fn);
    if( !git_tracked ) {
        //~ //maybe add it?
    }
    else {
        //is it changed
        //~ if( !git_diffstat(fn).changed ) {
            //~ return false;
        //~ }
        fn = path.relative(git_root, fn);
        console.log(fn);
        var git_hash_cb = function(local_hash) {
            //what we think is on the server
            //TODO, if the file is not staged this should be null....
            var local_cachedhash = (git('ls-files -s -- ' + fn).lines[0].split(/\s+/))[1];

            if( local_hash == local_cachedhash ) {
                //TODO, allow override with force of some kind i suppose
                //~ console.log('seems like no change since last upload');
                //~ return;
            }

            //what's on the server?
            telec.remote_hash(fn, function(remote_hash, localfn) {
                if( local_hash != remote_hash ) {
                    //if the staging scheme doesn't work out...
                        //now .. we need a bingoboard, if the hash of the local and remote bingoboards are equal, we have a good sign
                        //check the local board for what we think is on the server, to know if it's ok to overwrite without prompt

                    var do_upload = false;
                    if( remote_hash.match(/^\s*$/) ) {
                        console.log("# File isn't on remote, creating");
                        do_upload = true;
                    }
                    else if( remote_hash == local_cachedhash ) {
                        //we edited a file we already uploaded once without committing, all good
                        console.log("# File on remote is our last edit, replacing");
                        do_upload = true;
                    }
                    else {
                        var local_headhash = (git('ls-tree HEAD -- ' + fn).lines[0].split(/\s+/))[2];
                        if( remote_hash == local_headhash ) {//we edited a file for a first time since latest commit
                            console.log("# File on remote is at HEAD, replacing");
                            do_upload = true;
                        }
                        else {
                            //does that hash exist in the repo at all?
                            var has_existed = git_find_blob(remote_hash);
                            if( has_existed ) {
                                //it's old?
                                console.log('# File on remote is at an earlier commit, [' + has_existed + ']');
                                //~ console.log( git('show ' + has_existed, true).output );
                                console.log('Overwrite?');
                            }
                            else {
                                console.log('Hash of file on target was not found in repository, try updating repo, or overwrite this unknown file?');
                                if( localfn ) {
                                    //TODO, copy out the .tmp version to the working dir
                                }
                                //TODO, run a git pull? and then recheck some hashes
                            }

                            if( !do_upload ) {
                                input.get('y/n', function(ans) {
                                    if( ans.match(/^y\s*$/i) ) {
                                        teleclone_file(update_type, fn);
                                    }
                                    else {
                                        console.log('Ignoring update');
                                    }
                                });
                            }
                        }
                    }

                    if( do_upload ) {
                        teleclone_file(update_type, fn);
                    }
                }
                else {
                    console.log( '# File on target is identical to local');
                }
            });
        };

        //what we do have here
        if( update_type != 'delete' ) {
            git_hash(fn, git_hash_cb);
        }
        else {
            git_hash_cb('');
        }

        /*
        get the remote repository's object id of the file
        this might come from:
            - local record of the remotes contents (ahem, origin/master)
            - remotes record of the remotes contents (still origin/master, or a stand-in for a dummy)
            - stat of the remote file?
        */
        //basically, if the remote is the one we expect, upload ours.
        // if it's not, pull it down and merge them locally
        //   if conflict pause loop? or have this function bail on git status merging
        //   if success upload the merge copy and warn the user
        //      optionally, stop the loop after X consecutive conflicts (don't let them keep auto merging)

        //todo, a user "claim" a file and reject any requests to change it

        /*
            to get the remote's status of the file, we'll need a backend,
            either we have a git repo with an ssh remote, or we don't
                if ssh, get the url, login, run some git commands
                if local, same as ssh
                if not, we'll have a separate teleclone config for it,
                    the backends which will either allow us same commands or emulate them
                    we can only rely on an index on the remote's target dir and actually copying files down with some --full-check type option
        */

        //todo & optional
        //~ if( !perform_commit(fn) ) return;

    }
}

var SIGNAL_GENTLE_KILL = 'SIGUSR2';
function cmd_unwatch(is_self) {
    //remove temp hooks
    var runningpid = is_self ? 0 : shell.test('-e', pid_file) ? shell.cat(pid_file) : 0;
    if( is_self || runningpid == process.pid ) {
        if( shell.test('-e', pid_file) ) shell.rm(pid_file);
        process.exit();
    }
    console.log( 'killing running git rig watch', runningpid );
    try {
        process.kill(runningpid, SIGNAL_GENTLE_KILL);
    }
    catch(e) {
        //whatever
        console.log(e);
    }
    //todo: race condition city right here
    //~ if( shell.test('-e', pid_file) ) shell.rm(pid_file);
}


process.on(SIGNAL_GENTLE_KILL, function() {
    console.log('[' + process.pid + '] watch was requested to abort');
    cmd_unwatch();
    process.exit();
});

process.on('SIGINT', function() {
    cmd_unwatch(true);
});

function cmd_watch(target) {
    if( shell.test('-e', pid_file) ) {
        cmd_unwatch();
    }

    global.telec = GitTeleclone.load(target);
    if( !telec ) process.exit();

    //todo commit or bail if there are changes on startup
    //todo   also make sure origin is setup and we're sync'd to it

    var curbranch = git_current_branch();
    console.log('Telecloning local branch ' + curbranch + ' to ' + telec.target_name);
    telec.connect({ callback: function() {
        if( shell.test('-e', lock_watch_file) ) shell.rm(lock_watch_file); //reset watch lock
        fs.writeFileSync(pid_file, process.pid);

        var cwd = process.cwd();
        // var watcher = fs.watch( cwd, { persistent: true }, on_update );
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

                console.log('Watching ' + (Object.keys(files))[0]);
            });
        });
        gaze.on('all', on_update);
    }});
    return 0;
}

function cmd_show(name, args) {

    var configs = GitTeleclone.show_remote();
    Object.keys(configs).forEach(function(v, i, a) {
        console.log(v, configs[v]);
    });
    process.exit();
    if( !pn ) {
        pn = path.relative(git_root, calling_dir);
    }
    else {
        pn = path.join( path.relative(git_root, calling_dir), pn);
    }

    if( !telec ) process.exit();
    console.log(telec.target_url);
}

function cmd_fill(pn, args) {
    fs.writeFileSync(lock_watch_file, '');

    var target = args.targetName || '';

    global.telec = GitTeleclone.load(target);

    if( !pn ) {
        pn = path.relative(git_root, calling_dir);
    }
    else {
        pn = path.join( path.relative(git_root, calling_dir), pn);
    }

    if( !telec ) process.exit();

    console.log('Teleclone filling ' + telec.target_name + ' locally');
    //todo, lock watch file, or don't run if watch is running
    telec.connect({ callback: function() {
        telec.readdir_recurse( pn, function(files) {
            var fetch = [];
            files.every(function(v, i, a) {
                var fn = git_root + '/' + v.fullname;
                if( fs.existsSync(fn) ) {
                    if( args.fullForce ) {
                        //only dl if the date or size differ?
                        //or are we checking hashes here
                        fetch.push(v.fullname);
                    }
                    else {
                        console.log( 'EXISTS', v.fullname );
                    }
                }
                else {
                    var dir = path.dirname(fn);
                    if( !args.dryRun ) {
                        var pathcursor = git_root;
                        path.relative(git_root, dir).split('/').forEach(function(v, i, a) {
                            pathcursor += '/' + v;
                            if( !fs.existsSync(pathcursor) ) {
                                fs.mkdirSync( pathcursor );
                            }
                            else if( !fs.statSync(pathcursor).isDirectory() ) {
                                console.log(pathcursor + ' exists and is not a directory!');
                            }
                        });
                    }
                    if( args.fullForce ) {
                        fetch.push(v.fullname);
                    }
                    else {
                        console.log( 'CREATE', filesize(v.attrs.size), v.fullname );
                        if( !args.dryRun ) fs.writeFileSync(fn, '');
                    }
                }
                return true;
            });

            if( fetch.length > 0 ) {
                var fetcher = function() {
                    if( fetch.length == 0 ) {
                        setTimeout( function() {
                            shell.rm(lock_watch_file);
                            process.exit();
                        }, 1000);
                        return;
                    }
                    var fn = fetch.shift();

                    console.log( 'FETCH ', v.fullname );
                    if( !args.dryRun ) {
                        telec.get(fn, fetcher);
                    }
                    else {
                        fetcher();
                    }
                }
                fetcher();
            }
            else {
                setTimeout( function() {
                    shell.rm(lock_watch_file);
                    process.exit();
                }, 1000);
            }
        });
    }});

}


function cmd_updated(file) {
    console.log('updated', file);
    _on_update('change', file);
    return 0;
}

function cmd_created(file) {
    console.log('created', file);
    _on_update('rename', file);
    return 0;
}

function cmd_deleted(file) {
    console.log('deleted', file);
    _on_update('rename', file);
    return 0;
}

function cmd_help() {
    console.log('help');
}

main();