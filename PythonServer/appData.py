import pandas as pd
import accountingLogic as accounts
import watchlistLogic as watchlist
from pprint import pprint
import directEquityLogic as deLogic
import pmsLogic
import aifLogic
import mutualFundLogic as mfLogic
import futureLogic as futLogic
import callLogic as ceLogic
import putLogic as peLogic
import instrumentLogic as instrument
import json
import datetime
import transactionLogic as transaction
import sys
import lendingLogic as lending
import dailyDataUpdate

baseDir = None;
table_names = None;
date_cols = None;
# container_cols = None;
container_types_data = None;
# container_types_cols = None;
# transaction_cols = None;
tables = None;
kiteInfo = None;
container_accounts = None
subscribedInstrumentCount = None;
updatedInfoObject = None;
containerTypeFunctions = None;
trackedMfInstrumentsData = None;
appStateObj = None
saveChanges = None

def init(baseDirInput):
	# print("Starting appData init function")
	global baseDir;
	global table_names;
	global date_cols;
	global container_types_data;
	global container_accounts;
	global kiteInfo
	global updatedInfoObject
	global containerTypeFunctions
	global appStateObj
	global subscribedInstrumentCount

	setSaveChanges();
	setContainerTypeFunctionsObj();
	setUpdatedInfoObject();

	baseDir = baseDirInput
	table_names = ['users', 'containerTypes', 'containers', 'instrument_types', 'transactions', 'eq_instruments', 'groups', 'watchlists', 'watchlistInstruments', 'mf_instruments', 'de_instruments', 'strategies', 'strategyContainers', 'loans', 'loanPayments'];
	date_cols = [[], [], ['openDate', 'closeDate', 'bookedProfitStartDate'], [], ['transaction_date'], ['expiry'], [], [], [], [], ['expiry'], [], [], ['startDate', 'endDate'], ['date']]
	
	ret = initializeDataframes(baseDir, False);
	
	container_accounts = {}
	initAppStateObj()
	instrument.setInstruments()
	transaction.initTransactions()
	lending.initLending()
	accounts.initAccounts()
	watchlist.watchlistInit()
	kiteInfo = {
		"api_key": "7harnllatioi70jm",
		"access_token": "8mt3P3mioTZQqzuBYeshSxgA3xgLrrBq"
	}
	incrementAppDataVersionId()
	return ret;

def initializeDataframes(baseDir, newInit):
	global tables;
	dfs = dict()
	total_mem_used = 0;
	for idx, table_name in enumerate(table_names):
		curr_file = baseDir + table_name + ".json"
		curr_df = pd.read_json(curr_file, orient="split", dtype=False, convert_dates=date_cols[idx])
		dfs[table_name] = curr_df
	tables = dfs

def initAppStateObj():
	global appStateObj
	with open(baseDir+'appState.json') as f:
		appStateObj = json.load(f)

def incrementAppDataVersionId():
	appStateObj['dataVersionId'] = appStateObj['dataVersionId']+1
	with open(baseDir+'appState.json', 'w', encoding="utf-8") as f:
		json.dump(appStateObj, f)
	print(appStateObj)

def setContainerTypeFunctionsObj():
	global containerTypeFunctions
	containerTypeFunctions = {
		0: deLogic,
		1: pmsLogic,
		2: aifLogic,
		3: mfLogic,
		4: futLogic,
		5: ceLogic,
		6: peLogic
	}

def setUpdatedInfoObject():
	global updatedInfoObject
	updatedInfoObject = {
		"newContainerOwners": [],
		"newGroups": [],
		"updatedContainerGroups":{},
		"updatedWatchlists": {},
		"updatedContainers": {},
		"addedContainers": {},
		"updatedAccounts": {},
		"addedInstruments": [],
		"deletedInstruments": [],
		"addedStrategy": {},
		"updatedStrategyContainers": {},
		"addedLoan": {},
	}

def setSaveChanges():
	global saveChanges
	args = sys.argv
	if(len(args)>1 and args[1]=="saveChanges"):
		saveChanges = True
	else:
		saveChanges = False

# def getMemUsage():
	# 	table_mem_used = 0
	# 	curr_df_mem = curr_df.memory_usage(deep=True)
	# 	for idx, dtype_mem in curr_df_mem.items():
	# 		total_mem_used+=dtype_mem
	# 		table_mem_used+=dtype_mem
	# 	print(table_name + " mem used: " + str(table_mem_used));
	# print("total mem used: " + str(total_mem_used))
