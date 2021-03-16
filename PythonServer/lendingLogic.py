import datetime
import calendar
import numpy as np
import pandas as pd
import appData
from pprint import pprint

nextLoanID = None;
userLoanTotals = None;
loanTotals = None;
loansObj = None;

def initLending():
	global nextLoanID
	global loanTotals
	global userLoanTotals
	global loansObj
	
	loans = appData.tables['loans']
	loanPayments = appData.tables['loanPayments']
	
	nextLoanID = loans['loanID'].max()
	nextLoanID = 0 if pd.isna(nextLoanID) else int(nextLoanID+1)

	loanTotals = calcAllLoanTotals(loanPayments)
	userLoanTotals = calcUserLoanTotals(loanTotals)

	loanTotals['dataObj'] = loanTotals.to_dict(orient="records")
	loanTotals = loanTotals['dataObj'].to_dict()

	userLoanTotals['dataObj'] = userLoanTotals.to_dict(orient="records")
	userLoanTotals = userLoanTotals['dataObj'].to_dict()

	loansObj = loans.set_index("loanID", drop=True)
	loansObj['startDate'] = loansObj['startDate'].dt.strftime("%Y-%m-%d")
	loansObj['endDate'] = loansObj['endDate'].dt.strftime("%Y-%m-%d")
	loansObj['dataObj'] = loansObj.to_dict(orient="records")
	loansObj = loansObj['dataObj'].to_dict()

def getAllLoansInfo():
	return{
		"loans": loansObj,
		"loanTotals": loanTotals,
		"userLoanTotals": userLoanTotals,
	}

def dailyDataUpdate():
	global loanTotals
	global userLoanTotals
	loanPayments = appData.tables['loanPayments']

	loanTotals = calcAllLoanTotals(loanPayments)
	userLoanTotals = calcUserLoanTotals(loanTotals)

	loanTotals['dataObj'] = loanTotals.to_dict(orient="records")
	loanTotals = loanTotals['dataObj'].to_dict()

	userLoanTotals['dataObj'] = userLoanTotals.to_dict(orient="records")
	userLoanTotals = userLoanTotals['dataObj'].to_dict()

	return {
		"loanTotals": loanTotals,
		"userLoanTotals": userLoanTotals,
	}

def calcAllLoanTotals(loanPayments):
	today = (datetime.datetime.now()).date()
	today = datetime.datetime.combine(today, datetime.time())
	
	completedPayments = loanPayments.loc[loanPayments['date']<=today][['principalRepaymentAmount', 'interestPaymentAmount', 'interestPostTax', 'loanID']]
	completedPayments = completedPayments.rename(columns={'principalRepaymentAmount': "principalRepaid", "interestPaymentAmount": "interestPaid", "interestPostTax": "InterestEarned"})
	completedPayments = completedPayments.groupby('loanID')[['principalRepaid','interestPaid','InterestEarned']].sum()

	pendingPayments = loanPayments.loc[loanPayments['date']>today][['principalRepaymentAmount', 'interestPaymentAmount', 'interestPostTax', 'loanID']]
	pendingPayments = pendingPayments.rename(columns={'principalRepaymentAmount': "principalOutstanding", "interestPaymentAmount": "InterestOutstanding", "interestPostTax": "InterestEarningsOutstanding"})
	pendingPayments = pendingPayments.groupby('loanID')[['principalOutstanding','InterestOutstanding','InterestEarningsOutstanding']].sum()

	loanTotals = pd.merge(completedPayments, pendingPayments, how="outer", left_index=True, right_index=True)
	return loanTotals

def calcUserLoanTotals(loanTotals):
	containerOwners = appData.tables['users']
	containerOwners = containerOwners.loc[containerOwners['isContainerOwner']=="isContainerOwner"][['googleProfileID']].rename(columns={"googleProfileID": "ownerProfileID"}).set_index('ownerProfileID')
	loans = appData.tables['loans']
	
	userLoanTotals = pd.merge(loanTotals, loans[['loanID', 'ownerProfileID']], how="left", left_index=True, right_on="loanID").drop(columns=['loanID'])
	userLoanTotals = userLoanTotals.groupby('ownerProfileID').sum()
	userLoanTotals = userLoanTotals.append(containerOwners).fillna(0)
	userLoanTotals = userLoanTotals.loc[~(userLoanTotals.index.duplicated(keep="first"))]
	return userLoanTotals

def addLoan(dataObj):
	global nextLoanID
	loans = appData.tables['loans']
	loanPayments = appData.tables['loanPayments']
	
	loanObjError = validateAndSetAddLoanObj(dataObj)
	if(loanObjError['error'] is not None): return loanObjError

	currLoanPayments = calcLoanPayments(dataObj)
	currLoanPayments = pd.DataFrame(currLoanPayments["loanPayments"])
	currLoanPayments['date'] = pd.to_datetime(currLoanPayments['date'])
	currLoanPayments['loanID'] = nextLoanID
	dataObj['loanID'] = nextLoanID

	loans = loans.append([dataObj], ignore_index=True)
	loanPayments = loanPayments.append(currLoanPayments, ignore_index=True)

	appData.tables['loans'] = loans
	appData.tables['loanPayments'] = loanPayments

	if(appData.saveChanges): 
		loans.to_json(appData.baseDir+'loans.json', orient="split")
		loanPayments.to_json(appData.baseDir+'loanPayments.json', orient="split")

	currLoanTotals = calcAllLoanTotals(currLoanPayments)
	currLoanTotals['dataObj'] = currLoanTotals.to_dict(orient="records")
	currLoanTotals = currLoanTotals['dataObj'].values[0]

	dataObj['startDate'] = dataObj['startDate'].strftime("%Y-%m-%d")
	dataObj['endDate'] = dataObj['endDate'].strftime("%Y-%m-%d")
	currLoanPayments['date'] = currLoanPayments['date'].dt.strftime("%Y-%m-%d")
	currLoanPayments = currLoanPayments.fillna(0)

	loansObj[nextLoanID] = dataObj
	loanTotals[nextLoanID] = currLoanTotals
	addLoanToOwnerTotals(dataObj['ownerProfileID'], currLoanTotals)
	currLoanObj = {"loanInfo": dataObj,"loanPayments": currLoanPayments.to_dict(orient="records"), "loanTotals": currLoanTotals}
	nextLoanID+=1
	appData.updatedInfoObject['addedLoan'] = currLoanObj
	return {"error": False}

def getLoanPayments(data):
	loanID = data.get('loanID', None)
	loanPayments = appData.tables['loanPayments']
	if(loanID is None): return{"error": "No Loan id provided"}
	try:
		loanID = int(loanID)
	except Exception as e:
		return {"error": "LoanID must be a number"}

	currLoanPayments = pd.DataFrame(loanPayments.loc[loanPayments['loanID']==loanID])
	if(currLoanPayments.empty):return{"error": "Invalid loanID"}
	currLoanPayments['date'] = 	currLoanPayments['date'].dt.strftime("%Y-%m-%d")
	currLoanPayments = currLoanPayments.fillna(0)
	return {"loanPayments": currLoanPayments.to_dict(orient="records")}

def validateAndSetAddLoanObj(dataObj):
	def validatePrincipalRepaymentTimelines():
		return ((dataObj['principalRepaymentType']!="Periodic") or (((loanDuration - dataObj['principalMoratorium']-1)%dataObj['principalFrequency'])==0))

	def validateInterestRepaymentTimelines():
		return ((dataObj['interestRepaymentType']!="Periodic") or (((loanDuration - dataObj['interestMoratorium']-1)%dataObj['interestFrequency'])==0))

	def calcLoanDuration():
		yearDiff = dataObj['endDate'].year - dataObj['startDate'].year;
		monthDiff = dataObj['endDate'].month - dataObj['startDate'].month;
		return (yearDiff*12) + monthDiff

	dataObj['endDate'] = datetime.datetime.strptime(dataObj['endDate'], "%Y-%m-%d")
	dataObj['startDate'] = datetime.datetime.strptime(dataObj['startDate'], "%Y-%m-%d")
	loanDuration = calcLoanDuration()


	if(dataObj['principalRepaymentType']!="Periodic"):
		dataObj['principalMoratorium'] = loanDuration-1
		dataObj['principalFrequency'] = 1

	if(dataObj['interestRepaymentType']!="Periodic"):
		dataObj['interestMoratorium'] = loanDuration-1
		dataObj['interestFrequency'] = 1

	dataObj['principalMoratorium'] = int(dataObj.get('principalMoratorium'))
	dataObj['principalFrequency'] = int(dataObj.get('principalFrequency'))
	dataObj['interestMoratorium'] = int(dataObj.get('interestMoratorium'))
	dataObj['interestFrequency'] = int(dataObj.get('interestFrequency'))

	if(not validatePrincipalRepaymentTimelines()): return {"error": "Invalid Principal Repayment Schedule"}
	if(not validateInterestRepaymentTimelines()): return {"error": "Invalid Interest Repayment Schedule"}

	return {"error": None}

def addLoanToOwnerTotals(ownerProfileID, newLoanTotals):
	currOwnerTotals = userLoanTotals[ownerProfileID]
	currOwnerTotals["InterestEarned"] += newLoanTotals["InterestEarned"]
	currOwnerTotals["InterestEarningsOutstanding"] += newLoanTotals["InterestEarningsOutstanding"]
	currOwnerTotals["InterestOutstanding"] += newLoanTotals["InterestOutstanding"]
	currOwnerTotals["interestPaid"] += newLoanTotals["interestPaid"]
	currOwnerTotals["principalOutstanding"] += newLoanTotals["principalOutstanding"]
	currOwnerTotals["principalRepaid"] += newLoanTotals["principalRepaid"]

def calcLoanPayments(dataObj):
	def calcLoanDuration():
		yearDiff = dataObj['endDate'].year - dataObj['startDate'].year;
		monthDiff = dataObj['endDate'].month - dataObj['startDate'].month;
		return (yearDiff*12) + monthDiff

	def setDatesArr():
		startDate = dataObj['startDate']
		startYear = startDate.year
		startMonth = startDate.month-1
		startDay = startDate.day

		def setPrincipalRepaymentDates():
			principalStartYear = int(startYear+(dataObj['principalMoratorium']/12))
			principalStartMonth = ((startMonth+dataObj['principalMoratorium']+1)%12)
			if(principalStartMonth<=startMonth):principalStartYear+=1;
			ret = [None] * (int((loanDuration-dataObj['principalMoratorium']-1)/dataObj['principalFrequency'])+1)
			for i in range(0, len(ret)):
				ret[i] = datetime.date(principalStartYear, principalStartMonth+1, min(startDay, calendar.monthrange(principalStartYear, principalStartMonth+1)[1]))
				if(principalStartMonth+dataObj['principalFrequency']>=12):principalStartYear+=1
				principalStartMonth = (principalStartMonth+dataObj['principalFrequency'])%12

			return ret

		def setInterestRepaymentDates():
			interestStartYear = int(startYear+(dataObj['interestMoratorium']/12))
			insterestStartMonth = ((startMonth+dataObj['interestMoratorium']+1)%12)
			if(insterestStartMonth<=startMonth):interestStartYear+=1;
			ret = [None] * (int((loanDuration-dataObj['interestMoratorium']-1)/dataObj['interestFrequency'])+1)
			for i in range(0, len(ret)):
				ret[i] = datetime.date(interestStartYear, insterestStartMonth+1, min(startDay, calendar.monthrange(interestStartYear, insterestStartMonth+1)[1]))
				if(insterestStartMonth+dataObj['interestFrequency']>=12):interestStartYear+=1
				insterestStartMonth = (insterestStartMonth+dataObj['interestFrequency'])%12

			return ret

		princaipalRepaymentDates = setPrincipalRepaymentDates()
		princaipalRepaymentDates[-1] = princaipalRepaymentDates[-1]-datetime.timedelta(days=1)
		interestRepaymentDates = setInterestRepaymentDates()
		interestRepaymentDates[-1] = interestRepaymentDates[-1]-datetime.timedelta(days=1)

		ret = np.concatenate([[startDate.date()], princaipalRepaymentDates, interestRepaymentDates])
		ret = np.unique(ret)
		ret.sort()
		return {
			"dates":ret,
			"princaipalRepaymentDates": princaipalRepaymentDates,
			"interestRepaymentDates": interestRepaymentDates
		}

	def createRepaymentObj(date, outstandingPrincipal, principalRepaymentAmount, interestPaymentAmount):
		interestPostTax = interestPaymentAmount * (1-TDS)
		return {
			"date": date,
			"outstandingPrincipal": outstandingPrincipal,
			"principalRepaymentAmount": principalRepaymentAmount,
			"interestPaymentAmount": interestPaymentAmount,
			"interestPostTax" : interestPostTax,
			"payOutToInvestor": principalRepaymentAmount+interestPostTax
		}

	loanDuration = calcLoanDuration()
	
	dates = setDatesArr()
	allDates = dates['dates']
	interestDates = dates["interestRepaymentDates"]
	principalDates = dates["princaipalRepaymentDates"]
	pprint(principalDates)
	pprint(interestDates)
	outstandingPrincipal = float(dataObj['principal'])
	ir = float(dataObj['interestRate'])/100
	TDS = float(dataObj.get('TDS', 0.1))/100
	
	ret = [None] * len(allDates);
	accruedInterest = 0
	ret[0] = createRepaymentObj(allDates[0], outstandingPrincipal, 0, 0)
	ret[0]['principalPaidIn'] = -outstandingPrincipal;
	principalInstallmentAmt = outstandingPrincipal/(len(principalDates))
	interestIdx = 0
	principalIdx = 0
	
	for i in range(1, len(allDates)):
		prevDate = allDates[i-1]
		currDate = allDates[i]
		currInterestPaid = 0
		currPrincipalPaid = 0
		accruedInterest += outstandingPrincipal*((currDate-prevDate).days/365)*ir
		if(currDate == interestDates[interestIdx]):
			interestIdx+=1
			currInterestPaid = accruedInterest
			accruedInterest = 0

		if(currDate == principalDates[principalIdx]):
			principalIdx+=1
			currPrincipalPaid = principalInstallmentAmt

		currRepaymentObj = createRepaymentObj(currDate, outstandingPrincipal, currPrincipalPaid, currInterestPaid)
		outstandingPrincipal-=currPrincipalPaid
		
		ret[i] = currRepaymentObj
	
	return {"loanPayments": ret}

# def prepAddLoanObj(dataObj):
# 	if("TDS" not in dataObj or "TDS"=="")dataObj['TDS'] = "0"
# 	if("endDate" not in dataObj or "endDate"=="")dataObj['endDate'] = "2020-10-13"
# 	if("interestFrequency" not in dataObj or "interestFrequency"=="")dataObj['interestFrequency'] = "0"
# 	if("interestMoratorium" not in dataObj or "interestMoratorium"=="")dataObj['interestMoratorium'] = "0"
# 	if("interestRate" not in dataObj or "interestRate"=="")dataObj['interestRate'] = "0"
# 	if("interestRepaymentType" not in dataObj or "interestRepaymentType"=="")dataObj['interestRepaymentType'] = "0"
# 	if("loanName" not in dataObj or "loanName"=="")dataObj['loanName'] = "0"
# 	if("ownerProfileID" not in dataObj or "ownerProfileID"=="")dataObj['ownerProfileID'] = "0"
# 	if("principal" not in dataObj or "principal"=="")dataObj['principal'] = "0"
# 	if("principalFrequency" not in dataObj or "principalFrequency"=="")dataObj['principalFrequency'] = "0"
# 	if("principalMoratorium" not in dataObj or "principalMoratorium"=="")dataObj['principalMoratorium'] = "0"
# 	if("principalRepaymentType" not in dataObj or "principalRepaymentType"=="")dataObj['principalRepaymentType'] = "0"
# 	if("startDate" not in dataObj or "startDate"=="")dataObj['startDate'] = "0"
