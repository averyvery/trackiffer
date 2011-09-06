/*
 * Trackiffer v0.1.3
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
 */

(function(document, window){

	var public = {},
		version = '0.1.3',
		debug_mode = false,
		debug_css = {
			'outline' : 'rgba(0,200,200,.5) 3px solid'
		},
		debug_highlight_css = {
			'outline' : 'rgba(250,0,0,.7) 3px solid'
		},
		jquery_version = '0',
		jquery_loaded = false,
		rule_dom_elements = {},
		event_types = {
			'form' : 'submit',
			'select' : 'change',
			'input[type=text]' : 'blur'
		};

	function queuedCall(){};

	function init(){
		loadjQuery();
	}

	function log(){
		if(debug_mode){
			var args = Array.prototype.slice.call(arguments); 
			args.unshift('---');
			console && console.log && console.log.apply(console, args);
		}
	};

	function loadjQuery(){
		isjQueryVersionHighEnough() || loadScript('http://ajax.googleapis.com/ajax/libs/jquery/1.6.2/jquery.min.js');
		checkjQuery();
	}

	function isjQueryVersionHighEnough(){
		version = window.jQuery && jQuery.fn.jquery || '0';
		log('Checking jQuery version: ' + version);
		if(parseInt(version) > 160) {
			log('High enough! Executing');
		}
		var version_int = parseInt(version.split('.').join(''));
		return version_int > 160;
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
		log('Script not detected. Loading ' + src);
		var new_script = document.createElement('script'),
			first_script = document.getElementsByTagName('script')[0]; 
		new_script.type = 'text/javascript';
		new_script.src = src;
		first_script.parentNode.insertBefore(new_script, first_script);
	}

	function bindRules(rules){
		if(jquery_loaded){
			for(selector in rules){
				jQuery(selector).each(function(){
					bindEvent(rules[selector], $(this), selector);
				});
			};
		} else {
			log('Delaying bind until jQuery loads...');
			queuedCall = function(){
				bindRules(rules);
			};
		}
	}

	function formatData(event_data, $elem){
		event_data = parseTokens(event_data, $elem);
		event_data.unshift('_trackEvent');
		return event_data;
	}

	function getReplacement(match, $elem){
		if(match){
			switch(match[0]){
				case '#VALUE#':
					replacement = $elem.val();
					break;
				case '#TEXT#':
					replacement = $elem.text();
					break;
				default:
					attribute = match[0].replace(/\#/g, '').toLowerCase();
					replacement = $elem.attr(attribute);
			} 
			return replacement;
		}
	}

	function capitaliseFirstLetter(value) {
		return value.charAt(0).toUpperCase() + value.slice(1);
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
				replacement = getReplacement(match, $elem);
				if(replacement){
					value = value.replace(pattern, replacement);
				}
			}
			value = capitaliseFirstLetter(value);
			event_data[i] = value;
		}
		return event_data;
	}

	function executeDelayedAction(event_type, $elem){
		log('Firing delayed ' + event_type + '!');
		if(debug_mode !== true){
			$elem.trigger(event_type);
			if(event_type === 'click' && $elem.hasClass('nofollow') === false){
				window.location = $elem[0].href;
			}
		}
	};

	function delayAction(event, event_type, $elem){
		event.preventDefault();
		event.stopImmediatePropagation();
		var repeat_action = function(){
			executeDelayedAction(event_type, $elem);
		}
		$elem.unbind(event_type + '.trackiffer');
		setTimeout(repeat_action, 100);
	}

	function getEventType($elem){
		var event_type = 'click';
		for(var selector in event_types){
			if($elem.is(selector)){
				event_type = event_types[selector];
			}
		}
		return event_type;
	}

	function isDestinationOutbound($elem){
		var is_outbound = false,
			url = $elem.attr('href') || $elem.attr('action') || '',
			host = location.host !== '' || 'localhost',
			is_outbound = url.indexOf(host) == -1 && url.match(/^http/i);
		return !!is_outbound;
	}

	function highlightElement(){
		$(this).css(debug_highlight_css);
	}

	function unHighlightElement(){
		$(this).css(debug_css);
	}

	function bindDebugHover(event_data, $elem, selector){
		var highlight_all = function(){
			if(debug_mode){
				rule_dom_elements[selector].each(highlightElement);
			}
		},
		highlight_none = function(){
			if(debug_mode){
				rule_dom_elements[selector].each(unHighlightElement);
			}
		};
		if(typeof rule_dom_elements[selector] === 'undefined'){
			rule_dom_elements[selector] = jQuery();
		}
		rule_dom_elements[selector] = rule_dom_elements[selector].add($elem);
		$elem.css(debug_css);
		$elem.hover(highlight_all, highlight_none)
	}

	function bindEvent(event_data, $elem, selector){
		var event_type = getEventType($elem),
			handler = function(event){
				var stored_event_data = formatData(event_data.slice(0), $elem),
					is_outbound = isDestinationOutbound($elem);
				_gaq.push(stored_event_data);
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

	// public methods
	public.debug = function(){
		debug_mode = true;
		log('Trackiffer entering debug mode.');
		log('Tracked links WILL NOT WORK and WILL NOT TRACK while in debug mode.');
		_gat = undefined;
		_gaq = [['_setAccount', 'UA-00000000-1']];
		loadScript('http://www.google-analytics.com/u/ga_debug.js');
	}

	public.undebug = function(){
		debug_mode = false;
	}

	public.version = function(){
		return version;
	}

	window.trackiffer = function(method_or_rules){
		(typeof method_or_rules === 'object') ? bindRules(method_or_rules) : public[method_or_rules]();
	}

	// finalize
	init();

})(document, window);
