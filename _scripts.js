#!/usr/bin/env node
'use strict';
/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
const { spawn } = require('child_process');
require('dotenv').config();

const commandlineArgs = process.argv.slice(2);

function execute(command) {
  return new Promise((resolve, reject) => {
    const onExit = (error) => {
      if (error) {
        return reject(error);
      }
      resolve();
    };
    spawn(command.split(' ')[0], command.split(' ').slice(1), {
      stdio: 'inherit',
      shell: true,
    }).on('exit', onExit);
  });
}

/** 
 * @param {string} rawArgs
 */
async function performAction(rawArgs) {
  const firstArg = rawArgs[0];

  await execute(
    `ts-node ./scripts/${firstArg}.ts`
  );
}

performAction(commandlineArgs)