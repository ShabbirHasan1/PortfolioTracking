var axios = require('axios').default;
var pythonConnect = require('../config/pythonConnect');
var util = require('util')

module.exports = function(app, passport, em, dataStreamer){
	let dataStreamerNsp = dataStreamer.getDataStreamerNsp()
	
	app.get('/', function(req, res){
		if(req.isAuthenticated())res.redirect('/profile');
		else res.render('index.ejs');
	});

	app.get('/auth/google', passport.authenticate('google', {scope: ['profile', 'email']}));

	app.get('/auth/kiteConnect', function(req, res, next){
		dataStreamer.generateKiteSession(req.query.request_token, function(error){
			if(error)return res.redirect('/errorPage');
			res.redirect('/successKiteLogin')
		})
	})

	app.get('/successKiteLogin', function(req, res){
		res.render("kiteLoginSuccess.ejs")
		em.emit("kiteConnected")
	})

	app.get('/googleLoginSuccess', 
	  passport.authenticate('google', {successRedirect: '/profile', failureRedirect: '/unauthorizedUser' })
	);

	app.get('/logout', function(req, res){
		req.logout();
		res.redirect('/');
	});

	app.get('/profile', isLoggedIn, function(req, res){
		res.render('profile.ejs', {user: req.user});
	});

	app.get('/addAuthorizedUser', isLoggedIn, function(req, res){
		res.render("addAuthorizedUser.ejs")
	});

	app.post('/addAuthorizedUser', isLoggedIn, function(req, res){
		data = {email: req.body.email, isContainerOwner: req.body.isContainerOwner}
		pythonConnect.postRequest('/addAuthorizedUser', data, function(error, result){
			if(error)
				res.redirect('/errorPage')
			else
				res.redirect('/profile')
		})
	});

	app.get('/unauthorizedUser', function(req, res){
		res.render("unauthorizedUser.ejs")
	})

	app.get('/addTransactions', isLoggedIn, function(req, res){
		res.render('profile.ejs', {user: req.user})
	})

	app.get('/manageGroups', isLoggedIn, function(req, res){
		res.render('profile.ejs', {user: req.user})
	})

	app.post('/createGroup', isLoggedIn, function(req, res){
		data = req.body
		pythonConnect.postRequest('/createGroup', data, function(error, result){
			if(error)return res.send(error);
			res.send(result);
		})
	})

	app.get('/manageGroupsAjax', isLoggedIn, function(req, res){
		pythonConnect.postRequest('/manageGroups', {}, function(error, result){
			if(error)return res.send(error);
			var containerGroups = JSON.parse(result.data['containerGroups'])
			var instrumentOwners = JSON.parse(result.data['instrumentOwners'])
			var groupsData = JSON.parse(result.data['groupsData'])
			return res.send({"containerGroups": containerGroups, "instrumentOwners": instrumentOwners, "groupsData":groupsData})
		})
	})

	app.post('/updateGroups', isLoggedIn, function(req, res){
		data = req.body;
		pythonConnect.postRequest('/updateMultipleContainerGroups', data, function(error, result){
			if(error)return res.send(error);
			res.send(result.data)
		})
	})

	app.get('/containerPage', isLoggedIn, function(req, res){
		res.render('profile.ejs');
	})

	app.post('/containerPage', isLoggedIn, function(req, res){
		data = req.body;
		pythonConnect.postRequest('/containerPageData', data, function(error, result){
			if(error)return res.send(error);
			res.send(result.data)
			// var containerTransactionReturns = result.data.containerReturns;
			// var containerInfo = JSON.parse(result.data.containersInfo)[0]
			// var groupsData = JSON.parse(result.data['groupsData'])
			// var containerOwnerInfo = JSON.parse(result.data.user)[0]
			// res.send({"containerTransactionReturns": containerTransactionReturns, "containerInfo": containerInfo, "groupsData": groupsData, "containerOwnerInfo": containerOwnerInfo});
		})
	})

	app.get('/pageData', isLoggedIn, function(req, res){
		pythonConnect.postRequest('/pageData', {}, function(error, result){
			if(error){
				console.log(error);
				return res.send({"error": "Backend Error"})
			}
			// console.log(result.data.substring(1021194-10, 1021194+10))
			// console.log(typeof(result.data))
			res.send(result.data)
		})
	})

	app.get('/errorPage', isLoggedIn, function(req, res){
		res.render('errorPage.ejs')
	})

	app.get('/derivatives', isLoggedIn, function(req, res){
		res.render('profile.ejs')
	})

	app.get('/selct2AjaxTesting', isLoggedIn, function(req, res){
		pythonConnect.postRequest('/getInstrumentSearchList', req.query, function(error, result){
			if(error)return res.send({"error": "Backend Error"});
			res.send(result.data)
		})
	})

	app.post('/getStrategySpreadData', isLoggedIn, function(req, res){
		pythonConnect.postRequest("/getStrategySpreadData", req.body, function(error, result){
			if(error)return res.send({"error": "Backend Error"});
			res.send(result.data)
		})
	})

	app.post('/getStrategyExpectedReturnsSpreadOnDate', isLoggedIn, function(req, res){
		pythonConnect.postRequest("/getStrategyExpectedReturnsSpreadOnDate", req.body, function(error, result){
			if(error)return res.send({"error": "Backend Error"});
			res.send(result.data)
		})
	})

	app.get('/lending', isLoggedIn, function(req, res){
		res.render('profile.ejs')
	})

	app.get('/kiteConnectTest', dataStreamer.kiteConnectTest)

	app.post('/getLoanPayments', isLoggedIn, function(req, res){
		pythonConnect.postRequest("/getLoanPayments", req.body, function(error, result){
			if(error)return res.send({"error": "Backend Error"});
			res.send(result.data)
		})
	})
};

function isLoggedIn(req, res, next){
	if(req.isAuthenticated()){
		return next();
	}
	res.redirect('/');
}