const path    = require('path')
const axios = require('axios')
const cheerio = require('cheerio')
const crypto = require('crypto')
const rxjs = require('rxjs')
const fs = require('fs')
const axiosRetry = require('axios-retry');

const client = axios.create({
  baseURL: 'http://tzurl.azureedge.net/'
})

axiosRetry(client, { retries: 3, retryDelay: (count, err) => {
  console.log('retry:' + count + ', error :' + err);
  return 3;
} });

const cBitdbClient = axios.create({
  baseURL: 'https://data.bitdb.network/1KuUr2pSJDao97XM8Jsq8zwLS6W1WtFfLg/c/'
})

const tzurl = {
  client,
  cBitdbClient,
  /**
   * `/zoneinfo/index.html`
   * @param {*} currentUrl `index.html`
   * @param {*} currentPath `zoneinfo`
   * @param {*} resultObj []
   */
  async buildTzidIndex(currentUrl, currentPath, resultObj, unpreservedConsumer) {
    if (!currentUrl) {
      return;
    }
    const targetUrlSum = currentPath + currentUrl;
    if (currentUrl.endsWith('index.html')) {
      return await this.client.get(targetUrlSum)
      .then(async r => {
        const $ = cheerio.load(r.data);
        const lis = $('a');
        return Promise.all(lis.toArray().map(l => {
          const continentPrefix = l.children[0].data;
          const hrefOfItem = l.attribs['href'];
          if (hrefOfItem.endsWith('index.html')) {
            const newPath = hrefOfItem.split('/')[0];
            return this.buildTzidIndex(hrefOfItem.split('/')[1], currentPath + newPath + '/', resultObj, unpreservedConsumer);
          } else if (hrefOfItem.endsWith('ics')) {
            return this.buildTzidIndex(hrefOfItem, currentPath, resultObj, unpreservedConsumer);
          } else {
            console.log('unknown href : ' + hrefOfItem);
            return;
          }
        }));
      }).catch(err => {
        console.log(err);
        return;
      })
    } else if(currentUrl.endsWith('ics')) {
      return await this.client.get(targetUrlSum)
      .then(async r => {
        // https://data.bitdb.network/1KuUr2pSJDao97XM8Jsq8zwLS6W1WtFfLg/c/580796b30bb0dfeaa57a93573e032cbf12c3e540dbcfe47f7d9fd55205deec18
        const buf = Buffer.from(r.data, 'utf8');
        let hash = crypto.createHash('sha256').update(buf).digest('hex');

        const tzid = currentPath.replace('zoneinfo/', '') + currentUrl.replace('.ics', '');
        resultObj[tzid] = hash;
        return {
          tzid: tzid, 
          icsPayload : r.data,
          preserved : await this.cBitdbClient.get(hash)
        };
      })
      .then(async r => {
        if (r.preserved.data) {
          console.log('already preserved : ' + r.tzid);
        } else {
          unpreservedConsumer(r);
        }
      });
    } else {
      return;
    };
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
