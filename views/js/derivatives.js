var strategyTableHeaders = ['Name', 'Open/Close', 'Expiry', 'Underlying Price', 'Type', 'Buy/Sell', 'Strike', 'Volume', 'Open Price', 'Open Premium', 'Total premium Earned/Paid', 'Current Price', 'Profit/Loss', 'Gross Value', 'Expected Return on Premium', 'Premium on the table', 'Return on Gross', 'Actions']
var strategyContainerRowCloseFormSelectedStrategyContainer = null
var strategySpreadGraphObjMap = {}
var optionChainObj = null;
var isOptionChainOpen = false;
var filterTimer = null;
const strategyOwnerActiveSearchTerm = {}
var strategyTableFields = {
	'Name': {
		setOpenValue: setStrategyContainerName,
		setCloseValue: setStrategyContainerName,
		updateValueOnPriceChange: false
	},
	'Open/Close': {
		setOpenValue: setRowOpenVal,
		setCloseValue: setRowCloseVal,
		updateValueOnPriceChange: false
	}, 
	'Expiry':{
		setOpenValue: setStrategyContainerExpiry,
		setCloseValue: setStrategyContainerExpiry,
		updateValueOnPriceChange: false
	},
	'Underlying Price': {
		setOpenValue: setStrategyContainerUnderlyingPrice,
		setCloseValue: setStrategyContainerUnderlyingPrice,
		updateValueOnPriceChange: true
	}, 
	'Type': {
		setOpenValue: setStrategyContainerInstrumentType,
		setCloseValue: setStrategyContainerInstrumentType,
		updateValueOnPriceChange: false
	}, 
	'Buy/Sell': {
		setOpenValue: setStrategyContainerBuySellType,
		setCloseValue: setStrategyContainerBuySellType,
		updateValueOnPriceChange: false
	}, 
	'Strike': {
		setOpenValue: setStrategyContainerStrike,
		setCloseValue: setStrategyContainerStrike,
		updateValueOnPriceChange: false
	}, 
	'Volume': {
		setOpenValue: setStrategyContainerOpenVolume,
		setCloseValue: setStrategyContainerCloseVolume,
		updateValueOnPriceChange: false
	}, 
	'Open Price': {
		setOpenValue: setStrategyContainerOpenOpenPrice,
		setCloseValue: setStrategyContainerCloseOpenPrice,
		updateValueOnPriceChange: false
	}, 
	'Open Premium': {
		setOpenValue: setStrategyContainerOpenOpenPremium,
		setCloseValue: setStrategyContainerCloseOpenPremium,
		updateValueOnPriceChange: false
	}, 
	'Total premium Earned/Paid': {
		setOpenValue: setStrategyContainerOpenTotalPremium,
		setCloseValue: setStrategyContainerCloseTotalPremium,
		updateValueOnPriceChange: false
	}, 
	'Current Price': {
		setOpenValue: setStrategyContainerOpenCurrentPrice,
		setCloseValue: setStrategyContainerCloseCurrentPrice,
		updateValueOnPriceChange: true
	}, 
	'Profit/Loss': {
		setOpenValue: setStrategyContainerOpenProfit,
		setCloseValue: setStrategyContainerCloseProfit,
		updateValueOnPriceChange: true
	}, 
	'Gross Value': {
		setOpenValue: setStrategyContainerOpenGrossValue,
		setCloseValue: setStrategyContainerCloseGrossValue,
		updateValueOnPriceChange: false
	}, 
	'Expected Return on Premium': {
		setOpenValue: setStrategyContainerOpenExpectedReturnOnPremium,
		setCloseValue: setStrategyContainerCloseExpectedReturnOnPremium,
		updateValueOnPriceChange: true
	}, 
	'Premium on the table': {
		setOpenValue: setStrategyContainerPremiumOnTable,
		setCloseValue: setStrategyContainerPremiumOnTable,
		updateValueOnPriceChange: true
	}, 
	'Return on Gross': {
		setOpenValue: setStrategyContainerOpenReturnOnGross,
		setCloseValue: setStrategyContainerCloseReturnOnGross,
		updateValueOnPriceChange: true
	},  
	'Actions': {
		setOpenValue: setStrategyContainerActions,
		setCloseValue: setStrategyContainerActions,
		updateValueOnPriceChange: false
	},
}

window.addEventListener("resize", function(){
	resizeSpreadDisplayDivs()
})

window.addEventListener("popstate", function(event){
	setOptionChainIntervalState()
});

document.addEventListener('visibilitychange', function(event){
	//To be added later, right now causing too many requests
	// setOptionChainIntervalState()
})

document.addEventListener("urlUpdate", function(event){
	setOptionChainIntervalState()
})

document.querySelector("#toggleOptionChainDisplay").addEventListener("click", function(e){
	toggleOptionChainDisplay(this)
	resizeSpreadDisplayDivs()
})

function toggleOptionChainDisplay(toggleOptionChainButton){
	let optionChainContainer = document.querySelector("#optionChainContainer")
	let derivativesContainer = document.querySelector("#derivativesContainer")
	if(getComputedStyle(optionChainContainer, null).display=="block"){
		optionChainContainer.style.display = "none"
		derivativesContainer.style.width = "100%";
		toggleOptionChainButton.innerText = ">";
		isOptionChainOpen = false;
		setOptionChainIntervalState()
		return
	}
	optionChainContainer.style.display = "block"
	derivativesContainer.style.width = "75%";
	toggleOptionChainButton.innerText = "<"
	isOptionChainOpen = true;
	setOptionChainIntervalState()
}

initAddStrategyContainerCloseTransactionForm()

document.addEventListener("dataSet", function(e){
	initderivativesStrategyDisplay()
	initDerivativesActions()
})

document.addEventListener("dataSet", function(e){
	let optionChainContainer = document.querySelector("#optionChainContainer")
	optionChainObj = new optionChain(optionChainContainer)
	optionChainContainer.style.display = "none"
	resizeSpreadDisplayDivs()
}, {"once": true})

document.addEventListener("strategyAdded", function(e){
	let strategyID = e.detail['strategyID']
	let strategyDiv = createAndInsertStrategyDisplay(strategyID)
	let strategyName = strategies[strategyID]['strategyName']
	let strategyOwner = strategies[strategyID]['strategyOwner']
	let searchTerm = strategyOwnerActiveSearchTerm[strategyOwner] || ""
	console.log(strategyOwner)
	console.log(searchTerm)
	if(searchTerm=="")return;
	if(strategyName.toLowerCase().indexOf(searchTerm.toLowerCase())<0)strategyDiv.style.display = "none";
})

document.addEventListener("updatedAccounts", function(e){
	updateStrategyContainerRowsOnAccountsUpdate(e.detail)
})

document.addEventListener("updatedStrategyContainers", function(e){
	console.log(e.detail)
	derivativesProcessUpdatedAssignment(e.detail)
})

let derivativeActiveUser = null
let derivativesSelUser = null

//change below to be set as per open url path
let derivativePageActive = false

function initderivativesStrategyDisplay(){
	setDerivativesUserViews()
	setStrategyDisplays()
}

function setDerivativesUserViews(){
	derivativesToggleUserDiv = document.querySelector("#derivativesToggleUserDiv")
	derivativesUserViewContainer = document.querySelector("#derivativesUserViewContainer")
	deleteAllChildren(derivativesToggleUserDiv)
	deleteAllChildren(derivativesUserViewContainer)
	// if(containerAccountsData.length==0)return derivativesUserViewContainer.innerText = "No User Accounts Available"
	for(containerOwner in containerOwners){
		createDerivativesUserView(containerOwner, derivativesUserViewContainer)
		createDerivativesToggleUserViewButton(containerOwner, derivativesToggleUserDiv)
	}
	derivativesSelUser = derivativesUserViewContainer.firstChild.getAttribute("userId")
	derivativesUserViewContainer.firstChild.style.display = "block";
}

function initDerivativesActions(){
	let filterStrategies = document.querySelector(`[name='userDerivativesFilter']`)
	filterStrategies.addEventListener("input", function(e){
		clearTimeout(filterTimer)
		filterTimer = setTimeout(()=>{
			filterContainerOwnerStrategies(this.value)
		}, 500)
	})
	
	let collapseAllStrategiesBtn = document.querySelector("#collapseStrategiesBtn")
	collapseAllStrategiesBtn.addEventListener("click", collapseAllStrategies)

	let expandAllStrategiesBtn = document.querySelector("#expandStrategiesBtn")
	expandAllStrategiesBtn.addEventListener("click", expandAllStrategies)
}

function createDerivativesUserView(userId, derivativesUserViewContainer){
	let userView = document.createElement("div")
	userView.setAttribute("userId", userId)
	userView.setAttribute("id", "derivativesUserView_"+userId)
	userView.classList.add("derivativesUserView")
	derivativesUserViewContainer.appendChild(userView)
}

function createDerivativesToggleUserViewButton(userId, parentElement){
	let currViewButton = document.createElement("BUTTON")
	currViewButton.setAttribute("userId", userId)
	currViewButton.setAttribute("id", "derivatrivesToggleView_"+userId)
	currViewButton.innerText = containerOwners[userId]['fullName']
	currViewButton.classList.add("btn", "btn-default", "btn-sm")
	currViewButton.addEventListener("click", function(){
		let viewId = 'derivativesUserView_' + this.getAttribute("userId")
		let derivativesUserViews = document.querySelectorAll(".derivativesUserView")
		for(derivativesUserView of derivativesUserViews)derivativesUserView.style.display = "none";
		let targetView = document.getElementById(viewId)
		targetView.style.display = "block"
		derivativesSelUser = userId
		clearTimeout(filterTimer)
		setContainerOwnerStrategyFilterActiveSearchTermInputValue()
	})
	parentElement.appendChild(currViewButton)
}

function setStrategyDisplays(){
	for(strategyID in strategies)createAndInsertStrategyDisplay(strategyID)
}

function createAndInsertStrategyDisplay(strategyID){
	let currStrategyDiv = createAndInsertStrategyDisplayDiv(strategyID)
	let strategyTable = insertStrategyDivTable(currStrategyDiv)
	insertStrategyContainerRowsInTable(strategyID, strategyTable)
	return currStrategyDiv;
	// if(strategies[strategyID]['strategyUnderlyingInstrument']!=null)insertStrategySpreadDisplay(strategyID, strategyDiv)
}

function createAndInsertStrategyDisplayDiv(strategyID){
	let strategyOwner = strategies[strategyID]['strategyOwner']
	let strategyUnderlyingInstrument = strategies[strategyID]['strategyUnderlyingInstrument']
	let strategyOwnerDerivativesDiv = document.querySelector("#derivativesUserView_" + strategyOwner)
	let strategyDiv = document.createElement("div")
	strategyDiv.classList.add("strategyDiv")
	strategyDiv.setAttribute("strategyID", strategyID)
	// strategyDiv.setAttribute("strategyName", strategies[strategyID]['strategyName'])
	let strategyHeaderRow = setStrategyDivHeader(strategyID)
	let strategyContainersTableDiv = document.createElement("div")
	strategyContainersTableDiv.classList.add("strategyContainersTableDiv")
	strategyDiv.appendChild(strategyHeaderRow)
	strategyDiv.appendChild(strategyContainersTableDiv)
	strategyOwnerDerivativesDiv.appendChild(strategyDiv)
	if(strategyUnderlyingInstrument!=null){
		let strategySpreadDisplay = createStrategySpreadDisplayDiv()
		strategyDiv.appendChild(strategySpreadDisplay)
	}
	return strategyDiv
}

function setStrategyDivHeader(strategyID){
	let strategyUnderlyingInstrument = strategies[strategyID]['strategyUnderlyingInstrument']
	let strategyHeaderRow = document.createElement("div")
	strategyHeaderRow.classList.add("strategyDivHeader")

	let headerName = document.createElement("div")
	let headerInstrument = document.createElement("div")
	let toggleClosePos = document.createElement("div")
	let strategyDivHeaderFieldClass = "singleUnderlyingStrategyHeaderField"

	headerName.classList.add(strategyDivHeaderFieldClass)
	headerInstrument.classList.add(strategyDivHeaderFieldClass)
	toggleClosePos.classList.add(strategyDivHeaderFieldClass)

	headerName.innerText = "Strategy: " + strategies[strategyID]['strategyName']
	headerInstrument.innerText = "Underlying Instrument: " + ((strategies[strategyID]['strategyUnderlyingInstrument'])?underlyingInstruments[strategies[strategyID]['strategyUnderlyingInstrument']]['tradingsymbol']: "None")

	toggleClosePosBtn = document.createElement("button")
	toggleClosePosBtn.innerText = "Show Close Positions"
	toggleClosePosBtn.classList.add("btn", "btn-default", "btn-sm")
	toggleClosePosBtn.addEventListener("click", function(e){
		let currStrategy = strategies[strategyID]
		currStrategy['displayClosePos'] = !currStrategy['displayClosePos']
		let closeRows =  document.querySelector(`#derivativesUserViewContainer`).querySelectorAll(`tr[strategyID='${strategyID}'][openClose='close']`)
		closeRows.forEach(function(closeRow){
			let containerID = closeRow.getAttribute('containerID')
			if(currStrategy['containers'][containerID]['closeVolume']==0)return;
			closeRow.style.display=(currStrategy['displayClosePos'])?"table-row":"none"
		})
		let strategyTotalsRow = document.querySelector(`#derivativesUserViewContainer table[strategyID='${strategyID}']`).lastChild
		setStrategyTotalsDisplay(currStrategy['totals'], strategyTotalsRow)
		this.innerText = ((currStrategy['displayClosePos'])?"Hide":"Show")+ " Close Positions"
		expandStrategyDiv(this.parentElement.parentElement.parentElement)
	})
	toggleClosePos.appendChild(toggleClosePosBtn)

	strategyHeaderRow.appendChild(headerName)
	strategyHeaderRow.appendChild(headerInstrument)
	strategyHeaderRow.appendChild(toggleClosePos)
	
	let strategyFetchSpreadDiv = document.createElement("div")
	strategyFetchSpreadDiv.classList.add(strategyDivHeaderFieldClass)
	strategyFetchSpreadDiv.style.width = "20%"
	let strategyFetchSpreadBtn = document.createElement("button")
	strategyFetchSpreadBtn.classList.add("btn", "btn-default", "btn-sm")
	strategyFetchSpreadBtn.innerText = "View Strategy Spread"
	strategyFetchSpreadBtn.addEventListener("click", function(e){
		displayStrategySpread(this.parentElement.parentElement.parentElement)
	})
	strategyFetchSpreadDiv.appendChild(strategyFetchSpreadBtn)

	let strategyExpectedReturnsOnDateDiv = document.createElement("div");
	strategyExpectedReturnsOnDateDiv.classList.add(strategyDivHeaderFieldClass)
	strategyExpectedReturnsOnDateDiv.style.width = "20%"
	let strategyExpectedReturnsOnDateInput = document.createElement("input")
	strategyExpectedReturnsOnDateInput.setAttribute("type", "date")
	strategyExpectedReturnsOnDateInput.addEventListener("change", function(e){
		displayStrategyExpectedReturnOnDateSpread(this.parentElement.parentElement.parentElement, this.value)
	})
	strategyExpectedReturnsOnDateDiv.appendChild(strategyExpectedReturnsOnDateInput)

	strategyHeaderRow.appendChild(strategyFetchSpreadDiv)
	strategyHeaderRow.appendChild(strategyExpectedReturnsOnDateDiv)

	if(strategyUnderlyingInstrument==null){
		strategyFetchSpreadBtn.disabled = "disabled"
		strategyExpectedReturnsOnDateInput.disabled = "disabled"
	}

	let toggleStratgyVisibiltyDiv = document.createElement("div")
	toggleStratgyVisibiltyDiv.classList.add("toggleStratgyVisibiltyDiv")
	let toggleStratgyVisibiltyBtn = document.createElement("button")
	toggleStratgyVisibiltyBtn.classList.add("btn", "btn-default", "btn-sm")
	toggleStratgyVisibiltyBtn.style.fontSize = "13px"
	toggleStratgyVisibiltyBtn.innerText = "^"
	toggleStratgyVisibiltyBtn.addEventListener("click", toggleStrategyTableVisibility)
	toggleStratgyVisibiltyDiv.appendChild(toggleStratgyVisibiltyBtn)

	strategyHeaderRow.appendChild(toggleStratgyVisibiltyDiv)

	return strategyHeaderRow
}

function toggleStrategyTableVisibility(){
	let isHidden = this.innerText == "v"
	let currStrategyDiv = this.parentElement.parentElement.parentElement
	if(isHidden)expandStrategyDiv(currStrategyDiv);
	else collapseStrategyDiv(currStrategyDiv);
}

function expandStrategyDiv(strategyDiv){
	let strategyTableDiv = strategyDiv.querySelector(".strategyContainersTableDiv")
	let strategySpreadDisplayDiv = strategyDiv.querySelector(".strategySpreadDisplayDiv")
	let toggleStratgyVisibiltyBtn = strategyDiv.querySelector(".toggleStratgyVisibiltyDiv button")
	let strategyID = strategyDiv.getAttribute("strategyID")
	if(strategySpreadGraphObjMap[strategyID])strategySpreadDisplayDiv.style.display = "flex";
	strategyTableDiv.style.display = "block";
	toggleStratgyVisibiltyBtn.innerText = "^"
}

function collapseStrategyDiv(strategyDiv){
	let strategyTableDiv = strategyDiv.querySelector(".strategyContainersTableDiv")
	let strategySpreadDisplayDiv = strategyDiv.querySelector(".strategySpreadDisplayDiv")
	let toggleStratgyVisibiltyBtn = strategyDiv.querySelector(".toggleStratgyVisibiltyDiv button")
	if(strategySpreadDisplayDiv)strategySpreadDisplayDiv.style.display = "none";
	strategyTableDiv.style.display = "none";
	toggleStratgyVisibiltyBtn.innerText = "v"
}

function insertStrategyDivTable(strategyDiv){
	let strategyTable = document.createElement("table")
	strategyTable.setAttribute('strategyID', strategyDiv.getAttribute('strategyID'))
	strategyTable.classList.add('strategyTable')
	insertStrategyTableHeader(strategyTable)
	insertStrategyTableTotalsRow(strategyTable)
	strategyDiv.querySelector(".strategyContainersTableDiv").appendChild(strategyTable)
	return strategyTable
}

function insertStrategyTableHeader(strategyTable){
	let strategyTableHeader = document.createElement("tr")
	strategyTableHeader.classList.add("strategyTableHeader")
	strategyTableHeaders.forEach(function(val){
		let headerCell = document.createElement("th")
		headerCell.classList.add("strategyTableHeader")
		headerCell.innerText = val
		strategyTableHeader.appendChild(headerCell)
	})
	strategyTable.appendChild(strategyTableHeader)
}

function insertStrategyTableTotalsRow(strategyTable){
	let totalsRow = document.createElement("tr")
	totalsRow.classList.add("strategyTableRow")
	strategyTableHeaders.forEach(function(val){
		let totalCell = document.createElement("td")
		totalCell.setAttribute("name", val)
		totalCell.setAttribute("value", 0)
		totalCell.classList.add("strategyTableCell")
		totalsRow.appendChild(totalCell)
	})
	totalsRow.querySelector("[name='Name']").innerText = "Total"
	strategyTable.appendChild(totalsRow)
}

function insertStrategyContainerRowsInTable(strategyID, strategyTable){
	strategyContainers = strategies[strategyID]['containers']
	for(containerID in strategyContainers){
		let strategyContainer = strategyContainers[containerID]
		insertStrategyContainerOpenRow(strategyContainer, strategyTable, strategies[strategyID]['totals'])
		insertStrategyContainerCloseRow(strategyContainer, strategyTable, strategies[strategyID]['totals'])
	}
	setStrategyTotalsDisplay(strategies[strategyID]['totals'], strategyTable.lastChild)
}

function insertStrategyContainerOpenRow(strategyContainer, strategyTable, strategyTotals){
	let strategyContainerRow = document.createElement("tr")
	strategyContainerRow.classList.add("strategyTableRow")
	strategyContainerRow.setAttribute('containerID', strategyContainer['containerID'])
	strategyContainerRow.setAttribute('strategyID', strategyTable.getAttribute('strategyID'))
	strategyContainerRow.setAttribute('openClose', "open")

	for(strategyTableField in strategyTableFields){
		let currFieldObj = strategyTableFields[strategyTableField]
		let currCell = document.createElement("td")
		currCell.classList.add("strategyTableCell")
		currCell.setAttribute("name", strategyTableField)
		currFieldObj.setOpenValue(strategyContainer, strategyTotals, currCell)
		strategyContainerRow.appendChild(currCell)
	}

	if(strategyContainer['openVolume']==0)strategyContainerRow.style.display = "none"
	strategyTable.insertBefore(strategyContainerRow, strategyTable.lastChild)
}

function insertStrategyContainerCloseRow(strategyContainer, strategyTable, strategyTotals){
	let strategyContainerRow = document.createElement("tr")
	strategyContainerRow.classList.add("strategyTableRow")
	strategyContainerRow.setAttribute('containerID', strategyContainer['containerID'])
	strategyContainerRow.setAttribute('strategyID', strategyTable.getAttribute('strategyID'))
	strategyContainerRow.setAttribute('openClose', "close")

	for(strategyTableField in strategyTableFields){
		let currFieldObj = strategyTableFields[strategyTableField]
		let currCell = document.createElement("td")
		currCell.classList.add("strategyTableCell")
		currCell.setAttribute("name", strategyTableField)
		currFieldObj.setCloseValue(strategyContainer, strategyTotals, currCell)
		strategyContainerRow.appendChild(currCell)
	}
	let strategyID = strategyTable.getAttribute('strategyID')
	if(strategyContainer['closeVolume']==0 || !strategies[strategyID]['displayOpenPos'])strategyContainerRow.style.display = "none"
	strategyTable.insertBefore(strategyContainerRow, strategyTable.lastChild)
}

function setStrategyContainerName(strategyContainer, strategyTotals, nameCell){
	let currContainer = containers[strategyContainer['containerID']]
	nameCell.innerText = (currContainer['containerTypeID']==0)?currContainer['containerName']:currContainer['containerName'].split("-")[0]
}

function setStrategyContainerExpiry(strategyContainer, strategyTotals, expiryCell){
	let currContainer = containers[strategyContainer['containerID']]
	expiryCell.innerText = 'N/A'
	if(currContainer['containerTypeID']!=0){
		let expiry = currContainer['containerName'].split("-")[1]
		expiryCell.innerText = expiry
	}
}

function setRowOpenVal(strategyContainer, strategyTotals, openCloseCell){
	openCloseCell.innerText = "Open"
}

function setStrategyContainerUnderlyingPrice(strategyContainer, strategyTotals, underlyingPriceCell){
	let currContainer = containers[strategyContainer['containerID']]
	let underlyingInstrument = (currContainer['underlyingInstrumentID'])?currContainer['underlyingInstrumentID']:currContainer['allowedInstrumentID']
	let underlyingPrice = (instrumentPrices[underlyingInstrument])?formatNumber(instrumentPrices[underlyingInstrument]['curr_price']/100): 'N/A'
	underlyingPriceCell.innerText = underlyingPrice
	strategyContainer['underlyingPrice'] = underlyingPrice
}

function setStrategyContainerInstrumentType(strategyContainer, strategyTotals, instrumentTypeCell){
	let currContainer = containers[strategyContainer['containerID']]
	let splitName = currContainer['containerName'].split("-")
	let instrumentType = (currContainer['containerTypeID']==0)?"EQ" : splitName[splitName.length-1]
	strategyContainer['instrumentType'] = instrumentType
	instrumentTypeCell.innerText = instrumentType
}

function setStrategyContainerBuySellType(strategyContainer, strategyTotals, buySellCell){
	let currContainer = containers[strategyContainer['containerID']]
	buySellCell.innerText = currContainer['buy_sell_type']
	strategyContainer['buySellMult'] = (currContainer['buy_sell_type']=="Buy")?1:-1
}

function setStrategyContainerStrike(strategyContainer, strategyTotals, strikeCell){
	let currContainer = containers[strategyContainer['containerID']]
	strikeCell.innerText = 'N/A'
	if(([0, 4].indexOf(currContainer['containerTypeID']))<0){
		let strike = parseInt(parseFloat(currContainer['containerName'].split("-")[2])*100)
		strategyContainer['strike'] = strike
		strikeCell.innerText = formatNumber(strike/100)
	}
}

function setStrategyContainerOpenVolume(strategyContainer, strategyTotals, volumeCell){
	volumeCell.innerText = strategyContainer['openVolume']
}

function setStrategyContainerOpenOpenPrice(strategyContainer, strategyTotals, openPriceCell){
	strategyContainer['openOpenPrice'] = 0
	let currContainer = containers[strategyContainer['containerID']]
	let containerAccountsOpenPos = accounts[strategyContainer['containerID']]['open_position']
	openPriceCell.innerText = "N/A"
	if((([0, 4].indexOf(currContainer['containerTypeID'])) >= 0) && containerAccountsOpenPos['open_volume']>0){
		let openPrice = (containerAccountsOpenPos['open_exposure']/containerAccountsOpenPos['open_volume'])
		openPriceCell.innerText = formatNumber(openPrice/100)
		strategyContainer['openOpenPrice'] = openPrice
	}
}

function setStrategyContainerOpenOpenPremium(strategyContainer, strategyTotals, openPremiumCell){
	let currContainer = containers[strategyContainer['containerID']]
	let containerAccountsOpenPos = accounts[strategyContainer['containerID']]['open_position']
	openPremiumCell.innerText = "N/A"
	if((([0, 4].indexOf(currContainer['containerTypeID'])) < 0) && strategyContainer['openVolume']>0){
		let openPremium = (containerAccountsOpenPos['open_exposure']/containerAccountsOpenPos['open_volume'])
		openPremiumCell.innerText = formatNumber(openPremium/100)
		strategyContainer['openOpenPremium'] = openPremium
	}	
}

function setStrategyContainerOpenTotalPremium(strategyContainer, strategyTotals, totalPremiumCell){
	if(strategyContainer['totalOpenPremium'])strategyTotals['openTotals']['premiumEarned']-=strategyContainer['totalOpenPremium'];
	strategyContainer['totalOpenPremium'] = 0
	let currContainer = containers[strategyContainer['containerID']]
	let containerAccountsOpenPos = accounts[strategyContainer['containerID']]['open_position']
	let buySellMult = (currContainer['buy_sell_type']=="Buy")?1:-1
	totalPremiumCell.innerText = "N/A"
	if(strategyContainer['openOpenPremium'] && strategyContainer['openVolume']>0){
		let totalPremium = strategyContainer['openOpenPremium']*strategyContainer['openVolume']*strategyContainer['buySellMult']*-1
		totalPremiumCell.innerText = formatNumber(totalPremium/100)
		strategyContainer['totalOpenPremium'] = totalPremium
		strategyTotals['openTotals']['premiumEarned']+=totalPremium
	}
}

function setStrategyContainerOpenCurrentPrice(strategyContainer, strategyTotals, currPriceCell){
	let containerAccountsOpenPos = accounts[strategyContainer['containerID']]['open_position']
	strategyContainer['openCurrPrice'] = containerAccountsOpenPos['curr_price']
	currPriceCell.innerText = formatNumber(containerAccountsOpenPos['curr_price']/100)
}

function setStrategyContainerOpenProfit(strategyContainer, strategyTotals, openProfitCell){
	if(strategyContainer['openProfit'])strategyTotals['openTotals']['profit']-= strategyContainer['openProfit']
	let containerAccountsOpenPos = accounts[strategyContainer['containerID']]['open_position']
	openProfitCell.innerText = 'N/A'
	let openProfit = 0
	strategyContainer['openProfit'] = 0
	if(strategyContainer['openVolume']>0){
		openProfit = containerAccountsOpenPos['open_profit'] * (strategyContainer['openVolume']/containerAccountsOpenPos['open_volume'])
		strategyContainer['openProfit'] = openProfit
		openProfitCell.innerText = formatNumber(openProfit/100)	
		strategyTotals['openTotals']['profit'] += openProfit
	}
	// if(strategyContainer['strategyID']==2)
		// console.log(`Open Profit: ${strategyContainer['openProfit']}`);
}

function setStrategyContainerOpenGrossValue(strategyContainer, strategyTotals, grossValueCell){
	let currContainer = containers[strategyContainer['containerID']]
	let containerAccountsOpenPos = accounts[strategyContainer['containerID']]['open_position']
	if(strategyContainer['openGrossValue'])strategyTotals['openTotals']['grossValue']-=strategyContainer['openGrossValue']
	let grossValue = 0
	if(strategyContainer['openVolume']==0)grossValue = 0;
	else if(([0, 4].indexOf(currContainer['containerTypeID']))>=0)
		grossValue = (containerAccountsOpenPos['open_exposure'])*(strategyContainer['openVolume']/containerAccountsOpenPos['open_volume'])
		// grossValue = strategyContainer['openVolume']*strategyContainer['openPrice']
	else
		grossValue = strategyContainer['openVolume']*strategyContainer['strike']
	
	grossValueCell.innerText = formatNumber(grossValue/100)
	strategyContainer['openGrossValue'] = grossValue
	if(containerAccountsOpenPos['open_volume']>0)strategyTotals['openTotals']['grossValue'] += grossValue
}

function setStrategyContainerOpenExpectedReturnOnPremium(strategyContainer, strategyTotals, expectedReturnOnPremiumCell){
	expectedReturnOnPremiumCell.innerText = 'N/A'
	if(strategyContainer['totalOpenPremium']){
		let expectedReturnOnPremium = (strategyContainer['totalOpenPremium']/strategyContainer['openGrossValue'])*100
		expectedReturnOnPremiumCell.innerText = formatNumber(expectedReturnOnPremium) + "%"
		strategyContainer['openExpectedReturnOnPremium'] = expectedReturnOnPremium
	}
}

function setStrategyContainerPremiumOnTable(strategyContainer, strategyTotals, premiumOnTableCell){
	if(strategyContainer['premiumOnTable'])strategyTotals['openTotals']['premiumOnTheTable']-=strategyContainer['premiumOnTable']
	premiumOnTableCell.innerText = 'TBI'
	strategyContainer['premiumOnTable'] = 0
}

function setStrategyContainerOpenReturnOnGross(strategyContainer, strategyTotals, returnOnGrossCell){
	let returnOnGross = (strategyContainer['openProfit']/strategyContainer['openGrossValue'])*100
	returnOnGrossCell.innerText = formatNumber(returnOnGross) + "%"
}

function setStrategyContainerActions(strategyContainer, strategyTotals, actionsCell){
	// console.log(new Error().stack);
	if(actionsCell.childNodes.length>0)return;
	let closeTransactionButton = document.createElement("button")
	closeTransactionButton.classList.add("btn", "btn-default", "btn-sm")
	closeTransactionButton.innerText = "Add Close Transaction"
	closeTransactionButton.addEventListener("click", function(e){
		let strategyContainerRow = this.parentElement.parentElement
		let containerID = strategyContainerRow.getAttribute("containerID")
		let strategyID = strategyContainerRow.getAttribute("strategyID")
		strategyContainerRowCloseFormSelectedStrategyContainer = {"strategyID": strategyID, "containerID": containerID}
		document.querySelector("#closeStrategyContainerTransactionFormModal").style.display = "flex"
		return
	})
	actionsCell.appendChild(closeTransactionButton)
}

function setRowCloseVal(strategyContainer, strategyTotals, openCloseCell){
	openCloseCell.innerText = "Close"
}

function setStrategyContainerCloseVolume(strategyContainer, strategyTotals, volumeCell){
	volumeCell.innerText = strategyContainer['closeVolume']
}

function setStrategyContainerCloseOpenPrice(strategyContainer, strategyTotals, openPriceCell){
	strategyContainer['closeOpenPrice'] = 0
	let currContainer = containers[strategyContainer['containerID']]
	let containerAccountsOpenPos = accounts[strategyContainer['containerID']]['open_position']
	openPriceCell.innerText = "N/A"
	if((([0, 4].indexOf(currContainer['containerTypeID'])) >= 0) && strategyContainer['closeVolume']>0){
		let openPrice = (containerAccountsOpenPos['closed_exposure']/containerAccountsOpenPos['closed_volume'])
		openPriceCell.innerText = formatNumber(openPrice/100)
		strategyContainer['closeOpenPrice'] = openPrice
	}
}

function setStrategyContainerCloseOpenPremium(strategyContainer, strategyTotals, openPremiumCell){
	let currContainer = containers[strategyContainer['containerID']]
	let containerAccountsOpenPos = accounts[strategyContainer['containerID']]['open_position']
	openPremiumCell.innerText = "N/A"
	if((([0, 4].indexOf(currContainer['containerTypeID'])) < 0) && strategyContainer['closeVolume']>0){
		let openPremium = (containerAccountsOpenPos['closed_exposure']/containerAccountsOpenPos['closed_volume'])
		openPremiumCell.innerText = formatNumber(openPremium/100)
		strategyContainer['closeOpenPremium'] = openPremium
	}	
}

function setStrategyContainerCloseTotalPremium(strategyContainer, strategyTotals, totalPremiumCell){
	if(strategyContainer['totalClosePremium'])strategyTotals['closeTotals']['premiumEarned']-=strategyContainer['totalClosePremium'];
	strategyContainer['totalClosePremium'] = 0
	let currContainer = containers[strategyContainer['containerID']]
	let containerAccountsOpenPos = accounts[strategyContainer['containerID']]['open_position']
	let buySellMult = (currContainer['buy_sell_type']=="Buy")?1:-1
	totalPremiumCell.innerText = "N/A"
	if(strategyContainer['closeOpenPremium'] && strategyContainer['closeVolume']>0){
		let totalPremium = strategyContainer['closeOpenPremium']*strategyContainer['closeVolume']*strategyContainer['buySellMult']*-1
		totalPremiumCell.innerText = formatNumber(totalPremium/100)
		strategyContainer['totalClosePremium'] = totalPremium
		strategyTotals['closeTotals']['premiumEarned']+=totalPremium
	}
}

function setStrategyContainerCloseCurrentPrice(strategyContainer, strategyTotals, currPriceCell){
	let containerAccountsOpenPos = accounts[strategyContainer['containerID']]['open_position']
	strategyContainer['closeCurrPrice'] = (containerAccountsOpenPos['closed_exposure']+containerAccountsOpenPos['closed_profit'])/containerAccountsOpenPos['closed_volume']
	currPriceCell.innerText = formatNumber(strategyContainer['closeCurrPrice']/100)
}

function setStrategyContainerCloseProfit(strategyContainer, strategyTotals, closeProfitCell){
	if(strategyContainer['closeProfit'])strategyTotals['closeTotals']['profit']-= strategyContainer['closeProfit']
	let containerAccountsOpenPos = accounts[strategyContainer['containerID']]['open_position']
	closeProfitCell.innerText = 'N/A'
	let closeProfit = 0
	strategyContainer['closeProfit'] = 0
	if(containerAccountsOpenPos['closed_volume']>0){
		closeProfit = containerAccountsOpenPos['closed_profit'] * (strategyContainer['closeVolume']/containerAccountsOpenPos['closed_volume'])
		strategyContainer['closeProfit'] = closeProfit
		closeProfitCell.innerText = formatNumber(closeProfit/100)	
		strategyTotals['closeTotals']['profit'] += closeProfit
	}
}

function setStrategyContainerCloseGrossValue(strategyContainer, strategyTotals, grossValueCell){
	let currContainer = containers[strategyContainer['containerID']]
	let containerAccountsOpenPos = accounts[strategyContainer['containerID']]['open_position']
	if(strategyContainer['closeGrossValue'])strategyTotals['closeTotals']['grossValue']-=strategyContainer['closeGrossValue']
	let grossValue = 0
	if(strategyContainer['closeVolume']==0)grossValue = 0;
	else if(([0, 4].indexOf(currContainer['containerTypeID']))>=0)
		grossValue = (containerAccountsOpenPos['closed_exposure'])*(strategyContainer['closeVolume']/containerAccountsOpenPos['closed_volume'])
		// grossValue = strategyContainer['openVolume']*strategyContainer['openPrice']
	else 
		grossValue = strategyContainer['closeVolume']*strategyContainer['strike']
	
	grossValueCell.innerText = formatNumber(grossValue/100)
	strategyContainer['closeGrossValue'] = grossValue
	if(containerAccountsOpenPos['closed_volume']>0)strategyTotals['closeTotals']['grossValue'] += grossValue
}

function setStrategyContainerCloseExpectedReturnOnPremium(strategyContainer, strategyTotals, expectedReturnOnPremiumCell){
	expectedReturnOnPremiumCell.innerText = 'N/A'
	if(strategyContainer['totalClosePremium']){
		let expectedReturnOnPremium = (strategyContainer['totalClosePremium']/strategyContainer['closeGrossValue'])*100
		expectedReturnOnPremiumCell.innerText = formatNumber(expectedReturnOnPremium) + "%"
		strategyContainer['closeExpectedReturnOnPremium'] = expectedReturnOnPremium
	}
}

function setStrategyContainerCloseReturnOnGross(strategyContainer, strategyTotals, returnOnGrossCell){
	let returnOnGross = (strategyContainer['closeProfit']/strategyContainer['closeGrossValue'])*100
	returnOnGrossCell.innerText = formatNumber(returnOnGross) + "%"
}

function setStrategyTotalsDisplay(strategyTotals, strategyTotalsRow){
	let displayClose = strategies[strategyTotalsRow.parentElement.getAttribute("strategyID")]['displayClosePos']
	let premiumEarned = strategyTotals['openTotals']['premiumEarned'] + ((displayClose)?strategyTotals['closeTotals']['premiumEarned']:0)
	let profit = strategyTotals['openTotals']['profit'] + ((displayClose)?strategyTotals['closeTotals']['profit']:0)
	let grossValue = strategyTotals['openTotals']['grossValue'] + ((displayClose)?strategyTotals['closeTotals']['grossValue']:0)
	let premiumOnTheTable = strategyTotals['openTotals']['premiumOnTheTable'] + ((displayClose)?strategyTotals['closeTotals']['premiumOnTheTable']:0)
	strategyTotalsRow.childNodes[10].innerText = formatNumber(premiumEarned/100)
	strategyTotalsRow.childNodes[12].innerText = formatNumber(profit/100)
	strategyTotalsRow.childNodes[13].innerText = formatNumber(grossValue/100)
	strategyTotalsRow.childNodes[15].innerText = formatNumber(premiumOnTheTable/100)
}

function updateStrategyAccountsOnPriceChange(){
	let userDerivativesContainer = document.querySelector("#derivativesUserViewContainer")
	for(strategyID in strategies){
		let currStrategy = strategies[strategyID]
		let strategyContainers = currStrategy['containers']
		let strategyTotals = currStrategy['totals']
		let strategyTable = userDerivativesContainer.querySelector(`[strategyid='${strategyID}'] .strategyTable`)
		for(containerID in strategyContainers){
			let strategyContainer = strategyContainers[containerID]
			let strategyCOntainerOpenRow = strategyTable.querySelector(`[containerid='${containerID}'][openClose='open']`)
			let strategyContainerCloseRow = strategyTable.querySelector(`[containerid='${containerID}'][openClose='close']`)
			updateStrategyContainerUnderlyingPrice(strategyContainer, strategyCOntainerOpenRow.childNodes[3])
			updateStrategyContainerUnderlyingPrice(strategyContainer, strategyContainerCloseRow.childNodes[3])
			if(!currStrategyContainerRequiresUpdate(strategyContainer))continue;
			calculateUpdatedStrategyContainerAccountsOnPriceChange(strategyContainer, strategyTotals, strategyCOntainerOpenRow)
		}
		setStrategyTotalsDisplay(strategyTotals, strategyTable.lastChild)
	}
}

function updateStrategyContainerUnderlyingPrice(strategyContainer, underlyingPriceCell){
	let underlyingInstrumentID = containers[strategyContainer['containerID']]['underlyingInstrumentID']
	if(! underlyingInstrumentID)underlyingInstrumentID = containers[strategyContainer['containerID']]['allowedInstrumentID']
	underlyingPriceCell.innerText = (instrumentPrices[underlyingInstrumentID])?formatNumber(instrumentPrices[underlyingInstrumentID]['curr_price']/100):'N/A'
}

function currStrategyContainerRequiresUpdate(strategyContainer){
	let currContainer = containers[strategyContainer['containerID']]
	let containerAccountsOpenPos = accounts[strategyContainer['containerID']]['open_position']
	return !((currContainer['closeDate'] && new Date()>currContainer['closeDate']) || containerAccountsOpenPos['open_volume']<=0)
}

function calculateUpdatedStrategyContainerAccountsOnPriceChange(strategyContainer, strategyTotals, strategyContainerRow){
	for(strategyTableField in strategyTableFields){
		let currFieldObj = strategyTableFields[strategyTableField]
		if(currFieldObj['updateValueOnPriceChange']){
			let currCell = strategyContainerRow.querySelector(`[name='${strategyTableField}']`)
			currFieldObj.setOpenValue(strategyContainer, strategyTotals, currCell)
		}
	}
}

function processCreatedStrategy(newStrategy){
}

function derivativesProcessUpdatedAssignment(updatedStrategyContainers){
	let strategyViewContainer =  document.querySelector(`#derivativesUserViewContainer`)
	for(strategyID in updatedStrategyContainers){
		let strategyTable  = strategyViewContainer.querySelector(`[strategyID='${strategyID}'] table`)
		let strategyTotals = strategies[strategyID]['totals']
		let currStrategy = strategies[strategyID]
		updatedStrategyContainers[strategyID].forEach(function(strategyContainer, idx){
			let containerID = strategyContainer['containerID']
			let oldStrategyContainerObj = currStrategy['containers'][containerID]
			if(!oldStrategyContainerObj){
				strategies[strategyID]['containers'][containerID] = strategyContainer
				insertStrategyContainerOpenRow(strategyContainer, strategyTable, strategyTotals)
				insertStrategyContainerCloseRow(strategyContainer, strategyTable, strategyTotals)
				return
			}
			strategyTotals['openTotals']['grossValue']-=oldStrategyContainerObj['openGrossValue']
			strategyTotals['openTotals']['premiumEarned']-=oldStrategyContainerObj['totalOpenPremium']
			strategyTotals['openTotals']['premiumOnTheTable']-=oldStrategyContainerObj['premiumOnTable']
			strategyTotals['openTotals']['profit']-=oldStrategyContainerObj['openProfit']	
			strategyTotals['closeTotals']['grossValue']-=oldStrategyContainerObj['closeGrossValue']
			strategyTotals['closeTotals']['premiumEarned']-=oldStrategyContainerObj['totalClosePremium']
			strategyTotals['closeTotals']['premiumOnTheTable']-=oldStrategyContainerObj['premiumOnTable']
			strategyTotals['closeTotals']['profit']-=oldStrategyContainerObj['closeProfit']
			strategies[strategyID]['containers'][containerID] = strategyContainer
			let strategyContainerRows = strategyTable.querySelectorAll(`[containerID='${containerID}']`)
			strategyContainerRows.forEach(function(row){updateStrategyContainerRow(strategyContainer, row, strategyTotals)})
		})
		setStrategyTotalsDisplay(strategyTotals, strategyTable.lastChild)
	}
}

function updateStrategyContainerRowsOnAccountsUpdate(updatedAccounts){
	let strategyViewContainer =  document.querySelector(`#derivativesUserViewContainer`)
	for(containerID in updatedAccounts){
		let currContainer = containers[containerID]
		if(currContainer['parentContainerID']!=null || (currContainer['underlyingInstrumentID']==null && !underlyingInstruments[currContainer['allowedInstrumentID']]))continue;
		let strategyContainerRows = strategyViewContainer.querySelectorAll(`tr[containerID='${containerID}']`)
		strategyContainerRows.forEach(function(strategyContainerRow, idx){
			let strategyID = strategyContainerRow.getAttribute('strategyID')
			let strategyContainer = strategies[strategyID]['containers'][containerID]
			let strategyTotals = strategies[strategyID]['totals']
			updateStrategyContainerRow(strategyContainer, strategyContainerRow, strategyTotals)
		})
	}
}

function updateStrategyContainerRow(strategyContainer, strategyContainerRow, strategyTotals){
	let isOpenRow = strategyContainerRow.getAttribute("openClose")=="open"
	for(strategyTableField in strategyTableFields){
		let currFieldObj = strategyTableFields[strategyTableField]
		let currCell = strategyContainerRow.querySelector(`[name='${strategyTableField}']`)
		if(isOpenRow)
			currFieldObj.setOpenValue(strategyContainer, strategyTotals, currCell);
		else
			currFieldObj.setCloseValue(strategyContainer, strategyTotals, currCell);
	}
	let rowDisplay = (isOpenRow && strategyContainer['openVolume']>0) || (strategies[strategyContainerRow.getAttribute('strategyID')]['displayClosePos'] && strategyContainer['closeVolume']>0)
	strategyContainerRow.style.display = (rowDisplay)?"table-row":"none"
}

function initAddStrategyContainerCloseTransactionForm(){
	let transactionFormContainer = document.querySelector("#closeStrategyContainerTransactionFormFields")

	let volumeField = document.createElement("div")
	volumeField.classList.add("formField")
	volumeField.innerText = "Volume: "
	let volumeInput = document.createElement("input")
	volumeInput.setAttribute("id", "closeStrategyContainerVolume")
	volumeInput.setAttribute("type", "number")
	volumeInput.setAttribute("placeholder", "Enter Transaction Volume")
	volumeField.appendChild(volumeInput)

	let priceField = document.createElement("div")
	priceField.classList.add("formField")
	priceField.innerText = "Price: "
	let priceInput = document.createElement("input")
	priceInput.setAttribute("id", "closeStrategyContainerPrice")
	priceInput.setAttribute("type", "number")
	priceInput.setAttribute("placeholder", "Enter Transaction Price")
	priceField.appendChild(priceInput)

	let dateField = document.createElement("div")
	dateField.classList.add("formField")
	dateField.innerText = "Date: "
	let dateInput = document.createElement("input")
	dateInput.setAttribute("id", "closeStrategyContainerDate")
	dateInput.setAttribute("type", "date")
	dateInput.setAttribute("placeholder", "Enter Transaction Date")
	dateField.appendChild(dateInput)

	let submitButton = document.createElement("button")
	submitButton.classList.add("btn", "btn-default", "btn-sm")
	submitButton.innerText = "Submit"
	submitButton.addEventListener("click", function(){
		processCloseStrategyContainerForm()
	})

	transactionFormContainer.appendChild(volumeField)
	transactionFormContainer.appendChild(priceField)
	transactionFormContainer.appendChild(dateField)
	transactionFormContainer.appendChild(submitButton)
}

function processCloseStrategyContainerForm(){
	function validateStrategyContainerTransactionVolume(volume, container, strategyContainer){
		if(isNaN(volume))return "Volume must be a positive multiple of lot size";
		let volInt = parseInt(volume)
		let lot_size = container['lot_size']
		if(!(volInt>0 && (volume == volInt.toString()) && volInt%lot_size==0))return "Volume must be a positive multiple of lot size";
		if(volInt>strategyContainer['openVolume'])return "Insufficient open units in this strategy to make this close transaction";
		return null
	}

	let transactionFormContainer = document.querySelector("#closeStrategyContainerTransactionFormFields");
	({containerID, strategyID} = strategyContainerRowCloseFormSelectedStrategyContainer);
	let currContainer = containers[containerID]
	let currStrategy = strategies[strategyID]
	let currStrategyContainer = currStrategy['containers'][containerID]

	let volume = transactionFormContainer.querySelector("#closeStrategyContainerVolume").value
	let price = transactionFormContainer.querySelector("#closeStrategyContainerPrice").value
	let date = transactionFormContainer.querySelector("#closeStrategyContainerDate").value
	let errors = []
	volumeError = validateStrategyContainerTransactionVolume(volume, currContainer, currStrategyContainer)
	if(volumeError)errors.push(volumeError);
	if(isNaN(price) || parseFloat(price)<0)errors.push("Price Must be a positive number");
	if(date=="")errors.push("Please enter transaction date")
	if(errors.length>0)return displayRequestResult({"error": errors.join("\n")}, document.querySelector('#closeStrategyContainerTransactionFormFields'))
	strategyAssignMap = {}; strategyAssignMap[strategyID] = parseInt(volume);
	({ownerProfileID, allowedInstrumentID, buy_sell_type, containerTypeID} = currContainer);
	transactionObj = {
		"ownerProfileID": ownerProfileID,
		"containerTypeID": containerTypeID,
		"instrumentID": allowedInstrumentID,
		"price": setPriceInPaisa(price),
		"volume": volume,
		"transaction_date": date,
		"transaction_fees": 0,
		"exchangeTransaction": true,
		"open_close_type": "close",
		"buy_sell_type": buy_sell_type,
		"strategyAssignMap": strategyAssignMap
	}
	socket.emit('addTransactionsAjax', {"transactions":[transactionObj]}, function(error, data){
		if(error || data.error){
			console.log(error || data.error)
			// return alert(error || data.error)
			return displayRequestResult({"error": (error || data.error)}, document.querySelector('#closeStrategyContainerTransactionFormFields'))
		}
		dataVersionId = data.dataVersionId
		let updatedAccounts = data['updatedAccounts']
		let updatedStrategyContainers = data['updatedStrategyContainers']
		let updatedAccountsEvent = new CustomEvent('updatedAccounts', {detail: updatedAccounts});
		document.dispatchEvent(updatedAccountsEvent);
		let updatedStrategiesEvent = new CustomEvent('updatedStrategyContainers', {detail: updatedStrategyContainers});
		document.dispatchEvent(updatedStrategiesEvent);
		return displayRequestResult({"message": "Transaction Added"}, document.querySelector('#closeStrategyContainerTransactionFormFields'))
	})
}

function insertStrategySpreadDisplay(strategyID, strategyDiv){
	let strategySpreadDiv = document.createElement("div")
	let strategySpreadDisplayHeader = document.createElement("div")
	// setStrategySpreadDisplayHeader(strategySpreadDisplayHeader)
	let strategySpreadGraphDiv = document.createElement("div")
	strategySpreadGraphDiv.setAttribute('name', 'strategySpreadGraphDiv')
	strategySpreadGraphDiv.classList.add("")
}

function displayStrategySpread(strategyDisplayDiv){
	let strategyID = strategyDisplayDiv.getAttribute("strategyID")
	postRequest('/getStrategySpreadData', {"strategyID": strategyID}, function(error, data){
		if(error || data.data.error)return alert(error || data.data.error);
		let strategySpreadDisplayDiv = strategyDisplayDiv.querySelector(".strategySpreadDisplayDiv");
		strategySpreadDisplayDiv.style.display = "flex"
		let graphContainer = strategyDisplayDiv.querySelector(".strategyReturnsGraphContainer")
		let tableContainer = strategyDisplayDiv.querySelector(".strategyReturnsTableContainer")
		let graphDataObj = setStrategySpreadGraphObj(data.data)
		expandStrategyDiv(strategyDisplayDiv)
		deleteAllChildren(graphContainer)
		deleteAllChildren(tableContainer)
		createAndInsertStrategyReturnsTable(data.data['underlyingExpiryPrice'], data.data['profit'], 'Underlying Price at Expiry', 'Profit', tableContainer)
		drawGraph(graphContainer, strategyID, graphDataObj)
		setSingleSpreadDisplayDivWidth(strategySpreadDisplayDiv)
	})
}

function displayStrategyExpectedReturnOnDateSpread(strategyDisplayDiv, date){
	let strategyID = strategyDisplayDiv.getAttribute("strategyID");
	postRequest('/getStrategyExpectedReturnsSpreadOnDate', {"strategyID": strategyID, "date": date}, function(error, data){
		if(error || data.data.error)return alert(error || data.data.error);
		let strategySpreadDisplayDiv = strategyDisplayDiv.querySelector(".strategySpreadDisplayDiv");
		strategySpreadDisplayDiv.style.display = "flex"
		let graphContainer = strategyDisplayDiv.querySelector(".strategyReturnsGraphContainer")
		let tableContainer = strategyDisplayDiv.querySelector(".strategyReturnsTableContainer")
		let graphDataObj = setStrategyReturnsOnDateGraphObj(data.data)
		expandStrategyDiv(strategyDisplayDiv)
		deleteAllChildren(graphContainer)
		deleteAllChildren(tableContainer)
		createAndInsertStrategyReturnsTable(data.data['underlyingPrice'], data.data['profit'], "Underlying Price", "Expected Profit", tableContainer)
		drawGraph(graphContainer, strategyID, graphDataObj)
		setSingleSpreadDisplayDivWidth(strategySpreadDisplayDiv)
	})
}

function createStrategySpreadDisplayDiv(){
	let strategySpreadDisplayDiv = document.createElement("div")
	strategySpreadDisplayDiv.style.position = "relative"
	strategySpreadDisplayDiv.classList.add("strategySpreadDisplayDiv")
	let closeButton = document.createElement("button")
	closeButton.classList.add("btn", "btn-default", "btn-sm", "strategySpreadCloseBtn")
	closeButton.innerText = "Close"
	closeButton.style.zIndex = 1
	closeButton.addEventListener("click", function(e){
		this.parentElement.style.display = "none"
		strategyDisplayDiv = this.parentElement
		let strategyID = strategyDisplayDiv.parentElement.getAttribute("strategyID")
		let graphContainer = strategyDisplayDiv.querySelector(".strategyReturnsGraphContainer")
		let tableContainer = strategyDisplayDiv.querySelector(".strategyReturnsTableContainer")
		deleteAllChildren(graphContainer)
		deleteAllChildren(tableContainer)
		delete strategySpreadGraphObjMap[strategyID]
	})
	strategySpreadDisplayDiv.appendChild(closeButton)
	// strategySpreadDisplayDiv.style.display = "none"
	let strategyReturnsContainer = document.createElement("div")
	let strategyReturnsTableContainer = document.createElement("div")
	let graphContainer = document.createElement("div");
	let tableContainer = document.createElement("div");
	graphContainer.classList.add("strategyReturnsGraphContainer")
	tableContainer.classList.add("strategyReturnsTableContainer")
	strategySpreadDisplayDiv.appendChild(tableContainer)
	strategySpreadDisplayDiv.appendChild(graphContainer)
	return strategySpreadDisplayDiv
}

function createAndInsertStrategyReturnsTable(underlyingPrices, returns, label1, label2, tableContainer){
	let table = document.createElement("table");
	table.classList.add("strategyReturnsTable")
	let tableHeader = document.createElement("tr");
	let priceHeader = document.createElement("th");
	let profitHeader = document.createElement("th");
	priceHeader.classList.add("strategyReturnsTableCell")
	profitHeader.classList.add("strategyReturnsTableCell")
	tableHeader.appendChild(priceHeader)
	tableHeader.appendChild(profitHeader)
	table.appendChild(tableHeader)
	priceHeader.innerText = label1
	profitHeader.innerText = label2
	for(let i=0; i<returns.length; i++){
		let row = document.createElement("tr")
		let priceCell = document.createElement("td")
		let profitCell = document.createElement("td")
		priceCell.classList.add("strategyReturnsTableCell")
		profitCell.classList.add("strategyReturnsTableCell")
		priceCell.innerText = formatNumber(underlyingPrices[i])
		profitCell.innerText = formatNumber(returns[i])
		row.appendChild(priceCell)
		row.appendChild(profitCell)
		table.appendChild(row)
	}
	tableContainer.appendChild(table)
}

function drawGraph(graphContainer, strategyID, graphDataObj){
	if(strategySpreadGraphObjMap[strategyID]!=undefined){
		strategySpreadGraphObjMap[strategyID].destroy()
		delete strategySpreadGraphObjMap[strategyID]
	}
	let graphCanvas = document.createElement("canvas")
	graphCanvas.setAttribute("aria-label", "Hello ARIA World")
	graphCanvas.setAttribute("role", "img")
	graphCanvas.innerText = "Loading"
	let chart = new Chart(graphCanvas, graphDataObj)
	strategySpreadGraphObjMap[strategyID] = chart
	// console.log(strategySpreadGraphObjMap[strategyID])
	graphContainer.appendChild(graphCanvas)
}

function setStrategyReturnsOnDateGraphObj(data){
	graphDataObj = {
		'type': 'line',
		'data':{
			'labels': data['underlyingPrice'],
			'datasets':[{
				'label': 'Expected profit',
				'data': data['profit'],
				'backgroundColor': Array(data['underlyingPrice'].length).fill('rgba(255, 255, 255, 0)'),
				'borderColor': Array(data['underlyingPrice'].length).fill('rgba(255, 0, 0, 1)'),
			}]
		},
		'options':{
			'aspectRatio': 4,
			'borderColor': 'rgba(0, 0, 0, 0)',
			'scales': {
				'yAxes': [{
					scaleLabel: {
						display: true,
						labelString: 'Expected Profit'
					}
				}],
				'xAxes': [{
					scaleLabel:{
						display: true,
						labelString: 'Underlying Price'
					},
				}]
			}
		},
	}
	return graphDataObj
}

function setStrategySpreadGraphObj(data){
	graphDataObj = {
		'type': 'line',
		'data':{
			'labels': data['underlyingExpiryPrice'],
			'datasets':[{
				'label': 'profit',
				'data': data['profit'],
				'backgroundColor': Array(data['underlyingExpiryPrice'].length).fill('rgba(255, 255, 255, 0)'),
				'borderColor': Array(data['underlyingExpiryPrice'].length).fill('rgba(255, 0, 0, 1)'),
			}]
		},
		'options':{
			'aspectRatio': 4,
			'borderColor': 'rgba(0, 0, 0, 0)',
			'scales': {
				'yAxes': [{
					scaleLabel: {
						display: true,
						labelString: 'Profit'
					},
					ticks:{
						callback: formatVolume
					}
				}],
				'xAxes': [{
					scaleLabel:{
						display: true,
						labelString: 'Underlying Price at expiry'
					},

				}]
			},
			tooltips: {
				callbacks: {
					label: function(tooltipItem, data) {
						console.log(data)
						var value = data.datasets[0].data[tooltipItem.index];
						// if(parseInt(value) >= 1000){
						// return '$' + value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
						// } 
						// else {
						// 	return '$' + value;
						// }
						return formatNumber(value)
					}
				}
			}
		},
	}
	return graphDataObj
}

function setSingleSpreadDisplayDivWidth(strategySpreadDisplayDiv){
	let width = $(`#derivativesUserView_${derivativesSelUser}`).width()
	let height = width*0.2;
	strategySpreadDisplayDiv.style.height = `${height}px`;
}

function resizeSpreadDisplayDivs(){
	let width = $(`#derivativesUserView_${derivativesSelUser}`).width()
	let height = width*0.2;
	let strategySpreadDisplayDivs = document.querySelectorAll(".strategySpreadDisplayDiv");
	strategySpreadDisplayDivs.forEach(function(strategySpreadDisplayDiv){
		strategySpreadDisplayDiv.style.height = `${height}px`;
	})
}

function filterContainerOwnerStrategies(searchTerm){
	let userStrategyDivs = document.querySelectorAll(`#derivativesUserView_${derivativesSelUser} .strategyDiv`)
	userStrategyDivs.forEach(function(strategyDiv){
		if(searchTerm=="")return strategyDiv.style.display = "block";
		let strategyID = strategyDiv.getAttribute('strategyID');
		let strategyName = strategies[strategyID]['strategyName']
		if(strategyName.toLowerCase().indexOf(searchTerm.toLowerCase())>-1)strategyDiv.style.display = "block";
		else strategyDiv.style.display = "none";
	})
	if(searchTerm=="")delete strategyOwnerActiveSearchTerm[derivativesSelUser];
	else strategyOwnerActiveSearchTerm[derivativesSelUser] = searchTerm;
}

function collapseAllStrategies(){
	let userStrategyDivs = document.querySelectorAll(`#derivativesUserView_${derivativesSelUser} .strategyDiv`)
	userStrategyDivs.forEach(function(strategyDiv){
		collapseStrategyDiv(strategyDiv)
	})
}

function expandAllStrategies(){
	let userStrategyDivs = document.querySelectorAll(`#derivativesUserView_${derivativesSelUser} .strategyDiv`)
	userStrategyDivs.forEach(function(strategyDiv){
		expandStrategyDiv(strategyDiv)
	})
}

function setContainerOwnerStrategyFilterActiveSearchTermInputValue(){
	let filterStrategies = document.querySelector(`[name='userDerivativesFilter']`)
	let activeSearchTerm = strategyOwnerActiveSearchTerm[derivativesSelUser] || ""
	filterStrategies.value = activeSearchTerm
}

document.addEventListener("socketConnected", function(e){
	// if(isTickerConnected) optionChainObj.startUpdateInterval();
	// else optionChainObj.stopUpdateInterval();
	// optionChainObj.socketConnected()
})

document.addEventListener("socketDisconnected", function(e){
	// optionChainObj.stopUpdateInterval()
})

document.addEventListener("tickerConnected", function(e){
	// optionChainObj.startUpdateInterval()
	setOptionChainIntervalState()
})

document.addEventListener("tickerDisconnected", function(e){
	setOptionChainIntervalState()
})

class optionChain{
	constructor(optionChainContainer){
		this.underlyingInstrument = null
		this.expiry = null
		this.updateInterval = null
		this.isIntervalActive = false
		this.optionChainInstrumentList = null;
		this.optionChainContainer = optionChainContainer
		this.initOptionChainContainerDisplay(optionChainContainer)
	}

	calcStrikeOptionChainValues(S, K, t, r, callPrice, putPrice){
		let tol = 1e-3
		let max_iter = 100

		//Set time to expiry as fraction of year
		t = t / 365.0

		function d1Func(sigma, S, K, r, t){
			return (1 / (sigma * Math.sqrt(t)) * (Math.log(S/K) + (r + sigma**2/2) * t))
		}

		function d2Func(sigma, t, d1){
			return d1 - sigma * Math.sqrt(t)
		}

		function call_price(sigma, S, K, r, t, d1, d2){
			return jStat.normal.cdf(d1, 0, -1) * S - jStat.normal.cdf(d2, 0, -1) * K * Math.exp(-r * t)
		}

		function put_price(sigma, S, K, r, t, d1, d2){
			return -jStat.normal.cdf(-d1, 0, 1) * S + jStat.normal.cdf(-d2, 0, 1) * K * Math.exp(-r * t)
		}

		function calcPutValues(){
			// #  We need to provide an initial guess for the root of our function
			let retObj = {
				"IV": 0,
				"delta": 0,
				"gamma": 0,
				"vega": 0,
				"theta": 0,
				"rho": 0,
			}
			if(putPrice==0)return retObj;
			let volatility = 0.50
			let count = 0
			let epsilon = 1
			let d1 = 0
			let d2 = 0
			let vega = 0

			while(epsilon>tol && count<max_iter){
				let prevVolatility = volatility
				d1 = d1Func(volatility, S, K, r, t)
				d2 = d2Func(volatility, t, d1)
				let priceDiff = put_price(volatility, S, K, r, t, d1, d2) - putPrice
				vega = S * jStat.normal.pdf(d1, 0, 1) * Math.sqrt(t)
				volatility = -(priceDiff / vega) + volatility
				epsilon = Math.abs((volatility - prevVolatility) / prevVolatility)
				count++
			}

			retObj["IV"] = volatility
			retObj["delta"] = jStat.normal.cdf(d1, 0, 1) - 1
			retObj["gamma"] = (1/(S * volatility * Math.sqrt(t)))*(1/Math.sqrt(2*Math.PI))*Math.exp((-1*(d1**2)/2))
			retObj["theta"] = (((-1*((S*volatility*1)/(2*Math.sqrt(t)))*(1/Math.sqrt(2*Math.PI))*Math.exp((-1*(d1**2)/2)))+0-0)/365)
			retObj["rho"] = (-1*K*t*(1-jStat.normal.cdf(d2, 0, 1)))/100
			retObj['vega'] = vega/100
			return retObj
		}

		function calcCallValues(){
			let retObj = {
				"IV": 0,
				"delta": 0,
				"gamma": 0,
				"vega": 0,
				"theta": 0,
				"rho": 0,
			}
			if(callPrice==0)return retObj;
			// #  We need to provide an initial guess for the root of our function
			let volatility = 0.50
			let count = 0
			let epsilon = 1
			let d1 = 0
			let d2 = 0
			let vega = 0

			while(epsilon>tol && count<max_iter){
				let prevVolatility = volatility

				// #  Calculate the vale of the call price
				d1 = d1Func(volatility, S, K, r, t)
				d2 = d2Func(volatility, t, d1)
				let priceDiff = call_price(volatility, S, K, r, t, d1, d2) - callPrice

				// #  Calculate vega, the derivative of the price with respect to
				// #  volatility
				vega = S * jStat.normal.pdf(d1, 0, 1) * Math.sqrt(t)

				// #  Update for value of the volatility
				volatility = -(priceDiff / vega) + volatility

				// #  Check the percent change between current and last iteration
				epsilon = Math.abs((volatility - prevVolatility) / prevVolatility )

				count++
			}
			retObj["IV"] = volatility
			retObj["delta"]= jStat.normal.cdf(d1, 0, 1)
			retObj["gamma"] = (1/(S * volatility * Math.sqrt(t)))*(1/Math.sqrt(2*Math.PI))*Math.exp((-1*(d1**2)/2))
			retObj["theta"] = (((-1*((S * volatility)/(2*Math.sqrt(t)))*(1/Math.sqrt(2*Math.PI))*Math.exp(-1*(d1**2)/2))-(0)+(0))/365)
			retObj["rho"] = (K*t*jStat.normal.cdf(d2, 0, 1))/100
			retObj['vega'] = vega/100
			return retObj
		}

		let retObj = {"CE": calcCallValues(), "PE": calcPutValues()}
		return retObj
	}

	setUnderlyingInstrumentAndExpiry(underlyingInstrument, expiry){
		if(!socketConnected)return alert("Not connected to server");
		this.underlyingInstrument = underlyingInstrument
		this.expiry = expiry
		if(this.isIntervalActive)optionChainObj.startUpdateInterval();
	}

	startUpdateInterval(){
		this.isIntervalActive = true
		if(!this.underlyingInstrument)return;
		// console.log("Starting option chain update interval")
		let currOptionChainObj = this
		this.getOptionChainInstruments(this.underlyingInstrument, this.expiry, function(optionChainInstrumentList){
			currOptionChainObj.optionChainInstrumentList = optionChainInstrumentList
			currOptionChainObj.setOptionChainPrices()
			currOptionChainObj.insertOptionChainValues()
			currOptionChainObj.updateInterval = setInterval(function(){
				currOptionChainObj.setOptionChainPrices()
				currOptionChainObj.updateOptionChainDisplayOnUpdatedValues()
			}, 1000)
		})
	}

	insertOptionChainValues(){
		if(!this.optionChainInstrumentList)return;
		let optionChainValuesContainer = this.optionChainValuesDisplay
		deleteAllChildren(optionChainValuesContainer)
		let optionChainInstrumentList = this.optionChainInstrumentList
		let optionChainObj = this
		optionChainInstrumentList.forEach(function(strikeValues){
			let currStrikeRow = optionChainObj.createStrikeRow(strikeValues)
			optionChainValuesContainer.appendChild(currStrikeRow)
		})
	}

	createStrikeRow(strikeValues){
		let strikeRow = document.createElement("div")
		let strikeDiv = document.createElement("div")
		let callDiv = document.createElement("div")
		let putDiv = document.createElement("div")

		strikeRow.classList.add("strikeRow")
		strikeDiv.innerText = formatNumber(strikeValues['strike'])
		strikeDiv.classList.add("strikeRowStrikeDiv")
		callDiv.classList.add("strikeRowOptionDiv")
		putDiv.classList.add("strikeRowOptionDiv")
		this.setOptionChainOptionDiv(callDiv, strikeValues["callValues"])
		this.setOptionChainOptionDiv(putDiv, strikeValues["putValues"])

		strikeRow.appendChild(callDiv)
		strikeRow.appendChild(strikeDiv)
		strikeRow.appendChild(putDiv)

		return strikeRow
	}

	setOptionChainOptionDiv(optionDiv, optionValues){
		let priceChangePercent = ((optionValues["currPrice"]-optionValues["lastClosePrice"])/optionValues["lastClosePrice"])*100
		let priceChangePercentStr = ((priceChangePercent>0)?"+":"")+formatNumber(priceChangePercent)+"%"

		let optionPriceDiv = this.createOptionChainOptionValDiv(optionValues["currPrice"], priceChangePercentStr, "optionPrice")
		let IVDiv = this.createOptionChainOptionValDiv("IV", formatNumber(optionValues["IV"]*100), "IV")
		let OIDiv = this.createOptionChainOptionValDiv("OI", formatNumber(optionValues["OI"]/100000), "OI")
		let OIChgDiv = this.createOptionChainOptionValDiv("OIChg", "TBI", "OIChg")
		let volDiv = this.createOptionChainOptionValDiv("Vol", formatVolume(optionValues["Vol"]), "Volume")
		let deltaDiv = this.createOptionChainOptionValDiv("Delta", formatNumber(optionValues["delta"]), "delta")
		let gammaDiv = this.createOptionChainOptionValDiv("Gamma", formatNumber(optionValues["gamma"]), "gamma")
		let thetaDiv = this.createOptionChainOptionValDiv("Theta", formatNumber(optionValues["theta"]/100), "theta")
		let vegaDiv = this.createOptionChainOptionValDiv("Vega", formatNumber(optionValues["vega"]/100), "vega")

		let color = (priceChangePercent>0)?"green":(priceChangePercent<0)?"red":"black"
		optionPriceDiv.querySelector(".optionChainOptionPropVal").style.color = color

		optionDiv.appendChild(optionPriceDiv)
		optionDiv.appendChild(IVDiv)
		optionDiv.appendChild(OIDiv)
		optionDiv.appendChild(OIChgDiv)
		optionDiv.appendChild(volDiv)
		optionDiv.append(deltaDiv)
		optionDiv.append(gammaDiv)
		optionDiv.append(thetaDiv)
		optionDiv.append(vegaDiv)
	}

	createOptionChainOptionValDiv(labelTxt, value, propVal){
		let optionPropDiv = document.createElement("div")
		optionPropDiv.classList.add("optionPropDiv")
		optionPropDiv.setAttribute("propVal", propVal)
		let label = document.createElement("div")
		label.classList.add("optionChainOptionPropLabel")
		label.style.width = "50%"
		label.innerText = labelTxt
		let val = document.createElement("div")
		val.classList.add("optionChainOptionPropVal")
		val.style.width = "50%";
		val.innerText = value

		optionPropDiv.appendChild(label)
		optionPropDiv.appendChild(val)
		return optionPropDiv
	}

	stopUpdateInterval(){
		this.isIntervalActive = false
		// console.log("Stopping option chain update interval")
		clearInterval(this.updateInterval)
		this.getOptionChainInstruments(null, null, function(){})
	}

	getOptionChainInstruments(underlyingInstrument, expiry, callback){
		let data = {"underlyingInstrumentID": underlyingInstrument, "expiry": expiry}
		socket.emit("setSocketOptionChain", data, function(error, result){
			if(error || data.error)return console.log(error);
			callback(result.options)
		})
	}

	socketConnected(){
		if(this.underlyingInstrument)this.setUnderlyingInstrumentAndExpiry(this.underlyingInstrument, this.expiry)
	}

	setOptionChainPrices(){
		let daysToExpiry = this.calcDaysToExpiry()
		let underlyingPrice = instrumentPrices[this.underlyingInstrument]['curr_price']
		let optionChainObj = this
		this.optionChainInstrumentList.forEach(function(strikeOptions){
			let currStrike = strikeOptions['strike']*100
			strikeOptions['callValues'] = {"currPrice":0, "lastClosePrice": 0, "OI": 0, "Vol": 0}
			strikeOptions['putValues'] = {"currPrice":0, "lastClosePrice": 0, "OI": 0, "Vol": 0}
			if(instrumentPrices[strikeOptions['CE']])strikeOptions['callValues'] = {"currPrice": instrumentPrices[strikeOptions['CE']]['curr_price'], "lastClosePrice": instrumentPrices[strikeOptions['CE']]['last_close_price'], "OI": instrumentPrices[strikeOptions['CE']]['OI'], "Vol": instrumentPrices[strikeOptions['CE']]['volume']};
			if(instrumentPrices[strikeOptions['PE']])strikeOptions['putValues'] = {"currPrice": instrumentPrices[strikeOptions['PE']]['curr_price'], "lastClosePrice": instrumentPrices[strikeOptions['PE']]['last_close_price'], "OI": instrumentPrices[strikeOptions['PE']]['OI'], "Vol": instrumentPrices[strikeOptions['PE']]['volume']};
			console.log(daysToExpiry)
			let strikeOptionChainValues = optionChainObj.calcStrikeOptionChainValues(underlyingPrice, currStrike, daysToExpiry, 0, strikeOptions['callValues']['currPrice'], strikeOptions['putValues']['currPrice'])
			Object.assign(strikeOptions['callValues'], strikeOptionChainValues["CE"])
			Object.assign(strikeOptions['putValues'], strikeOptionChainValues["PE"])
		})
	}

	calcDaysToExpiry(){
		let expiryDate = Date.parse(this.expiry)
		const today = Date.parse(formatDate(new Date()));
		const diffTime = Math.max(expiryDate - today, 0);
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		return diffDays
	}

	updateOptionChainDisplayOnUpdatedValues(){
		let optionChainValuesDisplay = this.optionChainValuesDisplay
		let optionChainInstrumentList = this.optionChainInstrumentList
		let optionChainObj = this
		for(let i=0; i<optionChainValuesDisplay.childNodes.length; i++){
			let strikeRow = optionChainValuesDisplay.childNodes[i]
			let strikeValues = optionChainInstrumentList[i]
			optionChainObj.updateOptionChainOptionValuesDisplay(strikeRow.firstChild, strikeValues["callValues"])
			optionChainObj.updateOptionChainOptionValuesDisplay(strikeRow.lastChild, strikeValues["putValues"])
		}
	}

	updateOptionChainOptionValuesDisplay(optionDiv, optionValues){
		let priceChangePercent = ((optionValues["currPrice"]-optionValues["lastClosePrice"])/optionValues["lastClosePrice"])*100
		let priceChangePercentStr = ((priceChangePercent>0)?"+":"")+formatNumber(priceChangePercent)+"%"
		let optionPriceDiv = optionDiv.querySelector(`[propval= 'optionPrice'] .optionChainOptionPropLabel`)
		let optionClosePriceDiv = optionDiv.querySelector(`[propval= 'optionPrice'] .optionChainOptionPropVal`)
		let IVDiv = optionDiv.querySelector(`[propval= 'IV'] .optionChainOptionPropVal`)
		let OIDiv = optionDiv.querySelector(`[propval= 'OI'] .optionChainOptionPropVal`)
		let OIChgDiv = optionDiv.querySelector(`[propval= 'OIChg'] .optionChainOptionPropVal`)
		let volDiv = optionDiv.querySelector(`[propval= 'Volume'] .optionChainOptionPropVal`)
		let deltaDiv = optionDiv.querySelector(`[propval= 'delta'] .optionChainOptionPropVal`)
		let gammaDiv = optionDiv.querySelector(`[propval= 'gamma'] .optionChainOptionPropVal`)
		let thetaDiv = optionDiv.querySelector(`[propval= 'theta'] .optionChainOptionPropVal`)
		let vegaDiv = optionDiv.querySelector(`[propval= 'vega'] .optionChainOptionPropVal`)

		let color = (priceChangePercent>0)?"green":(priceChangePercent<0)?"red":"black"
		optionClosePriceDiv.style.color = color

		optionPriceDiv.innerText = formatNumber(optionValues['currPrice']/100)
		optionClosePriceDiv.innerText = priceChangePercentStr
		IVDiv.innerText = formatNumber(optionValues['IV']*100)
		OIDiv.innerText = formatNumber(optionValues['OI']/100000)
		OIChgDiv.innerText = "TBI"
		volDiv.innerText = formatVolume(optionValues['Vol'])
		deltaDiv.innerText = formatNumber(optionValues['delta'])
		gammaDiv.innerText = formatNumber(optionValues['gamma'])
		thetaDiv.innerText = formatNumber(optionValues['theta']/100)
		vegaDiv.innerText = formatNumber(optionValues['vega']/100)
	}
}

optionChain.prototype.initOptionChainContainerDisplay = function(optionChainContainer){
	optionChainContainer.appendChild(this.initSetOptionChainSelect());
	optionChainContainer.appendChild(this.initOptionChainDisplay());
}

optionChain.prototype.initSetOptionChainSelect = function(){
	let optionChainSelectContainer = document.createElement("div")
	optionChainSelectContainer.classList.add("optionChainSelectContainer")

	let optionChainSelect = document.createElement("select")
	optionChainSelect.setAttribute("id", "optionChainSelect")

	let placeholder = document.createElement("option")
	placeholder.innerText = "--Select Option Chain--"
	placeholder.value = ""
	placeholder.setAttribute("selected", true)
	placeholder.disabled = true
	optionChainSelect.appendChild(placeholder)

	for(instrumentID in underlyingInstruments){
		underlyingInstruments[instrumentID]['expiry'].forEach(function(expiryDate){
			let option = document.createElement("option")
			option.innerText = underlyingInstruments[instrumentID]['tradingsymbol'] + " (" + expiryDate + ")"
			option.setAttribute("underlyingInstrument", instrumentID)
			option.setAttribute("expiry", expiryDate)
			optionChainSelect.appendChild(option)
		})
	}
	let optionChainObj = this
	optionChainSelectContainer.appendChild(optionChainSelect)
	$(document).ready(function(){
		$("#optionChainSelect").select2({width:"resolve"})
		$('#optionChainSelect').on('change', function(){
			let selectedOptionChain = document.querySelector("#optionChainSelect");
			selectedOptionChain = selectedOptionChain.options[selectedOptionChain.selectedIndex];
			let underlyingInstrument = selectedOptionChain.getAttribute("underlyingInstrument")
			let expiry = selectedOptionChain.getAttribute("expiry")
			optionChainObj.setUnderlyingInstrumentAndExpiry(underlyingInstrument, expiry)
		})
	});
	this.optionChainSelect = optionChainSelect
	return optionChainSelectContainer
}

optionChain.prototype.initOptionChainDisplay = function(){
	let optionChainDisplay = document.createElement("div")
	optionChainDisplay.classList.add("optionChainDisplay")
	// optionChainDisplay.classList.add("col-sm-12")

	let emptyOptionChainDiv = document.createElement("div")
	emptyOptionChainDiv.style.marginTop = "5px";
	emptyOptionChainDiv.style.textAlign = "center"
	emptyOptionChainDiv.innerText = "No Option Chain Selected"
	
	optionChainDisplay.appendChild(emptyOptionChainDiv)
	this.optionChainValuesDisplay = optionChainDisplay
	return optionChainDisplay
}

function setOptionChainIntervalState(){
	if(isTickerConnected && isOptionChainOpen && getCurrPath()=="derivatives")
		return optionChainObj.startUpdateInterval();
	optionChainObj.stopUpdateInterval();
}

function formatVolume(vol){
	// console.log(typeof(num))
	if(isNaN(vol))return "N/A";
	if(typeof(vol)!="number")return vol;
	vol =  parseFloat(vol.toFixed(2));
	return vol.toLocaleString('en-IN')
}