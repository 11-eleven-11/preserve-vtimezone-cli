const tzurl = require('../lib/commands/tzurl');

describe('App test!', function () {
    it('should get tzurl index html', function (done) {
        const resultArray = [];
        let res = tzurl.getIndex(`index.html`, `zoneinfo/`, resultArray);
        console.log(resultArray);
        done();
    });
});
