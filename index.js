import express from 'express';
import session from 'express-session';
import passport from 'passport';
import GitHubStrategy from 'passport-github2';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import path from 'path';

dotenv.config();

const app = express();
const port = 3000;

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const SESSION_SECRET = process.env.SESSION_SECRET;
const ORGANIZATION = 'bytemait';

app.use(
    session({
        secret: SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
    })
);

app.use(express.static('public'));

app.set('views', path.join(path.resolve(), 'views'));
app.set('view engine', 'ejs');

app.use(passport.initialize());
app.use(passport.session());

passport.use(new GitHubStrategy({
    clientID: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
    callbackURL: 'http://localhost:3000/auth/github/callback',
},
    async (accessToken, refreshToken, profile, done) => {
        try {
            const response = await fetch(`https://api.github.com/user/following/${ORGANIZATION}`, {
                headers: {
                    'Authorization': `token ${accessToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'MyAppName',
                }
            });

            const responseBody = await response.text();
            console.log('Response Status:', response.status);
            console.log('Response Body:', responseBody);

            if (response.status === 204) {
                console.log('User follows the organization:', profile);
                done(null, profile);
            } else {
                console.log('User does not follow the organization:', profile);
                done(null, false);
            }
        } catch (error) {
            console.error('Error checking GitHub follow status:', error);
            done(error);
        }
    }
));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

app.get('/auth/github', passport.authenticate('github', { scope: ['user:follow'] }));

app.get('/auth/github/callback', passport.authenticate('github', {
    failureRedirect: '/notFollow',
    successRedirect: '/private',
}));

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
}

app.get('/private', ensureAuthenticated, (req, res) => {
    res.render('partials/success');
});

app.get('/notFollow', (req, res) => {
    res.render('partials/not_follow');
});

app.get('/', (req, res) => {
    res.render('partials/index');
});

app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.session.destroy(() => {
            res.redirect('/');
        });
    });
});


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
