beforeEach(function() {
	
	this.addMatchers({
		
		toBeInConsole : function(expected) {
			// this.actual is the "expect" argument, "expected" is the "toEqual"

			return this.actual === expected;
		},
		
		toBeObject : function(expected) {
			return (typeof this.actual === 'object') === expected;
		},

		toBeString : function(expected) {
			return (typeof this.actual === 'string') === expected;
		}

	});  
	
});
