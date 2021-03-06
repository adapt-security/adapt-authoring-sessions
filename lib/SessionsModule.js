const { AbstractModule } = require('adapt-authoring-core');
const { AuthToken } = require('adapt-authoring-auth');
const MongoDBStore = require('connect-mongo');
const session = require('express-session');
/**
 * Module which implements user sessions
 * @extends {AbstractModule}
 */
class SessionsModule extends AbstractModule {
  /** @override */
  async init() {
    await super.init();

    const [ auth, mongodb, server ] = await this.app.waitForModule('auth', 'mongodb', 'server');

    server.expressApp.use(session({
      name: 'adapt.user_session',
      secret: this.getConfig('secret'),
      cookie: {
        maxAge: this.getConfig('lifespan'),
        sameSite: this.getConfig('sameSite'),
        secure: this.getConfig('secure')
      },
      store: MongoDBStore.create({
        client: mongodb.client,
        collection: this.getConfig('collectionName'),
        stringify: false
      }),
      resave: false,
      saveUninitialized: true
    }));

    server.api.createChildRouter('session').addRoute({
      route: '/clear',
      handlers: { post: this.clearSession.bind(this) }
    });
    auth.secureRoute(`/api/session/clear`, 'post', ['clear:session']);
  }
  /**
   * Handles clearing of the current request session
   * @param {ClientRequest} req
   * @param {ServerResponse} res
   * @param {Function} next
   */
  clearSession(req, res, next) {
    if(!req.session || !req.auth.token) {
      return res.end();
    }
    req.session.destroy(async error => {
      if(error) return next(error);
      await AuthToken.revoke(req.auth.token.jti);
      res.end();
    });
  }
}

module.exports = SessionsModule;
