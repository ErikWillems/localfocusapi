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

    var allowedOrigins = [];

    function widgetObject(e){
        var element = e, onFunctions = {}, w = this, listener = null;

        var listen = function(){
            if(!listener){
                listener = function(e) {
                    // Check source
                    if(e.source !== element.contentWindow){
                        return;
                    }
                    // Check origin
                    if(allowedOrigins.length && allowedOrigins.indexOf(e.origin) === -1){
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
                        //delete onFunctions[request.action];
                    }

                    // Listen to click events
                    if(request.action === 'click' && typeof onFunctions[request.action] === 'function'){
                        onFunctions[request.action].call(w, request.item);
                    }

                    // Listen to interact events
                    if(request.action === 'interact' && typeof onFunctions[request.action] === 'function'){
                        onFunctions[request.action].call(w, request.type, request.subType);
                    }

                    if(request.action === 'setDataStore' && typeof onFunctions.special === 'function'){
                        var d = request.dataStore;
                        var respond = {
                            'groups':d.groups,
                            'items':d.items,
                            'styling':d.styling,
                            'settings':d.settings
                        }
                        if(d.records){
                            respond.records = d.records;
                        }
                        onFunctions.special.call(w, respond);
                        delete onFunctions.special;
                    }

                    if(request.action === 'getDownload' && typeof onFunctions['getDownload'] === 'function'){
                        var url = (request.id)? e.origin + '/download/get/' + request.id: null;
                        onFunctions['getDownload'].call(w, {'url': url});
                        delete onFunctions['getDownload'];
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
                    // .on() supports the following actions: loaded, ready or click, interact
                    var validActions = ['loaded', 'ready', 'click', 'interact'];
                    if(validActions.indexOf(action) === -1){
                        throw('Not a valid action:', action);
                    }
                    if(typeof func !== 'function'){
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
            this.getDataStore = function(){
                var callback, settings;
                if(arguments.length === 2){
                    callback = arguments[1];
                    settings = arguments[0];
                } else {
                    callback = arguments[0];
                    settings = {'records': false};
                }
                onFunctions['special'] = callback;
                send({action:'getDataStore', settings: settings});
                listen();
                return this;
            };
            this.setDataStore = function(dataStore){
                send({action:'setDataStore',dataStore: dataStore});
                return this;
            };
            this.getDownload = function(format, callback){
                onFunctions['getDownload'] = callback;
                send({action:'getDownload', format: format});
                listen();
                return this;
            };
        } else {
            this.on = noop;
            this.activate = noop;
            this.resume = noop;
            this.element = noop;
            this.getDataStore = noop;
            this.getDownload = noop;
            this.setDataStore = noop;
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
    };

    var checkOrigin = function(elem){
        var allow = false;
        if(allowedOrigins.length){
            // Allowed origin is set
            forEach(allowedOrigins, function(origin){
                if(elem && typeof elem.src === 'string' && elem.src.indexOf(origin) === 0){
                    // Allow
                    allow = true;
                }
            });
        } else {
            // Allowed origin is not set
            allow = true;
        }
        return allow;
    };

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
            // Check origin
            if(elem && checkOrigin(elem)){
                return new widgetObject(elem);
            } else {
                return new widgetObject(null);
            }
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
        allowOrigin: function(origin){
            if(typeof origin === 'string'){
                allowedOrigins.push(origin);
            }
            return this;
        }
    }
})();