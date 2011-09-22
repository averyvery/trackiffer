beforeEach(function() {
	
	this.addMatchers({
		
		toBeInConsole : function(expected) {
			// this.actual is the "expect" argument, "expected" is the "toEqual"

			return this.actual === expected;
		}
		
	});  
	
});
