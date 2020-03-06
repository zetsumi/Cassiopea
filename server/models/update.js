'use strict';

const fs = require('fs');
const exec = require('child_process').exec;
const config = require('../../config.json');

module.exports = function(Update) {
  Update.remoteMethod(
        'run', {
          accepts: [
            {
              arg: 'id',
              type: 'string',
              required: true,
            },
          ],
          http: {
            path: '/run',
            verb: 'post',
          },
          returns:
          {
            'arg': 'state',
            'type': 'object',
          },
        }
    );

  Update.remoteMethod(
        'status', {
          accepts: [
            {
              arg: 'id',
              type: 'string',
              required: true,
            },
          ],
          http: {
            path: '/status',
            verb: 'get',
          },
          returns:
          {
            'arg': 'state',
            'type': 'object',
          },
        }
    );

  Update.run =  function(game, callback) {
    let lockPath = `${config.base}/${game}/${config.update.workspace}/${config.update.lock}`;
    if (fs.existsSync(lockPath)) {
      let response = new Error(`The game ${game} is already being updated.`);
      response.status = 423;
      callback(response);
    } else {
      const child = exec(`node server/utils/updater-process.js "${game}"`);

      child.stdout.on('data', function(data) {
        console.log(data);
      });
      child.stderr.on('data', function(data) {
        console.log(data);
      });
      child.on('close', function(code) {
        console.log(`Process exit with code ${code}.`);
      });

      callback(null, `The update for ${game} is being processed.`);
    }
  };

  Update.status = function(game, callback) {
    let gamePath = `${config.base}/${game}`;
    let lockPath = `${gamePath}/${config.lock}`;

    try {
      if (fs.existsSync(gamePath)) {
        if (fs.existsSync(lockPath)) {
          let response = new Error(`The game ${game} is being updated.`);
          response.status = 423;
          callback(response);
        } else {
          callback(null, `The game ${game} is ready.`);
        }
      } else {
        let response = new Error(`The game ${game} does not exist.`);
        response.status = 404;
        callback(response);
      }
    } catch (e) {
      callback(e);
    }
  };
};
