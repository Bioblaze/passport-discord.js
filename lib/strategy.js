var jwt = require('jsonwebtoken');
var OAuth2Strategy = require("passport-oauth2");
var InternalOAuthError = OAuth2Strategy.InternalOAuthError;

var instance = null;
class Strategy extends OAuth2Strategy {
  constructor(options, verify) {
    options = options || {};
    options.authorizationURL = options.authorizationURL || "https://discordapp.com/api/oauth2/authorize";
    options.tokenURL = options.tokenURL || "https://discordapp.com/api/oauth2/token";
    options.scopeSeparator = options.scopeSeparator || ' ';
    options.customHeaders = options.customHeaders || {};

    if (!options.customHeaders['User-Agent']) {
      options.customHeaders['User-Agent'] = options.userAgent || 'passport-discord.js';
    }

    super(options, verify);

    this.name = "discord.js";
    this._options = options;
    //this._oauth2.setAuthMethod("Bearer");
    this._oauth2.useAuthorizationHeaderforGET(true);
    instance = this;
  }
  userProfile(token, done) {
    this._oauth2.get("https://discordapp.com/api/users/@me", token, function (err, body, res) {
      if (err) {
        return done(new InternalOAuthError("failed to fetch user profile", err));
      }
      try {
        var profile = JSON.parse(body);
      } catch(e) {
        return done(e);
      }
      profile.provider = 'discord.js';
      profile.accessToken = token;
      Promise.all([
        Strategy.checkScope.call(null, "connections", token),
        Strategy.checkScope.call(null, "guilds", token)
      ]).then(([connections, guilds]) => {
        if (connections) profile.connections = connections;
        if (guilds) profile.guilds = guilds;
        return done(null, profile);
      }).catch(err => {
        return done(err);
      });
    });
  }
  authorizationParams(options) {
    var params = {}
    if (options.permissions != undefined) {
      params.permissions = options.permissions;
    }
    if (options.scope != undefined) {
      if (options.scope instanceof Array) {
        params.scope = options.scope.join(options.scopeSeparator);
      }
      if (options.scope instanceof String) {
        params.scope = options.scope;
      }
    }
    return params
  }
  static checkScope(scope, token) {
    return new Promise(function(res, rej) {
      if (instance._options.scope.indexOf(scope) > -1) {
        instance._oauth2.get(`https://discordapp.com/api/users/@me/${scope}`, token, function (err, body, _res) {
          if (err) {
            rej(new InternalOAuthError(`failed to fetch user's ${scope}`, err));
          }
          try {
            res(JSON.parse(body));
          } catch(e) {
            rej(e);
          }
        });
      } else {
        return res(null);
      }
    });
  }
}

module.exports = Strategy;
