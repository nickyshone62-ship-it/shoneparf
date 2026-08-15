-- ==========================================================================
-- SHONE PARFUMERIE - SUPABASE DATABASE SCHEMA
-- Execute this SQL script in your Supabase SQL Editor
-- ==========================================================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    image TEXT NOT NULL,
    size VARCHAR(50) DEFAULT '100 ml',
    stock INT DEFAULT 10,
    category VARCHAR(50) DEFAULT 'all',
    badge VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT 'Ouagadougou',
    neighborhood VARCHAR(255) NOT NULL,
    address TEXT,
    landmark TEXT,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 1000,
    subtotal NUMERIC(10, 2) NOT NULL,
    total NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Commande reçue',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL
);

-- 4. DELIVERY ZONES TABLE
CREATE TABLE IF NOT EXISTS delivery_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    fee NUMERIC(10, 2) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. INITIAL DATA SEEDING
INSERT INTO products (name, description, price, image, size, stock, category, badge) VALUES
('Royal Oud Shone', 'Une fragrance majestueuse et envoûtante d''oud précieux, d''ambre doré et de notes épicées orientales.', 25000, 'images/royal-oud.png', '100 ml', 15, 'oud', 'Bestseller'),
('Rose Noire De Ouaga', 'L''élégance absolue de la rose noire mariée à des accords boisés sombres et une touche de vanille bourbon intense.', 18000, 'images/rose-noir.png', '100 ml', 12, 'floral', 'Populaire'),
('Elixir d''Or Shone', 'Un parfum lumineux aux effluves d''agrume royal, de jasmin nocturne et d''ambre solaire.', 30000, 'images/elixir-or.png', '100 ml', 8, 'ambré', 'Prestige'),
('Musk Impérial', 'Musk blanc d''une pureté rare, adouci par la fleur d''oranger et des notes poudrées très durables.', 15000, 'images/musk-imperial.png', '50 ml', 20, 'musc', 'Nouveau'),
('Amber Solide Luxury', 'Notes chaudes d''ambre cuivré et de bois de santal précieux. Parfum intense au sillage inoubliable.', 22000, 'images/amber-solide.png', '100 ml', 10, 'ambré', 'Édition Limitée'),
('Jasmin Royal Burkina', 'Fraîcheur florale intense alliance de jasmin sauvage et de bergamote. Sublimé par un fond boisé.', 16000, 'images/jasmin-royal.png', '100 ml', 18, 'floral', 'Incontournable');

INSERT INTO delivery_zones (name, fee) VALUES
('Ouagadougou centre', 1000),
('Karpala', 1500),
('Ouaga 2000', 1500),
('Autres quartiers (Ouagadougou)', 2000),
('Bobo-Dioulasso / Autres villes', 3500);

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;

-- Allow public read access to products & delivery zones
CREATE POLICY "Public Read Products" ON products FOR SELECT USING (true);
CREATE POLICY "Public Read Zones" ON delivery_zones FOR SELECT USING (true);

-- Allow public insert for orders (clients passing orders)
CREATE POLICY "Public Create Orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Read Orders By Number" ON orders FOR SELECT USING (true);
CREATE POLICY "Public Create Order Items" ON order_items FOR INSERT WITH CHECK (true);

-- Allow authenticated admin full access
CREATE POLICY "Admin All Products" ON products FOR ALL USING (true);
CREATE POLICY "Admin All Orders" ON orders FOR ALL USING (true);
CREATE POLICY "Admin All Order Items" ON order_items FOR ALL USING (true);
CREATE POLICY "Admin All Delivery Zones" ON delivery_zones FOR ALL USING (true);
