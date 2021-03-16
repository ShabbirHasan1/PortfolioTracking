var mutualFundFunctions = {}

mutualFundFunctions.updateAccoutsTableRowOnPriceChange = function(){}

// mutualFundFunctions.updateContainerCurrentUnbookedValue = directEquityFunctions.updateContainerCurrentUnbookedValue
mutualFundFunctions.updateContainerCurrentUnbookedValue = function(){}

mutualFundFunctions.calculateContainerOpenPosBackExtrapolation = directEquityFunctions.calculateContainerOpenPosBackExtrapolation

mutualFundFunctions.setContainerOpenPosRow = directEquityFunctions.setContainerOpenPosRow

mutualFundFunctions.setContainerClosePosRow = directEquityFunctions.setContainerClosePosRow

mutualFundFunctions.containerAccountsRowProcessTransactionForm = directEquityFunctions.containerAccountsRowProcessTransactionForm

mutualFundFunctions.containerAccountsRowAddTransactionForm = function(containerID){
	directEquityFunctions.containerAccountsRowAddTransactionForm(containerID)
}

mutualFundFunctions.displayTransactionFields = function(){
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
	containerSpecificFeildsContainer.querySelector("#transaction_instrumentID").setAttribute("instrumentTypes", "MF")
	instrumentSelectContainer.style.display = "block"
	priceField.style.display = "block"
	volumeField.style.display = "block"
	transactionTypeField.style.display = "block"
	transactionBuySellField.style.display = "block"
	transactionFeesField.style.display = "block"
	transactionDateField.style.display = "block"
}

mutualFundFunctions.validateTransactionForm = directEquityFunctions.validateTransactionForm

mutualFundFunctions.setTransactionObject = function(){
	var ret = {
		'ownerProfileID': document.getElementById('transaction_ownerProfileID').value,
		// 'containerTypeID': document.getElementById('transaction_containerTypeID').value,
		'containerTypeID': 3,
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

containerTypeFunctions[3] = mutualFundFunctions