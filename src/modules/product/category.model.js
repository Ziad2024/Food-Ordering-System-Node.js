import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      en: {
        type: String,
        required: [true, "English category name is required"],
        trim: true,
      },
      ar: {
        type: String,
        required: [true, "Arabic category name is required"],
        trim: true,
      },
    },
    image: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Optimize queries for active categories sorted by sortOrder
categorySchema.index({ isActive: 1, sortOrder: 1 });

const Category = mongoose.model("Category", categorySchema);

export default Category;
