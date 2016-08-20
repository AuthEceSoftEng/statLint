var exports = module.exports = {};
var libraries = require('./libraries.js');

exports.look4function = function(fun_name){
	if( libraries.underscore.indexOf(fun_name) != -1 ){
		return true;
	}else if( libraries.browserify.indexOf(fun_name) != -1 ){
		return true;
	}else if( libraries.lodash.indexOf(fun_name) != -1 ){
		return true;
	}else if( libraries.d3.indexOf(fun_name) != -1 ){
		return true;
	}else if( libraries.grunt.indexOf(fun_name) != -1 ){
		return true;
	}else if( libraries.JS.indexOf(fun_name) != -1 ){
		return true;
	}else{
		return false;
	}
}