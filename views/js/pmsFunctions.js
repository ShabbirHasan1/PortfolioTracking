var pmsFunctions = {}

// updatePMSOpenPosRow
pmsFunctions.updateAccoutsTableRowOnPriceChange = directEquityFunctions.updateAccoutsTableRowOnPriceChange

// updatePMSCurrentUnbookedValue
// pmsFunctions.updateContainerCurrentUnbookedValue = directEquityFunctions.updateContainerCurrentUnbookedValue
pmsFunctions.updateContainerCurrentUnbookedValue = function(){}

pmsFunctions.subtractChildAccountsOpenPosOnPriceChange = function(containerId, childContainerId){
	containerAccounts = accounts[containerId]
	childContainerAccounts = accounts[childContainerId]
	containerAccounts.open_position.open_value -= childContainerAccounts.open_position.open_value
	containerAccounts.open_position.open_profit -= childContainerAccounts.open_position.open_profit
	containerAccounts.historical_positions[max_date].open_value -= childContainerAccounts.historical_positions.open_value
	containerAccounts.historical_positions[max_date].open_profit -= childContainerAccounts.historical_positions.open_profit
}

pmsFunctions.addChildAccountsOpenPosOnPriceChange = function(containerId, childContainerId){
	containerAccounts = accounts[containerId]
	childContainerAccounts = accounts[childContainerId]
	containerAccounts.open_position.open_value += childContainerAccounts.open_position.open_value
	containerAccounts.open_position.open_profit += childContainerAccounts.open_position.open_profit
	containerAccounts.historical_positions[max_date].open_value += childContainerAccounts.historical_positions.open_value
	containerAccounts.historical_positions[max_date].open_profit += childContainerAccounts.historical_positions.open_profit
}

// calculatePMSOpenPosBackExtrapolation
pmsFunctions.calculateContainerOpenPosBackExtrapolation = directEquityFunctions.calculateContainerOpenPosBackExtrapolation

//addPMSOpenPosRow
pmsFunctions.setContainerOpenPosRow = function(containerId, pmsReturnsRow){
	directEquityFunctions.setContainerOpenPosRow(containerId, pmsReturnsRow)
	pmsReturnsRow.querySelector("[name='curr_price']").innerText = 'N/A'
	pmsReturnsRow.querySelector("[name='open_date']").innerText = 'N/A'
	pmsReturnsRow.querySelector("[name='open_price']").innerText = 'N/A'
}

pmsFunctions.setContainerClosePosRow = directEquityFunctions.setContainerClosePosRow

// containerTransactionProcessPMSTransaction
pmsFunctions.containerAccountsRowProcessTransactionForm = function(containerId){
	let parentContainer = containers[containerId]
	let transactionFieldsInputs = document.querySelector("#containerTransactionsForm").querySelectorAll(".formFieldInput")
	let transactionFields = {}
	transactionFieldsInputs.forEach(function(transactionFieldInput){
		transactionFields[transactionFieldInput.getAttribute("name")] = transactionFieldInput.value
	})
	console.log(transactionFields)
	let errors = [];
	if(!validatePrice(transactionFields['price']))errors.push("Price must be a positive number");
	if(validatePMSTransactionDate(transactionFields['transaction_date'], parentContainer['containerTypeID'], containerId)!=true)
		errors.push(validatePMSTransactionDate(transactionFields['transaction_date'], parentContainer['containerTypeID'], containerId));
	if(transactionFields['childContainerID']=="")errors.push("Transaction Instrument must be selected")
	if(transactionFields['volume']=="")errors.push("Transaction Volume must be entered")
	if(errors.length>0)return displayRequestResult({"error": errors.join('\n')}, document.querySelector("#containerTransactionsForm"))
	let childContainer = containers[transactionFields['childContainerID']];
	({lot_size, ownerProfileID, parentContainerID, allowedInstrumentID, buy_sell_type} = childContainer)
	let volumeError = validateSingleTransationVolume(transactionFields['volume'], lot_size, ownerProfileID, parentContainerID, allowedInstrumentID, buy_sell_type, "close")
	if(volumeError)errors.push(volumeError)
	if(errors.length>0)return displayRequestResult({"error": errors.join('\n')}, document.querySelector("#containerTransactionsForm"))
	transactionFields['price'] = setPriceInPaisa(transactionFields['price'])
	transactionFields['containerID'] = parentContainer['containerID']
	transactionFields['instrumentID'] = containers[transactionFields['childContainerID']]['allowedInstrumentID']
	transactionFields['ownerProfileID'] = parentContainer['ownerProfileID']
	transactionFields['containerTypeID'] = parentContainer['containerTypeID']
	transactionFields['transaction_fees'] = 0.0
	transactionFields['open_close_type'] = "close"
	transactionFields["exchangeTransaction"] = document.querySelector('input[name = "accountsRow_exchangetradedInput"]:checked').value == "onExchange"
	transactionFields['strategyAssignMap'] = {}
	console.log(transactionFields)
	socket.emit('addTransactionsAjax', {"transactions":[transactionFields]}, function(error, data){
		if(error || data.error)return displayRequestResult({"error": "Backend Error"}, document.querySelector("#containerTransactionsForm"));
		dataVersionId = data.dataVersionId
		let updatedAccounts = data['updatedAccounts']
		let addedContainers = data['addedContainers']
		// updateContainerAccountsAndDisplay(addedContainers, updatedAccounts)
		let addedContainersEvent = new CustomEvent('addedContainers', {detail: addedContainers});
		document.dispatchEvent(addedContainersEvent);
		let updatedAccountsEvent = new CustomEvent('updatedAccounts', {detail: updatedAccounts});
		document.dispatchEvent(updatedAccountsEvent);
		displayRequestResult({"message": "Transaction Added"}, document.querySelector("#containerTransactionsForm"));
	})
}

// PMSContainerAddTransactionForm
pmsFunctions.containerAccountsRowAddTransactionForm = function(containerId){
	let containerTransactionsForm = document.querySelector("#containerTransactionsForm")
	directEquityFunctions.containerAccountsRowAddTransactionForm(containerId)
	let portfolioTransactionContainerField = containerTransactionsForm.querySelector("#transactionInstrumentField")
	let childContainerSelect = portfolioTransactionContainerField.querySelector("#accountsTableCloseTransactionFormPMSInstrumentSelect")
	setAccountsCloseTransactionApplicableChildContainers(childContainerSelect, containerId)
	transactionInstrumentField.style.display = "block"
}

pmsFunctions.displayTransactionFields = function(){
	let containerSpecificFeildsContainer = document.querySelector("#containerTypeSpecificTransactionDetails");

	containersSelectDiv = containerSpecificFeildsContainer.querySelector("#transaction_containerID_div")
	instrumentSelectContainer = containerSpecificFeildsContainer.querySelector("#transaction_instrumentID_div")
	priceField = containerSpecificFeildsContainer.querySelector("#transaction_price_field")
	volumeField = containerSpecificFeildsContainer.querySelector("#transaction_volume_field")
	transactionTypeField = containerSpecificFeildsContainer.querySelector("#open_close_type_type")
	transactionBuySellField = containerSpecificFeildsContainer.querySelector("#buy_sell_type_type")
	transactionExchangeTradedField = containerSpecificFeildsContainer.querySelector("#transaction_exchange_traded_type")
	transactionFeesField = containerSpecificFeildsContainer.querySelector("#transaction_fees_field")
	transactionDateField = containerSpecificFeildsContainer.querySelector("#transaction_date_field")

	let containerOwnerId = document.getElementById("transaction_ownerProfileID").value
	let ownerPMSContainers = new Set(Object.keys(Object.filter(containers, function(currContainerID, container){return container.ownerProfileID == containerOwnerId && container.containerTypeID == 1})))
	console.log(ownerPMSContainers)
	let containerSelectList = containersSelectDiv.querySelector("#transaction_containerID")
	PMSlist = containerSelectList.children

	for(let i=0; i<PMSlist.length; i++){
		PMSlist[i].disabled = true
		if(ownerPMSContainers.has(PMSlist[i].getAttribute("value")))PMSlist[i].disabled = false
	}
	containerSpecificFeildsContainer.querySelector("#transaction_instrumentID").setAttribute("instrumentTypes", "all")
	containersSelectDiv.style.display = "block"
	instrumentSelectContainer.style.display = "block"
	priceField.style.display = "block"
	volumeField.style.display = "block"
	transactionTypeField.style.display = "block"
	transactionBuySellField.style.display = "block"
	transactionExchangeTradedField.style.display = "block"
	// transactionFeesField.style.display = "block"
	transactionDateField.style.display = "block"
	
	$(document.body).on("change","#transaction_instrumentID", function(){
		console.log("New Instrument Selected")
		let instrumentID = this.value;
		let exchangeTradedDiv = document.querySelector("#transaction_exchange_traded_type")
		containerSpecificFeildsContainer.querySelector("#transaction_exchange_type_onExchange").checked = true;
		if(instrumentID && $("#transaction_instrumentID").select2("data")[0]['instrumentType']=="EQ")
			return exchangeTradedDiv.style.display = "block";
		return exchangeTradedDiv.style.display = "none"
	});

	// $(document).ready(function() {$("#transaction_containerID").select2();});
	// document.addEventListener("containerAdded", newContainerEventHandler)
}

pmsFunctions.validateTransactionForm = function(){
	errors = []
	instrumentID = document.getElementById('transaction_instrumentID').value
	containerID = document.getElementById('transaction_containerID').value
	volume = document.getElementById('transaction_volume').value
	price = document.getElementById('transaction_price').value
	transaction_date = document.getElementById('transaction_date').value

	if(instrumentID==""||volume==""||price==""||transaction_date==""||containerID==""){
		errors.push("Please fill out all fields")
		return errors
	}

	let transactionOwner = document.getElementById('transaction_ownerProfileID').value
	let transactionBuySellType = document.querySelector('input[name = "transaction_buy_sell_type"]:checked').value
	let transactionOpenCloseType = document.querySelector('input[name = "transaction_open_close_type"]:checked').value
	let intrumentInfo = $("#transaction_instrumentID").select2("data")[0]
	let volumeError = validateVolume(volume, intrumentInfo['lot_size'], transactionOwner, containerID, instrumentID, transactionBuySellType, transactionOpenCloseType)
	if(volumeError)errors.push(volumeError)
	// if(!validateVolume(volume, intrumentInfo['lot_size'], transactionOwner, containerID, instrumentID, transactionBuySellType, transactionOpenCloseType))errors.push('Volume must be a positive multiple of instrument lot size')
	if(!validatePrice(price))errors.push('Price must be a positive number')
	console.log(transactionStrategyObj.isValidStrategyAssignment())
	if(!transactionStrategyObj.isValidStrategyAssignment())errors.push('Invalid Strategy Assignment')
	if(validatePMSTransactionDate(transaction_date, containerID)!=true)
		errors.push(validatePMSTransactionDate(transaction_date, containerID))
	
	return errors
}

pmsFunctions.setTransactionObject = function(){
	var ret = directEquityFunctions.setTransactionObject()
	ret['containerID'] = parseInt(document.getElementById('transaction_containerID').value)
	ret['containerTypeID'] = 1
	return ret;
}

function validatePMSTransactionDate(transaction_date, containerId){
	transaction_date = new Date(transaction_date)
	transaction_date.setHours(0)
	transaction_date.setMinutes(0)
	transaction_date.setSeconds(0);
	curr_date = new Date()

	containerOpenDate = containers[containerId]['openDate']
	containerOpenDate = new Date(parseInt(containerOpenDate))
	if(transaction_date>curr_date || transaction_date<containerOpenDate){
		return 'Transaction date must be between container open date and current date'
	}

	return true
}

function newContainerEventHandler(newContainers){
	console.log(newContainers)
	if(newContainers[Object.keys(newContainers)[0]]['containerTypeID']==1){
		let newContainer = newContainers[Object.keys(newContainers)[0]]
		let containersSelectList = document.getElementById("transaction_containerID")
		var newContainerOption = document.createElement("option")
		newContainerOption.setAttribute("value", newContainer['containerID'])
		newContainerOption.setAttribute("openDate", newContainer['openDate'])
		newContainerOption.innerText = newContainer['containerName']
		containersSelectList.append(newContainerOption)
		let currTransactionOwner = document.getElementById("transaction_ownerProfileID").value
		if(currTransactionOwner!=newContainer['ownerProfileID'])newContainerOption.disabled=true;
	}
}

function setAccountsCloseTransactionApplicableChildContainers(containerSelect, parentContainerID){
	let childContainers = containerSelect.children
	for(let i=0; i<childContainers.length; i++){
		childContainers[i].disabled = true
		let childContainerID = childContainers[i].getAttribute("value")
		if(childContainerID=="")continue;
		if(containers[childContainerID]['parentContainerID']==parentContainerID)childContainers[i].disabled = false
	}
}

containerTypeFunctions[1] = pmsFunctions