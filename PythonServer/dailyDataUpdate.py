import accountingLogic as accounts
import instrumentLogic as instrument
import watchlistLogic as watchlist
import lendingLogic as lending
import datetime
import appData
from kiteconnect import KiteConnect
import pandas as pd
import numpy as np
import routes
from pprint import pprint
import threading
import time

kiteObj = KiteConnect(api_key="7harnllatioi70jm")
kiteObj.set_access_token("mk4rkeQ4IOksda1DnXV8NNr8tl4xq754")

def initKite(data):
	access_token = data['access_token']
	kiteObj.set_access_token(access_token)
	return dailyDataUpdate()

def dailyDataUpdate():
	ret = {}
	print("inside daily data update function")
	fetchUpdatedInstrumentListFromKite()
	ret.update(instrument.dailyDataUpdate())
	ret.update(watchlist.dailyDataUpdate())
	ret.update({"updatedLoans": lending.dailyDataUpdate()})
	ret.update({"updatedAccounts": accounts.dailyDataUpdate()})
	ret.update({'underlyingInstruments': instrument.getUnderlyingInstruments()})
	return ret

def fetchUpdatedInstrumentListFromKite():
	newInstrumentLists = getNewInsturmentLists()
	if(newInstrumentLists is None):return None
	updateEQInstruments(newInstrumentLists['new_eqInstruments'])
	updateMFInstruments(newInstrumentLists['new_mfInstruments'])
	storeHistoricalMutualFundPrices(newInstrumentLists['new_mfInstruments'])
	updateDEInstruments(newInstrumentLists['new_deInstruments'])

def getNewInsturmentLists():
	if(kiteObj==None): return None
	ret = {}
	t1 = threading.Thread(target=fetchEqInstruments, args=[ret])
	t2 = threading.Thread(target=fetchMfInstruments, args=[ret])
	t1.start()
	t2.start()
	t1.join()
	t2.join()
	for key in ret: 
		if(ret[key] is None): return None
	return ret

def fetchEqInstruments(obj):
	for i in range(0, 20):
		try:
			new_instruments = pd.DataFrame(kiteObj.instruments())
			new_deInstruments = new_instruments.loc[new_instruments['exchange']=="NFO"]
			new_eqInstruments = new_instruments.loc[new_instruments['exchange'].isin(['BSE', 'NSE'])]
			obj['new_eqInstruments'] = new_eqInstruments
			obj['new_deInstruments'] = new_deInstruments
			return

		except Exception as e:
			print("Error processing try number: " + str(i))
			print(str(e))
			if(i>=20):
				obj['new_eqInstruments'] = None
				obj['new_deInstruments'] = None
				return

def fetchMfInstruments(obj):
	for i in range(0, 20):
		try:
			new_mfInstruments = pd.DataFrame(kiteObj.mf_instruments())
			obj['new_mfInstruments'] = new_mfInstruments
			return

		except Exception as e:
			print("Error processing try number: " + str(i))
			print(str(e))
			if(i>=20):
				obj['new_mfInstruments'] = None
				return

def updateEQInstruments(data):
	old_instruments = appData.tables['eq_instruments']
	old_instruments['delisted'] = [False] * old_instruments.shape[0]
	new_instruments = pd.DataFrame(data)
	new_instruments = new_instruments.loc[new_instruments['name']!=""]
	new_instruments['delisted'] = [False] * new_instruments.shape[0]
	new_instruments['displayName'] = new_instruments['tradingsymbol'] + " (" + new_instruments['exchange'] + ")"
	new_instruments = new_instruments.astype({"instrument_token": str})
	new_instruments = new_instruments.rename(columns={"instrument_type":"instrumentType"})
	new_instruments_tokens = set(new_instruments['instrument_token'])
	old_instruments_tokens = set(old_instruments['instrument_token'])
	delisted_instruments = old_instruments_tokens.difference(new_instruments_tokens)
	old_instruments.loc[old_instruments['instrument_token'].isin(delisted_instruments), ['delisted']] = True
	old_instruments = old_instruments.loc[old_instruments['delisted']]
	old_instruments = old_instruments.append(new_instruments, ignore_index=True)
	old_instruments['expiry'] = pd.to_datetime(old_instruments['expiry'])
	old_instruments.to_json(appData.baseDir+"eq_instruments.json", orient="split")
	appData.tables['eq_instruments'] = old_instruments

def storeHistoricalMutualFundPrices(data):
	new_mfInstruments = pd.DataFrame(data)[["tradingsymbol","last_price","last_price_date"]]
	mfHistoricalData = pd.read_json(appData.baseDir+"mfHistoricalData.json", orient="split", convert_dates=['last_price_date'], dtype=False)
	mfHistoricalData = mfHistoricalData.loc[mfHistoricalData['last_price'].notnull()][["tradingsymbol","last_price","last_price_date"]]
	new_mfInstruments['last_price_date'] = pd.to_datetime(new_mfInstruments['last_price_date'])
	overlap = pd.merge(new_mfInstruments, mfHistoricalData, how='left', left_on=['tradingsymbol', 'last_price_date'], right_on=['tradingsymbol', 'last_price_date'])
	new_mf_prices = overlap.loc[np.isnan(overlap['last_price_y'])][["tradingsymbol","last_price_x","last_price_date"]]
	new_mf_prices = new_mf_prices.rename(columns={'last_price_x': 'last_price'})
	mfHistoricalData = mfHistoricalData.append(new_mf_prices, ignore_index=True)
	mfHistoricalData = mfHistoricalData.sort_values(['tradingsymbol', 'last_price_date'], ascending=[True, False]).groupby('tradingsymbol', as_index=False).head(750)
	mfHistoricalData = mfHistoricalData.sort_values(['tradingsymbol','last_price_date'], ascending=[True, True])
	mfHistoricalData = mfHistoricalData.reset_index(drop=True)
	mfHistoricalData.to_json(appData.baseDir+"mfHistoricalData.json", orient="split")

def updateMFInstruments(data):
	new_instruments = pd.DataFrame(data)
	new_instruments['delisted'] = [False] * new_instruments.shape[0]
	new_instruments = new_instruments.drop(columns=['last_price', 'last_price_date'])
	new_instruments['displayName'] = new_instruments['name']+"-"+new_instruments['dividend_type']+"-"+new_instruments['plan']+"("+new_instruments['scheme_type']+")"
	new_instruments['instrument_token'] = new_instruments['tradingsymbol']
	new_instruments['instrumentType'] = ["MF"]*new_instruments.shape[0]
	new_instruments = new_instruments.rename(columns={"minimum_purchase_amount": "lot_size"})

	old_instruments = appData.tables['mf_instruments']
	old_instruments['delisted'] = [False] * old_instruments.shape[0]
	
	new_instruments_tokens = set(new_instruments['tradingsymbol'])
	old_instruments_tokens = set(old_instruments['tradingsymbol'])
	new_added_instruments = new_instruments_tokens.difference(old_instruments_tokens)
	delisted_instruments = old_instruments_tokens.difference(new_instruments_tokens)
	old_instruments.loc[old_instruments['tradingsymbol'].isin(delisted_instruments), ['delisted']] = True
	new_instruments = new_instruments.loc[new_instruments['tradingsymbol'].isin(new_added_instruments)]
	old_instruments = old_instruments.append(new_instruments, ignore_index=True)

	old_instruments.to_json(appData.baseDir+"mf_instruments.json", orient="split")
	appData.tables['mf_instruments'] = old_instruments

def getKiteObj():
	try:
		kiteObj.profile()
		return kiteObj
	except Exception as e:
		return None

def updateDEInstruments(data):
	old_instruments = appData.tables['de_instruments']
	equities = appData.tables['eq_instruments']
	containers = appData.tables['containers']
	new_instruments = pd.DataFrame(data)
	today = datetime.datetime.now().date()
	today = datetime.datetime.combine(today, datetime.time())

	traded_intruments = set(containers['allowedInstrumentID'])
	old_instruments = old_instruments.loc[old_instruments['instrument_token'].isin(traded_intruments)]
	new_instruments['delisted'] = [False] * new_instruments.shape[0]
	new_instruments['underlyingPriceAtExpiry'] = np.nan
	new_instruments = new_instruments.astype({"instrument_token": str})
	new_instruments = new_instruments.loc[~new_instruments['instrument_token'].isin(traded_intruments)]
	new_instruments = pd.merge(new_instruments, equities.loc[equities['exchange']=="NSE"][['tradingsymbol', 'instrument_token']], how="left", left_on="name", right_on="tradingsymbol").drop(['tradingsymbol_y'], axis=1).rename(columns={"instrument_token_y": "underlyingInstrument", "instrument_token_x": "instrument_token", "instrument_type": "instrumentType", "tradingsymbol_x": "tradingsymbol"})
	new_instruments.loc[new_instruments['name']=="NIFTY", 'underlyingInstrument'] = "256265"
	new_instruments.loc[new_instruments['name']=="BANKNIFTY", 'underlyingInstrument'] = "260105"
	new_instruments.loc[new_instruments['name']=="FINNIFTY", 'underlyingInstrument'] = "257801"
	new_instruments['expiry'] = pd.to_datetime(new_instruments['expiry'])
	new_instruments['date_string'] = new_instruments['expiry'].dt.strftime('%d%b%Y');
	fut = pd.DataFrame(new_instruments.loc[new_instruments['instrumentType']=="FUT"])
	cepe = pd.DataFrame(new_instruments.loc[new_instruments['instrumentType']!="FUT"])
	fut['displayName'] = (fut['name'] + "-" + fut['date_string'] + '-FUT').str.upper()
	cepe['displayName'] = (cepe['name'] + "-" + cepe['date_string'] + "-" + cepe['strike'].astype(str) + "-" + cepe['instrumentType']).str.upper()
	old_instruments = old_instruments.append([fut, cepe], ignore_index=True)
	old_instruments = setDerivativesUnderlyingPriceAtExpiry(old_instruments)
	old_instruments.loc[old_instruments['expiry']<today, 'delisted'] = True
	old_instruments.to_json(appData.baseDir+"de_instruments.json", orient="split")
	appData.tables['de_instruments'] = old_instruments

def setDerivativesUnderlyingPriceAtExpiry(deInstruments):
	if(kiteObj is None): 
		print("kite session expired")
		return None


	today = datetime.datetime.combine(datetime.date.today(), datetime.datetime.min.time())
	reqUnderlyingInstrumentPrices = deInstruments.loc[(deInstruments['underlyingPriceAtExpiry'].isna()) & (deInstruments['expiry']<today)][['underlyingInstrument', 'expiry', 'name']].drop_duplicates(['underlyingInstrument', 'expiry'], keep='first').reset_index(drop=True)
	underlyingExpiryPrices = fetchExpiredInstrumentsUnderlyingPriceAtExpiry(reqUnderlyingInstrumentPrices)
	deInstruments = pd.merge(deInstruments, underlyingExpiryPrices, how='left', left_on=['underlyingInstrument', 'expiry'], right_on=['underlyingInstrument', 'expiry'])
	deInstruments.loc[deInstruments['newUnderlyingExpiryPrice'].notna(), ['underlyingPriceAtExpiry']] = deInstruments['newUnderlyingExpiryPrice']
	deInstruments.drop(columns=['newUnderlyingExpiryPrice'], inplace=True)
	return deInstruments

def fetchExpiredInstrumentsUnderlyingPriceAtExpiry(reqUnderlyingInstrumentPrices):
	kiteObj = getKiteObj()
	if((kiteObj is None) or (reqUnderlyingInstrumentPrices.empty)):
		return pd.DataFrame([], columns=['underlyingInstrument', 'expiry', 'newUnderlyingExpiryPrice'])
	reqUnderlyingInstrumentPrices = reqUnderlyingInstrumentPrices.sort_values(['underlyingInstrument', 'expiry']).groupby('underlyingInstrument')['expiry'].agg(list).to_dict()
	threads = []
	instrumentPricesObj = {}
	for instrumentID in reqUnderlyingInstrumentPrices:
		dates = reqUnderlyingInstrumentPrices[instrumentID]
		t = threading.Thread(target=getInstrumentPricesOnDates, args=[instrumentID, dates, instrumentPricesObj])
		t.start()
		threads.append(t)
		time.sleep(0.06)
	
	for thread in threads: thread.join()
	data = []
	for instrumentID in instrumentPricesObj:
		for date in instrumentPricesObj[instrumentID]:
				data.append({"underlyingInstrument": instrumentID, "expiry": date, 'newUnderlyingExpiryPrice': instrumentPricesObj[instrumentID][date]})
	return pd.DataFrame(data)

def getInstrumentPricesOnDates(instrumentID, dates, instrumentPricesObj):
	start = (dates[0]-datetime.timedelta(days=7)).strftime("%Y-%m-%d %H:%M:%S")
	end = dates[-1].replace(hour=23, minute=59, second=59).strftime("%Y-%m-%d %H:%M:%S")
	instrumentHistoricalPrices = fetchInstrumentHistoricalData(instrumentID, start, end)
	reqDateIndices = instrumentHistoricalPrices['Date'].searchsorted(dates, side='right')
	for i in range(0, reqDateIndices.size):reqDateIndices[i] = reqDateIndices[i]-1
	ret = instrumentHistoricalPrices.iloc[reqDateIndices].reset_index(drop=True)
	ret['Date'] = dates
	ret['Date'] = ret['Date']
	ret = ret.set_index('Date')['Close Price'].to_dict()
	instrumentPricesObj[instrumentID] = ret

def fetchInstrumentHistoricalData(instrumentID, startDate, endDate):
	while(True):
		try:
			instrumentHistoricalPrices = pd.DataFrame(kiteObj.historical_data(int(instrumentID), startDate, endDate, interval="day"))
			if(instrumentHistoricalPrices.empty):
				return pd.DataFrame([{"Close Price":np.nan, "Date": pd.Timestamp(0)}])
			instrumentHistoricalPrices = instrumentHistoricalPrices[['date', 'close']]
			instrumentHistoricalPrices = instrumentHistoricalPrices.rename(columns={"date": "Date", "close": "Close Price"})
			instrumentHistoricalPrices['Date'] = instrumentHistoricalPrices['Date'].dt.tz_localize(None)
			temp = pd.DataFrame([{"Close Price": np.nan, "Date": pd.Timestamp(0)}])
			instrumentHistoricalPrices = temp.append(instrumentHistoricalPrices, ignore_index=True)
			return instrumentHistoricalPrices[['Date', 'Close Price']]
		except Exception as e:
			return pd.DataFrame([{"Close Price": np.nan, "Date": pd.Timestamp(0)}])

def removeExpiredAndDelistedSubscribedInstruments():
	subscribedInstruments = appData.subscribedInstrumentCount
	instruments = appData.tables['instruments'][['instrument_token', 'delisted']].set_index('instrument_token')
	today = (datetime.datetime.now()).date()
	today = datetime.datetime.combine(today, datetime.time())
	removedInstruments = subscribedInstruments.loc[set(subscribedInstruments.index)-set(instruments.index)].index.to_list()
	subscribedInstruments = subscribedInstruments.drop(removedInstruments)
	subscribedInstruments = pd.merge(subscribedInstruments, instruments, how="left", left_index=True, right_index=True)
	pprint(subscribedInstruments.loc[~subscribedInstruments['delisted']])
