const tzurl = require('../lib/commands/tzurl');

describe('App test!', function () {
    it('should get tzurl index html', function (done) {
        let res = tzurl.getIndex();
        done();
    });
});
