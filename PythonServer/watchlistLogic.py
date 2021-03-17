import pandas as pd
import os 
import json
import math
import instrumentLogic as instrument
import containerLogic as containers
import accountingLogic as accounts
import appData
from pprint import pprint
import numpy as np

def watchlistInit():
	dailyDataUpdate()
	subscribedInstrumentCount = appData.subscribedInstrumentCount
	watchlistInstruments = appData.tables['watchlistInstruments']['instrumentID']
	watchlistInstrumentsCount = watchlistInstruments.value_counts().to_frame(name="watchlistCount")
	subscribedInstrumentCount = pd.merge(subscribedInstrumentCount, watchlistInstrumentsCount, how="outer", left_index=True, right_index=True).fillna(0)
	subscribedInstrumentCount['count']+=subscribedInstrumentCount['watchlistCount']
	subscribedInstrumentCount.drop(columns=['watchlistCount'], inplace=True)
	appData.subscribedInstrumentCount = subscribedInstrumentCount

def dailyDataUpdate():
	watchlistInstruments = appData.tables['watchlistInstruments']
	instruments = appData.tables['instruments'][['instrument_token', 'delisted']]

	watchlistInstruments = pd.merge(watchlistInstruments, instruments, how="left", left_on='instrumentID', right_on='instrument_token')
	droppedWatchlistInstruments = watchlistInstruments.loc[(watchlistInstruments['instrument_token'].isna()) | (watchlistInstruments['delisted'])]['instrumentID']
	watchlistInstruments = watchlistInstruments.loc[~(watchlistInstruments['instrumentID'].isin(droppedWatchlistInstruments))][["watchlistID","instrumentID"]].reset_index(drop=True)
	appData.tables['watchlistInstruments'] = watchlistInstruments
	
	if(appData.saveChanges):
		watchlistInstruments.to_json(appData.baseDir+"watchlistInstruments.json", orient="split")

	return getAllWatchlistsWithInstruments({})

def createWatchList(data):
	watchlists = appData.tables['watchlists']
	reqWatchlistName = data['watchlistName']
	watchlistNameAvailable = (watchlists.loc[watchlists['watchlistName'].str.lower()==reqWatchlistName.lower()]).empty
	if(not watchlistNameAvailable):return {"error": "Watchlist name taken"}
	if(len(reqWatchlistName)<3): return{"error": "Watchlist Name must be atleast 3 characters long"}
	if(len(reqWatchlistName)>19): return{"error": "Watchlist Name must be less than 20 characters long"}
	watchlistID = watchlists['watchlistID'].max()
	watchlistID = 0 if math.isnan(watchlistID) else watchlistID+1
	watchlistObj = {
		"watchlistID": watchlistID,
		"watchlistName": reqWatchlistName
	}
	df_temp = pd.DataFrame([watchlistObj], columns=list(watchlists.columns.values))
	watchlists = watchlists.append(df_temp, ignore_index=True)
	filename = appData.baseDir + "watchlists.json"
	if(appData.saveChanges):  watchlists.to_json(filename, orient='split')
	appData.tables['watchlists'] = watchlists
	new_watchlist_obj = df_temp.to_dict(orient="records")[0]
	new_watchlist_obj['instrumentID'] = []
	appData.updatedInfoObject['updatedWatchlists'] = new_watchlist_obj
	return {"message": "Watchlist Created", "newWatchlist": new_watchlist_obj, "error": False}

def addInstrumentToWatchList(data):
	watchlists = appData.tables['watchlists']
	watchlistInstruments = appData.tables['watchlistInstruments']
	errors = getInstrumentWatchlistRequestErrors(data)
	if(len(errors)>0):return {"error": "\n".join(errors)}

	watchlistID = int(data['watchlistID'])
	instrumentID = str(data['instrumentID'])
	instrumentInfo = instrument.getInstrumentInfo(instrumentID)
	instrumentType = instrumentInfo['instrumentType']

	watchlistInstrumentsSelector = (watchlistInstruments['watchlistID']==watchlistID) & (watchlistInstruments['instrumentID']==instrumentID)
	instrumentAlreadyInWatchlist = watchlistInstruments.loc[(watchlistInstrumentsSelector)].shape[0]>0
	if(instrumentAlreadyInWatchlist): return {"error": "Selected Instrument already tracked in selected watchlist"}
	watchlistInstrumentObj = {
		"watchlistID": watchlistID,
		"instrumentID": instrumentID,
	}
	df_temp = pd.DataFrame([watchlistInstrumentObj], columns=list(watchlistInstruments.columns.values))
	watchlistInstruments = watchlistInstruments.append(df_temp, ignore_index=True)
	appData.tables['watchlistInstruments'] = watchlistInstruments;

	filename = appData.baseDir+"watchlistInstruments.json"
	if(appData.saveChanges): watchlistInstruments.to_json(filename, orient="split")
	mfPriceData = None
	if(instrumentType=="MF"):
		mfPriceData = instrument.getSingleMfInstrumentWatchlistData(instrumentID)
	else:
		subscribedInstrumentCount = appData.subscribedInstrumentCount
		if(not(str(instrumentID) in subscribedInstrumentCount.index.values)):
			appData.updatedInfoObject['addedInstruments'].append(str(instrumentID))
			subscribedInstrumentCount = subscribedInstrumentCount.append(pd.DataFrame([{"instrumentID": str(instrumentID), "count": 1}]).set_index('instrumentID'))
			appData.subscribedInstrumentCount = subscribedInstrumentCount
		else:
			subscribedInstrumentCount.loc[instrumentID, 'count']+=1

	watchlistInstrumentObj = {
		"instrumentID": instrumentID,
		"displayName": instrumentInfo['displayName'],
		"watchlistID": watchlistID,
		"priceInfo": mfPriceData,
		"instrumentType": instrumentType
	}
	appData.updatedInfoObject['updatedWatchlists'] = {"watchlistID": watchlistID,"addedInstrumentID": watchlistInstrumentObj}
	return {"message": "Added instrument to watchlist", "error": False}#, "addedTrackedInstrument": addedTrackedInstrument}

def removeInstrumentFromWatchlist(data):
	watchlists = appData.tables['watchlists']
	watchlistInstruments = appData.tables['watchlistInstruments']
	errors = getInstrumentWatchlistRequestErrors(data)
	if(len(errors)>0):return {"error": "\n".join(errors)}
	
	watchlistID = int(data['watchlistID'])
	instrumentID = str(data['instrumentID'])
	instrumentType = instrument.getInstrumentTypeID(instrumentID)
	
	watchlistInstrumentsSelector = (watchlistInstruments['watchlistID']==watchlistID) & (watchlistInstruments['instrumentID']==instrumentID)
	watchlistInstrumentNotExists = watchlistInstruments.loc[watchlistInstrumentsSelector].empty
	if(watchlistInstrumentNotExists): return {"error": "Selected instrument not tracked in selected watchlist"}
	
	watchlistInstruments = watchlistInstruments.loc[~watchlistInstrumentsSelector]
	
	if(appData.saveChanges): 
		watchlistInstruments.to_json(appData.baseDir+"watchlistInstruments.json", orient="split")

	if(instrumentType!="MF"):
		subscribedInstrumentCount = appData.subscribedInstrumentCount
		subscribedInstrumentCount.loc[instrumentID, 'count']-=1
		if(subscribedInstrumentCount.loc[instrumentID]['count']==0):
			appData.updatedInfoObject['deletedInstruments'].append(instrumentID)
			subscribedInstrumentCount.drop(instrumentID, inplace=True)
	
	appData.updatedInfoObject['updatedWatchlists'] = {"watchlistID": watchlistID,"deletedInstrumentID": instrumentID}
	return {"message": "Removed instrument from watchlist", "error": False}

def representsInt(s):
	try: 
		int(s)
		return True
	except ValueError:
		return False

def getInstrumentWatchlistRequestErrors(data):
	watchlists = appData.tables['watchlists']
	watchlistInstruments = appData.tables['watchlistInstruments']
	errors = [];
	if("watchlistID" not in data):errors.append("No watchlist selected")
	elif(not representsInt(data['watchlistID'])): errors.append("Invalid watchlist id provided")
	else:
		watchlist = watchlists.loc[watchlists['watchlistID'] == int(data['watchlistID'])]
		if(watchlist.empty):errors.append("Selected watchlist does not exist")

	if("instrumentID" not in data):errors.append("No instrument selected")
	# elif(not representsInt(data['instrumentID'])): errors.append("Invalid insturment id provided")
	else:
		currInstrument = instrument.getInstrumentInfo(str(data['instrumentID']))
		if(currInstrument is None):errors.append("Invalid insturment id provided")
	return errors

def incrementInstrumentSubscribedCount(subscribedInstruments, instrumentID):
	subscribedInstruments[str(instrumentID)] = subscribedInstruments.get(str(instrumentID), 0)+1

def getAllWatchlistsWithInstruments(data):
	watchlists = appData.tables['watchlists']
	watchlistInstruments = appData.tables['watchlistInstruments']
	instruments = appData.tables['instruments'][['instrument_token', 'displayName', 'instrumentType']]
	watchlistInstrumentsInfo = pd.merge(watchlistInstruments, instruments[['instrument_token', 'displayName', 'instrumentType']], how="left", left_on="instrumentID", right_on="instrument_token").drop(['instrument_token'], axis=1)
	mfInstruments = set(watchlistInstrumentsInfo.loc[watchlistInstrumentsInfo['instrumentType']=="MF"]['instrumentID'])
	mfPrices = instrument.getMfWatchlistPrices(mfInstruments)
	watchlistInstrumentsInfo = pd.merge(watchlistInstrumentsInfo, mfPrices, how="left", left_on="instrumentID", right_on="tradingsymbol").drop(['tradingsymbol'], axis=1)
	watchlistInstrumentsInfo.loc[watchlistInstrumentsInfo['priceInfo'].isna(), ['priceInfo']] = [None]*watchlistInstrumentsInfo.shape[0]
	watchlistInstrumentsInfo['watchlistInstrumentInfo'] = watchlistInstrumentsInfo.to_dict(orient="records")
	watchlistInstrumentsInfo = watchlistInstrumentsInfo.groupby('watchlistID').agg(list)[['watchlistInstrumentInfo']]
	temp = watchlists.set_index('watchlistID')
	temp['instrumentInfo'] = watchlistInstrumentsInfo['watchlistInstrumentInfo']
	temp['empty'] = [[]]*temp.shape[0]
	temp.loc[temp['instrumentInfo'].isna(), 'instrumentInfo'] = temp['empty'];
	temp = temp.drop(columns=['empty'])
	pprint(temp)
	return {"watchlists": temp.to_dict(orient="index")}

