var instrumentPrices = {};
var isTickerConnected = false;
var displayUpdateTimer = null;
var dataVersionId = null
var socket = null;
var socketConnected = false
var socketInit = false

document.addEventListener("dataSet", function(e){
	if(socket==null)socket = io('/dataStreamer');
	socket.on("connect", function(){
		socket.emit("test")
		socketConnected = true
		console.log("connected")
		let socketConnectedEvent = new CustomEvent('socketConnected');
		document.dispatchEvent(socketConnectedEvent);
		socket.emit("getAllSubscribedPrices", {}, function(error, result){
			if(error)return console.log(error);
			instrumentPrices = result.prices;
			isTickerConnected = result.tickerConnected
			// console.log("ticker connected: " + isTickerConnected)
			if(isTickerConnected!=true){
				let tickerDisconnectedEvent = new CustomEvent('tickerDisconnected');
				document.dispatchEvent(tickerDisconnectedEvent);
				return document.querySelector("#kiteConnectLogin").style.display = "block"
			}
			updateAllContainersLivePricesUnbookedValuesAndDisplay()
			updateAllWatchlistInstrumentValues()
			updatePmsInsturmentsTableOnPriceChange()
			updateStrategyAccountsOnPriceChange()
			
			clearInterval(displayUpdateTimer);
			
			displayUpdateTimer = setInterval(function(){
				updateAllContainersLivePricesUnbookedValuesAndDisplay()
				updateAllWatchlistInstrumentValues()
				updatePmsInsturmentsTableOnPriceChange()
				updateStrategyAccountsOnPriceChange()
			}, 1000)
			let tickerConnectedEvent = new CustomEvent('tickerConnected');
			document.dispatchEvent(tickerConnectedEvent);

		})
		socket.emit("getPageData", {"dataVersionId": dataVersionId}, function(error, result){
			if(error)return console.log(error);
			if(result==null)return console.log("dataVersionID in sync");
			console.log("dataVersionID out of synch, reloading page")
			location.reload()
			// setPageData(result)
		})		
	})

	socket.on("newPrices", function(data){
		instrumentPrices = Object.assign(instrumentPrices, data)
	})

	socket.on("disconnect", function(reason){
		clearInterval(displayUpdateTimer);
		socketConnected = false
		isTickerConnected = false
		let socketDisconnectedEvent = new CustomEvent('socketDisconnected');
		document.dispatchEvent(socketDisconnectedEvent);
		console.log(reason)
	})

	socket.on("reconnect", function(attemptNum){
		console.log("successfully reconnected")
	})

	socket.on('connect_timeout', function(timeout){
		console.log(timeout)
	});

	socket.on('error', function(error){
		console.log(`error: ${error}`)
	});

	socket.on("tickerConnectionUpdate", function(data){
		clearInterval(displayUpdateTimer);
		isTickerConnected = data.tickerConnected
		console.log("ticker connected: " + isTickerConnected)
		
		if(!isTickerConnected){
			let tickerDisconnectedEvent = new CustomEvent('tickerDisconnected');
			document.dispatchEvent(tickerDisconnectedEvent);
			return document.querySelector("#kiteConnectLogin").style.display = "block"
		}
		let tickerConnectedEvent = new CustomEvent('tickerConnected');
		document.dispatchEvent(tickerConnectedEvent);
		document.querySelector("#kiteConnectLogin").style.display = "none"
		displayUpdateTimer = setInterval(function(){
			updateAllContainersLivePricesUnbookedValuesAndDisplay()
			updateAllWatchlistInstrumentValues()
			updatePmsInsturmentsTableOnPriceChange()
			updateStrategyAccountsOnPriceChange()
		}, 1000)
	})

	socket.on("dataUpdate", function(data){
		processDataUpdate(data)
	})

	socket.on("dailyDataUpdate", function(data){
		dataVersionId = data.dataVersionId
		updateDataContainersAndAccounts({}, data.updatedAccounts)
		lendingObj.processUpdatedLoanValueOnDailyDataUpdate(data.updatedLoans)
		processUpdatedWatchlists(data.watchlists)
	})

	socket.on("deleteTrackedInstruments", function(data){
		let deletedInstruments = data.deletedInstruments
		// console.log(`Deleted Instruments: ${deletedInstruments}`)
		deletedInstruments.forEach(function(instrumentID){delete instrumentPrices[instrumentID]})
	})
}, {once: true})

document.querySelector("#kiteConnectLogin").querySelector("a").addEventListener("click", function(e){
	e.preventDefault()
	let kiteLoginUrl = this.getAttribute("href")
	window.open(kiteLoginUrl)
})

function processDataUpdate(data){
	dataVersionId = data.dataVersionId
	updateDataNewContainerOwners(data.newContainerOwners)
	updateDataUpdatedContainerGroups(data.updatedContainerGroups)
	updateDataUpdatedWatchlists(data.updatedWatchlists)
	updateDataContainersAndAccounts(data.addedContainers, data.updatedAccounts)
	updateDataStrategiesAndAssignments(data.addedStrategy, data.updatedStrategyContainers)
	updateAddedLoan(data.addedLoan)
}

function updateDataNewContainerOwners(newContainerOwners){
	// if(newContainerOwners)console.log(newContainerOwners)
}

function updateDataAddedAndDeletedInstruments(addedInstruments, deletedInstruments){
	deletedInstruments.forEach(function(intrumentID){delete instrumentPrices[intrumentID]})
}

function updateNewGroups(newGroups){
}

function updateDataUpdatedContainerGroups(updatedContainerGroups){
	for(containerID in updatedContainerGroups){
		containers[containerID]['groupID'] = updatedContainerGroups[containerID]
		let containerRow = document.querySelector("#containerReturns_"+containerID)
		if(containerRow==null)return;
		let containerGroupSelect = containerRow.querySelector("[name='containerGroupSelect']")
		containerGroupSelect.value = (updatedContainerGroups[containerID]==null)?"": updatedContainerGroups[containerID]
	}
}

function updateDataUpdatedWatchlists(updatedWatchlists){
	if(!updatedWatchlists.hasOwnProperty('watchlistID'))return;
	let watchlistID = parseInt(updatedWatchlists['watchlistID'])
	let watchlistInstrumentsDiv = document.querySelector("#watchlistInstrumentsDisplayDiv")
	let activeWatchlistID = parseInt(watchlistInstrumentsDiv.getAttribute("watchlistID"))
	if(!watchlists.hasOwnProperty(watchlistID)){
		watchlists[watchlistID] = updatedWatchlists
		let watchlistSelect = document.querySelector("#watchlistSelect")
		let newWatchlistOption = document.createElement("option")
		newWatchlistOption.innerHTML = updatedWatchlists['watchlistName']
		newWatchlistOption.setAttribute("value", watchlistID)
		watchlistSelect.add(newWatchlistOption)
		return
	}
	if(updatedWatchlists.hasOwnProperty('addedInstrumentID')){
		let instrumentObj = updatedWatchlists['addedInstrumentID']
		return updateAddInstrumentToWatchlist(watchlistID, instrumentObj)
	}
	console.log(updatedWatchlists)
	let instrumentID = updatedWatchlists['deletedInstrumentID']
	console.log(instrumentID)
	updateDeleteInstrumentFromWatchlist(watchlistID, instrumentID)
	// let watchlistInstrumentIndex = watchlists[watchlistID]['instrumentID'].indexOf(instrumentID)
}

function updateDataContainersAndAccounts(addedContainers, updatedAccounts){
	if(!jQuery.isEmptyObject(addedContainers)){
		let addedContainersEvent = new CustomEvent('addedContainers', {detail: addedContainers});
		document.dispatchEvent(addedContainersEvent);
	}
	if(!jQuery.isEmptyObject(updatedAccounts)){
		let updatedAccountsEvent = new CustomEvent('updatedAccounts', {detail: updatedAccounts});
		document.dispatchEvent(updatedAccountsEvent);
	}	
}

function updateDataStrategiesAndAssignments(addedStrategy, updatedStrategyContainers){
	if(!jQuery.isEmptyObject(addedStrategy)){
		let addedStrateyEvent = new CustomEvent('strategyAdded', {detail: addedStrategy});
		document.dispatchEvent(addedStrateyEvent);
	}

	if(!jQuery.isEmptyObject(updatedStrategyContainers)){
		let updatedStrategiesEvent = new CustomEvent('updatedStrategyContainers', {detail: updatedStrategyContainers});
		document.dispatchEvent(updatedStrategiesEvent);
	}
}

function updateAddedLoan(addedLoan){
	if(jQuery.isEmptyObject(addedLoan))return;
	let addedLoanEvent = new CustomEvent('addedLoan', {detail: addedLoan})
	document.dispatchEvent(addedLoanEvent);
}

function processDailyDataUpdate(updateData){
	console.log(updateData)
}