import express from 'express';
import bodyParser from 'body-parser';
import winston from 'winston';
import logger from 'express-winston';
import wrap from 'express-async-wrap';

import { AppScopes } from './constants';

import cmdManager from './commands/init';
import { CommandError } from './commands/base';

import spotifyApi, { storeTokens } from './spotify';


// Create our app
const app = express();

// Handle json and urlencoded bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));


// Add / route
app.get('/', (req, res) => {
    if (spotifyApi.getAccessToken()) {
        return res.send('You are logged in.');
    }

    return res.send('<a href="/authorise">Authorise</a>');
});

// Add oauth start route
app.get('/authorise', (req, res) => {
    res.redirect(spotifyApi.createAuthorizeURL(AppScopes, new Date().getTime()));
});

// Add oauth callback route
app.get('/callback', wrap(async function(req, res, next) {
    try {
        const data = await spotifyApi.authorizationCodeGrant(req.query.code);

        // Store the tokens
        storeTokens(data.body.access_token, data.body.refresh_token);

        res.redirect('/');
    } catch(e) {
        next(e);
    }
}));

// This is the slack command handler entrypoint
app.post('/store', wrap(async function(req, res, next) {
    if (req.body.token !== process.env.SLACK_TOKEN) {
        return res.status(500).send('Cross site request forgerizzle!');
    }

    let data;

    try {
        data = await spotifyApi.refreshAccessToken();
    } catch (e) {
        return res.send(
            'Could not refresh access token. You probably need to ' +
            're-authorise yourself from your app\'s homepage. Write `help jukebox` to slackbot'
        );
    }

    try {
        // Store the tokens
        storeTokens(data.body.access_token, data.body.refresh_token);

        const {commandError, error, message} = await cmdManager.handle(req.body.text);

        if (commandError) {
            res.status(500).send(commandError);
        } else if (error) {
            next(error);
        } else {
            return res.send(message);
        }
    } catch (e) {
        next(e);
    }
}));

app.use(logger.errorLogger({
    transports: [
        new winston.transports.Console({
            json: true,
            colorize: true
        })
    ]
}));

// Set port from env
app.set('port', (process.env.PORT || 5000));

// Listen on app
app.listen(app.get('port'));
