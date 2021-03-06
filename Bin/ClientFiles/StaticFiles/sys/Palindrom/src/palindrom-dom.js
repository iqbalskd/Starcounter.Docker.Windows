/*! Palindrom 
 * https://github.com/Palindrom/Palindrom
 * (c) 2017 Joachim Wester
 * MIT license
 */
if (typeof require !== 'undefined') {
  var Palindrom = require('./palindrom');
}

var PalindromDOM = (function() {
  /**
   * PalindromDOM
   * @extends {Palindrom}
   * @param {Object} [options] map of arguments. See README.md for description
   */
  var PalindromDOM = function(options) {
    if (typeof options !== 'object') {
      throw new Error('PalindromDOM constructor requires an object argument.');
    }
    if (!options.remoteUrl) {
      throw new Error('remoteUrl is required');
    }
    var onStateReset = options.onStateReset || options.callback;
    if(options.callback) {
      console.warn('Palindrom: options.callback is deprecated. Please use `onStateReset` instead');
    }
    this.element = options.listenTo || document.body;
    var clickHandler = this.clickHandler.bind(this);
    this.historyHandler = this.historyHandler.bind(this);

    this.historyHandlerDeprecated = function() {
      console.warn(
        "`puppet-redirect-pushstate` event is deprecated, please use `palindrom-redirect-pushstate`, if you're using `puppet-redirect`, please upgrade to `palindrom-redirect`"
      );
      this.historyHandler();
    }.bind(this);

    /* in some cases, people emit redirect requests before `listen` is called */
    this.element.addEventListener(
      'palindrom-redirect-pushstate',
      this.historyHandler
    );
    /* backward compatibility: for people using old puppet-redirect */
    this.element.addEventListener(
      'puppet-redirect-pushstate',
      this.historyHandlerDeprecated
    );

    options.onStateReset = function addDOMListeners(obj) {
      this.listen();
      onStateReset && onStateReset.call(this, obj);
    };

    this.listen = function() {
      this.listening = true;
      this.element.addEventListener('click', clickHandler);
      window.addEventListener('popstate', this.historyHandler); //better here than in constructor, because Chrome triggers popstate on page load

      this.element.addEventListener(
        'palindrom-redirect-pushstate',
        this.historyHandler
      );

      /* backward compatibility: for people using old puppet-redirect */
      this.element.addEventListener(
        'puppet-redirect-pushstate',
        this.historyHandlerDeprecated
      );
    };
    this.unlisten = function() {
      this.listening = false;

      this.element.removeEventListener('click', clickHandler);
      window.removeEventListener('popstate', this.historyHandler); //better here than in constructor, because Chrome triggers popstate on page load
      this.element.removeEventListener(
        'palindrom-redirect-pushstate',
        this.historyHandler
      );

      /* backward compatibility: for people using old puppet-redirect */
      this.element.removeEventListener(
        'puppet-redirect-pushstate',
        this.historyHandlerDeprecated
      );
    };

    //TODO move fallback to window.location.href from PalindromNetworkChannel to here (PalindromDOM)

    Palindrom.call(this, options);
  };
  PalindromDOM.prototype = Object.create(Palindrom.prototype);

  /**
   * Push a new URL to the browser address bar and send a patch request (empty or including queued local patches)
   * so that the URL handlers can be executed on the remote
   * @param url
   */
  PalindromDOM.prototype.morphUrl = function(url) {
    history.pushState(null, null, url);
    this.network.changeState(url);
  };

  PalindromDOM.prototype.clickHandler = function(event) {
    //Don't morph ctrl/cmd + click & middle mouse button
    if (event.ctrlKey || event.metaKey || event.which == 2) {
      return;
    }

    if (event.detail && event.detail.target) {
      //detail is Polymer
      event = event.detail;
    }

    var target = event.target;

    if (target.nodeName !== 'A') {
      for (var i = 0; i < event.path.length; i++) {
        if (event.path[i].nodeName == 'A') {
          target = event.path[i];
          break;
        }
      }
    }

    //needed since Polymer 0.2.0 in Chrome stable / Web Plaftorm features disabled
    //because target.href returns undefined for <polymer-ui-menu-item href="..."> (which is an error)
    //while target.getAttribute("href") returns desired href (as string)
    var href = target.href || target.getAttribute('href');

    if (href && PalindromDOM.isApplicationLink(href)) {
      event.preventDefault();
      event.stopPropagation();
      this.morphUrl(href);
    } else if (target.type === 'submit') {
      event.preventDefault();
    }
  };

  PalindromDOM.prototype.historyHandler = function(/*event*/) {
    this.network.changeState(location.href);
  };

  /**
   * Returns information if a given element is an internal application link that Palindrom should intercept into a history push
   * @param elem HTMLElement or String
   * @returns {boolean}
   */
  PalindromDOM.isApplicationLink = function(elem) {
    if (typeof elem === 'string') {
      //type string is reported in Polymer / Canary (Web Platform features disabled)
      var parser = document.createElement('A');
      parser.href = elem;

      // @see http://stackoverflow.com/questions/736513/how-do-i-parse-a-url-into-hostname-and-path-in-javascript
      // IE doesn't populate all link properties when setting .href with a relative URL,
      // however .href will return an absolute URL which then can be used on itself
      // to populate these additional fields.
      if (parser.host == '') {
        parser.href = parser.href;
      }

      elem = parser;
    }
    return elem.protocol == window.location.protocol &&
      elem.host == window.location.host;
  };

  /* backward compatibility, not sure if this is good practice */
  if (typeof global === 'undefined') {
    if (typeof window !== 'undefined') {
      /* incase neither window nor global existed, e.g React Native */
      var global = window;
    } else {
      var global = {};
    }
  }
  global.PuppetDOM = PalindromDOM;

  /* Since we have Palindrom bundled,
  let's expose it in case anyone needs it */
  global.Puppet = Palindrom;
  global.Palindrom = Palindrom;

  return PalindromDOM;
})();

if (typeof module !== 'undefined') {
  module.exports = PalindromDOM;
  module.exports.default = PalindromDOM;
  module.exports.__esModule = true;
}
