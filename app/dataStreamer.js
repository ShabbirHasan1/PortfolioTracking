const util = require('util');
const configAuth = require('../config/auth');
const KiteConnect = require("kiteconnect").KiteConnect;
const KiteTicker = require("kiteconnect").KiteTicker;
const pythonConnect = require('../config/pythonConnect');
let ticker = null;
let tickerConnected = null;
let dataStreamerNsp = null;
let prices = {}
var kc = new KiteConnect({"api_key": configAuth.kiteConnect.api_key});
var dataVersionId = null;
var access_token = null;

module.exports = function(io, em){
	return{
		initStreamer: function(){
			ticker = new KiteTicker({api_key: "7harnllatioi70jm", access_token: null});
			dataStreamerNsp = io.of('/dataStreamer');
			em.on("Python Server Started", function(data){
				// console.log("Inside Python Server Started event listener")
				getPageData(function(error, pageData){
					console.log(typeof(pageData))
					if(error)console.log(error);
					let list = []
					console.log(pageData)
					dataVersionId = pageData.dataVersionId
					let subscribedInstruments = pageData.subscribedInstruments
					subscribedInstruments.forEach(function(instrument){
						if(isNaN(instrument))return;
						prices[parseInt(instrument)] = null
						list.push(parseInt(instrument))
					})
					dataStreamerNsp.on("connection", function(socket){
						let user = socket.request.user
						// console.log(dataVersionId)
						socket.on("getAllSubscribedPrices", function(data, callback){
							callback(null, {"prices": prices, "tickerConnected": tickerConnected});
						})

						socket.on("disconnect", function(reason){
							console.log(`${socket.id} has disconnected`)
							pythonConnect.postRequest("/setSocketOptionChain", {"socketID": socket.id}, function(error, result){})
							// console.log(`user ${user.firstName} has disconnected because ${reason}`)
						})

						socket.on('getPageData', function(data, callback){
							console.log(dataVersionId)
							console.log(data.dataVersionId)
							if(data.dataVersionId==dataVersionId)return callback(null, null);
							getPageData(function(error, pageData){
								if(error)return callback({"error": "Backend Error"});
								return callback(null, pageData)
							})
						})

						require('./socketRoutes')(socket, em)
					})

					em.on('setDataVersion', function(data){
						dataVersionId = data.dataVersionId
						console.log(dataVersionId)
					})

					em.on("updateSubscribedInstruments", function(data){
						let addedSubscribedInstruments = data.addedSubscribedInstruments 
						let deletedSubscribedInstruments = data.deletedSubscribedInstruments
						updateSubscribedInstruments(addedSubscribedInstruments, deletedSubscribedInstruments)
					})

					em.on('kiteConnected', function(){
						ticker = new KiteTicker({"api_key": configAuth.kiteConnect.api_key, "access_token": access_token});
						ticker.connect()
						ticker.on("ticks", onTicks);
						ticker.on("connect", onConnect);
						ticker.on("disconnect", onDisconnect)
						pythonConnect.postRequest('/setKiteAccessToken', {"access_token": access_token}, function(error, result){
							if(error)return em.emit("dailyDataUpdate", {"error": true})
							em.emit("dailyDataUpdate", result.data)
						})
					})

					em.on('dailyDataUpdate', function(data){
						dataVersionId = data.dataVersionId
						dataStreamerNsp.emit("dailyDataUpdate", data)
					})
				})
			})
		},

		generateKiteSession: function(request_token, callback){
		// 	//todo
		// 	let request_token = req.query.request_token
			let temp_kite = new KiteConnect({"api_key": configAuth.kiteConnect.api_key});
			temp_kite.generateSession(request_token, configAuth.kiteConnect.api_secret)
			.then(function(response){
				console.log(response)
				access_token = response.access_token
				return callback(null)
				// console.log(access_token)
		// 	// 	// console.log("Kite streamer connected")
		// 	// 	// console.log("redirecting user")
		// 	// 	// res.redirect("/successKiteLogin")
		// 	// 	// console.log("done redirecting user")
		// 	// 	// pythonConnect.postRequest('/setKiteAccessToken', {"access_token": access_token}, function(error, result){
		// 	// 	// 	if(error)return em.emit("dailyDataUpdate", {"error": true})
		// 	// 	// 	em.emit("dailyDataUpdate", result.data)
		// 	// 	// 	// res.redirect("/successKiteLogin")
				// })
		// 	// 	em.emit("kiteConnected", access_token)
		// 	// 	return res.redirect("/successKiteLogin")
			})
			.catch(function(error){
				return callback(true)
		// 	// 	console.log(error)
		// 	// 	dataStreamerNsp.emit("tickerConnectionError", {"tickerConnected": false})
		// 	// 	// res.redirect("/failKiteLogin")
			})
		},

		getDataStreamerNsp: function(){
			return dataStreamerNsp
		},

		kiteConnectTest: function(req, res){
			pythonConnect.postRequest("/longTestRoute1",{}, function(error, result){
				if(error)return res.send({"error": error});
				res.redirect("/successKiteLogin")
				pythonConnect.postRequest('/longTestRoute2',{}, function(error, result){
					if(error)return console.log("test fail")
					console.log("test success")
				})
			})
		}
	}
}

function onTicks(ticks){
	// console.log(ticks)
	let new_prices = {}
	ticks.forEach(function(tick){
		let curr_price = setPriceInPaisa(tick['last_price'])
		let last_close_price = setPriceInPaisa(tick['ohlc']['close'])
		new_prices[tick['instrument_token']] = {
			"curr_price": curr_price,
			"last_close_price": last_close_price,
			"volume": tick['volume'],
			"OI": tick["oi"]
		}
	})
	prices = Object.assign(prices, new_prices)
	dataStreamerNsp.emit("newPrices" , new_prices)
	// console.log()
	// console.log(prices)
}

function getPageData(callback){
	pythonConnect.postRequest('/pageData', {}, function(error, result){
		if(error)callback(error);
		callback(null, result.data)
	})
}

function updateSubscribedInstruments(addedInstruments, deletedInstruments){
	let deletedInstrumentList = []
	deletedInstruments.forEach(function(instrumentID){
		if(isNaN(instrumentID))return;
		delete prices[parseInt(instrumentID)]
		deletedInstrumentList.push(parseInt(instrumentID))
	})
	ticker.unsubscribe(deletedInstrumentList)
	addedInstrumentList = []
	addedInstruments.forEach(function(instrumentID){
		if(isNaN(instrumentID))return;
		prices[parseInt(instrumentID)] = null
		addedInstrumentList.push(parseInt(instrumentID));
	})
	ticker.subscribe(addedInstrumentList)
	ticker.setMode(ticker.modeFull, addedInstrumentList);
	if(deletedInstrumentList.length>0)dataStreamerNsp.emit("deleteTrackedInstruments", {"deletedInstruments":deletedInstrumentList})
}

function setPriceInPaisa(price){
	let priceInPaise = price.toFixed(2).toString().split('.')
	priceInPaise = (parseInt(priceInPaise[0])*100 + parseInt(priceInPaise[1]))
	return priceInPaise
}

function onConnect(){
	tickerConnected = true;
	let subscribedInstruments = Object.keys(prices).map(function(elem){return parseInt(elem)});
	ticker.subscribe(subscribedInstruments)
	ticker.setMode(ticker.modeFull, subscribedInstruments);
	if(tickerConnected)dataStreamerNsp.emit("tickerConnectionUpdate", {"tickerConnected": true})
	console.log("ticker connected");
}

function onDisconnect(){
	if(tickerConnected != false){
		dataStreamerNsp.emit("tickerConnectionUpdate", {"tickerConnected": false})
		console.log("ticker not connected");
	}
	tickerConnected = false;
}