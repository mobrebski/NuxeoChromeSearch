/**
 * Nuxeo Google Images Search Extension
 * 
 * When searching on images.google.com, the extension also searches
 * in the Nuxeo server for DAM assets, using the keywords of the user.
 *
 *
 * Things to remember about Chrome extensions:
 *		- To call nuxeo server and avoid cross scripting security policy to apply,
 *		  add the appropriate URL(s) to the manifest
 *
 *		- Also, inline JS is not allowed (http://developer.chrome.com/extensions/contentSecurityPolicy.html#JSExecution)
 *		  so you can't write things like
 *				img = document.createElement('img');
 *				img.setAttribute("onclick", "some-inline-JavaScript"
 *
 *		- If needed, we use HTML5 features, we don't care if they don't exist in IE ;->
 *		  For example, we use theElement.classList.add() to add a css class
 *		  Or jQuery. Depends on our mood.
 *
 *		- please, see "You are not in a regular webpage"
 *  
 * --------------------------------------
 * DEPENDENCIES
 * --------------------------------------
 * The following scripts need to be loaded before this code runs. This is done by adding
 * the appropriate <SCRIPT .../> tag in popup.html. If it is not loaded, all is hidden
 * in the DOMContentLoaded event
 * 
 * We need:
 *		jQuery and jQuery UI (for the accordion effect)
 *		UTILS (in utils.js)
 *		UTILS_NUXEO (in nuxeo-utils.js)
 *      nuxeo (in nuxeo.js - this is the Nuxeo JavaScript SDK)
 * 
 * --------------------------------------
 * YOU ARE NOT IN A REGULAR WEBPAGE
 * --------------------------------------
 * Yes. We are not in a regular webpage, with a user already
 * connected (logged in) to the server. Even if credentials will
 * be passed for the query, I noticed that most of the time, if
 * not all the time, first query leads to authorization errors
 * (all 401) when setting the src of images. The URL is perfect
 * and works when doing the second query.
 *
 * What is received is the login page from nuxeo:
 *			.../login.jsp
 *
 * I tried a lot, a lot of things. I Actually spent way more time
 * on this than on the extension itself. I should have wrte everything
 * I tried, but I did not.
 * So.
 * The workaround is ugly:
 *		- Do the request, limit the result to 1 document
 *		- In the callback that displays the result, re-do the query
 *		  with the correct limit
 *		- This is done using a classical boolean flag (gSecondQuery)
 *
 * Things I remember doing which did not work:
 *		- Start with a call to the_nuxeo_host/site/automation/login
 *				=> Call was ok, but still had the login page
 *		- Setting the img.src element later
 *		- and some others, which were mainly variations of these 2
 *
 * ----------------------------------------------------------------------
 * LICENSE IS QUITE COOL
 * ----------------------------------------------------------------------
 * (C) Copyright 2014 Nuxeo SA (http://nuxeo.com/) and others.
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the GNU Lesser General Public License
 * (LGPL) version 2.1 which accompanies this distribution, and is available at
 * http://www.gnu.org/licenses/lgpl-2.1.html
 *
 *	(basically, it means you do whatever you want with it)
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * Contributors:
 *     Thibaud Arguillere (Nuxeo)
 *     Mike Obrebski (Nuxeo)
 * ----------------------------------------------------------------------
 * ----------------------------------------------------------------------
 */

/**
 * Get our DOM elements once for all, instead of calling jQuery()"#theID") several times.
 * Using "jq" instead of "$" because of double-click issues depending on the editor.
 */
var 
 	_jqConnError,
	_jqResultTitle,
	_jqResults,
	_jqAccordion,
	_currentPage;

// The nuxeo client
var gNuxeoClient = null;

var gKeywords = "";

// The ugly workaround
var gSecondQuery = false;

// Initializae the accordion, hide the connection error
if(typeof jQuery !== "undefined") {
	jQuery(function() {
		jQuery("#connectionError").hide();
	});
}

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
	gNuxeoClient = new nuxeo.Client();

	// ======================================== Setup variables

	_jqConnError = jQuery("#connectionError");
	//_jqResultTitle = jQuery("#resutTitle");
	_jqResults = jQuery("#displayResults");
	//_jqAccordion = jQuery("#accordion");
	
	_currentPage = 1;

}

/*	Add event listeners once the DOM has fully loaded by listening for the
	DOMContentLoaded` event on the document, and adding your listeners to
	specific elements when it triggers.
*/
document.addEventListener('DOMContentLoaded', function (inEvt) {
	
	/*
	// We need nuxeo and jQuery
	if(		typeof nuxeo === "undefined"
		||  typeof UTILS === "undefined"
		||	typeof UTILS_NUXEO === "undefined"
		||  typeof jQuery === "undefined") {
		// Need to use direct HTML APIs (not jQuery: It's eventually not here)
		// Actually, we don't need jQuery to add/remove class, right? ;->
		// Note: Not all browsers implement classList as of today (june, 2013) but we
		// sure don't care: This is Chrome extension, and Chrome handles classList.
		document.getElementById("askParams").classList.add("doHide");
		document.getElementById("bigError").classList.remove("doHide");
		document.getElementById("bigError").classList.add("doShow");

	// ==================================================
		return; // We sure don't want to continue.
	// ==================================================
	}
	*/
	
	_init();
	queryIfPossible();
	
		
});


function queryIfPossible() {
	if(UTILS_NUXEO.readyToQuery()) {
		chrome.tabs.getSelected(null, function(inTab) {
			var kw = UTILS.getKeywordsFromGoogleUrl(inTab.url);
			if(kw.isGooglePage) {
				runTheQuery(kw.keywords);
			} else {
				// Log something?
				//console.log("Not on a Google page => no keywords available");
			}
		});
	} else {
		_jqConnError.fadeIn(500);
		jQuery("#waiting").hide();
		// Log something?
		//console.log("queryIfPossible: Not enough info to query (missing url, login, ...)");
	}
}

function clickOnThumbnail(inEvt) {
	var url = inEvt.srcElement.getAttribute("nuxeo_url");
	if(typeof url === "string" && url !== "") {
		window.open(url, '_blank');
	}
}

function clicked(pageClicked) {
	
	_currentPage = pageClicked;
	runTheQuery(inKeywords);
	
}

function displayResults(inResults) {
	var i, max, allDocs, aDoc, img, label, div, dispRes, has2KwAtLeast, kwLabel;

	gImgIDs = [];
	gImgSRCs = [];

	
	//Set page UI
	$(paginator).pagination({
			displayedPages: 4,
			items: inResults.resultsCount,
			itemsOnPage: UTILS_NUXEO.queryLimit,
			currentPage: _currentPage,
			cssStyle: 'compact-theme',
			onPageClick: function (pageNumber) { 
				_currentPage = pageNumber;
				queryIfPossible() }
	});
	
	// Remove previous if any
	_jqResults.empty();
	
	// Just for correct display of plural
	has2KwAtLeast = false;
	if(gKeywords == "") {
		kwLabel = "(no keyword: Query on all Documents)";
	} else {
		kwLabel = gKeywords.replace(" ", ", ");
		has2KwAtLeast = kwLabel.indexOf(" ") > 0;
	}
	_jqResults.append("<p id='resultLabel'>" + inResults.resultsCount + " Results for \""+ kwLabel + "\"</p>");
	 
	
	// To just add basic div/img, let's use standard DOM APIs instead of jQuery
	dispRes = document.getElementById("displayResults");
	
	// . . . check error . . .
	if(inResults["entity-type"] !== "documents") {
		//. . . error. . .
	} else {

		allDocs = inResults.entries;
		for (i = 0, max = allDocs.length; i < max; i++) {
			aDoc = allDocs[i];
			
			img = document.createElement('img');
			if(aDoc["entity-type"] === "document") {
				img.src = getThumbnailURL(aDoc);
				img.id = aDoc.uid;
				img.alt = aDoc.title;
				img.setAttribute("class", "nuxeoThumbnail");
				img.setAttribute("nuxeo_url", getNuxeoDocURL(aDoc));

			} else {
				img.src = "";
				img.setAttribute('alt', "ERROR: entity-type is not a Nuxeo document");
			}
		
			label = document.createElement("span");
			label.appendChild( document.createTextNode( aDoc.title ) );
			label.setAttribute("class", "thumbnailLabel");
			
			div = document.createElement("div");
			div.setAttribute("class", "thumbnailContainer");
			div.appendChild(img);
			div.appendChild(label);
		
			dispRes.appendChild(div);
		}

		dispRes.addEventListener('click', clickOnThumbnail, false);

		// See header. Ugly workround we either display the results
		// or re-do the query.
		//console.log("DISPLAY RESULTS...")
		if(gSecondQuery) {
			//console.log("...OK, DISPLAY");
			//gSecondQuery = false;

			//showHideWaiting(false);

			//_jqAccordion.accordion( "option", "active", 1);
		} else {
			//console.log("...ONE MORE TIME PLEASE");
			gSecondQuery = true;
			setTimeout(function() {
				//console.log("re-doing it");
				runTheQuery(gKeywords)
			}, 250);
		}
	}
}

function getThumbnailURL(inDoc) {

	if (typeof inDoc.properties["file:content"]   === "undefined") {
		return "/images/doc_icon.png";
	} else if ( $.inArray("Thumbnail", inDoc.facets) ) {
		return UTILS_NUXEO.nuxeoHost + "/nxthumb/default/" + inDoc.uid + "/blobholder:0/" + inDoc.properties["file:content"].name;
	} else {
		console.log("No thumbnail");
		return "/images/doc_icon.png";
	}
}

function getNuxeoDocURL(inDoc) {
	
	// For a display in DM view:
	// http://localhost:8080//nuxeo/nxpath/default/asset-library/bag-3.jpg@assets@view_documents?mainTabId=MAIN_TABS ... etc ...
	return UTILS_NUXEO.nuxeoHost + "/nxpath/default" + inDoc.path + "@view_documents?mainTabId=MAIN_TABS";
}

/*
function formatResultTitle(inResults) {
	// jQuery UI has added a span for the accordion arrow. Lets not remove it.
	var title = _jqResultTitle.children()[0].outerHTML;
	
	title += "Results";
	if("resultsCount" in inResults) {
		if(inResults.resultsCount == 0) {
			title += ": No Documents found";
		} else {
			title += ": " + inResults.entries.length + " among " + UTILS.pluralize(inResults.resultsCount, "documents found", "documents found");
		}
	}
	_jqResultTitle.html(title);
}
*/

 /* Callback called by nuxeo.js
  *
  */
function queryCallback(error, data, response) {
	if (error || !data) {
		_jqConnError.fadeIn(500);
		jQuery("#waiting").hide();
 	} else {
		// ============================================= Success
		//console.log(data);
		displayResults(data);
	}
}

function runTheQuery(inKeywords) {
	gKeywords = inKeywords;


	// Prepare statement
	var nxql = "";

	// We query only for "Document" documents
	nxql = "SELECT * FROM Document"
		+ " WHERE   ecm:mixinType != 'HiddenInNavigation'"
			+ " AND ecm:mixinType != 'Folderish'" 
			+ " AND ecm:isCheckedInVersion = 0"
			+ " AND ecm:currentLifeCycleState != 'deleted'";
	if(gKeywords !=  '') {
		nxql += " AND ecm:fulltext = '" + gKeywords + "'";
	}

	// Create the cient. These simple lines handle all the
	// stuff we need: Connect to Nuxeo to the correct URL
	// (using REST or automation), filling the GET or POST
	// request headers and content etc.
	var client = new nuxeo.Client({
		baseURL: UTILS_NUXEO.nuxeoHost,
  		username: UTILS_NUXEO.login,
  		password: UTILS_NUXEO.pwd,

  		// We found in our testing that sometime the default
  		// timeout was not enough. This is mainly because we
  		// also tested on poor hardware :->
  		timeout: 6000
	});

	// We want the file schema to build some urls
	client.schema("file");

	// Now, query
	client.operation('Document.PageProvider')
		  .params({
			query: nxql,
			pageSize: gSecondQuery ? UTILS_NUXEO.queryLimit : 1,
			page: _currentPage-1,
		  })
		  .execute(queryCallback);
}


//--EOF--