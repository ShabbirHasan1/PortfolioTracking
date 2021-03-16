var openPosHeaders = ['', 'Name', 'Buy/Sell', 'Booked Profit', 'Open Date', 'Open Quantity', 'Open Price', 'Current Price', 'Unbooked Profit/Loss', 'Unbooked Profit/Loss (1 day)', 'Unbooked Profit/Loss (1 week)', 'Unbooked Profit/Loss (1 month)', 'Unbooked Profit/Loss (3 months)', 'Unbooked Profit/Loss (6 months)', 'Unbooked Profit/Loss (1 year)', "Group", "Add Close Transaction"]
var closePosHeaders = ['Instrument/Container', 'Booked Profit/Loss']
var return_dates = []
var instrumentToContainersMap = {}
var containerMap = {}
var max_date = null
var openClosePosVisDisplayOpen = true;
var displayAccountsSelUserId = null;
var accountsHideHistOpenProfit = false

document.addEventListener("dataSet", function dataSetHandler(e){
	let accountsContainer = document.querySelector("#accountsContainer")
	// accountsContainer.childNodes.forEach(function(childNode){deleteAllChildren(childNode)})
	setActionOptions()
	setUserViews(accounts)
}, {once: true})

function setActionOptions(){
	let actionOptions = document.getElementById("userContainerActions");
	actionOptions.appendChild(setBookedProfitsStartDateField());
	actionOptions.appendChild(setContainersGroupSelect());
	actionOptions.appendChild(setToggleOpenClosePosViewBtn());
	actionOptions.appendChild(setCloseAllOpenExpiredPosButton());
}

function setCloseAllOpenExpiredPosButton(){
	let closeAllExpiredOpenPos = document.createElement("Button")
	closeAllExpiredOpenPos.setAttribute("id", "closeAllExpiredOpenPos")
	closeAllExpiredOpenPos.innerText = "Close expired open positions"
	closeAllExpiredOpenPos.classList.add("btn", "btn-default", "btn-sm")
	closeAllExpiredOpenPos.style.float = "right"
	closeAllExpiredOpenPos.addEventListener("click", function(e){
		socket.emit("closeAllExpiredOpenPos", {}, function(error, data){
			if(error || data.error){
				console.log(error)
				console.log(data.error)
				return alert("Error closing all expired open positions")
			}
			dataVersionId = data.dataVersionId
			let addedContainers = data['addedContainers']
			let updatedAccounts = data['updatedAccounts']
			let updatedStrategyContainers = data['updatedStrategyContainers']
			let updatedAccountsEvent = new CustomEvent('updatedAccounts', {detail: updatedAccounts});
			document.dispatchEvent(updatedAccountsEvent);
			let updatedStrategiesEvent = new CustomEvent('updatedStrategyContainers', {detail: updatedStrategyContainers});
			document.dispatchEvent(updatedStrategiesEvent);
			// updateContainerAccountsAndDisplay(addedContainers, updatedAccounts)
		})
	})
	return closeAllExpiredOpenPos
}

function setToggleOpenClosePosViewBtn(){
	let toggleOpenClosePosDisplay = document.createElement("Button");
	toggleOpenClosePosDisplay.setAttribute("id", "toggleOpenClosePosDisplay")
	toggleOpenClosePosDisplay.innerText = "View Close Positions"
	toggleOpenClosePosDisplay.classList.add("btn", "btn-default", "btn-sm")
	toggleOpenClosePosDisplay.addEventListener("click", function(e){
		if(openClosePosVisDisplayOpen){
			document.querySelector("#userAccountOpenPosViews").style.display = "none"
			document.querySelector("#userAccountClosePosViews").style.display = "block"
			let targetView = document.getElementById("accountCloseView_" + displayAccountsSelUserId)
			targetView.style.display = "block" 
			openClosePosVisDisplayOpen = false
			this.innerText = "View Open Positions"
			return;
		}
		document.querySelector("#userAccountOpenPosViews").style.display = "block"
		document.querySelector("#userAccountClosePosViews").style.display = "none"
		let targetView = document.getElementById("accountView_" + displayAccountsSelUserId)
		targetView.style.display = "block"
		openClosePosVisDisplayOpen = true
		this.innerText = "View Close Positions"	
	})
	return toggleOpenClosePosDisplay
}

function getCheckedContainers(){
	let checkedContainerList = []
	let containerCheckBoxes = document.querySelectorAll(".selectContainerRow")
	containerCheckBoxes.forEach(function(containerCheckBox, idx){
		if(containerCheckBox.checked)checkedContainerList.push((containerCheckBox.parentElement.parentElement.getAttribute("containerId")))
	})
	return checkedContainerList;
}

function setBookedProfitsStartDateField(){
	let setBookedProfitStartDateDiv = document.createElement("div");
	setBookedProfitStartDateDiv.classList.add("col-sm-3", "col-lg-2", "bookedProfitStartDateDiv")
	setBookedProfitStartDateHeaderDiv = document.createElement("div")
	setBookedProfitStartDateHeaderDiv.classList.add("col-sm-5")
	setBookedProfitStartDateHeaderDiv.innerText = "Booked Profit Start Date:"
	let dateInput = document.createElement("input");
	dateInput.setAttribute("type", "text")
	dateInput.setAttribute("placeholder", "Set Booked Profit Start Date")
	dateInput.setAttribute("onfocus", "(this.type='date')")
	dateInput.setAttribute("onblur", "(this.type='text')")
	dateInput.classList.add("col-sm-12")
	dateInput.addEventListener("change", function(e){
		newDate = new Date(this.value).getTime()
		let updateBookedProfitStartDateContainerList = getCheckedContainers()
		if(updateBookedProfitStartDateContainerList.length==0){
			this.value = ''
			return alert("Please select containers to perform action on")
		}
		let updateData = {
			"container_list": updateBookedProfitStartDateContainerList,
			"bookedProfitStartDate": this.value
		}
		let currInputField = this;
		socket.emit('updateContainersBookedProfitStartDate', updateData, function(error, data){
			if(error || data.error){
				console.log(error)
				alert("error updating booked profit start date");
				return currInputField.value = ""
			}
			dataVersionId = data.dataVersionId
			currInputField.value = ""
			updatenewProfitBookedDateAccountsAndDisplay(data['updatedAccounts'], newDate)
		})
	})
	setBookedProfitStartDateDiv.appendChild(dateInput)
	return setBookedProfitStartDateDiv
}

function setContainersGroupSelect(){
	let setContainersGroupDiv = document.createElement("div");
	setContainersGroupDiv.classList.add("col-sm-3", "col-lg-2", "setContainersGroup")
	setContainersGroupHeaderDiv = document.createElement("div")
	setContainersGroupHeaderDiv.classList.add("col-sm-4")
	setContainersGroupHeaderDiv.innerText = "Group"
	let groupSelect = document.createElement("Select");
	groupSelect.setAttribute("id", "containersGroupSelect")
	groupSelect.setAttribute("style", "width: 100%; height: 100%")
	$(document).ready(function() {
		$('#containersGroupSelect').select2({width: "resolve", height: "resolve"});
	});
	let containerGroupsSelectFields = [{'inputField': 'groupID', 'outputField': 'value'}]
	let groupsWithNone = {...{"None":{groupID:"None", groupName:"None"}}, ...groups}
	createSelectOptionsList(groupSelect, groupsWithNone, containerGroupsSelectFields, 'groupName', true, 'Select Group', false, false)
	$(document.body).on("change","#containersGroupSelect",function(){
		let selectedGroup = this.value
		let selectedContainers = getCheckedContainers()
		if(selectedContainers.length==0){
			this.value = ''
			return alert("Please select containers to perform action on")
		}
		let updateData = {"container_list": selectedContainers,"groupID": selectedGroup=="None" ? '' : parseInt(selectedGroup)}
		let groupSelectList = this;
		console.log(updateData)
		socket.emit('updateContainersToSingleGroup', updateData, function(error, data){
			if(error || data['error']){
				console.log(error)
				console.log(result.data['error'])
				alert("error updating groups");
				return currInputField.value = ''
			}
			dataVersionId = data.dataVersionId
			let newGroupID = selectedGroup=="None" ? null : parseInt(selectedGroup)
			selectedContainers.forEach(function(containerId){
				containers[containerId]['groupID'] = newGroupID
				let containerRowSelect = document.querySelector("#containerReturns_"+containerId).querySelector("[name='containerGroupSelect']")
				containerRowSelect.value = selectedGroup=="None" ? '' : parseInt(selectedGroup)
				console.log(containerRowSelect)
			})
			groupSelectList.value = ""
		})
	})
	setContainersGroupDiv.appendChild(groupSelect)
	return setContainersGroupDiv
}

function calculateAllContainerAccountsOpenPosBackExtrapolation(accounts){
	for(let containerID in accounts){
		let containerTypeID = containers[containerID]['containerTypeID']
		backExtrapolationFunctions[containerTypeID](accounts[containerID])
	}
}

function setReturnDates(data){
	return_dates = []
	let returns_obj = data[Object.keys(data)[0]].historical_positions
	for(date in returns_obj){
		return_dates.push(Date.parse(date));
	}
	return_dates.sort()
	return_dates = return_dates.map(function(e){return formatDate(e)})
	max_date = return_dates[return_dates.length-1];
	// console.log(return_dates)
}
 
function setUserViews(containerAccountsData){
	userViewNavigationButtons = document.getElementById("userAccountsToggleView")
	userViewsContainer = document.getElementById("userAccountOpenPosViews")
	userCloseAccountsView = document.getElementById("userAccountClosePosViews")
	deleteAllChildren(userViewNavigationButtons)
	deleteAllChildren(userViewsContainer)
	if(containerAccountsData.length==0)return userViewsContainer.innerText = "No Users Accounts Available"
	for(containerOwner in containerOwners){
		createUserAccountView(containerOwner, userViewsContainer)
		createUserCloseAccountView(containerOwner, userCloseAccountsView)
		createAccountViewNavigationButton(containerOwner, userViewNavigationButtons)
	}
	for(let containerID in containerAccountsData){
		let containerOwner = containers[containerID]['ownerProfileID']
		let containerOwnerAccountView = document.querySelector("#accountView_"+containerOwner)
		let containerOwnerCloseAccountView = document.querySelector("#accountCloseView_"+containerOwner)
		if(containerOwnerAccountView==null){
			createUserAccountView(containerOwner, userViewsContainer)
			createAccountViewNavigationButton(containerOwner, userViewNavigationButtons)
			containerOwnerAccountView = document.querySelector("#accountView_"+containerOwner)
		}
		let containerOwnerAccountsTable = containerOwnerAccountView.querySelector(".accountViewTable")
		let containerOwnerCloseAccountsTable = containerOwnerCloseAccountView.querySelector(".accountViewTable")
		if(containers[containerID]['parentContainerID']!=null)continue;
		if(accounts[containerID]['open_position']['open_volume']>0){
			createAndInsertContainerRow(containerID, containerAccountsData[containerID], containerOwnerAccountsTable);
		}
		if(accounts[containerID]['historical_positions'][max_date]['closed_volume']>0)
			createAndInsertContainerCloseRow(containerID, containerAccountsData[containerID], containerOwnerCloseAccountsTable)
	}
	displayAccountsSelUserId = userViewsContainer.firstChild.getAttribute("userId")
	userViewsContainer.firstChild.style.display = "block";
}

// 
function createUserCloseAccountView(userId, userCloseAccountsView){
	accountView = document.createElement("div")
	accountView.setAttribute("userId", userId)
	accountView.setAttribute("id", "accountCloseView_"+userId)
	accountView.classList.add("accountView")
	createUserCloseAccountTable(userId, accountView)
	userCloseAccountsView.appendChild(accountView)
}

// 
function createUserCloseAccountTable(userId, parentElement){
	var accountViewTable = document.createElement("table")
	accountViewTable.setAttribute("userId", userId)
	accountViewTable.setAttribute("id", userId+"accountCloseTable")
	accountViewTable.classList.add("accountViewTable")
	addUserAccountCloseViewTableHeader(accountViewTable)
	parentElement.appendChild(accountViewTable)	
}

// 
function addUserAccountCloseViewTableHeader(parentTable){
	headerRow = document.createElement("tr")
	for(val of closePosHeaders){
		currHeader = document.createElement("th")
		currHeader.classList.add("accountViewTableHeader")
		currHeader.innerText = val
		currHeader.setAttribute("name", val)
		headerRow.appendChild(currHeader)
	}
	parentTable.appendChild(headerRow)
}

// 
function createAndInsertContainerCloseRow(containerID, containerAccounts, containerOwnerTable){
	let containerTypeID = containers[containerID]['containerTypeID']
	let containerTableRow = document.createElement("tr")
	containerTableRow.setAttribute("id", "containerCloseReturns_"+containerID);
	containerTableRow.setAttribute("containerId", containerID);
	containerTableRow.setAttribute("containerTypeId", containerTypeID);
	containerTableRow.classList.add("accountCloseViewTableRow")
	containerTypeFunctions[containerTypeID].setContainerClosePosRow(containerID, containerTableRow)
	let containerTypeRows = containerOwnerTable.querySelectorAll("[containerTypeId='"+containerTypeID+"']")
	if(containerTypeRows.length==0){
		addCloseTableContainerTypeRow(containerTypeID, containerOwnerTable)
		containerTypeRows = containerOwnerTable.querySelectorAll("[containerTypeId='"+containerTypeID+"']")
	}
	let lastContainerTypeRow = containerTypeRows[containerTypeRows.length-1]
	containerOwnerTable.insertBefore(containerTableRow, lastContainerTypeRow.nextSibling);
}

function createAccountViewNavigationButton(userId, parentElement){
	currViewButton = document.createElement("BUTTON")
	currViewButton.setAttribute("userId", userId)
	currViewButton.setAttribute("id", userId+"viewToggleButton")
	currViewButton.innerText = containerOwners[userId]['firstName']+" "+containerOwners[userId]['lastName']
	currViewButton.classList.add("btn", "btn-default", "btn-sm")
	currViewButton.addEventListener("click", function(){
		viewId = (openClosePosVisDisplayOpen)?"accountView_":"accountCloseView_"
		viewId = viewId + this.getAttribute("userId")
		accountViews = document.getElementsByClassName("accountView")
		for(accountView of accountViews)accountView.style.display = "none";
		targetView = document.getElementById(viewId)
		targetView.style.display = "block"
		displayAccountsSelUserId = userId

	})
	parentElement.appendChild(currViewButton)
}

function createUserAccountView(userId, userViewsContainer){
	accountView = document.createElement("div")
	accountView.setAttribute("userId", userId)
	accountView.setAttribute("id", "accountView_"+userId)
	accountView.classList.add("accountView")
	createUserAccountViewTable(userId, accountView)
	userViewsContainer.appendChild(accountView)
}

function createUserAccountViewTable(userId, parentElement){
	var accountViewTable = document.createElement("table")
	var accountViewTableBody = document.createElement("tbody")
	accountViewTable.appendChild(accountViewTableBody)
	accountViewTable.setAttribute("userId", userId)
	accountViewTable.setAttribute("id", userId+"accountViewTable")
	accountViewTable.classList.add("accountViewTable")
	addUserAccountViewTableHeader(accountViewTable)
	parentElement.appendChild(accountViewTable)
}

function addUserAccountViewTableHeader(parentTable){
	headerRow = document.createElement("tr")
	for(val of openPosHeaders){
		currHeader = document.createElement("th")
		currHeader.classList.add("accountViewTableHeader")
		if(val.indexOf("(")>0){
			currHeader.classList.add("histUnbookedProfitCell");
			if(accountsHideHistOpenProfit)currHeader.style.display = "none"
		}
		currHeader.innerText = val
		currHeader.setAttribute("name", val)
		if(val=="Unbooked Profit/Loss"){
			let toggleDiv = document.createElement("a")
			toggleDiv.classList.add("toggleHistUnbookedVisibility")
			toggleDiv.innerText = "<"
			currHeader.appendChild(toggleDiv)
			toggleDiv.addEventListener("click", function(e){e.preventDefault(); hideHistUnbookedColumns()})
		}
		headerRow.appendChild(currHeader)
	}
	parentTable.firstChild.appendChild(headerRow)
}

function createAndInsertContainerRow(containerID, containerAccounts, containerOwnerTable){
	let containerTypeID = containers[containerID]['containerTypeID']
	let containerTableRow = document.createElement("tr")
	containerTableRow.setAttribute("id", "containerReturns_"+containerID);
	containerTableRow.setAttribute("containerId", containerID);
	containerTableRow.setAttribute("containerTypeId", containerTypeID);
	containerTableRow.classList.add("accountViewTableRow")
	containerTypeFunctions[containerTypeID].setContainerOpenPosRow(containerID, containerTableRow)
	let containerTypeRows = containerOwnerTable.querySelectorAll("[containerTypeId='"+containerTypeID+"']")
	if(containerTypeRows.length==0){
		addContainerTypeRow(containerTypeID, containerOwnerTable)
		containerTypeRows = containerOwnerTable.querySelectorAll("[containerTypeId='"+containerTypeID+"']")
	}
	let lastContainerTypeRow = containerTypeRows[containerTypeRows.length-1]
	containerOwnerTable.firstChild.insertBefore(containerTableRow, lastContainerTypeRow.nextSibling);
}

function addContainerTypeRow(containerTypeId, parentTable){
	var containerTypeRow = document.createElement("tr");
	var containerTypeCell = document.createElement("td");
	containerTypeCell.classList.add("containerTypeRow");
	containerTypeCell.setAttribute("containerTypeId", containerTypeId);
	containerTypeCell.setAttribute("colspan", openPosHeaders.length)
	containerTypeCell.innerText = containerTypes[containerTypeId]['containerTypeName']
	containerTypeRow.appendChild(containerTypeCell)
	parentTable.firstChild.appendChild(containerTypeRow)
}

function addCloseTableContainerTypeRow(containerTypeId, parentTable){
	var containerTypeRow = document.createElement("tr");
	var containerTypeCell = document.createElement("td");
	containerTypeCell.classList.add("containerTypeRow");
	containerTypeCell.setAttribute("containerTypeId", containerTypeId);
	containerTypeCell.setAttribute("colspan", openPosHeaders.length)
	containerTypeCell.innerText = containerTypes[containerTypeId]['containerTypeName']
	containerTypeRow.appendChild(containerTypeCell)
	parentTable.appendChild(containerTypeRow)
}

function setContainerRowNameCell(containerId, containerName){
	var de_name_cell = document.createElement("td")
	de_name_cell.classList.add("accountViewTableCell")
	var de_name_link = document.createElement("a")
	de_name_link.innerText = containerName
	de_name_link.setAttribute("href", "/containerPage?containerId="+containerId)
	de_name_link.setAttribute("containerid", containerId)
	de_name_link.addEventListener("click", function(e){
		e.preventDefault()
		updateUrl(this.getAttribute("href"));
		setViewOnUrlChange()
		var event = new CustomEvent('containerPageRequested');
		document.dispatchEvent(event);
	})
	de_name_cell.appendChild(de_name_link)
	return(de_name_cell)
}

function addSelectContainerRowCell(){
	let currRowSelectCell = document.createElement("td")
	let currRowCheckBox = document.createElement('input')
	currRowCheckBox.setAttribute("type", "checkbox")
	currRowCheckBox.classList.add("selectContainerRow")
	currRowSelectCell.classList.add("accountViewTableCell")
	currRowSelectCell.appendChild(currRowCheckBox)
	return currRowSelectCell
}

function setContainerGroupCell(containerId){
	let containerGroupSelectCell = document.createElement("td");
	containerGroupSelectCell.classList.add("accountViewTableCell")
	let containerGroupSelectList = document.createElement("select");
	containerGroupSelectList.setAttribute("name", "containerGroupSelect")
	let containerGroupsSelectFields = [{'inputField': 'groupID', 'outputField': 'value'}]
	createSelectOptionsList(containerGroupSelectList, groups, containerGroupsSelectFields, 'groupName', true, 'None', false, containers[containerId]['groupID']==null)
	if(containers[containerId]['groupID']!=null)containerGroupSelectList.value = containers[containerId]['groupID']
	containerGroupSelectList.addEventListener("change", function(e){
		let updateData = {
			"containerID": containerId,
			"groupID": this.value
		}
		let currGroupSelectList = this
		socket.emit('updateSingleContainerGroup', updateData, function(error, data){
			if(error || data.error){
				console.log(error)
				alert("Error updating container group for " + containers[containerId]['containerName'])
				currGroupSelectList.value = containers[containerId]['groupID']==null ? '' : containers[containerId]['groupID']
				return
			}
			dataVersionId = data.dataVersionId
			containers[containerId]['groupID'] = updateData['groupID']==""? null : updateData['groupID']
		})
	})
	containerGroupSelectCell.appendChild(containerGroupSelectList)
	return containerGroupSelectCell
}

function setContainerAddCloseTransactionButton(){
	let transactionButtonCell = document.createElement("td")
	transactionButtonCell.classList.add("accountViewTableCell")
	let transactionButton = document.createElement("button")
	transactionButton.classList.add("btn", "btn-default", "btn-sm")
	transactionButton.innerText = "Add Close Transaction"
	transactionButton.addEventListener("click", function(e){
		let currContainerId = this.parentElement.parentElement.getAttribute("containerId");
		accountsRowCloseTransactionSelectedContainerID = currContainerId
		displayContainerTransactionForm(currContainerId);
	})
	transactionButtonCell.appendChild(transactionButton)
	return transactionButtonCell;
}

function hideHistUnbookedColumns(){
	let histUnbookedProfitCell = document.querySelectorAll(".histUnbookedProfitCell")
	let toggleHistVisCells = document.querySelectorAll(".toggleHistUnbookedVisibility")
	accountsHideHistOpenProfit = !accountsHideHistOpenProfit
	if(getComputedStyle(histUnbookedProfitCell[0], null).display!="none"){
		histUnbookedProfitCell.forEach(function(cell){cell.style.display = "none"})
		toggleHistVisCells.forEach(function(cell){cell.innerText = ">"})
		return;
	}
	histUnbookedProfitCell.forEach(function(cell){cell.style.display = "table-cell"})
	toggleHistVisCells.forEach(function(cell){cell.innerText = "<"})
}

function updatenewProfitBookedDateAccountsAndDisplay(updatedAccounts, newBookedProfitStartDate){
	console.log(updatedAccounts)
	for(let containerID in updatedAccounts){
		containers[containerID]['bookedProfitStartDate'] = newBookedProfitStartDate
	}
	let updatedAccountsEvent = new CustomEvent('updatedAccounts', {detail: updatedAccounts});
	document.dispatchEvent(dispatchEvent);
	// updateContainerAccountsAndDisplay([], updatedAccounts)
}

document.addEventListener("addedContainers", function(e){
	addedContainers = e.detail
	for(let containerID in addedContainers){
		containers[containerID] = addedContainers[containerID]
		instrumentContainerOwnershipTree.addContainerToTree(addedContainers[containerID])
	}
})

document.addEventListener("updatedAccounts", function(e){
	let updatedAccounts = e.detail
	setReturnDates(updatedAccounts)
	for(let containerID in updatedAccounts)accounts[containerID] = updatedAccounts[containerID]
	for(let containerID in updatedAccounts){
		if(containers[containerID]['parentContainerID']!=null)continue;
		updateContainerOpenPosRow(containerID)
		updateContainerClosePosRow(containerID)
	}
})

// Pending Deletion
// function updateContainerAccountsAndDisplay(addedContainers, updatedAccounts){
// 	for(let containerID in addedContainers){
// 		containers[containerID] = addedContainers[containerID]
// 		instrumentContainerOwnershipTree.addContainerToTree(addedContainers[containerID])
// 	}
// 	for(let containerID in updatedAccounts)accounts[containerID] = updatedAccounts[containerID]
// 	for(let containerID in updatedAccounts){
// 		if(containers[containerID]['parentContainerID']!=null)continue;
// 		updateContainerOpenPosRow(containerID)
// 		updateContainerClosePosRow(containerID)
// 	}
// }

function updateContainerOpenPosRow(containerID){
	let containerAccounts = accounts[containerID]
	let containerTypeID = containers[containerID]['containerTypeID']
	let containerOwner = containers[containerID]['ownerProfileID']
	let containerOwnerAccountView = document.querySelector("#accountView_"+containerOwner);
	if(accounts[containerID]['open_position']['open_volume']==0){
		if(containerOwnerAccountView==null)return;
		let containerOwnerAccountsTable = containerOwnerAccountView.querySelector(".accountViewTable")
		let containerRow = containerOwnerAccountsTable.querySelector("#containerReturns_"+containerID)
		if(containerRow==null)return;
		containerRow.parentElement.removeChild(containerRow)
		containerTypeRows = containerOwnerAccountsTable.querySelectorAll("[containerTypeId='"+containerTypeID+"']")
		if(containerTypeRows.length==1)containerTypeRows[0].parentElement.removeChild(containerTypeRows[0])
		return;
	}
	if(containerOwnerAccountView==null){
		userViewNavigationButtons = document.getElementById("userAccountsToggleView")
		userViewsContainer = document.getElementById("userAccountOpenPosViews")
		createUserAccountView(containerOwner, userViewsContainer)
		createAccountViewNavigationButton(containerOwner, userViewNavigationButtons)
		containerOwnerAccountView = document.querySelector("#accountView_"+containerOwner);
	}
	let containerOwnerAccountsTable = containerOwnerAccountView.querySelector(".accountViewTable")
	let containerRow = containerOwnerAccountsTable.querySelector("#containerReturns_"+containerID)
	if(containerRow==null)
		return createAndInsertContainerRow(containerID, containerAccounts, containerOwnerAccountsTable);
	deleteAllChildren(containerRow);
	containerTypeFunctions[containerTypeID].setContainerOpenPosRow(containerID, containerRow)
}

function updateContainerClosePosRow(containerID){
	let containerAccounts = accounts[containerID]
	let containerTypeID = containers[containerID]['containerTypeID']
	let containerOwner = containers[containerID]['ownerProfileID']
	let containerOwnerAccountView = document.querySelector("#accountCloseView_"+containerOwner);
	if(accounts[containerID]['historical_positions'][max_date]['closed_volume']==0){
		if(containerOwnerAccountView==null)return;
		let containerOwnerAccountsTable = containerOwnerAccountView.querySelector(".accountViewTable")
		let containerRow = containerOwnerAccountsTable.querySelector("#containerReturns_"+containerID)
		if(containerRow==null)return;
		containerRow.parentElement.removeChild(containerRow)
		containerTypeRows = containerOwnerAccountsTable.querySelectorAll("[containerTypeId='"+containerTypeID+"']")
		if(containerTypeRows.length==1)containerTypeRows[0].parentElement.removeChild(containerTypeRows[0])
		return;
	}
	if(containerOwnerAccountView==null){
		userViewNavigationButtons = document.getElementById("userAccountsToggleView")
		userViewsContainer = document.getElementById("userAccountClosePosViews")
		createUserCloseAccountView(containerOwner, userViewsContainer)
		createAccountViewNavigationButton(containerOwner, userViewNavigationButtons)
		containerOwnerAccountView = document.querySelector("#accountView_"+containerOwner);
	}
	let containerOwnerAccountsTable = containerOwnerAccountView.querySelector(".accountViewTable")
	let containerRow = containerOwnerAccountsTable.querySelector("#containerCloseReturns_"+containerID)
	if(containerRow==null){
		createAndInsertContainerCloseRow(containerID, containerAccounts, containerOwnerAccountsTable)
		return;
	}
	deleteAllChildren(containerRow);
	containerTypeFunctions[containerTypeID].setContainerClosePosRow(containerID, containerRow)
}

function updateAllContainersLivePricesUnbookedValuesAndDisplay(){
	let containerRows = document.querySelectorAll(".accountViewTableRow")
	for(containerID in containers){
		containerTypeFunctions[containers[containerID]['containerTypeID']].updateContainerCurrentUnbookedValue(containerID)
	}
	containerRows.forEach(function(containerRow){
		let containerID = containerRow.getAttribute("containerid")
		let containerTypeId = containers[containerID]['containerTypeID']
		containerTypeFunctions[containerTypeId].updateAccoutsTableRowOnPriceChange(containerRow)
	})
}

function updateContainerLivePricesUnbookedValuesAndDisplay(containerRow){
	let containerID = containerRow.getAttribute("containerid")
	let containerTypeId = containers[containerID]['containerTypeID']
	let containerReturns = accounts[containerID]
	containerTypeFunctions[containerTypeId].updateContainerCurrentUnbookedValue(containerID)
	containerTypeFunctions[containerTypeId].updateAccoutsTableRowOnPriceChange(containerRow)
}