(function(){

	"use strict";

	/* @group setup */
	
		var log_array = [];

		window.console = {
			'log' : function(){
				var args = Array.prototype.slice.call(arguments); 
				log_array.push(args);
			}
		};
		
	
	/* @end */
	
	/* @group units */
	
		
	
	/* @end */
	
	/* @group behaviors */
	
		describe('Stuff', function(){
			it('should work', function(){
				expect(0).toEqual(false);
			});
		});
	
	/* @end */

	/* @group init */
	
		jasmine.getEnv().addReporter( new jasmine.TrivialReporter() );
		jasmine.getEnv().execute();
	
	/* @end */
	
})();

