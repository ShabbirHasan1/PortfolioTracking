import pandas as pd
import datetime
import numpy as np
import directEquityLogic as deLogic
import aifLogic
import mutualFundLogic as mfLogic
import appData
import math
import transactionLogic as transaction
import accountingLogic as accounts
import instrumentLogic as instrument
from pprint import pprint
import copy

def setNewContainerObject(data):
	container_df = appData.tables['containers']
	currContainerID = container_df['containerID'].max()
	currContainerID = 0 if math.isnan(currContainerID) else currContainerID+1
	new_container = {
		'containerID': currContainerID,
		'ownerProfileID': data['ownerProfileID'],
		'containerTypeID': 1,
		'containerName': data['containerName'],
		'openDate': pd.to_datetime(data['openDate']),
		'bookedProfitStartDate': pd.to_datetime(data['openDate']),
		'groupID': None if(data.get('groupID', "")=="")else int(data['groupID']),
		'buy_sell_type': None
	}
	return new_container

def setTransactionObject(data, transactionIdOffset):
	transaction_df = appData.tables['transactions']
	currTransactionID = transaction_df['transactionID'].max()
	currTransactionID = (0 if math.isnan(currTransactionID) else currTransactionID+1)+transactionIdOffset
	transactionContainerID = deLogic.getOrCreateTransactionContainer(data)
	transaction = {
		'transactionID': currTransactionID,
		'containerID': transactionContainerID,
		'instrumentID': (data['instrumentID']),
		'price': int(float(data['price'])),
		'volume': int(data['volume']),
		'transaction_date': pd.to_datetime(data['transaction_date']),
		'transaction_fees': float(data['transaction_fees']),
		'instrumentTypeID': instrument.getInstrumentTypeID(data['instrumentID']),
		'exchange_traded': data['exchangeTransaction'],
		'open_close_type': 1 if (data['open_close_type']=='open') else -1
	}
	return transaction

def calculateContainerTransactionReturns(transactionData):
	i=0;
	num_transactions = transactionData.shape[0]
	transactionsReturns = []
	while(i<num_transactions):
		containerInstrumentTransactionsReturns = accounts.calculateContainerInstrumentReturnsOnTransactions(transactionData, i);
		i = containerInstrumentTransactionsReturns['startIdx']
		containerInstrumentTransactionsReturns = containerInstrumentTransactionsReturns['curr_instrument_returns']
		transactionsReturns.extend(containerInstrumentTransactionsReturns)
	transactionsReturns.sort(key = lambda x: x['date'])
	for transactionReturns in transactionsReturns:
		for key, value in transactionReturns.items():
			transactionReturns[key] = str(transactionReturns[key])
	
	return transactionsReturns

def calculateContainerAccounts(transactionData, dates, startIdx):
	date_format = '%Y-%m-%d';
	columns = accounts.set_columns(transactionData)
	# currContainerName = columns['containerName_col'][startIdx]
	currContainerId = columns['containerIDs_col'][startIdx]
	num_transactions = transactionData.shape[0]
	i = startIdx
	combined_open_position = None
	instrument_open_position = None
	combined_historical_position = None
	instrument_historical_positions = None
	combinedBookedProfitPriorBookedProfitStartDate = None
	instrumentBookedProfitPriorBookedProfitStartDate = None
	delistedInstruments = []

	while(i<num_transactions and columns['containerIDs_col'][i]==currContainerId):
		currInstrumentId = columns['instrumentIDs_col'][i]
		currInstrumentDelisted = columns['delisted_col'][i]
		curr_instrument_returns_obj = accounts.calculateContainerInstrumentAccountsAndOpenPosition(transactionData, dates, i)
		if(currInstrumentDelisted and int(curr_instrument_returns_obj['instrumentOpenPosition']['open_volume'])>0):delistedInstruments.append(str(currInstrumentId))
		if(combined_open_position==None):
			combined_open_position = { key: curr_instrument_returns_obj['instrumentOpenPosition'][key] for key in ['date', 'open_exposure', 'open_volume'] }
			instrument_open_position = {str(currInstrumentId): curr_instrument_returns_obj['instrumentOpenPosition']}
			combined_historical_position = copy.deepcopy(curr_instrument_returns_obj['instrumentReturns'])
			# combined_tax_Obj = copy.deepcopy(curr_instrument_returns_obj['instrumentTaxObj'])
			instrument_historical_positions = {str(currInstrumentId): curr_instrument_returns_obj['instrumentReturns']}
			combinedBookedProfitPriorBookedProfitStartDate = curr_instrument_returns_obj['profitPriorBookedProfitStartDate']
			instrumentBookedProfitPriorBookedProfitStartDate = {str(currInstrumentId): str(curr_instrument_returns_obj['profitPriorBookedProfitStartDate'])}
			instrumentTaxObj = {str(currInstrumentId): curr_instrument_returns_obj['instrumentTaxObj']}

		else:
			curr_instrument_open = curr_instrument_returns_obj['instrumentOpenPosition']
			curr_instrument_historical = curr_instrument_returns_obj['instrumentReturns']
			combined_open_position['date'] = str(min(datetime.datetime.strptime(combined_open_position['date'], date_format), datetime.datetime.strptime(curr_instrument_open['date'], date_format)).date());
			combined_open_position['open_exposure'] = str(int(combined_open_position['open_exposure']) + int(curr_instrument_open['open_exposure']))
			combined_open_position['open_volume'] = str(int(combined_open_position['open_volume']) + int(curr_instrument_open['open_volume']))
			instrument_open_position[str(currInstrumentId)] = curr_instrument_open
			instrument_historical_positions[str(currInstrumentId)] = curr_instrument_historical
			combinedBookedProfitPriorBookedProfitStartDate = str(int(combinedBookedProfitPriorBookedProfitStartDate)+int(curr_instrument_returns_obj['profitPriorBookedProfitStartDate']))
			instrumentBookedProfitPriorBookedProfitStartDate[str(currInstrumentId)] = str(curr_instrument_returns_obj['profitPriorBookedProfitStartDate'])
			instrumentTaxObj[str(currInstrumentId)] = curr_instrument_returns_obj['instrumentTaxObj']
			for date_key in combined_historical_position:
				curr_date_combined_historical_obj = combined_historical_position[date_key]
				curr_date_instrument_historical_obj = curr_instrument_historical[date_key]
				curr_date_combined_historical_obj['open_exposure'] = str(int(curr_date_combined_historical_obj['open_exposure']) + int(curr_date_instrument_historical_obj['open_exposure']))
				curr_date_combined_historical_obj['open_volume'] = str(int(curr_date_combined_historical_obj['open_volume']) + int(curr_date_instrument_historical_obj['open_volume']))
				curr_date_combined_historical_obj['closed_exposure'] = str(int(curr_date_combined_historical_obj['closed_exposure']) + int(curr_date_instrument_historical_obj['closed_exposure']))
				curr_date_combined_historical_obj['closed_volume'] = str(int(curr_date_combined_historical_obj['closed_volume']) + int(curr_date_instrument_historical_obj['closed_volume']))
				curr_date_combined_historical_obj['closed_tax'] = str(int(curr_date_combined_historical_obj['closed_tax']) + int(curr_date_instrument_historical_obj['closed_tax']))
				curr_date_combined_historical_obj['closed_profits'] = str(int(curr_date_combined_historical_obj['closed_profits']) + int(curr_date_instrument_historical_obj['closed_profits']))
				curr_date_combined_historical_obj['open_value'] = str(int(curr_date_combined_historical_obj['open_value']) + int(curr_date_instrument_historical_obj['open_value']))

		i = curr_instrument_returns_obj["startIdx"]

	containerInstrumentId = columns['instrumentIDs_col'][startIdx]
	combinedTaxes = calcCombinedTaxObj(instrumentTaxObj)
	data_obj = {
		"current_open_positions": {
			"combined_open_position": combined_open_position,
			"instrument_open_pos": instrument_open_position
		},
		"historical_positions": {
			"combined_historical_position": combined_historical_position,
			"instrument_historical_positions": instrument_historical_positions,
			"profit_prior_booked_profit_start_date":{
				"combined_closed_profit_prior_to_start_date": combinedBookedProfitPriorBookedProfitStartDate,
				"instrument_closed_prift_prior_to_start_date": instrumentBookedProfitPriorBookedProfitStartDate
			}
		},
		"delistedInstruments": delistedInstruments,
		"taxObj": {
			"combinedTax": combinedTaxes,
			"instrumentTax": instrumentTaxObj
		}
	}
	ret_data = {
		"data_obj": data_obj,
		"startIdx": i
	}
	return ret_data

def calcCombinedTaxObj(instrumentTaxObj):
	ret = {}
	for instrumentId in instrumentTaxObj:
		instrumentTax = instrumentTaxObj[instrumentId]
		for year in instrumentTax:
			combinedYear = ret.get(year, {})
			instrumentTaxYear = instrumentTaxObj[instrumentId][year]
			for taxBucket in instrumentTaxYear:
				combinedYear[taxBucket] = combinedYear.get(taxBucket, 0) + instrumentTaxYear[taxBucket]
			ret[year] = combinedYear
	# print(ret)
	return ret
