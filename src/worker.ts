/// <reference types="@cloudflare/workers-types" />
import xmcpWorker from '../worker.js';
import { handleFetch, type WorkerEnv } from './handleFetch';

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext): Promise<Response> {
    return handleFetch(request, env, ctx, (incoming, workerEnv, workerCtx) =>
      xmcpWorker.fetch(incoming, workerEnv, workerCtx as ExecutionContext),
    );
  },
};
