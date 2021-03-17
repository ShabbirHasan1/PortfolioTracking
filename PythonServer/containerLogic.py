import pandas as pd
import os
import json
import math
import instrumentLogic as instrument
import datetime
import appData
import numpy as np
import accountingLogic as accounts
import groupLogic as group
from pprint import pprint

def getContainerTypesData(data):
	ret_data = {"containerTypesData": appData.tables['containerTypes'].to_dict(orient="records")}
	return ret_data

def addPortfolio(data):
	ret_data = {'error': True}
	container_df = appData.tables['containers']
	containerTypeID = data.get('containerTypeID', None)
	containerName = data.get('containerName', None)
	containerOwner = data.get('ownerProfileID', None)
	if((containerTypeID is None) or (containerName is None) or (containerOwner is None)): return {"Error": "Provide all fields"}
	containerTypeID = int(containerTypeID)
	existingContainer = container_df.loc[(container_df['containerTypeID']==containerTypeID) & (container_df["ownerProfileID"]==containerOwner) & (container_df['containerName']==containerName)]
	if(not existingContainer.empty): return {"error": "Container Name taken"}
	new_container = appData.containerTypeFunctions[containerTypeID].setNewContainerObject(data)
	df_temp = pd.DataFrame([new_container])
	appData.tables['containers'] = container_df.append(df_temp, ignore_index=True)
	filename = appData.baseDir + "containers.json"
	if(appData.saveChanges): appData.tables['containers'].to_json(filename, orient='split')
	ret_data['error'] = False
	ret_data['newContainer'] = df_temp
	containerObj = json.loads(df_temp.to_json(orient='records'))[0]
	appData.updatedInfoObject['addedContainers'][containerObj['containerID']] = containerObj
	return ret_data

def addContainer(data):
	ret_data = {'error': True}
	container_df = appData.tables['containers']
	containerTypeID = instrument.getInstrumentContainerTypeID(data.get('instrumentID'))
	new_container = appData.containerTypeFunctions[containerTypeID].setNewContainerObject(data)
	df_temp = pd.DataFrame([new_container])
	appData.tables['containers'] = container_df.append(df_temp, ignore_index=True)
	filename = appData.baseDir + "containers.json"
	if(appData.saveChanges): appData.tables['containers'].to_json(filename, orient='split')
	ret_data['error'] = False
	ret_data['newContainer'] = df_temp
	containerObj = json.loads(df_temp.to_json(orient='records'))[0]
	appData.updatedInfoObject['addedContainers'][containerObj['containerID']] = containerObj
	return ret_data

def createTempContainers(containerInfoDF):
	instrumentContainerTypeDF = pd.Series(instrument.instrumentTypeToContainerTypeMap, name="containerTypeID").to_frame().reset_index().rename(columns={"index": "instrumentType"})
	pprint(instrumentContainerTpyeDF)
	containers = appData.tables['containers']
	maxContainerID = containers['containerID'].max()
	maxContainerID = 0 if math.isnan(maxContainerID) else maxContainerID+1
	instruments = appData.tables['instruments'][['instrument_token', 'expiry', 'displayName', 'instrumentType']].rename(columns={"instrument_token": "instrumentID"})
	containerInfoDF = pd.merge(containerInfoDF, instruments, how="left", left_on="instrumentID", right_on="instrumentID").rename(columns={"expiry"})
	containerInfoDF = pd.merge(containerInfoDF, instrumentContainerTypeDF, how="left", left_on="instrumentType", right_on="instrumentType")
	return None

def getAllContainers(data):
	container_df = appData.tables['containers']
	# container_df['']
	return {'containersInfo': container_df}

def getContainersGroups(data):
	containers = appData.tables['containers']
	groups = appData.tables['groups']
	joined = pd.merge(containers, groups, how='left', left_on='groupID', right_on='groupID')
	return {"containerGroups": joined}

def getSingleContainer(containerId):
	container_df = appData.tables['containers']
	container = container_df.loc[container_df['containerID']==containerId]
	return container

def getMultipleContainers(container_list):
	container_df = appData.tables['containers']
	containers = container_df.loc[(container_df['containerID'].isin(container_list))]
	return containers

def getContainersByContainerTypes(container_type_list):
	container_df = appData.tables['containers']
	containers = container_df.loc[(container_df['containerTypeID'].isin(container_type_list))]
	return containers

def updateContainerGroups(data):
	ret_data = {"groupsUpdated": False}
	updated_groups_arr = []
	for key, value in data.items():
		curr_update = {"containerID": int(key), 'groupID_new': np.nan if (value=='') else int(value), 'updateRow':True}
		updated_groups_arr.append(curr_update)
	df_temp = pd.DataFrame(updated_groups_arr, columns=['containerID', 'groupID_new', 'updateRow'])
	containers = appData.tables['containers']
	df_temp = pd.merge(containers, df_temp, how="left", left_on='containerID', right_on='containerID')
	df_temp['updatedGroups'] = np.where(df_temp["updateRow"]==True, df_temp['groupID_new'], df_temp["groupID"])
	containers['groupID'] = df_temp['updatedGroups']
	appData.tables['containers'] = containers
	filename = appData.baseDir + "containers.json"
	if(appData.saveChanges): containers.to_json(filename, orient='split')
	ret_data['groupsUpdated'] = True
	ret_data["error"] = False
	return ret_data

def updateContainersBookedProfitStartDate(data):
	container_list = data['container_list']
	target_date = datetime.datetime.strptime(data['bookedProfitStartDate'], "%Y-%m-%d")
	containers = appData.tables['containers']
	containers.loc[containers['containerID'].isin(container_list), ['bookedProfitStartDate']] = target_date
	filename = appData.baseDir + "containers.json"
	if(appData.saveChanges): containers.to_json(filename, orient='split')
	#New Booked Profit start date logic TBI 
	# updatedAccounts = accounts.updateAccounts(data)['updatedAccounts']

	filteredContainers = containers.loc[containers['containerID'].isin(container_list)]
	filteredContainers = json.loads(filteredContainers.to_json(orient='records'))
	filteredContainers = {x['containerID']: x for x in filteredContainers}
	appData.updatedInfoObject['updatedContainers'].update(filteredContainers) # = appData.updatedInfoObject['updatedContainers'].append(filteredContainers, ignore_index=True)
	return {"message": "Containers booked profit start date updated", "error": False}

def updateSingleContainerGroup(data):
	containerID = int(data['containerID'])
	groupID = np.nan if data['groupID'] == '' else int(data['groupID'])
	containers = appData.tables['containers']
	containers.loc[containers['containerID']==containerID, ['groupID']] = groupID
	filename = appData.baseDir + "containers.json"
	if(appData.saveChanges): containers.to_json(filename, orient='split')
	appData.updatedInfoObject["updatedContainerGroups"][containerID] = None if data['groupID'] == '' else int(data['groupID'])
	return {"containerGroupUpdated": True, "error": False}

def updateContainersToSingleGroup(data):
	if(not 'container_list' in data):return {"error": "Container list not provided"}
	if(not 'groupID' in data): return {"error": "No Group Provided"}
	containers = appData.tables['containers']
	container_list = data['container_list']
	groupID = np.nan if data['groupID'] == '' else int(data['groupID'])
	if(not np.isnan(groupID) and group.getGroupByID(data)['groupInfo']==None):return{"error": "Invalid group"}
	containers.loc[containers['containerID'].isin(container_list), ['groupID']] = groupID
	for containerID in container_list: appData.updatedInfoObject["updatedContainerGroups"][containerID] = None if data['groupID'] == '' else int(data['groupID'])
	if(appData.saveChanges): containers.to_json(filename, orient='split')
	return {"message": "Groups Updated", "error": False}

def setContainerOpenPos(containerTransactions):
	containers = appData.tables['containers']
	# filteredContainers = containers.loc[containers['containerID'].isin(set(containerTransactions['containerID']))][["containerID","containerName","containerTypeID","ownerProfileID","openDate","closeDate","lastCalcReturns","allowedInstrumentID","groupID","bookedProfitStartDate","buy_sell_type","parentContainerID", "underlyingInstrumentID", "lot_size"]]
	filteredContainers = containers.loc[containers['containerID'].isin(set(containerTransactions['containerID']))].drop(columns=["firstOpenTransactionDate","closed_exposure","closed_volume","open_exposure","open_volume","transaction_profit","closed_profit"])
	firstOpenTransaction = containerTransactions.loc[containerTransactions['transaction_open_volume']>0].groupby('containerID').head(1)[['containerID', 'transaction_date']].rename(columns={'transaction_date': 'firstOpenTransactionDate'})
	firstOpenTransaction['firstOpenTransactionDate'] = firstOpenTransaction['firstOpenTransactionDate'].dt.strftime('%Y-%m-%d')
	lastTransaction = containerTransactions.groupby('containerID').tail(1)[["containerID", "closed_exposure","closed_volume","open_exposure","open_volume","transaction_profit","closed_profit"]]
	temp = pd.merge(filteredContainers, firstOpenTransaction, how='left', left_on="containerID", right_on="containerID")
	temp = pd.merge(temp, lastTransaction, how='left', left_on="containerID", right_on="containerID")
	containers = containers.loc[~containers['containerID'].isin(temp['containerID'])]
	containers = containers.append(temp, ignore_index=True).sort_values('containerID')
	appData.tables['containers'] = containers
	# pprint(temp)
	filename = appData.baseDir + "containers.json"
	if(appData.saveChanges): appData.tables['containers'].to_json(filename, orient='split')
