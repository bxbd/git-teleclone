
// var TC_sftp = require('./protocol/sftp');
// var TC_file = require('./protocol/file');

var fs = require('fs');
var urlparse = require('urlparse');
//~ var shell = require('shelljs');
var _ = require('lodash');

var concat = require('concat-stream');
var os = require('os');
var path = require('path');



function TelecloneProtocol(target_url) {
	var target = urlparse(target_url);
    // target.protocol = target.protocol.replace(/:$/, '');
    // if( !target_name ) target_name = target.host;
    // self.target_name = target_name;

	if( !target.protocol ) target.protocol = 'file';

    this.target_url = target_url;
    this.protocol = target.protocol.replace(/:$/, '');



	var protocol_module = './protocol/' + target.protocol;
    if( target.protocol.match(/^(file|s?ftp|ssh)$/) ) {
		var tc_mod = require( protocol_module );
		_.extend(this, new tc_mod(target));
	}
    else {
        console.log('Not sure how to connect to remote with protocol ' + target.protocol);
        return this;
    }


    return this;
}

// TelecloneProtocol.prototype.


module.exports = TelecloneProtocol;
