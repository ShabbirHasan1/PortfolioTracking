var transactionStrategyObj
var accountsRowCloseTransactionStrategyObj

document.addEventListener("strategyAdded", function(e){
	let newStrategy = e.detail
	strategies[newStrategy['strategyID']] = newStrategy
	newStrategy['containers'] = {}
	newStrategy['displayClosePos'] = false
	newStrategy['totals']= getInitStrategyTotalsObj()
})

class transactionStrategyAssignment{
	constructor(strategyAssignContainer, strategySelectID){
		this.strategyAssignmentObj = {}
		this.underlyingInstrument = null
		this.transactionOwner = null
		this.transactionInstrument = null
		this.transactionVolume = 0
		this.transactionPortfolio = null
		this.assignedVolume = 0
		this.strategyAssignContainer = strategyAssignContainer
		this.strategySelect = null
		this.strategyAssignVolume = null
		this.strategyAssignTable = null
		this.pendingAssignVolDiv = null
		this.transactionOpenClose = null
		this.transactionBuySell = null
		this.lotSize = 1
		this.unconfirmedStrategyAssignVolTree = new this.unconfirmedStrategyAssignVolTreeClass()
		this.initStrategyAssignContainer(strategyAssignContainer, strategySelectID)
	}

	setTransactionInstrument(instrumentInfo){
		if(!instrumentInfo){
			this.reset()
			this.transactionInstrument = null
			this.underlyingInstrument = null
			this.lotSize = 1
			this.setAndDisplayAssignStrategiesContainer()
			return
		};
		this.reset()
		this.transactionInstrument = instrumentInfo.id
		this.underlyingInstrument = (instrumentInfo.isUnderlyingInstrument)?instrumentInfo.id : instrumentInfo.underlyingInstrument
		this.lotSize = instrumentInfo['lot_size']
		this.setAndDisplayAssignStrategiesContainer()
	}

	setTransactionOwner(transactionOwner){
		this.reset()
		this.transactionOwner = transactionOwner
		this.setAndDisplayAssignStrategiesContainer()
	}

	setTransactionVolume(transactionVolume){
		this.transactionVolume = transactionVolume
		this.updatePendingAssignVolValDisplay()
	}

	setTransactionPortfolio(transactionPortfolio){
		this.reset()
		this.transactionPortfolio = transactionPortfolio
		this.setAndDisplayAssignStrategiesContainer()
	}

	setTransactionOpenClose(transactionOpenClose){
		this.reset()
		this.transactionOpenClose = transactionOpenClose
		this.setAndDisplayAssignStrategiesContainer()
	}

	setTransactionBuySell(transactionBuySell){
		this.reset()
		this.transactionBuySell = transactionBuySell
		this.setAndDisplayAssignStrategiesContainer()
	}

	reset(){
		this.strategyAssignmentObj = {}
		this.assignedVolume = 0
		this.strategyAssignContainer.style.display="none"
		this.clearStrategyAssignRows()
		this.updatePendingAssignVolValDisplay()
	}

	updatePendingAssignVolValDisplay(){
		this.pendingAssignVolDiv.innerText = `Remaining Volume ${this.transactionVolume - this.assignedVolume}`
	}

	setAndDisplayAssignStrategiesContainer(){
		if(!this.underlyingInstrument || this.transactionPortfolio)return;
		this.strategyAssignContainer.style.display="block"
		this.setAssignableStrategiesList()
	}

	addStrategyVolume(strategyID, volume){
		if(this.assignedVolume+volume>this.transactionVolume)return alert("Insufficient units remaining for this strategy assignment");
		if(volume%this.lotSize!=0)return alert("Strategy Assignment must be in multiples of lot size")
		if(!this.validateStrategyVolume(strategyID, volume))return alert("Insufficient Instrument Open volume in strategy to make this close assignemnt")
		this.strategyAssignmentObj[strategyID] = volume
		this.assignedVolume += volume
		this.createStrategyAssignRow(strategyID, volume)
		this.strategySelect.childNodes[strategyID].disabled = true
		$('#transaction_strategyAssignSelect').val(null).trigger('change');
		this.updatePendingAssignVolValDisplay()
		this.strategyAssignVolume.value = ""
	}

	validateStrategyVolume(strategyID, volume){
		if(this.transactionOpenClose=="open")return true;
		let transactionContainerID = instrumentContainerOwnershipTree.getTransactionContainerID(this.transactionOwner, null, this.transactionInstrument, this.transactionBuySell)
		let strategyContainer = strategies[strategyID]['containers'][transactionContainerID]
		let strategyContainerConfirmedOpenVol = (strategyContainer)?strategyContainer['openVolume']:0
		let strategyContainerUnconfirmedOpenVol = this.unconfirmedStrategyAssignVolTree.getOwnerInstrumentStrategyUnconfirmedVol(this.transactionOwner, this.transactionInstrument, strategyID, this.transactionBuySell)
		return (strategyContainerConfirmedOpenVol + strategyContainerUnconfirmedOpenVol - volume)>=0
	
	}

	createStrategyAssignRow(strategyID, volume){
		let strategyAssignTable = this.strategyAssignTable
		let strategyAssignRow = document.createElement("tr")
		strategyAssignRow.setAttribute('strategyID', strategyID)
		let strategyNameCell = document.createElement("td")
		let volumeCell = document.createElement("td")
		let deleteRowEntryCell = document.createElement("div")

		strategyNameCell.innerText = strategies[strategyID]['strategyName']
		volumeCell.innerText = volume
		
		this.setDeleteRowEntryCell(deleteRowEntryCell)
		strategyAssignRow.appendChild(strategyNameCell)
		strategyAssignRow.appendChild(volumeCell)
		strategyAssignRow.appendChild(deleteRowEntryCell)
		strategyAssignTable.appendChild(strategyAssignRow)
	}

	clearStrategyAssignRows(){
		let strategyAssignTable = this.strategyAssignTable
		while(strategyAssignTable.childNodes.length>1)strategyAssignTable.removeChild(strategyAssignTable.lastChild);
	}

	setDeleteRowEntryCell(deleteRowEntryCell){
		let deleteRowButton = document.createElement("button")
		deleteRowButton.innerText = "-"
		let parentObj = this
		deleteRowButton.addEventListener("click", function(){
			let parentRow = this.parentElement.parentElement
			let strategyID = parentRow.getAttribute("strategyID")
			
			parentObj.assignedVolume = parentObj.assignedVolume - parentObj.strategyAssignmentObj[strategyID]
			delete parentObj.strategyAssignmentObj[strategyID]

			parentRow.parentElement.removeChild(parentRow)
			parentObj.strategySelect.childNodes[strategyID].disabled = false
			parentObj.updatePendingAssignVolValDisplay()
		})
		deleteRowEntryCell.appendChild(deleteRowButton)
	}

	deleteStrategyVolume(strategyID){
		this.assignedVolume -= this.strategyAssignmentObj[strategyID]
		delete this.strategyAssignmentObj[strategyID]
	}

	isValidStrategyAssignment(){
		return ((this.transactionPortfolio) || (!this.underlyingInstrument) || (this.assignedVolume == this.transactionVolume))
	}

	setAssignableStrategiesList(){
		let strategyList = this.strategySelect.children
		for(let i=0; i<strategyList.length; i++){
			strategyList[i].disabled = true
			let strategyID = strategyList[i].getAttribute("value")
			if(strategyID=="")continue;
			if(this.isSelectableStrategy(strategies[strategyID]))strategyList[i].disabled = false
		}
		$('#transaction_strategyAssignSelect').val(null).trigger('change');
	}

	isSelectableStrategy(strategy){
		return strategy['strategyOwner']==this.transactionOwner && (strategy['strategyUnderlyingInstrument']==null || strategy['strategyUnderlyingInstrument']==this.underlyingInstrument)
	}

	getStrategyAssignMap(){
		return this.strategyAssignmentObj
	}

	addUnconfirmedTransactionAssignemntToTree(){
		if(!(!this.underlyingInstrument || this.transactionPortfolio))this.unconfirmedStrategyAssignVolTree.addUnconfirmedTransactionAssignmentToTree(this.transactionOwner, this.transactionInstrument, this.transactionBuySell, this.transactionOpenClose, this.strategyAssignmentObj);
		this.reset()
		this.setAndDisplayAssignStrategiesContainer()
	}

	removeUnconfirmedTransactionAssignmentFromTree(containerOwner, instrumentID, buySell, openClose, assignMap){
		this.unconfirmedStrategyAssignVolTree.removeUnconfirmedTransactionAssignmentFromTree(containerOwner, instrumentID, buySell, openClose, assignMap)
	}

	resetUnconfirmedStrategyAssignVolTree(){
		this.unconfirmedStrategyAssignVolTree = new this.unconfirmedStrategyAssignVolTreeClass()
	}
}

transactionStrategyAssignment.prototype.initStrategyAssignContainer = function(strategyAssignContainer, strategySelectID){
	let contentsContainer = document.createElement("div")
	contentsContainer.classList.add("col-sm-12")

	let strategyInputDiv = document.createElement("div")
	let strategyAssignTableDiv = document.createElement("div")
	let pendingAssignVolDiv = document.createElement("div")

	this.initStrategyInputDiv(strategyInputDiv, strategySelectID)
	this.initStrategyAssignTableDiv(strategyAssignTableDiv)
	this.initPendingAssignVol(pendingAssignVolDiv)

	contentsContainer.appendChild(strategyInputDiv)
	contentsContainer.appendChild(strategyAssignTableDiv)
	contentsContainer.appendChild(pendingAssignVolDiv)

	// strategyAssignContainer.appendChild(paddingLeft)
	strategyAssignContainer.appendChild(contentsContainer)
	// strategyAssignContainer.appendChild(paddingRight)

	return transactionStrategyAssignment
}

transactionStrategyAssignment.prototype.initStrategyInputDiv = function(strategyInputDiv, strategySelectID){
	strategySelectContainer = document.createElement("div")
	strategySelectContainer.classList.add("col-sm-8")

	let strategySelect = document.createElement("select")
	strategySelect.setAttribute("style", "width: 100%")
	strategySelect.setAttribute("id", strategySelectID)
	let strategySelectFields = [{'inputField': 'strategyID', 'outputField': 'value'}]
	createSelectOptionsList(strategySelect, strategies, strategySelectFields, 'strategyName', false, 'Select Strategy', true, false)
	$(document).ready(function(){
		$("#"+strategySelectID).select2({width: 'resolve', placeholder: "Select Strategy"})
		$('#'+strategySelectID).val(null).trigger('change');
	});
	strategySelectContainer.appendChild(strategySelect)

	let setVolDiv = document.createElement("input")
	setVolDiv.setAttribute("id", "assignVolume")
	setVolDiv.setAttribute("type", "number")
	setVolDiv.classList.add("col-sm-3")
	
	let sumbitBtn = document.createElement("button")
	sumbitBtn.innerText = "+"
	sumbitBtn.classList.add("col-sm-1")
	let parentObj = this
	sumbitBtn.addEventListener("click", function(e){
		let strategyID = $('#'+strategySelectID).select2('data');
		if(strategyID.length!=1)return alert("A strategy must be selected for assignment");
		strategyID = strategyID[0].id
		let volume = parseInt(setVolDiv.value)
		parentObj.addStrategyVolume(strategyID, volume)
	})
	
	this.strategySelect = strategySelect
	this.strategyAssignVolume = setVolDiv
	document.addEventListener("strategyAdded", function(e){
		let newStrategy = e.detail
		var newStrategyOption = document.createElement("option")
		newStrategyOption.setAttribute("value", newStrategy['strategyID'])
		newStrategyOption.innerText = newStrategy['strategyName']
		$(`#${strategySelectID}`).append(newStrategyOption)
		if(!parentObj.isSelectableStrategy(newStrategy))newStrategyOption.disabled = true
	})

	strategyInputDiv.appendChild(strategySelectContainer)
	strategyInputDiv.appendChild(setVolDiv)
	strategyInputDiv.appendChild(sumbitBtn)
}

transactionStrategyAssignment.prototype.initStrategyAssignTableDiv = function(strategyAssignTableDiv){
	let strategyAssignTable = document.createElement("table")
	strategyAssignTable.style.width = "100%"
	// stategyAssignTable.classList.add
	let tableHeaderRow = document.createElement("tr")
	let tableHeaders = ['Strategy', 'Volume', 'Action']
	tableHeaders.forEach(function(header){
		let currHeader = document.createElement("th")
		currHeader.innerText = header
		tableHeaderRow.appendChild(currHeader)
	})
	strategyAssignTable.appendChild(tableHeaderRow)
	strategyAssignTableDiv.appendChild(strategyAssignTable)
	this.strategyAssignTable = strategyAssignTable
}

transactionStrategyAssignment.prototype.initPendingAssignVol = function(pendingAssignVolDiv){
	pendingAssignVolDiv.innerText = `Remaining Volume: ${(this.transactionVolume - this.assignedVolume)}`
	this.pendingAssignVolDiv = pendingAssignVolDiv
}

transactionStrategyAssignment.prototype.unconfirmedStrategyAssignVolTreeClass = class{
	constructor(){
		this.init()
	}

	addUserUnconfirmedPortfolioToTree(containerOwner){
		this.unconfirmedStrategyAssignments[containerOwner] = {"Buy":{}, "Sell":{}}
	}

	addUnconfirmedTransactionAssignmentToTree(containerOwner, instrumentID, buySell, openClose, assignMap){
		let unconfirmedAssignContainer = this.unconfirmedStrategyAssignments[containerOwner][buySell]
		let openCloseMult = (openClose=="open")?1:-1
		if(!unconfirmedAssignContainer[instrumentID])unconfirmedAssignContainer[instrumentID]={};
		unconfirmedAssignContainer = unconfirmedAssignContainer[instrumentID]
		for(strategyID in assignMap)
			unconfirmedAssignContainer[strategyID] = (unconfirmedAssignContainer[strategyID]?unconfirmedAssignContainer[strategyID]:0) + (assignMap[strategyID])*openCloseMult
	}

	removeUnconfirmedTransactionAssignmentFromTree(containerOwner, instrumentID, buySell, openClose, assignMap){
		let unconfirmedAssignContainer = this.unconfirmedStrategyAssignments[containerOwner][buySell]
		let openCloseMult = (openClose=="open")?-1:1
		if(!unconfirmedAssignContainer[instrumentID])unconfirmedAssignContainer[instrumentID]={};
		unconfirmedAssignContainer = unconfirmedAssignContainer[instrumentID]
		for(strategyID in assignMap)
			unconfirmedAssignContainer[strategyID] = (unconfirmedAssignContainer[strategyID]?unconfirmedAssignContainer[strategyID]:0) + (assignMap[strategyID])*openCloseMult
	}

	getOwnerInstrumentStrategyUnconfirmedVol(containerOwner, instrumentID, strategyID, buySell){
		let unconfirmedStrategyInstrumentObj = this.unconfirmedStrategyAssignments[containerOwner][buySell][instrumentID]
		return (unconfirmedStrategyInstrumentObj)?unconfirmedStrategyInstrumentObj[strategyID]:0
	}
}

unconfirmedStrategyAssignVolTreeClass = transactionStrategyAssignment.prototype.unconfirmedStrategyAssignVolTreeClass

unconfirmedStrategyAssignVolTreeClass.prototype.init = function(){
	this.unconfirmedStrategyAssignments = {}
	for (let containerOwner in containerOwners)this.addUserUnconfirmedPortfolioToTree(containerOwner);
}

document.addEventListener("dataSet", function(e){
	initCreateNewStrategyForm()
	document.querySelector("#createStrategyBtn").addEventListener("click", function(e){
		document.querySelector("#createStrategyFormModal").style.display = "flex"
	})	
}, {once: true})

function initCreateNewStrategyForm(){
	let strategyFormContainer = document.querySelector("#createStrategyFormFields")
	
	let strategyOwnerField = document.createElement("div") 
	strategyOwnerField.classList.add("formField")
	strategyOwnerField.setAttribute("id", "strategyForm_setStrategyOwnerField")
	let strategyOwnerSelect = setCreateStrategyFormOwnerSelect()
	strategyOwnerField.appendChild(strategyOwnerSelect)

	let strategyNameField = document.createElement("div")
	strategyNameField.classList.add("formField")
	strategyNameField.setAttribute("id", "strategyForm_setStrategyName")
	let strategySelectInput = document.createElement("input")
	strategySelectInput.style.width = "50%"
	strategySelectInput.setAttribute("id", "createStrategyFormStrategyName")
	strategySelectInput.setAttribute("placeholder", "Strategy Name")
	strategyNameField.appendChild(strategySelectInput)

	let strategyUnderlyingInstrumentField = document.createElement("div")
	strategyUnderlyingInstrumentField.classList.add("formField")
	strategyUnderlyingInstrumentField.setAttribute("id", "strategyForm_setStrategyUnderlyingInstrument") 
	let strategyUnderlyingInstrumentSelect = setCreateStrategyUnderlyingInstrumentSelect()
	strategyUnderlyingInstrumentField.appendChild(strategyUnderlyingInstrumentSelect)

	let strategyFormButton = setCreateStrategyFormSubmitBtn()

	strategyFormContainer.appendChild(strategyOwnerField)
	strategyFormContainer.appendChild(strategyNameField)
	strategyFormContainer.appendChild(strategyUnderlyingInstrumentField)
	strategyFormContainer.appendChild(strategyFormButton)
}

function setCreateStrategyFormOwnerSelect(){
	let strategyOwnerSelect = document.createElement("select")
	strategyOwnerSelect.style.width = "50%"
	strategyOwnerSelect.setAttribute("id", "createStrategyFormOwnerSelect")
	let strategyOwnerSelectFields = [{'inputField': 'googleProfileID', 'outputField': 'value'}]
	createSelectOptionsList(strategyOwnerSelect, containerOwners, strategyOwnerSelectFields, 'fullName', true, "Select Strategy Owner", true, true)
	$(document).ready(function(){
		$("#createStrategyFormOwnerSelect").select2({'placeholder': "Select Strategy Owner", "width": "resolve"})
	})
	return strategyOwnerSelect
}

function setCreateStrategyUnderlyingInstrumentSelect(){
	let underlyingInstrumentSelect = document.createElement("select")
	underlyingInstrumentSelect.style.width = "50%"
	underlyingInstrumentSelect.setAttribute("id", "createStrategyFormUnderlyingInstrumentSelect")
	let underlyingInstrumentSelectFields = [{'inputField': 'instrumentID', 'outputField': 'value'}]
	createSelectOptionsList(underlyingInstrumentSelect, underlyingInstruments, underlyingInstrumentSelectFields, 'tradingsymbol', true, "Select Strategy Instrument", true, true)

	$(document).ready(function(){
		$("#createStrategyFormUnderlyingInstrumentSelect").select2({'placeholder': "Select Underlying Instrument", "width": "resolve"})
	})
	return underlyingInstrumentSelect
}

function setCreateStrategyFormSubmitBtn(){
	let submitBtn = document.createElement("button")
	submitBtn.innerText = "Submit"
	submitBtn.classList.add("btn", "btn-default", "btn-sm")
	submitBtn.addEventListener("click", function(){
		let strategyFormContainer = document.querySelector("#createStrategyFormFields")
		let strategyOwner = strategyFormContainer.querySelector("#createStrategyFormOwnerSelect").value
		let strategyName = strategyFormContainer.querySelector("#createStrategyFormStrategyName").value
		let strategyUnderlyingInstrument = strategyFormContainer.querySelector("#createStrategyFormUnderlyingInstrumentSelect").value
		let formErrors = validateCreateStrategyForm(strategyOwner, strategyName, strategyUnderlyingInstrument)
		if(formErrors)return displayRequestResult({"error": formErrors}, strategyFormContainer);
		sendCreateStrategyRequest(strategyOwner, strategyName, strategyUnderlyingInstrument, function(error){
			if(error)return displayRequestResult({"error": error}, strategyFormContainer);
			$('#createStrategyFormFields #createStrategyFormUnderlyingInstrumentSelect').val(null).trigger('change')
			displayRequestResult({"message": "Strategy Created"}, strategyFormContainer)
		})
	})
	return submitBtn
}

function validateCreateStrategyForm(strategyOwner, strategyName, strategyUnderlyingInstrument){

	if(strategyOwner=="" || strategyName==""){
		return "Strategy Owner and Name fields must be entered"
	}
	let strategyNameError = createStrategyNameError(strategyOwner, strategyName);
	if(strategyNameError)return strategyNameError;
	return null
}

function createStrategyNameError(strategyOwner, strategyName){
	if(strategyName.length<3)return "Strategy Name must be atleast 3 characters long";
	for(strategyID in strategies)
		if((strategies[strategyID]['strategyOwner']==strategyOwner) && (strategies[strategyID]['strategyName'].toUpperCase() === strategyName.toUpperCase()))
			return "Strategy Name already taken";
	return null
}

function sendCreateStrategyRequest(strategyOwner, strategyName, strategyUnderlyingInstrument, callback){
	let reqData = {
		strategyOwner: strategyOwner,
		strategyName: strategyName,
		strategyUnderlyingInstrument: (strategyUnderlyingInstrument=="")?null:strategyUnderlyingInstrument
	}
	socket.emit("createStrategy", reqData, function(error, data){
		if(error || data.error){
			console.log(error || data.error)
			return callback(error || data.error);
		}
		dataVersionId = data.dataVersionId
		let addedStrategy = data.addedStrategy
		let event = new CustomEvent('strategyAdded', {detail: addedStrategy});
		document.dispatchEvent(event);
		return callback(null)
	})
}

function getInitStrategyTotalsObj(){
	return {

		openTotals:{
			"premiumEarned": 0,
			"profit": 0,
			'grossValue': 0,
			'premiumOnTheTable': 0
		},
		closeTotals:{
			"premiumEarned": 0,
			"profit": 0,
			'grossValue': 0,
			'premiumOnTheTable': 0
		}
	}
}