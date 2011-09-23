/*
 * Trackiffer v0.1.8
 * Easy GA event tracking and debugging
 * https://github.com/averyvery/trackiffer
 *
 * Copyright 2011, Doug Avery
 * Dual licensed under the MIT and GPL licenses.
 * Uses the same license as jQuery, see:
 * http://jquery.org/license
 *
 * Should be compressed with http://jscompress.com/
 */

(function(document, window){

	"use strict";

	var _t = {

		/* @group setup */
		
			version : '0.1.8',

			jquery : {
				'min_version' : '1.4.0',
				'high_enough' : null,
				'loaded' : false
			},

			tracked_elems : {},

			event_types : {
				'form' : 'submit',
				'select' : 'change',
				'input[type=text]' : 'blur'
			},

			defineGa : function(){
				window._gaq = window._gaq || [];
			},

			init : function(){
				_t.checkHash();
				_t.checkjQuery();
			},

			stored_rules : {},

		/* @end */
		
		/* @group requirements */
		
			checkjQuery : function(){
				_t.log('');
				_t.log('+ checking for jQuery');
				_t.isjQueryVersionHighEnough() || _t.loadScript('http://ajax.googleapis.com/ajax/libs/jquery/1.6.2/jquery.min.js');
				_t.polljQueryVersion();
			},

			normalizeVersion : function(version) {
				var version_string = version + '',
					version_nodecimals = version_string.replace(/\./g, '');
				while (version_nodecimals.length < 3) {
					version_nodecimals = version_nodecimals + '0';
				}
				return parseInt(version_nodecimals, 10);
			},

			isjQueryVersionHighEnough : function(){
				var version = window.jQuery && jQuery.fn.jquery || '0',
					normalized_version = _t.normalizeVersion(version),
					normalized_min = _t.normalizeVersion(_t.jquery.min_version);
				if(normalized_version > normalized_min) {
					_t.jquery.high_enough = true;
				} else {
					_t.log('|    wrong version: ' + version + ' (needs to be > ' + _t.jquery.min_version + ')');
				}
				return _t.jquery.high_enough;
			},

			polljQueryVersion : function(){
				_t.log('|    waiting 100ms');
				_t.isjQueryVersionHighEnough() ? _t.jQueryHasLoaded() : setTimeout(_t.polljQueryVersion, 100);
			},

			jQueryHasLoaded : function(){
				_t.log('|    loaded jQuery');
				_t.jquery.loaded = true;
				_t.bindRules(_t.stored_rules);
			},

			loadScript : function(src){
				_t.log('|    loading ' + src);
				var new_script = document.createElement('script'),
					first_script = document.getElementsByTagName('script')[0]; 
				new_script.type = 'text/javascript';
				new_script.src = src;
				first_script.parentNode.insertBefore(new_script, first_script);
			},
		
		/* @end */
		
		/* @group formatting data */
		
			formatData : function(event_data, $elem){
				event_data = _t.parseTokens(event_data, $elem);
				event_data.unshift('_trackEvent');
				return event_data;
			},

			getReplacement : function(match, $elem){
				var replacement;
				if(match){
					switch(match[0]){
						case '#VALUE#':
							replacement = $elem.val();
							break;
						case '#TEXT#':
							replacement = $elem.text();
							break;
						default:
							var attribute = match[0].replace(/\#/g, '').toLowerCase();
							replacement = $elem.attr(attribute);
					} 
					return replacement;
				}
			},

			parseTokens : function(event_data, $elem){
				for(var i = 0, length = event_data.length; i < length; i++){
					var value = event_data[i];
					if(typeof value === 'function'){
						value = value($elem);
					} else {
						var pattern = /#.+?#/,
							match = value.match(pattern),
							attribute,
							replacement;
						replacement = jQuery.trim(_t.getReplacement(match, $elem));
						if(replacement){
							value = value.replace(pattern, replacement);
						}
					}
					value = _t.replaceBadCharacters(value);
					event_data[i] = value;
				}
				return event_data;
			},

			replaceBadCharacters : function(string){
				if(string.replace){
					string = string.replace(/,/g, '\\,');
					string = string.replace(/"/g, '\\\"');
					string = string.replace(/'/g, '\\\'');
				}
				return string;
			},
		
		/* @end */

		/* @group delay events */
		
			executeDelayedAction : function(event_type, $elem){
				var elem = $elem.get(0);
				if(_t.debugging !== true){
					$elem.trigger(event_type);
					elem.submit && elem.submit();
					if(event_type === 'click' && $elem.hasClass('nofollow') === false){
						window.location = $elem[0].href;
					}
				}
			},

			delayAction : function(event, event_type, $elem){
				event.preventDefault();
				var repeat_action = function(){
					_t.log('|    outbound event - firing after 100ms');
					_t.executeDelayedAction(event_type, $elem);
				};
				$elem.unbind(event_type + '.trackiffer');
				setTimeout(repeat_action, 100);
			},
		
		/* @end */
		
		/* @group binding */
		
			bindRules : function(rules){
				_t.stored_rules = rules;
				if(_t.jquery.loaded){
					_t.log('');
					_t.log('+  binding rules');
					for(var selector in rules){
						if (rules.hasOwnProperty(selector)) {
							_t.bindRulesToSelector(selector, rules);
						}
					}
				} else {
					_t.log('|    delaying init until jQuery loads');
				}
				_t.debugging && _t.highlightAllElements();
			},

			bindRulesToSelector : function(selector, rules){
				var $elems = jQuery(selector);
				$elems.each(function(i){
					i === 0 && _t.log('|    ' + $elems.length + 'x ' + selector);
					_t.bindEvent(rules[selector], jQuery(this), selector);
				});
			},

			getEventType : function($elem){
				var event_type = 'click';
				for(var selector in _t.event_types){
					if (_t.event_types.hasOwnProperty(selector)) {
						if($elem.is(selector)){
							event_type = _t.event_types[selector];
						}
					}
				}
				return event_type;
			},

			isDestinationOutbound : function($elem){
				var host = location.host !== '' || 'localhost',
					url = $elem.attr('href') || $elem.attr('action') || '',
					is_outbound = url.indexOf(host) === -1 && url.match(/^http/i);
				return !!is_outbound;
			},

			bindEvent : function(event_data, $elem, selector){
				var event_type = _t.getEventType($elem),
					handler = function(event){
						_t.log('');
						_t.log('+  ' + event_type + ' on ' + selector);
						var stored_event_data = _t.formatData(event_data.slice(0), $elem),
							is_outbound = _t.isDestinationOutbound($elem);
						_t.log('|    parsing ', event_data);
						_t.log('v    ');
						window._gaq.push(stored_event_data);
						_t.log('^    ');
						if (is_outbound){
							_t.log('|    outbound event - delaying');
							_t.delayAction(event, event_type, $elem, handler);
						} else if(_t.debugging){
							return false;
						}
					};
				_t.bindDebugHover(event_data, $elem, selector);
				$elem.bind(event_type + '.trackiffer', handler);
			},
		
		/* @end */
		
		/* @group debug */

			debugging : false,

			checkHash : function(){
				_t.debugging = document.location.hash === '#trackiffer_debug';
				_t.debugging && _t.debug();
			},
		
			debug_outlines : {
				'highlight' : 'rgba(0,200,200,.35) 3px solid',
				'hover' : 'rgba(250,0,0,.7) 3px solid'
			},

			log : function(){
				if(_t.debugging && typeof console === 'object' && console.log){
					var args = Array.prototype.slice.call(arguments); 
					args.unshift('');
					console.log.apply(console, args);
				}
			},
		
			undefineGa : function(){
				_t.log('|    unsetting existing GA');
				window._gat = undefined;
				window._gaq = [['_setAccount', 'UA-00000000-1']];
			},

			debug : function(){
				_t.debugging = true;
				_t.log('+  debug mode');
				_t.undefineGa();
				_t.loadScript('http://www.google-analytics.com/u/ga_debug.js');
				_t.highlightAllElements();
			},

			highlightAllElements : function(){
				for(var rule in _t.tracked_elems){
					if (_t.tracked_elems.hasOwnProperty(rule)) {
						$.each(_t.tracked_elems[rule], _t.highlightElement);
					}
				}
			},

			highlightElement : function(){
				jQuery(this).css('outline', _t.debug_outlines.highlight);
			},

			hoverElement : function(){
				jQuery(this).css('outline', _t.debug_outlines.hover);
			},

			bindDebugHover : function(event_data, $elem, selector){
				var hover_all = function(){
					_t.debugging && _t.tracked_elems[selector].each(_t.hoverElement);
				},
				hover_none = function(){
					_t.debugging && _t.tracked_elems[selector].each(_t.highlightElement);
				};
				if(typeof _t.tracked_elems[selector] === 'undefined'){
					_t.tracked_elems[selector] = jQuery();
				}
				_t.tracked_elems[selector] = _t.tracked_elems[selector].add($elem);
				$elem.hover(hover_all, hover_none);
			},

		/* @end */

	};

	window.trackiffer = function(argument){
		
		var is_rules = typeof argument === 'object',
			is_method = typeof _t[argument] === 'function';
		if (is_rules){
			_t.bindRules(argument);
		} else if(is_method) {
			_t[argument]();
		} else if(argument){
			return _t[argument];
		} else {
			return _t;
		};

	};

	_t.init();

})(document, window);
