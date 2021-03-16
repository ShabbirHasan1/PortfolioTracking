var directEquityFunctions = {}

// updateDirectEquityOpenPosRow
directEquityFunctions.updateAccoutsTableRowOnPriceChange = function(containerRow){
	// console.log("Inside updateAccoutsTableRowOnPriceChange function")
	let containerID = containerRow.getAttribute("containerid")
	let containerOwner = containers[containerID]['ownerProfileID']
	let containerTypeId = containers[containerID]['containerTypeID']
	let containerReturns = accounts[containerID]
	let containerOpenPos = containerReturns.open_position
	let containerHistoricalPos = containerReturns.historical_positions
	// let currDeContainerOpenPosBackExtrapolation = containerReturns.current_open_positions.current_pos_back_extrapolation_value.combined_back_extrapolation

	// let unbooked_profit = containerCombinedHistoricalPos[max_date]['open_value']-currDeContainerCombinedOpenPos.open_exposure
	let unbooked_profit = containerOpenPos['open_profit']
	// console.log(unbooked_profit)
	let current_price_cell = containerRow.querySelector("[name='curr_price']")
	let current_price = containerOpenPos.curr_price
	current_price_cell.innerText = (current_price)?formatNumber(current_price/100):'N/A'//(current_price/100).toFixed(2)

	let unbooked_profit_cells = containerRow.querySelectorAll(".unbooked_profit_cell")
	unbooked_profit_cells.forEach(function(unbooked_profit_cell){
		if(unbooked_profit_cell.getAttribute("date")==max_date){
			unbooked_profit_cell.innerText = formatNumber(unbooked_profit/100)//.toFixed(2)
			if(unbooked_profit<0)unbooked_profit_cell.style.color = "red";
			else if(unbooked_profit>0)unbooked_profit_cell.style.color = "green";
			else unbooked_profit_cell.style.color = "black"
			return;
		}
		let curr_date = unbooked_profit_cell.getAttribute("date")
		if(containerHistoricalPos[curr_date]==null || containerHistoricalPos[curr_date]['open_volume']==0)return;
		let curr_date_open_profit = containerHistoricalPos[curr_date]['open_profit']
		let profit_change = unbooked_profit-curr_date_open_profit
		let profit_change_percentage = ((profit_change/Math.abs(curr_date_open_profit))*100)
		unbooked_profit_cell.innerText = formatNumber(curr_date_open_profit/100) + "(" + formatNumber(profit_change_percentage) + "%)"
	})
}

// updateDirectEquityCurrentUnbookedValue
directEquityFunctions.updateContainerCurrentUnbookedValue = function(containerId){
	if(accounts[containerId].open_position.open_volume==0)return;
	let containerType = containers[containerId]['containerTypeID']
	let parentContainerID = containers[containerId]['parentContainerID']
	let buySellMult = (containers[containerId]['buy_sell_type']=="Buy")?1:-1
	if(parentContainerID!=null)containerTypeFunctions[containers[parentContainerID]['containerTypeID']].subtractChildAccountsOpenPosOnPriceChange(parentContainerID, containerId)
	let instrumentID = containers[containerId]['allowedInstrumentID']
	let containerReturns = accounts[containerId]
	let openPos = containerReturns.open_position
	let historicalPos = containerReturns.historical_positions
	if(!instrumentPrices[instrumentID])console.log(containerId);
	let instrumentPrice = (instrumentPrices[instrumentID])?instrumentPrices[instrumentID]['curr_price'] : 0
	openPos.curr_price = instrumentPrice
	openPos.open_value = openPos.open_volume*openPos.curr_price
	openPos.open_profit = (openPos.open_value-openPos.open_exposure)*buySellMult
	historicalPos[max_date]['curr_price'] = openPos.curr_price
	historicalPos[max_date]['open_value'] = openPos.open_value
	historicalPos[max_date]['open_profit'] = openPos.open_profit
	if(parentContainerID!=null)containerTypeFunctions[containers[parentContainerID]['containerTypeID']].addChildAccountsOpenPosOnPriceChange(parentContainerID, containerId)
}

// calculateDeOpenPosBackExtrapolation
directEquityFunctions.calculateContainerOpenPosBackExtrapolation = function(containerId){
	let containerReturns = accounts[containerId]
	let instrumentOpenPos = containerReturns.current_open_positions.instrument_open_pos
	let instrumentHistoricalPos = containerReturns.historical_positions.instrument_historical_positions
	let containerOpenPosBackExtrapolation = {}
	let containerCombinedBackExtrapolation = {}
	let containerInstrumentBackExtrapolation = {}
	for(instrumentId in instrumentOpenPos)containerInstrumentBackExtrapolation[instrumentId] = {}
	for(let date of return_dates){
		let curr_date_open_value = 0;
		for(instrumentId in instrumentOpenPos){
			curr_date_open_value += instrumentOpenPos[instrumentId]['open_volume']*instrumentHistoricalPos[instrumentId][date]['price']
			containerInstrumentBackExtrapolation[instrumentId][date] = instrumentOpenPos[instrumentId]['open_volume']*instrumentHistoricalPos[instrumentId][date]['price']
		}
		containerCombinedBackExtrapolation[date] = curr_date_open_value;
	}
	containerOpenPosBackExtrapolation['combined_back_extrapolation'] = containerCombinedBackExtrapolation
	containerOpenPosBackExtrapolation['instrument_back_extrapolation'] = containerInstrumentBackExtrapolation
	containerReturns.current_open_positions['current_pos_back_extrapolation_value'] = containerOpenPosBackExtrapolation
}

directEquityFunctions.setContainerOpenPosRow = function(containerId, deReturnsRow){
	let containerReturns = accounts[containerId]
	let containerOpenPos = containerReturns.open_position
	let containerHistPos = containerReturns.historical_positions

	//calculate table row values
	let selectRowCheckbox = addSelectContainerRowCell()
	let containerName = containers[containerId]['containerName'];
	let containerBuySell = (containers[containerId]['buy_sell_type'])?containers[containerId]['buy_sell_type']:"N/A"
	let containerOpenDate = containerOpenPos['firstOpenTransactionDate'] || formatDate(containers[containerId]['openDate'])
	let volume = containerOpenPos.open_volume;
	let totalBookedProfit = containerHistPos[max_date].closed_profit;
	let bookedProfitStartDate = formatDate(containers[containerId]['bookedProfitStartDate'])
	//bookedProfitBeforeBPSD : bookedProfitBeforeBookedProftStartDate
	let bookedProfitBeforeBPSD = containerReturns.profitPriorBookedProfitStartDate
	let openPrice = (containerOpenPos.open_exposure/volume)
	let currPrice = ((containerHistPos[max_date].open_value/volume))
	let unbookedProfit = containerOpenPos['open_profit']

	//create table row cells
	let containerNameCell = setContainerRowNameCell(containerId, containerName)
	let buySellCell = document.createElement("td")
	let volumeCell = document.createElement("td")
	let openDateCell = document.createElement("td")
	let bookedProfitCell = document.createElement("td")
	let bookedProfitStartDateCell = document.createElement("td")
	let openPriceCell = document.createElement("td")
	let currPriceCell = document.createElement("td")
	let unbookedProfitCell = document.createElement("td")
	let setGroupCell = setContainerGroupCell(containerId);//to add update container group cell
	let closeTransactionCell = setContainerAddCloseTransactionButton()// to add close transaction for container

	//add table cell class to each row cell
	volumeCell.classList.add("accountViewTableCell")
	buySellCell.classList.add("accountViewTableCell")
	openDateCell.classList.add("accountViewTableCell")
	bookedProfitCell.classList.add("accountViewTableCell")
	openPriceCell.classList.add("accountViewTableCell")
	currPriceCell.classList.add("accountViewTableCell")
	unbookedProfitCell.classList.add("accountViewTableCell")
	bookedProfitStartDateCell.classList.add("accountViewTableCell")

	//add name attribute to cells for easier updating
	bookedProfitStartDateCell.setAttribute("name", "de_booked_profit_start_date")
	bookedProfitCell.setAttribute("name", "de_booked_profit")
	unbookedProfitCell.setAttribute("date", max_date)
	unbookedProfitCell.classList.add("unbooked_profit_cell")
	currPriceCell.setAttribute("name", "curr_price")
	openDateCell.setAttribute("name" ,"open_date")
	openPriceCell.setAttribute("name" ,"open_price")
	
	//set table cell inner text
	buySellCell.innerText = containerBuySell
	volumeCell.innerText = volume
	openDateCell.innerText = containerOpenDate
	bookedProfitCell.innerText = formatNumber(((totalBookedProfit-bookedProfitBeforeBPSD)/100))//.toFixed(2)
	bookedProfitStartDateCell.innerText = bookedProfitStartDate
	openPriceCell.innerText = formatNumber(openPrice/100)//.toFixed(2)
	currPriceCell.innerText = formatNumber(currPrice/100)//.toFixed(2)
	unbookedProfitCell.innerText = formatNumber(unbookedProfit/100)//.toFixed(2)

	if(unbookedProfit<0)unbookedProfitCell.style.color = "red";
	else if(unbookedProfit>0)unbookedProfitCell.style.color = "green";
	else unbookedProfitCell.style.color = "black"

	//create and set inner text for container unbooked profit change for earlier dates
	let returnCellsArr = []
	containerHistPos[max_date]['open_profit'] = unbookedProfit;
	for(let i=0; i<return_dates.length-1; i++){
		let currDate = return_dates[i]
		let currDateCell = document.createElement("td")
		if(accountsHideHistOpenProfit)currDateCell.style.display = "none"
		currDateCell.classList.add("accountViewTableCell")
		currDateCell.classList.add("unbooked_profit_cell")
		currDateCell.classList.add("histUnbookedProfitCell")
		currDateCell.setAttribute("date", currDate)
		if(containerHistPos[currDate]==null || containerHistPos[currDate]['open_volume']==0){
			currDateCell.innerText = "N/A";
			returnCellsArr.unshift(currDateCell)
			continue;
		}
		// let curr_date_profit = currDeContainerOpenPosBackExtrapolation[currDate]-containerOpenPos.open_exposure
		let currDateProfit = containerHistPos[currDate]['open_profit']//-containerHistPos[currDate]['open_exposure']
		let profit_change = unbookedProfit-currDateProfit
		let profitChangePercent = ((profit_change/Math.abs(currDateProfit))*100)
		currDateCell.innerText = formatNumber(currDateProfit/100) + "(" + formatNumber(profitChangePercent) + "%)"
		returnCellsArr.unshift(currDateCell)
		// containerHistPos[currDate]['open_profit'] = currDateProfit
	}

	//append table cells as children to container row
	deReturnsRow.appendChild(selectRowCheckbox)
	deReturnsRow.appendChild(containerNameCell)
	deReturnsRow.appendChild(buySellCell)
	deReturnsRow.appendChild(bookedProfitCell)
	// deReturnsRow.appendChild(bookedProfitStartDateCell)
	deReturnsRow.appendChild(openDateCell)
	deReturnsRow.appendChild(volumeCell)
	deReturnsRow.appendChild(openPriceCell)
	deReturnsRow.appendChild(currPriceCell)
	deReturnsRow.appendChild(unbookedProfitCell)
	for(returnCell of returnCellsArr)deReturnsRow.appendChild(returnCell);
	deReturnsRow.appendChild(setGroupCell)
	deReturnsRow.appendChild(closeTransactionCell)

	// parentTable.appendChild(deReturnsRow)
}

directEquityFunctions.setContainerClosePosRow = function(containerId, containerClosePosRow){
	let containerReturns = accounts[containerId]
	let containerHistPos = containerReturns.historical_positions

	let containerName = containers[containerId]['containerName'];
	let containerBookedProfit = containerHistPos[max_date].closed_profit;

	let containerNameCell = setContainerRowNameCell(containerId, containerName)
	let containerBookedProfitCell = document.createElement("td")
	containerBookedProfitCell.innerText = formatNumber(containerBookedProfit/100)

	containerNameCell.classList.add("accountViewTableCell")
	containerNameCell.style.textAlign = "left"
	containerBookedProfitCell.classList.add("accountViewTableCell")

	containerClosePosRow.appendChild(containerNameCell)
	containerClosePosRow.appendChild(containerBookedProfitCell)
}

// containerTransactionProcessDirectEquityTransaction
directEquityFunctions.containerAccountsRowProcessTransactionForm = function(containerId){
	let currContainer = containers[containerId]
	let transactionFieldsInputs = document.querySelector("#containerTransactionsForm").querySelectorAll(".formFieldInput")
	let transactionFields = {}
	transactionFieldsInputs.forEach(function(transactionFieldInput){
		transactionFields[transactionFieldInput.getAttribute("name")] = transactionFieldInput.value
	})
	let errors = [];
	({lot_size, ownerProfileID, parentContainerID, allowedInstrumentID, buy_sell_type} = currContainer)
	let volumeError = validateSingleTransationVolume(transactionFields['volume'], lot_size, ownerProfileID, parentContainerID, allowedInstrumentID, buy_sell_type, "close")
	if(volumeError)errors.push(volumeError)
	if(!validatePrice(transactionFields['price']))errors.push("Price must be a positive number");
	if(validateDirectEquityTransactionDate(transactionFields['transaction_date'], currContainer['containerTypeID'], containerId)!=true)
		errors.push(validateDirectEquityTransactionDate(transactionFields['transaction_date'], currContainer['containerTypeID'], containerId))
	if(!accountsRowCloseTransactionStrategyObj.isValidStrategyAssignment())errors.push('Invalid Strategy Assignment')
	if(errors.length>0)return displayRequestResult({"error": errors.join('\n')}, document.querySelector("#containerTransactionsForm"))
	transactionFields['price'] = setPriceInPaisa(transactionFields['price'])
	transactionFields['instrumentID'] = currContainer['allowedInstrumentID']
	transactionFields['ownerProfileID'] = currContainer['ownerProfileID']
	transactionFields['containerTypeID'] = currContainer['containerTypeID']
	transactionFields["exchangeTransaction"] = document.querySelector('input[name = "accountsRow_exchangetradedInput"]:checked').value == "onExchange"
	transactionFields['transaction_fees'] = 0.0
	transactionFields['open_close_type'] = "close"
	transactionFields['buy_sell_type'] = currContainer['buy_sell_type']
	transactionFields["strategyAssignMap"] = accountsRowCloseTransactionStrategyObj.getStrategyAssignMap()
	console.log(transactionFields)
	socket.emit('addTransactionsAjax', {"transactions":[transactionFields]}, function(error, data){
		if(error || data.error){
			console.log(error || data.error)
			return displayRequestResult({"error": "Backend Error"}, document.querySelector("#containerTransactionsForm"));
		}
		dataVersionId = data.dataVersionId
		let updatedAccounts = data['updatedAccounts']
		let addedContainers = data['addedContainers']
		let updatedStrategyContainers = data['updatedStrategyContainers']
		// updateContainerAccountsAndDisplay(addedContainers, updatedAccounts)
		let addedContainersEvent = new CustomEvent('addedContainers', {detail: addedContainers});
		document.dispatchEvent(addedContainersEvent);
		let updatedAccountsEvent = new CustomEvent('updatedAccounts', {detail: updatedAccounts});
		document.dispatchEvent(updatedAccountsEvent);
		let updatedStrategiesEvent = new CustomEvent('updatedStrategyContainers', {detail: updatedStrategyContainers});
		document.dispatchEvent(updatedStrategiesEvent);
		displayRequestResult({"message": "Transaction Added"}, document.querySelector("#containerTransactionsForm"));
	})
}

// directEquityContainerAddTransactionForm
directEquityFunctions.containerAccountsRowAddTransactionForm = function(containerId){
	let containerTransactionsForm = document.querySelector("#containerTransactionsForm")
	let transactionPriceField = containerTransactionsForm.querySelector("#transactionPriceField")
	let transactionVolumeField = containerTransactionsForm.querySelector("#transactionVolumeField")
	let transactionDateField = containerTransactionsForm.querySelector("#transactionDateField")
	let transactionExchangeTradedField = containerTransactionsForm.querySelector("#transactionExchangeTradedField")

	let currContainer = containers[containerId]
	accountsRowCloseTransactionStrategyObj.setTransactionPortfolio(containerTypes[currContainer['containerTypeID']]['PortfolioType'])
	accountsRowCloseTransactionStrategyObj.setTransactionOwner(currContainer['ownerProfileID'])
	accountsRowCloseTransactionStrategyObj.setTransactionBuySell(currContainer['buy_sell_type'])
	accountsRowCloseTransactionStrategyObj.setTransactionInstrument({isUnderlyingInstrument: (underlyingInstruments[currContainer["allowedInstrumentID"]] != undefined),id: currContainer["allowedInstrumentID"],underlyingInstrument: currContainer["underlyingInstrumentID"], 'lot_size': currContainer["lot_size"]})
	
	containerTransactionsForm.style.display = "block"
	transactionPriceField.style.display = "block"
	transactionVolumeField.style.display = "block"
	transactionDateField.style.display = "block"
	transactionExchangeTradedField.style.display = "block"
}

directEquityFunctions.displayTransactionFields = function(){
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
	containerSpecificFeildsContainer.querySelector("#transaction_instrumentID").setAttribute("instrumentTypes", "EQ")

	instrumentSelectContainer.style.display = "block"
	priceField.style.display = "block"
	volumeField.style.display = "block"
	transactionTypeField.style.display = "block"
	transactionBuySellField.style.display = "block"
	transactionExchangeTradedField.style.display = "block"
	// transactionFeesField.style.display = "block"
	transactionDateField.style.display = "block"

	document.removeEventListener("containerAdded", newContainerEventHandler)
	$(document.body).off("change","#transaction_instrumentID");
}

directEquityFunctions.validateTransactionForm = function(){
	errors = []
	let instrumentID = document.getElementById('transaction_instrumentID').value
	let volume = document.getElementById('transaction_volume').value
	let price = document.getElementById('transaction_price').value
	let transaction_date = document.getElementById('transaction_date').value

	if(instrumentID==""||volume==""||price==""||transaction_date==""){
		errors.push("Please fill out all fields")
		return errors
	}

	let transactionOwner = document.getElementById('transaction_ownerProfileID').value
	let transactionBuySellType = document.querySelector('input[name = "transaction_buy_sell_type"]:checked').value
	let transactionOpenCloseType = document.querySelector('input[name = "transaction_open_close_type"]:checked').value
	let instrumentInfo = $("#transaction_instrumentID").select2("data")[0];
	let volumeError = validateVolume(volume, instrumentInfo['lot_size'], transactionOwner, null, instrumentID, transactionBuySellType, transactionOpenCloseType)
	if(volumeError)errors.push(volumeError)
	// if(!validateVolume(volume, instrumentInfo['lot_size'], transactionOwner, null, instrumentID, transactionBuySellType, transactionOpenCloseType))errors.push('Volume must be a positive multiple of instrument lot size')
	if(!validatePrice(price))errors.push('Price must be a positive number')
	if(!transactionStrategyObj.isValidStrategyAssignment())errors.push('Invalid Strategy Assignment')
	if(validateDirectEquityTransactionDate(transaction_date)!=true)
		errors.push(validateDirectEquityTransactionDate(transaction_date))
	
	return errors
}

directEquityFunctions.setTransactionObject = function(){
	var ret = {
		'ownerProfileID': document.getElementById('transaction_ownerProfileID').value,
		'containerTypeID': document.getElementById('transaction_containerTypeID').value,
		// 'containerID': 'N/A',
		'instrumentID': document.getElementById('transaction_instrumentID').value,
		'price': setPriceInPaisa(document.getElementById('transaction_price').value),
		'volume': parseInt(document.getElementById('transaction_volume').value),
		'transaction_date': document.getElementById('transaction_date').value,
		'transaction_fees': parseFloat(document.getElementById('transaction_fees').value),
		"exchangeTransaction": document.querySelector('input[name = "transaction_exchange_type"]:checked').value == "onExchange",
		'open_close_type': document.querySelector('input[name = "transaction_open_close_type"]:checked').value,
		'buy_sell_type': document.querySelector('input[name = "transaction_buy_sell_type"]:checked').value,
		"strategyAssignMap": transactionStrategyObj.getStrategyAssignMap()
	}
	return ret;
}

function validateDirectEquityTransactionDate(transaction_date){
	transaction_date = new Date(transaction_date)
	transaction_date.setHours(0)
	transaction_date.setMinutes(0)
	transaction_date.setSeconds(0);
	curr_date = new Date()

	if(transaction_date>curr_date)
		return 'Transaction date cannot be a future date'

	return true
}

containerTypeFunctions[0] = directEquityFunctions