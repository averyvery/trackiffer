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
 * Edit the tracking rules to create simple click-based event trackers for GA events.
 * At any time, you can visit a page in your browser and paste this code into the console to test.
 * Add this script at the verrrry bottom of a site to start tracking.
 *
 * Should be compressed with http://jscompress.com/
 */

(function(document, window){

	/* @group setup */
	
		"use strict";

		var publik = {
				'version' : function(){
					return '0.1.8'; 
				}
			},
			debug_mode = document.location.hash === '#trackiffer_debug',
			debug_css = {
				'outline' : 'rgba(0,200,200,.35) 3px solid'
			},
			debug_highlight_css = {
				'outline' : 'rgba(250,0,0,.7) 3px solid'
			},
			jquery_high_enough = false,
			jquery_loaded = false,
			rule_dom_elements = {},
			event_types = {
				'form' : 'submit',
				'select' : 'change',
				'input[type=text]' : 'blur'
			};

		window._gaq = window._gaq || [];

		function queuedCall(){}
	
		function init(){
			loadjQuery();
			debug_mode && jQuery(window).load(publik.debug);
		}

	/* @end */

	/* @group loading requirements */
	
		
		function loadjQuery(){
			isjQueryVersionHighEnough() || loadScript('http://ajax.googleapis.com/ajax/libs/jquery/1.6.2/jquery.min.js');
			checkjQuery();
		}

		function normalizeVersion(version) {
			var version_string = version + '',
				version_nodecimals = version_string.replace(/\./g, '');
			while (version_nodecimals.length < 3) {
				version_nodecimals = version_nodecimals + '0';
			}
			return parseInt(version_nodecimals, 10);
		}

		function isjQueryVersionHighEnough(){
			var version = window.jQuery && jQuery.fn.jquery || '0',
				normalized_version = normalizeVersion(version);
			log('Checking jQuery version: ' + version + ' (needs to be 1.4+)');
			if(normalized_version > 140) {
				jquery_high_enough = true;
			}
			return jquery_high_enough;
		}

		function checkjQuery(){
			isjQueryVersionHighEnough() ? jQueryHasLoaded() : setTimeout(checkjQuery, 100);
		}

		function jQueryHasLoaded(){
			log('jQuery has loaded!');
			jquery_loaded = true;
			queuedCall();
		}

		function loadScript(src){
			log('Loading ' + src);
			var new_script = document.createElement('script'),
				first_script = document.getElementsByTagName('script')[0]; 
			new_script.type = 'text/javascript';
			new_script.src = src;
			first_script.parentNode.insertBefore(new_script, first_script);
		}
		
	/* @end */
	
	/* @group formatting data */
	
		function formatData(event_data, $elem){
			event_data = parseTokens(event_data, $elem);
			event_data.unshift('_trackEvent');
			return event_data;
		}

		function getReplacement(match, $elem){
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
		}

		function parseTokens(event_data, $elem){
			for(var i = 0, length = event_data.length; i < length; i++){
				var value = event_data[i];
				if(typeof value === 'function'){
					value = value($elem);
				} else {
					var pattern = /#.+?#/,
						match = value.match(pattern),
						attribute,
						replacement;
					replacement = jQuery.trim(getReplacement(match, $elem));
					if(replacement){
						value = value.replace(pattern, replacement);
					}
				}
				value = replaceBadCharacters(value);
				event_data[i] = value;
			}
			return event_data;
		}

		function replaceBadCharacters(string){
			if(string.replace){
				string = string.replace(/,/g, '\\,');
				string = string.replace(/"/g, '\\\"');
				string = string.replace(/'/g, '\\\'');
			}
			return string;
		}
	
	/* @end */
	
	/* @group delaying actions */
	
		function executeDelayedAction(event_type, $elem){
			var elem = $elem.get(0);
			log('Firing delayed ' + event_type + '!');
			if(debug_mode !== true){
				$elem.trigger(event_type);
				elem.submit && elem.submit();
				if(event_type === 'click' && $elem.hasClass('nofollow') === false){
					window.location = $elem[0].href;
				}
			}
		}

		function delayAction(event, event_type, $elem){
			event.preventDefault();
			var repeat_action = function(){
				executeDelayedAction(event_type, $elem);
			};
			$elem.unbind(event_type + '.trackiffer');
			setTimeout(repeat_action, 100);
		}
	
	/* @end */
	
	/* @group binding */
	
		function bindRules(rules){
			if(jquery_loaded){
				for(var selector in rules){
					if (rules.hasOwnProperty(selector)) {
						bindRulesToSelector(selector, rules);
					}
				}
			} else {
				log('Delaying bind until jQuery loads...');
				queuedCall = function(){
					bindRules(rules);
				};
			}
		}

		function bindRulesToSelector(selector, rules){
			jQuery(selector).each(function(){
				bindEvent(rules[selector], jQuery(this), selector);
			});
		}

		function getEventType($elem){
			var event_type = 'click';
			for(var selector in event_types){
				if (event_types.hasOwnProperty(selector)) {
					if($elem.is(selector)){
						event_type = event_types[selector];
					}
				}
			}
			return event_type;
		}

		function isDestinationOutbound($elem){
			var host = location.host !== '' || 'localhost',
				url = $elem.attr('href') || $elem.attr('action') || '',
				is_outbound = url.indexOf(host) === -1 && url.match(/^http/i);
			return !!is_outbound;
		}


		function bindEvent(event_data, $elem, selector){
			var event_type = getEventType($elem),
				handler = function(event){
					var stored_event_data = formatData(event_data.slice(0), $elem),
						is_outbound = isDestinationOutbound($elem);
					window._gaq.push(stored_event_data);
					if (is_outbound){
						log('Delaying outbound action...');
						delayAction(event, event_type, $elem, handler);
					} else if(debug_mode){
						return false;
					}
				};
			bindDebugHover(event_data, $elem, selector);
			$elem.bind(event_type + '.trackiffer', handler);
		}
	
	/* @end */

	/* @group debugging */
	
		function log(){
			if(debug_mode && typeof console === 'object' && console.log){
				var args = Array.prototype.slice.call(arguments); 
				args.unshift('---');
				console.log.apply(console, args);
			}
		}

		publik.debug = function(){
			debug_mode = true;
			log('Trackiffer entering debug mode.');
			log('Tracked links WILL NOT WORK and WILL NOT TRACK while in debug mode.');
			window._gat = undefined;
			window._gaq = [['_setAccount', 'UA-00000000-1']];
			loadScript('http://www.google-analytics.com/u/ga_debug.js');
			highlightAllElements();
		};

		publik.undebug = function(){
			debug_mode = false;
		};
	
	/* @end */
	
	/* @group debug feedback*/
	
		function hoverElement(){
			jQuery(this).css(debug_highlight_css);
		}

		function highlightElement(){
			jQuery(this).css(debug_css);
		}

		function highlightAllElements(){
			for(var rule in rule_dom_elements){
				if (rule_dom_elements.hasOwnProperty(rule)) {
					$.each(rule_dom_elements[rule], highlightElement);
				}
			}
		}

		function bindDebugHover(event_data, $elem, selector){
			var hover_all = function(){
				debug_mode && rule_dom_elements[selector].each(hoverElement);
			},
			hover_none = function(){
				debug_mode && rule_dom_elements[selector].each(highlightElement);
			};
			if(typeof rule_dom_elements[selector] === 'undefined'){
				rule_dom_elements[selector] = jQuery();
			}
			rule_dom_elements[selector] = rule_dom_elements[selector].add($elem);
			debug_mode && $elem.css(debug_css);
			$elem.hover(hover_all, hover_none);
		}
	
	/* @end */
	
	/* @group expose and init */
	
		window.trackiffer = function(method_or_rules){
			(typeof method_or_rules === 'object') ? bindRules(method_or_rules) : publik[method_or_rules]();
		};

		init();
	
	/* @end */
	
})(document, window);
