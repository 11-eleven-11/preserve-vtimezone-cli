const path    = require('path')
const axios = require('axios')
const cheerio = require('cheerio')

const client = axios.create({
  baseURL: 'http://tzurl.azureedge.net/'
})

const tzurl = {
  client,
  getIndex() {
    return this.client.get(`/zoneinfo/index.html`)
      .then(r => {
        const $ = cheerio.load(r.data);
        console.log($('a'));
        const lis = $('a');
        //lis.map(l => console.log(lis[l].attribs['href']));
        //lis.map(l => console.log(lis[l].children[0].data));
      }).catch(err => {
        throw new Error(err.response.data.message)
      })
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
