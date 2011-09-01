/* 
	trackiffer: easy GA event tracking and debugging

	Edit the tracking rules to create simple click-based event trackers for GA events.
	At any time, you can visit a page in your browser and paste this code into the console to test.
	Add this script at the verrrry bottom of a site to start tracking.
*/ 


/* @group core - don't even go there */

	(function(){

		var debug = false,
			rules; 

		window.trackiffer = function(_rules){

			rules = _rules;

			if(rules === true){
				setDebug();
			} else {
				waitForjQuery();
			}

		};

		function track(){
			for(selector in rules){
				jQuery(selector).each(function(){
					trackClick(rules[selector], $(this));
				});
			};
		};

		function loadScript(src){
			var new_script = document.createElement('script'),
				first_script = document.getElementsByTagName('script')[0]; 
			new_script.type = 'text/javascript';
			new_script.src = src;
			first_script.parentNode.insertBefore(new_script, first_script);
		}

		function trackClick(click_event, $link){
			var click_event = click_event.slice(0),
				link_text = $link.text(),
				url = $link.attr('href'),
				is_external = url.indexOf(location.host) == -1 && url.match(/^http/i),
				link_text_capitalized = link_text.charAt(0).toUpperCase() + link_text.slice(1);
			click_event.unshift('_trackEvent');
			if(click_event[3]){
				click_event[3] = click_event[3].replace('#TEXT#', link_text_capitalized);
			}
			$link.click(function(event){
				_gaq.push(click_event);
				if(debug){
					return false;
				} else if (is_external) {
					setTimeout('document.location = "' + url + '"', 100);
				}
			});      
		};

		function waitForjQuery(){
			(typeof window.jQuery === 'undefined') ? setTimeout(waitForjQuery, 100) : track();
		};

		function setDebug(){
			debug = true;
			_gat = undefined;
			_gaq = [['_setAccount', 'UA-11111111-1']];
			loadScript('http://www.google-analytics.com/u/ga_debug.js');
		}

		window.jQuery || loadScript('http://ajax.googleapis.com/ajax/libs/jquery/1.2.6/jquery.min.js');

	})();

/* @end */
