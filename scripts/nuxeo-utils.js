/**
 *	nuxeo-utils.js
 *
 *	Utilities to:
 *		- Store values locally (url and credentials)
 *		- Get default values (mainly for testing)
 */
if(typeof UTILS_NUXEO !== 'undefined') {
	console.log("[WARN] Nuxeo initialization called more than once");
}

UTILS_NUXEO = null;

(function scope_UTILS_NUXEO() {
	"use strict";
	
	//--------------------------------------
	//Constants
	//--------------------------------------
	// Using an object so toString() is easier to write
	var K =  {
		QUERY_LIMIT_DEFAULT	: 9,// 4 rows of 3 for example
	
		KEY_FOR_STORAGE		: "Nuxeo-IS"
	};
	
	//--------------------------------------
	// Constructor and functions
	//--------------------------------------
	function _UTILS_NUXEO() {
		var _nuxeoHost = "",
			_login = "",
			_pwd = "",
			_queryLimit = K.QUERY_LIMIT_DEFAULT,
			_remember = true;
	
		//--------------------------------------
		// Properties
		//--------------------------------------
		this.__defineGetter__('nuxeoHost', function() { return _nuxeoHost; });
		this.__defineSetter__('nuxeoHost', function(inValue) {
											if(typeof(inValue) === "string") {
												_nuxeoHost = inValue;
											} else {
												throw new TypeError("This property is a string");
											}
										});
		
		this.__defineGetter__('login', function() { return _login; });
		this.__defineSetter__('login', function(inValue) {
											if(typeof(inValue) === "string") {
												_login = inValue;
												_buildBasicAuth();
											} else {
												throw new TypeError("This property is a string");
											}
										});
		
		this.__defineGetter__('pwd', function() { return _pwd; });
		this.__defineSetter__('pwd', function(inValue) {
											if(typeof(inValue) === "string") {
												_pwd = inValue;
												_buildBasicAuth();
											} else {
												throw new TypeError("This property is a string");
											}
										});

		this.__defineGetter__('queryLimit', function() { return _queryLimit; });
		this.__defineSetter__('queryLimit', function(inValue) { _queryLimit = inValue });

		
		// Constants
		this.__defineGetter__('QUERY_LIMIT_DEFAULT', function() { return K.QUERY_LIMIT_DEFAULT; });
		this.__defineGetter__('KEY_FOR_STORAGE', function() { return K.KEY_FOR_STORAGE; });
		
		this.__defineSetter__('QUERY_LIMIT_DEFAULT', function(inValue) { throw new TypeError("This property is read-only"); });
		this.__defineSetter__('KEY_FOR_STORAGE', function(inValue) { throw new TypeError("This property is read-only"); });
				
		//--------------------------------------
		//Private functions
		//--------------------------------------
		/**
		 * _poorManStringXOR
		 * Just to obfuscate a bit the stored password
		 * As it's an XOR operation:
		 * 	- It's called "poorMan" ;->
		 *  - The same sring can be alternatively retreived by calling _poorManStringXOR
		 * 
		 * @param {string} inStr, the string to xor.
		 * 
		 */
		function _poorManStringXOR(inStr) {
			var result = "";
			var key = 12;
			for(var i = 0; i < inStr.length; i++) {
				result += String.fromCharCode(key ^ inStr.charCodeAt(i));
			}

			return result;
		}

		/**
		 * _saveParams
		 * We don't try-catch. It's bad (not doing it is bad. try-catch is not bad)
		 *
		 * Numeric values are converted to string
		 */
		function _saveParams() {
			/*
			window.localStorage.setItem(K.KEY_FOR_STORAGE,
										JSON.stringify({
											nuxeoHost		: _nuxeoHost,
											login			: _login,
											pwd				: _poorManStringXOR(_pwd),
											queryLimit		: "" + _queryLimit
										}) );
			*/
			window.localStorage.setItem(K.KEY_FOR_STORAGE,
										_poorManStringXOR(JSON.stringify({
											nuxeoHost		: _nuxeoHost,
											login			: _login,
											pwd				: _pwd
										})) );
		}
		
		/**
		 * _loadSavedParams
		 */
		function _loadSavedParams() {
			
			_nuxeoHost = "http://demo.nuxeo.com/nuxeo";
			_login = "";
			_pwd = "";
			_queryLimit = K.QUERY_LIMIT_DEFAULT;
			//_remember = true;
			
			try {
				var values = JSON.parse( _poorManStringXOR(window.localStorage[K.KEY_FOR_STORAGE]) );
				
				if(values) {
					if("nuxeoHost" in values && typeof values.nuxeoHost === "string") {
						_nuxeoHost = values.nuxeoHost;
					}

					if("login" in values && typeof values.login === "string") {
						_login = values.login;
					}

					if("pwd" in values && typeof values.pwd === "string") {
						_pwd = values.pwd;
					}

				}
				
			} catch(e) {
				// No values or pb in storage
			}
		}
		
		/**
		 * _removeSavedParams
		 * 
		 */
		function _removeSavedParams() {
			window.localStorage.removeItem(K.KEY_FOR_STORAGE);
		}
		
		
		//--------------------------------------
		//Instance methods
		//--------------------------------------
		/**
		 * toString
		 * Mainly for quick debug/check values
		 */
		this.toString = function() {
			return JSON.stringify (
				{	constants	: K,
				
					nuxeoHost	: _nuxeoHost,
					login		: _login,
					pwd			: _pwd
				});
		};

		
		/**
		 * readyForQuery
		 * 
		 */
		this.readyToQuery = function() {
			return _nuxeoHost !== "" && _login !== "" && _pwd !== "";
		};

		/**
		 * getParams
		 * 
		 *
		this.getParams = function() {
			return { nuxeoHost	: _nuxeoHost,
					 login		: _login,
					 pwd		: _pwd,
					 remember	: _remember
					};
		};
		*/
		/**
		 * setParams
		 * 
		 */
		this.setParams = function(inNuxeoHost, inLogin, inPwd) {
			
			/* . . . ERROR CHECK PARAMETERS . . . */
			
			_nuxeoHost = inNuxeoHost;
			if(_nuxeoHost[ _nuxeoHost.length - 1 ] === "/") {
				_nuxeoHost = _nuxeoHost.substring(0, _nuxeoHost.length - 1);
			}
			_login = inLogin;
			_pwd = inPwd;
			_saveParams();

		};
		
		// All declared, time to initialize self
		_loadSavedParams();

	} // function _UTILS_NUXEO()
	
	//--------------------------------------
	//Class methods
	//--------------------------------------
	/*
	_UTILS_NUXEO.doThis = function(p1, p2) {
	
	}
	*/
	
	UTILS_NUXEO = new _UTILS_NUXEO();

}());

// --EOF--
 