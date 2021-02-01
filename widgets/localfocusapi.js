/* 
 * LocalFocus API
 * Version: 1.2
*/
var LocalFocusAPI = (function(window, document){
	// Only allow messages from LocalFocus origins
	var LocalFocusOrigins = [
		'https://localfocuswidgets.net', // Current server
		'https://localfocus2.appspot.com' // Legacy server
	];
	var WidgetObject = function(element){
		var onReady = null;
		var methods = {
			'on': function(event, callback){
				if(event === 'ready' && typeof callback === 'function'){
					onReady = callback;
				}
				return methods;
			},
			'activate': function(str){
				if(typeof str === 'string'){
					element.contentWindow.postMessage(JSON.stringify({
						'type': 'LocalFocusAPI',
						'request': {
							'action': 'activate', 
							'target': str
						}
					}), '*');
				}
				return methods;
			},
			'element': function(){
				return element;
			}
		};
		// Attach a postmessage listener
		window.addEventListener('message', function(event){
			var message = null;
			if(event.source === element.contentWindow && LocalFocusOrigins.indexOf(event.origin) !== -1){
				// Postmessage origins from selected LocalFocus iframe 
				try {
					message = JSON.parse(event.data);
				} catch (err){
					// Data is not valid json
				}
				if(message && typeof message === 'object' && message.type === 'LocalFocusAPI'){
					if(message.request.action === 'ready' && typeof onReady === 'function'){
						// Call the ready event
						onReady.call(methods);
					}
				}
			}
		}, false);
		return methods;
	};
	return {
		'select': function(str){
			var element = (typeof str === 'string')? document.querySelector(str): str;
			// Check if element is an iframe element
			if(element && (element instanceof window.Element || element instanceof window.HTMLDocument) && element.contentWindow){
				return new WidgetObject(element);
			}
		}
	};
})(window, document);
