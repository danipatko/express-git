import type { Request } from 'express';
export interface BackendConfig {
    /**
     * The absolute path to the folder containing the hosted git repositories.
     * Make sure it has no permission restrictions.
     */
    projectRoot: string;
    /**
     * The port of the site
     */
    port: number;
    /**
     * The hostname of the site
     * e.g. `0.0.0.0`
     */
    host: string;
}
declare const getEnv: (req: Request, config: BackendConfig) => {
    [key: string]: any;
} | undefined;
export default getEnv;
