const { request } = require("express");
const passport = require("passport");
const UserModel = require("../models/User");
require("dotenv").config();
const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;
const localStrategy = require("passport-local").Strategy;

// middleware to authenticate and validate secret token
passport.use(
  new JwtStrategy(
    {
      secretOrKey: process.env.JWT_SECRET,
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    },

    async (payload, done) => {
      try {
        return done(null, payload.user);
      } catch (err) {
        return done(err, false);
      }
    }
  )
);

passport.use(
  "signup",
  new localStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      passReqToCallback: true,
    },
    async (req, email, password, done) => {
      try {
        const { first_name, last_name } = req.body;
        // check for the required fields: firstname and lastname
        if (!first_name || !last_name) {
          return done(null, false, {
            message: "First name and last name are required.",
          });
        }
        // check for existing users
        const existingUser = await UserModel.findOne({ email });
        if (existingUser) {
          return done(null, false, { message: "Email already registered." });
        }

        // create new user
        const newUser = await UserModel.create({
          first_name,
          last_name,
          email,
          password,
        });
        return done(null, newUser);
      } catch (err) {
        return done(err, false);
      }
    }
  )
);

passport.use(
  "login",
  new localStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
        // find if there is a matching email in the database
        const user = await UserModel.findOne({ email });
        if (!user) {
          return done(null, false, { message: "User not found" });
        }
        // validate password
        const validate = await user.isValidPassword(password);
        if (!validate) {
          return done(null, false, { message: "Wrong Password" });
        }
        // if validated, login user
        return done(null, user, { message: "Logged in Successfully" });
      } catch (err) {
        return done(err, false);
      }
    }
  )
);
