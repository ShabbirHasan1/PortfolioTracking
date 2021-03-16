var lendingObj = null;

document.addEventListener("dataSet", function(e){
	insertLoanForm()
	let loanFormModal = document.querySelector("#addLoanFormModal")
	lendingObj = new Lending(document.querySelector("#lendingContainer"), loanFormModal)
}, {once: true})

document.addEventListener("addedLoan", function(e){
	console.log(e.detail)
	lendingObj.processAddedLoan(e.detail, false)
})

function insertLoanForm(){
	let loanFormContent = document.querySelector("#addLoanFormFieldsTemplate").content.cloneNode(true).firstElementChild
	let loanFormContainer = document.querySelector("#addLoanFormModal #addLoanForm")
	loanFormContainer.appendChild(loanFormContent)
}

class Lending{
	constructor(lendingContainer, loanFormModal){
		this.lendingContainer = lendingContainer;
		this.selUser = null;
		this.loanFormModal = loanFormModal
		this.initLendingDisplay()
	}

	insertLoanRow(loanID){
		let currLoan = loansObj['loans'][loanID]
		let currLoanTotals = loansObj['loanTotals'][loanID]
		let userLoanRowsContainer = this.lendingContainer.querySelector(`.userLendingView[containerOwner='${currLoan["ownerProfileID"]}'] .loanRowsContainer`)
		var loanRow = document.querySelector("#loanRowTemplate").content.cloneNode(true).firstElementChild
		loanRow.setAttribute('loanID', loanID)
		var cells = loanRow.querySelectorAll(".loanRowCell");
		cells[0].innerText = currLoan['loanName'];
		cells[1].innerText = currLoan['endDate'];
		cells[2].innerText = formatNumber(currLoanTotals['principalOutstanding']);
		cells[3].innerText = formatNumber(currLoanTotals['InterestOutstanding']);
		cells[4].innerText = formatNumber(currLoanTotals['InterestEarningsOutstanding']);
		cells[5].innerText = formatNumber(currLoanTotals['principalRepaid']);
		cells[6].innerText = formatNumber(currLoanTotals['interestPaid']);
		cells[7].innerText = formatNumber(currLoanTotals['InterestEarned']);
		let toggleLoanPaymentTableDisplayBtn = cells[8].querySelector("button")
		let currObj = this
		toggleLoanPaymentTableDisplayBtn.addEventListener("click", function(e){
			let loanRowTableContainer = loanRow.querySelector(".loanPaymentsTableContainer");
			if(getComputedStyle(loanRowTableContainer, null).display=="none"){
				postRequest('/getLoanPayments', {"loanID": loanID}, (error, data)=>{
					if(error || data.data.error)return console.log(error || data.error);
					loanRowTableContainer.style.display = "block"
					currObj.createAndDisplayLoanPaymentsTable(loanID, data.data['loanPayments'])
					this.innerText = "-"
					return;
				})
			}
			loanRowTableContainer.style.display = "none"
			this.innerText = "+"
			return;
		})
		userLoanRowsContainer.appendChild(loanRow)
		return loanRow
	}

	configureUserViewAddLoanButton(userView){
		let addLoanBtn = userView.querySelector(".addLoanBtn")
		addLoanBtn.addEventListener("click", (e)=>{
			let loanOwnerSelect = this.loanFormModal.querySelector("#loanOwnerSelect")
			this.loanFormModal.style.display="flex";
			$(loanOwnerSelect).val(this.selUser).trigger('change')
		})
	}

	initLoanForm(){
		let loanOwnerSelect = this.loanFormModal.querySelector("#loanOwnerSelect")
		let loanOwnerSelectFields = [{'inputField': 'googleProfileID', 'outputField': 'value'}]
		createSelectOptionsList(loanOwnerSelect, containerOwners, loanOwnerSelectFields, 'fullName', true, "Select Loan Owner", true, true)
		$(document).ready(function(){$(loanOwnerSelect).select2()})
		let principalRepaymentTypeSelect = this.loanFormModal.querySelector("[name='principalRepaymentType']")
		let instrumentRepaymentTypeSelect = this.loanFormModal.querySelector("[name='interestRepaymentType']")
		let loanFormModal = this.loanFormModal
		principalRepaymentTypeSelect.addEventListener("change", function(){
			let principalMoratoriumDiv = loanFormModal.querySelector("[name='principalMoratorium']").parentElement
			let principalFrequencyDiv = loanFormModal.querySelector("[name='principalFrequency']").parentElement
			if(this.value=="Periodic"){
				principalMoratoriumDiv.style.display = "block"
				principalFrequencyDiv.style.display = "block"
			}
			else{
				principalMoratoriumDiv.style.display = "none"
				principalFrequencyDiv.style.display = "none"
			}
		})
		instrumentRepaymentTypeSelect.addEventListener("change", function(){
			let interestMoratoriumDiv = loanFormModal.querySelector("[name='interestMoratorium']").parentElement
			let interestFrequencyDiv = loanFormModal.querySelector("[name='interestFrequency']").parentElement
			if(this.value=="Periodic"){
				interestMoratoriumDiv.style.display = "block"
				interestFrequencyDiv.style.display = "block"
			}
			else{
				interestMoratoriumDiv.style.display = "none"
				interestFrequencyDiv.style.display = "none"
			}
		})

		let submitBtn = loanFormModal.querySelector("#addLoanSubmitBtn")
		submitBtn.addEventListener("click", ()=>{
			this.processLoanForm();
		})
	}

	processLoanForm(){
		let formObj = {}
		let formFieldInputs = this.loanFormModal.querySelectorAll(".loanFormInput")
		formFieldInputs.forEach(function(inputField){formObj[inputField.getAttribute("name")] = inputField.value})
		let addLoanFormFields = this.loanFormModal.querySelector("#addLoanFormFields")
		socket.emit("addLoan", formObj, (error, data)=>{
			if(error || data.error)return displayRequestResult({"error": (error || data.error)}, addLoanFormFields)
			this.processAddedLoan(data["addedLoan"], true)
			return displayRequestResult({"message": "Loan Added"}, addLoanFormFields)
		})
	}

	createAndDisplayLoanPaymentsTable(loanID, loanPayments){
		let loanRowTable = this.lendingContainer.querySelector(`.loanRowContainer[loanID='${loanID}'] .loanPaymentsTable`)
		let loanPaymentRows = loanRowTable.querySelectorAll(".loanPaymentTableRow")
		loanPaymentRows.forEach(function(loanPaymentRow){
			loanRowTable.removeChild(loanPaymentRow)
		})
		loanPayments.forEach((loanPayment)=>{
			loanRowTable.appendChild(this.createLoanPaymentRow(loanPayment))
		})
		
		let loanTotals = loansObj['loanTotals'][loanID]
		let currLoan = loansObj['loans'][loanID]
		let loanPaymentTotalsRowObj = {'date': "Total"}
		loanPaymentTotalsRowObj['principalRepaymentAmount'] = parseInt(currLoan['principal'])
		loanPaymentTotalsRowObj['interestPaymentAmount'] = loanTotals['InterestOutstanding'] + loanTotals['interestPaid']
		loanPaymentTotalsRowObj['interestPostTax'] = loanTotals['InterestEarningsOutstanding'] + loanTotals['InterestEarned']
		loanPaymentTotalsRowObj['payOutToInvestor'] = parseInt(currLoan['principal']) + parseInt(loanPaymentTotalsRowObj['interestPaymentAmount'])
		let loanPaymentTotalsRow = this.createLoanPaymentRow(loanPaymentTotalsRowObj)
		loanPaymentTotalsRow.classList.add("loanPaymentTableTotalsRow")		
		loanRowTable.appendChild(loanPaymentTotalsRow)
		loanRowTable.parentElement.style.display = "block"
	}

	createLoanPaymentRow(loanPaymentObj){
		let loanPaymentTableRow = document.querySelector("#loanPaymentTableRow").content.cloneNode(true).firstElementChild
		let loanPaymentTableRowCells = loanPaymentTableRow.querySelectorAll("td")
		
		loanPaymentTableRowCells[0].innerText = loanPaymentObj['date']
		loanPaymentTableRowCells[1].innerText = (loanPaymentObj['principalPaidIn'])?formatNumber(loanPaymentObj['principalPaidIn']):""
		loanPaymentTableRowCells[2].innerText = (loanPaymentObj['outstandingPrincipal'])?formatNumber(loanPaymentObj['outstandingPrincipal']):""
		loanPaymentTableRowCells[3].innerText = (loanPaymentObj['principalRepaymentAmount'])?formatNumber(loanPaymentObj['principalRepaymentAmount']):""
		loanPaymentTableRowCells[4].innerText = (loanPaymentObj['interestPaymentAmount'])?formatNumber(loanPaymentObj['interestPaymentAmount']):""
		loanPaymentTableRowCells[5].innerText = (loanPaymentObj['interestPostTax'])?formatNumber(loanPaymentObj['interestPostTax']):""
		loanPaymentTableRowCells[6].innerText = (loanPaymentObj['payOutToInvestor'])?formatNumber(loanPaymentObj['payOutToInvestor']):""

		return loanPaymentTableRow
	}

	processAddedLoan(addedLoan, displayLoanPayments){
		let loanID = addedLoan['loanInfo']['loanID']
		let loanOwner = addedLoan['loanInfo']['ownerProfileID']
		this.incrementUserLoanTotals(loanOwner, addedLoan['loanTotals'])
		loansObj['loans'][loanID] = addedLoan['loanInfo']
		loansObj['loanTotals'][loanID] = addedLoan['loanTotals']
		let loanRow = this.insertLoanRow(loanID)
		let userTotalsRow = this.lendingContainer.querySelector(`.userLendingView[containerOwner='${loanOwner}'] .lendingUserTotalsRow`)
		this.setUserViewTotalsRowDisplayValues(loanOwner, userTotalsRow)
		if(displayLoanPayments){
			loanRow.querySelector("button").innerText = "-"
			this.createAndDisplayLoanPaymentsTable(loanID, addedLoan['loanPayments'])
		}
	}

	incrementUserLoanTotals(loanOwner, loanTotals){
		let userTotals = loansObj['userLoanTotals'][loanOwner]
		for(let key in loanTotals){
			userTotals[key]+=loanTotals[key]
		}
	}

	setUserViewTotalsRowDisplayValues(containerOwner, userTotalsRow){
		let userTotalCells = userTotalsRow.querySelectorAll(".loanRowCell")
		let currUserLoanTotals = loansObj['userLoanTotals'][containerOwner]
		userTotalCells[2].innerText = formatNumber(currUserLoanTotals['principalOutstanding'])
		userTotalCells[3].innerText = formatNumber(currUserLoanTotals['InterestOutstanding'])
		userTotalCells[4].innerText = formatNumber(currUserLoanTotals['InterestEarningsOutstanding'])
		userTotalCells[5].innerText = formatNumber(currUserLoanTotals['principalRepaid'])
		userTotalCells[6].innerText = formatNumber(currUserLoanTotals['interestPaid'])
		userTotalCells[7].innerText = formatNumber(currUserLoanTotals['InterestEarned'])
	}

	processUpdatedLoanValueOnDailyDataUpdate(updatedLoans){
		console.log(updatedLoans)
		loansObj['loanTotals'] = updatedLoans['loanTotals']
		loansObj['userLoanTotals'] = updatedLoans['userLoanTotals']
		let loanRows = this.lendingContainer.querySelectorAll(".loanRowContainer")
		let loanTotals = loansObj['loanTotals']
		loanRows.forEach(function(loanRow){
			let loanID = loanRow.getAttribute("loanID")
			let currLoanTotals = loanTotals[loanID]
			var cells = loanRow.querySelectorAll(".loanRowCell");
			cells[2].innerText = formatNumber(currLoanTotals['principalOutstanding']);
			cells[3].innerText = formatNumber(currLoanTotals['InterestOutstanding']);
			cells[4].innerText = formatNumber(currLoanTotals['InterestEarningsOutstanding']);
			cells[5].innerText = formatNumber(currLoanTotals['principalRepaid']);
			cells[6].innerText = formatNumber(currLoanTotals['interestPaid']);
			cells[7].innerText = formatNumber(currLoanTotals['InterestEarned']);
		})
		let userLoanTotalsRows = this.lendingContainer.querySelectorAll('.lendingUserTotalsRow')
		console.log(userLoanTotalsRows)
		userLoanTotalsRows.forEach((userLoanTotalsRow)=>{
			let containerOwner = userLoanTotalsRow.parentElement.parentElement.getAttribute("containerOwner")
			this.setUserViewTotalsRowDisplayValues(containerOwner, userLoanTotalsRow)
		})
	}
}

Lending.prototype.initLendingDisplay = function(){
	let lendingContainer = this.lendingContainer
	let lendingToggleUserContainer = document.createElement("div")
	let ledingUserViewContainer = document.createElement("div")

	lendingToggleUserContainer.classList.add("lendingToggleUserContainer")
	ledingUserViewContainer.classList.add("ledingUserViewContainer")
	lendingContainer.appendChild(lendingToggleUserContainer)
	lendingContainer.appendChild(ledingUserViewContainer)

	for(containerOwner in containerOwners){
		this.setLendingToggleUserButton(containerOwner, lendingToggleUserContainer)
		let currUserLendingView = this.setLendingUserView(containerOwner, ledingUserViewContainer)
		this.setUserViewTotalsRowDisplayValues(containerOwner, currUserLendingView.querySelector(".lendingUserTotalsRow"))
	}
	
	ledingUserViewContainer.firstChild.style.display = "block"
	this.selUser = ledingUserViewContainer.firstChild.getAttribute("containerOwner")

	let loans = loansObj['loans']
	for(loanID in loans)
		this.insertLoanRow(loanID)

	this.initLoanForm()
}

Lending.prototype.setLendingToggleUserButton = function(containerOwner, lendingToggleUserContainer){
	let toggleButton = document.createElement("button")
	toggleButton.innerText = containerOwners[containerOwner]['fullName']
	toggleButton.setAttribute("containerOwner", containerOwner)
	toggleButton.classList.add("btn", "btn-default", "btn-sm")
	toggleButton.addEventListener("click", ()=>{
		let activeUserDisplay = this.lendingContainer.querySelector(`.userLendingView[containerOwner='${this.selUser}']`)
		activeUserDisplay.style.display = "none"
		activeUserDisplay = this.lendingContainer.querySelector(`.userLendingView[containerOwner='${containerOwner}']`)
		activeUserDisplay.style.display = "block"
		this.selUser = containerOwner
	})
	lendingToggleUserContainer.appendChild(toggleButton)
}

Lending.prototype.setLendingUserView = function(containerOwner, ledingUserViewContainer){
	let currUserView = document.querySelector("#userLendingViewTemplate").content.cloneNode(true).firstElementChild
	currUserView.setAttribute("containerOwner", containerOwner)
	this.configureUserViewAddLoanButton(currUserView)
	ledingUserViewContainer.appendChild(currUserView)
	return currUserView
}