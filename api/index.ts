import { app, ensureServerInitialized } from '../server';

export default async function handler(req: any, res: any) {
  await ensureServerInitialized();
  return app(req, res);
}
