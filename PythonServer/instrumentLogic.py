import pandas as pd
import os 
import json
import datetime
import appData
from dailyDataUpdate import getKiteObj
from pprint import pprint
import numpy as np
import time
import threading
from kiteconnect import KiteConnect

instrumentTypeToContainerTypeMap = {
	"EQ": 0,
	"MF": 3,
	"FUT": 4,
	"CE": 5,
	"PE": 6
}

socketOptionChainMap = {}

def getInstruments(data):
	return {"instruments": appData.tables['instruments']}

def setInstruments():
	today = (datetime.datetime.now()).date()
	today = datetime.datetime.combine(today, datetime.time())
	eqInstruments = appData.tables['eq_instruments']
	mfInstruments = appData.tables['mf_instruments']
	deInstruments = appData.tables['de_instruments']
	instruments = pd.concat([eqInstruments, mfInstruments, deInstruments], ignore_index=True)
	instruments = instruments.sort_values(['instrumentType', 'underlyingInstrument', 'expiry', 'strike'], ignore_index=True)
	instruments['isUnderlyingInstrument'] = False
	instruments.loc[instruments['expiry']<today, 'delisted'] = True
	instruments.loc[instruments['instrument_token'].isin(set(instruments['underlyingInstrument'])), 'isUnderlyingInstrument'] = True
	appData.tables['instruments'] = instruments

def getEQInstruments(data):
	eq_instruments = (appData.tables['eq_instruments'][['instrument_token', 'tradingsymbol', 'name', 'exchange', 'expiry', 'lot_size', 'delisted']]).astype({"instrument_token": str})
	eq_instruments['displayName'] = eq_instruments['tradingsymbol'] + " (" + eq_instruments['exchange'] + ")"
	eq_instruments = eq_instruments.to_json(orient="records")
	return {"eqInstruments": eq_instruments}

def getAllInstruments(data):
	ret_data = {}
	ret_data.update(getInstruments(data))
	return ret_data

def getMFInstruments(data):
	mf_instruments = appData.tables['mf_instruments']
	return {"mfInstruments": mf_instruments}

def getInstrumentContainerTypeID(instrumentId):
	instrumentType = getInstrumentTypeID(instrumentId)
	return instrumentTypeToContainerTypeMap[instrumentType]

def getInstrumentInfo(instrumentId):
	instruments = appData.tables['instruments']
	instrument = instruments.loc[instruments['instrument_token']==instrumentId]
	return instrument.to_dict(orient="records")[0]

def getInstrumentTypeID(instrumentId):
	instruments = appData.tables['instruments'];
	return instruments.loc[instruments['instrument_token']==instrumentId].reset_index().iloc[0]['instrumentType']

def getUnderlyingInstruments():
	instruments = appData.tables['instruments']
	today = (datetime.datetime.now()).date()
	today = datetime.datetime.combine(today, datetime.time())
	underlyingInstruments = instruments.loc[instruments['isUnderlyingInstrument']]
	underlyingInstruments = underlyingInstruments[['instrument_token', 'name', 'displayName', 'tradingsymbol']].rename(columns={'instrument_token': 'instrumentID'}).set_index('instrumentID')
	derivativeExpiries = instruments.loc[instruments['expiry']>=today][['underlyingInstrument', 'expiry']].drop_duplicates().dropna()
	derivativeExpiries['expiry'] = derivativeExpiries['expiry'].dt.strftime('%Y-%m-%d')
	derivativeExpiries = derivativeExpiries.groupby('underlyingInstrument').agg(list)['expiry']
	underlyingInstruments = pd.merge(underlyingInstruments, derivativeExpiries, how="inner", left_index=True, right_index=True)
	underlyingInstruments = underlyingInstruments.to_dict(orient="index")
	return underlyingInstruments

def getSubscribedInstruments(data):
	return {"subscribedInstruments": list(appData.subscribedInstrumentCount.index)}

def getSingleMfInstrumentWatchlistData(instrumentID):
	return getMfWatchlistPrices([instrumentID]).iloc[0]['priceInfo']

def getMfWatchlistPrices(instrumentIds):
	mfHistoricalData = pd.read_json(appData.baseDir+'mfHistoricalData.json', orient="split", dtype=False, convert_dates=['last_price_date'])
	mfPrices = mfHistoricalData.loc[mfHistoricalData['tradingsymbol'].isin(instrumentIds)].sort_values(['tradingsymbol', 'last_price_date'], ascending=[True, False]).groupby('tradingsymbol', as_index=False).head(2).astype({"last_price_date":str})
	mfPrices['priceInfo'] = mfPrices[['last_price_date', 'last_price']].to_dict(orient='records')
	mfPrices = mfPrices.groupby('tradingsymbol', as_index=False)[['priceInfo']].agg(list)
	return mfPrices

def setSocketOptionChain(data):
	socketID = data.get('socketID', None)
	underlyingInstrumentID = data.get('underlyingInstrumentID', None)
	expiry = data.get('expiry', None)
	if(expiry is not None):
		expiry = datetime.datetime.strptime(expiry, "%Y-%m-%d")
	instruments = appData.tables['instruments']
	subscribedInstrumentCount = appData.subscribedInstrumentCount
	deletedInstruments = set()
	addedInstruments = set()
	ret = {}
	if(socketID in socketOptionChainMap):
		currUnderlyingInstrument = socketOptionChainMap[socketID]['underlyingInstrument']
		currExpiry = socketOptionChainMap[socketID]['expiry']
		currUnderlyingInstrumentExpiryOptions = instruments.loc[(instruments['underlyingInstrument']==currUnderlyingInstrument) & (instruments['expiry']==currExpiry) & (instruments['instrumentType'].isin(["CE", "PE"]))]['instrument_token']
		subscribedInstrumentCount.loc[currUnderlyingInstrumentExpiryOptions.values, 'count'] -= 1
		deletedInstruments = set(subscribedInstrumentCount.loc[subscribedInstrumentCount['count']==0].index)
		subscribedInstrumentCount = subscribedInstrumentCount.loc[subscribedInstrumentCount['count']!=0]
		socketOptionChainMap.pop(socketID, None)
		appData.subscribedInstrumentCount = subscribedInstrumentCount

	if(underlyingInstrumentID is not None):
		ce = instruments.loc[(instruments['underlyingInstrument']==underlyingInstrumentID) & (instruments['expiry']==expiry) & (instruments['instrumentType']=="CE")][['instrument_token', 'strike']].set_index('strike').rename(columns={"instrument_token": "CE"})
		pe = instruments.loc[(instruments['underlyingInstrument']==underlyingInstrumentID) & (instruments['expiry']==expiry) & (instruments['instrumentType']=="PE")][['instrument_token', 'strike']].set_index('strike').rename(columns={"instrument_token": "PE"})
		cepe = pd.merge(ce, pe, how="inner", left_index=True, right_index=True)
		instrumentList = cepe['CE'].append(cepe['PE'].dropna()).value_counts().to_frame(name="increment")
		subscribedInstrumentCount = pd.merge(subscribedInstrumentCount, instrumentList, how="outer", left_index=True, right_index=True)
		addedInstruments = set(subscribedInstrumentCount.loc[subscribedInstrumentCount['count'].isna()].index)
		subscribedInstrumentCount = subscribedInstrumentCount.fillna(0)
		subscribedInstrumentCount['count']+=subscribedInstrumentCount['increment']
		subscribedInstrumentCount = subscribedInstrumentCount.drop(columns=['increment'])
		socketOptionChainMap[socketID] = {'underlyingInstrument': underlyingInstrumentID, "expiry": expiry}
		appData.subscribedInstrumentCount = subscribedInstrumentCount
		ret = {"options": cepe.reset_index().to_dict(orient="records")}

	appData.updatedInfoObject['deletedInstruments'].extend(list(deletedInstruments-addedInstruments))
	appData.updatedInfoObject['addedInstruments'].extend(list(addedInstruments-deletedInstruments))
	ret.update(appData.updatedInfoObject)
	pprint(socketOptionChainMap)
	return ret

def dailyDataUpdate():
	setInstruments()
	ret = removeExpiredAndDelistedSubscribedInstruments()
	removeAllExpiredOptionChains()
	return ret

def removeExpiredAndDelistedSubscribedInstruments():
	instruments = appData.tables['instruments'][['instrument_token', 'delisted']].set_index("instrument_token")
	subscribedInstrumentCount = appData.subscribedInstrumentCount
	subscribedInstrumentCount['delisted'] = instruments['delisted']
	delInstrumentsSelector = (subscribedInstrumentCount['delisted'].isna()) | (subscribedInstrumentCount['delisted'])
	ret = {"deletedTrackedInstruments": subscribedInstrumentCount.loc[delInstrumentsSelector].index.to_list()}
	subscribedInstrumentCount = subscribedInstrumentCount.loc[~delInstrumentsSelector][['count']]
	appData.subscribedInstrumentCount = subscribedInstrumentCount
	return ret

def removeAllExpiredOptionChains():
	today = datetime.datetime.now().replace(hour=0, minute=0, second=0)
	socketsToDelete = set()
	for socketID in socketOptionChainMap:
		currOptionChainExpiry = socketOptionChainMap[socketID]
		if(currOptionChainExpiry['expiry']<today):set.add(socketID)

	for socketID in socketsToDelete: socketOptionChainMap.pop(socketID)

def getSearchInstrumentList(data):
	try:
		searchStirng = data.get("term")
		if(len(searchStirng)<3):raise ValueError('Search String length less that 3 chars')
		instrumentTypes = data.get("instrumentTypes", "all")
		filteredInstruments = appData.tables['instruments']
		filteredInstruments = filteredInstruments.loc[~(filteredInstruments['delisted'])]
		if(instrumentTypes!="all"):
			instrumentTypes = set(instrumentTypes.split("_"))
			filteredInstruments = filteredInstruments.loc[filteredInstruments['instrumentType'].isin(instrumentTypes)]
		filteredInstruments = filteredInstruments.loc[filteredInstruments['displayName'].str.contains(searchStirng, case=False)]
		filteredInstruments = filteredInstruments[['displayName', 'instrument_token', 'lot_size', 'instrumentType', 'underlyingInstrument', 'isUnderlyingInstrument']]
		filteredInstruments = filteredInstruments.rename(columns={'displayName': "text", "instrument_token": "id"})
		filteredInstruments['children'] = filteredInstruments[['text', 'id', 'lot_size', 'instrumentType', 'underlyingInstrument', 'isUnderlyingInstrument']].to_dict(orient="records")
		filteredInstruments = filteredInstruments.drop(columns=['text', 'id', 'lot_size', 'underlyingInstrument', 'isUnderlyingInstrument'])
		filteredInstruments = filteredInstruments.rename(columns={'instrumentType': "text"})
		filteredInstruments = filteredInstruments.groupby('text', as_index=False)[['children']].agg(list)
		ret = filteredInstruments.to_json(orient='records')
		return ret
	except Exception as e:
		print(str(e))
		return pd.DataFrame().to_json(orient="records");

def getNonMFInstrumentHistoricalPrices(instrumentIds, dates):
	kiteObj = getKiteObj()
	if(kiteObj is None):
		pprint("Not connected to kite")
		ret = {}
		for instrumentId in instrumentIds:
			instrumentPrices = {}
			for date in dates:
				instrumentPrices[str(date.date())] = 0
			ret[instrumentId] = instrumentPrices
		return ret
	end = dates[-1]
	end = end.replace(hour=23, minute=59, second=59)
	start = dates[0]-datetime.timedelta(days=7)
	end = end.strftime("%Y-%m-%d %H:%M:%S")
	start = start.strftime("%Y-%m-%d %H:%M:%S")
	threads = []
	instrumentPricesObj = {}
	for instrumentId in instrumentIds:
		t = threading.Thread(target=getNonMFHistoricalData, args=[instrumentId, dates, kiteObj, start, end, instrumentPricesObj])
		t.start()
		threads.append(t)
		time.sleep(0.06)

	for thread in threads:
		thread.join()

	return instrumentPricesObj

def getNonMFHistoricalData(instrumentId, dates, kiteObj, startDate, endDate, instrumentPricesObj):
	instrumentHistoricalPrices = fetchNonMfInstrumentHistoricalData(str(instrumentId), kiteObj, startDate, endDate)
	reqDateIndices = instrumentHistoricalPrices['Date'].searchsorted(dates, side='right')
	for i in range(0, reqDateIndices.size):reqDateIndices[i] = reqDateIndices[i]-1
	ret = instrumentHistoricalPrices.iloc[reqDateIndices].reset_index(drop=True)
	ret['Date'] = dates
	ret['Date'] = ret['Date'].dt.strftime('%Y-%m-%d');
	ret = ret.set_index('Date')['Close Price'].to_dict()
	instrumentPricesObj[instrumentId] = ret

def fetchNonMfInstrumentHistoricalData(instrumentID, kiteObj, startDate, endDate):
	while(True):
		try:
			instrumentHistoricalPrices = pd.DataFrame(kiteObj.historical_data(int(instrumentID), startDate, endDate, interval="day"))
			if(instrumentHistoricalPrices.empty):
				return pd.DataFrame([{"Close Price": 0, "Date": pd.Timestamp(0)}])
			instrumentHistoricalPrices = instrumentHistoricalPrices[['date', 'close']]
			instrumentHistoricalPrices = instrumentHistoricalPrices.rename(columns={"date": "Date", "close": "Close Price"})
			instrumentHistoricalPrices['Date'] = instrumentHistoricalPrices['Date'].dt.tz_localize(None)
			temp = pd.DataFrame([{"Close Price": 0, "Date": pd.Timestamp(0)}])
			instrumentHistoricalPrices = temp.append(instrumentHistoricalPrices, ignore_index=True)
			return instrumentHistoricalPrices[['Date', 'Close Price']]
		except Exception as e:
			# print(str(e))
			print("here")
			print(instrumentID)
			print(type(e))
			return pd.DataFrame([{"Close Price": 0, "Date": pd.Timestamp(0)}])

def getInstrumentHistoricalAndUnderlyingPrices(reqInstruments, dates):
	mfInstruments = reqInstruments.loc[reqInstruments['instrumentType']=="MF"]['instrument_token']
	nonMfInstruments = reqInstruments.loc[reqInstruments['instrumentType']!="MF"][['instrument_token', 'expiry', 'displayName']]
	today = datetime.datetime.now().replace(hour=0, minute=0, second=0)
	expiredInstruments = nonMfInstruments.loc[nonMfInstruments['expiry']<today]
	liveInstruments = nonMfInstruments.loc[~(nonMfInstruments['expiry']<today)]
	ret = getNonMFInstrumentHistoricalPrices(liveInstruments['instrument_token'].unique(), dates)
	ret.update(getMFInstrumentHistoricalPrices(mfInstruments, dates))
	return ret

def getMFInstrumentHistoricalPrices(mfInstruments, dates):
	mfHistoricalData = pd.read_json(appData.baseDir+'mfHistoricalData.json', orient="split", dtype=False, convert_dates=['last_price_date'])
	mfHistoricalData = mfHistoricalData.loc[mfHistoricalData['tradingsymbol'].isin(mfInstruments)].sort_values(['tradingsymbol', 'last_price_date']).reset_index(drop=True)
	mfHistoricalData['index'] = mfHistoricalData.index
	for date in dates:
		mfHistoricalData[str(date.date())] = np.nan
		mfHistoricalData.loc[mfHistoricalData['last_price_date']<=date, str(date.date())] = mfHistoricalData['index']
	dateStrings = [str(date.date()) for date in dates]
	mfHistoricalDataDF = mfHistoricalData.groupby('tradingsymbol', as_index=False)[dateStrings].max()
	for date in dates:mfHistoricalDataDF = pd.merge(mfHistoricalDataDF, mfHistoricalData[['index', 'last_price']], how="left", left_on=str(date.date()), right_on="index").drop(columns=['index', str(date.date())]).rename(columns={"last_price": str(date.date())})
	mfHistoricalDataDF.fillna(0, inplace=True)
	mfHistoricalDataDF['pricesObj'] = mfHistoricalDataDF[dateStrings].to_dict(orient="records")
	mfHistoricalDataDF.set_index('tradingsymbol', inplace=True)
	mfHistoricalDataObj = mfHistoricalDataDF['pricesObj'].to_dict()
	return mfHistoricalDataObj
