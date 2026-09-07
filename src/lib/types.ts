export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  imageUrl?: string;
}

export interface MenuItemData {
  id: string;
  hotelId: string;
  category: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  description?: string | null;
  isAvailable: boolean;
  is3dEnabled: boolean;
  modelUrl?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface HotelData {
  id: string;
  name: string;
  slug: string;
  ownerEmail: string;
  phone?: string | null;
  address?: string | null;
  coverImage?: string | null;
  status: 'pending' | 'active' | 'expired';
  createdAt: string | Date;
  updatedAt: string | Date;
  _count?: {
    menuItems?: number;
    orders?: number;
    feedback?: number;
  };
}

export interface OrderData {
  id: string;
  hotelId: string;
  tableNumber: string;
  customerName?: string | null;
  customerPhone?: string | null;
  items: string; // JSON string or parsed
  totalAmount: number;
  status: 'received' | 'in_progress' | 'done' | 'cancelled';
  notes?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  hotel?: {
    name: string;
    slug: string;
    phone?: string | null;
  };
  feedback?: FeedbackData | null;
  chatMessages?: ChatMessageData[];
}

export interface ChatMessageData {
  id: string;
  hotelId: string;
  orderId: string;
  sender: 'customer' | 'staff';
  message: string;
  createdAt: string | Date;
}

export interface FeedbackData {
  id: string;
  hotelId: string;
  orderId: string;
  rating: number;
  comment?: string | null;
  customerName?: string | null;
  createdAt: string | Date;
  order?: {
    tableNumber: string;
  };
}

export interface AdminData {
  id: string;
  email: string;
  name?: string | null;
  createdAt: string | Date;
}
