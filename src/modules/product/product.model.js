import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      en: {
        type: String,
        required: [true, "English product name is required"],
        trim: true,
      },
      ar: {
        type: String,
        required: [true, "Arabic product name is required"],
        trim: true,
      },
    },
    description: {
      en: {
        type: String,
        default: "",
        trim: true,
      },
      ar: {
        type: String,
        default: "",
        trim: true,
      },
    },
    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: [0, "Price cannot be negative"],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Product category is required"],
      index: true,
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
    isAvailable: {
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

// Compound index for listing products in a category
productSchema.index({ category: 1, isActive: 1, sortOrder: 1 });

const Product = mongoose.model("Product", productSchema);

export default Product;
