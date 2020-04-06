const { AbstractModule } = require('adapt-authoring-core');
const session = require('express-session');

const MongoDBStore = require('connect-mongo')(session);
/**
* Module which implements user sessions
* @extends {AbstractModule}
*/
class SessionsModule extends AbstractModule {
  constructor(...args) {
    super(...args);
    this.init();
  }
  async init() {
    const [ mongodb, server ] = await this.app.waitForModule('mongodb', 'server');

    server.expressApp.use(session({
      name: 'adapt.user_session',
      secret: this.getConfig('secret'),
      cookie: {
        maxAge: this.getConfig('lifespan'),
        sameSite: this.getConfig('sameSite'),
        secure: this.getConfig('secure')
      },
      store: new MongoDBStore({
        client: mongodb.client,
        collection: this.getConfig('collectionName'),
        stringify: false
      }),
      resave: false,
      saveUninitialized: true
    }));

    this.setReady();
  }
}

module.exports = SessionsModule;
