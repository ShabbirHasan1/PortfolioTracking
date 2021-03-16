var schedule = require('node-schedule');
var pythonConnect = require('../config/pythonConnect');

module.exports = function(em){
	var j = schedule.scheduleJob('0 0 * * * *', function(fireDate){
		// console.log(new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''))
		// console.log('This job was supposed to run at ' + fireDate + ', but actually ran at ' + new Date());
		pythonConnect.postRequest('/dailyDataUpdate', {}, function(error, result){
			if(error)return console.log(error);
			console.log("Inside daily data update function")
			em.emit("dailyDataUpdate", result.data)
		})
	});
}