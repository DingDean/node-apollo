# node-apollo

此仓库继承并发展于[Quinton/node-apollo](https://github.com/Quinton/node-apollo)。

在原项目的基础上，本项目做了一下修改：

1. 简化接口
2. 新增实时监听配置的功能

## Installation

```bash
yarn add @tuya-fe/node-apollo
```

## API

### apollo#read 读取配置

```javascript
const apollo = require('@tuya-fe/node-apollo');

const params = {
  configServerUrl: '必填，配置服务器地址',
  appId: '必填，appId',
  clusterName: '必填，集群',
  namespaceName: ['命名空间1', '命名空间2', ...],
  clientIp: '选填'
};
const config = {
  cache: true, // 默认为 true
};
const getConfig = apollo.read( params, config );

getConfig.then( function doSomethingAboutIt( conf ) {
  ...
});
```

### apollo#watch 监听配置

```javascript
const apollo = require('@tuya-fe/node-apollo');

const params = {
  configServerUrl: '必填，配置服务器地址',
  appId: '必填，appId',
  clusterName: '必填，集群',
  namespaceName: ['命名空间1', '命名空间2', ...],
  clientIp: '选填'
};
const watcher = apollo.watch( params );

watcher.on('data', function doSomethingAboutIt( conf ) {
  ...
})

watcher.on('error', function cleanUp (err)  {
  ...
})
```
当你不想再监听配置变化时，请务必关闭 `watcher`:
```javascript
watcher.close()
```

