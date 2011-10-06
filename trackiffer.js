/*
 * Trackiffer v0.2.2
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
		
			version : '0.2.2',

			is_oldbrowser : 
				(navigator.userAgent.indexOf('MSIE 6') != -1) ||
				(navigator.userAgent.indexOf('MSIE 7') != -1),

			jquery : {
				'min_version' : '1.4.0',
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
				_t.defineGa();
				_t.checkHash();
				_t.checkjQuery();
			},

			rules : {},

		/* @end */
		
		/* @group requirements */
		
			loadScript : function(src){
				_t.log('|    loading ' + src);
				var new_script = document.createElement('script'),
					first_script = document.getElementsByTagName('script')[0]; 
				new_script.type = 'text/javascript';
				new_script.src = src;
				first_script.parentNode.insertBefore(new_script, first_script);
			},
		
			checkjQuery : function(){
				_t.log('');
				_t.log('+ checking for jQuery');
				if(_t.isjQueryVersionHighEnough() === false){
					_t.log('|    jQuery version too low');
					_t.loadScript('http://ajax.googleapis.com/ajax/libs/jquery/1.6.3/jquery.min.js');
					_t.polljQueryVersion();
				} else {
					_t.log('|    jQuery present');
					_t.jquery.loaded = true;
					_t.bindRules();
				}
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
				var version = (typeof window.jQuery === 'function') && jQuery.fn.jquery || '0',
					normalized_version = _t.normalizeVersion(version),
					normalized_min = _t.normalizeVersion(_t.jquery.min_version),
					is_high_enough = normalized_version > normalized_min;
				is_high_enough || _t.log('|    wrong version: ' + version + ' (needs to be > ' + _t.jquery.min_version + ')');
				return is_high_enough;
			},

			polljQueryVersion : function(){
				_t.log('|    waiting 100ms');
				_t.isjQueryVersionHighEnough() ? _t.jQueryHasLoaded() : setTimeout(_t.polljQueryVersion, 100);
			},

			jQueryHasLoaded : function(){
				_t.log('|    loaded jQuery');
				_t.jquery.loaded = true;
				jQuery.noConflict();
				_t.bindRules();
			},

		/* @end */
		
		/* @group formatting data */
		
			formatData : function(event_data, $elem){
				var parsed_event_data = _t.parseTokens(event_data, $elem);
				parsed_event_data.unshift('_trackEvent');
				return parsed_event_data;
			},

			getReplacement : function(match, $elem){
				var replacement;
				if(match){
					switch(match){
						case '#VALUE#':
							replacement = $elem.val();
							break;
						case '#TEXT#':
							replacement = $elem.text();
							break;
						default:
							var attribute = match.replace(/\#/g, '').toLowerCase();
							replacement = $elem.attr(attribute);
					} 
					return replacement;
				}
			},

			parseTokens : function(event_data, $elem){
				for(var i = 0, data_length = event_data.length; i < data_length; i++){
					var value = event_data[i],
						safe_value,
						should_be_string = (i !== 3);
					if(typeof value === 'function'){
						value = value($elem);
					} else if(should_be_string){
						var pattern = /#.+?#/g,
							match_array = value.match(pattern),
							replacement,
							trimmed_replacement;
						if(match_array){
							for(var ii = 0, match_length = match_array.length; ii < match_length; ii++){
								replacement = _t.getReplacement(match_array[ii], $elem);
								if(replacement){
									trimmed_replacement = jQuery.trim(replacement);
									value = value.replace(pattern, trimmed_replacement);
								}
							}
						}
					}
					safe_value = _t.replaceBadCharacters(value);
					event_data[i] = safe_value;
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
		
			isDestinationOutbound : function($elem){

				var destination = $elem.attr('href') || $elem.attr('action'),
					is_outbound = false;

				if(destination){
				
					var current_host = window.location.host,

						// email link
						mailto_matches = destination.match('mailto:'),
						is_mailto = mailto_matches !== null,

						// file
						document_matches = destination.match(/\.(?:doc|eps|jpg|png|svg|xls|ppt|pdf|xls|zip|txt|vsd|vxd|js|css|rar|exe|wma|mov|avi|wmv|mp3)($|\&|\?)/),
						is_document = document_matches !== null,

						// external host
						host_matches = destination.match(current_host),
						is_other_host = host_matches === null;

					is_outbound = is_other_host || is_mailto || is_document;

				}

				return !!is_outbound;

			},

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
				_t.debugging || $elem.unbind(event_type + '.trackiffer');
				setTimeout(repeat_action, 100);
			},
		
		/* @end */
		
		/* @group binding */
		
			trackRules : function(rules){
				_t.rules = rules;
				_t.jquery.loaded ? _t.bindRules() : _t.log('|    delaying init until jQuery loads');
			},

			bindRules : function(){
				_t.log('');
				_t.log('+  binding rules');
				for(var selector in _t.rules){
					if (_t.rules.hasOwnProperty(selector)) {
						_t.bindRulesToSelector(selector);
					}
				}
				_t.debugging && _t.highlightAllElements();
				_t.rules = {};
			},

			bindRulesToSelector : function(selector){
				var $elems = jQuery(selector);
				$elems.each(function(i){
					i === 0 && _t.log('|    ' + $elems.length + 'x ' + selector);
					_t.bindEvent(_t.rules[selector], jQuery(this), selector);
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

			debug_outlines : {
				'highlight' : 'rgb(0,200,200) 3px solid',
				'hover' : 'rgb(250,0,0) 3px solid',
			},

			checkHash : function(){
				_t.debugging = window.location.hash === '#trackiffer_debug';
				_t.debugging && _t.debug();
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
				_t.debug_outlines.property = _t.is_oldbrowser ? 'border' : 'outline';
				_t.highlightAllElements();
				jQuery(window).keydown(_t.leaveDebugIfEsc);
			},

			undebug : function(){
				_t.debugging = false;
				_t.log('+  leaving debug mode');
				_t.unHighlightAllElements();
			},

			highlightAllElements : function(){
				_t.actOnAllElements(_t.highlightElement);
			},

			unHighlightAllElements : function(){
				_t.actOnAllElements(_t.unHighlightElement);
			},

			actOnAllElements : function(method){
				for(var rule in _t.tracked_elems){
					if (_t.tracked_elems.hasOwnProperty(rule)) {
						jQuery.each(_t.tracked_elems[rule], method);
					}
				}
			},

			unHighlightElement : function(){
				jQuery(this).css(_t.debug_outlines.property, '');
			},

			highlightElement : function(){
				jQuery(this).css(_t.debug_outlines.property, _t.debug_outlines.highlight);
			},

			hoverElement : function(){
				jQuery(this).css(_t.debug_outlines.property, _t.debug_outlines.hover);
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

			leaveDebugIfEsc : function(event){
				event.keyCode === 27 && _t.undebug();
			}

		/* @end */

	};

	window.trackiffer = function(argument){
		
		var is_rules = typeof argument === 'object',
			is_method = typeof _t[argument] === 'function',
			return_data = _t;

		if (is_rules){
			_t.trackRules(argument);
		} else if(is_method) {
			return_data = _t[argument]();
		} else if(argument){
			return_data = _t[argument];
		} 

		return return_data;

	};

	_t.init();

})(document, window);
