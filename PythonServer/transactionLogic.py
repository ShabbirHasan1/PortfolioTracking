import pandas as pd
import os 
import json
import math
import instrumentLogic as instrument
import containerLogic as container
import accountingLogic as accounts
import strategyLogic as strategy
import appData
from pprint import pprint
import datetime

def initTransactions():
	transactions = appData.tables['transactions']
	transactions = transactions.sort_values(['containerID', 'transaction_date', 'transactionID'])
	appData.tables['transactions'] = transactions
	initSubscribedInstrumentCount()

def addUserInputTransactions(data):
	# def setNewTransactionsDF(newTransactionsList):
	# 	newTransactions = pd.DataFrame([], columns=['containerID'])
	# 	newTransactions = newTransactions.append(newTransactionsList)
	# 	newTransactions = newTransactions.rename(columns={'containerID': 'parentContainerID'}).drop(columns=['containerTypeID'])
	# 	getTransactionContainerIDs(newTransactions)
	# 	return newTransactions


	# def getTransactionContainerIDs(transactionDF):
	# 	containers = appData.tables['containers'].rename(columns={"allowedInstrumentID": "instrumentID"})
	# 	containerMatchColumns = ['ownerProfileID', 'instrumentID', 'parentContainerID', 'buy_sell_type']
	# 	transactionContainers = transactionDF[containerMatchColumns].drop_duplicates()
	# 	transactionContainers = pd.merge(transactionContainers, containers, how="left", left_on=containerMatchColumns, right_on=containerMatchColumns)
	# 	containerMatchColumns.append('containerID')
	# 	missingContainers = transactionContainers.loc[transactionContainers['containerID'].isna()][containerMatchColumns]
	# 	if(not missingContainers.empty):
	# 		missingContainers = container.createTempContainers(missingContainers)
	# 		pprint(missingContainers)

	new_transactions = data['transactions']
	# newTransactionsDF = setNewTransactionsDF(new_transactions)
	# return {}
	df_transaction_data = []
	transactionStrategyAssignmentData = []
	i=0
	for transaction in new_transactions:
		containerTypeID = int(instrument.getInstrumentContainerTypeID(transaction.get('instrumentID')))
		transactionObj = appData.containerTypeFunctions[containerTypeID].setTransactionObject(transaction, i)
		df_transaction_data.append(transactionObj)
		i+=1

	for i in range(0, len(new_transactions)):transactionStrategyAssignmentData.extend(setTransactionStrategyRows(df_transaction_data[i], new_transactions[i].get('strategyAssignMap', {})))

	newTransactionDF = pd.DataFrame(df_transaction_data)
	strategyAssignDF = pd.DataFrame(transactionStrategyAssignmentData)
	return addTransactions(newTransactionDF, strategyAssignDF)

def addTransactions(newTransactionDF, strategyAssignDF):
	ret_data = {'addedTransaction': False}
	ret_data["error"] = True
	transaction_df = appData.tables['transactions']

	assignStrategyVol = strategy.validateAndProcessNewTransactionsStrategyAssignments(strategyAssignDF)
	if("error" in assignStrategyVol):
		ret_data['error']  = assignStrategyVol['error']
		return ret_data

	processedTransactions = validateAndProcessNewTransactions(newTransactionDF)
	if("error" in processedTransactions):
		ret_data['error']  = processedTransactions['error']
		return ret_data

	updatedTransactions = pd.DataFrame(processedTransactions['updatedAndAddedTransactions'])
	transactions = transaction_df.loc[~transaction_df['transactionID'].isin(updatedTransactions['transactionID'])]
	transactions = transactions.append(updatedTransactions, ignore_index=True)
	transactions = transactions.sort_values(['containerID', 'transaction_date', 'transactionID']).reset_index(drop=True);
	appData.tables['transactions'] = transactions
	if(appData.saveChanges): transactions.to_json(appData.baseDir+'transactions.json', orient="split")
	container_set = set(updatedTransactions['containerID'])
	containersAllTransactions = transactions.loc[transactions['containerID'].isin(container_set)].reset_index()
	deletedInstruments = subtractContainerFromSubscribedInstrumentCount(container_set)
	container.setContainerOpenPos(containersAllTransactions)
	addedInstruments = addContainerToSubscribedInstrumentCount(container_set)
	
	appData.updatedInfoObject['deletedInstruments'].extend(list(deletedInstruments-addedInstruments))
	appData.updatedInfoObject['addedInstruments'].extend(list(addedInstruments-deletedInstruments))
	accounts.updateContainerAccounts(containersAllTransactions)
	strategy.updateStrategyContainers(assignStrategyVol['updatedStrategyContainerVolumes'])
	ret_data['addedTransaction'] = True
	ret_data["error"] = False
	pprint(appData.updatedInfoObject)
	return ret_data

def validateAndProcessNewTransactions(newTransactionDF):
	containers = appData.tables['containers']
	transactions = appData.tables['transactions']
	newTransContainers = set(newTransactionDF['containerID'])
	newTransContainersInfo = containers.loc[containers['containerID'].isin(newTransContainers)][['containerID', 'allowedInstrumentID', 'parentContainerID', 'buy_sell_type']]
	#Check and remove sort in below line
	oldTransactionDF = transactions.loc[transactions['containerID'].isin(newTransContainers)].sort_values(['containerID', 'transaction_date', 'transactionID'], ignore_index=True)
	missTransContainers = getContainersMissingOldTransactions(newTransactionDF, oldTransactionDF)
	missTransDF = newTransactionDF.loc[newTransactionDF['containerID'].isin(missTransContainers)]
	addedTransDF = newTransactionDF.loc[~(newTransactionDF['containerID'].isin(missTransContainers))]

	invalidAddedTransContainers = invalidAddedTrans(addedTransDF, oldTransactionDF.loc[~oldTransactionDF['containerID'].isin(missTransContainers)])
	invalidMissTransContainers = invalidMissTrans(missTransDF, oldTransactionDF.loc[oldTransactionDF['containerID'].isin(missTransContainers)])
	if(len(invalidAddedTransContainers)>0 or len(invalidMissTransContainers)>0):
		invalidAddedTransContainers.extend(invalidMissTransContainers)
		return {
			"error": "Insufficient open units for one or more transactions",
			"containerList": invalidAddedTransContainers
		}

	updatedAndAddedTransactions = []
	updatedAndAddedTransactions.extend(accounts.calcAddedTransContainerAccounts(addedTransDF, oldTransactionDF.loc[~oldTransactionDF['containerID'].isin(missTransContainers)]))
	updatedAndAddedTransactions.extend(accounts.calcMissTransContainerAccounts(missTransDF, oldTransactionDF.loc[oldTransactionDF['containerID'].isin(missTransContainers)]))
	return {"updatedAndAddedTransactions": updatedAndAddedTransactions}

def setTransactionStrategyRows(transactionObj, strategyAssignMap):
	ret = []
	if(strategyAssignMap=={}):
		ret.append({
			"transactionID": transactionObj['transactionID'],
			"strategyID": None,
			"assignVolume": 0,
			'transactionVolume': transactionObj['volume'],
			"openClose": transactionObj['open_close_type'],
			'containerID': transactionObj['containerID']
		})
		return ret
	for strategyID in strategyAssignMap:
		ret.append({
			"transactionID": transactionObj['transactionID'],
			"strategyID": int(strategyID),
			"assignVolume": strategyAssignMap[strategyID],
			'transactionVolume': transactionObj['volume'],
			"openClose": transactionObj['open_close_type'],
			'containerID': transactionObj['containerID']
		})
	return ret

def getContainersMissingOldTransactions(newTransactions, oldTransactions):
	containersLastOldTransDate = oldTransactions[['containerID', 'transaction_date']].groupby('containerID').tail(1).rename(columns={'transaction_date': 'oldTransDate'})
	containersFirstNewTransDate = newTransactions[['containerID', 'transaction_date']].groupby('containerID').head(1).rename(columns={'transaction_date': 'newTransDate'})
	containerFirstLastDates = pd.merge(containersFirstNewTransDate, containersLastOldTransDate, how="left", left_on="containerID", right_on="containerID")
	containerFirstLastDates['oldTransDate'].fillna(pd.Timestamp(0), inplace=True)
	containerFirstLastDates['missTrans'] = containerFirstLastDates['oldTransDate']>containerFirstLastDates['newTransDate']
	return set(containerFirstLastDates.loc[containerFirstLastDates['missTrans']]['containerID'])

def invalidAddedTrans(addedTransDF, oldTransactionDF):
	addedTransDFVol = pd.DataFrame(addedTransDF[['containerID', 'volume', 'open_close_type']])
	addedTransDFVol['signedVolume'] = addedTransDFVol['volume'] * addedTransDFVol['open_close_type']
	addedTransDFVol['totalNetOpenVol'] = addedTransDFVol.groupby('containerID')['signedVolume'].cumsum()
	startOpenVol =  oldTransactionDF[['containerID','open_volume']].groupby('containerID').tail(1)
	joined = pd.merge(addedTransDFVol, startOpenVol, how="left", left_on='containerID', right_on='containerID').fillna(0)
	joined['addedTransNetOpenVol'] = joined['totalNetOpenVol']+joined['open_volume']
	return list(joined.loc[joined['addedTransNetOpenVol']<0]['containerID'].unique())

def invalidMissTrans(addedTransDF, oldTransactionDF):
	joined = pd.concat([addedTransDF, oldTransactionDF], ignore_index=True).sort_values(['containerID', 'transaction_date', 'transactionID'], ignore_index=True)
	joined['signedVolume'] = joined['volume'] * joined['open_close_type']
	joined['containerOpenVol'] = joined.groupby('containerID')['signedVolume'].cumsum()
	return list(joined.loc[joined['containerOpenVol']<0]['containerID'].unique())

def getTransactions(data):
	transaction_df = appData.tables['transactions']
	if('container_list' in data):
		transaction_df = transaction_df.loc[(transaction_df['containerID'].isin(data['container_list']))]
	ret_data = {'transactions': transaction_df}
	return ret_data

def setOpenCloseType(open_close_type):
	if(open_close_type=='open'):
		return 1
	return -1

def getContainerTransactions(data):
	containerID = int(data.get('containerID'))
	transactions = appData.tables['transactions']
	containers = appData.tables['containers']
	container_set = set(containers.loc[containers['parentContainerID']==containerID]['containerID'])
	container_set.add(containerID)
	transactions = transactions.loc[transactions['containerID'].isin(container_set)]
	return transactions.sort_values(['transaction_date', 'transactionID']).to_json(orient="records")
	
def autoCloseAllOpenExpiredContainers(data):
	def setTransactionDF():
		containers = appData.tables['containers'][['containerID', 'allowedInstrumentID', 'open_volume', 'closeDate', 'containerTypeID']]
		instruments = appData.tables['instruments']
		transactions = appData.tables['transactions']
		currDate = datetime.datetime.now()
		expiredOpenContainers = containers.loc[(containers['closeDate']<currDate) & (containers['open_volume']>0)]
		expiredOpenContainers = pd.merge(expiredOpenContainers, instruments[['instrument_token', 'underlyingPriceAtExpiry', 'strike']], how ="left", left_on="allowedInstrumentID", right_on="instrument_token").drop(columns=['instrument_token'])
		expiredOpenContainers = expiredOpenContainers.loc[expiredOpenContainers['underlyingPriceAtExpiry'].notna()]
		expiredOpenContainers['closePrice'] = 0
		expiredOpenContainers.loc[expiredOpenContainers['containerTypeID']==4, 'closePrice'] = expiredOpenContainers['underlyingPriceAtExpiry']
		expiredOpenContainers.loc[expiredOpenContainers['containerTypeID']==5, 'closePrice'] = expiredOpenContainers['underlyingPriceAtExpiry'] - expiredOpenContainers['strike']
		expiredOpenContainers.loc[expiredOpenContainers['containerTypeID']==6, 'closePrice'] = expiredOpenContainers['strike'] - expiredOpenContainers['underlyingPriceAtExpiry']
		expiredOpenContainers.loc[expiredOpenContainers['closePrice']<0, 'closePrice'] = 0
		expiredOpenContainers['closePrice'] = expiredOpenContainers['closePrice'] * 100
		currTransactionID = transactions['transactionID'].max()
		currTransactionID = 0 if pd.isna(currTransactionID) else currTransactionID+1
		expiredOpenContainers['transactionID'] = expiredOpenContainers.index + currTransactionID
		expiredOpenContainers = expiredOpenContainers.rename(columns={"allowedInstrumentID": 'instrumentID', "open_volume": "volume", 'closeDate': 'transaction_date', 'closePrice': 'price'}).drop(columns=['containerTypeID', 'underlyingPriceAtExpiry' ,'strike'])
		expiredOpenContainers['transaction_fees'] = 0
		expiredOpenContainers['exchange_traded'] = True
		expiredOpenContainers['open_close_type'] = -1
		return expiredOpenContainers
	def setStrategyAssignDF(transactionDF):
		strategyContainers = appData.tables['strategyContainers'][['strategyID', 'containerID', 'openVolume']]
		strategyContainers = strategyContainers.loc[(strategyContainers['containerID'].isin(transactionDF['containerID'])) & (strategyContainers['openVolume']>0)]
		strategyAssignDF = pd.merge(strategyContainers, transactionDF[['containerID', 'volume', 'transactionID', 'open_close_type']], how='left', left_on='containerID', right_on='containerID').rename(columns={'openVolume': 'assignVolume', 'volume': 'transactionVolume', 'open_close_type': 'openClose'})
		return strategyAssignDF

	transactionDF = setTransactionDF()
	strategyAssignDF = setStrategyAssignDF(transactionDF)
	return addTransactions(transactionDF, strategyAssignDF)

def initSubscribedInstrumentCount():
	instruments = appData.tables['instruments'][['instrument_token', 'delisted', 'isUnderlyingInstrument']].set_index("instrument_token")
	containers = appData.tables['containers'][['containerID', 'allowedInstrumentID', 'underlyingInstrumentID', 'open_volume', 'containerTypeID']]
	containers = containers.loc[(containers['open_volume']>0) & (containers['containerTypeID']!=3)]
	instrumentList = (containers['allowedInstrumentID'])
	underlyingInstruments = instruments.loc[instruments['isUnderlyingInstrument']].index.to_list()
	instrumentList = instrumentList.append(pd.Series(underlyingInstruments))
	instrumentList = instrumentList.value_counts().to_frame(name="count")
	instrumentList['delisted'] = instruments['delisted']
	instrumentList = instrumentList.loc[~instrumentList['delisted']]
	instrumentList = instrumentList.drop(columns=['delisted'])
	appData.subscribedInstrumentCount = instrumentList

def subtractContainerFromSubscribedInstrumentCount(containerSet):
	delisted = appData.tables['instruments'][['instrument_token', 'delisted']].set_index('instrument_token')[['delisted']]
	subscribedInstrumentCount = appData.subscribedInstrumentCount
	containers = appData.tables['containers'][['containerID', 'allowedInstrumentID', 'underlyingInstrumentID', 'open_volume', 'containerTypeID']]
	containers = containers.loc[(containers['containerID'].isin(containerSet)) & (containers['open_volume']>0) & (containers['containerTypeID']!=3)]
	# instrumentList = containers['allowedInstrumentID'].append(containers['underlyingInstrumentID'].dropna()).value_counts().to_frame(name="decrement")
	instrumentList = containers['allowedInstrumentID'].value_counts().to_frame(name="decrement")
	instrumentList = pd.merge(instrumentList, delisted, how="left", left_index=True, right_index=True)
	instrumentList = instrumentList.dropna(subset=['delisted'])
	instrumentList = instrumentList.loc[~(instrumentList['delisted'])]
	subscribedInstrumentCount.loc[instrumentList.index, 'count'] = subscribedInstrumentCount['count'] - instrumentList['decrement']
	deletedInstruments = set(subscribedInstrumentCount.loc[subscribedInstrumentCount['count']==0].index)
	appData.subscribedInstrumentCount = subscribedInstrumentCount.loc[subscribedInstrumentCount['count']!=0]
	return deletedInstruments

def addContainerToSubscribedInstrumentCount(containerSet):
	delisted = appData.tables['instruments'][['instrument_token', 'delisted']].set_index('instrument_token')[['delisted']]
	subscribedInstrumentCount = appData.subscribedInstrumentCount
	containers = appData.tables['containers'][['containerID', 'allowedInstrumentID', 'underlyingInstrumentID', 'open_volume', 'containerTypeID']]
	containers = containers.loc[(containers['containerID'].isin(containerSet)) & (containers['open_volume']>0) & (containers['containerTypeID']!=3)]
	# instrumentList = containers['allowedInstrumentID'].append(containers['underlyingInstrumentID'].dropna()).value_counts().to_frame(name="increment")
	instrumentList = containers['allowedInstrumentID'].value_counts().to_frame(name="increment")
	instrumentList = pd.merge(instrumentList, delisted, how="left", left_index=True, right_index=True)
	instrumentList = instrumentList.dropna(subset=['delisted'])
	instrumentList = instrumentList.loc[~(instrumentList['delisted'])]
	subscribedInstrumentCount = pd.merge(subscribedInstrumentCount, instrumentList, how="outer", left_index=True, right_index=True)
	addedInstruments = set(subscribedInstrumentCount.loc[subscribedInstrumentCount['count'].isna()].index)
	subscribedInstrumentCount = subscribedInstrumentCount.fillna(0)
	subscribedInstrumentCount['count']+=subscribedInstrumentCount['increment']
	appData.subscribedInstrumentCount = subscribedInstrumentCount.drop(columns=['increment'])
	return addedInstruments
