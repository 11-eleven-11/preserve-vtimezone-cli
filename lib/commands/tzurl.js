const path    = require('path')
const axios = require('axios')
const cheerio = require('cheerio')
const crypto = require('crypto')
const rxjs = require('rxjs')
const fs = require('fs')

const client = axios.create({
  baseURL: 'http://tzurl.azureedge.net/'
})

const cBitdbClient = axios.create({
  baseURL: 'https://data.bitdb.network/1KuUr2pSJDao97XM8Jsq8zwLS6W1WtFfLg/c/'
})

class TzItem {

  constructor(tzid, hashValue) {
    this.tzid = tzid;
    this.hashValue = hashValue;
  }

  get tzid() {
    return this.tzid();
  }

  get hashValue() {
    return this.hashValue();
  }
}

TzItem.prototype.toString = () => {return this.tzid + this.hashValue;}

const tzurl = {
  client,
  cBitdbClient,
  /**
   * `/zoneinfo/index.html`
   * @param {*} currentUrl `index.html`
   * @param {*} currentPath `zoneinfo`
   * @param {*} resultArray []
   */
  getIndex(currentUrl, currentPath, resultArray) {
    if (!currentUrl) {
      return Promise.resolve();
    }
    const targetUrlSum = currentPath + currentUrl;
    if (currentUrl.endsWith('index.html')) {
      return this.client.get(targetUrlSum)
      .then(r => {
        const $ = cheerio.load(r.data);
        const lis = $('a');
        const pairs = lis.map(l => {
          const continentPrefix = lis[l].children[0].data;
          const hrefOfItem = lis[l].attribs['href'];
          return setTimeout(() => {
            if (hrefOfItem.endsWith('index.html')) {
              const newPath = hrefOfItem.split('/')[0];
              return this.getIndex(hrefOfItem.split('/')[1], currentPath + newPath + '/', resultArray);
            } else if (hrefOfItem.endsWith('ics')){
              return this.getIndex(hrefOfItem, currentPath, resultArray);
            }
          }, 10000 * Math.random());
          
        });
      }).catch(err => {
        console.log(err);
        //throw new Error(err)
      })
    } else if(currentUrl.endsWith('ics')) {
      return this.client.get(targetUrlSum)
      .then(r => {
        // https://data.bitdb.network/1KuUr2pSJDao97XM8Jsq8zwLS6W1WtFfLg/c/580796b30bb0dfeaa57a93573e032cbf12c3e540dbcfe47f7d9fd55205deec18
        const buf = Buffer.from(r.data, 'utf8');
        let hash = crypto.createHash('sha256').update(buf).digest('hex');


        return this.cBitdbClient.get(hash);
        /*
        const tzid = currentPath.replace('zoneinfo/', '') + currentUrl.replace('.ics', '');
        console.log(`${tzid}, hash : ${hash}`);
        resultArray.push({
          name: currentUrl,
          hash: hash
        });*/
      })
      .then(r => {
        if (r.data) {
          console.log('exist!');
        } else {
          console.log('not exist!');
        }
      })
      .catch(err => {
        console.log(err);
        //throw new Error(err)
      })
      console.log(`ics Path : ${currentPath + currentUrl}`)
    } else {
      return Promise.resolve();
    }
  },
  readFile(filePath) {
    var data = fs.readFileSync(filePath, 'utf8');
    console.log(data);
  },
  sendTx(tx) {
    const rawtx = tx.toString();
    return this.client.post('/tx/send', { rawtx })
      .then(r => r.data.txid)
      .catch(err => {
        const error = err.response.data.message;
        const msg = error.message
          .split('\n')
          .slice(0, -1)
          .join(' ')
        throw new Error(msg)
      })
  }

}

module.exports = tzurl;
