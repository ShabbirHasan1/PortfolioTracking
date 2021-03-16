var axios = require('axios').default;
const pythonDir = 'http://localhost:8081';

module.exports = {
	postRequest: function (path, data, callback){
		axios.post(pythonDir+path, data)
		.then(result=>{
			callback(null, result);
		})
		.catch(error=>{
			callback(error, null);
		})
	}
}