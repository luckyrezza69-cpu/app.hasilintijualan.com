import fs from 'fs';
import path from 'path';

export const DATA_DIR = path.join(process.cwd(), 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Normalizer for collection names to filename
export const getCollectionFileName = (collectionName: string): string => {
  let normalized = collectionName.toLowerCase().replace(/[\s-]+/g, '_');
  if (normalized === 'accounts') normalized = 'users';
  return path.join(DATA_DIR, `${normalized}.json`);
};

// Initial seed data for a rich initial local experience
const INITIAL_SEEDS: Record<string, any[]> = {
  users: [
    {
      id: "USR-001",
      username: "admin.rezza",
      password: "$pbkdf2$100000$73e0e88e337aa3d7854c0b8cda6fd04f$781d6861dd7825e9f02e44c9d1a4c30331848e81181daebc2dde92ee7fb294c9680af9a559bf231135b72ed755966c3bd2576982c1125c68c31027a4c803accc",
      name: "Rezza",
      role: "Super Admin",
      avatar: "https://picsum.photos/seed/rezza/100/100",
      allowedModules: ["*"],
      timestamp: new Date().toISOString(),
      user: "System"
    },
    {
      id: "USR-002",
      username: "produksi.budi",
      password: "$pbkdf2$100000$aebc633adb73e89bd933ed39530000b8$1721411b311a9d5781b8dc7d2ddcf963e7bfc3251bec24493b90186c3c7b19afbeef02ee1aa1ed57320efe8e6b92e043ccc44574d05a5ee1ade07622429dce68",
      name: "Budi Santoso",
      role: "Kepala Produksi (PPIC)",
      avatar: "https://picsum.photos/seed/budi/100/100",
      allowedModules: ["Dashboard", "Orders", "Designs", "Production", "Inventory", "Procurement", "HowItWorks"],
      timestamp: new Date().toISOString(),
      user: "System"
    },
    {
      id: "USR-003",
      username: "qc.hendra",
      password: "$pbkdf2$100000$fadf17965db1e58c49ccb773384f53f3$73dabac00833c94ee96a1d1a1437af457f63d901f2bde905b68adb784113c8ce930cc86ae67e515fbad994c29a89804287baf434e9f8aaf5664b6305f1a3cf46",
      name: "Hendra Setiawan",
      role: "Inspector QC",
      avatar: "https://picsum.photos/seed/hendra/100/100",
      allowedModules: ["Dashboard", "Production", "QC", "Orders", "HowItWorks"],
      timestamp: new Date().toISOString(),
      user: "System"
    },
    {
      id: "USR-004",
      username: "finance.siti",
      password: "$pbkdf2$100000$452f099a4595b02512f78dca7c0583d0$4c1f1add29064629a48ae18f0eaddee11caa41bb1cc3ba75c08530a2618b78e891ae5b0f4322b1eab6f5ac3ab327745ba31dcabf3ac65deba3e1ee1054fb2efc",
      name: "Siti Aminah",
      role: "Staff Keuangan",
      avatar: "https://picsum.photos/seed/siti/100/100",
      allowedModules: ["Dashboard", "Customers", "Orders", "Finance", "HowItWorks"],
      timestamp: new Date().toISOString(),
      user: "System"
    }
  ]
};

// Cache in memory for fast performance
const memoryStore: Record<string, any[]> = {};

// Load data from file or seed
const readCollection = (collectionName: string): any[] => {
  const normalized = collectionName.toLowerCase().replace(/[\s-]+/g, '_');
  const filePath = getCollectionFileName(collectionName);
  
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error(`Error reading ${filePath}:`, err);
    }
  }

  // Seed default data if available
  const seed = INITIAL_SEEDS[normalized] || [];
  const initialData = [...seed];
  writeCollection(collectionName, initialData);
  return initialData;
};

// Write collection to file
const writeCollection = (collectionName: string, data: any[]): void => {
  const normalized = collectionName.toLowerCase().replace(/[\s-]+/g, '_');
  memoryStore[normalized] = data;
  const filePath = getCollectionFileName(collectionName);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
};

// Helper to find ID matching
const matchesId = (item: any, id: string): boolean => {
  if (!item || id === undefined || id === null) return false;
  const targetId = String(id).trim().toLowerCase();
  
  const idKeys = ['id', 'no', 'kode', 'identity', 'key', '_id'];
  for (const k of idKeys) {
    if (item[k] !== undefined && String(item[k]).trim().toLowerCase() === targetId) {
      return true;
    }
  }
  
  // Direct Object.values check if key might be uppercase or variation
  for (const [key, val] of Object.entries(item)) {
    if (idKeys.includes(key.toLowerCase().trim()) && String(val).trim().toLowerCase() === targetId) {
      return true;
    }
  }
  return false;
};

export const localDb = {
  getAll: (collectionName: string): any[] => {
    return readCollection(collectionName);
  },

  getById: (collectionName: string, id: string): any | null => {
    const list = readCollection(collectionName);
    return list.find(item => matchesId(item, id)) || null;
  },

  create: (collectionName: string, data: any): any => {
    const list = readCollection(collectionName);
    
    // Ensure item has an ID
    const newItem = {
      id: data.id || `ID-${Date.now()}`,
      timestamp: data.timestamp || new Date().toISOString(),
      ...data
    };

    // Check if ID already exists, update or replace
    const index = list.findIndex(item => matchesId(item, newItem.id));
    if (index >= 0) {
      list[index] = { ...list[index], ...newItem };
    } else {
      list.unshift(newItem); // Newest items first
    }

    writeCollection(collectionName, list);
    return newItem;
  },

  update: (collectionName: string, id: string, data: any): any | null => {
    const list = readCollection(collectionName);
    const index = list.findIndex(item => matchesId(item, id));
    
    if (index === -1) {
      // If not found, create new record
      return localDb.create(collectionName, { id, ...data });
    }

    const updated = {
      ...list[index],
      ...data,
      id: id || list[index].id,
      updatedAt: new Date().toISOString()
    };

    list[index] = updated;
    writeCollection(collectionName, list);
    return updated;
  },

  delete: (collectionName: string, id: string): boolean => {
    const list = readCollection(collectionName);
    const initialLen = list.length;
    const filtered = list.filter(item => !matchesId(item, id));
    
    if (filtered.length !== initialLen) {
      writeCollection(collectionName, filtered);
      return true;
    }
    return false;
  }
};

export default localDb;
