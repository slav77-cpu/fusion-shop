import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './src/config/db.js';
import productsRoutes from './src/routes/product.js';
import ordersRoutes from "./src/routes/orders.js";
import authRoutes from "./src/routes/auth.js";



dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());


await connectDB();

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});
app.use('/products', productsRoutes);
app.use("/orders", ordersRoutes);
app.use("/auth", authRoutes);


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
