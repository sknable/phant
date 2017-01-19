#!/usr/bin/env node

var Phant = require('./index'),
    dotenv = require('dotenv').load(),
    path = require('path'),
    Keychain = require('phant-keychain-hex'),
    Meta = require('phant-meta-nedb'),
    Storage = require('phant-stream-csv'),
    HttpManager = require('phant-manager-http'),
    app = Phant()
    http_port = process.env.PHANT_PORT || 1025,
    telnet_port = process.env.PHANT_TELNET_PORT || 1026;

var keys = Keychain({
  publicSalt: process.env.PHANT_PUBLIC_SALT || 'public salt',
  privateSalt: process.env.PHANT_PRIVATE_SALT || 'private salt'
});

var meta = Meta({
  directory: process.env.PHANT_STORAGEDIR || 'phant_streams'
});

var stream = Storage({
  directory: process.env.PHANT_STORAGEDIR || 'phant_streams',
  cap: process.env.PHANT_CAP || 2 * 1024 * 1024 * 1024, // 2gb
  chunk: process.env.PHANT_CHUNK || 500 * 1024 // 500k
});

var validator = Phant.Validator({
  metadata: meta
});

var httpOutput = Phant.HttpOutput({
  validator: validator,
  storage: stream,
  keychain: keys
});

var httpInput = Phant.HttpInput({
  validator: validator,
  keychain: keys
});

// start listening for connections
Phant.HttpServer.listen(http_port);

var httpManager = HttpManager({
  metadata: meta,
  keychain: keys,
  validator: validator
});

// register manager with phant
app.registerManager(httpManager);

// attach manager to http server
Phant.HttpServer.use(httpManager);

// attach input to http server
Phant.HttpServer.use(httpInput);

// attach output to http server
Phant.HttpServer.use(httpOutput);

// register input with phant
app.registerInput(httpInput);

app.registerOutput(stream);
app.registerOutput(httpOutput);

// register manager with phant
app.registerManager(
  Phant.TelnetManager({
    port: telnet_port,
    metadata: meta,
    keychain: keys,
    validator: validator
  })
);

console.log('phant http server running on port ' + http_port);
console.log('phant telnet server running on port ' + telnet_port);
