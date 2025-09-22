declare module 'lambda-api' {
  interface API {
    get(path: string, handler: (req: any, res: any) => any): void;
    post(path: string, handler: (req: any, res: any) => any): void;
    put(path: string, handler: (req: any, res: any) => any): void;
    delete(path: string, handler: (req: any, res: any) => any): void;
    use(middleware: (req: any, res: any, next: any) => any): void;
    register(router: any, options?: { prefix?: string }): void;
    run(event: any, context: any): Promise<any>;
  }

  interface APIOptions {
    logger?: boolean;
  }

  function createAPI(options?: APIOptions): API;
  function Router(): API;

  export = createAPI;
  export { Router };
}