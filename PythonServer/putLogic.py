import pandas as pd
import datetime
import numpy as np
import pmsLogic
import aifLogic
import mutualFundLogic as mfLogic
import directEquityLogic as deLogic
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
		'containerTypeID': 6,
		'containerName': instrumentInfo['displayName'],
		'openDate': pd.to_datetime(data['transaction_date']),
		'closeDate': instrumentInfo['expiry'],
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
	transactionContainerID = deLogic.getOrCreateTransactionContainer(data)
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

def calculateContainerTransactionReturns(transactionData):
	return pmsLogic.calculateContainerTransactionReturns(transactionData)

def calculateContainerAccounts(transactionData, dates, startIdx):
	return deLogic.calculateContainerAccounts(transactionData, dates, startIdx)

def getDerivativeClosePriceAfterExpiry(strikePrice, underlyingInstrumentPriceAtExpiry):
	return max(0, strikePrice - underlyingInstrumentPriceAtExpiry)