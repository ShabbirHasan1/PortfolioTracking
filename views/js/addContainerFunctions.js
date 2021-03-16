var instrumentContainerOwnershipTree = null

document.getElementById('addContainerAjax').addEventListener("click", function(){
	displayContainerForm()
});

document.addEventListener("dataSet", function(e){
	let containerOwnerSelect = document.getElementById("container_ownerProfileID")
	let containerOwnerSelectFields = [{'inputField': 'googleProfileID', 'outputField': 'value'}]
	createSelectOptionsList(containerOwnerSelect, containerOwners, containerOwnerSelectFields, 'fullName', true, "Select Portfolio Owner", true, true)
	let containerTypeSelect = document.getElementById("container_containerTypeID")
	let containerTypeSelectFields = [{'inputField': 'containerTypeID', 'outputField': 'value'}]
	createSelectOptionsList(containerTypeSelect, newContainerContainerTypes, containerTypeSelectFields, 'containerTypeName', true, "Select Portfolio Type", true, true)
	let containerGroupSelect = document.getElementById("container_groupID")
	let containerGroupSelectFields = [{'inputField': 'groupID', 'outputField': 'value'}]
	createSelectOptionsList(containerGroupSelect, groups, containerGroupSelectFields, 'groupName', true, "Select Portfolio Group", false, true)
	instrumentContainerOwnershipTree = new containerOwnershipTree()
})

function displayContainerForm(callback){
	let containerForm = document.getElementById("newContainerForm")
	if(dataSet){
		clearAllFormFields(containerForm)
		let containerOwnerSelect = document.getElementById("container_ownerProfileID")
		let containerOwnerSelectFields = [{'inputField': 'googleProfileID', 'outputField': 'value'}]
		createSelectOptionsList(containerOwnerSelect, containerOwners, containerOwnerSelectFields, 'fullName', true, "Select Portfolio Owner", true, true)
		let containerTypeSelect = document.getElementById("container_containerTypeID")
		let containerTypeSelectFields = [{'inputField': 'containerTypeID', 'outputField': 'value'}]
		createSelectOptionsList(containerTypeSelect, newContainerContainerTypes, containerTypeSelectFields, 'containerTypeName', true, "Select Portfolio Type", true, true)
		containerTypeSelect.addEventListener("change", function(e){showContainerFields(this)})
		let containerGroupSelect = document.getElementById("container_groupID")
		let containerGroupSelectFields = [{'inputField': 'groupID', 'outputField': 'value'}]
		createSelectOptionsList(containerGroupSelect, groups, containerGroupSelectFields, 'groupName', true, "Select Portfolio Group", false, true)
		let newContainerFormModal = document.getElementById("newContainerFormModal")
		newContainerFormModal.style.display="flex"
		typeof callback === 'function' && callback(containerForm)
	}
	else{
		document.addEventListener("dataSet", function(e){
			clearAllFormFields(containerForm)
			let containerOwnerSelect = document.getElementById("container_ownerProfileID")
			let containerOwnerSelectFields = [{'inputField': 'googleProfileID', 'outputField': 'value'}]
			createSelectOptionsList(containerOwnerSelect, containerOwners, containerOwnerSelectFields, 'fullName', true, "Select Portfolio Owner", true, true)
			let containerTypeSelect = document.getElementById("container_containerTypeID")
			let containerTypeSelectFields = [{'inputField': 'containerTypeID', 'outputField': 'value'}]
			createSelectOptionsList(containerTypeSelect, newContainerContainerTypes, containerTypeSelectFields, 'containerTypeName', true, "Select Portfolio Type", true, true)
			let containerGroupSelect = document.getElementById("container_groupID")
			let containerGroupSelectFields = [{'inputField': 'groupID', 'outputField': 'value'}]
			createSelectOptionsList(containerGroupSelect, groups, containerGroupSelectFields, 'groupName', true, "Select Portfolio Group", false, true)
			let newContainerFormModal = document.getElementById("newContainerFormModal")
			newContainerFormModal.style.display="flex"
			typeof callback === 'function' && callback(containerForm)
		})
	}
}

function showContainerFields(that){
	let container_elements = document.getElementsByClassName("Container_Specific_Fields");
	for (let item of container_elements){
		item.style.display = "none";
	}
	switch(that.value){
		case "1":
			document.getElementById("PMS").style.display = "block";
			break;
		case "2":
			document.getElementById("AIF").style.display = "block";
			break;
	}
}

function validateContainerForm(){
	let errors = []
	let containerType = document.getElementById('container_containerTypeID')
	let containerOwner = document.getElementById('container_ownerProfileID')
	let openDate = document.getElementById('container_openDate')
	let containerName = document.getElementById('container_containerName')
	if(containerType.value=="")errors.push('Select a Container Type')
	if(containerOwner.value=="")errors.push('Select the Container Owner')
	if(openDate.value=="")errors.push('Enter a valid container open date')
	if(containerName.value.length<3)errors.push('Container Name must be atleast 3 characters long')
	if(containerType.value=="1")validatePMS(errors)
	if(containerType.value=="2")validateAIF(errors)
	if(errors.length==0){
		addContainer(function(result){
			displayRequestResult(result, document.getElementById('newContainerForm'))
			if(!result['error']){
				let newContainer = JSON.parse(result.newContainer)[0]
				addedContainerObj = {}
				addedContainerObj[newContainer['containerID']] = newContainer
				let event = new CustomEvent('addedContainers', {detail: addedContainerObj});
				document.dispatchEvent(event);
			}
		})
	}
	else {
		return displayRequestResult({"error": errors.join('\n')}, document.getElementById('newContainerForm'))
	}
}

function validatePMS(errors){
	let PMS_Institution = document.getElementById("PMS_Institution").value
	let PMS_Fees = document.getElementById("PMS_Fees").value
	if(PMS_Institution.length<3)errors.push('Enter PMS institution')
	if(PMS_Fees=="")errors.push('Enter PMS management fees')
}

function validateAIF(errors){
	let AIF_Institution = document.getElementById("AIF_Institution").value
	let AIF_Fees = document.getElementById("AIF_Fees").value
	if(AIF_Institution.length<3)errors.push('Enter AIF institution')
	if(AIF_Fees=="")errors.push('Enter AIF management fees')
}

function addContainer(callback){
	let containerObject = setAddContainerObject();
	socket.emit('addContainerAjax', containerObject, function(error, data){
		if(error || data.error)return callback({'error': error});
		dataVersionId = data.dataVersionId
		return callback(data)
	})
}

function setAddContainerObject(){
	return {
		containerTypeID: document.getElementById('container_containerTypeID').value,
		ownerProfileID: document.getElementById('container_ownerProfileID').value,
		openDate: document.getElementById('container_openDate').value,
		containerName: document.getElementById('container_containerName').value,
		PMS_Institution: document.getElementById("PMS_Institution").value,
		PMS_Fees: document.getElementById("PMS_Fees").value,
		AIF_Institution: document.getElementById("AIF_Institution").value,
		AIF_Fees: document.getElementById("AIF_Fees").value,
		groupID: document.getElementById("container_groupID").value
	}
}

function displayRequestResult(result, parentElement){
	let currResultDisplay = parentElement.querySelector("#requestResultDisplay")
	if(currResultDisplay!=null)parentElement.removeChild(currResultDisplay)
	let resultDisplay = document.createElement("DIV");
	resultDisplay.classList.add("requestResultDisplay")
	resultDisplay.setAttribute("id", "requestResultDisplay")
	let resultText = document.createElement("P")
	resultDisplay.appendChild(resultText)
	if(result['error']){
		resultText.innerText = result['error']
		resultText.style.color = "red"
	}
	else{
		resultText.innerText = result["message"]
		resultText.style.color = "green"
	}
	let closeButton = document.createElement("DIV");
	closeButton.classList.add("closeButton");
	closeButton.setAttribute("id", "closeResultMessage")
	closeButton.innerHTML = "+"
	resultDisplay.appendChild(closeButton)
	parentElement.insertBefore(resultDisplay, parentElement.firstChild)
	closeButton.onclick = function(){
		closeMessage(this)
	}
}

class containerOwnershipTree{
	constructor(){
		this.init()
	}

	addContainerToTree(container){
		let containerOwner = container['ownerProfileID']
		if(!this.ownerPortfolios[containerOwner])this.createContainerOwnerPortfolio(containerOwner);
		let ownerPortfolio = this.ownerPortfolios[containerOwner]
		this.addContainerToOwnerPortfolio(ownerPortfolio, container)
	}

	createContainerOwnerPortfolio(containerOwner){
		let ownerPortfolio = {"childContainers":{"Buy":{}, "Sell":{}}, "childPortfolios": {}}
		this.ownerPortfolios[containerOwner] = ownerPortfolio
	}

	addContainerToOwnerPortfolio(ownerPortfolio, container){
		if(containerTypes[container['containerTypeID']]['PortfolioType'])return this.insertPortfolioContainer(ownerPortfolio, container);
		let portfolioContainerID = container['parentContainerID']
		if(portfolioContainerID){
			let portfolioContainer = ownerPortfolio['childPortfolios'][portfolioContainerID]
			this.insertPortfolioChildContainer(portfolioContainer, container)
			return
		}
		let containerBuySellType = container['buy_sell_type']
		ownerPortfolio['childContainers'][containerBuySellType][container['allowedInstrumentID']] = container['containerID'];
	}

	insertPortfolioContainer(ownerPortfolio, container){
		ownerPortfolio['childPortfolios'][container['containerID']] = {"childContainers": {"Buy":{}, "Sell":{}}}
	}

	insertPortfolioChildContainer(portfolioContainer, childContainer){
		let childContainerBuySellType = childContainer['buy_sell_type']
		portfolioContainer['childContainers'][childContainerBuySellType][childContainer['allowedInstrumentID']] = childContainer['containerID']
	}

	getTransactionContainerID(transactionOwner, portfolioID, instrumentID, buySellType){
		let containerPortfolio = this.ownerPortfolios[transactionOwner]
		if(portfolioID!=null)containerPortfolio = containerPortfolio['childPortfolios'][portfolioID];
		containerPortfolio = containerPortfolio['childContainers'][buySellType]
		return containerPortfolio[instrumentID]
	}
}

containerOwnershipTree.prototype.init = function(){
	this.ownerPortfolios = {}
	for(containerID in containers)this.addContainerToTree(containers[containerID])
}