# Testing Guide

This is an overview on how to test the project.

## Prerequisites

- nodeJs and npm installed: https://nodejs.org/en/

## Install node modules

Install the required node modules

```sh
$ npm install
```

## Basic Test

Unit test are written in `Mocha`/`Chai`.

Run `basic tests` (will execute lint check and unit tests)

```sh
$ npm test
```

## Code Style Test

We use `eslint` and base on the `StrongLoop style`.

Check for violations
```sh
$ npm run lint
```

Possible rule violations are listed here: https://eslint.org/docs/rules/

Some rules can be auto-fixed by eslint
```sh
$ npm run lint -- --fix
```

## Unit Test

Run `unit tests`

```sh
$ npm run test:unit
```

## Integration Test

Run `integration tests` against local or remote MSB instance.

Set IP of MSB server and use standard ports:
```sh
$ TESTENV_CUSTOMIP=192.168.0.10 npm run test:integration
```

Or define urls for websocket interface, smart object management and flow management:
```sh
$ TESTENV_BROKER_URL=https://ws.15xr.msb.oss.cell.vfk.fraunhofer.de/ \
TESTENV_SO_URL=https://so.15xr.msb.oss.cell.vfk.fraunhofer.de/ \
TESTENV_FLOW_URL=https://flow.15xr.msb.oss.cell.vfk.fraunhofer.de/ \
npm run test:integration
```

Or define urls and run integration test with powershell

```cmd
> $env:TESTENV_BROKER_URL="https://ws.15xr.msb.oss.cell.vfk.fraunhofer.de/"
> $env:TESTENV_SO_URL="https://so.15xr.msb.oss.cell.vfk.fraunhofer.de/"
> $env:TESTENV_FLOW_URL="https://flow.15xr.msb.oss.cell.vfk.fraunhofer.de/"
> $env:TESTENV_OWNER_UUID="f10cfa25-58d4-41ba-8ecf-60ced3d60677"
> npm run test:integration
```

## Integration Test

Run `all tests`

```sh
$ TESTENV_CUSTOMIP=192.168.0.10 npm run test:all
```

## Test Coverage

The coverage framework `nyc` is used.

Check `unit test coverage`

```sh
$ npm run coverage:unit
```

Check `integration test coverage`

```sh
$ TESTENV_CUSTOMIP=192.168.0.10 npm run coverage:integration
```

Check `all test coverage`

```sh
$ TESTENV_CUSTOMIP=192.168.0.10 npm run coverage:all
```


