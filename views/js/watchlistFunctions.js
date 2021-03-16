var activeWatchlist = null

document.addEventListener("dataSet", function dataSetHandler(e){	
	initWatchlistContainer()
})

document.querySelector("#toggleWatchlistDisplay").addEventListener("click", function(e){
	toggleWatchlistDisplay(this)
})

function setWatchlistDisplay(watchlistID){
	if(watchlistID==null || !watchlists.hasOwnProperty(watchlistID))
		watchlistID = Object.keys(watchlists)[0];
	activeWatchlist = watchlistID
	let watchlistContainer = document.querySelector("#watchlistContainer")
	deleteAllChildren(watchlistContainer)
	let toggleSelectedWatchlistDiv = document.createElement("div")
	let watchlistInstrumentsDisplayDiv = document.createElement("div")
	let addInstrumentToWatchlistDiv = document.createElement("div")

	toggleSelectedWatchlistDiv.setAttribute("id", "toggleSelectedWatchlistDiv")
	watchlistInstrumentsDisplayDiv.setAttribute("id", "watchlistInstrumentsDisplayDiv")
	addInstrumentToWatchlistDiv.setAttribute("id", "addInstrumentToWatchlistDiv")

	watchlistInstrumentsDisplayDiv.setAttribute("watchlistID", watchlistID)

	setToogleAndCreateWatchlistOptions(toggleSelectedWatchlistDiv, watchlistID)
	setWatchlistInstrumentsDisplay(watchlistInstrumentsDisplayDiv, watchlistID)
	setAddInstrumentToWatchlistButton(watchlistID, addInstrumentToWatchlistDiv)

	watchlistContainer.appendChild(toggleSelectedWatchlistDiv)
	watchlistContainer.appendChild(watchlistInstrumentsDisplayDiv)
	watchlistContainer.appendChild(addInstrumentToWatchlistDiv)
}

function toggleWatchlistDisplay(toggleWatchlistButton){
	let watchlistContainer = document.querySelector("#watchlistContainer")
	let accountsContainer = document.querySelector("#accountsContainer")
	if(getComputedStyle(watchlistContainer, null).display=="block"){
		watchlistContainer.style.display = "none"
		accountsContainer.style.width = "100%";
		toggleWatchlistButton.innerText = ">";
		return
	}
	watchlistContainer.style.display = "block"
	accountsContainer.style.width = "75%"
	toggleWatchlistButton.innerText = "<"
}

function initWatchlistContainer(){
	return setWatchlistDisplay(null)
}

function setToogleAndCreateWatchlistOptions(toggleWatchlistDiv, watchlistID){
	let watchlistSelect = document.createElement("Select")
	let createWatchlist = document.createElement("Button")
	watchlistSelect.setAttribute("id", "watchlistSelect")
	let watchlistSelectFields = [{'inputField': 'watchlistID', 'outputField': 'value'}]
	createSelectOptionsList(watchlistSelect, watchlists, watchlistSelectFields, 'watchlistName', true, 'Select Watchlist', true, true)
	$(document).ready(function(){
		$('#watchlistSelect').select2();
	});

	$(document.body).on("change","#watchlistSelect",function(){
		let selWatchlistID = this.options[this.selectedIndex].value;
		setWatchlistDisplay(selWatchlistID)
	});

	watchlistSelect.value = watchlistID

	createWatchlist.setAttribute("id", "createWatchlist")
	createWatchlist.addEventListener("click", function(e){displayCreateWatchlistform()})
	createWatchlist.innerText = "Create New Watchlist"
	createWatchlist.classList.add("btn", "btn-default", "btn-sm")
	toggleWatchlistDiv.appendChild(watchlistSelect);
	toggleWatchlistDiv.appendChild(createWatchlist);

	return toggleWatchlistDiv;
}

function displayCreateWatchlistform(){
	let createWatchlistFormModal = document.querySelector("#createWatchlistFormModal")
	let createWatchlistForm = document.querySelector("#createWatchlistForm")
	let formFields = createWatchlistForm.querySelectorAll(".formField")
	formFields.forEach(function(formField, idx){createWatchlistForm.removeChild(formField)})
	let watchlistNameField = document.createElement("div")
	watchlistNameField.classList.add("formField")
	watchlistNameField.innerText = "Watchlist Name"
	let watchlistNameInput = document.createElement("input")
	watchlistNameInput.setAttribute("name", "watchlistName")
	watchlistNameInput.classList.add("formFieldInput")
	watchlistNameInput.setAttribute("type", "text")
	watchlistNameInput.setAttribute("placeholder", "New Watchlist")
	watchlistNameField.appendChild(watchlistNameInput)
	let submitButton = document.createElement("button")
	submitButton.classList.add("btn", "btn-default", "btn-sm", "formField")
	submitButton.innerText = "Submit"
	submitButton.addEventListener("click", function(e){processCreateWatchlistRequest()})
	createWatchlistForm.appendChild(watchlistNameField)
	createWatchlistForm.appendChild(submitButton)
	createWatchlistFormModal.style.display="flex";
}

function createToggleWatchlistDisplayButton(){
	let toggleDisplayButton = document.createElement("button")
	toggleDisplayButton.setAttribute("id", "toggleWatchlistDisplay")
	toggleDisplayButton.classList.add("btn", "btn-default", "btn-sm")
	toggleDisplayButton.innerText = "<"
	toggleDisplayButton.addEventListener("click", function(e){
		toggleWatchlistDisplay(this)
	})
	return toggleDisplayButton
}

function setWatchlistInstrumentsDisplay(watchlistInstrumentsDiv, watchlistID){
	let watchlistInstruments = watchlists[watchlistID]['instruments']
	if(Object.keys(watchlistInstruments).length==0){
		let instrumentRow = document.createElement("div")
		setWatchlistInsturmentRow(null, watchlistID, instrumentRow)
		watchlistInstrumentsDiv.appendChild(instrumentRow)
		return
	}
	Object.values(watchlistInstruments).forEach(function(instrumentObj){
		let currInstrumentRow = document.createElement("div")
		setWatchlistInsturmentRow(instrumentObj, watchlistID, currInstrumentRow)
		watchlistInstrumentsDiv.appendChild(currInstrumentRow)
	})
}

function setWatchlistInsturmentRow(instrumentObj, watchlistID, instrumentRow){
	if(instrumentObj==null){
		instrumentRow.innerText	= "There are currently no instruments tracked in this Watchlist"
		instrumentRow.setAttribute("noInstrumentsRow", "true")
		instrumentRow.classList.add("watchlistInstrumentRow")
		return
	}
	instrumentType = instrumentObj['instrumentType']
	if(instrumentType=="MF")return setWatchlistMfInstrumentRow(instrumentObj, watchlistID, instrumentRow);
	return setWatchlistEqInstrumentRow(instrumentObj, watchlistID, instrumentRow)
}

function setWatchlistEqInstrumentRow(instrumentObj, watchlistID, instrumentRow){
	instrumentRow.setAttribute("instrumentType", instrumentObj['instrumentType'])
	instrumentRow.setAttribute("instrumentID", instrumentObj['instrumentID'])
	instrumentRow.classList.add("watchlistInstrumentRow")
	let instrumentName = document.createElement("div")
	let instrumentValues = document.createElement("div")
	let instrumentDelete = document.createElement("div")
	instrumentRow.appendChild(instrumentName)
	instrumentRow.appendChild(instrumentValues)
	instrumentRow.appendChild(instrumentDelete)
	instrumentName.classList.add("trackedInstrumentName")
	instrumentValues.classList.add("trackedInstrumentValue")
	instrumentDelete.classList.add("trackedInstrumentDelete")
	instrumentName.innerText = instrumentObj['displayName']
	setEQWatchlistInstrumentValue(instrumentObj['instrumentID'], instrumentValues)
	instrumentDelete.append(setDeleteInstrumentFromWatchlistButton(watchlistID, instrumentObj))
}

function setWatchlistMfInstrumentRow(instrumentObj, watchlistID, instrumentRow){
	instrumentRow.setAttribute("instrumentType", instrumentObj['instrumentType'])
	instrumentRow.setAttribute("instrumentID", instrumentObj['instrumentID'])
	instrumentRow.classList.add("watchlistInstrumentRow")
	let instrumentName = document.createElement("div")
	let instrumentValues = document.createElement("div")
	let instrumentDelete = document.createElement("div")
	instrumentRow.appendChild(instrumentName)
	instrumentRow.appendChild(instrumentValues)
	instrumentRow.appendChild(instrumentDelete)
	instrumentName.classList.add("trackedInstrumentName")
	instrumentValues.classList.add("trackedInstrumentValue")
	instrumentDelete.classList.add("trackedInstrumentDelete")
	instrumentName.innerText = instrumentObj['displayName']
	setMFWatchlistInstrumentValue(instrumentObj, instrumentValues)
	instrumentDelete.append(setDeleteInstrumentFromWatchlistButton(watchlistID, instrumentObj))
}

function setAddInstrumentToWatchlistButton(watchlistID, addInstrumentDiv){
	let addInstrumentButton = document.createElement("Button")
	let addInstrumentSelect = document.createElement("Select")
	addInstrumentSelect.setAttribute("id", "selectAddInstrumentToWatchlist")
	addInstrumentSelect.setAttribute("style", "width: 75%")
	$(document).ready(function(){
		$('#selectAddInstrumentToWatchlist').select2({
			placeholder: "Select Instrument",
			minimumInputLength: 3,
			ajax:{
				delay: 500,
				url: "/selct2AjaxTesting",
				dataType: 'json',
				data: function(params){
					var query = {
						"term": params.term
					}
					return query
				},
				processResults: function (data){
					ordered = []
					instrumentOrder.forEach(function(instrumentType){
						for(key in data)if(data[key]['text']==instrumentType)ordered.push(data[key])
					})
					ret = {
						results: ordered
					};
					// console.log(ret)
					return ret
				}
			},
			width:'resolve'
		});
		$('#selectAddInstrumentToWatchlist').on('change', function(){
			console.log(this.value)
			let selectedInstrumentID = this.value
			let req_data = {"watchlistID": watchlistID, "instrumentID": selectedInstrumentID}
			socket.emit('addInstrumentToWatchlist', req_data, function(error, data){
				if(error || data.error)return console.log(error || data.error);
				dataVersionId = data.dataVersionId
				updateAddInstrumentToWatchlist(watchlistID, data['updatedWatchlists']['addedInstrumentID'])
				$("#selectAddInstrumentToWatchlist").empty();
			})
		})
	});

	addInstrumentDiv.appendChild(addInstrumentSelect)
}

function updateAddInstrumentToWatchlist(watchlistID, instrumentObj){
	watchlists[watchlistID]['instruments'][instrumentObj['instrumentID']] = instrumentObj
	let watchlistInstrumentDiv = document.querySelector("#watchlistInstrumentsDisplayDiv")
	if(parseInt(watchlistInstrumentDiv.getAttribute("watchlistID"))!=watchlistID)return;
	addInstrumentWatchlistView(watchlistID, instrumentObj)
}

function updateDeleteInstrumentFromWatchlist(watchlistID, instrumentID){
	delete watchlists[watchlistID]['instruments'][instrumentID]
	let watchlistInstrumentDiv = document.querySelector("#watchlistInstrumentsDisplayDiv")
	if(parseInt(watchlistInstrumentDiv.getAttribute("watchlistID"))!=watchlistID)return;
	removeInstrumentFromWatchlistView(watchlistID, instrumentID)
}

function addInstrumentWatchlistView(watchlistID, instrumentObj){
	let watchlistInstrumentDiv = document.querySelector("#watchlistInstrumentsDisplayDiv")
	if(watchlistInstrumentDiv.getAttribute("watchlistID")!=watchlistID)return;
	let hasEmptyInstrumentListRow = watchlistInstrumentDiv.lastChild.hasAttribute("noInstrumentsRow")
	if(hasEmptyInstrumentListRow)watchlistInstrumentDiv.removeChild(watchlistInstrumentDiv.lastChild)
	let currInstrumentRow = document.createElement("div")
	currInstrumentRow.setAttribute("instrumentID", instrumentObj['instrumentID'])
	setWatchlistInsturmentRow(instrumentObj, watchlistID, currInstrumentRow)
	watchlistInstrumentDiv.appendChild(currInstrumentRow)
}

function removeInstrumentFromWatchlistView(watchlistID, instrumentID){
	let watchlistInstrumentDiv = document.querySelector("#watchlistInstrumentsDisplayDiv")
	if(watchlistInstrumentDiv.getAttribute("watchlistID")!=watchlistID)return;
	let instrumentRow = watchlistInstrumentDiv.querySelector("[instrumentID='"+String(instrumentID)+"']")
	watchlistInstrumentDiv.removeChild(instrumentRow)
	if(Object.keys(watchlists[watchlistID]['instruments']).length==0){
		let emptyWatchlistRow = document.createElement("div")
		setWatchlistInsturmentRow(null, watchlistID, emptyWatchlistRow)
		watchlistInstrumentDiv.appendChild(emptyWatchlistRow)
	}
}

function setDeleteInstrumentFromWatchlistButton(watchlistID, instrumentObj){
	let deleteInstrumentBtn = document.createElement("button")
	deleteInstrumentBtn.classList.add("btn", "btn-default", "btn-sm", "deleteInstrumentBtn")
	deleteInstrumentBtn.innerHTML = "<b>-</b>"
	deleteInstrumentBtn.addEventListener("click", function(e){
		let req_data = {"watchlistID": watchlistID, "instrumentID": instrumentObj['instrumentID']}
		socket.emit('deleteInstrumentFromWatchlist', req_data, function(error, data){
			if(error || data.error)return console.log(error);
			dataVersionId = data.dataVersionId
			updateDeleteInstrumentFromWatchlist(watchlistID, instrumentObj['instrumentID'])
		})
	})
	return deleteInstrumentBtn
}

function setWatchlistInstrumentValue(instrumentID, instrumentType, instrumentValueDiv){
	if(!instrumentPrices.hasOwnProperty(instrumentID)){
		instrumentValueDiv.innerText = "Data unavailable"
		instrumentValueDiv.parentElement.style.color = "black"
		return
	}

	let instrumentPrice = instrumentPrices[instrumentID]
	if(!instrumentPrice)return;
	let curr_price = instrumentPrice["curr_price"]
	let last_close_price = instrumentPrice["last_close_price"]
	let pricePercentChange = (100*((curr_price - last_close_price)/(last_close_price)))//.toFixed(2)
	curr_price = formatNumber(curr_price/100)//.toFixed(2)
	let pricePercentChangeString = (pricePercentChange<=0?"":"+") + formatNumber(pricePercentChange)
	instrumentValueDiv.innerText = curr_price + "(" + pricePercentChangeString + "%)"
	if(pricePercentChange<0)instrumentValueDiv.style.color = "red";
	else if(pricePercentChange>0)instrumentValueDiv.style.color = "green";
	else instrumentValueDiv.style.color = "black";
}

function processCreateWatchlistRequest(){
	let errors = validateCreateWatchlistForm()
	if(errors.length>0)return displayRequestResult({"error": errors.join('\n')}, document.querySelector("#createWatchlistForm"));
	let req_data = {
		"watchlistName": document.querySelector("[name='watchlistName']").value
	}
	socket.emit('createWatchlist', req_data, function(error, data){
		if(error || data.error){
			console.log(error)
			return displayRequestResult({"error": "Backend error"}, document.querySelector("#createWatchlistForm"));
		}
		dataVersionId = data.dataVersionId
		if(data.hasOwnProperty('newWatchlist')){
			let newWatchlist = data['newWatchlist']
			watchlists[newWatchlist['watchlistID']] = newWatchlist
			let watchlistSelect = document.querySelector("#watchlistSelect")
			let newWatchlistOption = document.createElement("option")
			newWatchlistOption.innerHTML = newWatchlist['watchlistName']
			newWatchlistOption.setAttribute("value", newWatchlist['watchlistID'])
			watchlistSelect.add(newWatchlistOption)
		}
		return displayRequestResult(data, document.querySelector("#createWatchlistForm"));
	})
}

function validateCreateWatchlistForm(){
	let errors = []
	let watchlistNameError = validateWatchlistName()
	if(watchlistNameError!=null)errors.push(watchlistNameError);
	return errors
}

function setEQWatchlistInstrumentValue(instrumentID, instrumentValueDiv){
	if(!isTickerConnected || !instrumentPrices.hasOwnProperty(instrumentID)){
		instrumentValueDiv.innerText = "Data unavailable"
		instrumentValueDiv.style.color = "black"
		return
	}
	let instrumentPrice = instrumentPrices[instrumentID]
	if(!instrumentPrice)return;
	let curr_price = instrumentPrice["curr_price"]
	let last_close_price = instrumentPrice["last_close_price"]
	let pricePercentChange = (100*((curr_price-last_close_price)/(last_close_price)))//.toFixed(2)
	curr_price = formatNumber(curr_price/100)//.toFixed(2)
	let pricePercentChangeString = (pricePercentChange<=0?"":"+") + formatNumber(pricePercentChange)
	instrumentValueDiv.innerText = curr_price + "(" + pricePercentChangeString + "%)"
	if(pricePercentChange<0)instrumentValueDiv.style.color = "red";
	else if(pricePercentChange>0)instrumentValueDiv.style.color = "green";
	else instrumentValueDiv.style.color = "black";
}

function setMFWatchlistInstrumentValue(instrumentObj, instrumentValueDiv){
	let instrumentPrice = instrumentObj['priceInfo']
	let curr_price = instrumentPrice[0]['last_price']
	let last_close_price = (instrumentPrice.length>1)?instrumentPrice[1]['last_price']:'N/A'
	let pricePercentChange = (last_close_price=='N/A')?'N/A':(100*((curr_price - last_close_price)/(last_close_price)))//.toFixed(2)
	curr_price = formatNumber(curr_price/100)//.toFixed(2)
	let pricePercentChangeString = (pricePercentChange=='N/A')?'N/A':(pricePercentChange<=0?"":"+") + formatNumber(pricePercentChange)
	instrumentValueDiv.innerText = curr_price + "(" + pricePercentChangeString + "%)"
	if(pricePercentChange=='N/A')instrumentValueDiv.style.color = "black";
	else if(pricePercentChange<0)instrumentValueDiv.style.color = "red";
	else if(pricePercentChange>0)instrumentValueDiv.style.color = "green";
	else instrumentValueDiv.style.color = "black";
}

function validateWatchlistName(){
	let watchlistName = document.querySelector("[name='watchlistName']").value
	if(watchlistName.length<3)return "Watchlist Name must be atleast 3 characters long";
	if(watchlistName.length>19)return "Watchlist Name must be less than 20 characters long";
	let watchlistNameTaken = false;
	watchlistName = watchlistName.toLowerCase()
	for(watchlistID in watchlists){
		if(watchlists[watchlistID]['watchlistName'].toLowerCase()==watchlistName){
			watchlistNameTaken = true;
			break;
		}
	}
	if(watchlistNameTaken)return "Watchlist name already taken";
	return null;
}

function updateAllWatchlistInstrumentValues(){
	let watchlistInstrumentRows = document.querySelectorAll(".watchlistInstrumentRow")
	watchlistInstrumentRows.forEach(function(instrumentRow){
		let instrumentType = instrumentRow.getAttribute("instrumentType")
		if(instrumentType=="MF")return;
		let instrumentID = instrumentRow.getAttribute("instrumentID")
		let instrumenValuesDiv = instrumentRow.querySelector(".trackedInstrumentValue")
		setWatchlistInstrumentValue(instrumentID, instrumentType, instrumenValuesDiv)
	})
}

function processUpdatedWatchlists(updatedWatchlists){
	watchlists = {}
	for (watchlistID in updatedWatchlists){
		watchlistName = updatedWatchlists[watchlistID]['watchlistName']
		watchlistInstruments = {}
		watchlistInstrumentList = updatedWatchlists[watchlistID]['instrumentInfo']
		watchlistInstrumentList.forEach(function(watchlistInstrument){watchlistInstruments[watchlistInstrument['instrumentID']]=watchlistInstrument})
		watchlists[watchlistID] = {"watchlistID": watchlistID, "watchlistName": watchlistName, "instruments": watchlistInstruments}
	}
	setWatchlistDisplay(activeWatchlist)
}