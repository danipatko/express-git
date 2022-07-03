import { exec as _exec, spawn } from 'child_process';
import path from 'path/posix';
import { promisify } from 'util';
import express from 'express';
import url from 'url';
import Stream from 'stream';

const app = express();

//// CONSTANTS

/// server settings

const SERVER_PORT = 3001;
// same as SERVER_NAME and HTTP_HOST
const SERVER_HOST = '0.0.0.0';
const HTTP_HOST = SERVER_HOST;

/// git backend settings

// the root url of the git repositories
const ROOT = '/';
// the absolute path of the directory containing the hosted git repositories
const GIT_PROJECT_ROOT = '/home/dapa/test/git/';
const SERVER_SOFTWARE = 'node/' + process.version;
const SERVER_PROTOCOL = 'HTTP/1.1';
const GATEWAY_INTERFACE = 'CGI/2.1';
const SCRIPT_NAME = ROOT;

// the unchangeable environment variables passed to the cgi script
const defaultEnv: { [key: string]: any } = {
    SERVER_PORT,
    SERVER_HOST,
    HTTP_HOST,
    GIT_PROJECT_ROOT,
    SERVER_SOFTWARE,
    SERVER_PROTOCOL,
    SCRIPT_NAME,
    GATEWAY_INTERFACE,
    GIT_HTTP_EXPORT_ALL: '',
};

// some of the per-request variables
// QUERY_STRING, PATH_INFO, REQUEST_URI, REQUEST_METHOD

const exec = promisify(_exec);

const getBackendPath = async (): Promise<string | undefined> => {
    try {
        const { stdout } = await exec('git --exec-path');
        if (!stdout.length) return;
        return path.join(stdout.replaceAll('\n', ''), 'git-http-backend');
    } catch (e) {
        console.error(`Failed to find git-http-backend executable.\n${e}`);
    }
};

app.all('*', async (req, res, next) => {
    console.log(`${req.method} ${req.url}`, req.query, req.headers);

    // gets the cgi executable's path
    const backend = await getBackendPath();
    if (!backend) return void res.sendStatus(500);

    // await new Promise<void>(async (resolve) => {
    // parse request url
    const URI = url.parse(req.url);
    if (!URI.pathname) return void res.sendStatus(400);

    /// add request metadata
    const env = { ...defaultEnv };
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

    // pathinfo is the url part without query parameters, relative to the root endpoint
    let PATH_INFO = URI.pathname.substring(ROOT.length);
    if (!PATH_INFO.startsWith('/')) PATH_INFO = '/' + PATH_INFO; // make sure it starts with a '/'
    env.PATH_INFO = PATH_INFO;

    env.PATH = process.env.PATH;

    // optional headers
    if (req.headers['content-length'])
        env.CONTENT_LENGTH = req.headers['content-length'];
    if (req.headers['content-type'])
        env.CONTENT_TYPE = req.headers['content-type'];
    if (req.headers.authorization)
        env.AUTH_TYPE = req.headers.authorization.split(' ')[0] ?? '';

    // invoke the cgi script, pipe the request data
    const proc = spawn(backend, ['--stateless-rpc'], { env, cwd: '.' });
    req.pipe(proc.stdin);
    console.log(`Spawned ${proc.pid}`);

    // these 2 are for debug
    proc.stdout.pipe(process.stdout);

    HeaderParser.parse(proc.stdout, res, (headers, status) => {
        res.statusCode = status;
        for (const header in headers) {
            res.setHeader(header, headers[header]);
        }
    });

    proc.on('exit', () => {
        console.log('\n----');
    });
    // });
});

app.listen(SERVER_PORT, SERVER_HOST, () =>
    console.log('Server is listening...')
);

class HeaderParser {
    private stdout: Stream.Readable;
    private headers: { [key: string]: any } = {};
    public handler: (headers: { [key: string]: any }, status: number) => void;
    private fired = false;
    public status = 200;
    public out: Stream.Writable;

    public static parse = (
        _stdout: Stream.Readable,
        _out: Stream.Writable,
        handler: (headers: { [key: string]: any }, status: number) => void
    ) => new HeaderParser(_stdout, _out, handler);

    constructor(
        _stdout: Stream.Readable,
        _out: Stream.Writable,
        handler: (headers: { [key: string]: any }, status: number) => void
    ) {
        this.handler = handler;
        this.stdout = _stdout;
        this.out = _out;

        this.stdout.on('data', (chunk: Buffer) => {
            if (this.fired) return;
            // parse headers
            for (const line of chunk.toString().split('\r\n')) {
                // check for empty line
                if (line.length == 0) {
                    // call headers
                    return void this.onHeadersReceived();
                }

                const [header, value] = line.split(':').map((x) => x.trim());
                if (header && value) {
                    if (header == 'Status') {
                        const code = Number(value.split(/\s+/g)[0]);
                        this.status = code == 0 ? 200 : code;
                    } else {
                        this.headers[header] = value;
                    }
                }
            }
        });
    }

    private onHeadersReceived() {
        this.fired = true;
        this.stdout.pipe(this.out);
        this.handler(this.headers, this.status);
    }
}
