// src/index.ts
import { exec as _exec, spawn } from "child_process";

// src/env.ts
import url from "url";
var SERVER_SOFTWARE = "node/" + process.version;
var SERVER_PROTOCOL = "HTTP/1.1";
var GATEWAY_INTERFACE = "CGI/2.1";
var defaultEnv = {
  SERVER_SOFTWARE,
  SERVER_PROTOCOL,
  GATEWAY_INTERFACE,
  GIT_HTTP_EXPORT_ALL: ""
};
var getEnv = (req, config) => {
  const env = { ...defaultEnv };
  env.GIT_PROJECT_ROOT = config.projectRoot;
  env.SCRIPT_NAME = config.projectRoot;
  env.SERVER_PORT = config.port;
  env.SERVER_HOST = config.host;
  env.HTTP_HOST = config.host;
  const URI = url.parse(req.url);
  if (!URI.pathname)
    return void 0;
  env.REQUEST_METHOD = req.method;
  env.QUERY_STRING = URI.query;
  env.REQUEST_URI = req.url;
  for (const [header, value] of Object.entries(req.headers)) {
    env[header.toUpperCase().replaceAll(/[\s\-]+/gm, "_")] = value;
  }
  env.REMOTE_ADDR = req.socket.remoteAddress;
  env.REMOTE_PORT = req.socket.remotePort;
  env.PATH_INFO = URI.pathname;
  env.PATH = process.env.PATH;
  if (req.headers["content-length"])
    env.CONTENT_LENGTH = req.headers["content-length"];
  if (req.headers["content-type"])
    env.CONTENT_TYPE = req.headers["content-type"];
  if (req.headers.authorization)
    env.AUTH_TYPE = req.headers.authorization.split(" ")[0] ?? "";
  return env;
};
var env_default = getEnv;

// src/index.ts
import { promisify } from "util";
import path from "path/posix";
var exec = promisify(_exec);
var getBackendPath = async () => {
  try {
    const { stdout } = await exec("git --exec-path");
    if (!stdout.length)
      return;
    return path.join(stdout.replaceAll("\n", ""), "git-http-backend");
  } catch (e) {
    throw new Error(`Failed to find git-http-backend executable.
${e}`);
  }
};
var ServeGit = (config) => {
  return async (req, res, next) => {
    const backend = await getBackendPath();
    if (!backend)
      return void res.sendStatus(500);
    const env = env_default(req, config);
    if (!env)
      return void res.sendStatus(400);
    const proc = spawn(backend, ["--stateless-rpc"], { env });
    req.pipe(proc.stdin);
    let chunks = [];
    proc.stdout.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    proc.stdout.on("end", () => {
      const result = Buffer.concat(chunks);
      let start = 0;
      let end = 0;
      let statusCode = 200;
      while (end <= result.length) {
        while (result[end] != 13 && end <= result.length) {
          end++;
        }
        const line = result.subarray(start, end).toString();
        end += 2;
        start = end;
        if (line.length == 0) {
          break;
        }
        const [header, value] = line.split(":").map((x) => x.trim());
        if (header && value) {
          if (header == "Status") {
            const code = Number(value.split(/\s+/g)[0]);
            statusCode = code == 0 ? 200 : code;
          } else {
            res.setHeader(header, value);
          }
        }
      }
      res.statusCode = statusCode;
      res.send(result.subarray(start));
      next();
    });
  };
};
var src_default = ServeGit;
export {
  src_default as default
};
