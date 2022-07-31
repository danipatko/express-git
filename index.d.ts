import { NextFunction, Request, Response } from 'express';
import { BackendConfig } from './env';
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
