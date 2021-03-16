import pandas as pd
import json
import containerLogic as container
import instrumentLogic as instrument
import transactionLogic as transaction
import datetime
from collections import deque
import bisect
import appData
import taxLogic
from pprint import pprint
import numpy as np
import copy
from operator import itemgetter

returnDates = []

pd.set_option('display.max_columns', 500)

def initAccounts():
	appData.container_accounts = {};
	accounts = appData.container_accounts
	transactions = appData.tables['transactions']
	setReturnsDates()
	ret = updateContainerAccounts(transactions.copy(deep=True))
	return ret

def dailyDataUpdate():
	# transactions = appData.tables['transactions']
	# containers = appData.tables['containers']
	# containers = containers.loc[containers['open_volume']>0]
	# transactions = transactions.loc[transactions['containerID'].isin(set(containers['containerID']))]
	# clearPortfolioAccountsHistoricalReturns()
	# setReturnsDates()
	# ret = updateContainerAccounts(transactions.copy())
	return initAccounts()
	# return ret

def calcAddedTransContainerAccounts(addedTransDF, oldTransactionDF):
	temp = addedTransDF[:].to_dict(orient="records")
	newTransactionContainerQueues = pd.DataFrame({'containerID': addedTransDF['containerID'], 'transactionInfo': temp}).groupby('containerID').agg(list).to_dict(orient="index")
	containerOpenPos = oldTransactionDF.groupby('containerID')[['containerID','transaction_date', 'closed_profit','closed_exposure','closed_volume','open_exposure','open_volume']].tail(1).set_index('containerID').to_dict(orient="index")
	oldTransactionDF = oldTransactionDF.loc[oldTransactionDF['transaction_open_volume']>0]
	openTransactionContainerQueues = pd.DataFrame({'containerID': oldTransactionDF['containerID'], 'transactionInfo': oldTransactionDF.drop(columns=['containerTypeID', 'ownerProfileID', 'long_short_type', 'buy_sell_type'])[:].to_dict(orient="records")}).groupby('containerID').agg(list).to_dict(orient="index")
	updatedAndAddedTransactions = []
	for containerID in newTransactionContainerQueues:
		currContainerOpenPos = containerOpenPos.get(containerID, emptyOpenPosObj())
		containerOpenQueue = deque(openTransactionContainerQueues.get(containerID, {"transactionInfo": deque()})['transactionInfo'])
		containerNewtransactionQueue = deque(newTransactionContainerQueues.get(containerID)['transactionInfo'])
		updatedContainerTransactions = caclSingleContainerAddedTransAcc(containerNewtransactionQueue, containerOpenQueue, currContainerOpenPos, containerID)
		updatedAndAddedTransactions.extend(updatedContainerTransactions)

	return updatedAndAddedTransactions

def caclSingleContainerAddedTransAcc(newTransactionList, openTransactionsQueue, containerOpenPos, containerID):
	containers = appData.tables['containers']
	buy_sell_type = containers.loc[containers['containerID']==containerID].reset_index().iloc[0]['buy_sell_type']
	buySellMult = 1 if(buy_sell_type=="Buy") else -1
	processedTransactions = deque()
	processedTransactionsDict = {}
	closed_profit, closed_exposure, closed_volume, open_volume, open_exposure = itemgetter('closed_profit', 'closed_exposure', 'closed_volume', 'open_volume', 'open_exposure')(containerOpenPos)
	while(len(newTransactionList)>0):
		currTransaction = newTransactionList.popleft()
		open_close_type, price, transactionID, transaction_date, transaction_fees, volume = itemgetter('open_close_type', 'price', 'transactionID', 'transaction_date', 'transaction_fees', 'volume')(currTransaction)
		transaction_profit = None
		transaction_open_date = None
		transaction_closed_exposure = None
		# transaction_tax = 0
		if(open_close_type == 1):
			open_volume += volume
			open_exposure += price*volume
			currTransaction['open_volume'] = open_volume
			currTransaction['open_exposure'] = open_exposure
			currTransaction['transaction_open_volume'] = volume
			currTransaction['closed_exposure'] = closed_exposure
			currTransaction['closed_profit'] = closed_profit
			currTransaction['closed_volume'] = closed_volume
			currTransaction['transaction_profit'] = 0
			currTransaction['transaction_open_date'] = transaction_open_date
			currTransaction['transaction_closed_exposure'] = transaction_closed_exposure
			openTransactionsQueue.append(currTransaction)
			processedTransactionsDict[transactionID] = currTransaction
		if(open_close_type == -1):
			transaction_profit = 0
			transaction_closed_exposure = 0
			transaction_profit = 0
			transaction_open_date = str(openTransactionsQueue[0]['transaction_date'].date())
			rem_volume = volume
			while(rem_volume>0):
				open_transaction = openTransactionsQueue[0]
				temp = rem_volume
				curr_shares_sold = min(open_transaction['transaction_open_volume'], rem_volume)
				open_exposure -= curr_shares_sold*open_transaction['price']
				closed_volume += curr_shares_sold
				closed_exposure += curr_shares_sold*open_transaction['price']
				transaction_closed_exposure += curr_shares_sold*open_transaction['price']
				transaction_profit += curr_shares_sold*(price - open_transaction['price'])*buySellMult
				closed_profit += curr_shares_sold*(price-open_transaction['price'])*buySellMult
				rem_volume = max(0, temp - open_transaction['transaction_open_volume'])
				open_transaction['transaction_open_volume'] = max(0, open_transaction['transaction_open_volume']-temp)
				if(open_transaction['transaction_open_volume']==0):
					processedTransactionsDict[open_transaction['transactionID']] = open_transaction
					processedTransactions.append(openTransactionsQueue.popleft())
			
			# closed_volume += volume
			open_volume -= volume
			currTransaction['open_volume'] = open_volume
			currTransaction['open_exposure'] = open_exposure
			currTransaction['transaction_open_volume'] = None
			currTransaction['closed_exposure'] = closed_exposure
			currTransaction['closed_profit'] = closed_profit
			currTransaction['closed_volume'] = closed_volume
			currTransaction['transaction_profit'] = transaction_profit
			currTransaction['transaction_open_date'] = transaction_open_date
			currTransaction['transaction_closed_exposure'] = transaction_closed_exposure
			processedTransactions.append(currTransaction)
			processedTransactionsDict[transactionID] = currTransaction

	if(len(openTransactionsQueue)>0): processedTransactionsDict[openTransactionsQueue[0]['transactionID']] = openTransactionsQueue[0]

	return list(processedTransactionsDict.values())

def emptyOpenPosObj():
	return {'closed_exposure': 0,'closed_profit': 0,'closed_volume': 0,'open_exposure': 0,'open_volume': 0}

def calcMissTransContainerAccounts(addedTransDF, oldTransactionDF):
	allTransactions = pd.concat([addedTransDF, oldTransactionDF], ignore_index=True)
	allTransactions['transactionInfo'] = allTransactions[:].to_dict(orient="records")
	containerTransactionLists = allTransactions.sort_values(['containerID', 'transaction_date', 'transactionID'], ignore_index=True)[['containerID', 'transactionInfo']].groupby('containerID').agg(list).to_dict(orient="index")
	updatedAndAddedTransactions = []
	for containerID in containerTransactionLists:
		currContainerTransactionQueue = deque(containerTransactionLists[containerID]['transactionInfo'])
		updatedContainerTransactions = caclSingleContainerAccountsFromInception(currContainerTransactionQueue, containerID)
		updatedAndAddedTransactions.extend(updatedContainerTransactions)

	return updatedAndAddedTransactions

def caclSingleContainerAccountsFromInception(transactionList, containerID):
	return caclSingleContainerAddedTransAcc(transactionList, deque(), emptyOpenPosObj(), containerID)

def updateContainerAccounts(containerTransactions):
	accounts = appData.container_accounts
	containers = appData.tables['containers']
	containerOpenPos = containers.loc[containers['containerID'].isin(containerTransactions['containerID'])][['containerID',"firstOpenTransactionDate","closed_exposure","closed_volume","open_exposure","open_volume","transaction_profit","closed_profit"]]
	containerOpenPos['containerOpenPos'] = containerOpenPos[["firstOpenTransactionDate","closed_exposure","closed_volume","open_exposure","open_volume","transaction_profit","closed_profit"]].to_dict(orient="records")
	containerOpenPos = containerOpenPos[['containerID', 'containerOpenPos']].set_index('containerID').to_dict(orient='index')
	updatedAccounts = getContainerAccountsOnDates(containerTransactions, returnDates)
	for containerID in updatedAccounts:
		containerAccounts = {
			"historical_positions": updatedAccounts[containerID],
			'open_position': copy.deepcopy(updatedAccounts[containerID][str(returnDates[-1].date())]),
			"profitPriorBookedProfitStartDate": 0
		}
		containerAccounts['open_position']['firstOpenTransactionDate'] = None if(pd.isna(containerOpenPos[containerID]['containerOpenPos']['firstOpenTransactionDate'])) else containerOpenPos[containerID]['containerOpenPos']['firstOpenTransactionDate']
		updatedAccounts[containerID] = containerAccounts

	calculatePortfolioContainerAccounts(updatedAccounts)
	accounts.update(updatedAccounts)
	appData.updatedInfoObject['updatedAccounts'].update(updatedAccounts)
	return updatedAccounts

def getContainerAccountsOnDates(transactionDF, dates):
	containers = appData.tables['containers']
	instruments = appData.tables['instruments']
	transactionDF['index'] = transactionDF.index
	for date in dates:
		transactionDF[str(date.date())] = np.nan
		transactionDF.loc[transactionDF['transaction_date']<=date, str(date.date())] = transactionDF['index']
	dateStrings = [str(date.date()) for date in dates]
	transaction_returns = transactionDF.groupby('containerID', as_index=False)[dateStrings].max()
	transactionDF['transactionReturns'] = transactionDF[['open_volume', 'open_exposure', 'closed_exposure', 'closed_profit', 'closed_volume']].to_dict(orient="records")
	for date in dates:transaction_returns = pd.merge(transaction_returns, transactionDF[['index', 'transactionReturns']], how="left", left_on=str(date.date()), right_on="index").drop(columns=['index', str(date.date())]).rename(columns={"transactionReturns": str(date.date())})
	container_set = set(transactionDF['containerID'])
	transaction_returns = transaction_returns.set_index('containerID').to_dict(orient='index')
	containerInstruments = containers.loc[containers['containerID'].isin(container_set)][['containerID', 'allowedInstrumentID', 'containerTypeID', 'buy_sell_type']]
	containerInstruments = pd.merge(containerInstruments, instruments[['instrument_token', 'instrumentType', 'underlyingInstrument', 'expiry', 'strike', 'underlyingPriceAtExpiry', 'displayName']], how='left', left_on='allowedInstrumentID', right_on='instrument_token')
	containerInsrumentMap = containerInstruments[['containerID', 'allowedInstrumentID', 'underlyingInstrument','expiry', 'strike', 'underlyingPriceAtExpiry', 'containerTypeID', 'buy_sell_type']].set_index('containerID').to_dict(orient='index')
	historicalPrices = instrument.getInstrumentHistoricalAndUnderlyingPrices(containerInstruments, dates)
	for containerID in transaction_returns:
		containerReturns = transaction_returns[containerID]
		buySellMult = 1 if(containerInsrumentMap[containerID]['buy_sell_type']=="Buy") else -1
		containerTypeID = containerInsrumentMap[containerID]['containerTypeID']
		instrumentID = containerInsrumentMap[containerID]['allowedInstrumentID']
		instrumentExpiry = containerInsrumentMap[containerID]['expiry']
		underlyingPriceAtExpiry = containerInsrumentMap[containerID]['underlyingPriceAtExpiry']*100
		instrumentStrikePrice = containerInsrumentMap[containerID]['strike']*100
		instrumentHistPrices = historicalPrices.get(instrumentID, None)
		for date in containerReturns:
			if(not isinstance(containerReturns[date], dict)):
				containerReturns[date] = None
				continue
			currDateReturns = copy.deepcopy(containerReturns[date])
			currDateReturns['curr_price'] = 0 if (instrumentHistPrices is None) else int(instrumentHistPrices[date]*100)
			if(pd.isna(instrumentExpiry) or pd.isna(underlyingPriceAtExpiry)):
				currDateReturns['open_value'] = currDateReturns['open_volume']*currDateReturns['curr_price']
			else:
				currDateReturns['curr_price'] = (appData.containerTypeFunctions[containerTypeID].getDerivativeClosePriceAfterExpiry(int(instrumentStrikePrice), int(underlyingPriceAtExpiry)))
				currDateReturns['open_value'] = currDateReturns['curr_price'] * currDateReturns['open_volume']
			currDateReturns['open_profit'] = (currDateReturns['open_value'] - currDateReturns['open_exposure'])*buySellMult
			containerReturns[date] = currDateReturns
	return transaction_returns

def getAccounts(data):
	return appData.container_accounts

def calculatePortfolioContainerAccounts(newBaseAccounts):
	accounts = appData.container_accounts
	containers = appData.tables['containers']
	childrenContainers = containers.loc[containers['containerID'].isin(newBaseAccounts.keys()) & containers['parentContainerID'].notna()][['containerID', 'parentContainerID']]
	portfolioContainerMap = childrenContainers.groupby('parentContainerID')['containerID'].apply(list).to_dict()
	for pfContainerID in portfolioContainerMap:
		curr_pfAccounts = accounts.get(int(pfContainerID), newPfAccountsObj())
		for childContainer in portfolioContainerMap[pfContainerID]:
			old_childAccounts = accounts.get(childContainer, None)
			new_childAccounts = newBaseAccounts[childContainer]
			subtractChildAccountfromPortfolio(curr_pfAccounts, old_childAccounts)
			addChildAccountToPortfolio(curr_pfAccounts, new_childAccounts)
		# accounts[int(pfContainerID)] = curr_pfAccounts
		newBaseAccounts[int(pfContainerID)] = curr_pfAccounts

def newPfAccountsObj():
	historical_positions = {}
	for date in returnDates:
		historical_positions[str(date.date())] = {
			'closed_exposure': 0,
			'closed_profit': 0,
			# 'closed_tax': 0,
			'closed_volume': 0,
			'open_exposure': 0,
			'open_value': 0,
			'open_volume': 0,
			'open_profit': 0
		}
	return {
		"open_position": {
			'open_exposure': 0,
			'open_profit': 0,
			'open_value': 0,
			'open_volume': 0
		},
		"historical_positions": historical_positions,
		"profitPriorBookedProfitStartDate":0
	}

def subtractChildAccountfromPortfolio(pfAccounts, oldChildAccounts):
	if(oldChildAccounts is None):return
	for key in pfAccounts['open_position']:pfAccounts['open_position'][key]-=oldChildAccounts['open_position'][key]
	for date in pfAccounts['historical_positions']:
		currDateReturnsObj = pfAccounts['historical_positions'][date]
		for key in currDateReturnsObj:
			if(oldChildAccounts['historical_positions'][date]==None): continue
			currDateReturnsObj[key]-=oldChildAccounts['historical_positions'][date][key]
	pfAccounts['profitPriorBookedProfitStartDate'] -= oldChildAccounts['profitPriorBookedProfitStartDate']

def addChildAccountToPortfolio(pfAccounts, newChildAccounts):
	for key in pfAccounts['open_position']:pfAccounts['open_position'][key] += newChildAccounts['open_position'][key]
	for date in pfAccounts['historical_positions']:
		currDateReturnsObj = pfAccounts['historical_positions'][date]
		for key in currDateReturnsObj:
			if(newChildAccounts['historical_positions'][date] is None): continue
			currDateReturnsObj[key] += newChildAccounts['historical_positions'][date][key]
	pfAccounts['profitPriorBookedProfitStartDate'] += newChildAccounts['profitPriorBookedProfitStartDate']

def setReturnsDates():
	global returnDates
	today = (datetime.datetime.now()).date()
	today = datetime.datetime.combine(today, datetime.time())
	dates_arr = [today, lastWorkingDay(today), today-datetime.timedelta(days=(7)), today-datetime.timedelta(days=(30)), today-datetime.timedelta(days=(30*3)), today-datetime.timedelta(days=(30*6)), today-datetime.timedelta(days=(365))]
	dates_arr.reverse()
	returnDates = dates_arr

def lastWorkingDay(day):
	return day - datetime.timedelta(days=max(1, day.weekday()-3))
