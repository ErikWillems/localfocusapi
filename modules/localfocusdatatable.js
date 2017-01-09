var LocalFocusDataTable = (function(){
	return {
		'create': function(widget, baseQuery, config){
			var tableElement = document.querySelector(baseQuery);
			if(!config){
				config = {};
			}
			var each = function(items, start, callback){
				if(!start){
					start = 0;
				}
				if(items && items.length){
					for (var i = start; i < items.length; i++) {
						var item = items[i];
						callback(item, i);
					};
				}
			};

			var recordFinder = function(dataStore){
				var restKeys = [];
				each(dataStore.groups, 2, function(group){
					each(dataStore.items, 0, function(item){
						if(item.group === group.key && item.active && item.current){
							restKeys.push(item.key);
						}
					});
				});
				var clone = function(arr){
					var r = [];
					for (var i = arr.length - 1; i >= 0; i--) {
						r.push(arr[i]);
					};
					return r;
				};
				return {
					'find': function(itemOne, itemTwo){
						var keys = clone(restKeys);
						keys.push(itemOne.key, itemTwo.key);
						keys.sort(function(a,b){
							return a-b;
						});
						var k = keys.join(',');
						if(typeof dataStore.records[k] === 'undefined'){
							return {'value': null};
						} else {
							return dataStore.records[k];
						}
						return null;
					}
				};
			};

			var newCheckbox = function(item, label){
				var d = document,
				label = d.createElement('label'),
				span = d.createElement('span'),
				checkbox = d.createElement('input');
				span.innerText = item.label;
				checkbox.type = 'checkbox';
				checkbox.checked = item.active;
				label.append(checkbox);
				label.append(span);
				return {
					'click': function(callback){
						checkbox.addEventListener('click', function(e) {
							item.active = !item.active;
							callback();
						});
						return this;
					},
					'element': function(){
						return label;
					}
				};
			};

			var transformNumber = function(nStr){
				if(typeof nStr !== 'number' && typeof nStr !== 'string'){
					return '-';
				}
                if(typeof nStr !== 'number'){
                    nStr = Number(nStr);
                }
                nStr = String(Number(nStr.toFixed(8)));
                var x = nStr.split('.');
                var thousand = (config.thousand)? config.thousand: '.';
                var comma =  (config.comma)? config.comma: ',';
                var x1 = x[0];
                var x2 = x.length > 1 ? comma + x[1] : '';
                var rgx = /(\d+)(\d{3})/;
                while (rgx.test(x1)) {
                    x1 = x1.replace(rgx, '$1' + thousand + '$2');
                }
                return x1 + x2;
			}

			return {
				'update': function(){
					if(!tableElement){
						return;
					}
					widget.getDataStore({'records': true}, function(dataStore){
						var groups = dataStore.groups,
						items = dataStore.items,
						horizontalGroup = groups[1],
						legendGroup = groups[0];
						// Reset table
						tableElement.innerHTML = '<thead></thead><tbody></tbody>';
						// Create header
						var headerRow = document.createElement('tr'),
						headerCol = document.createElement('th');
						headerRow.append(headerCol);
						each(items, 0, function(item){
							if(item.group === horizontalGroup.key){
								var newCol = document.createElement('th'),
								checkbox = newCheckbox(item).click(function(){
									widget.setDataStore({
										'items': dataStore.items
									});
								});
								newCol.append(checkbox.element());
								headerRow.append(newCol);
							}
						});
						tableElement.querySelector('thead').append(headerRow);

						var finder = recordFinder(dataStore);
						each(items, 0, function(item){
							// Add legend rows
							if(item.group === legendGroup.key){
								var row = document.createElement('tr'),
								col = document.createElement('td'),
								checkbox = newCheckbox(item).click(function(){
									widget.setDataStore({
										'items': dataStore.items
									});
								});
								col.append(checkbox.element());
								row.append(col);
								tableElement.querySelector('tbody').append(row);
								// Now loop over horizontal items
								each(items, 0, function(itemH){
									if(itemH.active && itemH.group === horizontalGroup.key){
										var newCol = document.createElement('td');
										var record = finder.find(item, itemH);
										newCol.innerText = transformNumber(record.value);
										row.append(newCol);
									}
								});
							}
						});
					});
				}
			};
		}
	}
})();