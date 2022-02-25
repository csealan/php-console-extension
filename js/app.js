window['app'] = new function() {
  const self          = this;

  let listenDomains   = {};
  let headersHandler  = null;
  let lastDomainsUrls = {};
  let _tabsIndex      = 0;
  let _tabsIds        = {};
  let packsQueue      = [];

  self.protocol = 5;

  /**
   * Output the messages in console
   */
  function handleMessagesPacksQueue() {
    if (!packsQueue.length) {
      return;
    }

    const packs = packsQueue.slice(0);
    packsQueue = [];

    let consolePacks = [];

    // Validate protocol
    const lastPack = packs[packs.length - 1];
    if (lastPack['protocol'] != self.protocol) {
      return;
    }

    // Prepare the console messages
    for (const pack of packs) {
      if (!pack['messages']) {
        continue
      }

      // Convert messages to console format
      const messages = pack['messages'];
      let consoleMessages = [];
      for (const message of messages) {
        message['args'] = ['%c ' + message['tags'] + ' ', 'color: white; background: blue', message['data']];
        consoleMessages.push(message);
      }

      // Pack the console messages
      if (consoleMessages.length) {
        consolePacks.push({
          'url'    : pack['url'],
          'groupName'  : pack['url'],
          'collapse'   : false,
          'messages'   : consoleMessages
        });
      }
    }

    // Send the console messages
    if (consolePacks.length) {
      let isReady = false;
      const tabId = lastPack['tabId'];

      let interval = setInterval(function() {
        chrome.tabs.get(tabId, function(tab) {
          if (!tab || !tab.status || (tab.status == 'complete' && !isReady && _tabsIds[tabId])) {
            isReady = true;
            clearInterval(interval);

            chrome.tabs.sendMessage(tabId, {
              '_id'                : _tabsIds[tabId],
              '_handleConsolePacks': true,
              'packs'              : consolePacks,
            });
          }
        });
      }, 100);

      setTimeout(function() {
        if(!isReady) {
          clearInterval(interval);
        }
      }, 10000);
    }
  }

  /**
   * This function would be triggered when the http header is received
   */
  function onHeadersReceived(info) {
    const domain        = getUrlDomain(info.url);
    const headerPackage = getHeaderValue(info['responseHeaders'], 'PHP-Console', 'php-console');
    if (lastDomainsUrls[domain] == info.url || headerPackage) {

      let pack = {
        'tabId' : info.tabId <= 0 ? null : info.tabId,
        'url'   : info.url,
        'domain': getUrlDomain(info.url)
      };

      // Add header values to pack
      if (headerPackage) {
        lastDomainsUrls[pack['domain']] = pack['url'];
        pack = Object.assign(pack, JSON.parse(headerPackage));
      }

      if (pack['tabId']) {
        chrome.tabs.get(pack['tabId'], function(tab) {
          pack['tabUrl'] = tab.url;
          packsQueue.push(pack);
          handleMessagesPacksQueue();
        });
      }
    }
  }

  /**
   * Listen to the _registerTab message
   */
  chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
    if (!request['_registerTab']) {
      return false;
    }

    // Skip the "chrome-extension://" page
    const url = request['url'];
    if (url.indexOf('chrome-extension://') == 0) {
      return true;
    }

    // Register tab and create the headers-receive handler
    const domain       = getUrlDomain(url);
    const baseDomain   = getBaseDomain(domain);
    let listenerReload = false;

    if (!listenDomains[baseDomain]) {
      listenDomains[baseDomain] = true;

      const filter = {
        'urls' : ['*://*.' + baseDomain + '/*'],
        'types': ['main_frame', 'sub_frame', 'xmlhttprequest', 'other']
      };
      chrome.webRequest.onCompleted.addListener(onHeadersReceived, filter, ['responseHeaders']);
      chrome.webRequest.onBeforeRedirect.addListener(onHeadersReceived, filter, ['responseHeaders']);

      listenerReload = true;
    }

    saveCookie(sender.tab.id, domain, function(cookieReload) {
      const id = _tabsIndex++;
      _tabsIds[sender.tab.id] = id;
      sendResponse({
        'id' : id,
        'url': (listenerReload || cookieReload ? url : '')
      });
    });

    return true;
  });
};
document.addEventListener('DOMContentLoaded', window['app'], false);
