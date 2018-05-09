//
//  Created by Mingliang Chen on 18/3/16.
//  illuspas[a]gmail.com
//  Copyright (c) 2018 Nodemedia. All rights reserved.
//
const Logger = require('./logger');

const NodeCoreUtils = require('./node_core_utils');
const NodeRelaySession = require('./node_relay_session');
const context = require('./node_core_ctx');
const fs = require('fs');
const _ = require('lodash');

class NodeRelayServer {
  constructor(config) {
    this.config = config;
    this.dynamicSessions = new Map();
  }

  run() {
    try {
      fs.accessSync(this.config.relay.ffmpeg, fs.constants.X_OK);
    }catch(error) {
      Logger.error(`Node Media Relay Server startup failed. ffmpeg:${this.config.relay.ffmpeg} cannot be executed.`);
      return;
    }

    context.nodeEvent.on('postPublish', this.onPostPublish.bind(this));
    context.nodeEvent.on('donePublish', this.onDonePublish.bind(this));
    Logger.log(`Node Media Relay Server started`);
  }

  onPostPublish(id, streamPath, args) {
    let [app, appInstance, stream] = streamPath.substring(1).split('/')
    if (this.config.relay.edge && app && appInstance && stream) {
      const conf = {
        streamPath: streamPath,
        ffmpeg: this.config.relay.ffmpeg,
        inPath: `rtmp://localhost:${this.config.rtmp.port}${streamPath}`,
        ouPath: `rtmp://${appInstance}.entrypoint.cloud.wowza.com/${app}/${stream}`,
      }
      let session = new NodeRelaySession(conf)
      session.id = id
      session.on('end', (id) => {
        this.dynamicSessions.delete(id)
      })
      this.dynamicSessions.set(id, session)
      session.run()
      Logger.log('[Relay dynamic push] start', id, conf.inPath, ' to ', conf.ouPath)
    }
  }

  onDonePublish(id, streamPath, args) {
    let session = this.dynamicSessions.get(id);
    if (session) {
      session.end();
    }
  }

  stop() {
  }
}

module.exports = NodeRelayServer;
