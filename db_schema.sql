-- =========================================================
-- DATABASE SCHEMA: HIJ APPS (Production MySQL for Hostinger)
-- Domain: apps.hasilintijualan.com
-- Charset: utf8mb4 / InnoDB
-- =========================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Tabel Users & Hak Akses
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(50) PRIMARY KEY,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `role` VARCHAR(100) DEFAULT 'Staff Operasional',
  `avatar` TEXT,
  `allowedModules` TEXT,
  `user` VARCHAR(100) DEFAULT 'System',
  `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabel Pelanggan (Customers)
CREATE TABLE IF NOT EXISTS `customers` (
  `id` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `company` VARCHAR(255),
  `contact` VARCHAR(50),
  `email` VARCHAR(255),
  `phone` VARCHAR(50),
  `address` TEXT,
  `status` VARCHAR(50) DEFAULT 'Active',
  `user` VARCHAR(100) DEFAULT 'Admin HIJ',
  `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabel Penawaran (Quotations)
CREATE TABLE IF NOT EXISTS `quotations` (
  `id` VARCHAR(50) PRIMARY KEY,
  `customerId` VARCHAR(50),
  `customerName` VARCHAR(255),
  `productType` VARCHAR(255),
  `quantity` INT DEFAULT 0,
  `price` DECIMAL(15, 2) DEFAULT 0,
  `totalPrice` DECIMAL(15, 2) DEFAULT 0,
  `deadline` VARCHAR(50),
  `status` VARCHAR(50) DEFAULT 'Draft',
  `material` VARCHAR(255),
  `color` VARCHAR(255),
  `size` VARCHAR(255),
  `accessories` TEXT,
  `sizeChart` LONGTEXT,
  `needsProcurement` VARCHAR(50),
  `notes` TEXT,
  `user` VARCHAR(100) DEFAULT 'Admin HIJ',
  `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX (`customerId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabel Pesanan Aktif (Orders)
CREATE TABLE IF NOT EXISTS `orders` (
  `id` VARCHAR(50) PRIMARY KEY,
  `customerId` VARCHAR(50),
  `customerName` VARCHAR(255),
  `productType` VARCHAR(255),
  `quantity` INT DEFAULT 0,
  `price` DECIMAL(15, 2) DEFAULT 0,
  `totalPrice` DECIMAL(15, 2) DEFAULT 0,
  `deadline` VARCHAR(50),
  `status` VARCHAR(50) DEFAULT 'Order',
  `material` VARCHAR(255),
  `color` VARCHAR(255),
  `size` VARCHAR(255),
  `accessories` TEXT,
  `sizeChart` LONGTEXT,
  `needsProcurement` VARCHAR(50),
  `notes` TEXT,
  `user` VARCHAR(100) DEFAULT 'Admin HIJ',
  `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX (`customerId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabel SPK Produksi (SPK_Produksi)
CREATE TABLE IF NOT EXISTS `spk_produksi` (
  `id` VARCHAR(50) PRIMARY KEY,
  `orderId` VARCHAR(50),
  `po` VARCHAR(100),
  `customerId` VARCHAR(50),
  `customerName` VARCHAR(255),
  `productName` VARCHAR(255),
  `targetQty` INT DEFAULT 0,
  `material` TEXT,
  `sablonBordir` TEXT,
  `tanggalMasuk` VARCHAR(50),
  `tanggalSelesai` VARCHAR(50),
  `notes` TEXT,
  `pjFinishing` VARCHAR(100),
  `pjCutting` VARCHAR(100),
  `pjKepalaProduksi` VARCHAR(100),
  `mockupDepan` TEXT,
  `mockupBelakang` TEXT,
  `cutting` INT DEFAULT 0,
  `sewing` INT DEFAULT 0,
  `finishing` INT DEFAULT 0,
  `qc` INT DEFAULT 0,
  `progress` INT DEFAULT 0,
  `status` VARCHAR(50) DEFAULT 'In Progress',
  `sizeChart` LONGTEXT,
  `employeeProgress` LONGTEXT,
  `user` VARCHAR(100) DEFAULT 'Admin HIJ',
  `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX (`orderId`),
  INDEX (`customerId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tabel Kontrol Kualitas (QC_Reports)
CREATE TABLE IF NOT EXISTS `qc_reports` (
  `id` VARCHAR(50) PRIMARY KEY,
  `orderId` VARCHAR(50),
  `product` VARCHAR(255),
  `qty` INT DEFAULT 0,
  `defects` INT DEFAULT 0,
  `repairable` INT DEFAULT 0,
  `nonRepairable` INT DEFAULT 0,
  `status` VARCHAR(50) DEFAULT 'Accept',
  `notes` TEXT,
  `imageUrls` TEXT,
  `user` VARCHAR(100) DEFAULT 'Admin HIJ',
  `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX (`orderId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Tabel Tagihan (Invoices)
CREATE TABLE IF NOT EXISTS `invoices` (
  `id` VARCHAR(50) PRIMARY KEY,
  `orderId` VARCHAR(50),
  `customerId` VARCHAR(50),
  `customerName` VARCHAR(255),
  `amount` DECIMAL(15, 2) DEFAULT 0,
  `total` DECIMAL(15, 2) DEFAULT 0,
  `dueDate` VARCHAR(50),
  `status` VARCHAR(50) DEFAULT 'Belum Lunas',
  `notes` TEXT,
  `user` VARCHAR(100) DEFAULT 'Admin HIJ',
  `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX (`orderId`),
  INDEX (`customerId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Tabel Pembayaran (Payments)
CREATE TABLE IF NOT EXISTS `payments` (
  `id` VARCHAR(50) PRIMARY KEY,
  `orderId` VARCHAR(50),
  `customerId` VARCHAR(50),
  `customerName` VARCHAR(255),
  `amount` DECIMAL(15, 2) DEFAULT 0,
  `date` VARCHAR(50),
  `status` VARCHAR(50) DEFAULT 'Verified',
  `notes` TEXT,
  `user` VARCHAR(100) DEFAULT 'Admin HIJ',
  `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX (`orderId`),
  INDEX (`customerId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Tabel Desain & Mockup (Designs)
CREATE TABLE IF NOT EXISTS `designs` (
  `id` VARCHAR(50) PRIMARY KEY,
  `customerId` VARCHAR(50),
  `orderId` VARCHAR(50),
  `name` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100),
  `status` VARCHAR(50) DEFAULT 'Approved',
  `description` TEXT,
  `imageUrl` TEXT,
  `user` VARCHAR(100) DEFAULT 'Admin HIJ',
  `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX (`customerId`),
  INDEX (`orderId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Tabel Sampel Produk (Samples)
CREATE TABLE IF NOT EXISTS `samples` (
  `id` VARCHAR(50) PRIMARY KEY,
  `customerId` VARCHAR(50),
  `orderId` VARCHAR(50),
  `status` VARCHAR(50) DEFAULT 'Pending',
  `qcNote` TEXT,
  `user` VARCHAR(100) DEFAULT 'Admin HIJ',
  `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX (`customerId`),
  INDEX (`orderId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Tabel Inventaris Bahan Baku (Inventory_Bahan)
CREATE TABLE IF NOT EXISTS `inventory_bahan` (
  `id` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `stock` DECIMAL(15, 2) DEFAULT 0,
  `unit` VARCHAR(50) DEFAULT 'Roll',
  `minStock` DECIMAL(15, 2) DEFAULT 0,
  `price` DECIMAL(15, 2) DEFAULT 0,
  `category` VARCHAR(100) DEFAULT 'Bahan Baku',
  `user` VARCHAR(100) DEFAULT 'Admin HIJ',
  `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Tabel Inventaris Produk Jadi (Inventory_Produk_Jadi)
CREATE TABLE IF NOT EXISTS `inventory_produk_jadi` (
  `id` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `stock` DECIMAL(15, 2) DEFAULT 0,
  `unit` VARCHAR(50) DEFAULT 'Pcs',
  `minStock` DECIMAL(15, 2) DEFAULT 0,
  `price` DECIMAL(15, 2) DEFAULT 0,
  `category` VARCHAR(100) DEFAULT 'Produk Jadi',
  `user` VARCHAR(100) DEFAULT 'Admin HIJ',
  `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Tabel Inventaris Lainnya / Aksesoris (Inventory_Lainnya)
CREATE TABLE IF NOT EXISTS `inventory_lainnya` (
  `id` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `stock` DECIMAL(15, 2) DEFAULT 0,
  `unit` VARCHAR(50) DEFAULT 'Pcs',
  `minStock` DECIMAL(15, 2) DEFAULT 0,
  `price` DECIMAL(15, 2) DEFAULT 0,
  `category` VARCHAR(100) DEFAULT 'Aksesoris',
  `user` VARCHAR(100) DEFAULT 'Admin HIJ',
  `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Tabel Pengadaan Barang (Procurements)
CREATE TABLE IF NOT EXISTS `procurements` (
  `id` VARCHAR(50) PRIMARY KEY,
  `itemName` VARCHAR(255) NOT NULL,
  `intendedFor` VARCHAR(100),
  `quantity` DECIMAL(15, 2) DEFAULT 0,
  `price` DECIMAL(15, 2) DEFAULT 0,
  `purchaseDate` VARCHAR(50),
  `category` VARCHAR(100),
  `inventoryCategory` VARCHAR(100),
  `status` VARCHAR(50) DEFAULT 'Received',
  `user` VARCHAR(100) DEFAULT 'Admin HIJ',
  `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Tabel Mesin Produksi (Machines)
CREATE TABLE IF NOT EXISTS `machines` (
  `id` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `type` VARCHAR(100),
  `status` VARCHAR(50) DEFAULT 'Running',
  `lastMaint` VARCHAR(50),
  `health` INT DEFAULT 100,
  `user` VARCHAR(100) DEFAULT 'Admin HIJ',
  `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Tabel Operator / SDM (Operators)
CREATE TABLE IF NOT EXISTS `operators` (
  `id` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `role` VARCHAR(100),
  `skill` VARCHAR(10) DEFAULT 'A',
  `wage` DECIMAL(15, 2) DEFAULT 0,
  `joinDate` VARCHAR(50),
  `user` VARCHAR(100) DEFAULT 'Admin HIJ',
  `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. Tabel Jalur Produksi (ProductionLines)
CREATE TABLE IF NOT EXISTS `productionlines` (
  `id` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `progress` INT DEFAULT 0,
  `status` VARCHAR(50) DEFAULT 'On Track',
  `operator` VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. Tabel Laporan K3 / Keselamatan (Safety_Reports)
CREATE TABLE IF NOT EXISTS `safety_reports` (
  `id` VARCHAR(50) PRIMARY KEY,
  `type` VARCHAR(100),
  `location` VARCHAR(255),
  `description` TEXT,
  `status` VARCHAR(50) DEFAULT 'Resolved',
  `date` VARCHAR(50),
  `user` VARCHAR(100) DEFAULT 'Admin HIJ',
  `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. Tabel Pengiriman / Ekspedisi (Shipments)
CREATE TABLE IF NOT EXISTS `shipments` (
  `id` VARCHAR(50) PRIMARY KEY,
  `orderId` VARCHAR(50),
  `courier` VARCHAR(100),
  `trackingNumber` VARCHAR(100),
  `status` VARCHAR(50) DEFAULT 'Processing',
  `destination` TEXT,
  `estimatedArrival` VARCHAR(50),
  `user` VARCHAR(100) DEFAULT 'Admin HIJ',
  `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX (`orderId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- INITIAL ADMIN SEED (Password PBKDF2: luckyrezza)
-- Disarankan untuk segera diubah setelah login di menu Manajemen Akun
-- =========================================================
INSERT INTO `users` (`id`, `username`, `password`, `name`, `role`, `avatar`, `allowedModules`, `user`, `timestamp`)
VALUES (
  'USR-001',
  'admin.rezza',
  '$pbkdf2$100000$73e0e88e337aa3d7854c0b8cda6fd04f$781d6861dd7825e9f02e44c9d1a4c30331848e81181daebc2dde92ee7fb294c9680af9a559bf231135b72ed755966c3bd2576982c1125c68c31027a4c803accc',
  'Rezza',
  'Super Admin',
  'https://picsum.photos/seed/rezza/100/100',
  '["*"]',
  'System',
  NOW()
) ON DUPLICATE KEY UPDATE `username`=`username`;

SET FOREIGN_KEY_CHECKS = 1;
