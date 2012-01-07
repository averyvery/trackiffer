/*
 * Trackiffer v0.3.3
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
		
			version : '0.3.3',

			is_oldbrowser : 
				(navigator.userAgent.indexOf('MSIE 6') != -1) ||
				(navigator.userAgent.indexOf('MSIE 7') != -1),

			jquery : {
				'min_version' : '1.5.0',
				'loaded' : false
			},

			tracked_elems : {},

			delegated_elems : {},

			event_types : {
				'form' : 'submit',
				'select' : 'change'
			},

			defineGa : function(){
				window._gaq = window._gaq || [];
			},

			init : function(){
				_t.defineGa();
				_t.checkjQuery();
				setTimeout(_t.checkHash, 500);
			},

			rules : {},

		/* @end */
		
		/* @group requirements */
		
			loadScript : function(src){
				_t.log('|    loading ' + src);
				var new_script = document.createElement('script'),
					all_scripts = document.getElementsByTagName('script'),
					last_script = all_scripts[all_scripts.length - 1];
				new_script.type = 'text/javascript';
				new_script.src = src;
				last_script.parentNode.insertBefore(new_script, last_script.nextSibling);
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
				var method = event_data.shift(),
					parsed_event_data = _t.parseTokens(event_data, $elem);
				parsed_event_data.unshift(method);
				return parsed_event_data;
			},

			getReplacement : function(match, $elem){
				var replacement;
				if(match){
					switch(match){
						case '{{value}}':
							replacement = $elem.val();
							break;
						case '{{text}}':
							replacement = $elem.text();
							break;
						default:
							var attribute = match.replace(/\{\{/g, '').replace(/\}\}/g, '');
							replacement = $elem.attr(attribute);
					} 
					return replacement;
				}
			},

			parseTokens : function(event_data, $elem){
				for(var i = 0, data_length = event_data.length; i < data_length; i++){
					var value = event_data[i],
						safe_value,
						is_string = typeof value === 'string';
					if(typeof value === 'function'){
						value = value($elem);
					} else if(is_string){
						var pattern = /\{\{.+?\}\}/g,
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
		
			executeDelayedAction : function(event_type, $elem){
				var elem = $elem.get(0);
				if(_t.debugging !== true){
					elem.submit && elem.submit();
					if(event_type === 'click'){
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
				var $elems = jQuery(selector),
					rule = _t.rules[selector],
					logAndBind = function(i){
						i === 0 && _t.log('|    ' + $elems.length + 'x ' + selector);
						_t.bindEvent(rule, jQuery(this), selector);
					};
				$elems.each(logAndBind);
				rule && rule.delegate && logAndBind(0);
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

			isArray : function(obj){
			
				return obj.constructor.toString().indexOf("Array") !== -1;
			},

			elemHasUrl : function($elem){

				var url = $elem.attr('action') || $elem.attr('href'),
					url_is_not_hash = url && url.slice(0) !== '#';

				return url && url_is_not_hash;
			
			},

			bindEvent : function(rule_or_event_data, $elem, selector){

				var event_data = {
						delay : true,
						delegate : false,
						rule : rule_or_event_data,
						type : _t.getEventType($elem)
					}, 
					handler = function(event){

						_t.log('');

						if(event_data.delegate){
							_t.log('+  ' + event_data.type + ' on ' + event_data.delegate + ' delegated from ' + selector);
						} else {
							_t.log('+  ' + event_data.type + ' on ' + selector);
						}

						var formatted_event_data = _t.formatData(event_data.rule.slice(0), $elem);

						_t.log('|    parsing ', event_data);

						_t.log('v    ');
						window._gaq.push(formatted_event_data);
						_t.log('^    ');

						if (event_data.delay && _t.elemHasUrl($elem)){

							_t.log('|    outbound event - delaying');
							_t.delayAction(event, event_data.type, $elem, handler);

						} else if(_t.debugging){

							return false;

						}

					};

				if(_t.isArray(rule_or_event_data) === false){
					event_data = $.extend(event_data, rule_or_event_data);
				}

				if(event_data.delegate){
					$elem.delegate(event_data.delegate, event_data.type + '.trackiffer', handler);
				} else {
					$elem.bind(event_data.type + '.trackiffer', handler);
				}

				_t.bindDebugHover($elem, selector, event_data.delegate);

			},
		
		/* @end */
		
		/* @group debug */

			debugging : false,

			debug_wait_count : 0,

			debug_outlines : {
				'highlight' : 'rgb(0,200,200) 3px solid',
				'hover' : 'rgb(250,0,0) 3px solid',
				'highlight_delegated' : 'rgba(0,200,200, 0.3) 6px solid',
				'hover_delegated' : 'rgba(250,0,0, 0.3) 6px solid'
			},

			checkHash : function(){
				_t.debugging = window.location.hash === '#trackiffer_debug';
				if(_t.debugging){
					_t.log('+  debug hash detected');
					setTimeout(_t.debugAfterGALoads, 1000);
				}
			},

			debugAfterGALoads : function(){
				_t.log('|    waiting for GA to load before debugging...');
				var is_loaded = _gaq !== 'undefined' && _t.isArray(_gaq) === false;
				if(is_loaded){
					_t.log('|    GA has loaded');
					_t.log('');
					_t.debug();
				} else if (_t.debug_wait_count < 19){
					setTimeout(_t.debugAfterGALoads, 500);
					_t.debug_wait_count++;
				} else {
					_t.log('|    looks like GA isn\'t going to load');
					_t.log('|    shut it down');
				}
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
				_t.log('+  leaving debug mode');
				_t.debugging = false;
				_t.unHighlightAllElements();
			},

			highlightAllElements : function(){
				_t.actOnTrackedElements(_t.highlightElement);
				_t.actOnDelegatedElements(_t.highlightDelegatedElement);
			},

			unHighlightAllElements : function(){
				_t.actOnTrackedElements(_t.unHighlightElement);
				_t.actOnDelegatedElements(_t.unHighlightElement);
			},

			actOnTrackedElements : function(method){
				for(var rule in _t.tracked_elems){
					if (_t.tracked_elems.hasOwnProperty(rule)) {
						jQuery.each(_t.tracked_elems[rule], method);
					}
				}
			},

			actOnDelegatedElements : function(method){
				for(var rule in _t.delegated_elems){
					if (_t.delegated_elems.hasOwnProperty(rule)) {
						jQuery.each(_t.delegated_elems[rule], method);
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

			highlightDelegatedElement : function(){
				jQuery(this).css(_t.debug_outlines.property, _t.debug_outlines.highlight_delegated);
			},

			hoverDelegatedElement : function(){
				jQuery(this).css(_t.debug_outlines.property, _t.debug_outlines.hover_delegated);
			},

			bindDebugHover : function($elem, selector, delegated){
				var elem_list = delegated ? _t.delegated_elems : _t.tracked_elems, 
					hover_all = function(){
						_t.debugging && elem_list[selector].each(delegated ? _t.hoverDelegatedElement : _t.hoverElement);
					},
					hover_none = function(){
						_t.debugging && elem_list[selector].each(delegated ? _t.highlightDelegatedElement : _t.highlightElement);
					};
					if(typeof elem_list[selector] === 'undefined'){
						elem_list[selector] = jQuery();
					}
				elem_list[selector] = elem_list[selector].add($elem);
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
