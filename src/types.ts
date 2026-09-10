export interface Customer {
  id: string;
  timestamp: string;
  user: string;
  name: string;
  contact: string;
  address: string;
}

export interface Order {
  id: string;
  timestamp: string;
  user: string;
  customerId: string;
  productType: string;
  quantity: number;
  material: string;
  color: string;
  size: string;
  accessories: string;
  price: number;
  totalPrice: number;
  paymentTerms: string;
  deadline: string;
  status: 'Quotation' | 'Order' | 'Design' | 'Sample' | 'Production' | 'QC' | 'Shipping' | 'Completed';
}

export interface Design {
  id: string;
  orderId: string;
  timestamp: string;
  user: string;
  fileLink: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export interface Sample {
  id: string;
  orderId: string;
  timestamp: string;
  user: string;
  status: 'Pending' | 'Approved' | 'Approved with notes' | 'Rejected';
  qcNote?: string;
}

export interface SPK {
  id: string;
  orderId: string;
  timestamp: string;
  user: string;
  line: string;
  targetDate: string;
  notes: string;
}

export type SOPModule = 
  | 'Dashboard'
  | 'Customers'
  | 'Orders'
  | 'Quotations'
  | 'Designs'
  | 'Samples'
  | 'Production'
  | 'Inventory'
  | 'QC'
  | 'Shipping'
  | 'Finance'
  | 'HR'
  | 'Machines'
  | 'Safety'
  | 'Procurement'
  | 'Accounts'
  | 'Import'
  | 'HowItWorks';

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: string;
  avatar?: string;
  allowedModules: SOPModule[] | ['*'];
  timestamp?: string;
  user?: string;
}

export interface CustomerSession {
  id: string;
  name: string;
  company?: string;
  contact?: string;
  address?: string;
  status?: string;
  selectedSpkId?: string;
}

export type AuthSession = 
  | { type: 'internal'; user: User }
  | { type: 'customer'; customer: CustomerSession };
