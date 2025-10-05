const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const authRouter = express.Router();

authRouter.post(
  "/signup",
  passport.authenticate("signup", { session: false }),
  async (req, res) => {
    try {
      const payload = {
        _id: req.user._id,
        email: req.user.email,
      };
      const token = jwt.sign({ user: payload }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });
      res.status(201).json({
        message: "Signup successful ",
        token,
        user: {
          _id: req.user._id,
          first_name: req.user.first_name,
          last_name: req.user.last_name,
          email: req.user.email,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

authRouter.post("/login", async (req, res, next) => {
  passport.authenticate("login", async (err, user, info) => {
    try {
      if (err) return next(err);

      if (!user) {
        return res.status(401).json({
          message: "Invalid email or password ",
        });
      }

      req.login(user, { session: false }, async (error) => {
        if (error) return next(error);

        const payload = {
          _id: user._id,
          email: user.email,
        };

        // Sign JWT with 1-hour expiration
        const token = jwt.sign({ user: payload }, process.env.JWT_SECRET, {
          expiresIn: "1h",
        });

        // Send token to client
        return res.status(200).json({
          message: "Login successful ",
          token,
          user: {
            _id: user._id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
          },
        });
      });
    } catch (error) {
      next(error);
    }
  })(req, res, next);
});

module.exports = authRouter;
