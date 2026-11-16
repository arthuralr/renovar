declare module 'pg' {
  export class Pool {
    constructor(config?: any);
    query(text: string, params?: any[]): Promise<{ rows: any[] }>;
    on(event: string, listener: (...args: any[]) => void): this;
    end(): Promise<void>;
  }
  const pg: { Pool: typeof Pool };
  export default pg;
}
