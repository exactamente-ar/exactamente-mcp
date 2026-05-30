declare module "*/worker.js" {
  const worker: {
    fetch(request: Request, env: unknown, ctx: ExecutionContext): Promise<Response>;
  };
  export default worker;
}
