/* LocalFocus API
    Version: 1.0
    2 december 2016
    By Erik Willems (twitter: @ehwillems)
*/

/*
The MIT License (MIT)

Copyright (c) 2015 LocalFocus

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

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
                    
                    // Listen to loaded and ready events
                    if((request.action === 'loaded' || request.action === 'ready') && typeof onFunctions[request.action] === 'function'){
                        onFunctions[request.action].call(w);
                        delete onFunctions[request.action];
                    }

                    // Listen to click events
                    if(request.action === 'click' && typeof onFunctions[request.action] === 'function'){
                        onFunctions[request.action].call(w, request.item);
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
            this.on = function(action, func){
                try {
                    // .on() supports the following actions: loaded, ready or click
                    if(action === 'loaded' && action === 'ready' && action === 'click'){
                        throw('Not a valid action:', action);
                    } 

                    if(func === 'function'){
                        throw('Not a valid function:', func);
                    }
                    onFunctions[action] = func;
                    listen();
                } catch(e){
                    window.console && window.console.error(e);
                }
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