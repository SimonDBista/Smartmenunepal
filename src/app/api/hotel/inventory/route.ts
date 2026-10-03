import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getHotelAuth } from '@/lib/auth';

const DEFAULT_ESSENTIAL_INGREDIENTS = [
  { name: 'Chicken (Boneless/Curry Cut)', category: 'Meat & Poultry', currentStock: 15, unit: 'kg', minAlertStock: 5, costPerUnit: 380, supplier: 'Local Fresh Poultry' },
  { name: 'Mutton (Fresh Cut)', category: 'Meat & Poultry', currentStock: 10, unit: 'kg', minAlertStock: 3, costPerUnit: 1200, supplier: 'Valley Cold Store' },
  { name: 'Basmati Rice (Long Grain)', category: 'Grains & Spices', currentStock: 40, unit: 'kg', minAlertStock: 10, costPerUnit: 140, supplier: 'Himalayan Agro' },
  { name: 'Pure Mustard Oil', category: 'Oils & Sauces', currentStock: 12, unit: 'ltr', minAlertStock: 4, costPerUnit: 240, supplier: 'Swastik Oil Mill' },
  { name: 'Red Onions', category: 'Vegetables & Produce', currentStock: 25, unit: 'kg', minAlertStock: 8, costPerUnit: 70, supplier: 'Kalimati Mandi' },
  { name: 'Fresh Tomatoes', category: 'Vegetables & Produce', currentStock: 8, unit: 'kg', minAlertStock: 5, costPerUnit: 65, supplier: 'Kalimati Mandi' },
  { name: 'Potatoes (Local)', category: 'Vegetables & Produce', currentStock: 30, unit: 'kg', minAlertStock: 10, costPerUnit: 45, supplier: 'Kalimati Mandi' },
  { name: 'Fresh Paneer / Cottage Cheese', category: 'Dairy & Eggs', currentStock: 6, unit: 'kg', minAlertStock: 3, costPerUnit: 600, supplier: 'DDC Dairy' },
  { name: 'Ginger & Garlic Paste Base', category: 'Grains & Spices', currentStock: 4, unit: 'kg', minAlertStock: 2, costPerUnit: 250, supplier: 'Kitchen Prep' },
  { name: 'Dairy Fresh Milk', category: 'Dairy & Eggs', currentStock: 14, unit: 'ltr', minAlertStock: 5, costPerUnit: 90, supplier: 'Morning Dairies' },
];

async function getHotelIngredients(hotelId: string, category?: string): Promise<any[]> {
  const db = prisma as any;
  if (db.ingredient?.findMany) {
    try {
      const where: any = { hotelId };
      if (category && category !== 'all') where.category = category;
      return await db.ingredient.findMany({
        where,
        orderBy: [{ currentStock: 'asc' }, { name: 'asc' }],
      });
    } catch (err) {
      console.warn('Prisma ingredient.findMany failed, falling back to raw query:', err);
    }
  }

  // Raw SQLite fallback
  if (category && category !== 'all') {
    return await prisma.$queryRawUnsafe(
      `SELECT * FROM Ingredient WHERE hotelId = ? AND category = ? ORDER BY currentStock ASC, name ASC`,
      hotelId,
      category
    );
  }
  return await prisma.$queryRawUnsafe(
    `SELECT * FROM Ingredient WHERE hotelId = ? ORDER BY currentStock ASC, name ASC`,
    hotelId
  );
}

async function createIngredientRecord(data: any): Promise<any> {
  const db = prisma as any;
  if (db.ingredient?.create) {
    try {
      return await db.ingredient.create({ data });
    } catch (err) {
      console.warn('Prisma ingredient.create failed, falling back to raw insert:', err);
    }
  }

  const id = 'ing_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  const now = new Date();
  await prisma.$executeRawUnsafe(
    `INSERT INTO Ingredient (id, hotelId, name, category, currentStock, unit, minAlertStock, costPerUnit, supplier, notes, lastRestockedAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    data.hotelId,
    data.name,
    data.category || 'General',
    data.currentStock || 0,
    data.unit || 'kg',
    data.minAlertStock || 5,
    data.costPerUnit || null,
    data.supplier || null,
    data.notes || null,
    data.lastRestockedAt ? (data.lastRestockedAt instanceof Date ? data.lastRestockedAt.toISOString() : new Date(data.lastRestockedAt).toISOString()) : null,
    now.toISOString(),
    now.toISOString()
  );

  return { id, ...data, createdAt: now, updatedAt: now };
}

export async function GET(request: NextRequest) {
  try {
    const auth = getHotelAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toLowerCase();
    const category = searchParams.get('category')?.trim();
    const lowStockOnly = searchParams.get('lowStockOnly') === 'true';

    const ingredients = await getHotelIngredients(auth.hotelId, category);

    // In-memory search & filter for fast snappy experience
    let filtered = ingredients;
    if (search) {
      filtered = filtered.filter(
        (i: any) =>
          (i.name && i.name.toLowerCase().includes(search)) ||
          (i.supplier && i.supplier.toLowerCase().includes(search)) ||
          (i.category && i.category.toLowerCase().includes(search))
      );
    }

    if (lowStockOnly) {
      filtered = filtered.filter((i: any) => Number(i.currentStock) <= Number(i.minAlertStock));
    }

    const totalCount = ingredients.length;
    const lowStockCount = ingredients.filter(
      (i: any) => Number(i.currentStock) > 0 && Number(i.currentStock) <= Number(i.minAlertStock)
    ).length;
    const outOfStockCount = ingredients.filter((i: any) => Number(i.currentStock) <= 0).length;
    const totalEstimatedValue = ingredients.reduce((sum: number, i: any) => {
      const stock = Number(i.currentStock) || 0;
      const cost = Number(i.costPerUnit) || 0;
      if (stock > 0 && cost > 0) {
        return sum + stock * cost;
      }
      return sum;
    }, 0);

    return NextResponse.json({
      ingredients: filtered,
      stats: {
        totalCount,
        lowStockCount,
        outOfStockCount,
        totalEstimatedValue,
      },
    });
  } catch (error: any) {
    console.error('Fetch ingredients error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ingredients', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = getHotelAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Support seeding standard kitchen ingredients
    if (body.seedEssentials) {
      const existing = await getHotelIngredients(auth.hotelId);

      if (existing.length === 0) {
        for (const item of DEFAULT_ESSENTIAL_INGREDIENTS) {
          await createIngredientRecord({
            hotelId: auth.hotelId,
            ...item,
            lastRestockedAt: new Date(),
          });
        }
      }

      const all = await getHotelIngredients(auth.hotelId);
      return NextResponse.json({ success: true, count: all.length, ingredients: all });
    }

    const { name, category, currentStock, unit, minAlertStock, costPerUnit, supplier, notes } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Ingredient name is required' }, { status: 400 });
    }

    const ingredient = await createIngredientRecord({
      hotelId: auth.hotelId,
      name: name.trim().slice(0, 100),
      category: category?.trim() || 'General',
      currentStock: Math.max(0, Number(currentStock) || 0),
      unit: unit?.trim() || 'kg',
      minAlertStock: Math.max(0, Number(minAlertStock) || 5),
      costPerUnit: costPerUnit !== undefined && costPerUnit !== null ? Math.max(0, Number(costPerUnit)) : null,
      supplier: supplier ? String(supplier).trim().slice(0, 100) : null,
      notes: notes ? String(notes).trim().slice(0, 300) : null,
      lastRestockedAt: Number(currentStock) > 0 ? new Date() : null,
    });

    return NextResponse.json({ success: true, ingredient });
  } catch (error: any) {
    console.error('Create ingredient error:', error);
    return NextResponse.json(
      { error: 'Failed to create ingredient', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
