const express = require("express");
const blogModel = require("../models/Blog");
const passport = require("passport");
const User = require("../models/User");
const blogRouter = express.Router();

function calculateReadingTime(text) {
  const wordsPerMinute = 200;
  const wordCount = text.split(" ").length;
  const readingTime = Math.ceil(wordCount / wordsPerMinute);
  return readingTime;
}
// get all published blogs

blogRouter.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      state = "published",
      author,
      title,
      tags,
      orderBy = "createdAt",
    } = req.query;

    let filter = { state };
    // add search filters for provided parameters
    if (title) filter.title = { $regex: title, $options: "i" };
    if (tags) filter.tags = { $in: tags.split(",") };
    if (author) {
      const authors = await User.find({
        $or: [
          { first_name: { $regex: author, $options: "i" } },
          { last_name: { $regex: author, $options: "i" } },
        ],
      }).select("_id");

      filter.author = { $in: authors.map((a) => a._id) };
    }

    const blogs = await blogModel
      .find(filter)
      .populate("author", "first_name last_name email")
      .sort({ [orderBy]: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    //   count total published blogs
    const total = await blogModel.countDocuments(filter);

    res.status(200).json({
      total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      blogs,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});
// get blogs created by the login user
blogRouter.get(
  "/me",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { page = 1, limit = 10, state } = req.query;
      //   set filter to userid
      const filter = { author: req.user._id };
      if (state) filter.state = state;

      const blogs = await blogModel
        .find(filter)
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const total = await blogModel.countDocuments(filter);

      res.status(200).json({
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit),
        blogs,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// get blog by id, accessible by public
blogRouter.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const blog = await blogModel
      .findOne({ _id: id, state: "published" })
      .populate("author", "first_name last_name email");

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    // Increase read count
    blog.read_count += 1;
    await blog.save();
    res.status(200).json(blog);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// verify authentication before allowing user post blogs
blogRouter.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { title, description, body, tags } = req.body;
      //   calculate reading time
      const reading_time = calculateReadingTime(body);
      const blog = await blogModel.create({
        title,
        description,
        body,
        tags,
        author: req.user._id,
        state: "draft",
        read_count: 0,
        reading_time,
        timestamp: new Date(),
      });
      res.status(201).json(blog);
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: "Server Error" });
    }
  }
);

// allow owner update blog
blogRouter.put(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const id = req.params.id;
      const blogUpdate = req.body;
      blogUpdate.lastUpdatedAt = new Date();
      const blog = await blogModel.findById(id);
      if (!blog || blog.author.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Unauthorized user" });
      }

      //  Recalculate reading_time if body changed
      if (blogUpdate.body) {
        updates.reading_time = calculateReadingTime(blogUpdate.body);
      }

      const updatedBlog = await blogModel.findByIdAndUpdate(id, blogUpdate, {
        new: true,
      });
      res.status(200).json(updatedBlog);
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

blogRouter.patch(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const id = req.params.id;
      const blogUpdate = req.body;
      blogUpdate.lastUpdatedAt = new Date();
      const blog = await blogModel.findById(id);
      if (!blog || blog.author.toString() !== req.user._id) {
        return res.status(403).json({ message: "Unauthorized user" });
      }
      //  Recalculate reading_time if body changed
      if (blogUpdate.body) {
        updates.reading_time = calculateReadingTime(blogUpdate.body);
      }
      const updatedBlog = await blogModel.findByIdAndUpdate(id, blogUpdate, {
        new: true,
      });
      res.status(200).json(updatedBlog);
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// allow only blog owners delete their blogs

blogRouter.delete(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const blog = await blogModel.findById(req.params.id);
      if (!blog) {
        return res.status(404).json({ message: "Blog not found" });
      }
      if (blog.author.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Not authorized" });
      }
      await blog.deleteOne();
      res.status(200).json({ message: "Blog deleted successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = blogRouter;
