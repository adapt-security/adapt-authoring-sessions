import { AbstractModule } from 'adapt-authoring-core';
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
        resave: false,
        rolling: this.getConfig('rolling'),
        saveUninitialized: true,
        secret: this.getConfig('secret'),
        unset: 'destroy',
        cookie: {
          maxAge: this.getConfig('lifespan'),
          sameSite: this.getConfig('sameSite'),
          secure: this.getConfig('secure')
        },
        store: MongoDBStore.create({
          client: mongodb.client,
          collection: this.getConfig('collectionName'),
          stringify: false
        })
      }),
      this.storeAuthHeader
    );
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
   * @return {Promise} Resolves when the session has been cleared
   */
  async clearSession(req) {
    if(!req.session) {
      return;
    }
    return new Promise((resolve, reject) => {
      req.session.destroy(e => {
        if(e) return reject(this.app.errors.DESTROY_SESSION_FAIL.setData({ error: e.message }));
        resolve();
      });
    });
  }
}

export default SessionsModule;