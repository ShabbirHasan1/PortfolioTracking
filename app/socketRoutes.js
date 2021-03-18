const pythonConnect = require('../config/pythonConnect');
const dataStreamer = require('./dataStreamer')
console.log("starting socketRoutes.js file")

module.exports = function(socket, em){
	socket.on("test", function(data){
		console.log("Test socket route")
	})

	socket.on('addContainerAjax', function(data, callback){
		pythonConnect.postRequest('/addContainer', data, function(error, result){
			if(error)return callback("Backend Error");
			let resData = result.data
			if(resData['error'])resData['error'] = "Failed to add container";
			else resData['message'] = "Container Added";
			em.emit("setDataVersion", {"dataVersionId": result.data.dataVersionId})
			socket.broadcast.emit('dataUpdate', result.data);
			callback(null, resData)
		})
	})

	socket.on('addTransactionsAjax', function(data, callback){
		pythonConnect.postRequest('/addTransactions', data, function(error, result){
			if(error)console.log(error);
			if(error)return callback("Backend Error");
			let resData = result.data
			let addedSubscribedInstruments = resData.addedInstruments
			let deletedSubscribedInstruments = resData.deletedInstruments
			em.emit("setDataVersion", {"dataVersionId": result.data.dataVersionId})
			socket.broadcast.emit('dataUpdate', result.data);
			em.emit("updateSubscribedInstruments", {"addedSubscribedInstruments":addedSubscribedInstruments, "deletedSubscribedInstruments": deletedSubscribedInstruments})
			callback(null, resData)
		})
	})

	socket.on('updateContainersBookedProfitStartDate', function(data, callback){
		console.log("Inside updateContainersBookedProfitStartDate event listener")
		pythonConnect.postRequest('/updateContainersBookedProfitStartDate', data, function(error, result){
			if(error){
				console.log(error);
				return callback("Backend Error")
			}
			em.emit("setDataVersion", {"dataVersionId": result.data.dataVersionId})
			socket.broadcast.emit('dataUpdate', result.data);
			callback(null, result.data)
		})
	})

	socket.on('updateSingleContainerGroup', function(data, callback){
		pythonConnect.postRequest('/updateSingleContainerGroup', data, function(error, result){
			if(error)return callback("Backend Error");
			em.emit("setDataVersion", {"dataVersionId": result.data.dataVersionId})
			socket.broadcast.emit('dataUpdate', result.data);
			callback(null, result.data)
		})
	})

	socket.on('addInstrumentToWatchlist', function(data, callback){
		pythonConnect.postRequest('/addInstrumentToWatchlist', data, function(error, result){
			if(error){
				console.log(error)
				return callback({"error": "Backend error"})
			}
			console.log(result.data)
			let subscribedInstrumentsUpdatesObj = {
				"addedSubscribedInstruments":result.data['addedInstruments'],
				"deletedSubscribedInstruments":result.data['deletedInstruments']
			}
			em.emit("setDataVersion", {"dataVersionId": result.data.dataVersionId})
			em.emit("updateSubscribedInstruments", subscribedInstrumentsUpdatesObj)
			socket.broadcast.emit('dataUpdate', result.data);
			return callback(null, result.data)
		})
	})

	socket.on('deleteInstrumentFromWatchlist', function(data, callback){
		pythonConnect.postRequest('/deleteInstrumentFromWatchlist', data, function(error, result){
			if(error){
				console.log(error)
				return callback({"error": "Backend error"})
			}
			console.log(result.data)
			let subscribedInstrumentsUpdatesObj = {
				"addedSubscribedInstruments":result.data['addedInstruments'],
				"deletedSubscribedInstruments":result.data['deletedInstruments']
			}
			em.emit("setDataVersion", {"dataVersionId": result.data.dataVersionId})
			em.emit("updateSubscribedInstruments", subscribedInstrumentsUpdatesObj)
			socket.broadcast.emit('dataUpdate', result.data);
			return callback(null, result.data)
		})
	})

	socket.on('createWatchlist', function(data, callback){
		pythonConnect.postRequest('/createWatchlist', data, function(error, result){
			if(error){
				console.log(error);
				return callback({"error": "Backend error"})
			}
			em.emit("setDataVersion", {"dataVersionId": result.data.dataVersionId})
			socket.broadcast.emit('dataUpdate', result.data);
			return callback(null, result.data)
		})
	})

	socket.on('updateContainersToSingleGroup', function(data, callback){
		pythonConnect.postRequest('/updateContainersToSingleGroup', data, function(error, result){
			if(error){
				console.log(error)
				return callback({"error": "Backend error"})
			}
			em.emit("setDataVersion", {"dataVersionId": result.data.dataVersionId})
			socket.broadcast.emit('dataUpdate', result.data);
			return callback(null, result.data)
		})
	})

	socket.on('closeAllExpiredOpenPos', function(data, callback){
		pythonConnect.postRequest('/closeAllExpiredOpenContainers', data, function(error, result){
			if(error){
				console.log(error)
				return callback({"error": "Backend error"})	
			}
			let resData = result.data
			let addedSubscribedInstruments = resData.addedInstruments
			let deletedSubscribedInstruments = resData.deletedInstruments
			em.emit("setDataVersion", {"dataVersionId": result.data.dataVersionId})
			socket.broadcast.emit('dataUpdate', result.data);
			em.emit("updateSubscribedInstruments", {"addedSubscribedInstruments":addedSubscribedInstruments, "deletedSubscribedInstruments": deletedSubscribedInstruments})
			callback(null, resData)
		})
	})

	socket.on("createStrategy", function(data, callback){
		pythonConnect.postRequest('/createStrategy', data, function(error, result){
			if(error){
				console.log(error)
				return callback({"error": "Backend error"})	
			}
			em.emit("setDataVersion", {"dataVersionId": result.data.dataVersionId})
			socket.broadcast.emit('dataUpdate', result.data);
			return callback(null, result.data)
		})
	})

	socket.on("setSocketOptionChain", function(data, callback){
		data['socketID'] = socket.id
		pythonConnect.postRequest('/setSocketOptionChain', data, function(error, result){
			if(error){
				console.log(error)
				return callback({"error": "Backend error"})	
			}
			let subscribedInstrumentsUpdatesObj = {
				"addedSubscribedInstruments":result.data['addedInstruments'],
				"deletedSubscribedInstruments":result.data['deletedInstruments']
			}
			console.log(subscribedInstrumentsUpdatesObj)
			em.emit("updateSubscribedInstruments", subscribedInstrumentsUpdatesObj)
			return callback(null, result.data)
		})
	})

	socket.on("addLoan", function(data, callback){
		pythonConnect.postRequest('/addLoan', data, function(error, result){
			if(error){
				console.log(error)
				return callback({"error": "Backend error"})	
			}
			em.emit("setDataVersion", {"dataVersionId": result.data.dataVersionId})
			socket.broadcast.emit('dataUpdate', result.data);
			return callback(null, result.data)
		})
	})
}