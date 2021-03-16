var newContainerGroupsMappings = {};

document.addEventListener('DOMContentLoaded', function (){
	var openView = getCurrPath()
	if(openView=="manageGroups"){
		displayUsersContainerGroups()
	}
})

document.getElementById('addGroupAjax').addEventListener("click", function(){
	displayGroupForm()
})

window.addEventListener("popstate", function(event){
	openView = getCurrPath()
	if(openView=="manageGroups"){
		displayUsersContainerGroups()
	}
});

function displayGroupForm(){
	var newGroupFormModal = document.getElementById("newGroupFormModal")
	newGroupFormModal.style.display="flex"
}

function validateGroupForm(){
	var groupName = document.getElementById("group_groupName").value
	if(groupName.length<3)return alert("Group Name must be atleast 3 characters long");
	console.log(groupName)
	// else createGroup(groupName) 
}

function createGroup(groupName, callback){
	postRequest('/createGroup', {"groupName": groupName}, function(error, result){
		if(error)return alert(error);
		console.log(result)
	})
}

function displayUsersContainerGroups(){
	getRequest('/manageGroupsAjax', function(error, result){
		var instrument_owners_containers = {}
		var containers = result.data.containerGroups
		var groupsData = result.data.groupsData
		var instrument_owners = result.data.instrumentOwners
		instrument_owners.forEach(function(instrument_owner, idx){
			instrument_owners_containers[instrument_owner['googleProfileID']] = {
				"name": instrument_owner['firstName'] + " " + instrument_owner['lastName'],
				"userId": instrument_owner['googleProfileID'],
				"containers": []
			}
		})
		containers.forEach(function(container, idx){instrument_owners_containers[container['ownerProfileID']].containers.push(container)})
		var manageContainerGroups = document.getElementById("manageContainerGroups")
		while(manageContainerGroups.childNodes.length>0)manageContainerGroups.removeChild(manageContainerGroups.lastChild);
		var manageContainerGroupsToggleViewButtonContainer = document.createElement("div")
		var manageContainerUserViewsContainer = document.createElement("div")
		manageContainerGroups.appendChild(manageContainerGroupsToggleViewButtonContainer);
		manageContainerGroups.appendChild(manageContainerUserViewsContainer);
		createUserGroupNavigationButtons(instrument_owners_containers, groupsData, manageContainerGroupsToggleViewButtonContainer)
		createUserContainerGroupsView(instrument_owners_containers, groupsData, manageContainerUserViewsContainer)
		if(manageContainerUserViewsContainer.childNodes.length>0){
			manageContainerUserViewsContainer.firstChild.style.display = "block"
			createManageGroupsSubmitButton(manageContainerGroups)
		}
	})
}

function createUserGroupNavigationButtons(ownerContainers, groupsData, parentElement){
	for (key in ownerContainers){
		var currContainerOwner = ownerContainers[key]
		var userId = currContainerOwner['userId']
		var currUserContainerGroupsBtn = document.createElement("BUTTON")
		currUserContainerGroupsBtn.setAttribute("userId", userId)
		currUserContainerGroupsBtn.setAttribute("id", userId+"_ToggleGroupsViewButton")
		currUserContainerGroupsBtn.innerText = currContainerOwner['name']
		currUserContainerGroupsBtn.classList.add("btn", "btn-default", "btn-sm")
		currUserContainerGroupsBtn.addEventListener("click", function(){
			viewId = this.getAttribute("userId")+"_containerGroupsView"
			userContainerGroupsView = document.getElementsByClassName("userContainerGroupsView")
			for(userView of userContainerGroupsView)userView.style.display = "none";
			targetView = document.getElementById(viewId)
			targetView.style.display = "block"
		})
		parentElement.appendChild(currUserContainerGroupsBtn)
	}
}

function createUserContainerGroupsView(ownerContainers, groupsData, parentElement){
	for(key in ownerContainers){
		var currContainerOwner = ownerContainers[key]
		var currUserCotainerGroupsView = document.createElement("div")
		currUserCotainerGroupsView.setAttribute("id", currContainerOwner['userId']+"_containerGroupsView")
		currUserCotainerGroupsView.classList.add("userContainerGroupsView")
		currUserCotainerGroupsView.style.display="none"
		var containers = currContainerOwner.containers;
		containers.forEach(function(container, idx){addUserContainerGroupRow(container, groupsData, currUserCotainerGroupsView);})
		parentElement.appendChild(currUserCotainerGroupsView)
	}
}

function addUserContainerGroupRow(container, groupsData, parentElement){
	var containerGroupRowDiv = document.createElement("div")
	var containerNameDiv = document.createElement("div")
	containerNameDiv.classList.add("col-sm-6")
	containerNameDiv.innerText = container.containerName
	var containerSelectGroupDiv = document.createElement("select")
	containerSelectGroupDiv.setAttribute("containerid", container.containerID)
	containerSelectGroupDiv.addEventListener("change", function(event){
		newContainerGroupsMappings[this.getAttribute("containerid")] = this.value
	})
	var containerGroupsSelectFields = [{'inputField': 'groupID', 'outputField': 'value'}]
	createSelectOptionsList(containerSelectGroupDiv, groupsData, containerGroupsSelectFields, 'groupName', true, 'None', false, container.groupID==null)
	if(container.groupID!=null)containerSelectGroupDiv.value = container.groupID;
	containerGroupRowDiv.appendChild(containerNameDiv)
	containerGroupRowDiv.appendChild(containerSelectGroupDiv)
	parentElement.appendChild(containerGroupRowDiv)
}

function createManageGroupsSubmitButton(parentElement){
	var submitButton = document.createElement("button")
	submitButton.setAttribute("id", "manageGroupsSubmitBtn")
	submitButton.innerText = "Submit"
	submitButton.addEventListener("click", function(event){
		console.log(newContainerGroupsMappings);
		postRequest('/updateGroups', newContainerGroupsMappings, function(error, result){
			if(error)return console.log(error)
			if(result.data['groupsUpdated']){
				newContainerGroupsMappings = {};
				alert('groups updated succesfully')
			}
			else
				alert('error updating groups')
		})
		// displayUsersContainerGroups()
	})
	parentElement.appendChild(submitButton)	
}