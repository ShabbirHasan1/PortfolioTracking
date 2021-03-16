window.history.replaceState({"path": window.location.href}, "", window.location.href);
viewToggleButtons = document.getElementsByClassName('pageViewToggle')
for(viewToggleButton of viewToggleButtons)viewToggleButton.onclick = function(){
	var currToggleButtonValue = this.getAttribute("value")
	var currButtonUrl = this.getAttribute("url")
	setView(currToggleButtonValue)
	updateUrl(currButtonUrl)
}
setViewOnUrlChange()

var instrumentOrder = ["EQ", "MF", "FUT", "CE", "PE"]
var containerTypeFunctions = {}
var containers, containerOwners, containerTypes, groups, instruments, newContainerContainerTypes, accounts, eqInstruments, watchlists, mfInstruments, strategies, underlyingInstruments, loansObj;
var autoSetContainerTypeContainer = new Set();
var dataSet = false;

document.addEventListener('DOMContentLoaded', function(){
	let start = performance.now()
	getRequest('/pageData', function(error, result){
		if(error)return console.log(error);
		let data = result.data
		setPageData(data)
		let end = performance.now()
		console.log(end - start)
	})
})

function setPageData(data){
	for(var key in data){
		if (typeof data[key] === 'string' || data[key] instanceof String)
			data[key] = JSON.parse(data[key])
	}
	dataVersionId = data.dataVersionId
	groups={};containerOwners={};containers={}; containerTypes={}; watchlists={}; eqInstruments={}; mfInstruments={}; loansObj={};
	instruments = {"all":{},"EQ":{},"MF":{},"FUT":{},"CE":{},"PE":{}}
	data.groupsData.forEach(function(group, idx){groups[group['groupID']]=group})
	data.instrumentOwners.forEach(function(owner, idx){containerOwners[owner['googleProfileID']]=owner})
	data.containersInfo.forEach(function(container, idx){containers[container['containerID']]=container})
	data.containerTypesData.forEach(function(containerType, idx){containerTypes[containerType['containerTypeID']]=containerType})
	for (watchlistID in data.watchlists){
		watchlistName = data.watchlists[watchlistID]['watchlistName']
		watchlistInstruments = {}
		watchlistInstrumentList = data.watchlists[watchlistID]['instrumentInfo']
		watchlistInstrumentList.forEach(function(watchlistInstrument){watchlistInstruments[watchlistInstrument['instrumentID']]=watchlistInstrument})
		watchlists[watchlistID] = {"watchlistID": watchlistID, "watchlistName": watchlistName, "instruments": watchlistInstruments}
	}
	accounts = data.accounts
	loansObj = data.loans
	strategies = data.strategies
	for(strategyID in strategies){
		temp = {}
		strategies[strategyID]['strategyID'] = strategyID
		if(strategies[strategyID]['containers']){
			strategies[strategyID]['containers'].forEach(function(strategyContainer){temp[strategyContainer['containerID']] = strategyContainer})
		}
		strategies[strategyID]['totals'] = getInitStrategyTotalsObj()
		strategies[strategyID]['displayClosePos'] = false
		strategies[strategyID]['containers'] = temp
	}

	underlyingInstruments = data.underlyingInstruments
	for(instrumentID in underlyingInstruments)underlyingInstruments[instrumentID]['instrumentID'] = instrumentID
	newContainerContainerTypes = Object.filter(containerTypes, function(containerTypeID, containerType){return containerType['PortfolioType']})
	
	for(containerOwner in containerOwners)containerOwners[containerOwner]['fullName'] = containerOwners[containerOwner]['firstName'] + " " + containerOwners[containerOwner]['lastName'];
	setReturnDates(accounts)
	dataSet = true;
	
	document.dispatchEvent(new CustomEvent('dataSet'));
	autoSetContainerTypeContainer.add(0);autoSetContainerTypeContainer.add(3);
}