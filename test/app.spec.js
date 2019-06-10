const tzurl = require('../lib/commands/tzurl');

describe('App test!', function () {
    
    it('should get tzurl index html', function (done) {
        const resultArray = [];
        return tzurl.getIndex(`index.html`, `zoneinfo/`, resultArray)
            .finally(() => done());
    });

    /*
    it('should read file', function (done) {
        const resultArray = [];
        return tzurl.readFile('/Users/parkjoonyeong/Abidjan.ics')
            .finally(() => done());
    });*/
});
