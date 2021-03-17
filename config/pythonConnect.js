var axios = require('axios').default;
const pythonDir = 'http://localhost:8081';

module.exports = {
	postRequest: function (path, data, callback){
		axios.post(pythonDir+path, data)
		.then(result=>{
			// console.log(typeof(result))
			// console.log(typeof(result.data))
			// if (typeof result.data === 'string' || result.data instanceof String)
			// 	result.data = JSON.parse(result.data)
			callback(null, result);
		})
		.catch(error=>{
			callback(error, null);
		})
	}
}