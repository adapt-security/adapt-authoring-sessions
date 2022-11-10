import { AbstractModule } from 'adapt-authoring-core';
import { AuthToken } from 'adapt-authoring-auth';
import MongoDBStore from 'connect-mongo';
import session from 'express-session';
/**
 * Module which implements user sessions
 * @extends {AbstractModule}
 */
class SessionsModule extends AbstractModule {
  /** @override */
  async init() {
    await super.init();

    const [ auth, mongodb, server ] = await this.app.waitForModule('auth', 'mongodb', 'server');

    server.expressApp.use(
      session({
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
        rolling: this.getConfig('rolling'),
        saveUninitialized: true
      }),
      this.storeAuthHeader
    );

    server.api.createChildRouter('session').addRoute({
      route: '/clear',
      handlers: { post: this.clearSession.bind(this) }
    });
    auth.secureRoute(`/api/session/clear`, 'post', ['clear:session']);
  }
  /**
   * Stores the session token as an auth header if none present
   * @param {external:express~Request} req 
   * @param {external:express~Response} res 
   * @param {function} next 
   */
  storeAuthHeader(req, res, next) {
    const token = req?.session?.token;
    if(token && !req.headers.Authorization) {
      req.headers.Authorization = `Bearer ${token}`;
    }
    next();
  }
  /**
   * Handles clearing of the current request session
   * @param {external:express~Request} req
   * @param {external:express~Response} res
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

export default SessionsModule;