var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var configAuth = require('./auth');
var axios = require('axios').default;
var pythonConnect = require('./pythonConnect');

module.exports = function(passport){

	passport.serializeUser(function(user, done){
		done(null, user.id);
	});

	passport.deserializeUser(function(id, done){
		user = {"id": id}
		pythonConnect.postRequest('/getUser', {'googleProfileID': id}, function(error, result){
			if(error)
				return done(error, null)
			
			curr_user = JSON.parse(result.data['user'])[0]
			if(curr_user==false)
				return done(null, false)
			
			done(null, curr_user)
		})
	});

	passport.use(new GoogleStrategy({
	    clientID: configAuth.googleAuth.clientID,
	    clientSecret: configAuth.googleAuth.clientSecret,
	    callbackURL: configAuth.googleAuth.callbackURL
	  },
	  function(accessToken, refreshToken, profile, done){
	    	process.nextTick(function(){
	    		user = {"id": profile.id};
				data = {userProfile: profile}
				pythonConnect.postRequest('/authenticateUser', data, function(error, result){
					if(error)
						return done(error)
					else{
						if(!result.data.authorizedUser)
							return done(null, false);
						return done(null, profile);
					}
				});
	    	});
	    })
	);
};