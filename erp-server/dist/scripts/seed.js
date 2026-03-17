"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const mongoose_1 = __importDefault(require("mongoose"));
const Product_1 = __importDefault(require("../models/Product"));
const Sale_1 = __importDefault(require("../models/Sale"));
const Purchase_1 = __importDefault(require("../models/Purchase"));
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/erp-core';
const PRODUCTS = [
    { name: 'Steel Rod 10mm', sku: 'RM-STL-001', category: 'Raw Material', price: 450, stock: 500, minLevel: 100, unit: 'kg' },
    { name: 'Copper Wire 2mm', sku: 'RM-CPR-002', category: 'Raw Material', price: 1200, stock: 200, minLevel: 50, unit: 'kg' },
    { name: 'Circuit Board Motherboard', sku: 'EL-MB-101', category: 'Electronics', price: 8500, stock: 45, minLevel: 10, unit: 'pcs' },
    { name: 'LCD Screen 15"', sku: 'EL-LCD-102', category: 'Electronics', price: 4200, stock: 30, minLevel: 15, unit: 'pcs' },
    { name: 'Packaging Box (Large)', sku: 'PK-BOX-001', category: 'Packaging', price: 25, stock: 1000, minLevel: 500, unit: 'pcs' },
    { name: 'Industrial Lubricant', sku: 'CH-LUB-001', category: 'Consumables', price: 350, stock: 50, minLevel: 20, unit: 'liters' },
    { name: 'Bolt M12', sku: 'HD-BLT-012', category: 'Hardware', price: 15, stock: 2500, minLevel: 1000, unit: 'pcs' },
];
const CUSTOMERS = ['Apex Industries', 'TechSolve Solutions', 'BuildRight Construction', 'Walk-in Customer', 'Global Traders'];
const VENDORS = ['MetalCorp', 'Electro Supplies Ltd', 'PackItUp', 'ChemWorks'];
const randomDate = (start, end) => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};
const seed = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield mongoose_1.default.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        // Clear existing data
        yield Product_1.default.deleteMany({});
        yield Sale_1.default.deleteMany({});
        yield Purchase_1.default.deleteMany({});
        console.log('🧹 Cleared existing data');
        // Insert Products
        const createdProducts = yield Product_1.default.insertMany(PRODUCTS);
        console.log(`📦 Inserted ${createdProducts.length} products`);
        // Generate Sales
        const sales = [];
        for (let i = 0; i < 50; i++) {
            const numItems = Math.floor(Math.random() * 3) + 1;
            const items = [];
            let totalAmount = 0;
            for (let j = 0; j < numItems; j++) {
                const product = createdProducts[Math.floor(Math.random() * createdProducts.length)];
                const quantity = Math.floor(Math.random() * 10) + 1;
                const total = product.price * quantity;
                items.push({
                    product: product._id,
                    name: product.name,
                    quantity,
                    price: product.price,
                    total
                });
                totalAmount += total;
            }
            sales.push({
                customerName: CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)],
                items,
                totalAmount,
                date: randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date())
            });
        }
        yield Sale_1.default.insertMany(sales);
        console.log(`💰 Generated ${sales.length} sales records`);
        // Generate Purchases
        const purchases = [];
        for (let i = 0; i < 30; i++) {
            const numItems = Math.floor(Math.random() * 5) + 1;
            const items = [];
            let totalAmount = 0;
            for (let j = 0; j < numItems; j++) {
                const product = createdProducts[Math.floor(Math.random() * createdProducts.length)];
                const quantity = Math.floor(Math.random() * 50) + 10;
                const cost = Math.floor(product.price * 0.7); // 30% margin
                const total = cost * quantity;
                items.push({
                    product: product._id,
                    name: product.name,
                    quantity,
                    cost,
                    total
                });
                totalAmount += total;
            }
            purchases.push({
                vendorName: VENDORS[Math.floor(Math.random() * VENDORS.length)],
                items,
                totalAmount,
                date: randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date())
            });
        }
        yield Purchase_1.default.insertMany(purchases);
        console.log(`🚚 Generated ${purchases.length} purchase records`);
        console.log('🎉 Seeding completed successfully');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
});
seed();
