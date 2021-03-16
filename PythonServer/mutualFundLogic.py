import pandas as pd
import datetime
import numpy as np
import directEquityLogic as deLogic
import pmsLogic
import aifLogic
import appData
import math
import instrumentLogic as instrument
import containerLogic as container

def setNewContainerObject(data):
	container_df = appData.tables['containers']
	currContainerID = container_df['containerID'].max()
	currContainerID = 0 if math.isnan(currContainerID) else currContainerID+1
	instrumentInfo = instrument.getInstrumentInfo(data['instrumentID'])
	new_container = {
		'containerID': currContainerID,
		'ownerProfileID': data['ownerProfileID'],
		'containerTypeID': 3,
		'containerName': instrumentInfo['displayName'],
		'openDate': pd.to_datetime(data['transaction_date']),
		'bookedProfitStartDate': pd.to_datetime(data['transaction_date']),
		'allowedInstrumentID': str(data['instrumentID']),
		'groupID': None if(data.get('groupID', "")=="")else int(data['groupID']),
		'buy_sell_type': data.get("buy_sell_type", None),
		'parentContainerID': None if(data.get('containerID', "")=="")else int(data['containerID']),
		'underlyingInstrumentID': None if (pd.isna(instrumentInfo['underlyingInstrument'])) else instrumentInfo['underlyingInstrument']
	}
	return new_container

def setTransactionObject(data, transactionIdOffset):
	transaction_df = appData.tables['transactions']
	containerTypeId = int(data['containerTypeID'])
	currTransactionID = transaction_df['transactionID'].max()
	currTransactionID = (0 if math.isnan(currTransactionID) else currTransactionID+1)+transactionIdOffset
	transactionContainerID = deLogic.getOrCreateTransactionContainer(data)
	transaction = {
		'transactionID': currTransactionID,
		'containerID': transactionContainerID,
		'instrumentID': data['instrumentID'],
		'price': int(float(data['price'])),
		'volume': int(data['volume']),
		'transaction_date': pd.to_datetime(data['transaction_date']),
		'transaction_fees': float(data['transaction_fees']),
		'exchange_traded': data['exchangeTransaction'],
		'instrumentTypeID': "MF",
		'open_close_type': 1 if (data['open_close_type']=='open') else -1
	}
	return transaction

def calculateContainerAccounts(transactionData, dates, startIdx):
	return deLogic.calculateContainerAccounts(transactionData, dates, startIdx)

def calculateContainerTransactionReturns(transactionData):
	return deLogic.calculateContainerTransactionReturns(transactionData)