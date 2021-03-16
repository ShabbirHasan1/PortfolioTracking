import pandas as pd
import datetime
import numpy as np
import directEquityLogic as deLogic
import pmsLogic
import mutualFundLogic as mfLogic
import appData
import math

def setNewContainerObject(data):
	return pmsLogic.setNewContainerObject(data)

def setTransactionObject(data, transactionIdOffset):
	return pmsLogic.setTransactionObject(data, transactionIdOffset)