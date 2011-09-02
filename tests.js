window.test = function(){

	// setup - duck _gaq for testing purposes
	var push = _gaq.push;

	window.test_log = [];

	_gaq.push = function(){
		var args = Array.prototype.slice.call(arguments);
		test_log.push(args);
		push.apply(_gaq, args);
	};

};
