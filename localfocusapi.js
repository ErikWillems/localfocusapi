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
                type:'LocalFocusAPI',
                request:request
            };
            element.contentWindow.postMessage( JSON.stringify(message),"*");
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
                for (var i = 0; i < elems.length; i++) {
                    loop.call(new widgetObject(elems[i]));
                };
            }
            return null;
        }
    }
})();