const bodyParser = require('body-parser');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const routes = require('./routes');
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cors());
app.use(cookieParser('signText'));
app.use('/', routes);

app.listen(8088, () => {
	console.log('服务已启动 http://localhost:8088');
})