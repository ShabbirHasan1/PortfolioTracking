import pandas as pd
import os 
import json
import math
import appData

def getGroupByName(data):
	groupName = data['groupName']
	groups = appData.tables['groups']
	curr_group = groups.loc[groups['groupName']==groupName]
	return {"curr_group": curr_group}

def createGroup(data):
	ret_data = {"groupCreated": False, "error": True}
	curr_group_df = getGroupByName(data)['curr_group']
	if(curr_group_df.shape[0]>0):return ret_data;
	groups = appData.tables['groups']
	groupID = groups['groupID'].max()
	groupID = int(0 if math.isnan(groupID) else groupID+1)
	temp_df = pd.DataFrame([{"groupID": groupID, "groupName": data['groupName']}], columns=list(appData.tables['groups'].columns.values))
	appData.tables['groups'] = appData.tables['groups'].append(temp_df, ignore_index=True)
	filename = appData.baseDir+'groups.json'
	if(appData.saveChanges): appData.tables['groups'].to_json(filename, orient='split')
	ret_data['groupCreated'] = True
	ret_data["error"] = False
	ret_data["groupData"] = temp_df
	appData.updatedInfoObject['newGroups'][groupID] = temp_df.to_dict(orient="split")[0]
	return ret_data

def getAllGroups(data):
	return {"groupsData": appData.tables['groups']}

def getGroupByID(data):
	groups = appData.tables['groups']
	groupID = int(data['groupID'])
	req_group = groups.loc[groups['groupID']==groupID]
	if(req_group.empty):return{"groupInfo": None}
	return {"groupInfo": req_group.to_dict(orient="records")[0]}
