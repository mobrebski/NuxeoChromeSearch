
/**
 * Get our DOM elements once for all, instead of calling jQuery()"#theID") several times.
 * Using "jq" instead of "$" because of double-click issues depending on the editor.
 */
var _jqNuxeoHost,
	_jqLogin,
	_jqPwd,
	_jqPopupSubmit,
	_jqSavedMsg;

/* 
 * _init
 * 
 * Called once the DOM is loaded:
 *		- Initialize the nuxeo sdk and get a nuxeo client
 * 		- Initialize our variables
 * 		- Extend jQuery
 */
function _init() {

	// ======================================== Get a nuxeo client
	//gNuxeoClient = new nuxeo.Client();


	_jqNuxeoHost = jQuery("#nuxeoHost");
	_jqLogin = jQuery("#login");
	_jqPwd = jQuery("#pwd");
	_jqPopupSubmit = jQuery("#popupSubmit");
	_jqSavedMsg = jQuery("#savedMsg");

}


/*	Add event listeners once the DOM has fully loaded by listening for the
	DOMContentLoaded` event on the document, and adding your listeners to
	specific elements when it triggers.
*/
document.addEventListener('DOMContentLoaded', function (inEvt) {

	
	_init();
	
	_jqPopupSubmit.on("click", doSaveInfos);



	_jqNuxeoHost.val(UTILS_NUXEO.nuxeoHost);
	_jqLogin.val(UTILS_NUXEO.login);
	_jqPwd.val(UTILS_NUXEO.pwd);

		
});


function doSaveInfos(inEvt) {
	UTILS_NUXEO.setParams(_jqNuxeoHost.val(),
					_jqLogin.val(),
					_jqPwd.val() );
	_jqSavedMsg.fadeIn(500);

}