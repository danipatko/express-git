declare module '@danipatko/express-git';
import { NextFunction, Request, Response } from 'express';
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
declare type ExpressHanderFn = (req: Request, res: Response, next: NextFunction) => Promise<void> | void;
/**
 * Express middleware to handle incoming git requests using
 * the git-http-backend cgi script. Make sure git is installed.
 *
 * **USAGE**:
 *
 * Create a repository to serve inside your `projectRoot` folder.
 * ```sh
 * mkdir example
 * cd example
 * git init --bare
 * ```
 *
 * **NOTE**: In order to be able push to the repository, you need to
 * enable http.receivepack in the repo config file. This looks like
 * the following:
 * ```config
 * ...
 * [http]
 *      receivepack = true
 * ```
 *
 * Now you can clone the repo via http.
 * @param config
 * @returns a handler function
 */
declare const ServeGit: (config: BackendConfig) => ExpressHanderFn;
export default ServeGit;
