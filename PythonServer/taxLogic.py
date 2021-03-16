import datetime
import pandas as pd
import instrumentLogic as instrument
from pprint import pprint

def calcLongCloseTax(openPrice, openDate, closePrice, closeDate, closeVolume):
	openDate = openDate.to_pydatetime()
	closeDate = closeDate.to_pydatetime()
	diff = (closeDate - openDate).days
	if(diff>=365): return closeVolume*(closePrice-openPrice)*0.2
	else: return closeVolume*(closePrice-openPrice)*0.4;

def calculateContainerInstrumentTaxObj(instrumentId, transactions):
	# print(instrumentId)
	instrumentInfo = instrument.getInstrumentInfo(instrumentId)
	ret = {}
	for transaction in transactions:
		if(transaction['trasaction_open_close_type'] == "Open"):
			transaction['taxBucket'] = None
			continue	
		taxBucket = getCloseTransactionTaxBucket(instrumentInfo, transaction)
		taxYear = getTaxYear(transaction['date'])
		# print("start: " + str(transaction['transaction_open_date'].date()) + ", end: " + str(transaction['date'].date()) + " taxBucket: " + taxBucket, " tax year: " + str(taxYear))
		taxYearObj = ret.get(taxYear, {})
		taxYearObj[taxBucket] = int(taxYearObj.get(taxBucket, 0) + transaction['transaction_profit'])
		transaction['taxBucket'] = taxBucket
		ret[taxYear] = taxYearObj
	# print(ret)
	# print("--------------------------------")
	return ret

def getCloseTransactionTaxBucket(instrumentInfo, transactionObj):
	# pprint(transactionObj)
	instrumentType = instrumentInfo['instrumentType']
	if(instrumentType=="EQ"):return getEQTransactionTaxBucket(instrumentInfo, transactionObj)
	elif(instrumentType=="MF"):return getMFTransactionTaxBucket(instrumentInfo, transactionObj)
	return None

def getEQTransactionTaxBucket(instrumentInfo, transactionObj):
	transactionYears = getTransactionYearDiff(transactionObj['transaction_open_date'], transactionObj['date'])
	time = "ST" if(transactionYears<1) else "LT"
	exchange = "ONEX" if(transactionObj['exchange_traded']) else "OFEX"
	listed = "L"
	return "EQ_"+listed+"_"+exchange+"_"+time

def getMFTransactionTaxBucket(instrumentInfo, transactionObj):
	transactionYears = getTransactionYearDiff(transactionObj['transaction_open_date'], transactionObj['date'])
	schemeType = instrumentInfo['scheme_type']
	# print(schemeType)
	time = "LT"
	if(schemeType=="Debt" and transactionYears<3):time = "ST"
	elif(transactionYears<1):time = "ST"
	schemeType = schemeType[0]
	return "MF_"+schemeType+"_"+time
	# return None

def getTransactionYearDiff(openDate, closeDate):
	openDate = openDate.date()
	closeDate = closeDate.date()
	minusYears = 0
	if(openDate.month==2 and openDate.day==29):openDate = openDate.replace(day=28)
	if(closeDate.year==openDate.year):return 0;
	if((closeDate.month<openDate.month) or (closeDate.month==openDate.month and closeDate.day<openDate.day)):minusYears = 1
	return closeDate.year - openDate.year - minusYears

def getTaxYear(closeDate):
	closeDate = closeDate.date()
	return closeDate.year if(closeDate.month>3) else closeDate.year-1