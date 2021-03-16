import pandas as pd
import os
import numpy
import json

basedir = '/Users/lakshdang/Documents/PortfolioTracking/Data/'

user_schema_cols = ['googleProfileID', 'email', 'firstName', 'lastName', 'isContainerOwner']
continer_types_cols = ['containerTypeID', 'containerTypeName', 'containerTypeSpecificFields']
container_cols = ['containerID', 'containerName', 'containerTypeID', 'ownerProfileID', 'openDate', 'closeDate', 'lastCalcReturns', 'allowedInstrumentID', 'groupID']
instrument_type_cols = ['instrumentTypeID', 'InsturmentTypeName', 'instrumentTypeAcronym', 'hasExpiryDate']
transaction_cols = ['transactionID', 'instrumentID', 'containerID', 'instrumentTypeID', 'containerTypeID', 'ownerProfileID', 'transaction_date', 'volume', 'price', 'long_short_type', 'open_close_type', 'transaction_fees']
groups_cols = ['groupID', 'groupName']

table_names = ['users', 'container_types', 'containers', 'instrument_types', 'transactions', 'groups']
table_indexes = ['googleProfileID', 'containerTypeID', 'containerID', 'instrumentTypeID', 'transactionID', 'groupID']
table_cols_arr = [user_schema_cols, continer_types_cols, container_cols, instrument_type_cols, transaction_cols, groups_cols]

first_user = [None, "laksh.dang@gmail.com", None, None, "isContainerOwner"]

for idx, table_name in enumerate(table_names):
	filename = basedir+table_names[idx]+'.json'
	df = pd.DataFrame(columns=table_cols_arr[idx])
	if(table_names[idx]=="users"):
		df = pd.DataFrame([first_user], columns=table_cols_arr[idx])
	df.to_json(filename, orient='split')