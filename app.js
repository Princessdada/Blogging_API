const express = require("express");
const mongoose = require("mongoose");
const passport = require("passport");
require("dotenv").config();
const app = express();
// import routes
const authRouter = require("./routes/auth");
const blogRouter = require("./routes/blog");

require("./authentication/auth");

// middleware
app.use(express.json());
app.use(passport.initialize());

// routes
app.use("/auth", authRouter);
app.use("/blogs", blogRouter);

const PORT = process.env.PORT || 3000;

// connect to mongodb
const db = require("./db");
db.connectToMongodb();
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}
module.exports = app;
