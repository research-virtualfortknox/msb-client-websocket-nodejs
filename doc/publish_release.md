# Release Guide

This is just an introduction how to publish releases manually.

This will be depreceated by using a CI tool.

## Requirements

Requirements before publishing project to public registry:
* Version is stable (ci pipeline success)
* All tests passed
* .npmignore validated

## Update Version

First upgrade project to new version using

```sh
npm version [<newversion> | major | minor | patch | premajor | preminor | prepatch ]
```

## Publish Version Of Library (travis)

Travis CI will automatically publish the project to NPM registry if:
* project version was updated using `npm version`
* new version commited
* git `TAG` has beed created for commit

## Publish Version Of Library (manual)

### Init Workspace

if not done yet, add the account to be used for publishing the project

```sh
$ npm adduser
```

### Step 1: Test Build Result

Before publishing the project to npm registry, 
make sure the right sources will be added.

Pack the client library:

```sh
$ npm pack
```

Open the .thz file and check all contents.

If there are files missing or files present that should not be included, 
check the `.npmignore` file.

### Step 2: Publish

Publish the release with public access

```sh
$ npm publish --access public
```

### Step 3: Check Result

Login to npm and review the uploaded version:

https://www.npmjs.com/package/@vfk_research/vfk-msb-websocket-client

### Step 2: Unpublish

Publish the release with public access

```sh
$ npm unpublish @vfk_research/vfk-msb-websocket-client:x.x.x
```

## Test Project Linking Locally

Test production build for npm locally (not published to npm yet)

Pack the client library:

```sh
$ npm pack
```

Create a new test project

```sh
$ npm init
```

and install the packed lib there with

```sh
$ npm install --production ./path/to/vfk-msb-client-x.x.x.tgz
```

Test your new app by adding the client

```js
const MsbClient = require('vfk-msb-client');
```
