const express = require('express');
const cookieSession = require('cookie-session');
const helmet = require('helmet');
var csrf = require('csurf');
const os = require('os');

const app = express();

app.use(cookieSession({
    name: 'session',
    keys: ['key1', 'key2']
}))

app.use(helmet());
app.use(csrf({ cookie: true });

app.use(express.static('dist'));
app.get('/api/getUsername', (req, res) => res.send({ username: os.userInfo().username }));

app.listen(process.env.PORT || 8080, () =>
  console.log(`Listening on port ${process.env.PORT || 8080}!`);
);
