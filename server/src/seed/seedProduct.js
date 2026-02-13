import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';

dotenv.config();

const products = [
  {
    title: 'Sky Shampoo',
    variantName: 'Vanilla',
    brand: 'Sky',
    category: 'shampoo',
    sizeMl: 400,
    price: 6.90,
    inStock: true,
    groupId: 'sky-shampoo-400',
  },
  {
    title: 'Sky Shampoo',
    variantName: 'Rose',
    brand: 'Sky',
    category: 'shampoo',
    sizeMl: 400,
    price: 6.90,
    inStock: true,
    groupId: 'sky-shampoo-400',
  },
  {
    title: 'Astra Blades',
    variantName: 'Green (5 pcs)',
    brand: 'Astra',
    category: 'razor-blades',
    price: 2.50,
    inStock: true,
    groupId: 'astra-blades',
  }
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  await Product.deleteMany();
  await Product.insertMany(products);

  console.log(`Seeded ${products.length} products`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
