import { AbstractGraphQLDriver } from '@nestjs/graphql';
import { FastifyBaseLogger, FastifyInstance } from 'fastify';
import { IncomingMessage, Server, ServerResponse } from 'http';
import { MercuriusGatewayDriverConfig } from '../interfaces';
import { registerMercuriusHooks } from '../utils/register-mercurius-hooks.util';
import { registerMercuriusPlugin } from '../utils/register-mercurius-plugin.util';

/**
 * @publicApi
 */
export class MercuriusGatewayDriver extends AbstractGraphQLDriver<MercuriusGatewayDriverConfig> {
  get instance(): FastifyInstance<
    Server,
    IncomingMessage,
    ServerResponse,
    FastifyBaseLogger
  > {
    return this.httpAdapterHost?.httpAdapter?.getInstance?.();
  }

  public async start(options: MercuriusGatewayDriverConfig) {
    const httpAdapter = this.httpAdapterHost.httpAdapter;
    const platformName = httpAdapter.getType();

    if (platformName !== 'fastify') {
      throw new Error(`No support for current HttpAdapter: ${platformName}`);
    }

    const {
      plugins,
      hooks,
      schema: _, // Schema stubbed to be compatible with other drivers, ignore.
      ...mercuriusOptions
    } = options;
    const app = httpAdapter.getInstance<FastifyInstance>();
    await app.register(require('@mercuriusjs/gateway'), {
      ...mercuriusOptions,
    });
    await registerMercuriusPlugin(app, plugins);
    registerMercuriusHooks(app, hooks, 'graphqlGateway');
  }

  public async stop(): Promise<void> {}

  public generateSchema(options: MercuriusGatewayDriverConfig) {
    return null;
  }
}
