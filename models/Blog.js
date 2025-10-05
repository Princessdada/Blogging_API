const mongoose = require("mongoose");

//Define a schema
const Schema = mongoose.Schema;

//Define Blog schema
const BlogSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: false,
    },
    body: {
      type: String,
      required: [true, "Body is required"],
    },
    tags: {
      type: [String],
      default: [],
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    state: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    read_count: {
      type: Number,
      default: 0,
    },
    reading_time: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// calculate reading time before saving
BlogSchema.pre("save", function (next) {
  if (this.body) {
    const words = this.body.split(/\s+/).length;
    const wordsPerMinute = 200;
    this.reading_time = Math.ceil(words / wordsPerMinute);
  }
  next();
});

// Export the model
module.exports = mongoose.model("Blog", BlogSchema);
