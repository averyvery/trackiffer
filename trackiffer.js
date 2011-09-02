/* 
	trackiffer: easy GA event tracking and debugging

	Edit the tracking rules to create simple click-based event trackers for GA events.
	At any time, you can visit a page in your browser and paste this code into the console to test.
	Add this script at the verrrry bottom of a site to start tracking.
*/ 

(function(){

	var public = {},
		debug_mode = false,
		jquery_loaded = false,
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
			args.unshift('TRKFR ---');
			console && console.log && console.log.apply(console, args);
		}
	};

	function loadjQuery(){
		window.jQuery || loadScript('http://ajax.googleapis.com/ajax/libs/jquery/1.6.2/jquery.min.js');
		checkjQuery();
	}

	function checkjQuery(){
		var version = window.jQuery && jQuery.fn.jquery;
		log('jQuery version: ' + version);
		version = version.split('.').join('');
		(parseInt(version) > 160) ? jQueryHasLoaded() : setTimeout(checkjQuery, 100);
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

	function bindRules(rules){
		if(jquery_loaded){
			for(selector in rules){
				jQuery(selector).each(function(){
					bindEvent(rules[selector], $(this));
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
		log('Tracking', event_data);
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
			event_data[i] = value;
		}
		return event_data;
	}

	function delayAction(event, event_type, $elem){
		event.stopImmediatePropagation();
		var repeat_action = function(){
			$elem.trigger(event);
		}
		$elem.unbind(event + '.trackiffer');
		setTimeout(repeat_action, 3000);
		return false;
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

	function bindEvent(event_data, $elem){
		var event_type = getEventType($elem),
			handler = function(event){
				var stored_event_data = formatData(event_data.slice(0), $elem),
					is_outbound = isDestinationOutbound($elem);
				_gaq.push(stored_event_data);
				if(debug_mode){
					log('Delaying outbound action...');
					return false;
				} else if (is_outbound){
					delayAction(event, event_type, $elem);
				}
			};
		$elem.bind(event_type + '.trackiffer', handler);

	}

	// public methods
	public.debug = function(){
		debug_mode = true;
		log('Debug mode!');
		_gat = undefined;
		_gaq = [['_setAccount', 'UA-11111111-1']];
		loadScript('http://www.google-analytics.com/u/ga_debug.js');
	}

	window.trackiffer = function(method_or_rules){
		(typeof method_or_rules === 'object') ? bindRules(method_or_rules) : public[method_or_rules]();
	}

	// finalize
	init();

})();

