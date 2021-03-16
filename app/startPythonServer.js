const childProcess = require("child_process");
var pythonProcess = null

module.exports = function(em){
	return{
		startPythonServer: function(){
			pythonProcess = childProcess.spawn('python3',["/Users/vardaandang/Documents/PortfolioTracking/PythonServer/pythonserver.py"]);
				
			pythonProcess.stdout.on('data',function(chunk){
				var textChunk = chunk.toString('utf8');// buffer to string
				if(textChunk.indexOf("Server running on port")>=0)em.emit("Python Server Started", {});
				console.log(textChunk)
			});

			pythonProcess.stderr.on('data', function(error){
				var errorString = error.toString('utf8');// buffer to string
				console.error("python error: " + errorString);
			});
		},

		startPythonServerMock: function(){
			setTimeout(function(){
				em.emit("Python Server Started", {})
			}, 0)
		},

		getPythonProcess: function(){
			return pythonProcess
		},

		shutdownPythonServer: function(){
			pythonProcess.kill()
		}
	}
}