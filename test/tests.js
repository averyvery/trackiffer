(function(){

	"use strict";

	/* @group setup */
	
		var logs = [];

		window._console = {
			'log' : function(){
				var args = Array.prototype.slice.call(arguments); 
				logs.push(args);
			},
			'clear' : function(){
				logs = [];
			}
		};
	
	/* @end */
	
	/* @group units */

		describe('Trackiffer', function(){
			var T = trackiffer();
			it('returns an instance when passed nothing', function(){
				expect(T).toBeObject(true);
			});
			it('returns property when passed a property string', function(){
				expect(trackiffer('version')).toBeString(true);
			});
			it('runs method when passed a method string', function(){
				T.fake_method = function(){ return 'test' };
				expect(trackiffer('fake_method')).toEqual('test');
			});
			it('doesn\'t call trackRules until passed object', function(){
				spyOn(T, 'trackRules');
				expect(T.trackRules.callCount).toEqual(0);
			});
			it('calls trackRules when passed object', function(){
				spyOn(T, 'trackRules');
				trackiffer({});
				expect(T.trackRules).toHaveBeenCalled();
			});
		});
	
		describe('Data Formatting', function(){
			var T = trackiffer();
			it('parses tokens', function(){
				spyOn(T, 'parseTokens').andCallThrough();
				var event_data = T.formatData(['test'], $('<div></div>'));
				expect(T.parseTokens).toHaveBeenCalled();
			});
			it('adds _trackEvent to the data', function(){
				var event_data = T.formatData(['test'], $('<div></div>'));
				expect(event_data[0]).toEqual('_trackEvent');
			});
			it('replaces #STRINGS# with element attributes', function(){
				expect(T.getReplacement('#HREF#', $('<a href="X"></a>'))).toEqual('X');
			});
			it('replaces #VALUE# with element value', function(){
				expect(T.getReplacement('#VALUE#', $('<input value="X" />'))).toEqual('X');
			});
			it('replaces #TEXT# with element text', function(){
				expect(T.getReplacement('#TEXT#', $('<p>X</p>'))).toEqual('X');
			});
			it('comments out quotes', function(){
				expect(T.replaceBadCharacters("'test'")).toEqual("\\'test\\'");
			});
			it('comments out double-quotes', function(){
				expect(T.replaceBadCharacters('"test"')).toEqual('\\"test\\"');
			});
			it('comments out commas', function(){
				expect(T.replaceBadCharacters('test,test')).toEqual('test\\,test');
			});
		});

		describe('Requirements', function(){
			var T = trackiffer();
			it('loads scripts', function(){
				expect(window.TEST).toEqual(undefined);
				T.loadScript("test_load.js");
				waits(500);
				runs(function(){
					expect(window.TEST).toEqual(true);
				});
			});
			it('should bind when jQuery is present', function(){
				spyOn(T, 'bindRules');
				expect(T.bindRules.callCount).toEqual(0);
				T.checkjQuery();
				expect(T.bindRules).toHaveBeenCalled();
			});
			it('should load script when no jQuery', function(){
				window.jQuery = null;
				expect(jQuery).toEqual(null);
				spyOn(T, 'loadScript');
				expect(T.loadScript.callCount).toEqual(0);
				T.checkjQuery();
				expect(T.loadScript).toHaveBeenCalled();
			});
			it('detect low jQuery versions', function(){
				T.loadScript("http://ajax.googleapis.com/ajax/libs/jquery/1.2.3/jquery.min.js");
				waits(1000);
				runs(function(){
					expect($.fn.jquery).toEqual('1.2.3');
					spyOn(T, 'loadScript');
					expect(T.loadScript.callCount).toEqual(0);
					T.checkjQuery();
					expect(T.loadScript).toHaveBeenCalled();
				});
			});
			it('normalizes version numbers', function(){
				expect(T.normalizeVersion('9.0.0')).toEqual(900);
				expect(T.normalizeVersion('9')).toEqual(900);
				expect(T.normalizeVersion('0.0.1')).toEqual(1);
				expect(T.normalizeVersion('0.0.0')).toEqual(0);
				expect(T.normalizeVersion('0')).toEqual(0);
			});
			it('checks if version is high enough', function(){
				$.fn.jquery = '1.5.0';
				expect(T.isjQueryVersionHighEnough()).toEqual(true);
			});
			it('checks if version is too low', function(){
				$.fn.jquery = '1.2.1';
				expect(T.isjQueryVersionHighEnough()).toEqual(false);
			});
			it('continually poll jQuery version when jQuery version is low', function(){
				$.fn.jquery = '1.2.1';
				spyOn(T, 'polljQueryVersion');
				expect(T.polljQueryVersion.callCount).toEqual(0);
				T.polljQueryVersion();
				waits(300);
				runs(function(){
					expect(T.polljQueryVersion.callCount).toEqual(3);
				});
			});
			it('stop polling version when jQuery is present', function(){
				$.fn.jquery = '1.8.1';
				spyOn(T, 'polljQueryVersion');
				expect(T.polljQueryVersion.callCount).toEqual(0);
				T.polljQueryVersion();
				waits(300);
				runs(function(){
					expect(T.polljQueryVersion.callCount).toEqual(1);
				});
			});
			it('sets jquery to loaded', function(){
				T.jquery.loaded = false;
				T.jQueryHasLoaded(); 
				expect(T.jquery.loaded).toEqual(true);
			});
			it('calls bindrules when jquery loads', function(){
				spyOn(T, 'bindRules');
				expect(T.bindRules.callCount).toEqual(0);
				T.jQueryHasLoaded(); 
				expect(T.bindRules.callCount).toEqual(1);
			});
		});
	
		describe('Formatting', function(){
			it('', function(){

			});
		});

	/* @end */
	
	/* @group behaviors */
	
	/* @end */

	/* @group init */
	
		jasmine.getEnv().addReporter( new jasmine.TrivialReporter() );
		jasmine.getEnv().execute();
	
	/* @end */
	
})();

