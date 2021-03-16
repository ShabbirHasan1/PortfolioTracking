import pandas as pd
import datetime
import numpy as np
import pmsLogic
import aifLogic
import mutualFundLogic as mfLogic
import appData
import math
import containerLogic as container
import instrumentLogic as instrument
import accountingLogic as accounts
from pprint import pprint

def setNewContainerObject(data):
	container_df = appData.tables['containers']
	currContainerID = container_df['containerID'].max()
	currContainerID = 0 if math.isnan(currContainerID) else currContainerID+1
	instrumentInfo = instrument.getInstrumentInfo(data['instrumentID'])
	new_container = {
		'containerID': currContainerID,
		'ownerProfileID': data['ownerProfileID'],
		'containerTypeID': 0,
		'containerName': instrumentInfo['tradingsymbol'],
		'openDate': pd.to_datetime(data['transaction_date']),
		'bookedProfitStartDate': pd.to_datetime(data['transaction_date']),
		'allowedInstrumentID': str(data['instrumentID']),
		'groupID': None if(data.get('groupID', "")=="")else int(data['groupID']),
		'buy_sell_type': data.get("buy_sell_type", None),
		'parentContainerID': None if(data.get('containerID', "")=="")else int(data['containerID']),
		'underlyingInstrumentID': None if (pd.isna(instrumentInfo['underlyingInstrument'])) else instrumentInfo['underlyingInstrument'],
		'lot_size': 0 if(pd.isna(instrumentInfo['lot_size'])) else instrumentInfo['lot_size']
	}
	return new_container

def setTransactionObject(data, transactionIdOffset):
	transaction_df = appData.tables['transactions']
	currTransactionID = transaction_df['transactionID'].max()
	currTransactionID = (0 if math.isnan(currTransactionID) else currTransactionID+1)+transactionIdOffset
	transactionContainerID = getOrCreateTransactionContainer(data)
	transaction = {
		'transactionID': currTransactionID,
		'containerID': transactionContainerID,
		'instrumentID': str(data['instrumentID']),
		'price': int(float(data['price'])),
		'volume': int(data['volume']),
		'transaction_date': pd.to_datetime(data['transaction_date']),
		'transaction_fees': float(data['transaction_fees']),
		'exchange_traded': data['exchangeTransaction'],
		'instrumentTypeID': "EQ",
		'open_close_type': 1 if (data['open_close_type']=='open') else -1
	}
	return transaction

def getContainerByOwnerAndAllowedInstrumentId(ownerProfileID, containerTypeID, instrumentID):
	container_df = appData.tables['containers']
	curr_container = container_df.loc[(container_df['containerTypeID']==containerTypeID) & (container_df['allowedInstrumentID'].astype(str, errors="ignore")==str(instrumentID)) & (container_df['ownerProfileID']==ownerProfileID)]
	return None if (curr_container.empty) else curr_container

def getOrCreateTransactionContainer(transactionData):
	ownerProfileID = transactionData.get('ownerProfileID')
	instrumentID = transactionData.get('instrumentID')
	parentContainerID = int(transactionData.get('containerID', -1))
	buy_sell_type = transactionData.get('buy_sell_type', "Buy")
	containers = appData.tables['containers']
	transactionContainer = None
	if(parentContainerID==-1):
		transactionContainer = containers.loc[(containers['ownerProfileID']==ownerProfileID) & (containers['allowedInstrumentID']==instrumentID) & (containers['parentContainerID'].isna()) & (containers['buy_sell_type']==buy_sell_type)]
	else:
		transactionContainer = containers.loc[(containers['ownerProfileID']==ownerProfileID) & (containers['allowedInstrumentID']==instrumentID) & (containers['parentContainerID']==parentContainerID) & (containers['buy_sell_type']==buy_sell_type)]
	if(transactionContainer.empty):transactionContainer = container.addContainer(transactionData)['newContainer']
	return transactionContainer.iloc[0]['containerID']

def calculateContainerTransactionReturns(transactionData):
	return pmsLogic.calculateContainerTransactionReturns(transactionData)

def calculateContainerAccounts(transactionData, dates, startIdx):
	columns = accounts.set_columns(transactionData)
	currContainerId = columns['containerIDs_col'][startIdx];
	containerInstrumentId = columns['instrumentIDs_col'][startIdx]
	instrumentDelisted = columns['delisted_col'][startIdx]
	de_accounts = accounts.calculateContainerInstrumentAccountsAndOpenPosition(transactionData, dates, startIdx)
	data_obj = {
		"current_open_positions": {
			"combined_open_position": de_accounts['instrumentOpenPosition'],
			"instrument_open_pos": {
				str(containerInstrumentId): de_accounts['instrumentOpenPosition']
			}
		},
		"historical_positions": {
			"combined_historical_position": de_accounts['instrumentReturns'],
			"instrument_historical_positions": {
				str(containerInstrumentId): de_accounts['instrumentReturns']
			},
			"profit_prior_booked_profit_start_date":{
				"combined_closed_profit_prior_to_start_date": str(de_accounts['profitPriorBookedProfitStartDate']),
				"instrument_closed_prift_prior_to_start_date": {
					str(containerInstrumentId): str(de_accounts['profitPriorBookedProfitStartDate'])
				}
			}
		},
		"delistedInstruments": [str(containerInstrumentId)] if(instrumentDelisted and int(de_accounts['instrumentOpenPosition']['open_volume'])>0) else [],
		"taxObj": {
			"combinedTax": de_accounts['instrumentTaxObj'],
			"instrumentTax": {
				str(containerInstrumentId): de_accounts['instrumentTaxObj']
			}
		}
	}
	ret_obj = {
		"data_obj": data_obj,
		"startIdx": de_accounts["startIdx"]
	}
	return ret_obj