const fs      = require('fs')
const path    = require('path')
const EventEmitter = require('events')
const chalk   = require('chalk')
const bsv     = require('bsv')
const mime    = require('mime-types')
const bitdb     = require('../bitdb')
const bitindex  = require('../bitindex')
const helper    = require('../helpers')
const tzurl = require('../tzurl')

const bProtocolPrefix = '19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut';

module.exports = {
  run(argv) {
    if (!process.env.ADDRESS) {
      console.log('  ❗️', chalk.bold.red(`Wallet not found. Have you generated it?`))
      return false;
    }

    const publicPath = /^\//.test(argv.path) ? argv.path : path.join(process.cwd(), argv.path);
    const tzidMap = {};

    this.attachEventEmitter()

    bitindex.getUtxos(process.env.ADDRESS)
      .then(utxos => {
        const balance = utxos
          .map(utxo => utxo.satoshis)
          .reduce((total, amt) => total + amt, 0);
        if (balance === 0) throw new Error('Insufficient balance');
        return utxos;
      })
      .then(_ => {
        console.log('Building tzidmap…')
        return tzidMap._promise;
      })
      .then(_ => this.deployVTimeZones(argv, tzidMap))
      .then(_ => this.deployTzidMap(argv, tzidMap))
      .then(_ => this.socket.close())
      .catch(err => {
        console.log('\n  ❗️', chalk.red(JSON.stringify(err)))
        this.socket.close()
      })
  },

  attachEventEmitter() {
    this.events = new EventEmitter()
    this.socket = bitdb.openSocket(process.env.ADDRESS)
    this.socket.onmessage = (e) => {
     console.log('onmessage : ' + JSON.stringify(e));
    //  msg.data.forEach(tx => this.events.emit('tx', tx))
    }
  },

  async deployVTimeZones(argv, tzidMap) {

    const result = await tzurl.buildTzidIndex(`index.html`, `zoneinfo/`, tzidMap, async (ics) => {
      /**
       * {
          tzid: tzid, 
          sha256: hash,
          icsPayload : r.data,
          preserved : await this.cBitdbClient.get(hash)
        }
       */
      await new Promise((resolve, reject) => {

        const filename  = ics.tzid + '.ics',
              data      = ics.icsPayload,
              payload   = [ bProtocolPrefix, data, 'text/calendar', { op: 0 }, filename ];
        console.log(`Deploying: ${ chalk.green.bold(filename) }`)

        const eventCallback = tx => {
          console.log('tx : ' + JSON.stringify(tx));
          if (tx.sha256 === ics.sha256) {
            this.events.removeListener('tx', eventCallback)
            // Delay 1 second
            setTimeout(resolve, 3000)
          }
        }
        this.events.on('tx', eventCallback)

        this.buildTx(payload)
          .then(tx    => bitindex.sendTx(tx))
          .then(txid  => console.log(chalk.gray('TXID'), chalk.white.bold(txid), '✅'))
          .catch(reject)
        
        // // In case bitdb doesn't fire event, limit wait to 10 seconds
        setTimeout(_ => {
          this.events.removeListener('tx', eventCallback)
          resolve()
        }, 10000)

      }).catch(err => {
        console.log('\n  ❗️', chalk.red(err.message))
        //process.exit(0)
      });
    });
  },

  deployTzidMap(argv, tzidMap) {
    console.log(`Deploying: ${ chalk.green.bold('@tzidmap') } : ${JSON.stringify(tzidMap)}`)
    const payload = [
      bProtocolPrefix, JSON.stringify(tzidMap), 'application/json', 'UTF-8', 'vtimezonehashes.json'
    ];
    return this.buildTx(payload)
      .then(tx    => bitindex.sendTx(tx))
      .then(txid  => console.log(chalk.gray('TXID'), chalk.white.bold(txid), '✅'))
  },

  buildTx(data) {
    return bitindex.getUtxos(process.env.ADDRESS)
      .then(utxos => utxos.map(bsv.Transaction.UnspentOutput))
      .then(utxos => {
        const tx      = new bsv.Transaction().change(process.env.ADDRESS),
              script  = new bsv.Script();
        let   fee     = 0;

        // Add OP_RETURN output
        script.add(bsv.Opcode.OP_RETURN);
        data.forEach(item => {
          // Hex string
          if (typeof item === 'string' && /^0x/i.test(item)) {
            script.add(Buffer.from(item.slice(2), 'hex'))
          // Opcode number
          } else if (typeof item === 'number') {
            script.add(item)
          // Opcode
          } else if (typeof item === 'object' && item.hasOwnProperty('op')) {
            script.add({ opcodenum: item.op })
          // All else
          } else {
            script.add(Buffer.from(item))
          }
        })
        tx.addOutput(new bsv.Transaction.Output({ script, satoshis: 0 }))

        // Incrementally add utxo until sum of inputs covers fee + dust
        utxos.some(utxo => {
          tx.from(utxo);
          fee = tx._estimateFee();
          return helper.inputSum(tx) >= fee + 546;
        })
        tx.fee(fee);

        return tx.sign(process.env.PRIVATE)
      })
  }


}