import type { Request } from 'express';
import url from 'url';

/// git backend settings

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

// the root url of the git repositories

// the absolute path of the directory containing the hosted git repositories
const SERVER_SOFTWARE = 'node/' + process.version;
const SERVER_PROTOCOL = 'HTTP/1.1';
const GATEWAY_INTERFACE = 'CGI/2.1';

// the unchangeable environment variables passed to the cgi script
const defaultEnv: { [key: string]: any } = {
    SERVER_SOFTWARE,
    SERVER_PROTOCOL,
    GATEWAY_INTERFACE,
    GIT_HTTP_EXPORT_ALL: '',
};

const getEnv = (
    req: Request,
    config: BackendConfig
): { [key: string]: any } | undefined => {
    const env = { ...defaultEnv };

    // config
    env.GIT_PROJECT_ROOT = config.projectRoot;
    env.SCRIPT_NAME = config.projectRoot;
    env.SERVER_PORT = config.port;
    env.SERVER_HOST = config.host;
    env.HTTP_HOST = config.host;

    // parse request url
    const URI = url.parse(req.url);
    if (!URI.pathname) return undefined;

    // add request metadata
    env.REQUEST_METHOD = req.method;
    env.QUERY_STRING = URI.query;
    env.REQUEST_URI = req.url;

    // headers
    for (const [header, value] of Object.entries(req.headers)) {
        env[header.toUpperCase().replaceAll(/[\s\-]+/gm, '_')] = value;
    }

    // socket stuff
    env.REMOTE_ADDR = req.socket.remoteAddress;
    env.REMOTE_PORT = req.socket.remotePort;

    env.PATH_INFO = URI.pathname;
    env.PATH = process.env.PATH;

    // optional headers
    if (req.headers['content-length'])
        env.CONTENT_LENGTH = req.headers['content-length'];
    if (req.headers['content-type'])
        env.CONTENT_TYPE = req.headers['content-type'];
    if (req.headers.authorization)
        env.AUTH_TYPE = req.headers.authorization.split(' ')[0] ?? '';

    return env;
};

export default getEnv;
