var futureFunctions = {}

futureFunctions.updateAccoutsTableRowOnPriceChange = directEquityFunctions.updateAccoutsTableRowOnPriceChange

futureFunctions.updateContainerCurrentUnbookedValue = function(containerId){
	if(new Date()>containers[containerId]['closeDate'])return;
	directEquityFunctions.updateContainerCurrentUnbookedValue(containerId)
}

futureFunctions.calculateContainerOpenPosBackExtrapolation = directEquityFunctions.calculateContainerOpenPosBackExtrapolation

futureFunctions.setContainerOpenPosRow = directEquityFunctions.setContainerOpenPosRow

futureFunctions.setContainerClosePosRow = directEquityFunctions.setContainerClosePosRow

futureFunctions.containerAccountsRowProcessTransactionForm = directEquityFunctions.containerAccountsRowProcessTransactionForm

futureFunctions.containerAccountsRowAddTransactionForm = function(containerID){
	// console.log("Inside mutual fund containerAccountsRowAddTransactionForm function")
	directEquityFunctions.containerAccountsRowAddTransactionForm(containerID)
	// let containerTransactionsForm = document.querySelector("#containerTransactionsForm")
	// let transactionPriceField = containerTransactionsForm.querySelector("#transactionPriceField")
	// console.log(transactionPriceField)
}

futureFunctions.displayTransactionFields = function(){
	let containerSpecificFeildsContainer = document.querySelector("#containerTypeSpecificTransactionDetails");

	containersSelectDiv = containerSpecificFeildsContainer.querySelector("#transaction_containerID_div")
	instrumentSelectContainer = containerSpecificFeildsContainer.querySelector("#transaction_instrumentID_div")
	priceField = containerSpecificFeildsContainer.querySelector("#transaction_price_field")
	volumeField = containerSpecificFeildsContainer.querySelector("#transaction_volume_field")
	transactionTypeField = containerSpecificFeildsContainer.querySelector("#open_close_type_type")
	transactionBuySellField = containerSpecificFeildsContainer.querySelector("#buy_sell_type_type")
	transactionExchangeTradedField = containerSpecificFeildsContainer.querySelector("#transaction_exchange_traded_type")
	// transactionFeesField = containerSpecificFeildsContainer.querySelector("#transaction_fees_field")
	transactionDateField = containerSpecificFeildsContainer.querySelector("#transaction_date_field")
	containerSpecificFeildsContainer.querySelector("#transaction_instrumentID").setAttribute("instrumentTypes", "FUT")
	instrumentSelectContainer.style.display = "block"
	priceField.style.display = "block"
	volumeField.style.display = "block"
	transactionTypeField.style.display = "block"
	transactionBuySellField.style.display = "block"
	// transactionFeesField.style.display = "block"
	transactionDateField.style.display = "block"
}

futureFunctions.validateTransactionForm = directEquityFunctions.validateTransactionForm

futureFunctions.setTransactionObject = function(){
	var ret = {
		'ownerProfileID': document.getElementById('transaction_ownerProfileID').value,
		// 'containerTypeID': document.getElementById('transaction_containerTypeID').value,
		'containerTypeID': 4,
		// 'containerID': 'N/A',
		'instrumentID': document.getElementById('transaction_instrumentID').value,
		'price': setPriceInPaisa(document.getElementById('transaction_price').value),
		'volume': parseInt(document.getElementById('transaction_volume').value),
		'transaction_date': document.getElementById('transaction_date').value,
		'transaction_fees': parseFloat(document.getElementById('transaction_fees').value),
		"exchangeTransaction": true,
		'open_close_type': document.querySelector('input[name = "transaction_open_close_type"]:checked').value,
		'buy_sell_type': document.querySelector('input[name = "transaction_buy_sell_type"]:checked').value,
		"strategyAssignMap": transactionStrategyObj.getStrategyAssignMap()
	}
	// console.log(ret)
	return ret;
}

containerTypeFunctions[4] = futureFunctions