import express from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import multer from "multer";
import { google } from "googleapis";
import { v2 as cloudinary } from "cloudinary";
import { JWT } from "google-auth-library";
import { Readable } from "stream";
import pool from "./db.js";
import localDb, { DATA_DIR } from "./localDb.js"; // Import Local JSON database
import mammoth from "mammoth";
import { 
  hashPassword, 
  verifyPassword, 
  checkRateLimit, 
  recordFailedAttempt, 
  resetLoginAttempts, 
  sanitizeFilename, 
  ALLOWED_EXTENSIONS, 
  protectUploadsDirectory 
} from "./security.js";

export const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Enable proxy trusting when deployed behind Nginx / LiteSpeed on Hostinger
app.set('trust proxy', 1);

// Ensure uploads directory exists and is protected against script execution
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
protectUploadsDirectory(UPLOADS_DIR);

// Multer setup for local disk storage with strict filename sanitization
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const { safeName, isValid } = sanitizeFilename(file.originalname);
    if (!isValid) {
      return cb(new Error("Format file tidak diizinkan atau berbahaya bagi keamanan server."), '');
    }
    cb(null, safeName);
  }
});

// Safe upload handler with file size limit & whitelist filter
const upload = multer({ 
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB limit
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(new Error(`Tipe file ${ext} tidak diizinkan demi keamanan server.`));
    }
    cb(null, true);
  }
});
const uploadMemory = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }
});

// Serve uploaded files statically
app.use('/uploads', express.static(UPLOADS_DIR));

// --- Database Configuration & Mapping ---
const isMySQLConfigured = () => {
  return !!(process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME);
};

const isGoogleSheetsConfigured = () => {
  return !!(process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SHEET_ID);
};

const getTableName = (sheetName: string) => {
  const map: Record<string, string> = {
    'Customers': 'customers',
    'SPK_Produksi': 'spk_produksi',
    'Orders': 'orders',
    'Quotations': 'quotations',
    'QC_Reports': 'qc_reports',
    'Invoices': 'invoices',
    'Payments': 'payments',
    'Design_Assets': 'design_assets',
    'Designs': 'designs',
    'Samples': 'samples',
    'Operators': 'operators',
    'ProductionLines': 'productionlines',
    'Inventory_Bahan': 'inventory_bahan',
    'Inventory_Produk_Jadi': 'inventory_produk_jadi',
    'Inventory_Lainnya': 'inventory_lainnya',
    'Procurements': 'procurements',
    'Machines': 'machines',
    'Safety_Reports': 'safety_reports',
    'Shipments': 'shipments',
    'Users': 'users',
    'Accounts': 'users'
  };
  return map[sheetName] || sheetName.toLowerCase().replace(/[\s-]+/g, '_');
};

// Configure Cloudinary if credentials provided
if (process.env.CLOUDINARY_URL) {
  // Cloudinary SDK automatically picks up CLOUDINARY_URL from process.env
} else if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Handle body-parser errors (like request aborted)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.type === 'request.aborted') {
    return res.status(400).json({ error: "Request aborted by client" });
  }
  if (err.status === 413) {
    return res.status(413).json({ error: "Request entity too large" });
  }
  next(err);
});

// Root API Route
app.get("/api", (_req, res) => {
  res.json({ 
    message: "HIJ Apps API is running locally",
    storage: "localhost",
    environment: process.env.NODE_ENV || "development",
    database: isMySQLConfigured() ? "MySQL" : "Localhost (JSON File Storage)"
  });
});

// Health Check Endpoint
app.get("/api/health", (_req, res) => {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const sheetId = process.env.GOOGLE_SHEET_ID;

  const configStatus = {
    localDb: true,
    localUploads: true,
    mysql: isMySQLConfigured(),
    sheets: !!sheetId,
    auth: !!(privateKey && email),
    drive: !!process.env.GOOGLE_DRIVE_FOLDER_ID,
    cloudinary: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY)
  };

  res.json({ 
    status: "ok", 
    mode: "local",
    storage: "localhost",
    database: isMySQLConfigured() ? "MySQL" : "Localhost (JSON File Storage)",
    timestamp: new Date().toISOString(),
    config: configStatus
  });
});

// Helper to get client IP
const getClientIp = (req: express.Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
};

// Login Endpoint (Internal Users)
app.post("/api/login", (req, res) => {
  const clientIp = getClientIp(req);
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username dan Password wajib diisi." });
  }

  const rateLimitKey = `${clientIp}:login:${String(username).trim().toLowerCase()}`;
  const rateLimit = checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000);
  if (rateLimit.isBlocked) {
    return res.status(429).json({ 
      error: `Terlalu banyak percobaan login yang gagal. Akses dibatasi sementara demi keamanan. Silakan coba lagi dalam ${rateLimit.retryAfterMinutes} menit.` 
    });
  }

  const users = localDb.getAll('users');
  const user = users.find(u => 
    String(u.username || '').trim().toLowerCase() === String(username).trim().toLowerCase()
  );

  // Check optional environment variable override for admin
  const envAdminUser = process.env.ADMIN_USERNAME || 'admin';
  const envAdminPass = process.env.ADMIN_PASSWORD;
  const isEnvAdminMatch = !!(envAdminPass && 
    String(username).trim().toLowerCase() === envAdminUser.toLowerCase() && 
    String(password).trim() === String(envAdminPass).trim());

  const isPasswordValid = isEnvAdminMatch || (user && verifyPassword(password, user.password));

  if (!isPasswordValid || (!user && !isEnvAdminMatch)) {
    recordFailedAttempt(rateLimitKey, 5, 15 * 60 * 1000);
    return res.status(401).json({ error: "Username atau Password salah. Silakan coba lagi." });
  }

  // Reset rate limiting on success
  resetLoginAttempts(rateLimitKey);

  // Auto-upgrade legacy plain text password to PBKDF2 hash
  if (user && user.password && !user.password.startsWith('$pbkdf2$')) {
    try {
      const secureHash = hashPassword(password);
      localDb.update('users', user.id, { password: secureHash });
    } catch (hashErr) {
      console.warn("Could not auto-hash legacy password:", hashErr);
    }
  }

  // Return user info without password
  const targetUser = user || {
    id: 'USR-ADMIN',
    username: envAdminUser,
    name: 'Administrator',
    role: 'Super Admin',
    allowedModules: ['*']
  };

  const { password: _pw, ...userWithoutPassword } = targetUser;
  res.json({
    success: true,
    user: userWithoutPassword
  });
});

// Customer Portal Login Endpoint (Supports Customer ID and/or Active SPK ID)
app.post("/api/customer-login", (req, res) => {
  const clientIp = getClientIp(req);
  const rateLimitKey = `${clientIp}:customer`;
  const rateLimit = checkRateLimit(rateLimitKey, 10, 10 * 60 * 1000);
  if (rateLimit.isBlocked) {
    return res.status(429).json({ 
      error: `Terlalu banyak percobaan pencarian yang gagal. Silakan coba lagi dalam ${rateLimit.retryAfterMinutes} menit.` 
    });
  }

  const { customerId, spkId } = req.body;

  const trimmedCustId = customerId ? String(customerId).trim().toLowerCase() : '';
  const trimmedSpkId = spkId ? String(spkId).trim().toLowerCase() : '';

  if (!trimmedCustId && !trimmedSpkId) {
    return res.status(400).json({ error: "Harap masukkan nomor ID Customer atau nomor ID SPK." });
  }

  const allCustomers = localDb.getAll('customers');
  const allSpks = localDb.getAll('spk_produksi');
  const allOrders = localDb.getAll('orders');

  let matchedCustomer: any = null;
  let targetSpk: any = null;

  // 1. If SPK ID is provided
  if (trimmedSpkId) {
    targetSpk = allSpks.find(s => 
      String(s.id || '').trim().toLowerCase() === trimmedSpkId ||
      String(s.po || '').trim().toLowerCase() === trimmedSpkId ||
      String(s.orderId || '').trim().toLowerCase() === trimmedSpkId
    );

    if (!targetSpk) {
      recordFailedAttempt(rateLimitKey, 10, 10 * 60 * 1000);
      return res.status(404).json({
        error: `Nomor ID SPK "${spkId}" tidak ditemukan dalam sistem produksi.`
      });
    }

    // Resolve customer ID from SPK
    let spkCustId = String(targetSpk.customerId || '').trim().toLowerCase();
    if (!spkCustId && targetSpk.orderId) {
      const relatedOrder = allOrders.find(o => String(o.id || '').trim().toLowerCase() === String(targetSpk.orderId).trim().toLowerCase());
      if (relatedOrder) spkCustId = String(relatedOrder.customerId || '').trim().toLowerCase();
    }

    // If customerId was also given, make sure it matches
    if (trimmedCustId && spkCustId && spkCustId !== trimmedCustId) {
      recordFailedAttempt(rateLimitKey, 10, 10 * 60 * 1000);
      return res.status(400).json({
        error: `Nomor SPK "${spkId}" bukan milik ID Customer "${customerId}". Harap periksa kembali nomor ID Anda.`
      });
    }

    matchedCustomer = allCustomers.find(c => String(c.id || '').trim().toLowerCase() === spkCustId);
    if (!matchedCustomer) {
      // Fallback customer object if not present in customers table
      matchedCustomer = {
        id: spkCustId || 'CUST-001',
        name: targetSpk.customerName || 'Pelanggan HIJ',
        status: 'Active'
      };
    }
  } else if (trimmedCustId) {
    // 2. Only Customer ID is provided
    matchedCustomer = allCustomers.find(c => 
      String(c.id || '').trim().toLowerCase() === trimmedCustId
    );

    if (!matchedCustomer) {
      recordFailedAttempt(rateLimitKey, 10, 10 * 60 * 1000);
      return res.status(404).json({ 
        error: `ID Customer "${customerId}" tidak terdaftar dalam sistem. Pastikan nomor ID Customer yang diberikan oleh admin HIJ sudah benar.` 
      });
    }
  }

  // Reset rate limiting on success
  resetLoginAttempts(rateLimitKey);

  // Check if customer status is deactivated / inactive / blocked
  if (matchedCustomer) {
    const custStatus = String(matchedCustomer.status || 'Active').trim().toLowerCase();
    const isInactive = ['inactive', 'nonaktif', 'tidak aktif', 'blocked', 'diblokir', 'disabled', 'suspended'].includes(custStatus);
    
    if (isInactive) {
      return res.status(403).json({
        success: false,
        error: `ID Customer "${matchedCustomer.id}" telah dinonaktifkan oleh administrator. Silakan hubungi admin HIJ Konveksi.`
      });
    }
  }

  res.json({
    success: true,
    customer: {
      ...matchedCustomer,
      selectedSpkId: targetSpk ? targetSpk.id : undefined
    }
  });
});

// Customer Portal Data Endpoint (Strictly filtered for customer ID)
app.get("/api/customer-portal/:customerId", (req, res) => {
  const { customerId } = req.params;
  if (!customerId) {
    return res.status(400).json({ error: "ID Customer wajib disertakan." });
  }

  const rawId = req.params.customerId;
  const searchId = decodeURIComponent(String(rawId || '')).trim().toLowerCase();
  const customers = localDb.getAll('customers');
  const customer = customers.find(c => 
    String(c.id || '').trim().toLowerCase() === searchId ||
    String(c.id || '').trim().toLowerCase() === String(rawId || '').trim().toLowerCase()
  );

  if (!customer) {
    return res.status(404).json({ error: "Data pelanggan tidak ditemukan." });
  }

  const custStatus = String(customer.status || 'Active').trim().toLowerCase();
  const isInactive = ['inactive', 'nonaktif', 'tidak aktif', 'blocked', 'diblokir', 'disabled', 'suspended'].includes(custStatus);
  if (isInactive) {
    return res.status(403).json({ 
      error: `ID Customer "${customer.id}" telah dinonaktifkan oleh administrator. Silakan hubungi admin HIJ Konveksi.` 
    });
  }

  // Get orders for this customer
  const allOrders = localDb.getAll('orders');
  const customerOrders = allOrders.filter(o => 
    String(o.customerId || '').trim().toLowerCase() === searchId
  );
  const customerOrderIds = customerOrders.map(o => String(o.id || '').trim().toLowerCase());

  // Get SPKs for this customer
  const allSpks = localDb.getAll('spk_produksi');
  const customerSpks = allSpks.filter(s => 
    String(s.customerId || '').trim().toLowerCase() === searchId ||
    customerOrderIds.includes(String(s.orderId || '').trim().toLowerCase())
  );

  // Get Designs for this customer
  const allDesigns = localDb.getAll('designs');
  const customerDesigns = allDesigns.filter(d => 
    String(d.customerId || '').trim().toLowerCase() === searchId ||
    customerOrderIds.includes(String(d.orderId || '').trim().toLowerCase())
  );

  // Get Samples for this customer
  const allSamples = localDb.getAll('samples');
  const customerSamples = allSamples.filter(s => 
    String(s.customerId || '').trim().toLowerCase() === searchId ||
    customerOrderIds.includes(String(s.orderId || '').trim().toLowerCase())
  );

  // Return strictly isolated customer data
  res.json({
    success: true,
    customer,
    orders: customerOrders,
    spks: customerSpks,
    designs: customerDesigns,
    samples: customerSamples
  });
});

// Admin 360-Degree Customer Overview Endpoint (Returns ALL connected data for a client)
app.get("/api/admin/customer-overview/:customerId", (req, res) => {
  const { customerId } = req.params;
  if (!customerId) {
    return res.status(400).json({ error: "ID Customer wajib disertakan." });
  }

  const rawId = req.params.customerId;
  const searchId = decodeURIComponent(String(rawId || '')).trim().toLowerCase();
  const customers = localDb.getAll('customers');
  const customer = customers.find(c => 
    String(c.id || '').trim().toLowerCase() === searchId ||
    String(c.id || '').trim().toLowerCase() === String(rawId || '').trim().toLowerCase()
  );

  if (!customer) {
    return res.status(404).json({ error: "Data pelanggan tidak ditemukan." });
  }

  const custNameLower = String(customer.name || '').trim().toLowerCase();
  const custCompLower = String(customer.company || '').trim().toLowerCase();

  // 1. Orders
  const allOrders = localDb.getAll('orders');
  const customerOrders = allOrders.filter(o => {
    const oCustId = String(o.customerId || '').trim().toLowerCase();
    const oCustName = String(o.customerName || '').trim().toLowerCase();
    return oCustId === searchId || (custNameLower && oCustName.includes(custNameLower)) || (custCompLower && oCustName.includes(custCompLower));
  });
  const customerOrderIds = customerOrders.map(o => String(o.id || '').trim().toLowerCase());

  // 2. SPK Produksi
  const allSpks = localDb.getAll('spk_produksi');
  const customerSpks = allSpks.filter(s => {
    const sCustId = String(s.customerId || '').trim().toLowerCase();
    const sCustName = String(s.customerName || '').trim().toLowerCase();
    const sOrderId = String(s.orderId || '').trim().toLowerCase();
    return sCustId === searchId || customerOrderIds.includes(sOrderId) || (custNameLower && sCustName.includes(custNameLower));
  });
  const customerSpkIds = customerSpks.map(s => String(s.id || '').trim().toLowerCase());

  // 3. Designs
  const allDesigns = localDb.getAll('designs');
  const customerDesigns = allDesigns.filter(d => {
    const dCustId = String(d.customerId || '').trim().toLowerCase();
    const dOrderId = String(d.orderId || '').trim().toLowerCase();
    return dCustId === searchId || customerOrderIds.includes(dOrderId);
  });

  // 4. Samples
  const allSamples = localDb.getAll('samples');
  const customerSamples = allSamples.filter(s => {
    const sCustId = String(s.customerId || '').trim().toLowerCase();
    const sOrderId = String(s.orderId || '').trim().toLowerCase();
    return sCustId === searchId || customerOrderIds.includes(sOrderId);
  });

  // 5. Invoices
  const allInvoices = localDb.getAll('invoices');
  const customerInvoices = allInvoices.filter(i => {
    const iCustId = String(i.customerId || '').trim().toLowerCase();
    const iOrderId = String(i.orderId || '').trim().toLowerCase();
    const iCustName = String(i.customerName || '').trim().toLowerCase();
    return iCustId === searchId || customerOrderIds.includes(iOrderId) || (custNameLower && iCustName.includes(custNameLower));
  });
  const invoiceIds = customerInvoices.map(i => String(i.id || '').trim().toLowerCase());

  // 6. Payments
  const allPayments = localDb.getAll('payments');
  const customerPayments = allPayments.filter(p => {
    const pInvId = String(p.invoiceId || '').trim().toLowerCase();
    const pCustId = String(p.customerId || '').trim().toLowerCase();
    return pCustId === searchId || invoiceIds.includes(pInvId);
  });

  // 7. QC Reports
  const allQcReports = localDb.getAll('qc_reports');
  const customerQcReports = allQcReports.filter(q => {
    const qOrderId = String(q.orderId || '').trim().toLowerCase();
    const qSpkId = String(q.spkId || '').trim().toLowerCase();
    return customerOrderIds.includes(qOrderId) || customerSpkIds.includes(qSpkId);
  });

  // 8. Shipments
  const allShipments = localDb.getAll('shipments');
  const customerShipments = allShipments.filter(s => {
    const sOrderId = String(s.orderId || '').trim().toLowerCase();
    const sCustId = String(s.customerId || '').trim().toLowerCase();
    return sCustId === searchId || customerOrderIds.includes(sOrderId);
  });

  // 9. Quotations
  const allQuotations = localDb.getAll('quotations');
  const customerQuotations = allQuotations.filter(q => {
    const qCustId = String(q.customerId || '').trim().toLowerCase();
    const qCustName = String(q.customerName || '').trim().toLowerCase();
    return qCustId === searchId || (custNameLower && qCustName.includes(custNameLower));
  });

  res.json({
    success: true,
    customer,
    orders: customerOrders,
    spks: customerSpks,
    designs: customerDesigns,
    samples: customerSamples,
    invoices: customerInvoices,
    payments: customerPayments,
    qcReports: customerQcReports,
    shipments: customerShipments,
    quotations: customerQuotations
  });
});

// Google Auth Helper (Optional fallback if user explicitly uses Google Sheets)
const getGoogleAuth = () => {
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;
  let email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

  if (!privateKey || !email) {
    throw new Error("Missing Google Auth credentials.");
  }

  let key = privateKey.trim();
  if (key.startsWith('{')) {
    try {
      const parsed = JSON.parse(key);
      key = parsed.private_key || key;
      email = parsed.client_email || email;
    } catch (e) {
      console.error("Failed to parse GOOGLE_PRIVATE_KEY as JSON");
    }
  }

  key = key.replace(/\\n/g, '\n').replace(/^["']|["']$/g, '').trim();
  email = email.trim().replace(/^["']|["']$/g, '');

  if (key.includes('-----BEGIN') && !key.includes('\n', key.indexOf('-----BEGIN') + 10)) {
    const match = key.match(/-----BEGIN (.*?)-----(.*?)-----END (.*?)-----/s);
    if (match) {
      const header = match[1];
      const body = match[2].replace(/\s/g, '');
      const wrapped = body.match(/.{1,64}/g)?.join('\n');
      key = `-----BEGIN ${header}-----\n${wrapped}\n-----END ${header}-----\n`;
    }
  }

  return new JWT({
    email: email,
    key: key,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
    ],
  });
};

const getSpreadsheetId = () => {
  let id = process.env.GOOGLE_SHEET_ID;
  if (!id) return null;
  if (id.includes('/d/')) {
    const match = id.match(/\/d\/(.*?)(\/|$)/);
    if (match) id = match[1];
  }
  return id;
};

// --- Upload Endpoints (100% Localhost Support) ---

// 1. Local Upload Endpoint (Primary)
app.post("/api/upload", upload.single("file"), (req, res) => {
  try {
    const file = (req as any).file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileUrl = `/uploads/${file.filename}`;
    res.json({
      id: file.filename,
      url: fileUrl,
      webViewLink: fileUrl,
      size: file.size,
      mimetype: file.mimetype
    });
  } catch (err: any) {
    console.error("Local upload error:", err);
    res.status(500).json({ error: err.message || "Failed to upload file locally" });
  }
});

// 2. Cloudinary Upload Alias (Uses local storage if Cloudinary not configured)
app.post("/api/cloudinary/upload", upload.single("file"), async (req, res) => {
  try {
    const file = (req as any).file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // If Cloudinary credentials are fully configured, upload there
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      try {
        const filePath = file.path;
        const result = await cloudinary.uploader.upload(filePath, {
          resource_type: "auto",
          folder: "hij_apps",
        });

        return res.json({
          id: result.public_id,
          url: result.secure_url,
          webViewLink: result.secure_url,
        });
      } catch (cloudErr) {
        console.warn("Cloudinary upload failed, falling back to local file URL:", cloudErr);
      }
    }

    // Default to local file URL
    const fileUrl = `/uploads/${file.filename}`;
    res.json({
      id: file.filename,
      url: fileUrl,
      webViewLink: fileUrl,
    });
  } catch (error: any) {
    console.error("Error uploading file:", error);
    res.status(500).json({ error: error.message || "Failed to upload file" });
  }
});

// 3. Drive Upload Alias (Fallback to Localhost)
app.post("/api/drive/upload", upload.single("file"), async (req, res) => {
  try {
    const file = (req as any).file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // If Google Drive is fully configured, try Drive
    if (process.env.GOOGLE_DRIVE_FOLDER_ID && process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      try {
        const auth = getGoogleAuth();
        const drive = google.drive('v3');
        const fileMetadata = {
          name: file.originalname,
          parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
        };

        const media = {
          mimeType: file.mimetype,
          body: fs.createReadStream(file.path),
        };

        const response = await drive.files.create({
          auth,
          requestBody: fileMetadata,
          media: media,
          fields: 'id, webViewLink, webContentLink',
          supportsAllDrives: true,
        });

        const fileId = response.data.id;
        const directLink = `https://lh3.googleusercontent.com/d/${fileId}`;
        return res.json({ 
          id: fileId, 
          url: directLink,
          webViewLink: response.data.webViewLink 
        });
      } catch (driveErr) {
        console.warn("Drive upload failed, falling back to local file URL:", driveErr);
      }
    }

    // Default to local file URL
    const fileUrl = `/uploads/${file.filename}`;
    res.json({ 
      id: file.filename, 
      url: fileUrl,
      webViewLink: fileUrl 
    });
  } catch (error: any) {
    console.error("Error in drive upload handler:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Word (.docx) Parser Endpoint
app.post("/api/import/word", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "File dokumen Word tidak ditemukan." });
    }
    const buffer = fs.readFileSync(file.path);
    const textResult = await mammoth.extractRawText({ buffer });
    const htmlResult = await mammoth.convertToHtml({ buffer });

    // Clean up temporary upload file
    try { fs.unlinkSync(file.path); } catch {}

    res.json({
      success: true,
      text: textResult.value,
      html: htmlResult.value
    });
  } catch (err: any) {
    console.error("Error parsing Word file:", err);
    res.status(500).json({ error: err.message || "Gagal membaca dokumen Word" });
  }
});

// --- CRUD API Routes (Localhost Database) ---

// 1. GET ALL
app.get("/api/sheets/:sheetName", async (req, res) => {
  const { sheetName } = req.params;

  // Option A: MySQL
  if (isMySQLConfigured()) {
    try {
      const tableName = getTableName(sheetName);
      const [rows] = await pool.query(`SELECT * FROM \`${tableName}\` ORDER BY timestamp DESC`);
      return res.json(rows);
    } catch (sqlError: any) {
      console.warn(`SQL Query failed for ${sheetName}, using Local DB:`, sqlError.message);
    }
  }

  // Option B: Google Sheets (If specifically enabled)
  if (isGoogleSheetsConfigured() && process.env.USE_GOOGLE_SHEETS === 'true') {
    try {
      const auth = getGoogleAuth();
      const spreadsheetId = getSpreadsheetId();
      const sheets = google.sheets('v4');
      const response = await sheets.spreadsheets.values.get({
        auth,
        spreadsheetId: spreadsheetId!,
        range: `'${sheetName}'!A:ZZ`,
      }, { timeout: 10000 });

      const rows = response.data.values || [];
      if (rows.length === 0) return res.json([]);

      const headers = rows[0];
      const data = rows.slice(1).map(row => {
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header.trim()] = row[index];
        });
        return obj;
      });
      return res.json(data);
    } catch (gsError: any) {
      console.warn(`Google Sheets fetch failed for ${sheetName}, fallback to Local DB:`, gsError.message);
    }
  }

  // Option C: Localhost JSON DB (Primary Local Storage)
  try {
    const data = localDb.getAll(sheetName);
    
    // Mask sensitive passwords when retrieving users list
    if (sheetName.toLowerCase() === 'users' || sheetName.toLowerCase() === 'accounts') {
      const sanitized = data.map((u: any) => ({
        ...u,
        password: u.password?.startsWith('$pbkdf2$') ? '[Terenkripsi PBKDF2]' : (u.password ? '••••••••' : '')
      }));
      return res.json(sanitized);
    }

    res.json(data);
  } catch (err: any) {
    console.error(`Error reading ${sheetName} from local DB:`, err);
    res.status(500).json({ error: err.message || "Failed to retrieve local data" });
  }
});

// 2. CREATE (POST)
app.post("/api/sheets/:sheetName", async (req, res) => {
  const { sheetName } = req.params;
  const { data } = req.body;

  if (!data) {
    return res.status(400).json({ error: "Missing data payload in request body" });
  }

  let payload = { ...data };

  // Securely hash password when creating internal users
  if (sheetName.toLowerCase() === 'users' || sheetName.toLowerCase() === 'accounts') {
    if (payload.password && !String(payload.password).startsWith('$pbkdf2$')) {
      payload.password = hashPassword(String(payload.password));
    }
  }

  // Option A: MySQL
  if (isMySQLConfigured()) {
    try {
      const tableName = getTableName(sheetName);
      const keys = Object.keys(payload).filter(key => key !== 'id');
      const allKeys = payload.id ? ['id', ...keys] : keys;
      const values = payload.id ? [payload.id, ...keys.map(k => payload[k])] : keys.map(k => payload[k]);
      const placeholders = allKeys.map(() => '?').join(', ');
      const query = `INSERT INTO \`${tableName}\` (\`${allKeys.join('`, `')}\`) VALUES (${placeholders})`;
      
      await pool.query(query, values);
      return res.json({ success: true, message: "Data saved to MySQL" });
    } catch (sqlError: any) {
      console.warn(`SQL Insert failed for ${sheetName}, using Local DB:`, sqlError.message);
    }
  }

  // Option B: Localhost JSON DB (Primary Local Storage)
  try {
    const created = localDb.create(sheetName, payload);
    res.json({ success: true, data: created });
  } catch (err: any) {
    console.error(`Error creating in ${sheetName}:`, err);
    res.status(500).json({ error: err.message || "Failed to save data locally" });
  }
});

// 2b. BULK CREATE (POST)
app.post("/api/sheets/:sheetName/bulk", async (req, res) => {
  const { sheetName } = req.params;
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Payload 'items' harus berupa array data yang tidak kosong." });
  }

  const results: any[] = [];
  const errors: any[] = [];

  for (let i = 0; i < items.length; i++) {
    const rawItem = items[i];
    if (!rawItem || typeof rawItem !== 'object') continue;

    const payload = { ...rawItem };
    if (!payload.id) {
      const prefix = sheetName.slice(0, 3).toUpperCase();
      payload.id = `${prefix}-${Date.now()}-${i + 1}`;
    }
    if (!payload.timestamp) {
      payload.timestamp = new Date().toISOString();
    }
    if (!payload.user) {
      payload.user = 'Import System';
    }

    // Secure password if importing users
    if (sheetName.toLowerCase() === 'users' || sheetName.toLowerCase() === 'accounts') {
      if (payload.password && !String(payload.password).startsWith('$pbkdf2$')) {
        payload.password = hashPassword(String(payload.password));
      }
    }

    // Option A: MySQL
    if (isMySQLConfigured()) {
      try {
        const tableName = getTableName(sheetName);
        const keys = Object.keys(payload).filter(key => key !== 'id');
        const allKeys = payload.id ? ['id', ...keys] : keys;
        const values = payload.id ? [payload.id, ...keys.map(k => payload[k])] : keys.map(k => payload[k]);
        const placeholders = allKeys.map(() => '?').join(', ');
        const query = `INSERT INTO \`${tableName}\` (\`${allKeys.join('`, `')}\`) VALUES (${placeholders})`;
        await pool.query(query, values);
      } catch (sqlErr: any) {
        console.warn(`Bulk SQL Insert failed for row ${i} in ${sheetName}:`, sqlErr.message);
      }
    }

    // Option B: Local DB
    try {
      const created = localDb.create(sheetName, payload);
      results.push(created);
    } catch (err: any) {
      errors.push({ index: i, error: err.message });
    }
  }

  res.json({
    success: true,
    count: results.length,
    data: results,
    errors: errors.length > 0 ? errors : undefined
  });
});

// 3. UPDATE (PUT)
app.put("/api/sheets/:sheetName/:id", async (req, res) => {
  const { sheetName, id } = req.params;
  const { data } = req.body;

  if (!data) {
    return res.status(400).json({ error: "Missing data payload in request body" });
  }

  let payload = { ...data };

  // Handle user password update securely
  if (sheetName.toLowerCase() === 'users' || sheetName.toLowerCase() === 'accounts') {
    const rawPw = String(payload.password || '').trim();
    if (!rawPw || rawPw === '••••••••' || rawPw.startsWith('[Terenkripsi')) {
      // Do not overwrite existing password with empty string or masked placeholder
      delete payload.password;
    } else if (!rawPw.startsWith('$pbkdf2$')) {
      payload.password = hashPassword(rawPw);
    }
  }

  // Option A: MySQL
  if (isMySQLConfigured()) {
    try {
      const tableName = getTableName(sheetName);
      const keys = Object.keys(payload).filter(key => key !== 'id');
      const sets = keys.map(key => `\`${key}\` = ?`).join(', ');
      const values = [...keys.map(key => payload[key]), id];
      const query = `UPDATE \`${tableName}\` SET ${sets} WHERE id = ?`;
      
      await pool.query(query, values);
      return res.json({ success: true, message: "Data updated in MySQL" });
    } catch (sqlError: any) {
      console.warn(`SQL Update failed for ${sheetName}, using Local DB:`, sqlError.message);
    }
  }

  // Option B: Localhost JSON DB
  try {
    const updated = localDb.update(sheetName, id, payload);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    console.error(`Error updating in ${sheetName}:`, err);
    res.status(500).json({ error: err.message || "Failed to update data locally" });
  }
});

// 4. DELETE
app.delete("/api/sheets/:sheetName/:id", async (req, res) => {
  const { sheetName, id } = req.params;

  // Option A: MySQL
  if (isMySQLConfigured()) {
    try {
      const tableName = getTableName(sheetName);
      await pool.query(`DELETE FROM \`${tableName}\` WHERE id = ?`, [id]);
      return res.json({ success: true, message: "Data deleted from MySQL" });
    } catch (sqlError: any) {
      console.warn(`SQL Delete failed for ${sheetName}, using Local DB:`, sqlError.message);
    }
  }

  // Option B: Localhost JSON DB
  try {
    const deleted = localDb.delete(sheetName, id);
    res.json({ success: deleted, message: deleted ? "Data deleted locally" : "Item not found" });
  } catch (err: any) {
    console.error(`Error deleting from ${sheetName}:`, err);
    res.status(500).json({ error: err.message || "Failed to delete data locally" });
  }
});

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled Error:", err);
  res.status(500).json({ 
    error: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// --- Server Lifecycle & Vite Middleware ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        watch: {
          ignored: [
            '**/data/**', 
            '**/uploads/**', 
            '**/Po berjalan/**', 
            '**/Background SPK/**', 
            '**/*.xlsx', 
            '**/*.xls', 
            '**/*.json',
            '**/*.png',
            '**/*.jpg',
            '**/*.jpeg',
            '**/*.pdf',
            '**/*.zip'
          ]
        }
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`HIJ Apps Local Server running on http://localhost:${PORT}`);
    console.log(`- Local Database: ${DATA_DIR}`);
    console.log(`- Local Uploads: ${UPLOADS_DIR}`);
  });
}

// Start server if not running as serverless function
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  startServer();
}

export default app;
