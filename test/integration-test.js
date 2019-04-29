/* eslint-env mocha */
'use strict';

var expect = require('chai').expect;
const MsbClient = require('../src/msb_client');
const uuidv4 = require('uuid/v4');
let fs = require('fs');
const util = require('util');
let Client = require('node-rest-client').Client;


/** ************** Peparation */

const ownerUuid = '7c328ad1-cea5-410e-8dd8-6c7ca5a2e4f5';
// main clients
const restclient = new Client();
// vars to check test connection states (updated by emitter)
let test_connected;
let test_registered;
let test_published;
// var to save last received message
let message_received;

// the msb urls to connect
// url of websocket broker of msb
let broker_url = 'ws://localhost:8085';
// url of smart object management
let so_url = 'http://localhost:8081';
// url of integration design management
let flow_url = 'http://localhost:8082';
// check if urls were set as pocess args
if (process.argv[3] !== undefined) {
  broker_url = process.argv[3];
}
if (process.argv[4] !== undefined) {
  so_url = process.argv[4];
}
if (process.argv[5] !== undefined) {
  flow_url = process.argv[5];
}

// check if process env var was set with name TESTENV_CUSTOMIP to be added to msb urls
if (process.env.TESTENV_CUSTOMIP !== undefined) {
  let testEnvCustomIp = process.env.TESTENV_CUSTOMIP;
  testEnvCustomIp = testEnvCustomIp.replace(/(\r\n|\n|\r)/gm, ''); // Remove line break if found
  console.log('Test Env Custom IP: ' + testEnvCustomIp);
  // Replace hostname or ip with testEnvCustomIp
  so_url = so_url.replace(/:\/\/(www[0-9]?\.)?(.[^/:]+)/i, '://' + testEnvCustomIp);
  flow_url = flow_url.replace(/:\/\/(www[0-9]?\.)?(.[^/:]+)/i, '://' + testEnvCustomIp);
  broker_url = broker_url.replace(/:\/\/(www[0-9]?\.)?(.[^/:]+)/i, '://' + testEnvCustomIp);
}
if(process.env.TESTENV_BROKER_URL !== undefined) {
  broker_url = process.env.TESTENV_BROKER_URL;
  console.log('Test Env Broker Url: ' + broker_url);
}
if(process.env.TESTENV_SO_URL !== undefined) {
  so_url = process.env.TESTENV_SO_URL;
  console.log('Test Env SO Url: ' + so_url);
}
if(process.env.TESTENV_FLOW_URL !== undefined) {
  flow_url = process.env.TESTENV_FLOW_URL;
  console.log('Test Env Flow Url: ' + flow_url);
}

console.log('SmartObjectMgmt URL: ' + so_url);
console.log('IntegrationDesignMgmt URL: ' + flow_url);
console.log('Websocket Interface URL: ' + broker_url);
let msb_url = broker_url;


/** ************** Test Suites */


/**
 * Test basic communication including an integration flow to test callbacks
 */
describe('Integration Test - Basic Communication With MSB', function() {

  let myMsbClient;
  // integration flow as json object
  let myFlow;
  let myFlowId;

  before(function() {
    // runs before all tests in this block
    myMsbClient = getNewMsbClientSample();
    myFlow = getFlowFromFile(myMsbClient);
    setConnectionStateListener(myMsbClient.getConnectionStateListener());
  });

  after(function() {
    // runs after all tests in this block
    if (myMsbClient.connected){
      disconnectClient(myMsbClient);
    }
  });

  afterEach(function() {
    // runs after each test in this block
  });

  beforeEach(function() {
    // runs before each test in this block
    // reset published event state
    test_published = false;
    message_received = undefined;
  });

  it('should get verification token via rest interface', function() {

    // 1. ARRANGE
    // see before()

    // 2. ACT
    // see getVerificationToken function

    // 3. ASSERT
    return getVerificationToken(ownerUuid, myMsbClient).then(function(token){
      var config = myMsbClient.getConfig();
      expect(config.identity.token, 'Generated verification token not updated in config').to.equal(token);
    });

  }).timeout(5000);

  it('should cache simple event until connected and registered', function() {

    // 1. ARRANGE
    // see before()
    var event_id = 'SIMPLE_EVENT1_STRING';
    var event_priority = 2;
    var event_value = 'HELLO WORLD!';
    var isCahced = true;

    // 2. ACT
    var waitForPublishedEventPromise = new Promise(function(resolve, reject) {
      myMsbClient.publish(event_id, event_value, event_priority, isCahced);
      setTimeout(function() {
        resolve();
      }, 2000); // wait in ms before continue with asserts
    });

    // 3. ASSERT
    return waitForPublishedEventPromise.then(function(){
      // get events from cache
      var eventsInCache = myMsbClient.eventCache;
      var eventImplFound;
      eventsInCache.forEach(function(eventImpl) {
        // find the matching event by event id
        if (eventImpl.eventId === event_id){
          eventImplFound = eventImpl;
        }
      });
      // console.log(JSON.stringify(eventImplFound, null, 4));
      // check JSON object for the event for all properties set
      expect(eventImplFound.eventId).to.be.equal(event_id);
      expect(eventImplFound.dataObject).to.be.equal(event_value);
      expect(eventImplFound.priority).to.be.equal(event_priority);
      // as not connected and not registered, event should be cached and no IO_PUBLISHED
      expect(test_published, 'Client could not send simple event to msb').to.equal(false);
    });

  }).timeout(30000); ;

  it('should connect and register client via websocket interface', function(done) {

    // 1. ARRANGE
    // see before()
    var config = myMsbClient.getConfig();
    var soUUid = config.identity.uuid;

    // 2. ACT
    // see connectAndRegisterClient function

    // 3. ASSERT
    connectAndRegisterClient(myMsbClient).then(function(){
      expect(myMsbClient.isConnected(), 'Client could not connect to msb').to.equal(true);
      expect(test_connected, 'Emmiter could not detect IO_CONNECTED').to.equal(true);
      expect(myMsbClient.isRegistered(), 'Client could not register to msb').to.equal(true);
      expect(test_registered, 'Emmiter could not detect IO_REGISTERED').to.equal(true);
      // check if smart ovject was added during registration
      getSmartObject(soUUid).then(function(soData){
        expect(soData.uuid, 'Cannot get smart object by id').to.be.equal(soUUid);
        // asnow connected and not registered, event of cache should be send and get IO_PUBLISHED
        // get events from cache
        var eventsInCache = myMsbClient.eventCache;
        expect(eventsInCache.length).to.equal(0);
        expect(test_published, 'Client could not send cached event to msb').to.equal(true);
        done();
      }).catch(function(err){
        done(err);
      });
    }).catch(function(err){
      done(err);
    });

  }).timeout(5000);

  it('should change configuration parameters via websocket interface', function() {

    // 1. ARRANGE
    // see before()
    var configParam_key = 'testParam1';
    var configParam_newValue = false;
    expect(myMsbClient.getConfigParameter(configParam_key)).to.equal(true);

    // 2. ACT
    var waitforForConfigParamsChangedPromise = new Promise(function(resolve, reject) {
      myMsbClient.changeConfigParameter(configParam_key, configParam_newValue);
      setTimeout(function() {
        resolve();
      }, 2000); // wait in ms before continue with asserts
    });

    // 3. ASSERT
    return waitforForConfigParamsChangedPromise.then(function(){
      expect(myMsbClient.getConfigParameter(configParam_key)).to.equal(configParam_newValue);
    });

  }).timeout(5000);

  it('should NOT change configuration parameters for invalid key', function() {

    // 1. ARRANGE
    // see before()
    var changed = false;
    var configParam_key = 'testParam1';
    var configParam_newValue = true;

    // 2. ACT
    var waitforForConfigParamsChangedPromise = new Promise(function(resolve, reject) {
      try {
        myMsbClient.changeConfigParameter('WrongKey', configParam_newValue);
        changed = true;
      } catch (err) {
        console.error(err);
      }
      setTimeout(function() {
        resolve();
      }, 2000); // wait in ms before continue with asserts
    });

    // 3. ASSERT
    return waitforForConfigParamsChangedPromise.then(function(){
      expect(changed).to.equal(false);
      expect(myMsbClient.getConfigParameter(configParam_key)).not.to.equal(configParam_newValue);
    });

  }).timeout(5000);

  it('should send simple event via websocket interface', function() {

    // 1. ARRANGE
    // see before()

    // 2. ACT
    var waitForPublishedEventPromise = new Promise(function(resolve, reject) {
      myMsbClient.publish('SIMPLE_EVENT1_STRING', 'HELLO WORLD!', true);
      setTimeout(function() {
        resolve();
      }, 2000); // wait in ms before continue with asserts
    });

    // 3. ASSERT
    return waitForPublishedEventPromise.then(function(){
      expect(test_published, 'Client could not send simple event to msb').to.equal(true);
    });

  }).timeout(30000); ;

  it('should send simple event (as event object) via websocket interface', function() {

    // 1. ARRANGE
    // see before()
    var eventObject = {
      eventId: 'SIMPLE_EVENT1_STRING',
      value: 'Hello World!',
      priority: 2,
      cached: false,
      postDate: new Date().toISOString(),
      correlationId: undefined,
    };

    // 2. ACT
    var waitForPublishedEventPromise = new Promise(function(resolve, reject) {
      myMsbClient.publish(eventObject);
      setTimeout(function() {
        resolve();
      }, 2000); // wait in ms before continue with asserts
    });

    // 3. ASSERT
    return waitForPublishedEventPromise.then(function(){
      expect(test_published, 'Client could not send simple event to msb').to.equal(true);
    });

  }).timeout(30000); ;

  it('should send simple event (as array) via websocket interface', function() {

    // 1. ARRANGE
    // see before()

    // 2. ACT
    var waitForPublishedEventPromise = new Promise(function(resolve, reject) {
      myMsbClient.publish('SIMPLE_EVENT2_INTEGER_ARRAY', [1, 2, 3]);
      setTimeout(function() {
        resolve();
      }, 2000); // wait in ms before continue with asserts
    });

    // 3. ASSERT
    return waitForPublishedEventPromise.then(function(){
      expect(test_published, 'Client could not send simple event to msb').to.equal(true);
    });

  }).timeout(30000); ;

  it('should send simple event (with JSON stringyfied datatype) via websocket interface', function() {

    // 1. ARRANGE
    // see before()

    // 2. ACT
    var waitForPublishedEventPromise = new Promise(function(resolve, reject) {
      myMsbClient.publish('SIMPLE_EVENT3_JSONDATAFORMAT', [1, 2, 3]);
      setTimeout(function() {
        resolve();
      }, 2000); // wait in ms before continue with asserts
    });

    // 3. ASSERT
    return waitForPublishedEventPromise.then(function(){
      expect(test_published, 'Client could not send simple event to msb').to.equal(true);
    });

  }).timeout(30000); ;

  it('should send simple event (with no payload) via websocket interface', function() {

    // 1. ARRANGE
    // see before()

    // 2. ACT
    var waitForPublishedEventPromise = new Promise(function(resolve, reject) {
      myMsbClient.publish('SIMPLE_EVENT4_NOPAYLOAD');
      setTimeout(function() {
        resolve();
      }, 2000); // wait in ms before continue with asserts
    });

    // 3. ASSERT
    return waitForPublishedEventPromise.then(function(){
      expect(test_published, 'Client could not send simple event to msb').to.equal(true);
    });

  }).timeout(30000); ;

  it('should send complex event via websocket interface', function() {

    // 1. ARRANGE
    // see before()

    // 2. ACT
    var waitforForPublishedEventPromise = new Promise(function(resolve, reject) {
      myMsbClient.publish('EVENT5', [
        {
          value1: 1.0,
          value2: 2.0,
          value3: 3.0,
          submodules: [
            {modname: 'Module 1'},
            {modname: 'Module 2'},
          ],
        },
        {
          value1: 5.0,
          value2: 2.0,
          value3: 8.0,
          submodules: [
            {modname: 'Module 4'},
            {modname: 'Module 6'},
          ],
        },
      ]);
      setTimeout(function() {
        resolve();
      }, 2000); // wait in ms before continue with asserts
    });

    // 3. ASSERT
    return waitforForPublishedEventPromise.then(function(){
      expect(test_published, 'Client could not send simple event to msb').to.equal(true);
    });

  }).timeout(5000);

  it('should create new flow via rest interface', function(done) {

    // 1. ARRANGE
    // see before()

    // 2. ACT
    // see createFlow function

    // 3. ASSERT
    createFlow(myFlow).then(function(flowId){
      expect(flowId, 'Could not get flow id when creating new flow').not.to.be.empty;
      expect(flowId, 'Flow id is not an integer value').to.be.a('number');
      myFlowId = flowId;
      // check if flow was created
      getFlow(myFlowId).then(function(flowData){
        expect(flowData.id, 'Cannot get flow by id').to.be.equal(myFlowId);
        expect(flowData.deployed, 'Created flow is deployed but should be undeployed initially').to.be.equal(false);
        done();
      }).catch(function(err){
        done(err);
      });
    }).catch(function(err){
      done(err);
    });


  }).timeout(5000); ;

  it('should deploy flow via rest interface', function(done) {

    // 1. ARRANGE
    // see before()

    // 2. ACT
    // see deployFlow function

    // 3. ASSERT
    deployFlow(myFlowId).then(function(){
      // check if flow is deployed
      getFlow(myFlowId).then(function(flowData){
        expect(flowData.id, 'Cannot get flow by id').to.be.equal(myFlowId);
        expect(flowData.deployed, 'Created flow is undeployed but should be deployed initially').to.be.equal(true);
        done();
      }).catch(function(err){
        done(err);
      });
    }).catch(function(err){
      done(err);
    });

  }).timeout(5000);

  it('should use flow to callback for event via websocket interface', function() {

    // 1. ARRANGE
    // see before()
    var eventId = 'arrayev';
    var eventValue = [
      'HELLO',
      'WORLD',
      '!',
    ];
    var priority = 2;
    var cached = true;
    var correlationId = uuidv4();

    // 2. ACT
    var waitforForPublishedEventAndCallbackPromise = new Promise(function(resolve, reject) {
      myMsbClient.publish(
        eventId,
        eventValue,
        priority,
        cached,
        undefined, // no postDate set
        correlationId
      );
      setTimeout(function() {
        resolve();
      }, 4000); // wait in ms before continue with asserts
    });

    // 3. ASSERT
    return waitforForPublishedEventAndCallbackPromise.then(function(){
      expect(test_published, 'Client could not send event to msb').to.equal(true);
      expect(message_received.a[0]).to.equal(eventValue[0]);
      expect(message_received.a[1]).to.equal(eventValue[1]);
      expect(message_received.a[2]).to.equal(eventValue[2]);
      expect(message_received.correlationId).to.not.be.empty;
      expect(message_received.correlationId).to.not.equal('0');
      expect(message_received.correlationId).to.not.equal('');
      expect(message_received.correlationId).to.equal(correlationId);
    });

  }).timeout(5000);

  it('should undeploy flow via rest interface', function(done) {

    // 1. ARRANGE
    // see before()

    // 2. ACT
    // see undeployFlow function

    // 3. ASSERT
    undeployFlow(myFlowId).then(function(){
      // check if flow is undeployed
      getFlow(myFlowId).then(function(flowData){
        expect(flowData.id, 'Cannot get flow by id').to.be.equal(myFlowId);
        expect(flowData.deployed, 'Created flow is deployed but should be undeployed initially').to.be.equal(false);
        done();
      }).catch(function(err){
        done(err);
      });
    }).catch(function(err){
      done(err);
    });

  }).timeout(5000);

  it('should delete flow via rest interface', function(done) {

    // 1. ARRANGE
    // see before()

    // 2. ACT
    // see deleteFlow function

    // 3. ASSERT
    deleteFlow(myFlowId).then(function(){
      // check if flow is deleted
      getFlow(myFlowId, true).then(function(flowData){
        expect(flowData.id, 'Can get flow by id, but shuld be already deleted').to.be.an('undefined');
        done();
      }).catch(function(err){
        done(err);
      });
    }).catch(function(err){
      done(err);
    });

  }).timeout(5000);

  it('should delete smart object via rest interface', function(done) {

    // 1. ARRANGE
    // see before()
    var config = myMsbClient.getConfig();
    var soUuid = config.identity.uuid;

    // 2. ACT
    // see deleteSmartObject function

    // 3. ASSERT
    deleteSmartObject(soUuid).then(function(){
      // check if smart object is deleted
      getSmartObject(soUuid, true).then(function(soData){
        expect(soData.uuid, 'Can get smart object by id, but shuld be already deleted').to.be.an('undefined');
        done();
      }).catch(function(err){
        done(err);
      });
    }).catch(function(err){
      done(err);
    });

  }).timeout(5000);

  it('should disconnect client via websocket interface', function() {

    // 1. ARRANGE
    // see before()

    // 2. ACT
    // see disconnectClient function

    // 3. ASSERT
    return disconnectClient(myMsbClient).then(function(){
      expect(myMsbClient.isConnected(), 'Client could not disconnect from msb').to.equal(false);
    });

  }).timeout(5000);

});


/**
 * Test basic communication with sockJs framing disabled
 */
describe('Integration Test - Basic Communication With MSB (no SockJsFraming)', function() {

  let myMsbClient;
  // integration flow as json object
  let myFlow;
  let myFlowId;

  before(function(done) {
    this.timeout(250000);
    // runs before all tests in this block
    myMsbClient = getNewMsbClientSample();
    // deactivate sockJsFraming
    myMsbClient.disablesockJsFraming(true);
    myFlow = getFlowFromFile(myMsbClient);
    setConnectionStateListener(myMsbClient.getConnectionStateListener());

    // connect, register and prepare flow
    getVerificationToken(ownerUuid, myMsbClient).then(function(token){
      connectAndRegisterClient(myMsbClient).then(function(){
        createFlow(myFlow).then(function(flowId){
          myFlowId = flowId;
          deployFlow(myFlowId).then(function(){
            done();
          }).catch(function(err){
            done(err);
          });
        }).catch(function(err){
          done(err);
        });
      }).catch(function(err){
        done(err);
      });
    });
  });

  after(function(done) {
    this.timeout(150000);
    // runs after all tests in this block
    var config = myMsbClient.getConfig();
    var soUuid = config.identity.uuid;
    // cleanup test suite
    undeployFlow(myFlowId).then(function(){
      deleteFlow(myFlowId).then(function(){
        deleteSmartObject(soUuid).then(function(){
          disconnectClient(myMsbClient).then(function(){
            done();
          });
        }).catch(function(err){
          disconnectClient(myMsbClient);
          done(err);
        });
      }).catch(function(err){
        disconnectClient(myMsbClient);
        done(err);
      });
    }).catch(function(err){
      disconnectClient(myMsbClient);
      done(err);
    });
  });

  afterEach(function() {
    // runs after each test in this block
  });

  beforeEach(function() {
    // runs before each test in this block
    // reset published event state
    test_published = false;
    message_received = undefined;
  });

  it('noSockJsFraming - should change configuration parameters via websocket interface', function() {

    // 1. ARRANGE
    // see before()
    var configParam_key = 'testParam1';
    var configParam_newValue = false;
    expect(myMsbClient.getConfigParameter(configParam_key)).to.equal(true);

    // 2. ACT
    var waitforForConfigParamsChangedPromise = new Promise(function(resolve, reject) {
      myMsbClient.changeConfigParameter(configParam_key, configParam_newValue);
      setTimeout(function() {
        resolve();
      }, 2000); // wait in ms before continue with asserts
    });

    // 3. ASSERT
    return waitforForConfigParamsChangedPromise.then(function(){
      expect(myMsbClient.getConfigParameter(configParam_key)).to.equal(configParam_newValue);
    });

  }).timeout(5000);

  it('noSockJsFraming - should use flow to callback for event via websocket interface', function() {

    // 1. ARRANGE
    // see before()
    var eventId = 'arrayev';
    var eventValue = [
      'HELLO',
      'WORLD',
      '!',
    ];
    var priority = 2;
    var cached = true;
    var correlationId = uuidv4();

    // 2. ACT
    myMsbClient.disablesockJsFraming(true);
    var waitforForPublishedEventAndCallbackPromise = new Promise(function(resolve, reject) {
      myMsbClient.publish(
        eventId,
        eventValue,
        priority,
        cached,
        undefined, // no postDate set
        correlationId
      );
      setTimeout(function() {
        resolve();
      }, 4000); // wait in ms before continue with asserts
    });

    // 3. ASSERT
    return waitforForPublishedEventAndCallbackPromise.then(function(){
      expect(test_published, 'Client could not send event to msb').to.equal(true);
      expect(message_received.a[0]).to.equal(eventValue[0]);
      expect(message_received.a[1]).to.equal(eventValue[1]);
      expect(message_received.a[2]).to.equal(eventValue[2]);
      expect(message_received.correlationId).to.not.be.empty;
      expect(message_received.correlationId).to.not.equal('0');
      expect(message_received.correlationId).to.not.equal('');
      expect(message_received.correlationId).to.equal(correlationId);
    });

  }).timeout(5000);

});


/**
 * Test basic communication with client-side heartbeat
 */
describe('Integration Test - Basic Communication With MSB (heartbeat)', function() {

  let myMsbClient;

  before(function(done) {
    this.timeout(250000);
    // runs before all tests in this block
    myMsbClient = getNewMsbClientSample();
    // deactivate sockJsFraming
    myMsbClient.setKeepAlive(true, 3000);
    setConnectionStateListener(myMsbClient.getConnectionStateListener());

    // connect, register and prepare flow
    getVerificationToken(ownerUuid, myMsbClient).then(function(token){
      connectAndRegisterClient(myMsbClient).then(function(){
        done();
      }).catch(function(err){
        done(err);
      });
    });
  });

  after(function(done) {
    this.timeout(150000);
    // runs after all tests in this block
    var config = myMsbClient.getConfig();
    var soUuid = config.identity.uuid;
    // cleanup test suite
    deleteSmartObject(soUuid).then(function(){
      disconnectClient(myMsbClient).then(function(){
        done();
      });
    }).catch(function(err){
      disconnectClient(myMsbClient);
      done(err);
    });
  });

  afterEach(function() {
    // runs after each test in this block
  });

  beforeEach(function() {
    // runs before each test in this block
    // reset published event state
    test_published = false;
    message_received = undefined;
  });

  it('should send simple event via websocket interface', function() {

    // 1. ARRANGE
    // see before()

    // 2. ACT
    var waitForPublishedEventPromise = new Promise(function(resolve, reject) {
      myMsbClient.publish('SIMPLE_EVENT1_STRING', 'HELLO WORLD!', true);
      setTimeout(function() {
        resolve();
      }, 2000); // wait in ms before continue with asserts
    });

    // 3. ASSERT
    return waitForPublishedEventPromise.then(function(){
      expect(test_published, 'Client could not send simple event to msb').to.equal(true);
    });

  }).timeout(30000); ;

});


/** ************** Shared Test Functions */

/**
 * Generates a verification token via rest api
 */
let getVerificationToken = function(ownerUuid, msbClient) {
  return new Promise(function(resolve, reject) {
    let path = so_url + '/service/token/' + ownerUuid;
    restclient.get(path, function(data, response) {
      try {
        expect(data).to.include.keys('token');
      } catch (err) {
        console.error("Response doesn't contain token key: " + err);
        reject(err);
      }
      try {
        expect(data.token).to.not.be.an('undefined');
      } catch (err) {
        console.error('Token is undefined: ' + err);
        reject(err);
      }
      try {
        expect(data.token).to.be.a('string');
      } catch (err) {
        console.error("Token isn't a string: " + err);
        reject(err);
      }
      var config = msbClient.getConfig();
      config.identity.token = data.token;
      resolve(data.token);
    });
  });
};

/**
 * Connect and register a perpated msb client
 * @param {*} msbClient
 */
let connectAndRegisterClient = function(msbClient) {
  return new Promise(function(resolve, reject) {
    msbClient.connect(msb_url);
    msbClient.register();
    setTimeout(function() {
      resolve();
    }, 2000); // wait in ms before continue with asserts
  });
};

/**
 * Disconnects a running msb client
 * @param {*} msbClient
 */
let disconnectClient = function(msbClient) {
  return new Promise(function(resolve, reject) {
    msbClient.disconnect();
    setTimeout(function() {
      resolve();
    }, 2000); // wait in ms before continue with asserts
  });
};

/**
 * Creates a new flow specified by json string
 * @param {*} flowstring
 */
let createFlow = function(flowstring) {
  return new Promise(function(resolve, reject) {
    let args = {
      data: flowstring,
      headers: {'Content-Type': 'application/json'},
    };
    restclient.post(flow_url + '/integrationFlow/create', args, function(data, response) {
      try {
        console.debug('Create integration flow - status code: ' + response.statusCode);
        console.debug('Create integration flow - flow_id: ' + data.id);
        expect(response.statusCode, 'Response does not have expected status code').to.equal(201);
      } catch (err) {
        console.error('Error creating integration flow: ' + err);
        reject(err);
      }
      resolve(data.id);
    });
  });
};

/**
 * Gets a flow by its id
 * @param {*} flowId
 */
let getFlow = function(flowId, deleted = false) {
  return new Promise(function(resolve, reject) {
    let args = {
      data: {},
      headers: {'Content-Type': 'application/json'},
    };
    restclient.get(flow_url + '/integrationFlow/' + flowId, args, function(data, response) {
      try {
        console.debug('Get integration flow - status code: ' + response.statusCode);
        console.debug('Get integration flow - data: ' + util.inspect(data, {showHidden: false, depth: null}));
        if (deleted){
          expect(response.statusCode, 'Response does not have expected status code').to.equal(404);
        } else {
          expect(response.statusCode, 'Response does not have expected status code').to.equal(200);
        }
      } catch (err) {
        console.error('Error getting integration flow: ' + err);
        reject(err);
      }
      resolve(data);
    });
  });
};

/**
 * Deploys a flow by its id
 * @param {*} flowId
 */
let deployFlow = function(flowId) {
  return new Promise(function(resolve, reject) {
    let args = {
      data: {},
      headers: {'Content-Type': 'application/json'},
    };
    restclient.put(flow_url + '/integrationFlow/' + flowId + '/deploy', args, function(data, response) {
      try {
        console.debug('Deploy integration flow - status code: ' + response.statusCode);
        expect(response.statusCode, 'Response does not have expected status code').to.equal(200);
      } catch (err) {
        console.error('Error deploying integration flow: ' + err);
        reject(err);
      }
      resolve(flowId);
    });
  });
};

/**
 * Undeploys a flow by its id
 * @param {*} flowId
 */
let undeployFlow = function(flowId) {
  return new Promise(function(resolve, reject) {
    let args = {
      data: {},
      headers: {'Content-Type': 'application/json'},
    };
    restclient.put(flow_url + '/integrationFlow/' + flowId + '/undeploy', args, function(data, response) {
      try {
        console.debug('Undeploy integration flow - status code: ' + response.statusCode);
        expect(response.statusCode, 'Response does not have expected status code').to.equal(200);
      } catch (err) {
        console.error('Error undeploying integration flow: ' + err);
        reject(err);
      }
      resolve(flowId);
    });
  });
};

/**
 * Deletes a flow by id
 * @param {*} flowId
 */
let deleteFlow = function(flowId) {
  return new Promise(function(resolve, reject) {
    restclient.delete(flow_url + '/integrationFlow/' + flowId, function(data, response) {
      try {
        console.debug('Delete integration flow - status code: ' + response.statusCode);
        expect(response.statusCode, 'Response does not have expected status code').to.equal(200);
      } catch (err) {
        console.log('Error deleting integration flow: ' + err);
        reject(err);
      }
      resolve();
    });
  });
};

/**
 * Gets a smart object by its id
 * @param {*} soUuid
 */
let getSmartObject = function(soUUid, deleted = false) {
  return new Promise(function(resolve, reject) {
    let args = {
      data: {},
      headers: {'Content-Type': 'application/json'},
    };
    restclient.get(so_url + '/smartobject/' + soUUid, args, function(data, response) {
      try {
        console.debug('Get smart object - status code: ' + response.statusCode);
        console.debug('Get smart object - data: ' + util.inspect(data, {showHidden: false, depth: null}));
        if (deleted){
          expect(response.statusCode, 'Response does not have expected status code').to.equal(404);
        } else {
          expect(response.statusCode, 'Response does not have expected status code').to.equal(200);
        }
      } catch (err) {
        console.error('Error getting smart object: ' + err);
        reject(err);
      }
      resolve(data);
    });
  });
};

/**
 * Deletes a registered samrt object
 * @param {*} soUuid
 */
let deleteSmartObject = function(soUuid) {
  return new Promise(function(resolve, reject) {
    restclient.delete(so_url + '/smartobject/' + soUuid, function(data, response) {
      try {
        console.debug('Delete smart object - status code: ' + response.statusCode);
        expect(response.statusCode, 'Response does not have expected status code').to.equal(200);
      } catch (err) {
        console.log('Error deleting smart object: ' + err);
        reject(err);
      }
      resolve();
    });
  });
};


/** ************** Client Setup Helper Functions */

/**
 * Inits the basic msb client config for testing
 * @param {*} msbClient
 */
function initBasicMsbClientConfig(msbClient){
  msbClient.disablesockJsFraming(false);
  msbClient.enableDebug(true);
  msbClient.enableDataFormatValidation(true);
  msbClient.disableEventCache(false);
  msbClient.setEventCacheSize(1000);
  msbClient.disableAutoReconnect(false);
  msbClient.setReconnectInterval(10000);
  msbClient.disableHostnameVerification(true);
}

/**
 * Inits the flow by reading json file and inserting client uuid and name
 * @param {*} msbClient
 */
function getFlowFromFile(msbClient){
  var config = msbClient.getConfig();
  if (fs.existsSync(__dirname + '/integration_flow.json')) {
    var flow = fs.readFileSync(__dirname + '/integration_flow.json')
      .toString()
      .replace(/%%%%FLOWNAME%%%%/gi, 'TestFlow-' + config.identity.uuid.substring(24, 36))
      .replace(/%%%%SOUUID1%%%%/gi, config.identity.uuid)
      .replace(/%%%%SONAME1%%%%/gi, config.identity.name)
      .replace(/%%%%SOUUID2%%%%/gi, config.identity.uuid)
      .replace(/%%%%SONAME2%%%%/gi, config.identity.name);
  }
  return flow;
}

/**
 * Sets the clients connection state listener to listen on socket msb connection state events
 * @param {ConnectionStateListener} listener
 */
function setConnectionStateListener(listener){
  listener.on('connectionState', function(msg) {
    console.debug('EMITTER: ' + msg);

    if (msg === 'IO_CONNECTED') {
      test_connected = true;
    } else if (msg === 'NIO_ALREADY_CONNECTED') {
      test_connected = false;
    } else if (msg === 'NIO_UNAUTHORIZED_CONNECTION') {
      test_connected = false;
    } else if (msg === 'IO_REGISTERED') {
      test_registered = true;
    } else if (msg === 'NIO_REGISTRATION_ERROR') {
      test_registered = false;
    } else if (msg === 'NIO_UNEXPECTED_REGISTRATION_ERROR') {
      test_registered = false;
    } else if (msg === 'IO_PUBLISHED') {
      test_published = true;
    } else if (msg === 'NIO_EVENT_FORWARDING_ERROR') {
      test_published = false;
    } else if (msg === 'NIO_UNEXPECTED_EVENT_FORWARDING_ERROR') {
      test_published = false;
    }
  });
}

/**
 * Creates a new msb client object including its self description (events adn functions)
 */
function getNewMsbClientSample(){

  // reset test env
  test_connected = false;
  test_registered = false;
  test_published = false;

  var type = 'SmartObject';
  var uuid = uuidv4();
  var name = 'SO ' + uuid;
  var description = 'SO Desc' + uuid;
  var token = uuid.substring(0, 7);
  const msbClient = new MsbClient(
    type,
    uuid,
    name,
    description,
    token
  );
  initBasicMsbClientConfig(msbClient);

  // add new configuration parameters like this
  // configuration parameters are published to the MSB and can be changed from the MSB GUI in real time.
  msbClient.addConfigParameter('testParam1', true, 'boolean');
  msbClient.addConfigParameter('testParam2', 'StringValue', 'string');
  msbClient.addConfigParameter('testParam3', 1000, 'int32');

  // Add events to the client
  msbClient.addEvent('SIMPLE_EVENT1_STRING', 'Simple event 1', 'Simple event with string', 'string', 'LOW', false);
  msbClient.addEvent('SIMPLE_EVENT2_INTEGER_ARRAY', 'Simple event 2', 'Simple event with int array', 'int64', 2, true);
  var strngifiedDataFormat = JSON.stringify({
    type: 'array',
    items: {type: 'integer', format: 'int32'},
  });
  msbClient.addEvent('SIMPLE_EVENT3_JSONDATAFORMAT', 'Simple event 3', 'Simple event with JSON stringified dataformat',
    strngifiedDataFormat, 2, false);
  msbClient.addEvent('SIMPLE_EVENT4_NOPAYLOAD', 'Simple event 4', 'Simple event with no payload', null, 2, true);

  msbClient.addEvent('arrayev', 'Array Event', 'Array Event for testing', 'string', 'LOW', true);

  msbClient.addEvent({
    eventId: 'EVENT1',
    name: 'Event 1',
    description: 'Description for Event 1',
    dataFormat: {
      dataObject: {
        type: 'string',
      },
    },
    implementation: {
      priority: 'MEDIUM',
    },
  });

  msbClient.addEvent({
    eventId: 'EVENT2',
    name: 'Event 2',
    description: 'Description for Event 2',
    dataFormat: {
      dataObject: {
        type: 'number', format: 'float',
      },
    },
    implementation: {
      priority: 1,
    },
  });

  msbClient.addEvent({
    eventId: 'EVENT3',
    name: 'Event 3',
    description: 'Description for Event 3',
    dataFormat: {
      dataObject: {
        $ref: '#/definitions/Device',
      },
      Device: {
        type: 'object',
        properties: {
          value1: {
            type: 'number', format: 'float',
          },
          value2: {
            type: 'number', format: 'float',
          },
          value3: {
            type: 'number', format: 'float',
          },
        },
      },
    },
    implementation: {
      priority: 1,
    },
  });

  msbClient.addEvent({
    eventId: 'EVENT4',
    name: 'Event 4',
    description: 'Description for Event 4',
    dataFormat: {
      dataObject: {
        type: 'array',
        items: {
          type: 'integer',
          format: 'int32',
        },
      },
    },
    implementation: {
      priority: 'MEDIUM',
    },
  });

  msbClient.addEvent({
    eventId: 'EVENT5',
    name: 'Event 5',
    description: 'Description for Event 5',
    dataFormat: {
      dataObject: {
        type: 'array',
        items: {
          $ref: '#/definitions/Device',
        },
      },
      Device: {
        type: 'object',
        properties: {
          value1: {
            type: 'number', format: 'float',
          },
          value2: {
            type: 'number', format: 'float',
          },
          value3: {
            type: 'number', format: 'float',
          },
          submodules: {
            type: 'array',
            items: {
              $ref: '#/definitions/Module',
            },
          },
        },
      },
      Module: {
        type: 'object',
        properties: {
          modname: {
            type: 'string',
          },
        },
      },
    },
    implementation: {
      priority: 1,
    },
  });

  // add custom functions to the client
  msbClient.addFunction({
    functionId: 'function1',
    name: 'Function 1',
    description: 'Description for Function 1',
    dataFormat: {
      dataObject: {
        type: 'string',
      },
    },
    implementation: function(msg) {
      console.log('function1 has been called, message: ' + msg.dataObject);
    },
  });

  // Optionally, you can add responseEvents by their eventId (define and add the respective events first)
  // this function is linked with the callback test (part of the test flow)
  msbClient.addFunction({
    functionId: 'function2',
    name: 'Function 2',
    description: 'Description for Function 2',
    dataFormat: {
      dataObject: {
        type: 'number', format: 'float',
      },
    },
    responseEvents: ['EVENT1', 'EVENT2'],
    implementation: function(msg) {
      console.log('function1 has been called, message:' + msg.dataObject);
    },
  });

  msbClient.addFunction({
    functionId: '/arrayfun',
    name: 'Array Function',
    description: 'Array Function for testing',
    dataFormat: {
      dataObject: {
        type: 'array',
        items: {
          type: 'string',
        },
      },
    },
    implementation: function(msg) {
      message_received = msg;
      console.debug('Array Function has been called, message: ' + msg.a);
      console.debug('Array Function has been called, correlationId: ' + msg.correlationId);
    },
  });

  return msbClient;
}
