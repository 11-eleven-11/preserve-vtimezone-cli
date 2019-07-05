const tzurl = require('../lib/commands/tzurl');

describe('App test!', function () {
    this.timeout(1000000);
    
    it('should get tzurl index html', async function (done) {
        const tzidMap = {};
        const result = await tzurl.buildTzidIndex(`index.html`, `zoneinfo/`, tzidMap, (ics) => {});
        //tzidMap.sort((a, b) => a.tzid.localeCompare(b.tzid)).forEach(r => {
          //  console.log(`${r.tzid}:${r.hash}`);
        //});
        console.log('result : ' + JSON.stringify(tzidMap));
    });

    /*
    it('should read file', function (done) {
        const resultArray = [];
        return tzurl.readFile('/Users/parkjoonyeong/Abidjan.ics')
            .finally(() => done());
    });*/
});
