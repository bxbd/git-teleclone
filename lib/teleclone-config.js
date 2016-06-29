
"use strict";

var _ = require('lodash');
var chalk = require('chalk');

var shell = require('shelljs');
var fs = require('fs');
var urlparse = require('url').parse;

function TelecloneConfig(owner) {
	var self = this;

	if (!(this instanceof TelecloneConfig)) { return new TelecloneConfig(); }

	this.owner = owner;

	return this;

}

_.extend(TelecloneConfig.prototype, {
	log: function() {
		this.owner.log.apply(this.owner, arguments);
	},

	add_target: function(name, url) {
	    var configs = this._read_all_config();
	    if( configs[name] ) {
	        this.log('teleclone ' + name + ' exists');
	        return false;
	    }

	    this._write_config(name, url);
	},

	set_target: function(name, url) {
	    var configs = this._read_all_config();
	    if( !configs[name] ) {
	        this.log('teleclone ' + name + ' does not exist');
	        return false;
	    }

	    this._write_config(name, url);
	},

	del_target: function(name, url) {
	    var configs = this._read_all_config();
	    if( configs[name] ) {
	        this._delete_config(name);
	        return false;
	    }
	    else {
	        errout('config not found, ' + name);
	    }
	},

	get_targets: function(type, val) { //type == 'name' || 'url'
		var configs = this._read_all_config();
		return configs;
	},



	_delete_config: function(name) {
	    if( !shell.test('-d', '.git/teleclone') ) {
	        return;
	    }
	    var cfn = '.git/teleclone/' + name;
	    fs.unlinkSync(cfn);
	    this.log("config removed from " + cfn);
	},

	_write_config: function(name, config) {
	    if( !shell.test('-d', '.git/teleclone') ) {
	        fs.mkdirSync('.git/teleclone');
	    }

	    var cfn = '.git/teleclone/' + name;
	    fs.writeFileSync(cfn, config + "\n");
	    this.log("config saved to " + cfn);
	},

	_read_config: function(target) {
	    if( !shell.test('-d', '.git/teleclone') ) {
	        return;
	    }

	    if( !target ) {
	        return;
	    }

	    var cfn = '.git/teleclone/' + target;
	    if( !shell.test('-e', cfn) ) {
	        return;
	    }

	    var config = fs.readFileSync(cfn,  "utf-8").trim();

	    return config;
	},

	_read_all_config: function() {
	    if( !shell.test('-d', '.git/teleclone') ) {
	        return {};
	    }

		var self = this;
	    var configs = {};
	    var cfgs = fs.readdirSync('.git/teleclone');
			console.log(cfgs);
	    for( var i = 0; i < cfgs.length; i++ ) {
			var v = cfgs[i];
	        if( !v.match(/^\./) ) {
	            configs[v] = self._read_config(v);
	        }
	    }
	    return configs;
	},
});


exports = module.exports = TelecloneConfig;
