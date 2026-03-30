const mongoose = require("mongoose");

const readingProgressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
    },
    currentPage: {
      type: Number,
      default: 1,
    },
    bookmarks: [
      {
        type: Number,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Ensure a user can only have one progress record per book
readingProgressSchema.index({ user: 1, book: 1 }, { unique: true });

module.exports = mongoose.model("ReadingProgress", readingProgressSchema);
