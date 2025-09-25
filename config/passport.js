const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');


// This function now only takes 'passport' as an argument
module.exports = function(passport) {
    passport.use(
        new GoogleStrategy(
            {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        // Use a full URL, fetched from an environment variable
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
            async (accessToken, refreshToken, profile, done) => {
                const newUser = {
                    googleId: profile.id,
                    name: profile.displayName,
                    email: profile.emails[0].value,
                };
                try {
                    let user = await User.findOne({ googleId: profile.id });
                    if (user) {
                        return done(null, user);
                    } else {
                        user = await User.create(newUser);
                        // Send welcome email for new Google signups
                        try {
                            await sendEmail({
                                to: user.email,
                                subject: 'Welcome to RAAMYA!',
                                html: `<h2>Hi ${user.name},</h2><p>Thank you for signing up with Google!</p>`
                            });
                        } catch (error) {
                            console.error('Google signup welcome email failed:', error);
                        }
                        return done(null, user);
                    }
                } catch (err) {
                    return done(err, null);
                }
            }
        )
    );

    // These are needed for session management, but we use JWTs
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            done(null, user);
        } catch (err) {
            done(err, null);
        }
    });
};