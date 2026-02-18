import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import User from '../models/User.js';

// Local Strategy
passport.use(new LocalStrategy(
  { usernameField: 'email' },
  async (email, password, done) => {
    try {
      const user = await User.findOne({ email }).select('+password');
      if (!user) return done(null, false, { message: 'Invalid email or password' });
      if (!user.password) return done(null, false, { message: 'Please use social login' });

      const isMatch = await user.comparePassword(password);
      if (!isMatch) return done(null, false, { message: 'Invalid email or password' });

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

// Google Strategy
if (process.env.GOOGLE_CLIENT_ID) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ googleId: profile.id });
      if (user) return done(null, user);

      user = await User.findOne({ email: profile.emails[0].value });
      if (user) {
        user.googleId = profile.id;
        if (!user.avatar && profile.photos[0]) user.avatar = profile.photos[0].value;
        await user.save();
        return done(null, user);
      }

      user = await User.create({
        name: profile.displayName,
        email: profile.emails[0].value,
        googleId: profile.id,
        avatar: profile.photos[0]?.value || '',
      });
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));
}

// GitHub Strategy
if (process.env.GITHUB_CLIENT_ID) {
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL,
    scope: ['user:email'],
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ githubId: profile.id });
      if (user) return done(null, user);

      const email = profile.emails?.[0]?.value || `${profile.username}@github.local`;

      user = await User.findOne({ email });
      if (user) {
        user.githubId = profile.id;
        if (!user.avatar && profile.photos[0]) user.avatar = profile.photos[0].value;
        await user.save();
        return done(null, user);
      }

      user = await User.create({
        name: profile.displayName || profile.username,
        email,
        githubId: profile.id,
        avatar: profile.photos[0]?.value || '',
      });
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));
}

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

export default passport;
