# git-express
Express middleware that handles git requests using the git-http-backend CGI script.
## Example
```js
import ServeGit from './dist/index.js';
import express from 'express';
const app = express();

const config = {
    host: '0.0.0.0',
    port: 3000,
    projectRoot: '/path/to/your/projects/',
};

app.use('/git', ServeGit(config));

app.listen(3000, '0.0.0.0', () => console.log('Server is listening...'));
```

## Usage
```sh
# Create new repository in your configured projectRoot folder
mkdir example.git # name ends with '.git'
cd example.git
git init --bare # --initial-branch=master --template=<template>

# Enable pushing/modifying for anonymus users in this repo (manage access on the express server)
echo -e "[http]\n\treceivepack = true" >> config 

# Clone the repo somewhere else
git clone http://127.0.0.1:3000/git/example.git
> Cloning into 'example'...
> warning: You appear to have cloned an empty repository.
# do stuff with the repo
```
