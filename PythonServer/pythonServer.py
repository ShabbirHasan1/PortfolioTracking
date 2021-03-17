from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import routes
import appData
import helperFunctions as helper
import sys
import logging
from pprint import pprint

# baseDir = '/Users/lakshdang/Documents/PortfolioTracking/Data/'
baseDir = '../Data/'
# print("starting python server", flush=True)
appData.init(baseDir)

class SimpleHTTPRequestHandler(BaseHTTPRequestHandler):
	def do_POST(self):
		content_length = int(self.headers['Content-Length']) # <--- Gets the size of data
		post_data = self.rfile.read(content_length) # <--- Gets the data itself
		post_data = json.loads(post_data.decode())
		retjson = routes.route(self.path, post_data)
		helper.jsonSerializeObject(retjson)
		self.send_response(200)
		self.end_headers()
		self.wfile.write(json.dumps(retjson).encode())

	def log_message(self, format, *args):
		return

httpd = HTTPServer(('localhost', 8081), SimpleHTTPRequestHandler)
print('Server running on port: 8081')
httpd.serve_forever()