const path    = require('path')
const axios = require('axios')
const cheerio = require('cheerio')
const crypto = require('crypto')

const client = axios.create({
  baseURL: 'http://tzurl.azureedge.net/'
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
  /**
   * `/zoneinfo/index.html`
   * @param {*} currentUrl `index.html`
   * @param {*} currentPath `zoneinfo`
   * @param {*} resultArray []
   */
  async getIndex(currentUrl, currentPath, resultArray) {
    if (!currentUrl) {
      return new Promise();
    }

    console.log(`recursive currentUrl : ${currentUrl}, currentPath : ${currentPath}, resultArray: ${resultArray}`)
    const targetUrlSum = currentPath + currentUrl;
    if (currentUrl.endsWith('index.html')) {
      console.log(targetUrlSum);
      return this.client.get(targetUrlSum)
      .then(r => {
        const $ = cheerio.load(r.data);
        const lis = $('a');
        const pairs = lis.map(l => {
          const continentPrefix = lis[l].children[0].data;
          const hrefOfItem = lis[l].attribs['href'];
          console.log('hrefOfItem : ' + hrefOfItem);
          console.log('current : ' + currentUrl);
          if (hrefOfItem.endsWith('index.html')) {
            const newPath = hrefOfItem.split('/')[0];
          console.log('new : ' + newPath);
            return this.getIndex(hrefOfItem.split('/')[1], currentPath + newPath + '/', resultArray);
          } else if (hrefOfItem.endsWith('ics')){
            return this.getIndex(hrefOfItem, currentPath, resultArray);
          }
        });
      }).catch(err => {
        console.log(err);
        //throw new Error(err)
      })
    } else if(currentUrl.endsWith('ics')) {
      return this.client.get(targetUrlSum)
      .then(r => {
        let hash = crypto.createHash('sha256').update(r.data).digest('hex');
        console.log(`${currentUrl}, hash : ${hash}`);
        resultArray.push({
          name: currentUrl,
          hash: hash
        });
      }).catch(err => {
        console.log(err);
        //throw new Error(err)
      })
      console.log(`ics Path : ${currentPath + currentUrl}`)
    } else {
      return new Promise();
    }
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
