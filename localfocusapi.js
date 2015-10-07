// LocalFocus API
// Version: 0.3
// 6 October 2015

var LocalFocusAPI = (function(){
    var oldBrowser = ((!window.SVGAngle && !document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#Shape", "1.1")) || !document.addEventListener || !document.querySelectorAll);

    function widgetObject(e){
        var element = e, onFunctions = {}, w = this, listener = null;

        var listen = function(){
            if(!listener){
                listener = function(e) {
                    if(e.source !== element.contentWindow){
                        return;
                    }
                    
                    var message;
                    try {
                        message = JSON.parse(e.data);
                    } catch (e) {
                        return;
                    }

                    if(typeof message !== 'object' || message.type !== 'LocalFocusAPI'){
                        return;
                    }
                    var request = message.request;
                    
                    if((request.action === 'loaded' || request.action === 'ready') && typeof onFunctions[request.action] === 'function'){
                        onFunctions[request.action].call(w);
                        delete onFunctions[request.action];
                    }

                    if(request.action === 'setDataStore' && typeof onFunctions.special === 'function'){
                        var d = request.dataStore;
                        onFunctions.special.call(w, {'groups':d.groups,'items':d.items,'styling':d.styling,'settings':d.settings});
                        delete onFunctions.special;
                    }
                };
                window.addEventListener("message",listener,false);
            }
        }

        var send = function(request){
            var message = {
                type: 'LocalFocusAPI',
                request: request
            };
            element.contentWindow.postMessage(JSON.stringify(message),"*");
        }

        var noop = function(){
            return this;
        }

        if(element){
            this.on = function(s,f){
                onFunctions[s] = f;
                listen();
                return this;
            };
            this.activate = function(target){
                send({action:'activate', target:target});
                return this;
            };
            this.wait = function(){
                send({action:'wait'});
                return this;
            };
            this.resume = function(){
                send({action:'resume'});
                return this;
            };
            this.element = function(){
                return element;
            };
            this.getDataStore = function(callback){
                onFunctions['special'] = callback;
                send({action:'getDataStore'});
                listen();
                return this;
            };
            this.setDataStore = function(dataStore){
                send({action:'setDataStore',dataStore: dataStore});
                return this;
            };
        } else {
            this.on = noop;
            this.activate = noop;
            this.resume = noop;
            this.element = noop;
            this.getDataStore = noop;
            this.setDataStore = noop;
        }        
    };


    var cachedLocation = null, geoData = [];

    var requestLocation = function(settings){
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(function(position) {
                var lat = position.coords.latitude,
                lon = position.coords.longitude,
                minDistance = Number.MAX_VALUE;
                hideInfoBox();
                forEach(geoData, function(){
                    var a = Math.abs(this[1] - lat),
                    b = Math.abs(this[0] - lon),
                    distance = Math.sqrt(a*a+b*b);
                    if(distance < minDistance){
                        minDistance = distance;
                        cachedLocation = this[2];
                    }
                });
            }, function(){
                hideInfoBox();
                cachedLocation = false;
            });
        } else {
            hideInfoBox();
            cachedLocation = false;
        }
    }; 

    var geoLocate = function(settings, callback, iteration){
        if(typeof iteration === 'undefined'){
            iteration = 0;
        }
        if(cachedLocation === false){
            return;
        }
        if(cachedLocation === null) {
            cachedLocation = true;
            requestLocation(settings);
        }
        if(cachedLocation === true){
            if(iteration < 30){
                setTimeout(function(){
                    iteration ++;
                    geoLocate(settings, callback, iteration);
                },1000);
            }
        } else if(typeof cachedLocation === 'number') {
            callback(cachedLocation);
        }
    };

    var forEach = function(items, callback){
        if(!items || !callback){
            return;
        }
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            callback.call(item, item, i);
        };
    }

    var hideInfoBox = function(){
        if(infoBox){
            if(infoBox.hasAttribute('data-slideup') && window.jQuery){
                $(infoBox).slideUp();
            } else {
                infoBox.style.display = 'none';
            }
        }
    };

    var infoBox = null;

    return {
        oldBrowser: function(){
            return oldBrowser;
        },
        select: function(d){
            if(oldBrowser){
                var elem = null;
            } else {
                var elem = (typeof d === 'string')?document.querySelector(d):d;
            }
            return new widgetObject(elem);
        },
        selectAll: function(d, loop){
            if(!oldBrowser){
                var elems = document.querySelectorAll(d);
                forEach(elems, function(elem){
                    loop.call(new widgetObject(elem));
                });
            }
            return null;
        },
        geo: function(settings){
            if(!settings || !settings.selector){
                return;
            }

            var widgets = document.querySelectorAll(settings.selector);

            if(widgets && settings['infoBox-place'] && settings['infoBox-node']){
                var place = document.querySelector(settings['infoBox-place']);
                if(place){
                    infoBox = document.createElement(settings['infoBox-node']);
                    if(settings['infoBox-class']){
                        infoBox.setAttribute('class', settings['infoBox-class']);
                    }
                    if(settings['infoBox-text']){
                        infoBox.innerText = settings['infoBox-text'];
                    }
                    if(settings['infoBox-html']){
                        infoBox.innerHTML = settings['infoBox-html'];
                    }
                    if(settings['infoBox-slideUp'] === true){
                        infoBox.setAttribute('data-slideup', 'true');
                    }
                    place.insertBefore(infoBox, place.firstChild);
                }
            }
            
            forEach(widgets, function(){
                var o = new widgetObject(this).on('ready', function(){
                    var widget = this;
                    geoLocate(settings,function(location){
                        widget.activate(location);
                    })
                });
            });
            return null;
        },
        loadGeo: function(data){
            forEach(data, function(){
                geoData.push(this);
            });
            return null;
        }
    }
})();