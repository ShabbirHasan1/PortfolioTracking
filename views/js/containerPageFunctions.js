var containerOpenPosHeaders = ['Instrument', 'Buy/Sell', 'Booked Profit', 'Open Date', 'Open Quantity', 'Open Price', 'Current Price', 'Unbooked Profit/Loss', 'Unbooked Profit/Loss (1 day)', 'Unbooked Profit/Loss (1 week)', 'Unbooked Profit/Loss (1 month)', 'Unbooked Profit/Loss (3 months)', 'Unbooked Profit/Loss (6 months)', 'Unbooked Profit/Loss (1 year)']
var container_transactions_returns_headers = ["Instrument", "Open/Close", "Open Date", "Close Date", "Quantity", "Open Price", "Transaction Price", "Booked Profit/Loss", "Tax"]

document.addEventListener('DOMContentLoaded', function (){
	var openView = getCurrPath()
	if(openView=="containerPage"){
		displayContainerPage()
	}
})

document.addEventListener("containerPageRequested", function(e){
	displayContainerPage()
});

window.addEventListener("popstate", function(event){
	let openView = getCurrPath()
	if(openView=="containerPage"){
		displayContainerPage()
		return;
	}
});

function hidePmsOpenPosHistUnbookedColumns(){
	let pmsOpenPosTable = document.querySelector("#pmsOpenPosTable")
	let histUnbookedProfitCell = pmsOpenPosTable.querySelectorAll(".histUnbookedProfitCell")
	let toggleHistVisCells = pmsOpenPosTable.querySelectorAll(".toggleHistUnbookedVisibility")
	if(getComputedStyle(histUnbookedProfitCell[0], null).display!="none"){
		histUnbookedProfitCell.forEach(function(cell){cell.style.display = "none"})
		toggleHistVisCells.forEach(function(cell){cell.innerText = ">"})
		return;
	}
	histUnbookedProfitCell.forEach(function(cell){cell.style.display = "table-cell"})
	toggleHistVisCells.forEach(function(cell){cell.innerText = "<"})
}

function displayContainerPage(){
	if(dataSet)return displayContainerData();
	document.addEventListener("dataSet", function(e){
		displayContainerData()
	}, {once: true})
}

function displayContainerData(){
	getContainerPageData(function(error, containerTransactionReturns){
		if(error)return console.log(error);
		setContainerPageTitle()
		let url = new URL(window.location.href)
		let containerId = url.searchParams.get('containerId')
		let containerTypeId = containers[containerId]['containerTypeID']
		let openPosDiv = displayContainerOpenPosition[containerTypeId](containerId)
		var closeTransactions = containerTransactionReturns.filter(function(transaction){return transaction.open_close_type == -1})
		var containerPageDiv = document.getElementById("containerPageContainer");
		deleteAllChildren(containerPageDiv)
		var containerInfoDiv = document.createElement("div")
		var containerTransactionsDiv = document.createElement("div")
		containerInfoDiv.classList.add("containerInfo")
		containerTransactionsDiv.classList.add("containerTransactions")
		displayContainerInfo(containerId, containerInfoDiv)
		displayContainerTransactions(closeTransactions, containerTransactionsDiv)
		containerPageDiv.appendChild(containerInfoDiv)
		if(openPosDiv!=null)containerPageDiv.appendChild(openPosDiv)
		containerPageDiv.appendChild(containerTransactionsDiv)
	})
}

function getContainerPageData(callback){
	let url = new URL(window.location.href)
	let containerID = url.searchParams.get('containerId')
	postRequest('/containerPage', {"containerID": containerID}, function(error, result){
		if(error)return callback(error);
		console.log(result.data)
		return callback(null, result.data)
	})
}

function displayContainerInfo(containerId, containerInfoDiv){
	containerNameDiv = document.createElement("div")
	containerOwnerDiv = document.createElement("div")
	containerGroupDiv = document.createElement("div")
	containerBookedProfitStartDateDiv = document.createElement("div")
	containerNameDiv.classList.add("containerInfoDiv")
	containerOwnerDiv.classList.add("containerInfoDiv")
	containerGroupDiv.classList.add("containerInfoDiv")
	containerBookedProfitStartDateDiv.classList.add("containerInfoDiv")
	containerNameDiv.innerText = containers[containerId]['containerName']
	containerOwnerDiv.innerText = containerOwners[containers[containerId]['ownerProfileID']]['firstName']
	// containerGroupDiv.innerText = "Group: " + (containers[containerId]['groupID']==null ? "None" : groups[containers[containerId]['groupID']]['groupName'])
	containerGroupDiv.appendChild(setContainerGroupDiv(containerId))
	containerBookedProfitStartDateDiv.appendChild(setBookedProfitStartDateDiv(containerId)) 

	containerInfoDiv.appendChild(containerNameDiv)
	containerInfoDiv.appendChild(containerOwnerDiv)
	containerInfoDiv.appendChild(containerGroupDiv)
	containerInfoDiv.appendChild(containerBookedProfitStartDateDiv)
}

function displayContainerTransactions(containerTransactions, containerTransactionsDiv){
	var containerTransactionsTable = document.createElement("table");
	containerTransactionsTable.classList.add("containerTransactionsTable")
	// containerTransactionsTable.classList.add("col-sm-12")
	var headerRow = document.createElement("tr")
	headerRow.classList.add("containerTransactionHeaderRow")
	for(val of container_transactions_returns_headers){
		var currHeader = document.createElement("th")
		currHeader.classList.add("containerTransactionsTableHeader")
		currHeader.innerText = val
		headerRow.appendChild(currHeader)
	}

	containerTransactionsTable.appendChild(headerRow);
	containerTransactions.forEach(function(transaction, idx){
		containerTransactionsTable.appendChild(getContainerTransactionRow(transaction))
	})
	containerTransactionsDiv.appendChild(containerTransactionsTable)
}

function getContainerTransactionRow(transaction){
	containerID = transaction['containerID']
	var transactionRow = document.createElement("tr")
	transactionRow.classList.add("containerTransactionRow")
	var nameCell = document.createElement("td")
	var OpenCloseCell = document.createElement("td")
	var openDateCell = document.createElement("td")
	var closeDateCell = document.createElement("td")
	var quantityCell = document.createElement("td")
	var openPriceCell = document.createElement("td")
	var closePriceCell = document.createElement("td")
	var bookedProfitCell = document.createElement("td")
	var taxCell = document.createElement("td")
	nameCell.innerText = containers[containerID]['containerName']
	OpenCloseCell.innerText = (transaction['open_close_type']==-1)?"Close": "Open"
	openDateCell.innerText = (transaction['transaction_open_date'])?transaction['transaction_open_date']:'N/A'
	closeDateCell.innerText = formatDate(transaction['transaction_date'])
	quantityCell.innerText = transaction['volume']
	openPriceCell.innerText = (transaction['transaction_closed_exposure'])?formatNumber((transaction['transaction_closed_exposure']/transaction['volume'])/100):'N/A'
	closePriceCell.innerText = formatNumber(transaction['price']/100)
	bookedProfitCell.innerText = (transaction['transaction_profit'])?formatNumber(transaction['transaction_profit']/100): "N/A"
	// taxCell.innerText = (transaction.trasaction_open_close_type=="Close")?formatNumber(transaction.transaction_tax/100) : "N/A"
	taxCell.innerText = 0
	nameCell.classList.add("containerTransactionCell")
	OpenCloseCell.classList.add("containerTransactionCell")
	openDateCell.classList.add("containerTransactionCell")
	closeDateCell.classList.add("containerTransactionCell")
	quantityCell.classList.add("containerTransactionCell")
	openPriceCell.classList.add("containerTransactionCell")
	closePriceCell.classList.add("containerTransactionCell")
	bookedProfitCell.classList.add("containerTransactionCell")
	taxCell.classList.add("containerTransactionCell")
	transactionRow.appendChild(nameCell)
	transactionRow.appendChild(OpenCloseCell)
	transactionRow.appendChild(openDateCell)
	transactionRow.appendChild(closeDateCell)
	transactionRow.appendChild(quantityCell)
	transactionRow.appendChild(openPriceCell)
	transactionRow.appendChild(closePriceCell)
	transactionRow.appendChild(bookedProfitCell)
	transactionRow.appendChild(taxCell)
	return transactionRow
}

var displayPMSOpenPosition = function(containerID){
	// console.log("Inside displayPMSOpenPosition function")
	let containerOwner = containers[containerID]['ownerProfileID']
	let containerTypeId = containers[containerID]['containerTypeID']
	let childContainerAccounts = Object.filter(accounts, function(childContainerID, childContainerAccounts){
		return (containers[childContainerID]['parentContainerID'] == containerID) && (accounts[childContainerID]['open_position']['open_volume']>0);
	})
	console.log(childContainerAccounts)
	// let instrumentOpenPositions = containerAccounts['current_open_positions']['instrument_open_pos']
	// let instrumentHistoricalPositions = containerAccounts['historical_positions']['instrument_historical_positions']
	let pmsInstrumentsOpenPosDiv = document.createElement("div")
	pmsInstrumentsOpenPosDiv.classList.add("pmsOpenPos")
	let instrumentOpenPosTable = document.createElement("table")
	instrumentOpenPosTable.setAttribute("id", "pmsOpenPosTable")
	instrumentOpenPosTable.classList.add("accountViewTable")
	instrumentOpenPosTable.appendChild(setContainerOpenPosHeaderRow())
	for (let childContainerID in childContainerAccounts)
		instrumentOpenPosTable.appendChild(setInstrumentOpenPosRow(childContainerID))
	pmsInstrumentsOpenPosDiv.appendChild(instrumentOpenPosTable)
	return pmsInstrumentsOpenPosDiv
}

function setContainerOpenPosHeaderRow(){
	let headerRow = document.createElement("tr")
	for(val of containerOpenPosHeaders){
		let currHeader = document.createElement("th")
		currHeader.classList.add("accountViewTableHeader")
		if(val.indexOf("(")>0)currHeader.classList.add("histUnbookedProfitCell");
		currHeader.innerText = val
		if(val=="Unbooked Profit/Loss"){
			let toggleDiv = document.createElement("a")
			toggleDiv.classList.add("toggleHistUnbookedVisibility")
			toggleDiv.innerText = "<"
			currHeader.appendChild(toggleDiv)
			toggleDiv.addEventListener("click", function(e){e.preventDefault(); hidePmsOpenPosHistUnbookedColumns()})
		}
		headerRow.appendChild(currHeader)
	}
	return headerRow
}

function setInstrumentOpenPosRow(containerID){
	let instrumentOpenPosRow = document.createElement("tr")
	instrumentOpenPosRow.setAttribute("containerID", containerID)
	instrumentOpenPosRow.classList.add("pmsContainerInstrumentOpenPosRow")
	
	let containerAccounts = accounts[containerID]
	let historicalPositions = containerAccounts['historical_positions']
	let openPosition = containerAccounts['open_position']
	let bookedProfitVal = openPosition['closed_profit']// - containerAccounts['profitPriorBookedProfitStartDate']
	let openDateVal = openPosition['firstOpenTransactionDate']
	let openQuantityVal = openPosition['open_volume']
	let openPriceVal = openPosition['open_exposure']/openQuantityVal
	let currentPriceVal = openPosition['open_value']/openQuantityVal
	let unbookedProfitVal = openPosition['open_profit']
	// let instrumentCurrOpenProfit = insturmentBackProp[max_date]-instrumentOpenPos.open_exposure;

	let instrumentCell = document.createElement("td")
	let buySellCell = document.createElement("td")
	let bookedProfitCell = document.createElement("td")
	let openDateCell = document.createElement("td")
	let openQuantityCell = document.createElement("td")
	let openPriceCell = document.createElement("td")
	let currentPriceCell = document.createElement("td")
	let unbookedProfitCell = document.createElement("td")
	
	instrumentCell.classList.add("accountViewTableCell")
	buySellCell.classList.add("accountViewTableCell")
	bookedProfitCell.classList.add("accountViewTableCell")
	openDateCell.classList.add("accountViewTableCell")
	openQuantityCell.classList.add("accountViewTableCell")
	openPriceCell.classList.add("accountViewTableCell")
	currentPriceCell.classList.add("accountViewTableCell")
	currentPriceCell.setAttribute("name", "curr_price")
	unbookedProfitCell.classList.add("accountViewTableCell")
	unbookedProfitCell.classList.add("unbooked_profit_cell")
	unbookedProfitCell.setAttribute("date", max_date)

	if(unbookedProfitVal<0)unbookedProfitCell.style.color = "red";
	else if(unbookedProfitVal>0)unbookedProfitCell.style.color = "green";
	else unbookedProfitCell.style.color = "black";

	let instrumentReturnsCellsArr = []
	for(let i=0; i<return_dates.length-1; i++){
		let curr_date = return_dates[i]
		let curr_date_cell = document.createElement("td")
		curr_date_cell.classList.add("accountViewTableCell")
		curr_date_cell.classList.add("histUnbookedProfitCell")
		if(historicalPositions[curr_date]==null){
			curr_date_cell.innerText = 'N/A'
			instrumentReturnsCellsArr.unshift(curr_date_cell)
			continue
		}
		let curr_date_profit = historicalPositions[curr_date]['open_profit']
		let profit_change = unbookedProfitVal-curr_date_profit
		let profit_change_percentage = ((profit_change/Math.abs(curr_date_profit))*100)//.toFixed(2)
		curr_date_cell.classList.add("unbooked_profit_cell")
		curr_date_cell.classList.add("histUnbookedProfitCell")
		curr_date_cell.setAttribute("date", curr_date)
		curr_date_cell.innerText = formatNumber(curr_date_profit/100) + "(" + formatNumber(profit_change_percentage) + "%)"
		instrumentReturnsCellsArr.unshift(curr_date_cell)
	}

	// instrumentCell.innerText = instruments["all"][instrumentId]['displayName']
	instrumentCell.innerText = containers[containerID]['containerName']
	// (getInstrumentType(instrumentId)=="MF")?mfInstruments[instrumentId]['tradingsymbol']:eqInstruments[instrumentId]['tradingsymbol']
	bookedProfitCell.innerText = formatNumber(bookedProfitVal/100)//.toFixed(2)
	buySellCell.innerText = containers[containerID]['buy_sell_type']
	openDateCell.innerText = openDateVal
	openQuantityCell.innerText = openQuantityVal
	openPriceCell.innerText = formatNumber(openPriceVal/100)//.toFixed(2)
	currentPriceCell.innerText = formatNumber(currentPriceVal/100)//.toFixed(2)
	unbookedProfitCell.innerText = formatNumber(unbookedProfitVal/100)//.toFixed(2)
	
	instrumentOpenPosRow.appendChild(instrumentCell)
	instrumentOpenPosRow.appendChild(buySellCell)
	instrumentOpenPosRow.appendChild(bookedProfitCell)
	instrumentOpenPosRow.appendChild(openDateCell)
	instrumentOpenPosRow.appendChild(openQuantityCell)
	instrumentOpenPosRow.appendChild(openPriceCell)
	instrumentOpenPosRow.appendChild(currentPriceCell)
	instrumentOpenPosRow.appendChild(unbookedProfitCell)
	for(returns_cell of instrumentReturnsCellsArr)instrumentOpenPosRow.appendChild(returns_cell);
	return instrumentOpenPosRow
}

var displayDirectEquityOpenPosition = function(containerId){
	return null;
}

function setBookedProfitStartDateDiv(containerId){
	let bookedProfitStartDate = document.createElement("div")
	let bookedProfitHeaderDiv = document.createElement("div")
	let bookedProfitValueDiv = document.createElement("div")
	bookedProfitHeaderDiv.classList.add("bookedProfitHeaderDiv")
	bookedProfitValueDiv.classList.add("bookedProfitValueDiv")
	bookedProfitHeaderDiv.innerText = "Booked Profit Start Date: "; + 
	setBookedProfitDateValueDiv(containerId, bookedProfitValueDiv)
	bookedProfitStartDate.appendChild(bookedProfitHeaderDiv)
	bookedProfitStartDate.appendChild(bookedProfitValueDiv)
	return bookedProfitStartDate
}

function setBookedProfitDateValueDiv(containerId, bookedProfitValueDiv){
	let bookedProfitValueInnerDiv = document.createElement("div")
	bookedProfitValueDiv.classList.add("containerUpdatableAttributeValue")
	bookedProfitValueInnerDiv.innerText = formatDate(containers[containerId]['bookedProfitStartDate'])
	bookedProfitValueInnerDiv.addEventListener("click", function(e){
		deleteAllChildren(bookedProfitValueDiv)
		displaySetBookedProfitDateInput(containerId, bookedProfitValueDiv)
	})
	bookedProfitValueDiv.appendChild(bookedProfitValueInnerDiv)
}

function displaySetBookedProfitDateInput(containerId, bookedProfitValueDiv){
	let dateInputDiv = document.createElement("div")
	let dateInput = document.createElement("input")
	dateInput.setAttribute("type", "date")
	dateInput.value = formatDate(containers[containerId]['bookedProfitStartDate'])
	dateInputDiv.appendChild(dateInput)
	bookedProfitValueDiv.appendChild(dateInputDiv)
	dateInput.addEventListener("change", function(e){
		let updateBookedProfitStartDateContainerList = [containerId]
		let bookedProfitStartDate = new Date(this.value).getTime()
		let updateData = {
			"container_list": updateBookedProfitStartDateContainerList,
			"bookedProfitStartDate": formatDate(bookedProfitStartDate)
		}
		let currInputField = this;
		socket.emit('updateContainersBookedProfitStartDate', updateData, function(error, data){
			if(error || data.error){
				console.log(error)
				alert("error updating booked profit start date");
				return currInputField.value = ""
			}
			currInputField.value = ""
			dataVersionId = data.dataVersionId
			// updatenewProfitBookedDateAccountsAndDisplay(data['updatedAccounts'], newDate)
			updatenewProfitBookedDateAccountsAndDisplay(data['updatedAccounts'], bookedProfitStartDate)
			deleteAllChildren(bookedProfitValueDiv)
			setBookedProfitDateValueDiv(containerId, bookedProfitValueDiv)
		})
	})
	setTimeout(function(){
		document.addEventListener('click', function clickLocationEventHandler(e){
			if(!dateInput.contains(e.target)){
				document.removeEventListener("click", clickLocationEventHandler)
				deleteAllChildren(bookedProfitValueDiv)
				setBookedProfitDateValueDiv(containerId, bookedProfitValueDiv)
			}
		});
	}, 0)
}

function setContainerGroupDiv(containerId){
	let containerGroup = document.createElement("div")
	let containerGroupHeaderDiv = document.createElement("div")
	let containerGroupValueDiv = document.createElement("div")
	containerGroupHeaderDiv.classList.add("containerGroupHeaderDiv")
	containerGroupValueDiv.classList.add("containerGroupValueDiv")
	containerGroupHeaderDiv.innerText = "Group: "; + 
	setContainerGroupValueDiv(containerId, containerGroupValueDiv)
	containerGroup.appendChild(containerGroupHeaderDiv)
	containerGroup.appendChild(containerGroupValueDiv)
	return containerGroup
}

function setContainerGroupValueDiv(containerId, containerGroupValueDiv){
	let containerGroupValueInnerDiv = document.createElement("div")
	containerGroupValueInnerDiv.classList.add("containerUpdatableAttributeValue")
	let groupValText = containers[containerId]['groupID']==null ? "None" : groups[containers[containerId]['groupID']]['groupName']
	containerGroupValueInnerDiv.innerText = groupValText
	containerGroupValueInnerDiv.addEventListener("click", function(e){
		deleteAllChildren(containerGroupValueDiv)
		displaySetContainerGroupSelect(containerId, containerGroupValueDiv)
	})
	containerGroupValueDiv.appendChild(containerGroupValueInnerDiv)
}

function displaySetContainerGroupSelect(containerId, containerGroupValueDiv){
	let groupInputDiv = document.createElement("div")
	let groupSelect = document.createElement("Select")
	let groupsSelectFields = [{'inputField': 'groupID', 'outputField': 'value'}]
	createSelectOptionsList(groupSelect, groups, groupsSelectFields, 'groupName', true, 'None', false, containers[containerId]['groupID']==null)
	if(containers[containerId]['groupID']!=null)groupSelect.value = containers[containerId]['groupID']
	groupInputDiv.appendChild(groupSelect)
	containerGroupValueDiv.appendChild(groupInputDiv)
	groupSelect.addEventListener("change", function(e){
		let updateData = {
			"containerID": containerId,
			"groupID": this.value
		}
		let currGroupSelectList = this
		socket.emit('updateSingleContainerGroup', updateData, function(error, data){
			if(error || data.error){
				console.log(data.error)
				alert("Error updating container group for " + containers[containerId]['containerName'])
				currGroupSelectList.value = containers[containerId]['groupID']==null ? '' : containers[containerId]['groupID']
				return
			}
			dataVersionId = data.dataVersionId
			containers[containerId]['groupID'] = updateData['groupID']==""? null : updateData['groupID']
			let containerAccountsTableRow = document.querySelector("#containerReturns_"+containerId)
			let containerRowGroupSelect = containerAccountsTableRow.querySelector("[name='containerGroupSelect']")
			containerRowGroupSelect.value = updateData['groupID']
			console.log(containerRowGroupSelect)
			console.log(containerAccountsTableRow)
			deleteAllChildren(containerGroupValueDiv)
			setContainerGroupValueDiv(containerId, containerGroupValueDiv)
		})
	})
	setTimeout(function(){
		document.addEventListener('click', function clickLocationEventHandler(e){
			if(!groupSelect.contains(e.target)){
				document.removeEventListener("click", clickLocationEventHandler)
				deleteAllChildren(containerGroupValueDiv)
				setContainerGroupValueDiv(containerId, containerGroupValueDiv)
			}
		});
	}, 0)
}

function updatePmsInsturmentsTableOnPriceChange(){
	let openView = getCurrPath()
	if(openView!="containerPage")return;
	let url = new URL(window.location.href)
	let containerID = url.searchParams.get('containerId')
	if(!containers.hasOwnProperty(containerID) || containers[containerID]['containerTypeID']!=1)return;
	let instrumentOpenPosTable = document.querySelector("#pmsOpenPosTable")
	let instrumentRows = instrumentOpenPosTable.querySelectorAll(".pmsContainerInstrumentOpenPosRow")
	instrumentRows.forEach(function(instrumentRow){
		updatePmsInsturmentsTableRowOnPriceChange(instrumentRow)
	})
}

function updatePmsInsturmentsTableRowOnPriceChange(instrumentRow){
	let containerID = instrumentRow.getAttribute("containerID")
	let currContainer = containers[containerID]
	if(currContainer['containerTypeID']==3)return;
	let instrumentId = currContainer["allowedInstrumentID"]
	let containerReturns = accounts[containerID]
	let historicalPositions = containerReturns['historical_positions']
	let openPosition = containerReturns['open_position']
	let unbooked_profit_cells = instrumentRow.querySelectorAll(".unbooked_profit_cell")
	let unbooked_profit = openPosition['open_profit']
	let current_price_cell = instrumentRow.querySelector("[name='curr_price']")
	let currPrice = (instrumentPrices[instrumentId])?instrumentPrices[instrumentId]['curr_price'] : 0
	current_price_cell.innerText = formatNumber(currPrice/100)//(current_price/100).toFixed(2)
	
	unbooked_profit_cells.forEach(function(unbooked_profit_cell){
		if(unbooked_profit_cell.getAttribute("date")==max_date){
			unbooked_profit_cell.innerText = formatNumber(unbooked_profit/100)//.toFixed(2)
			if(unbooked_profit<0)unbooked_profit_cell.style.color = "red";
			else if(unbooked_profit>0)unbooked_profit_cell.style.color = "green";
			else unbooked_profit_cell.style.color = "black";
			return;
		}
		let curr_date = unbooked_profit_cell.getAttribute("date")
		if(historicalPositions[curr_date]==null)return;
		let curr_date_profit = historicalPositions[curr_date]['open_profit']
		let profit_change = unbooked_profit-curr_date_profit
		let profit_change_percentage = ((profit_change/Math.abs(curr_date_profit))*100)
		unbooked_profit_cell.innerText = formatNumber(curr_date_profit/100) + "(" + formatNumber(profit_change_percentage) + "%)"
	})
}

function setContainerPageTitle(){
	let url = new URL(window.location.href)
	let containerID = url.searchParams.get('containerId')
	let title = containers[containerID]['containerName']
	console.log(title)
	setPageTitle(title)
}

displayContainerOpenPosition = {
	0: displayDirectEquityOpenPosition,
	1: displayPMSOpenPosition,
	2: displayDirectEquityOpenPosition,
	3: displayDirectEquityOpenPosition,
	4: displayDirectEquityOpenPosition,
	5: displayDirectEquityOpenPosition,
	6: displayDirectEquityOpenPosition
}