function getCurrPath(){
	let openView = window.location.pathname.substring(1)
	return openView
}

function setView(viewId){
	var targetView = document.getElementById(viewId)
	if(targetView==undefined)return alert('Invalid Option Selected');
	var pageViews = document.getElementsByClassName('pageView')
	for(pageView of pageViews)pageView.style.display="none";
	setPageTitle(pageTitles[viewId])
	targetView.style.display="flex";
}

function getInstrumentType(instrumentId){
	// if((String(instrumentId)).indexOf("INF")==0)return "MF";
	// return "EQ"
	return instruments["all"][instrumentId]['instrumentType']
}

function setViewOnUrlChange(){
	let openView = getCurrPath()
	setView(openView)
}

function setPageTitle(title){
	document.head.querySelector("title").innerText = title
}

window.addEventListener("popstate", function(event){
	setViewOnUrlChange()
});

function updateUrl(urlPath){
	window.history.pushState({"path": urlPath}, "", urlPath);
	let event = new CustomEvent('urlUpdate');
	document.dispatchEvent(event);
}

function deleteAllChildren(parentElement){
	while(parentElement.childNodes.length>0)parentElement.removeChild(parentElement.lastChild);
}

function createSelectOptionsList(selectNode, optionsList, targetFields, innerHTMLField, addPlaceholder, placeholderText, placeHolderDisabled, placeHolderSelected){
	while (selectNode.childNodes.length>0)selectNode.removeChild(selectNode.lastChild);
	if(addPlaceholder)insertPlaceholderSelectOption(selectNode, placeholderText, placeHolderDisabled, placeHolderSelected)
	for(var key in optionsList){
		var option =  optionsList[key]
		currOption = document.createElement("option")
		currOption.innerHTML = option[innerHTMLField]
		for(targetFieldPair of targetFields)
			currOption.setAttribute(targetFieldPair['outputField'], option[targetFieldPair['inputField']])
		selectNode.appendChild(currOption)
	}
}

function getRequest(path, callback){
	axios.get(path)
	.then((response)=>{
		callback(null, response)
	})
	.catch((error)=>{
		callback(error, null)
	})
}

function postRequest(path, data, callback){
	axios.post(path, data)
	.then((response)=>{
		// console.log(response.data)
		callback(null, response)
	})
	.catch((error)=>{
		// console.log(error)
		callback(error, null)
	})
}

function insertPlaceholderSelectOption(selectElement, innerText, disabled, selected){
	option = document.createElement("option")
	option.value = ""
	option.text = "-- "+innerText+" --"
	option.disabled = disabled
	option.setAttribute("selected", selected)
	selectElement.add(option)
}

function closeModal(that){
	that.parentElement.parentElement.style.display="none"
}

function closeMessage(that){
	that.parentElement.style.display="none"
}

function levelOrderTraverseDOMTree(root, proceedFunction){
	if(root==null)return;
	if(proceedFunction(root)){
		var children = root.children
		for(var i=0; i<children.length; i++){
			levelOrderTraverseDOMTree(children[i], proceedFunction)
		}
	}
}

function isInputField(element){
	return (element.type == 'text' || element.type == 'select-one' || element.type == 'date')
}

function clearAllFormFields(element){
	levelOrderTraverseDOMTree(element, function(root){
		if(isInputField(root))root.value="";
		return !isInputField(root)
	})
}

function formatDate(date){
	var d = new Date(date)
	var month = '' + (d.getUTCMonth()+1)
	var day = '' + d.getUTCDate()
	var year = d.getUTCFullYear()

	if(month.length<2) 
	    month = '0' + month;
	if(day.length<2) 
	    day = '0' + day;
	return [year, month, day].join('-');
}

function formatNumber(num){
	// console.log(typeof(num))
	if(isNaN(num))return "N/A";
	if(typeof(num)!="number")return num;
	num =  parseFloat(num.toFixed(2));
	return num.toLocaleString('en-IN', {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2})
}

Object.filter = function(obj, condition) {
	let result = {};
	for (let key in obj) {
		// console.log(key + ": " +obj[key])
		if (obj.hasOwnProperty(key) && condition(key, obj[key])) {
			result[key] = obj[key];
		}	
	}
	return result;
};

function isDigitString(input){
	return /^\d+$/.test(input);
}


var pageTitles = {
	"profile": "Home",
	"addTransactions": "Add Transactions",
	"derivatives": "Derivatives",
	"lending": "Lending",
	"containerPage": "Container Page"
}