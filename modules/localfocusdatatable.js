/*
	Methods:

	// Create a dataTable
	// Pass a widgetObject, element (or string for the querySelector) and settings (optional)
	var table = LocalFocusDataTable.create(widgetObject, element, settings);

	// Update dataTable
	// Pass a dataStore with records (optional)
	table.update(dataStore);


	// Example
	var settings = {
		thousand: ".", // Thousand seperator for table values
		comma: "," // Decimal seperator for table values
	};
	var element = document.querySelector("#table");
	var dataTable = LocalFocusDataTable.create(widgetObject, element, settings);
	dataTable.update();
*/

var LocalFocusDataTable = (function(){
	return {
		'create': function(widget, baseQuery, config){
			var tableElement;
			if(typeof baseQuery === 'string'){
				tableElement = document.querySelector(baseQuery);
			} else {
				tableElement = baseQuery;
			}
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

			var newCheckbox = function(item){
				var d = document,
				colorSpan = d.createElement('span'),
				label = d.createElement('label'),
				span = d.createElement('span'),
				checkbox = d.createElement('input');
				if(item && typeof item.color === 'string'){
					colorSpan.style['background-color'] = item.color;
					colorSpan.setAttribute('class', 'datatable-color-span datatable-color-span-active');
				} else {
					colorSpan.setAttribute('class', 'datatable-color-span datatable-color-span-inactive');
				}
				span.innerText = item.label;
				checkbox.type = 'checkbox';
				checkbox.checked = item.active;
				label.appendChild(colorSpan);
				label.appendChild(checkbox);
				label.appendChild(span);
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
			};

			var update = function(dataStore){
				if(!dataStore || !dataStore.groups || !dataStore.items || !dataStore.records){
					window.console && console.error('Could not update dataTable. Parts are missing.');
					return;
				}
				var groups = dataStore.groups,
				items = dataStore.items,
				horizontalGroup = groups[1],
				legendGroup = groups[0];
				// Reset table
				tableElement.innerHTML = '<thead></thead><tbody></tbody>';
				// Create header
				var headerRow = document.createElement('tr'),
				headerCol = document.createElement('th');
				headerRow.appendChild(headerCol);
				each(items, 0, function(item){
					if(item.group === horizontalGroup.key){
						var newCol = document.createElement('th'),
						checkbox = newCheckbox(item).click(function(){
							widget.setDataStore({
								'items': dataStore.items
							});
						});
						newCol.appendChild(checkbox.element());
						headerRow.appendChild(newCol);
					}
				});
				tableElement.querySelector('thead').appendChild(headerRow);

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
						col.appendChild(checkbox.element());
						row.appendChild(col);
						tableElement.querySelector('tbody').appendChild(row);
						// Now loop over horizontal items
						each(items, 0, function(itemH){
							if(itemH.group === horizontalGroup.key){
								var newCol = document.createElement('td');
								var record = finder.find(item, itemH);
								newCol.innerText = transformNumber(record.value);
								row.appendChild(newCol);
							}
						});
					}
				});
			};

			return {
				'update': function(dataStore){
					if(!tableElement){
						return;
					}
					if(dataStore){
						update(dataStore);
					} else {
						widget.getDataStore({'records': true}, function(d){
							update(d);
						});
					}
				}
			};
		}
	}
})();