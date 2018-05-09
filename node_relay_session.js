//
//  Created by Mingliang Chen on 18/3/16.
//  illuspas[a]gmail.com
//  Copyright (c) 2018 Nodemedia. All rights reserved.
//
const Logger = require('./logger');

const EventEmitter = require('events');
const { spawn } = require('child_process');
const dateFormat = require('dateformat');
const mkdirp = require('mkdirp');
const fs = require('fs');
const context = require('./node_core_ctx');

const zeropad = (number) => {
  return ('00' + number).slice(-2)
}

const durationToTime = (duration) => {
  const hours = Math.floor(duration / 3600)
  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60
  return zeropad(hours) + ':' + zeropad(minutes) + ':' + zeropad(seconds) + ',000'
}

const genSrt = (time) => {
  let srt = '\n'

  for (let i = 0; i <= 36000; ++i) {
    const duration = i
    srt += (i + 1) + '\n'
    srt += durationToTime(duration) + ' --> ' + durationToTime(duration + 1) + '\n'
    srt += 'time: ' + (time + i) + '\n'
    srt += '\n'
  }

  return srt
}

class NodeRelaySession extends EventEmitter {
  constructor(conf) {
    super();
    this.conf = conf;
  }

  run() {
    const duration = (context.durations || {})[this.conf.streamPath] || {}
    duration.clock = undefined

    const time = duration.time || 0
    const srt = genSrt(duration.time || 0)
    const srtName = `srts/${this.id}.srt`
    Logger.log('[Relay INFO] srt starting at time=', time, srtName);
    fs.writeFileSync(srtName, srt)

    let argv = [
      '-fflags', 'nobuffer',
      '-analyzeduration', '1000000',
      '-i', this.conf.inPath,
      '-i', srtName,
      '-c', 'copy',
      '-c:s', 'text',
      '-f', 'flv', this.conf.ouPath
    ];

    Logger.log('[Relay start] id=', this.id, argv.toString());

    // Logger.debug(argv.toString());
    this.ffmpeg_exec = spawn(this.conf.ffmpeg, argv);
    this.ffmpeg_exec.on('error', (e) => {
      // Logger.debug(`relay !!!! 1 ${e}`);
    });

    this.ffmpeg_exec.stdout.on('data', (data) => {
      // Logger.debug(`relay !!!! 2 ${data}`);
    });

    this.ffmpeg_exec.stderr.on('data', (data) => {
      // Logger.debug(`relay !!!! 3 ${data}`);
    });

    this.ffmpeg_exec.on('close', (code) => {
      Logger.log('[Relay end] id=', this.id);
      this.emit('end', this.id);
    });
  }

  end() {
    // this.ffmpeg_exec.kill('SIGINT');
    this.ffmpeg_exec.stdin.write('q');
  }
}

module.exports = NodeRelaySession;
