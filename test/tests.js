(function(){

	"use strict";

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
			it('returns version number when asked', function(){
				T.version = 'foo';
				expect(T.version).toEqual('foo');
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
			it('parses each token separately', function(){
				expect(T.parseTokens(['{{href}} - {{text}}'], $('<a href="foo">bar</a>'))).toEqual(['foo - bar']);
			});
			it('replaces {{strings}} with element attributes', function(){
				expect(T.getReplacement('{{title}}', $('<a href="#" title="X"></a>'))).toEqual('X');
			});
			it('replaces {{value}} with element value', function(){
				expect(T.getReplacement('{{value}}', $('<input value="X" />'))).toEqual('X');
			});
			it('replaces {{text}} with element text', function(){
				expect(T.getReplacement('{{text}}', $('<p>X</p>'))).toEqual('X');
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
			it('replaces extraneous spaces with single spaces', function(){
				expect(T.replaceBadCharacters('test   test   test')).toEqual('test test test');
			});
			it('removes linebreaks', function(){
				expect(T.replaceBadCharacters('   \ntest\ntest\r  ')).toEqual('test test');
			});
			it('removes leading spaces', function(){
				expect(T.replaceBadCharacters('    test')).toEqual('test');
			});
			it('removes trailing spaces', function(){
				expect(T.replaceBadCharacters('test        ')).toEqual('test');
			});
		});

		describe('Delaying outbound actions', function(){
			var T = trackiffer();
			it('calls delayed clicks after 100ms', function(){
				spyOn(T, 'executeDelayedAction');
				T.executeDelayedAction('click', $('<a href="#"></a>'));
				expect(T.executeDelayedAction).toHaveBeenCalled();
			});
			it('calls delayed submits after 100ms', function(){
				spyOn(T, 'executeDelayedAction');
				T.executeDelayedAction('submit', $('<form action="#"></form>'));
				expect(T.executeDelayedAction).toHaveBeenCalled();
			});
		});

		describe('Binding', function(){
			var T = trackiffer();
			it('tracks rules if jQuery is loaded', function(){
				T.jquery.loaded = true;
				spyOn(T, 'bindRules');
				T.trackRules();
				expect(T.bindRules).toHaveBeenCalled();
			});
			it('doesn\'t tracks if jQuery is  not loaded', function(){
				T.jquery.loaded = false;
				spyOn(T, 'bindRules');
				T.trackRules();
				expect(T.bindRules.callCount).toEqual(0);
			});
			it('binds all rules to selectors', function(){
				spyOn(T, 'bindRulesToSelector');
				T.rules = {'a' : [], 'b' : [], 'c' : []};
				T.bindRules();
				expect(T.bindRulesToSelector.callCount).toEqual(3);
			});
			it('empties ruleset after binding', function(){
				T.rules = {'a' : [], 'b' : [], 'c' : []};
				T.bindRules();
				expect(T.rules).toEqual({});
			});
			it('binds X handlers to X elements', function(){
				for(var i = 0; i < 3; i++){
					$('body').append('<a href="#" class="trackiffer_test"></a>');
				};
				spyOn(T, 'bindEvent');
				T.bindRulesToSelector('a.trackiffer_test');
				expect(T.bindEvent.callCount).toEqual(3);
			});
			it('handles event', function(){
				var handler = T.handleEvent();
				expect(typeof handler).toEqual('function');
			});
			it('delays event when href or action is not onpage', function(){
				var handler = T.handleEvent({delay : true, rule : []});
				spyOn(T, 'delayAction');
				spyOn(T, 'elemHasUrl').andReturn(true);
				handler();
				expect(T.delayAction).toHaveBeenCalled();
			});
			it('gets appropriate event type from element', function(){
				expect(T.getEventType($('<a href="#"></a>'))).toEqual('click');
				expect(T.getEventType($('<span></span>'))).toEqual('click');
				expect(T.getEventType($('<form></form>'))).toEqual('submit');
				expect(T.getEventType($('<select></select>'))).toEqual('change');
				expect(T.getEventType($('<input type="submit"></input>'))).toEqual('click');
			});
			it('determine if array or not', function(){
				expect(T.isArray([1,2,3])).toEqual(true);
				expect(T.isArray({a:1,b:2})).toEqual(false);
			});
			it('binds an event', function(){
				var $elem = $('<span></span>');
				expect($elem.data('events')).toEqual(undefined);
				T.bindEvent([], $elem);
				expect($elem.data('events')['click']).toNotEqual(undefined);
			});
			it('binds an event when given an object', function(){
				var $elem = $('<span></span>');
				expect($elem.data('events')).toEqual(undefined);
				T.bindEvent({rule : []}, $elem);
				expect($elem.data('events')['click']).toNotEqual(undefined);
			});
			it('binds to ga', function(){
				var $elem = $('<span></span>');
				T.debugging = false;
				spyOn(window, 'ga');
				T.bindEvent(['event', 'test', 'test'], $elem, 'span');
				$elem.click();
				expect(window.ga).toHaveBeenCalled();
			});
			it('detects elements without urls', function(){
				expect(T.elemHasUrl($('<form action="#"></form>'))).toEqual(false);
				expect(T.elemHasUrl($('<form action="http://example.com"></form>'))).toEqual(true);
				expect(T.elemHasUrl($('<a href="#"></a>'))).toEqual(false);
				expect(T.elemHasUrl($('<a href="http://example.com"></a>'))).toEqual(true);
			});
			it('delays when delay is true', function(){
				spyOn(T, 'delayAction');
				var $elem = $('<a href="http://example.com"></a>');
				T.bindEvent({delay : true, rule : []}, $elem);
				$elem.click();
				expect(T.delayAction.callCount).toEqual(1);
			});
			it('doesn\'t delay when delay is false', function(){
				spyOn(T, 'delayAction');
				var $elem = $('<a href="http://example.com"></a>');
				T.bindEvent({delay : false, rule : []}, $elem);
				$elem.click();
				expect(T.delayAction.callCount).toEqual(0);
			});
			it('binds when delegate is false', function(){
				var $elem = $('<a href="http://example.com"></a>');
				spyOn($elem, 'bind').andCallThrough();
				T.bindEvent({rule : [], delegate : false}, $elem, 'a');
				expect($elem.bind.callCount).toEqual(3);
			});
			it('doesn\'t bind when delegate is set', function(){
				var $elem = $('<a href="http://example.com"></a>');
				spyOn($elem, 'bind').andCallThrough();
				T.bindEvent({rule : [], delegate : 'body'}, $elem, 'a');
				expect($elem.bind.callCount).toEqual(2);
			});
			it('delegates when told', function(){
				var $body = $('body');
				spyOn($body, 'delegate').andCallThrough();
				T.bindEvent({rule : [], delegate : 'a'}, $body, 'body');
				expect($body.delegate.callCount).toEqual(1);
			});
			it('detects elements with URLs', function(){
				window.console.log && console.log && console.log(' ======= ');
				var $elem = $('<a href="http://example.com"></a>');
				expect(T.elemHasUrl($elem)).toEqual(true);
				var $elem = $('<a href="http://example.com#hello"></a>');
				expect(T.elemHasUrl($elem)).toEqual(true);
				window.console.log && console.log && console.log(' ======= ');
			});
			it('detects elements without URLs', function(){
				window.console.log && console.log && console.log(' ======= ');
				var $elem = $('<div></div>');
				expect(T.elemHasUrl($elem)).toEqual(false);
				var $elem = $('<a href="#hello"></a>');
				expect(T.elemHasUrl($elem)).toEqual(false);
				window.console.log && console.log && console.log(' ======= ');
			});
		});

		describe('Debugging', function(){
			var T = trackiffer();
			it('sets debug when hash is set', function(){
				T.debugging = false;
				window.location.hash = '#trackiffer_debug';
				spyOn(window, 'setTimeout');
				T.checkDebugSetting();
				expect(T.debugging).toEqual(true);
			});
			it('sets debug when debug var is set', function(){
				T.debugging = false;
				window.location.hash = '#trackiffer_debug';
				spyOn(window, 'setTimeout');
				T.checkDebugSetting();
				expect(T.debugging).toEqual(true);
			});
			it('sets debug when hash and debug var are NOT set', function(){
				T.debugging = false;
				window.location.hash = '#test';
				window.trackiffer_debug = undefined;
				spyOn(window, 'setTimeout');
				T.checkDebugSetting();
				expect(T.debugging).toEqual(undefined);
			});
			it('debugs once GA has loaded', function(){
				window.ga = function(){};
				spyOn(T, 'debug');
				T.debugAfterGALoads();
				expect(T.debug).toHaveBeenCalled();
			});
			it('does not debug until GA has loaded', function(){
				window.ga = undefined;
				spyOn(T, 'debug');
				T.debugAfterGALoads();
				expect(T.debug.callCount).toEqual(0);
			});
			it('continies to check after 19 attempts', function(){
				T.debug_wait_count = 19;
				spyOn(window, 'setTimeout');
				T.debugAfterGALoads();
				expect(window.setTimeout.callCount).toEqual(0);
			});
			it('exits after 20 attempts', function(){
				T.debug_wait_count = 21;
				spyOn(T, 'debug');
				spyOn(window, 'setTimeout');
				T.debugAfterGALoads();
				expect(window.setTimeout.callCount).toEqual(0);
				expect(T.debug.callCount).toEqual(0);
			});
			it('ducks log so we can track it', function(){
				window.saved_console = window.console;
				window.console = {
					'log' : function(){
						var args = Array.prototype.slice.call(arguments);
						window.console.logs.push(args);
					},
					'logs' : []
				};
				expect(window.console.logs).toEqual([]);
			});
			it('logs', function(){
				T.debugging = true;
				T.log('test');
				expect(window.console.logs[window.console.logs.length - 1][1]).toEqual('test');
			});
			it('restores log', function(){
				window.console = window.saved_console;
				expect(window.console && window.console.logs).toEqual(undefined);
			});
			it('undefine ga when asked', function(){
				window.ga = undefined;
				T.undefineGa();
				expect(window._gat).toEqual(undefined);
				expect(typeof window.ga).toEqual('function');
			});
			it('should undefined ga before debug', function(){
				spyOn(T, 'undefineGa');
				T.debug();
				expect(T.undefineGa).toHaveBeenCalled();
			});
			it('should load ga_debug before debug', function(){
				spyOn(T, 'loadScript');
				T.debug();
				expect(T.loadScript).toHaveBeenCalled();
			});
			it('should style an element', function(){
				window.$test_elem = $('<span></span>');
				window.$test_elem.css(T.debug_outlines.property, '');
				T.styleElement(window.$test_elem, 'highlight');
				expect(window.$test_elem.css(T.debug_outlines.property) === '').toEqual(false);
			});
			it('should highlight an element', function(){
				window.$test_elem = $('<span></span>').appendTo('body');
				spyOn(T, 'styleElement');
				T.highlightElement.call(window.$test_elem);
				expect(T.styleElement.callCount).toEqual(1);
			});
			it('should unhighlight an element', function(){
				window.$test_elem = $('<span></span>').appendTo('body');
				spyOn(T, 'styleElement');
				T.unHighlightElement.call(window.$test_elem);
				expect(T.styleElement.callCount).toEqual(1);
			});
			it('should highlight elements before debug', function(){
				spyOn(T, 'highlightAllElements');
				T.debug();
				expect(T.highlightAllElements).toHaveBeenCalled();
			});
			it('should call highlight on each element in the tracked_elems array', function(){
				spyOn(T, 'highlightElement');
				T.tracked_elems = {
					'X' : $('<span></span>').add($('<span></span>'))
				};
				T.highlightAllElements();
				expect(T.highlightElement.callCount).toEqual(2);
			});
			it('acts on tracked AND delegated objects', function(){
				spyOn(T, 'actOnTrackedElements');
				spyOn(T, 'actOnDelegatedElements');
				T.unHighlightAllElements();
				T.highlightAllElements();
				expect(T.actOnTrackedElements.callCount).toEqual(2);
				expect(T.actOnDelegatedElements.callCount).toEqual(2);
			});
			it('unhighlights all elements', function(){
				T.unHighlightAllElements();
				T.undebug();
			});
			it('bind the debug hover style', function(){
				window.$test_elem = $('<span></span>');
				spyOn(window.$test_elem, 'hover');
				T.bindDebugHover(window.$test_elem, 'test');
				expect(window.$test_elem.hover).toHaveBeenCalled();
			});
			it('leaves debug mode', function(){
				T.debugging = true;
				T.undebug();
				expect(T.debugging).toEqual(false);
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
				expect(T.normalizeVersion('0.9.0')).toEqual(90);
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

	/* @end */

	/* @group behaviors */

		/* Coming soon */

	/* @end */

	/* @group user-reported issues */

		/* Coming soon */

	/* @end */

	/* @group init */

		jasmine.getEnv().addReporter( new jasmine.TrivialReporter() );
		jasmine.getEnv().execute();

	/* @end */

})();

