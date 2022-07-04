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
