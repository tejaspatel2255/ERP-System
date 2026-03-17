"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const mongoose_1 = __importDefault(require("mongoose"));
const auth_1 = __importDefault(require("./routes/auth"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const customers_1 = __importDefault(require("./routes/customers"));
const products_1 = __importDefault(require("./routes/products"));
const sales_1 = __importDefault(require("./routes/sales"));
const inventory_1 = __importDefault(require("./routes/inventory"));
const production_1 = __importDefault(require("./routes/production"));
const maintenance_1 = __importDefault(require("./routes/maintenance"));
const dispatch_1 = __importDefault(require("./routes/dispatch"));
const hr_1 = __importDefault(require("./routes/hr"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
}));
// Database Connection
mongoose_1.default.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch((err) => console.error('❌ MongoDB Connection Error:', err));
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/dashboard', dashboard_1.default);
app.use('/api/customers', customers_1.default);
app.use('/api/products', products_1.default);
app.use('/api/sales', sales_1.default);
app.use('/api/inventory', inventory_1.default);
app.use('/api/production', production_1.default);
app.use('/api/maintenance', maintenance_1.default);
app.use('/api/dispatch', dispatch_1.default);
app.use('/api/hr', hr_1.default);
app.get('/', (req, res) => {
    res.send('ERP Server is Running');
});
const tryPort = (port) => {
    const server = app.listen(port, () => {
        console.log(`🚀 Server running on port ${port}`);
        console.log(`Note: If frontend fails to connect, ensure NEXT_PUBLIC_API_URL points to this port.`);
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`Port ${port} is busy, trying ${port + 1}...`);
            tryPort(port + 1);
        }
        else {
            console.error(err);
        }
    });
};
tryPort(Number(process.env.PORT) || 5000);
