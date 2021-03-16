import pandas as pd
import json
import appData

def getInstrumemntOwners(data):
	users = appData.tables['users']
	instrumentOwners = users.loc[users['isContainerOwner'].notnull()]
	return {"instrumentOwners": instrumentOwners}

def addAuthorizedUser(data):
	ret_data = {"addedUser": False}
	curr_user = appData.tables['users'].loc[appData.tables['users']['email'] == data['email']]
	if(curr_user.empty):
		new_user = {'email': data['email'], 'isContainerOwner': data.get('isContainerOwner')}
		df_temp = pd.DataFrame([new_user], columns=list(appData.tables['users'].columns.values))
		appData.tables['users'] = appData.tables['users'].append(df_temp, ignore_index=True)
		filename = appData.baseDir+'users.json'
		if(appData.saveChanges): appData.tables['users'].to_json(filename, orient='split')
		ret_data['addedUser'] = True

	return ret_data

def authenticateUser(data):
	ret_data = {"authorizedUser": False, "firstLogin": False}
	profile_data = data['userProfile']
	email = profile_data['_json']['email']
	curr_user = appData.tables['users'].loc[appData.tables['users']['email'] == email]
	if(curr_user.empty):
		return ret_data
	ret_data['authorizedUser'] = True
	if(pd.isnull(curr_user.iloc[0]['googleProfileID'])):
		ret_data["firstLogin"]=True
		new_user = {
			'googleProfileID': str(profile_data['id']), 
			'firstName': profile_data['name']['givenName'],
			'lastName': profile_data['name']['familyName'],
			'email': email,
			'isContainerOwner': curr_user.iloc[0]['isContainerOwner']
		}
		appData.tables['users'] = appData.tables['users'][appData.tables['users']['email'] != email]
		df_temp = pd.DataFrame([new_user], columns=list(appData.tables['users'].columns.values))
		filename = appData.baseDir+'users.json'
		appData.tables['users'] = appData.tables['users'].append(df_temp, ignore_index=True)
		if(appData.saveChanges): appData.tables['users'].to_json(filename, orient='split')
	return ret_data

def getUser(data):
	ret_data = {'user': False}
	curr_user = appData.tables['users'].loc[appData.tables['users']['googleProfileID'] == data['googleProfileID']]
	if(not curr_user.empty):
		ret_data['user'] = curr_user
	return ret_data

