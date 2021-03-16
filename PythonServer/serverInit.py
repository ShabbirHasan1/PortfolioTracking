print("Stating serverInit.py file")

import pandas as pd
import appData

table_names = ['users', 'container_types', 'containers', 'instrument_types', 'transactions']
date_cols = [[], [], ['openDate', 'closeDate'], [], ['transaction_date']]

def initializeDataframes(baseDir, newInit):
	appData.init(baseDir);
	retappData.tables = dict()
	for idx, table_name in enumerate(table_names):
		curr_file = baseDir + table_name + ".json"
		curr_df = pd.read_json(curr_file, orient="split", dtype=False, convert_dates=date_cols[idx])
		retappData.tables[table_name] = curr_df
	return retappData.tables