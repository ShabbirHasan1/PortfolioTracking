import pandas as pd
import numpy as np
from pprint import pprint
import instrumentLogic as instrument
import containerLogic as container
import dailyDataUpdate
import json
import datetime
import containerLogic as container
import appData
from math import sqrt, exp, log, pi
from scipy.stats import norm
from scipy import optimize

pd.set_option('display.max_rows', 100)

def createStrategy(data):
	strategies = appData.tables['strategies']
	strategyOwner = data.get('strategyOwner', None)
	strategyUnderlyingInstrument = data.get('strategyUnderlyingInstrument', None)
	strategyName = data.get('strategyName', None)
	errors = validateNewStrategyFields(strategyOwner, strategyName, strategyUnderlyingInstrument)
	if(errors is not None): return {"error": "\n".join(errors)}
	strategyID = int(strategies['strategyID'].max())+1
	strategyObj = {"strategyID": strategyID ,"strategyName": strategyName, "strategyOwner": strategyOwner, "strategyUnderlyingInstrument": strategyUnderlyingInstrument, "testStrategy":False, "breakEvenPrices":[]}
	strategies = strategies.append([strategyObj], ignore_index=True)
	appData.tables['strategies'] = strategies
	if(appData.saveChanges): strategies.to_json(appData.baseDir+'strategies.json', orient="split")
	print(strategies)
	appData.updatedInfoObject['addedStrategy'] = strategyObj
	return {"error": False, "addedStrategy": strategyObj}

def validateAndProcessNewTransactionsStrategyAssignments(transactionStrategyAssignmentDF):
	strategies = appData.tables['strategies']
	strategyContainers = appData.tables['strategyContainers']
	containers = appData.tables['containers']
	instruments = appData.tables['instruments']
	if(not transactionStrategyAssignmentDF.loc[transactionStrategyAssignmentDF['assignVolume']<0].empty): return {"error": "Cannot assign negative/zero volume to a strategy"}
	transactionStrategyAssignmentDF = pd.merge(transactionStrategyAssignmentDF, containers[['containerID', 'allowedInstrumentID', 'ownerProfileID', 'parentContainerID']], how='left', left_on='containerID', right_on='containerID')
	transactionStrategyAssignmentDF = pd.merge(transactionStrategyAssignmentDF, instruments[['instrument_token', 'isUnderlyingInstrument', 'instrumentType', 'underlyingInstrument']], how="left", left_on='allowedInstrumentID', right_on='instrument_token')
	transactionStrategyAssignmentDF['requiresAssignment'] = (transactionStrategyAssignmentDF['parentContainerID'].isna()) & ((transactionStrategyAssignmentDF['isUnderlyingInstrument']) | (transactionStrategyAssignmentDF['instrumentType'].isin(["CE", "PE", "FUT"])))
	if(not transactionStrategyAssignmentDF.loc[(~transactionStrategyAssignmentDF['requiresAssignment']) & (transactionStrategyAssignmentDF['assignVolume']!=0)].empty):return {"error": "Invalid Strategy Assignment"}
	transactionStrategyAssignmentDF = transactionStrategyAssignmentDF.loc[transactionStrategyAssignmentDF['requiresAssignment']]
	if(not transactionStrategyAssignmentDF.loc[transactionStrategyAssignmentDF['assignVolume']==0].empty):return {"error": "Invalid Strategy Assignment"}	
	transactionStrategyAssignmentDF = pd.merge(transactionStrategyAssignmentDF, strategies[['strategyID', 'strategyOwner', 'strategyUnderlyingInstrument']], how='left', left_on="strategyID", right_on="strategyID")
	if(not validateContainerStrategyAssignment(transactionStrategyAssignmentDF)):return {"error": "Invalid Strategy Assignment"}
	transactionStrategyAssignmentDF['signedAssignVolume'] = transactionStrategyAssignmentDF['assignVolume'] * transactionStrategyAssignmentDF['openClose']
	totalTransactionsAssignVol = transactionStrategyAssignmentDF.groupby('transactionID', as_index=False).agg({"assignVolume": 'sum','transactionVolume': 'max',})
	if(not totalTransactionsAssignVol.loc[totalTransactionsAssignVol['assignVolume']!=totalTransactionsAssignVol['transactionVolume']].empty):return {"error": "Invalid Strategy Assignment"}
	updatedStrategyContainerVolumes = validateAndGetUpdatedStrategyContainerAssignmentVolumes(transactionStrategyAssignmentDF)
	if(updatedStrategyContainerVolumes is False):return {"error": "Invalid Strategy Assignment"}
	return {"updatedStrategyContainerVolumes": updatedStrategyContainerVolumes}

def validateContainerStrategyAssignment(transactionStrategyAssignmentDF):
	strategies = appData.tables['strategies']
	assignedStrategies = set(transactionStrategyAssignmentDF['strategyID'])
	if(strategies.loc[strategies['strategyID'].isin(assignedStrategies)].shape[0]<len(assignedStrategies)): return False
	transactionStrategyAssignmentDF = transactionStrategyAssignmentDF.loc[(transactionStrategyAssignmentDF['strategyOwner'].notna())]
	if(not transactionStrategyAssignmentDF.loc[transactionStrategyAssignmentDF['strategyOwner']!=transactionStrategyAssignmentDF['ownerProfileID']].empty):return False
	transactionStrategyAssignmentDF = transactionStrategyAssignmentDF.loc[transactionStrategyAssignmentDF['strategyUnderlyingInstrument'].notna()]
	if(not transactionStrategyAssignmentDF.loc[(transactionStrategyAssignmentDF['strategyUnderlyingInstrument']!=transactionStrategyAssignmentDF['allowedInstrumentID']) & (transactionStrategyAssignmentDF['strategyUnderlyingInstrument']!=transactionStrategyAssignmentDF['underlyingInstrument'])].empty): return False
	return True

def validateAndGetUpdatedStrategyContainerAssignmentVolumes(transactionStrategyAssignmentDF):
	strategyContainers = appData.tables['strategyContainers']
	netNewClose = transactionStrategyAssignmentDF.loc[transactionStrategyAssignmentDF['signedAssignVolume']<0][['strategyID', 'containerID', 'signedAssignVolume']].rename(columns={'signedAssignVolume': 'netCloseVolume'})
	netNewClose = netNewClose.groupby(['strategyID', 'containerID'], as_index=False)['netCloseVolume'].agg(sum)
	netNewClose['netCloseVolume'] = netNewClose['netCloseVolume'] * -1
	netStrategyContainerAssignmentOpenVolume = transactionStrategyAssignmentDF.groupby(['strategyID', 'containerID'], as_index=False)['signedAssignVolume'].agg(sum)
	netStrategyContainerAssignmentOpenVolume = pd.merge(netStrategyContainerAssignmentOpenVolume, strategyContainers, how='left', left_on=["strategyID", "containerID"], right_on=["strategyID", "containerID"])
	netStrategyContainerAssignmentOpenVolume = netStrategyContainerAssignmentOpenVolume.fillna({"openVolume": 0, "closeVolume":0, "useContainerOpenPrice": True, 'useContainerClosePrice': True})
	netStrategyContainerAssignmentOpenVolume['openVolume'] = netStrategyContainerAssignmentOpenVolume['openVolume'] + netStrategyContainerAssignmentOpenVolume['signedAssignVolume']
	if(not netStrategyContainerAssignmentOpenVolume.loc[netStrategyContainerAssignmentOpenVolume['openVolume']<0].empty): return False
	updatedStrategyContainerVolumes = pd.merge(netStrategyContainerAssignmentOpenVolume, netNewClose, how='left', left_on=["strategyID", "containerID"], right_on=["strategyID", "containerID"])
	updatedStrategyContainerVolumes = updatedStrategyContainerVolumes.fillna({'netCloseVolume': 0})
	updatedStrategyContainerVolumes['closeVolume'] = updatedStrategyContainerVolumes['closeVolume'] + updatedStrategyContainerVolumes['netCloseVolume']
	updatedStrategyContainerVolumes = updatedStrategyContainerVolumes.drop(columns=['netCloseVolume', 'signedAssignVolume'])
	return updatedStrategyContainerVolumes

def validateNewStrategyFields(strategyOwner, strategyName, strategyUnderlyingInstrument):
	errors=[]
	users = appData.tables['users']
	strategies = appData.tables['strategies']
	instruments = appData.tables['instruments']
	if(strategyOwner is None):errors.append("Strategy Owner is required")
	if(strategyName is None): error.append("Strategy Name is required")
	if((strategyUnderlyingInstrument is not None) and (instruments.loc[instruments['underlyingInstrument']==strategyUnderlyingInstrument].empty)):
		errors.append('Invalid Underlying Instrument selected')
	if(len(errors)>0):return errors
	if(users.loc[(users['googleProfileID']==strategyOwner) & (users['isContainerOwner']=="isContainerOwner")].empty): errors.append("Invalid Strategy Owner selected")
	if(not strategies.loc[(strategies['strategyOwner']==strategyOwner) & (strategies['strategyName']==strategyName)].empty):
		errors.append("Strategy Name is already taken")
	if(len(errors)>0):return errors
	return None

def updateStrategyContainers(updatedStrategyContainers):
	strategies = appData.tables['strategies']
	strategyContainers = appData.tables['strategyContainers']
	strategyContainers = strategyContainers.append(updatedStrategyContainers, ignore_index=True).drop_duplicates(['strategyID', 'containerID'], keep="last")
	appData.tables['strategyContainers'] = strategyContainers
	updatedStrategiesBreakEven = strategies.loc[(strategies['strategyUnderlyingInstrument'].notna()) & (strategies['strategyID'].isin(updatedStrategyContainers['strategyID'].unique()))]['strategyID']
	updatedStrategyBreakEvens = calcStrategiesBreakEvenPoints(updatedStrategiesBreakEven)
	strategies = pd.merge(strategies, updatedStrategyBreakEvens, how="left", left_on="strategyID", right_on="strategyID")
	strategies.loc[strategies['newBreakEvenPrices'].notna(), "breakEvenPrices"] = strategies["newBreakEvenPrices"]
	strategies = strategies.drop(columns=["newBreakEvenPrices"])
	appData.tables['strategies'] = strategies
	if(appData.saveChanges): 
		strategyContainers.to_json(appData.baseDir+'strategyContainers.json', orient="split")
		strategies.to_json(appData.baseDir+'strategies.json', orient="split")
	updatedStrategyContainers['info'] = updatedStrategyContainers.drop(columns=['strategyID']).to_dict(orient="records")
	updatedStrategyContainers = updatedStrategyContainers.groupby('strategyID')['info'].agg(list)
	appData.updatedInfoObject['updatedStrategyContainers'].update(updatedStrategyContainers.to_dict())

def createNewContainerOwnerUnassignedStrategy(userID):
	data = {
		"strategyOwner": userID,
		"strategyName": "Unassigned"
	}
	return createStrategy(data)

def getStrategiesInfoObj():
	strategies = appData.tables['strategies']
	strategyContainers = appData.tables['strategyContainers'].copy().drop(columns=['customOpenPrice', 'customClosePrice'])
	# pprint(strategyContainers.loc[strategyContainers['customOpenPrice'].isna()])
	# pprint("==================")
	# strategyContainers.loc[strategyContainers['customOpenPrice'].isna(), 'customOpenPrice'] = None
	# strategyContainers.loc[strategyContainers['customClosePrice'].isna(), 'customClosePrice'] = None
	# pprint(strategyContainers)
	# pprint("==================")
	strategyContainers['info'] = strategyContainers.to_dict(orient="records")
	# pprint(strategyContainers['info'].loc[0])
	# pprint("==================")
	# pprint(strategyContainers)
	strategyContainers = strategyContainers.groupby('strategyID')['info'].agg(list)
	strategies = strategies.set_index('strategyID')
	strategies['containers'] = strategyContainers
	strategies.loc[strategies['containers'].isna(), 'containers'] = None
	strategies.loc[strategies['strategyUnderlyingInstrument'].isna(), 'strategyUnderlyingInstrument'] = None
	strategies = strategies.to_dict(orient="index")
	# pprint(strategies)
	return {"strategies": strategies}
	
def getStrategySpreadData(data):
	if('strategyID' not in data): return {"error": "Strategy ID not provided"}
	return calcStrategySpreadData(int(data['strategyID']))

def calcStrategySpreadData(strategyID):
	strategies = appData.tables['strategies']
	strategyContainers = appData.tables['strategyContainers']
	containers = appData.tables['containers']
	instruments = appData.tables['instruments']
	currStrategy = strategies.loc[(strategies['strategyID']==strategyID) & (strategies['strategyUnderlyingInstrument'].notna())].reset_index(drop=True)
	kiteObj = dailyDataUpdate.getKiteObj()
	if(currStrategy.empty): return {"error": "Invalid Strategy ID"}
	if(kiteObj is None): return {"error": "Not connected to kite"}
	underlyingInstrumentID = currStrategy['strategyUnderlyingInstrument'][0]
	underlyingInstrumentQuoteString = "NSE:" + instruments.loc[instruments['instrument_token']==currStrategy['strategyUnderlyingInstrument'][0]]['tradingsymbol'].values[0]
	underlyingPrice = (kiteObj.quote([underlyingInstrumentQuoteString])[underlyingInstrumentQuoteString]['last_price'])
	priceRange = instruments.loc[(instruments['underlyingInstrument']==underlyingInstrumentID) & (instruments['strike']>=(0.7*underlyingPrice)) & (instruments['strike']<=(1.3*underlyingPrice))]
	priceRange = priceRange['strike'].unique()
	priceRange*=100
	priceRange.sort()
	priceRangeDF = pd.Series(priceRange, name="expiryUnderlyingPrice").to_frame()
	priceRangeDF['underlyingInstrument'] = underlyingInstrumentID
	strategyContainers = strategyContainers.loc[strategyContainers['strategyID']==strategyID]
	strategyContainers = pd.merge(strategyContainers[["containerID","openVolume","strategyID"]], strategies[['strategyID', 'strategyUnderlyingInstrument']], how="left", left_on='strategyID', right_on="strategyID")
	strategyContainers = pd.merge(strategyContainers, containers[['containerID', 'allowedInstrumentID', 'buy_sell_type', 'containerTypeID', 'open_exposure', 'open_volume']], how="left", left_on='containerID', right_on='containerID').rename(columns={"open_volume": "containerOpenVolume", "open_exposure": "containerOpenExposure"})
	strategyContainers = pd.merge(strategyContainers, instruments[['instrument_token', 'strike']], how="left", left_on='allowedInstrumentID', right_on="instrument_token").drop(columns=['instrument_token'])
	strategyContainers = pd.merge(strategyContainers, priceRangeDF, how="left", left_on="strategyUnderlyingInstrument", right_on="underlyingInstrument").drop(columns=['underlyingInstrument'])
	strategyContainers['open_price'] = strategyContainers['containerOpenExposure']/strategyContainers['containerOpenVolume']
	strategyContainers['close_price'] = 0
	strategyContainers['strike']*=100
	strategyContainers.drop(columns=['containerID','strategyID','strategyUnderlyingInstrument','allowedInstrumentID','containerOpenExposure','containerOpenVolume'], inplace=True)
	strategyContainers.loc[strategyContainers['containerTypeID'].isin([0, 4]), 'close_price'] = strategyContainers['expiryUnderlyingPrice']
	strategyContainers.loc[strategyContainers['containerTypeID']==5, 'close_price'] = np.maximum(0, (strategyContainers['expiryUnderlyingPrice']-strategyContainers['strike']))
	strategyContainers.loc[strategyContainers['containerTypeID']==6, 'close_price'] = np.maximum(0, (strategyContainers['strike']-strategyContainers['expiryUnderlyingPrice']))
	strategyContainers['profit'] = strategyContainers['openVolume']*(strategyContainers['close_price']-strategyContainers['open_price'])
	strategyContainers.loc[strategyContainers["buy_sell_type"]=="Sell", 'profit']*=-1
	strategyContainers['profit']/=100
	strategyContainers['expiryUnderlyingPrice']/=100
	strategyContainers = strategyContainers.groupby('expiryUnderlyingPrice')['profit'].sum()
	
	breakEvenPrices = np.round(np.array(strategies.loc[strategies['strategyID']==strategyID]['breakEvenPrices'].values[0])/100, 2)
	if(len(breakEvenPrices)>0):
		breakEvenPrices = np.round(np.array(strategies.loc[strategies['strategyID']==strategyID]['breakEvenPrices'].values[0])/100, 2)
		breakEvenSeries = pd.Series([0.0]*len(breakEvenPrices), index=breakEvenPrices)
		strategyContainers = strategyContainers.append(breakEvenSeries).sort_index().groupby(level=0).tail(1)

	strategyContainers = strategyContainers.round(2)

	ret = {"underlyingExpiryPrice": strategyContainers.index.tolist(), "profit": strategyContainers.tolist()}
	# pprint(ret)
	return ret

def calcStrategiesBreakEvenPoints(updatedStrategies):
	strategies = appData.tables['strategies']
	strategyContainers = appData.tables['strategyContainers']
	containers = appData.tables['containers']
	instruments = appData.tables['instruments']

	retDF = pd.DataFrame()
	retDF['strategyID'] = updatedStrategies
	retDF['newBreakEvenPrices'] = [[]]*retDF.shape[0]

	strategyContainers = strategyContainers.loc[(strategyContainers['strategyID'].isin(updatedStrategies)) & (strategyContainers['openVolume']>0)]
	strategyContainers = pd.merge(strategyContainers[['containerID', 'openVolume', 'strategyID']], containers[['containerID', 'allowedInstrumentID', 'containerTypeID', 'buy_sell_type', "open_exposure","open_volume"]], how="left", left_on="containerID", right_on="containerID").rename(columns={"open_exposure":"containerOpenExposure", "open_volume": "containerOpenVolume"})
	strategyContainers = pd.merge(strategyContainers, instruments[['instrument_token', 'strike']], how="left", left_on='allowedInstrumentID', right_on="instrument_token")
	strategyContainers = pd.merge(strategyContainers, strategies[['strategyID', 'strategyUnderlyingInstrument']], how="left", left_on="strategyID", right_on="strategyID")
	strategyContainers['containerOpenPrice'] = strategyContainers["containerOpenExposure"]/strategyContainers["containerOpenVolume"]
	strategyContainers = strategyContainers.drop(columns=['containerOpenExposure', 'containerOpenVolume', 'allowedInstrumentID', 'instrument_token'])
	strategyContainers['strike']*=100
	strategyStrikes = strategyContainers[['strategyID', 'strike']].drop_duplicates()
	zeros = strategyContainers[['strategyID']].drop_duplicates()
	zeros['strike'] = 0
	strategyStrikes = strategyStrikes.append(zeros, ignore_index=True).dropna().drop_duplicates().sort_values(["strategyID", "strike"]).reset_index(drop=True).rename(columns={"strike": "underlyingExpiryPrice"})
	maxStrategyStrikes = strategyStrikes.groupby('strategyID', as_index=False).tail(1).reset_index(drop=True)
	maxStrategyStrikes['underlyingExpiryPrice']+=1
	strategyStrikes = strategyStrikes.append(maxStrategyStrikes, ignore_index=True).sort_values(["strategyID", "underlyingExpiryPrice"]).reset_index(drop=True)
	strategyContainers = pd.merge(strategyContainers, strategyStrikes, how="left", left_on='strategyID', right_on="strategyID")
	strategyContainers['closePrice'] = strategyContainers['underlyingExpiryPrice']
	strategyContainers.loc[strategyContainers['containerTypeID']==5, 'closePrice'] = np.maximum(0, (strategyContainers['underlyingExpiryPrice']-strategyContainers['strike']))
	strategyContainers.loc[strategyContainers['containerTypeID']==6, 'closePrice'] = np.maximum(0, (strategyContainers['strike']-strategyContainers['underlyingExpiryPrice']))
	strategyContainers['profit'] = strategyContainers['openVolume']*(strategyContainers['closePrice']-strategyContainers['containerOpenPrice'])
	strategyContainers.loc[strategyContainers['buy_sell_type']=="Buy", 'profit']*=-1
	strategyContainers = strategyContainers.groupby(['strategyID', 'underlyingExpiryPrice'], as_index=False)[['profit']].sum()
	strategyContainers[['nextUnderlyingExpiryPrice', 'nextUnderlyingExpiryPriceProfit']] = strategyContainers.groupby('strategyID')[['underlyingExpiryPrice', 'profit']].shift(periods=-1)
	strategyContainers = strategyContainers.dropna().reset_index(drop=True)
	strategyContainers['slope'] = (strategyContainers['nextUnderlyingExpiryPriceProfit']-strategyContainers['profit'])/(strategyContainers['nextUnderlyingExpiryPrice']-strategyContainers['underlyingExpiryPrice'])
	strategyContainers['yIntercept'] = strategyContainers['profit']-(strategyContainers['slope']*strategyContainers['underlyingExpiryPrice'])
	strategyContainers['xIntercept'] = -1*(strategyContainers['yIntercept']/strategyContainers['slope'])
	strategyContainers.loc[strategyContainers.groupby('strategyID', as_index=False).tail(1).index, 'nextUnderlyingExpiryPrice'] = float('inf')
	strategyContainers['xInterceptInRange'] = (strategyContainers['xIntercept']>=strategyContainers['underlyingExpiryPrice']) & (strategyContainers['xIntercept']<strategyContainers['nextUnderlyingExpiryPrice'])
	strategyContainers = strategyContainers.loc[strategyContainers['xInterceptInRange']]
	strategyContainers['xIntercept'] = strategyContainers['xIntercept'].astype(int)
	strategyContainers = strategyContainers[['strategyID', 'xIntercept']].groupby('strategyID', as_index=False).agg(list).rename(columns={'xIntercept': 'newBreakEvenPrices'})
	retDF = retDF.append(strategyContainers, ignore_index=True).drop_duplicates('strategyID', keep="last")
	return retDF

def getStrategyExpectedReturnsSpreadOnDate(data):
	if('strategyID' not in data): return {"error": "Strategy ID not provided"}
	if('date' not in data): return {"error": "Date not provided"}
	return calcStrategyExpectedReturnsSpreadOnDate(int(data['strategyID']), data['date'])

def calcStrategyExpectedReturnsSpreadOnDate(strategyID, date):
	strategies = appData.tables['strategies']
	strategyContainers = appData.tables['strategyContainers']
	containers = appData.tables['containers']
	instruments = appData.tables['instruments']
	kiteObj = dailyDataUpdate.getKiteObj()

	targetDate = datetime.datetime.strptime(date, "%Y-%m-%d")
	today = (datetime.datetime.now()).date()
	today = datetime.datetime.combine(today, datetime.time())
	currStrategy = strategies.loc[(strategies['strategyID']==strategyID) & (strategies['strategyUnderlyingInstrument'].notna())]

	if(currStrategy.empty): return {"error": "Invalid Strategy ID"}
	if(kiteObj is None): return {"error": "Not connected to kite"}
	if(targetDate<today): return {"error": "Selected Date must be a future date"}

	underlyingInstrument = currStrategy['strategyUnderlyingInstrument'].values[0]
	currStrategyContainers = strategyContainers.loc[(strategyContainers['strategyID']==strategyID) & (strategyContainers['openVolume']>0)]
	currStrategyContainers = pd.merge(currStrategyContainers, containers[['containerID', 'allowedInstrumentID', "open_volume", "open_exposure", "buy_sell_type"]], how="left", left_on="containerID", right_on="containerID").rename(columns={"open_volume": "containerOpenVolume", "open_exposure": "containerOpenExposure"})
	currStrategyContainers = pd.merge(currStrategyContainers, instruments[['instrument_token', "tradingsymbol", "exchange", "expiry", "strike", "instrumentType"]], how="left", left_on="allowedInstrumentID", right_on="instrument_token")
	currStrategyContainers = currStrategyContainers.loc[(currStrategyContainers['expiry'].isna()) | (currStrategyContainers['expiry']>=targetDate)].reset_index(drop=True)
	if(currStrategyContainers.empty): return {"error": "No open position for selected date"}
	currStrategyContainers['openPrice'] = (currStrategyContainers['containerOpenExposure']/currStrategyContainers['containerOpenVolume'])/100
	currStrategyContainers['quoteString'] = currStrategyContainers['exchange'] + ":" + currStrategyContainers["tradingsymbol"]
	instrumentQuotes = pd.DataFrame(kiteObj.quote((currStrategyContainers['quoteString']).to_list()).values())[['last_price']]
	underlyingInstrumentTradingSymbol = instruments.loc[instruments['instrument_token'] == underlyingInstrument]['tradingsymbol'].values[0]
	underlyingPrice = kiteObj.quote(["NSE:"+underlyingInstrumentTradingSymbol])["NSE:"+underlyingInstrumentTradingSymbol]['last_price']
	currStrategyContainers['last_price'] = instrumentQuotes['last_price']

	currStrategyContainers = currStrategyContainers.drop(columns=['quoteString'])
	currStrategyContainers['t'] = (currStrategyContainers['expiry'] - today).dt.days/365
	currStrategyContainers['underlyingInstrument'] = underlyingInstrument
	calcInstrumentsImpliedVolatility(currStrategyContainers, underlyingPrice)
	underlyingPrices = setUnderlyingPrices(currStrategyContainers, underlyingInstrument, underlyingPrice)
	currStrategyContainers = pd.merge(currStrategyContainers, underlyingPrices, how="left", left_on="underlyingInstrument", right_on="underlyingInstrument")
	currStrategyContainers['t'] = (currStrategyContainers['expiry'] - targetDate).dt.days/365
	currStrategyContainers = calcOptionPricesOnDate(currStrategyContainers)
	currStrategyContainers.loc[~(currStrategyContainers['instrumentType'].isin(["CE", "PE"])), "expectedPrice"] = currStrategyContainers['underlyingPrice']
	currStrategyContainers['profit'] = (currStrategyContainers['expectedPrice'] - currStrategyContainers['openPrice'])*currStrategyContainers['openVolume']
	currStrategyContainers.loc[currStrategyContainers['buy_sell_type']=="Sell", "profit"] = currStrategyContainers['profit']*-1
	returns = currStrategyContainers[['underlyingPrice', 'profit']].groupby('underlyingPrice')['profit'].agg(sum).round(2)
	pprint(returns)
	ret = {"underlyingPrice": returns.index.tolist(), "profit": returns.tolist()}
	return ret

def calcInstrumentsImpliedVolatility(strategyContainers, underlyingPrice):
	strategyContainers['IV'] = strategyContainers.apply(calcSingleInstrumentIV, args=[underlyingPrice], axis=1)
	# pprint(strategyContainers)

def calcSingleInstrumentIV(instrumentRow, underlyingPrice):
	t = instrumentRow['t']
	strike = instrumentRow['strike']
	marketPrice = instrumentRow['last_price']
	instrumentType = instrumentRow['instrumentType']
	r = 0

	def d(vol):
		d1 = 1 / (vol * sqrt(t)) * (log(underlyingPrice/strike) + (r + vol**2/2) * t)
		d2 = d1 - vol * sqrt(t)
		return d1, d2

	def calc_call_price(vol):
		d1, d2 = d(vol)
		C = norm.cdf(d1) * underlyingPrice - norm.cdf(d2) * strike * exp(-r * t)
		return C

	def calc_put_price(vol):
		d1, d2 = d(vol)
		P = (-norm.cdf(-d1) * underlyingPrice) + norm.cdf(-d2) * strike * exp(-r * t)
		return P

	def callPriceDiff(vol):
		return calc_call_price(vol) - marketPrice

	def putPriceDiff(vol):
		return calc_put_price(vol) - marketPrice

	if(not instrumentType in ["CE", "PE"]): return np.nan

	try:
		if(instrumentType=="CE"):
			sol = optimize.root_scalar(callPriceDiff, method='brentq', bracket=[0.00001, 1000], rtol=1e-3)
			return sol.root

		sol = optimize.root_scalar(putPriceDiff, method='brentq', bracket=[0.00001, 1000], rtol=1e-3)
		return sol.root
	
	except Exception as e:
		return 0.00001

def setUnderlyingPrices(strategyContainers, underlyingInstrument, underlyingPrice):
	instruments = appData.tables['instruments']
	strikes = instruments.loc[(instruments['underlyingInstrument']==underlyingInstrument) & (instruments['instrumentType'].isin(["CE", "PE"]))]
	strikes = strikes.loc[(strikes['expiry']==strategyContainers['expiry'].min()) & (strikes['strike']>=(0.7*underlyingPrice)) & (strikes['strike']<=(1.3*underlyingPrice))]['strike'].unique()
	strikes = pd.Series(strikes, name="underlyingPrice").to_frame();
	strikes = strikes.sort_values('underlyingPrice').reset_index(drop=True)
	strikes['underlyingInstrument'] = underlyingInstrument
	return strikes

def calcOptionPricesOnDate(strategyContainers):
	strategyContainers['temp1'] = 1/(strategyContainers['IV'] * np.sqrt(strategyContainers['t']))
	strategyContainers['temp2'] = np.log(strategyContainers['underlyingPrice']/strategyContainers['strike'])
	strategyContainers['temp3'] = (np.square(strategyContainers['IV'])/2) * strategyContainers['t']
	strategyContainers['d1'] = (strategyContainers['temp1'] * strategyContainers['temp2']) + strategyContainers['temp3']
	strategyContainers['d2'] = strategyContainers['d1'] - (strategyContainers['IV'] * np.sqrt(strategyContainers['t']))
	strategyContainers.loc[strategyContainers['instrumentType']=="CE", 'expectedPrice'] = (norm.cdf(strategyContainers['d1']) * strategyContainers['underlyingPrice']) - (norm.cdf(strategyContainers['d2']) * strategyContainers['strike'])
	strategyContainers.loc[strategyContainers['instrumentType']=="PE", 'expectedPrice'] = (-1 * norm.cdf(strategyContainers['d1'] * -1) * strategyContainers['underlyingPrice']) + (norm.cdf(strategyContainers['d2']*-1) * strategyContainers['strike'])
	return strategyContainers.drop(columns=['temp1', 'temp2', 'temp3'])

