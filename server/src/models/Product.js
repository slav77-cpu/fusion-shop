import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    variantName: { type: String, trim: true }, // аромат / вариант
    brand: { type: String, trim: true },
    category: { type: String, trim: true },
    sizeMl: { type: Number },
    price: { type: Number, required: true, min: 0 },
    imageUrl: { type: String, trim: true },
    inStock: { type: Boolean, default: true },
    groupId: { type: String, trim: true }, // за групиране на варианти
  },
  { timestamps: true }
);

export default mongoose.model('Product', productSchema);
