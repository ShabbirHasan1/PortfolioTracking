import pandas as pd
import json

def jsonSerializeObject(obj):
	if(not isinstance(obj, dict)):
		return
		
	for key in obj.keys():
		if(isinstance(obj[key], pd.DataFrame)):
			obj[key] = obj[key].to_json(orient='records')