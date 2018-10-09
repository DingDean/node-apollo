const client = require('./apollo');
const EventEmitter = require('events');
const superagent = require('superagent');

const api = module.exports = {};


/**
 * A Simple Config Watcher
 *
 * @returns {Object}
 */
class Watcher extends EventEmitter {
  constructor () {
    super();
    this.continue = true;
  }

  close () {
    console.log('closing watcher')
    this.continue = false;
  }
}

/**
 * Read Configs From Apollo Server
 *
 * @param {Object} params
 * @param {Object} options
 * @returns {Object} A promise for the configs
 */
api.read = function ( params, options = {cache: true} ) {
  const { cache } = options;

  if ( cache === true ) {
    return client.remoteConfigServiceFromCache( params );
  } else {
    return client.remoteConfigServiceSkipCache( params );
  }
}

/**
 * Watch Config Changes From Apollo Server
 *
 * @param {Object} params
 * @returns {Object} An EventEmitter
 */
api.watch = function ( params ) {
  let watcher = new Watcher();
  const { namespaceName } = params;
  let index = namespaceName.map(e => {
    return {
      namespaceName: e,
      notificationId: -1 // -1 indicates an initial request
    }
  });
  poll(watcher, params, index);
  setImmediate(function () {
    if (watcher.data) {
      watcher.emit('data', watcher.data)
    }
  });
  return watcher;
}

/**
 * A recursive call to poll for configuration change
 * The procedure follows section 1.4 of the following documentation:
 * https://github.com/ctripcorp/apollo/wiki/其他语言客户端接入指南
 *
 * @param {Object} watcher A Watcher instance
 * @param {Object} params
 * @param {Object} A map indicates the state of a namespace
 */
async function poll ( watcher, params, index ) {
  const {
    configServerUrl,
    appId,
    clusterName: cluster,
    namespaceName,
    clientIp
  } = params;

  let url = `${configServerUrl}/notifications/v2`;
  let query = {
    appId,
    cluster,
    notifications: JSON.stringify( index )
  };
  try {
    let result = await superagent
      .get( url )
      .timeout( { deadline: 65000 } ) // required by apollo api
      .query( query )

    for (let update of result.body) {
      let target = index.find(e => e.namespaceName === update.namespaceName)
      if (target) {
        target.notificationId = update.notificationId
      }
    }
    let conf = await client.remoteConfigServiceSkipCache( params );
    watcher.data = conf;
    watcher.emit('data', conf);
    if (watcher.continue) {
      poll( watcher, params, index );
    }
  } catch (e) {
    if ( e.status === 304 ) {
      if (watcher.continue) {
        poll( watcher, params, index );
      }
    } else {
      watcher.emit('error', e);
    }
  }
}
