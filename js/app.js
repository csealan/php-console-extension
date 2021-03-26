window['app'] = new function() {
	var self = this;
	var tabsUrls = {};
	var lastChangeLogVersion = 2.9;
	var listenDomains = {};

	var isUpdated = false;
	var options = null;
	//noinspection JSUnresolvedVariable
	var runtime = chrome.runtime; // sec
	//noinspection JSUnresolvedFunction
	var manifest = runtime.getManifest();
	var messagesHandler = null;
	var headersHandler = null;
	var clientCookie = 'php-console-client';
	var notificationsHandler = null;
	var sslRegexp = new RegExp('^https://', 'i');
	var _tabsIndex = 0;
	this._tabsIds = {};

	this['getOptions'] = function() {
		return options;
	};

	function setClientInfo(tabId, domain, callback) {
		options['getServer'](domain, function(server) {
			var clientInfo = {'php-console-client': options.protocol};

			// cookie
			var ssl = messagesHandler.domainsSsl[domain] || false;
			var url = (ssl ? 'https' : 'http') + '://' + domain;
			var data = btoa(JSON.stringify(clientInfo));
			chrome.cookies.get({
				'url': url,
				'name': clientCookie
			}, function(cookie) {
				if(!cookie || cookie.value != data || (ssl && cookie.secure != ssl)) {
					chrome.cookies.set({
						'url': url,
						'name': clientCookie,
						'secure': ssl,
						'value': data
					}, function() {
						callback
							? callback(true)
							: chrome.tabs.reload(tabId, {'bypassCache': true});
					});
				}
				else {
					callback();
				}
			});
		});
	}

	this.sendConsoleMessage = function(tabId, request) {
		request['_id'] = self._tabsIds[tabId];
		chrome.tabs.sendMessage(tabId, request);
	};

	function registerTabClient(tabId, url, protocol, callback) {
		if(protocol != options['protocol']) {
			messagesHandler.updateIcon({
				'tabId': tabId,
				'protocol': protocol
			});
		}
		tabsUrls[tabId] = url;
		var domain = messagesHandler.getUrlDomain(url);
		var baseDomain = messagesHandler.getBaseDomain(domain);

		var listenerReload = false;

		if(!listenDomains[baseDomain]) {
			listenDomains[baseDomain] = true;
			headersHandler.addListener(baseDomain);
			listenerReload = true;
		}

		setClientInfo(tabId, domain, function(cookieReload) {
			id = _tabsIndex++;
			self._tabsIds[tabId] = id;
			callback(id, listenerReload || cookieReload);
		});
	}

	this['getActiveTab'] = function(callback) {
		chrome.tabs.query({'currentWindow': true, 'active': true}, function(tabs) {
				var tabId = tabs[0].id;
				var url = messagesHandler.tabsUrls[tabId] ? messagesHandler.tabsUrls[tabId] : tabs[0].url;
				callback(tabId, messagesHandler.getUrlDomain(url));
			}
		);
	};

	chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
		if(request['_registerTab']) {
			var url = request['url'];
			if(url.indexOf('chrome-extension://') == 0) {
				return true;
			}
			registerTabClient(sender.tab.id, url, request['protocol'], function(id, reload) {
				sendResponse({
					'id': id,
					'url': messagesHandler.domainsSsl[messagesHandler.getUrlDomain(url)] && !sslRegexp.exec(url)
						? url.replace('http://', 'https://')
						: (reload ? url : '')
				});
			});
			return true;
		}
	});

	// construct

	options = new Options(function(options) {
		notificationsHandler = new NotificationsHandler(options);
		messagesHandler = new MessagesHandler(options, notificationsHandler, self);
		headersHandler = new HeadersHandler(messagesHandler);

		var currentVersion = parseFloat(new RegExp('^\\d+\\.\\d+').exec(manifest.version)[0]);

		if(!chrome.extension.inIncognitoContext && options['version'] != currentVersion) {
			if(!options['version']) {
				// on installed
				var link = 'https://github.com/barbushin/php-console#php-console-server-library';
				notificationsHandler.showNotification({
					'type': 'update',
					'subject': manifest['name'] + ' installed',
					'permanent': true,
					'data': 'To use PHP Console on your server you need to install PHP Console server library.',
					'buttons': [
						{
							'title': 'PHP Console server library Installation & Usage Guide',
							'url': link,
							'icon': 'img/right.png'
						}
					]
				});
				options['version'] = currentVersion;
			}
			else {
				options['version'] = currentVersion;
			}
		}
	});
};
document.addEventListener('DOMContentLoaded', window['app'], false);
