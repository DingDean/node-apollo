const client = require('./apollo');
const cache = require('memory-cache');
const EventEmitter = require('events');
const superagent = require('superagent');

const api = module.exports = {};

/**
 * Read Configs From Apollo Server
 *
 * @param {Object} params
 * @param {Object} options
 */
api.read = function ( params, options ) {
  const { cache = true } = options;

  if ( cache === true ) {
    return client.remoteConfigServiceFromCache( params );
  } else {
    return client.remoteConfigServiceSkipCache( params );
  }
}

api.watch = function ( params ) {
  const {
    configServerUrl,
    appId,
    clusterName,
    namespaceName,
    clientIp
  } = params;

  // record the namespace being watched over
  let key = `${configServerUrl}#${appId}#${clusterName}#${namespaceName}`;
  let hit = cache.get(key);
  if ( hit ) {
    return hit;
  }

  let watcher = new EventEmitter();
  watcher.continue = true;
  cache.put(key, watcher);
  let index = namespaceName.map(e => {
    return {
      namespaceName: e,
      notificationId: -1 // TODO: better explain why it's -1
    }
  })
  poll(watcher, params, index);
  setImmediate(function () {
    if (watcher.data) {
      watcher.emit('data', watcher.data)
    }
  });
  return watcher;
}

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
      .timeout( { deadline: 65000 } )
      .query( query )

    console.log('get new config')
    let { notificationId } = result.body[0];
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
    // TODO: deal with error
    if ( e.status === 304 ) {
      console.log('not changed')
      if (watcher.continue) {
        poll( watcher, params, index );
      }
    } else {
      console.log(e)
    }
  }
}
