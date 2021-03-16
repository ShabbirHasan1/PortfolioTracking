var addTransactionsList = []
var accountsRowCloseTransactionSelectedContainerID = null
var unconfirmedTransactionVol = null

document.addEventListener("dataSet", function dataSetHandler(e){
	// document.querySelector("#containerTypeSpecificTransactionDetails").style.display = "none"
	let containerOwnersSelect = document.getElementById('transaction_ownerProfileID')
	containerOwnersSelect.style.width = "18%"
	containerOwnersSelect.style.height = "10%"
	let containerOwnersSelectFields = [{'inputField': 'googleProfileID', 'outputField': 'value'}]
	createSelectOptionsList(containerOwnersSelect, containerOwners, containerOwnersSelectFields, 'fullName', true, 'Select Transaction Owner', true, true)
	let containerTypeSelect = document.getElementById("transaction_containerTypeID")
	containerTypeSelect.style.width = "18%"
	containerTypeSelect.style.height = "10%"
	let containerTypeSelectFields = [{'inputField': 'containerTypeID', 'outputField': 'value'}]
	createSelectOptionsList(containerTypeSelect, containerTypes, containerTypeSelectFields, 'containerTypeName', true, 'Select Transaction Type', true, true)
	$(document).ready(function(){
		$("#transaction_ownerProfileID").select2({"width":"resolve", "height": "resolve"});
		$("#transaction_containerTypeID").select2({"width":"resolve", "height": "resolve"});
		$('#transaction_ownerProfileID').on('change', function(){
			transactionStrategyObj.setTransactionOwner(this.value)
		})
		$('#transaction_containerTypeID').on('change', function(){
			transactionStrategyObj.setTransactionPortfolio(containerTypes[this.value]['PortfolioType'])
			// $("#transaction_instrumentID").select2("data", null);
			// $('#transaction_instrumentID').empty()
			$('#transaction_instrumentID').val(null).trigger('change');
		})
	})
	setAddTransactionFromAccountsTableFormFields()
	document.getElementById("submitTransaction").onclick = function(){addTransactionToList()}
	document.getElementById("commitTransactions").onclick = function(){confirmAllTransactions()}
	setContainerSpecficTransactionFields()
	unconfirmedTransactionVol = new unconfirmedTransactionVolTree()
}, {"once": true});

window.addEventListener("popstate", function (event){
	let openView = getCurrPath()
	if(openView=="addTransactions"){
		displayAddTransactionsForm()
	}
});

function addTransactionToList(){
	let transactionFormErrors = validateTransactionForm()
	let addTransactionForm = document.getElementById("addTransactionsContainer")
	if(transactionFormErrors.length==0){
		let containerTypeID = document.getElementById('transaction_containerTypeID').value
		let transactionObject = containerTypeFunctions[containerTypeID].setTransactionObject()
		addTransactionsList.push(transactionObject)
		addTransactionUpdateDisplay(setTransactionRowObject(transactionObject));
		({ownerProfileID, containerID, instrumentID, buy_sell_type, open_close_type, volume} = transactionObject);
		unconfirmedTransactionVol.addUnconfirmedTransactionToTree(ownerProfileID, containerID, instrumentID, buy_sell_type, open_close_type, volume)
		transactionStrategyObj.addUnconfirmedTransactionAssignemntToTree()
		console.log(unconfirmedTransactionVol)
		return displayRequestResultTemp({"message": "Transaction Added to List"}, addTransactionForm, "displayRequestResult")
	}
	return displayRequestResultTemp({"error": transactionFormErrors.join('\n')}, addTransactionForm, "displayRequestResult")
}

function addTransactionUpdateDisplay(transactionObject){
	let displayTable = document.getElementById("transactionListDisplayTable")
	let transactionRow = document.createElement("tr")
	for (let prop in transactionObject) {
		if (Object.prototype.hasOwnProperty.call(transactionObject, prop)) {
			let currVal = document.createElement("td")
			currVal.innerText = transactionObject[prop]
			transactionRow.appendChild(currVal)
		}
	}

	let deleteTransaction = document.createElement("Button")
	deleteTransaction.classList.add("btn", "btn-default", "btn-sm")
	deleteTransaction.innerText = "Delete Transaction"
	deleteTransaction.onclick = function(){
		let parentRow = this.parentElement
		let transactionObject = addTransactionsList[parentRow.rowIndex-1];
		({ownerProfileID, containerID, instrumentID, buy_sell_type, open_close_type, volume, strategyAssignMap} = transactionObject);
		unconfirmedTransactionVol.removeUnconfirmedTransactionFromTree(ownerProfileID, containerID, instrumentID, buy_sell_type, open_close_type, volume)
		transactionStrategyObj.removeUnconfirmedTransactionAssignmentFromTree(ownerProfileID, instrumentID, buy_sell_type, open_close_type, strategyAssignMap)
		addTransactionsList.splice(parentRow.rowIndex-1, 1)
		parentRow.parentElement.removeChild(parentRow)
		if(addTransactionsList.length==0)document.getElementById("transactionListDisplay").style.display = "none"
	}
	transactionRow.appendChild(deleteTransaction)
	displayTable.appendChild(transactionRow)
	document.getElementById("transactionListDisplay").style.display = "block"
}

function confirmAllTransactions(){
	let displayTable = document.getElementById("transactionListDisplayTable")
	let addTransactionForm = document.getElementById("addTransactionsContainer")
	// console.log("sending add transctions request to server")
	socket.emit('addTransactionsAjax', {"transactions":addTransactionsList}, function(error, data){
		if(error || data.error){
			console.log(error || data.error);
			return displayRequestResultTemp({"error": (error || data.error)}, addTransactionForm, "displayRequestResult")
		}
		while(displayTable.rows.length>1)displayTable.deleteRow(-1);
		addTransactionsList = []
		unconfirmedTransactionVol.reset()
		transactionStrategyObj.resetUnconfirmedStrategyAssignVolTree()
		displayTable.parentElement.style.display = "none"
		let updatedAccounts = data['updatedAccounts']
		let addedContainers = data['addedContainers']
		let updatedStrategyContainers = data['updatedStrategyContainers']
		// updateContainerAccountsAndDisplay(addedContainers, updatedAccounts)
		if(!jQuery.isEmptyObject(addedContainers)){
			let addedContainersEvent = new CustomEvent('addedContainers', {detail: addedContainers});
			document.dispatchEvent(addedContainersEvent);
		}
		if(!jQuery.isEmptyObject(updatedAccounts)){
			let updatedAccountsEvent = new CustomEvent('updatedAccounts', {detail: updatedAccounts});
			document.dispatchEvent(updatedAccountsEvent);
		}
		if(!jQuery.isEmptyObject(updatedStrategyContainers)){
			let updatedStrategiesEvent = new CustomEvent('updatedStrategyContainers', {detail: updatedStrategyContainers});
			document.dispatchEvent(updatedStrategiesEvent);
		}
		dataVersionId = data.dataVersionId
		return displayRequestResultTemp({"message": "Transactions Confirmed"}, addTransactionForm, "displayRequestResult")
	})
}

$(document.body).on("change","#transaction_ownerProfileID",function(e){
	showApplicableContainersAndInstruments()
});

$(document.body).on("change","#transaction_containerTypeID",function(){
	showApplicableContainersAndInstruments()
});

function showApplicableContainersAndInstruments(){
	let containerSpecificFeildsContainer = document.querySelector("#containerTypeSpecificTransactionDetails");
	containerSpecificFeildsContainer.querySelectorAll(".formField").forEach(function(formField){formField.style.display="none"})
	// document.removeEventListener("containerAdded", newContainerEventHandler)
	$(document.body).off("change","#transaction_instrumentID");
	let containerTypeID = document.getElementById("transaction_containerTypeID").value
	let ownerProfileID = document.getElementById("transaction_ownerProfileID").value
	document.querySelector("#containerTypeSpecificTransactionDetails").style.display = "none"
	if(containerTypeID=="" || ownerProfileID=="")return;
	containerTypeFunctions[parseInt(containerTypeID)].displayTransactionFields()
	containerSpecificFeildsContainer.style.display = "block";
}

function setContainerSpecficTransactionFields(){
	let containerSpecificFeildsContainer = document.querySelector("#containerTypeSpecificTransactionDetails");
	
	// Set transaction PMS container select
	let containerOwnerId = document.getElementById("transaction_ownerProfileID").value
	
	let containersSelectDiv = document.createElement("div")
	containersSelectDiv.classList.add("formField")
	containersSelectDiv.setAttribute("id", "transaction_containerID_div")
	let containerSelect = document.createElement("select")
	containerSelect.setAttribute("id", "transaction_containerID")
	containerSelect.setAttribute("name", "transaction_containerID")
	let filteredContainers = Object.filter(containers, function(containerID, container){return (container['containerTypeID'] == 1)})
	let filteredContainersSelectFields = [{"inputField": 'containerID', 'outputField': 'value'}, {"inputField": 'openDate', 'outputField': 'openDate'}]
	createSelectOptionsList(containerSelect, filteredContainers, filteredContainersSelectFields, 'containerName', true, 'Select Transaction Container', true, true)

	let createNewContainerButton = document.createElement("button")
	createNewContainerButton.innerText = "Create New Container";
	createNewContainerButton.classList.add("btn", "btn-default", "btn-sm")
	createNewContainerButton.setAttribute("id", "transaction_createNewContainer")
	createNewContainerButton.addEventListener("click", function(){
		displayContainerForm(function(containerForm){
			transaction_ownerProfileID = document.getElementById("transaction_ownerProfileID").value
			transaction_containerTypeID = document.getElementById("transaction_containerTypeID").value
			container_ownerProfileID = document.getElementById("container_ownerProfileID")
			container_containerTypeID = document.getElementById("container_containerTypeID")
			if(transaction_ownerProfileID!="")container_ownerProfileID.value = transaction_ownerProfileID;
			if(transaction_containerTypeID!=""){
				let changeEvent = new Event("change")
				container_containerTypeID.value = transaction_containerTypeID;
				container_containerTypeID.dispatchEvent(changeEvent)
			}
		})
	})
	containersSelectDiv.appendChild(containerSelect)
	containersSelectDiv.appendChild(createNewContainerButton)
	$(document).ready(function(){$("#transaction_containerID").select2()});
	document.addEventListener("addedContainers", function(e){newContainerEventHandler(e.detail)})
	

	//Set Transaction instrument Select
	let instrumentSelectContainer = document.createElement("div")
	let instrumentSelect = document.createElement("select")
	instrumentSelect.style.width = "18%"
	instrumentSelect.style.height = "90%"
	instrumentSelectContainer.classList.add("formField")
	instrumentSelectContainer.setAttribute("id", "transaction_instrumentID_div")
	instrumentSelect.setAttribute("id", "transaction_instrumentID")
	instrumentSelect.setAttribute("name", "transaction_instrumentID")

	instrumentSelectContainer.appendChild(instrumentSelect)
	$(document).ready(function(){
		$('#transaction_instrumentID').select2({
			placeholder: "Select Instrument",
			minimumInputLength: 3,
			ajax:{
				delay: 500,
				url: "/selct2AjaxTesting",
				dataType: 'json',
				data: function(params){
					var query = {
						"term": params.term,
						"instrumentTypes": instrumentSelect.getAttribute("instrumentTypes")
					}
					return query
				},
				processResults: function (data){
					// console.log(data)
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
			width:'resolve',
			height:'resolve'
		});
		$('#transaction_instrumentID').on('change', function(){
			// console.log(this.value)
			obj = $("#transaction_instrumentID").select2("data")
			if(obj.length==0){
				transactionStrategyObj.setTransactionInstrument(null)
				displayInstrumentLotSize(null)
				return 
			}
			obj = obj[0]
			transactionStrategyObj.setTransactionInstrument(obj)
			displayInstrumentLotSize(obj)
			console.log(obj)
		})
	});
	
	//Set Price Input field
	let priceField = document.createElement("div")
	priceField.setAttribute("id", "transaction_price_field")
	priceField.classList.add("formField")
	let priceLabel = document.createElement("label")
	priceLabel.innerText = "Price"
	let priceInput = document.createElement("input")
	priceInput.setAttribute("type", "number")
	priceInput.setAttribute("placeholder", "0.00")
	priceInput.setAttribute("min", "0")
	priceInput.setAttribute("step", "0.01")
	priceInput.setAttribute("id", "transaction_price")
	priceInput.setAttribute("name", "transaction_price")
	priceField.appendChild(priceLabel)
	priceField.appendChild(priceInput)

	// Set Volume Input Field
	let volumeField = document.createElement("div")
	volumeField.classList.add("formField")
	volumeField.setAttribute("id", "transaction_volume_field")
	let volumeLabel = document.createElement("label")
	volumeLabel.innerText = "Volume"
	let volumeInput = document.createElement("input")
	volumeInput.setAttribute("type", "number")
	volumeInput.setAttribute("placeholder", "0")
	volumeInput.setAttribute("min", "1")
	volumeInput.setAttribute("step", "1")
	volumeInput.setAttribute("id", "transaction_volume")
	volumeInput.setAttribute("name", "transaction_volume")
	let lotSizeDisplay = document.createElement("label")
	lotSizeDisplay.setAttribute("name", "lotSizeDisplay")
	lotSizeDisplay.style.paddingLeft = "5px"
	volumeField.appendChild(volumeLabel)
	volumeField.appendChild(volumeInput)
	volumeField.appendChild(lotSizeDisplay)
	volumeInput.addEventListener("change", function(e){
		transactionStrategyObj.setTransactionVolume(parseInt(this.value))
	})

	
	// Set Transaction Type Field
	let transactionTypeField = document.createElement("div")
	transactionTypeField.classList.add("formField")
	transactionTypeField.setAttribute("id", "open_close_type_type")
	transactionTypelabel = document.createElement("label")
	transactionTypelabel.innerText = "Transaction Open/Close"
	let openRadio = document.createElement("input")
	openRadio.setAttribute("type", "radio")
	openRadio.setAttribute("id", "transaction_open_close_type_open")
	openRadio.setAttribute("name", "transaction_open_close_type")
	openRadio.setAttribute("value", "open")
	openRadio.checked = true;
	let openLabel = document.createElement("label")
	openLabel.setAttribute("for", "open")
	openLabel.innerText = "Open"
	openRadio.addEventListener("click", function(e){transactionStrategyObj.setTransactionOpenClose("open")})
	
	let closeRadio = document.createElement("input")
	closeRadio.setAttribute("type", "radio")
	closeRadio.setAttribute("id", "transaction_open_close_type_close")
	closeRadio.setAttribute("name", "transaction_open_close_type")
	closeRadio.setAttribute("value", "close")
	let closeLabel = document.createElement("label")
	closeLabel.setAttribute("for", "close")
	closeLabel.innerText = "Close"
	closeRadio.addEventListener("click", function(e){transactionStrategyObj.setTransactionOpenClose("close")})

	transactionTypeField.appendChild(transactionTypelabel)
	transactionTypeField.appendChild(openRadio)
	transactionTypeField.appendChild(openLabel)
	transactionTypeField.appendChild(closeRadio)
	transactionTypeField.appendChild(closeLabel)	

	// Set Transaction Buy/Sell Type Field
	let transactionBuySellField = document.createElement("div")
	transactionBuySellField.classList.add("formField")
	transactionBuySellField.setAttribute("id", "buy_sell_type_type")
	transactionBuySellLabel = document.createElement("label")
	transactionBuySellLabel.innerText = "Transaction Buy/Sell"
	let buyRadio = document.createElement("input")
	buyRadio.setAttribute("type", "radio")
	buyRadio.setAttribute("id", "transaction_buy_close_type_buy")
	buyRadio.setAttribute("name", "transaction_buy_sell_type")
	buyRadio.setAttribute("value", "Buy")
	buyRadio.checked = true;
	let buyLabel = document.createElement("label")
	buyLabel.setAttribute("for", "Buy")
	buyLabel.innerText = "Buy"
	buyRadio.addEventListener("click", function(e){transactionStrategyObj.setTransactionBuySell("Buy")})

	let sellRadio = document.createElement("input")
	sellRadio.setAttribute("type", "radio")
	sellRadio.setAttribute("id", "transaction_buy_sell_type_sell")
	sellRadio.setAttribute("name", "transaction_buy_sell_type")
	sellRadio.setAttribute("value", "Sell")
	let sellLabel = document.createElement("label")
	sellLabel.setAttribute("for", "Sell")
	sellLabel.innerText = "Sell"
	sellRadio.addEventListener("click", function(e){transactionStrategyObj.setTransactionBuySell("Sell")})

	transactionBuySellField.appendChild(transactionBuySellLabel)
	transactionBuySellField.appendChild(buyRadio)
	transactionBuySellField.appendChild(buyLabel)
	transactionBuySellField.appendChild(sellRadio)
	transactionBuySellField.appendChild(sellLabel)


	// Set Transaction Exchange Traded Field
	let transactionExchangeTradedField = document.createElement("div")
	// transactionExchangeTradedField.classList.add("formField")
	transactionExchangeTradedField.setAttribute("id", "transaction_exchange_traded_type")
	transactionExchnageTypelabel = document.createElement("label")
	transactionExchnageTypelabel.innerText = "Exchange Traded"
	let onExchangeRadio = document.createElement("input")
	onExchangeRadio.setAttribute("type", "radio")
	onExchangeRadio.setAttribute("id", "transaction_exchange_type_onExchange")
	onExchangeRadio.setAttribute("name", "transaction_exchange_type")
	onExchangeRadio.setAttribute("value", "onExchange")
	onExchangeRadio.checked = true;
	let onExchangeLabel = document.createElement("label")
	onExchangeLabel.setAttribute("for", "onExchange")
	onExchangeLabel.innerText = "Yes"
	
	let offExchangeRadio = document.createElement("input")
	offExchangeRadio.setAttribute("type", "radio")
	offExchangeRadio.setAttribute("id", "transaction_exchange_type_offExchange")
	offExchangeRadio.setAttribute("name", "transaction_exchange_type")
	offExchangeRadio.setAttribute("value", "offExchange")
	let offExchangeLabel = document.createElement("label")
	offExchangeLabel.setAttribute("for", "offExchange")
	offExchangeLabel.innerText = "No"

	transactionExchangeTradedField.appendChild(transactionExchnageTypelabel)
	transactionExchangeTradedField.appendChild(onExchangeRadio)
	transactionExchangeTradedField.appendChild(onExchangeLabel)
	transactionExchangeTradedField.appendChild(offExchangeRadio)
	transactionExchangeTradedField.appendChild(offExchangeLabel)

	//Set Transaction Fees Field
	let transactionFeesField = document.createElement("div")
	transactionFeesField.classList.add("formField")
	transactionFeesField.setAttribute("id", "transaction_fees_field")
	let transactionFeesLabel = document.createElement("label")
	transactionFeesLabel.innerText = "Transaction Fees"
	let transactionFeesInput = document.createElement("input")
	transactionFeesInput.setAttribute("type", "number")
	transactionFeesInput.setAttribute("value", "0.00")
	transactionFeesInput.setAttribute("min", "0")
	transactionFeesInput.setAttribute("step", "0.01")
	transactionFeesInput.setAttribute("id", "transaction_fees")
	transactionFeesInput.setAttribute("name", "transaction_fees")
	transactionFeesField.appendChild(transactionFeesLabel)
	transactionFeesField.appendChild(transactionFeesInput)

	//Set Transaction Date Field
	let transactionDateField = document.createElement("div")
	transactionDateField.setAttribute("id", "transaction_date_field")
	transactionDateField.classList.add("formField")
	let transactionDateLabel = document.createElement("label")
	transactionDateLabel.innerText = "Transaction Date"
	let transactionDateInput = document.createElement("input")
	transactionDateInput.setAttribute("type", "Date")
	transactionDateInput.setAttribute("id", "transaction_date")
	transactionDateInput.setAttribute("name", "transaction_date")
	transactionDateField.appendChild(transactionDateLabel)
	transactionDateField.appendChild(transactionDateInput)

	// Create Transaction Strategy Assign Container
	let transactionStrategyDiv = document.createElement("div")
	transactionStrategyDiv.setAttribute("id", "transaction_strategy_assign_div")
	let transactionStrategyContainer = document.createElement("div")
	transactionStrategyContainer.setAttribute("id", "transaction_strategy_assign_field")
	transactionStrategyContainer.classList.add("formField")
	transactionStrategyObj = new transactionStrategyAssignment(transactionStrategyContainer, "transaction_strategyAssignSelect")
	transactionStrategyObj.setTransactionOpenClose("open")
	transactionStrategyObj.setTransactionBuySell("Buy")
	transactionStrategyDiv.appendChild(transactionStrategyContainer)

	//append all fields to containerSpecificFeildsContainer
	containerSpecificFeildsContainer.appendChild(containersSelectDiv)
	containerSpecificFeildsContainer.appendChild(instrumentSelectContainer)
	containerSpecificFeildsContainer.appendChild(priceField)
	containerSpecificFeildsContainer.appendChild(volumeField)
	containerSpecificFeildsContainer.appendChild(transactionTypeField)
	containerSpecificFeildsContainer.appendChild(transactionBuySellField)
	containerSpecificFeildsContainer.appendChild(transactionExchangeTradedField)
	containerSpecificFeildsContainer.appendChild(transactionFeesField)
	containerSpecificFeildsContainer.appendChild(transactionDateField)
	containerSpecificFeildsContainer.appendChild(transactionStrategyDiv)
	containerSpecificFeildsContainer.style.display = "none"
}

function filterOwnerContainersByContainerType(containers, containerTypeID, ownerProfileID){
	let filteredContainers = Object.filter(containers, function(containerID, container){
		return (container['containerTypeID'] == containerTypeID) && (container['ownerProfileID'] == ownerProfileID)
	})
	return filteredContainers
}

function validateSingleTransationVolume(volume, lot_size, transactionOwner, portfolioID, instrumentID, buySellType, openCloseType){
	let containerID = instrumentContainerOwnershipTree.getTransactionContainerID(transactionOwner, portfolioID, instrumentID, buySellType)
	let confirmedOpenVolume = ((accounts[containerID])?accounts[containerID]['open_position']['open_volume']:0)
	let volInt = parseInt(volume)
	lot_size = Math.max(lot_size, 1)
	if(!(volInt>0 && (volume == volInt.toString()) && volInt%lot_size==0))return "Volume must be a positive multiple of lot size";
	if(!(openCloseType=="open" || ((confirmedOpenVolume-volume) >= 0)))return "Insufficient open volume to make this close transaction";
	return null
}

function validateVolume(volume, lot_size, transactionOwner, portfolioID, instrumentID, buySellType, openCloseType){
	let containerID = instrumentContainerOwnershipTree.getTransactionContainerID(transactionOwner, portfolioID, instrumentID, buySellType)
	let unconfirmedVol = unconfirmedTransactionVol.getOwnerInstrumentUnconfirmedVol(transactionOwner, portfolioID, instrumentID, buySellType)
	let confirmedOpenVolume = ((accounts[containerID])?accounts[containerID]['open_position']['open_volume']:0)
	let volInt = parseInt(volume)
	lot_size = Math.max(lot_size, 1)
	if(volInt<=0 || (volume != volInt.toString()) || volInt%lot_size!=0)return "Volume must be a positive multiple of lot size";
	if((openCloseType=="close") && ((confirmedOpenVolume+unconfirmedVol-volume) < 0))return "Insufficient open units to make this transaction";
	return null;
	// return volInt>0 && (volume == volInt.toString()) && volInt%lot_size==0 && (openCloseType=="open" || ((confirmedOpenVolume+unconfirmedVol-volume) >= 0));
}

function validatePrice(price){
	let priceInt = parseFloat(price)
	return priceInt>0
}

function validateTransactionForm(){
	let errors = []
	let ownerProfileID = document.getElementById('transaction_ownerProfileID').value
	let containerTypeID = document.getElementById('transaction_containerTypeID').value
	if(ownerProfileID=="")errors.push("Select the transaction Owner");
	if(containerTypeID=="")errors.push("Select transaction type");
	if(errors.length>0)return errors;
	return containerTypeFunctions[parseInt(containerTypeID)].validateTransactionForm()
}

function setTransactionObject(){
	let ret = {
		'ownerProfileID': document.getElementById('transaction_ownerProfileID').value,
		'containerTypeID': document.getElementById('transaction_containerTypeID').value,
		'containerID': document.getElementById('transaction_containerID').value,
		'instrumentID': document.getElementById('transaction_instrumentID').value,
		'price': setPriceInPaisa(document.getElementById('transaction_price').value),
		'volume': document.getElementById('transaction_volume').value,
		'transaction_date': document.getElementById('transaction_date').value,
		'transaction_fees': document.getElementById('transaction_fees').value,
		'open_close_type': document.querySelector('input[name = "transaction_open_close_type"]:checked').value
	}
	return ret;
}

function setTransactionRowObject(transactionObject){
	return {
		'Transaction Owner': containerOwners[transactionObject['ownerProfileID']]['fullName'],
		'Transaction Type': containerTypes[transactionObject['containerTypeID']]['containerTypeName'],
		'Transaction Container': isNaN(transactionObject['containerID'])? 'N/A' : containers[parseInt(transactionObject['containerID'])]['containerName'],
		'Transaction Instrument': $("#transaction_instrumentID").select2("data")[0]['text'],
		'Buy/Sell': document.querySelector('input[name = "transaction_buy_sell_type"]:checked').value,
		'price': setPriceDisplay(document.getElementById('transaction_price').value),
		'volume': document.getElementById('transaction_volume').value,
		'Transaction Date': document.getElementById('transaction_date').value,
		'Transaction Fees': document.getElementById('transaction_fees').value,
		'Open/Close': document.querySelector('input[name = "transaction_open_close_type"]:checked').value
	}
}

function displayRequestResultTemp(result, parentElement, displayId){
	let resultDisplay = document.getElementById(displayId)
	if(resultDisplay!=null)resultDisplay.parentElement.removeChild(resultDisplay)
	resultDisplay = document.createElement("div");
	resultDisplay.classList.add("requestResultDisplay")
	resultDisplay.setAttribute("id", displayId)
	let resultText = document.createElement("P")
	resultDisplay.appendChild(resultText)
	if(result.hasOwnProperty("error")){
		resultText.innerText = result['error']
		resultText.style.color = "red"
	}
	else{
		resultText.innerText = result["message"]
		resultText.style.color = "green"
	}
	let closeButton = document.createElement("DIV");
	closeButton.classList.add("closeButton");
	closeButton.setAttribute("id", "closeResultMessage")
	closeButton.innerHTML = "+"
	resultDisplay.appendChild(closeButton)
	parentElement.insertBefore(resultDisplay, parentElement.firstChild)
	closeButton.onclick = function(){
		closeMessage(this)
	}
}

function displayAddTransactionsForm(){
	if(!dataSet){
		document.addEventListener("dataSet", function dataSetHandler(e){
			let containerOwnersSelect = document.getElementById('transaction_ownerProfileID')
			let containerOwnersSelectFields = [{'inputField': 'googleProfileID', 'outputField': 'value'}]
			createSelectOptionsList(containerOwnersSelect, containerOwners, containerOwnersSelectFields, 'fullName', true, 'Select Transaction Owner', true, true)
			let containerTypeSelect = document.getElementById("transaction_containerTypeID")
			let containerTypeSelectFields = [{'inputField': 'containerTypeID', 'outputField': 'value'}]
			createSelectOptionsList(containerTypeSelect, containerTypes, containerTypeSelectFields, 'containerTypeName', true, 'Select Transaction Type', true, true)
		})
	}
}

function setPriceInPaisa(price){
	return parseInt(parseFloat(price).toFixed(2)*100);
}

function setPriceDisplay(price){
	return parseFloat(price).toFixed(2);	
}

function displayContainerTransactionForm(containerId){
	console.log(containerId)
	let containerTransactionFormModal = document.querySelector("#containerTransactionFormModal")
	let containerTransactionsForm = document.querySelector("#containerTransactionsForm")
	let formFields = containerTransactionsForm.querySelectorAll(".formField")
	formFields.forEach(function(formField, idx){formField.style.display = "none"})
	let containerTypeId = containers[containerId]['containerTypeID']
	containerTypeFunctions[containerTypeId].containerAccountsRowAddTransactionForm(containerId)
	containerTransactionFormModal.style.display="flex";
}

function setAddTransactionFromAccountsTableFormFields(){
	let containerTransactionsForm = document.querySelector("#containerTransactionsForm")
	
	let transactionPriceField = document.createElement("div")
	transactionPriceField.setAttribute("id", "transactionPriceField")
	transactionPriceField.classList.add("col-sm-12", "formField")
	transactionPriceField.innerText = "Close Price"
	let transactionPriceInput = document.createElement("input")
	transactionPriceInput.setAttribute("name", "price")
	transactionPriceInput.classList.add("formFieldInput")
	transactionPriceInput.setAttribute("type", "number")
	transactionPriceInput.setAttribute("placeholder", "0.00")
	transactionPriceField.appendChild(transactionPriceInput)
	
	let transactionVolumeField = document.createElement("div")
	transactionVolumeField.setAttribute("id", "transactionVolumeField")
	transactionVolumeField.classList.add("col-sm-12", "formField")
	transactionVolumeField.innerText = "Close Volume"
	let transactionVolumeInput = document.createElement("input")
	transactionVolumeInput.setAttribute("name", "volume")
	transactionVolumeInput.classList.add("formFieldInput")
	transactionVolumeInput.setAttribute("type", "number")
	transactionVolumeInput.setAttribute("placeholder", "0")
	transactionVolumeField.appendChild(transactionVolumeInput)
	transactionVolumeInput.addEventListener("change", function(){
		accountsRowCloseTransactionStrategyObj.setTransactionVolume(this.value)
	})
	
	let transactionDateField = document.createElement("div")
	transactionDateField.setAttribute("id", "transactionDateField")
	transactionDateField.classList.add("col-sm-12", "formField")
	transactionDateField.innerText = "Close Date"
	let transactionDateInput = document.createElement("input")
	transactionDateInput.setAttribute("name", "transaction_date")
	transactionDateInput.classList.add("formFieldInput")	
	transactionDateInput.setAttribute("type", "date")
	transactionDateField.appendChild(transactionDateInput)
	
	let transactionExchangeTradedField = document.createElement("div")
	transactionExchangeTradedField.setAttribute("id", "transactionExchangeTradedField")
	transactionExchangeTradedField.classList.add("col-sm-12", "formField")
	// transactionExchangeTradedField.setAttribute("name", "transaction_exchange_traded_type")
	let transactionExchnageTypelabel = document.createElement("label")
	transactionExchnageTypelabel.innerText = "Exchange Traded"
	let onExchangeRadio = document.createElement("input")
	onExchangeRadio.setAttribute("type", "radio")
	onExchangeRadio.setAttribute("name", "accountsRow_exchangetradedInput")
	onExchangeRadio.setAttribute("value", "onExchange")
	onExchangeRadio.checked = true;
	let onExchangeLabel = document.createElement("label")
	onExchangeLabel.setAttribute("for", "onExchange")
	onExchangeLabel.innerText = "Yes"
	let offExchangeRadio = document.createElement("input")
	offExchangeRadio.setAttribute("type", "radio")
	offExchangeRadio.setAttribute("name", "accountsRow_exchangetradedInput")
	offExchangeRadio.setAttribute("value", "offExchange")
	let offExchangeLabel = document.createElement("label")
	offExchangeLabel.setAttribute("for", "offExchange")
	offExchangeLabel.innerText = "No"
	transactionExchangeTradedField.appendChild(transactionExchnageTypelabel)
	transactionExchangeTradedField.appendChild(onExchangeRadio)
	transactionExchangeTradedField.appendChild(onExchangeLabel)
	transactionExchangeTradedField.appendChild(offExchangeRadio)
	transactionExchangeTradedField.appendChild(offExchangeLabel)

	let transactionInstrumentField = document.createElement("div")
	transactionInstrumentField.setAttribute("id", "transactionInstrumentField")
	transactionInstrumentField.innerText = "Select Close Instrument"
	transactionInstrumentField.classList.add("col-sm-12", "formField")
	transactionInstrumentInput = document.createElement("select")
	transactionInstrumentInput.setAttribute("name", "childContainerID")
	transactionInstrumentInput.setAttribute("id", "accountsTableCloseTransactionFormPMSInstrumentSelect")
	transactionInstrumentInput.classList.add("formFieldInput")
	setPMSChildContainerSelectForAccountsCloseTransactionForm(transactionInstrumentInput)
	transactionInstrumentField.appendChild(transactionInstrumentInput)
	$(document).ready(function() {
		$('#accountsTableCloseTransactionFormPMSInstrumentSelect').select2({placeholder: "--Select Instrument--"});
		$('#accountsTableCloseTransactionFormPMSInstrumentSelect').val(null).trigger("change");
		$('#accountsTableCloseTransactionFormPMSInstrumentSelect').on('change', function(){
			let obj = $("#accountsTableCloseTransactionFormPMSInstrumentSelect").select2("data")[0]
			if(!obj)return;
			let containerTypeID = containers[obj['id']]['containerTypeID']
			let exchangeTradedDiv = document.querySelector("#containerTransactionsForm #transactionExchangeTradedField")
			if(containerTypeID==0)exchangeTradedDiv.style.display = "block";
			else exchangeTradedDiv.style.display = "none"
		})
	});

	let transactionStrategyContainer = document.createElement("div")
	transactionStrategyContainer.setAttribute("id", "accountsRowTransactionStrategyAssign")
	transactionStrategyContainer.classList.add("col-sm-12", "formField")
	accountsRowCloseTransactionStrategyObj = new transactionStrategyAssignment(transactionStrategyContainer, "accountsRowCloseTransaction_strategyAssignSelect")
	accountsRowCloseTransactionStrategyObj.setTransactionOpenClose("close")

	let submitButton = document.createElement("button")
	submitButton.classList.add("btn", "btn-default", "btn-sm")
	submitButton.innerText = "Submit"
	submitButton.addEventListener("click", function(e){
		let containerID = accountsRowCloseTransactionSelectedContainerID
		let containerTypeID = containers[containerID]['containerTypeID']
		containerTypeFunctions[containerTypeID].containerAccountsRowProcessTransactionForm(containerID)
	})
	containerTransactionsForm.appendChild(transactionDateField)
	containerTransactionsForm.appendChild(transactionPriceField)
	containerTransactionsForm.appendChild(transactionVolumeField)
	containerTransactionsForm.appendChild(transactionExchangeTradedField)
	containerTransactionsForm.appendChild(transactionInstrumentField)
	containerTransactionsForm.appendChild(transactionStrategyContainer)
	containerTransactionsForm.appendChild(submitButton)
}

function setPMSChildContainerSelectForAccountsCloseTransactionForm(pmsChildContainerSelect){
	childContainers = {}
	for(containerID in containers)
		if(containers[containerID]['parentContainerID']){
			containers[containerID]['accountsRowCloseTransactionDisplayName'] = containers[containerID]['containerName']+ " (" + containers[containerID]['buy_sell_type'] + ")"
			childContainers[containerID] = containers[containerID];
		}
	let childContainerSelectFields = [{'inputField': 'containerID', 'outputField': 'value'}]
	createSelectOptionsList(pmsChildContainerSelect, childContainers, childContainerSelectFields, 'accountsRowCloseTransactionDisplayName', false, 'Select Transaction Instrument', true, false)
}

class unconfirmedTransactionVolTree{
	constructor(){
		this.init()
	}

	addUserUnconfirmedPortfolioToTree(containerOwner){
		this.unconfirmedOwnerPortfolios[containerOwner] = {"unconfirmedInstVol":{"Buy":{}, "Sell":{}}, "unconfirmedPortfolioVols":{}};
	}

	reset(){
		this.init()
	}

	removeUnconfirmedTransactionFromTree(containerOwner, parentContainerID, instrumentID, buySell, openClose, volume){
		this.addUnconfirmedTransactionToTree(containerOwner, parentContainerID, instrumentID, buySell, openClose, volume*-1)
	}

	addUnconfirmedTransactionToTree(containerOwner, parentContainerID, instrumentID, buySell, openClose, volume){
		let unconfirmedPortfolio = this.unconfirmedOwnerPortfolios[containerOwner]
		if(parentContainerID){
			let unconfirmedParentPortfolio = unconfirmedPortfolio['unconfirmedPortfolioVols'][parentContainerID]
			if(!unconfirmedParentPortfolio)
				unconfirmedPortfolio['unconfirmedPortfolioVols'][parentContainerID] = {"unconfirmedInstVol":{"Buy":{}, "Sell":{}}}
			unconfirmedPortfolio = unconfirmedPortfolio['unconfirmedPortfolioVols'][parentContainerID]
		}
		unconfirmedPortfolio = unconfirmedPortfolio['unconfirmedInstVol'][buySell]
		let signedVol = volume * ((openClose=="open")?1:-1)
		unconfirmedPortfolio[instrumentID] = signedVol + ((unconfirmedPortfolio[instrumentID])?unconfirmedPortfolio[instrumentID]:0)
	}

	getOwnerInstrumentUnconfirmedVol(containerOwner, parentContainerID, instrumentID, buySell){
		let unconfirmedPortfolio = this.unconfirmedOwnerPortfolios[containerOwner]
		if(parentContainerID){
			let unconfirmedParentPortfolio = unconfirmedPortfolio['unconfirmedPortfolioVols'][parentContainerID]
			if(!unconfirmedParentPortfolio)return 0;
			unconfirmedPortfolio = unconfirmedPortfolio['unconfirmedPortfolioVols'][parentContainerID]
		}
		unconfirmedPortfolio = unconfirmedPortfolio['unconfirmedInstVol'][buySell]
		return unconfirmedPortfolio[instrumentID] || 0
	}
}

unconfirmedTransactionVolTree.prototype.init = function(){
	this.unconfirmedOwnerPortfolios = {}
	for(containerOwner in containerOwners)this.addUserUnconfirmedPortfolioToTree(containerOwner);
}

function displayInstrumentLotSize(instrumentInfo){
	let lotSizeDisplay = document.querySelector("#containerTypeSpecificTransactionDetails [name='lotSizeDisplay']")
	if(!instrumentInfo)return lotSizeDisplay.style.display="none";
	lotSizeDisplay.innerText = `Lot Size: ${instrumentInfo['lot_size']}`
	lotSizeDisplay.style.display="inline-block";
}