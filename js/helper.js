/**
 * Save cookie
 */
function saveCookie(tabId, domain, callback) {
  const clientCookie  = 'php-console-client';
  const url = 'http://' + domain;

  const data = btoa(JSON.stringify({'php-console-client': app.protocol}));
  chrome.cookies.get({
    'url' : url,
    'name': clientCookie
  }, function(cookie) {
    if(!cookie || cookie.value != data) {
      chrome.cookies.set({
        'url'   : url,
        'name'  : clientCookie,
        'secure': false,
        'value' : data
      }, function() {
        callback
          ? callback(true)
          : chrome.tabs.reload(tabId, {'bypassCache': true});
      });
    } else {
      callback();
    }
  });
}

/**
 * Extract the value from the http header
 */
function getHeaderValue(responseHeaders, headerName, headerName2) {
  for (const i in responseHeaders) {
    if ([headerName, headerName2].includes(responseHeaders[i]['name'])) {
      return responseHeaders[i]['value'];
    }
  }
  return null;
}

/**
 * Extract the domain from the give url
 */
function getUrlDomain(url) {
  return new URL(url)['hostname'];
};

/**
 * Extract the base domain from the given domain
 */
function getBaseDomain(domain) {
  const baseDomainRegexp = new RegExp('(^|\\.)([^.]+\\.[\\w]+)$');
  const m = baseDomainRegexp.exec(domain);
  return m ? m[2] : domain;
};
