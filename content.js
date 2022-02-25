function getCookie(name) {
  const m = new RegExp(';\\s*' + name + '=(.*?);', 'g').exec(';' + document.cookie + ';');
  return m ? m[1] : null;
}

const serverProtocol = getCookie('php-console-server');

if (serverProtocol) {
  let id = '';

  /**
   * Listen to the _handleConsolePacks message
   */
  chrome.extension.onMessage.addListener(function(request) {
    if (request['_id'] != id || !request['_handleConsolePacks']) {
      return;
    }

    for (const pack of request['packs']) {
      console.group(pack['groupName']);
      for (const message of pack['messages']) {
        console.log.apply(console, message['args']);
      }
      console.groupEnd();
    }
  });

  /**
   * Send the _registerTab message
   */
  chrome.runtime.sendMessage({
    '_registerTab': true,
    'url'         : window.location.href,
    'protocol'    : serverProtocol
  }, function(response) {
    if (response['url']) {
      window.location.href = response['url'];
    }
    id = response['id'];
  });
}
