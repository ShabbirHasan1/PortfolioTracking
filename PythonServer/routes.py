import pandas as pd
import json
import containerLogic as container
import userLogic as users
import instrumentLogic as instrument
import transactionLogic as transaction
import accountingLogic as accounts
import groupLogic as group
import watchlistLogic as watchlist
import strategyLogic as strategy
import lendingLogic as lending
import psutil
from pprint import pprint
import appData
import dailyDataUpdate
import time

baseDir = '/Users/lakshdang/Documents/PortfolioTracking/Data/'

def route(path, data):
	appData.setUpdatedInfoObject()
	ret = None
	
	if(path=='/addAuthorizedUser'):
		ret = users.addAuthorizedUser(data)

	if(path=='/authenticateUser'):
		return users.authenticateUser(data)

	if(path=='/getUser'):
		return users.getUser(data)

	if(path=='/addContainer'):
		ret = container.addPortfolio(data)

	if(path=='/addTransactions'):
		ret = transaction.addUserInputTransactions(data)

	if(path=='/createGroup'):
		ret = group.createGroup(data)

	if(path=='/updateMultipleContainerGroups'):
		ret = container.updateContainerGroups(data)

	if(path=='/updateSingleContainerGroup'):
		ret = container.updateSingleContainerGroup(data)

	if(path=='/containerPageData'):
		return transaction.getContainerTransactions(data)

	if(path=='/pageData'):
		return getPageData(data)

	if(path=='/updateContainersBookedProfitStartDate'):
		ret = container.updateContainersBookedProfitStartDate(data)

	if(path=='/getSubscribedInstruments'):
		return instrument.getSubscribedInstruments(data)

	if(path=='/addInstrumentToWatchlist'):
		ret = watchlist.addInstrumentToWatchList(data)
	
	if(path=='/deleteInstrumentFromWatchlist'):
		ret = watchlist.removeInstrumentFromWatchlist(data)

	if(path=='/createWatchlist'):
		ret = watchlist.createWatchList(data)

	if(path=='/updateContainersToSingleGroup'):
		ret = container.updateContainersToSingleGroup(data)

	if(path=="/createStrategy"):
		ret = strategy.createStrategy(data)

	if(path=='/dailyDataUpdate'):
		ret = dailyDataUpdate.dailyDataUpdate()
		appData.incrementAppDataVersionId()
		ret["dataVersionId"] = appData.appStateObj['dataVersionId']
		return ret

	if(path=='/setSocketOptionChain'):
		return instrument.setSocketOptionChain(data)

	if(path=='/setKiteAccessToken'):
		ret = dailyDataUpdate.initKite(data)
		appData.incrementAppDataVersionId()
		ret["dataVersionId"] = appData.appStateObj['dataVersionId']
		return ret
	
	if(path=='/getInstrumentSearchList'):
		return instrument.getSearchInstrumentList(data)

	if(path=='/closeAllExpiredOpenContainers'):
		ret = transaction.autoCloseAllOpenExpiredContainers(data)

	if(path=='/getStrategySpreadData'):
		return strategy.getStrategySpreadData(data)

	if(path=="/longTestRoute1"):
		time.sleep(1)
		return {"error": False}

	if(path=="/longTestRoute2"):
		time.sleep(10)
		return {"error": False}

	if(path=="/getStrategyExpectedReturnsSpreadOnDate"):
		return strategy.getStrategyExpectedReturnsSpreadOnDate(data)

	if(path=="/addLoan"):
		 ret = lending.addLoan(data)

	if(path=="/getLoanPayments"):
		return lending.getLoanPayments(data)

	# will uncomment this after we update add transaction logic to not create new
	# containers if transactions are invalid
	# if(not ret["error"]):
	# 	ret.update(appData.updatedInfoObject)
	# 	appData.incrementAppDataVersionId()
	# 	ret["dataVersionId"] = appData.appStateObj['dataVersionId']
	
	ret.update(appData.updatedInfoObject)
	appData.incrementAppDataVersionId()
	ret["dataVersionId"] = appData.appStateObj['dataVersionId']

	return ret

def getPageData(data):
	ret_data = {};
	ret_data.update(group.getAllGroups(data))
	ret_data.update(users.getInstrumemntOwners(data))
	ret_data.update({"accounts": accounts.getAccounts(data)})
	ret_data.update(container.getAllContainers(data))
	ret_data.update(container.getContainerTypesData(data))
	ret_data.update(watchlist.getAllWatchlistsWithInstruments(data))
	ret_data.update(instrument.getSubscribedInstruments(data))
	ret_data["dataVersionId"] = appData.appStateObj['dataVersionId']
	ret_data.update(strategy.getStrategiesInfoObj())
	ret_data['underlyingInstruments'] = instrument.getUnderlyingInstruments()
	ret_data['loans'] = lending.getAllLoansInfo()
	return ret_data
