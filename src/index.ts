import { NextFunction, Request, Response } from 'express';
import { exec as _exec, spawn } from 'child_process';
import getEnv, { BackendConfig } from './env';
import { promisify } from 'util';
import path from 'path/posix';

type ExpressHanderFn = (
    req: Request,
    res: Response,
    next: NextFunction
) => Promise<void> | void;

const exec = promisify(_exec);

/**
 * Get the git-http-backend executable path
 */
const getBackendPath = async (): Promise<string | undefined> => {
    try {
        const { stdout } = await exec('git --exec-path');
        if (!stdout.length) return;
        return path.join(stdout.replaceAll('\n', ''), 'git-http-backend');
    } catch (e) {
        throw new Error(`Failed to find git-http-backend executable.\n${e}`);
    }
};

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
const ServeGit = (config: BackendConfig): ExpressHanderFn => {
    return async (req, res, next) => {
        // gets the cgi executable's path
        const backend = await getBackendPath();
        if (!backend) return void res.sendStatus(500);

        const env = getEnv(req, config);
        if (!env) return void res.sendStatus(400);

        // invoke the cgi script, pipe the request data
        const proc = spawn(backend, ['--stateless-rpc'], { env });
        req.pipe(proc.stdin);

        let chunks: Buffer[] = [];
        proc.stdout.on('data', (chunk) => chunks.push(Buffer.from(chunk)));

        // parsing the cgi response (https://datatracker.ietf.org/doc/html/rfc3875#section-6)
        proc.stdout.on('end', () => {
            const result: Buffer = Buffer.concat(chunks);

            let start = 0;
            let end = 0;
            let statusCode = 200; // if there is no status code (and exit code is 0) 200 is assumed

            while (end <= result.length) {
                // end of line at \r
                while (result[end] != 0x0d && end <= result.length) {
                    end++;
                }
                // convert line to a string
                const line = result.subarray(start, end).toString();
                // the next characters are \r and \n, skip them
                end += 2;
                start = end;

                // here is the empty line, end of headers
                if (line.length == 0) {
                    break;
                }

                // look for headers
                const [header, value] = line.split(':').map((x) => x.trim());
                if (header && value) {
                    if (header == 'Status') {
                        const code = Number(value.split(/\s+/g)[0]);
                        statusCode = code == 0 ? 200 : code;
                    } else {
                        // TODO: check header validity
                        res.setHeader(header, value);
                    }
                }
            }
            // now send the rest of the cgi response body
            res.statusCode = statusCode;
            res.send(result.subarray(start));
            next();
        });
    };
};

export default ServeGit;
