/*jshint expr:true */
describe('Application setup', function() {
  describe('components', function() {

    describe('zepto', function() {
      it('should have zepto', function() {
        window.$.should.be.a('function');
        // not only should $ exist, but $ should be Zepto, not jQuery...
        window.$.should.equal(window.Zepto);
      });
    });

    describe('underscore', function() {
      it('should have underscore', function() {
        window._.should.be.a('function');
      });
    });

    describe('backbone', function() {
      it('should have backbone', function() {
        window.Backbone.should.be.an('object');
      });
    });

    describe('sinon', function() {
      it('should have sinon', function() {
        window.sinon.should.be.an('object');
      });
      it('should have sinon spies', function() {
        window.sinon.spy.should.be.a('function');
      });
      it('should have sinon mocks', function() {
        window.sinon.mock.should.be.a('function');
      });
      it('should have sinon stubs', function() {
        window.sinon.stub.should.be.a('function');
      });
    });

    describe('nibbler', function() {
      it('should have nibbler', function() {
        window.Nibbler.should.be.a('function');
      });
      it('should properly encode a username or share id',function() {
        // "my_share_id" -> "NV4V643IMFZGKX3JMQ"
        //   as described here:
        //   https://spideroak.com/faq/questions/37/how_do_i_use_the_spideroak_web_api/
        var share_id = "my_share_id";
        var nibbler = new window.Nibbler({
          dataBits: 8,
          codeBits: 5,
          keyString: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567',
          pad: ''
        });
        var encoded_share_id = nibbler.encode(share_id);
        encoded_share_id.should.equal("NV4V643IMFZGKX3JMQ");
      });
    });

    describe('store.js', function(){
      it('should have store.js', function() {
        window.store.should.be.ok;
        window.store.enabled.should.be.ok;
      });
    });

  });

  describe('initialize', function() {
    beforeEach(function() {
      sinon.spy(window.spiderOakApp, "onDeviceReady");
    });
    afterEach(function() {
      window.spiderOakApp.onDeviceReady.restore();
    });
    it('should have spiderOakApp', function() {
      window.spiderOakApp.should.be.an('object');
    });

    it('should bind deviceready', function() {
      window.spiderOakApp.ready();
      helper.trigger(window.document,'deviceready');
      window.spiderOakApp.onDeviceReady.called.should.equal(true);
    });
    it('resolving subfinishers should fulfill allFinish', function(done) {
      /* This is actually two tests, combined because i haven't unraveled
       * how to re-initialize the app.
       *
       * Contrary cases failure modes are illuminating:
       *
       * - if window.spiderOakApp.localizeFinishResolver() is not fired, the
       *   test fails with a timeout.
       * - "...should.not.eventually.be.fulfilled..." error report shows
       *   the actual resolution values of allFinish' sub-promises.
       */
      var fDRStub = sinon.stub(window.spiderOakApp, "finishDeviceReady");
      window.spiderOakApp.allFinish.then(function() {
        fDRStub.should.have.been.called.once;
        fDRStub.restore();
      });
      if (! window.spiderOakApp.localizeFinishResolver) {
        // Reduce unfortunate sensitivity to whether or not done elsewhere.
        window.spiderOakApp.ready();
      }
      // (window.spiderOakApp.readyFinishResolver() already done in app init.)
      window.spiderOakApp.localizeFinishResolver();
      window.spiderOakApp.allFinish.should.eventually.be.fulfilled
        .and.notify(done);
      // '...and.notify(done)' because our version of mocha apparently
      // isn't promise-friently.
    });
  });

  describe('spiderOakApp.ajax', function() {
    beforeEach(function() {
      // Snapshot previous alternateAjax value:
      spiderOakApp.initialize();
      this.realAjax = spiderOakApp.dollarAjax;
      spiderOakApp.dollarAjax = sinon.spy();
    });
    afterEach(function() {
      spiderOakApp.dollarAjax = this.realAjax;
      delete this.realAjax;
    });
    it('should use the real $.ajax when not substituted', function() {
      spiderOakApp.dollarAjax.should.not.have.been.called;
      spiderOakApp.ajax({});
      spiderOakApp.dollarAjax.should.have.been.called.once;
    });
    it('should use the alternate ajax when substituted', function() {
      spiderOakApp.dollarAjax.should.not.have.been.called;
      var alternateAjax = sinon.spy();
      spiderOakApp.settings.setOrCreate("alternateAjax", alternateAjax, 0);
      spiderOakApp.ajax({});
      spiderOakApp.dollarAjax.should.not.have.been.called;
      alternateAjax.should.have.been.called.once;
      spiderOakApp.settings.remove("alternateAjax");
    });
  });
  describe('String customizations', function() {
    beforeEach(function(){
      window.customizeStrings.fetchStringTables();
    });
    afterEach(function(){
      window.customizeStrings.fetchStringTables();
    });
    it('should leave arbitrary strings unchanged', function() {
      this.testString = "testString";
      this.result = window.s(this.testString);
      this.result.should.equal(this.testString);
    });
    it('should leave official strings unchanged', function() {
      this.testString = "SpiderOak";
      this.result = window.s(this.testString);
      this.result.should.equal(this.testString);
    });
    it('should change official strings that have custom versions', function() {
      this.testString = "SpiderOak";
      this.alternateResult = "AcmeSync";
      window.customizeStrings.stringsTable[this.testString] =
        this.alternateResult;
      this.result = window.s(this.testString);
      this.result.should.equal(this.alternateResult);
    });
  });

  describe('utilities', function() {
    /**
     * model.composeUrl() permutations to test:
     *
     *                collection         /              model
     *      .urlBase | .url   / .get("urlBase") | .urlBase | .get("url") | .url
     * Each setting needs to be tried as direct attribute and function value.
     */
    describe('composedUrl', function() {
      /** Fabricate model and collection with selected urlBase and url criteria.
       *
       * @returns{object} the model
       */
      beforeEach(function(){
        this.model = new spiderOakApp.ModelBase();
        this.model.collection = new spiderOakApp.CollectionBase();
      });
      afterEach(function(){
        delete this.model.collection;
        delete this.model;
      });
      it("should use collection.urlBase and model.get('url')",
         function() {
           this.model.set("url", "model.get('url')");
           this.model.collection.urlBase = "collection.urlBase/";
           this.model.composedUrl().should.equal(
             "collection.urlBase/model.get('url')"
           );
         });
      it("should not use plain.url",
         function() {
           this.model.url = "model.url";
           this.model.collection.urlBase = "collection.urlBase/";
           this.model.composedUrl().should.equal(
             "collection.urlBase/"
           );
         });
      it("should use model.get('url') even when model.url is set",
         function() {
           this.model.url = "model.url";
           this.model.set("url", "model.get('url')");
           this.model.collection.urlBase = "collection.urlBase/";
           this.model.composedUrl().should.equal(
             "collection.urlBase/model.get('url')"
           );
         });
      it("should prefer model.urlBase over collection.urlBase",
         function() {
           this.model.set("url", "model.get('url')");
           this.model.urlBase = "model.urlBase/";
           this.model.collection.urlBase = "collection.urlBase/";
           this.model.composedUrl().should.equal(
             "model.urlBase/model.get('url')"
           );
         });
      it("should prefer model.get('urlBase') over model.urlBase",
         function() {
           this.model.set("url", "model.get('url')");
           this.model.urlBase = "model.urlBase/";
           this.model.set("urlBase", "model.get('urlBase')/");
           this.model.composedUrl().should.equal(
             "model.get('urlBase')/model.get('url')"
           );
         });
      it("should prefer model.get('urlBase') over model.urlBase and " +
         " collection.urlBase",
         function() {
           this.model.set("url", "model.get('url')");
           this.model.urlBase = "model.urlBase/";
           this.model.set("urlBase", "model.get('urlBase')/");
           this.model.collection.urlBase = "collection.urlBase/";
           this.model.composedUrl().should.equal(
             "model.get('urlBase')/model.get('url')"
           );
         });
      it("should prefer model.urlBase over collection.urlBase",
         function() {
           this.model.set("url", "model.get('url')");
           this.model.urlBase = "model.urlBase/";
           this.model.collection.urlBase = "collection.urlBase/";
           this.model.composedUrl().should.equal(
             "model.urlBase/model.get('url')"
           );
         });
      it("should use collection urlBase as function and model.get('url')",
         function() {
           this.model.set("url", "model.get('url')");
           this.model.collection.urlBase =
               function () { return "collection.urlBase()/"; };
           this.model.composedUrl().should.equal(
             "collection.urlBase()/model.get('url')"
           );
         });
      it("should use both collection urlBase and model.get('url') as functions",
         function() {
           this.model.set("url", function () { return "model.get('url')()"; });
           this.model.collection.urlBase =
              function () { return "collection.urlBase()/"; };
           this.model.composedUrl().should.equal(
             "collection.urlBase()/model.get('url')()"
           );
         });
    });
  });

});


