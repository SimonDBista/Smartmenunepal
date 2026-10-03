import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getHotelAuth } from '@/lib/auth';

async function findIngredient(id: string, hotelId: string): Promise<any | null> {
  const db = prisma as any;
  if (db.ingredient?.findFirst) {
    try {
      const res = await db.ingredient.findFirst({ where: { id, hotelId } });
      if (res) return res;
    } catch {}
  }

  const rows: any[] = await prisma.$queryRawUnsafe(
    `SELECT * FROM Ingredient WHERE id = ? AND hotelId = ? LIMIT 1`,
    id,
    hotelId
  );
  return rows[0] || null;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = getHotelAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = params.id;
    const body = await request.json();

    const existing = await findIngredient(id, auth.hotelId);
    if (!existing) {
      return NextResponse.json({ error: 'Ingredient not found' }, { status: 404 });
    }

    // Support quick relative stock adjustments (+ or -)
    if (typeof body.stockDelta === 'number') {
      const newStock = Math.max(0, Number(existing.currentStock) + body.stockDelta);
      const restockedAt = body.stockDelta > 0 ? new Date() : (existing.lastRestockedAt ? new Date(existing.lastRestockedAt) : null);
      const notes = body.reason
        ? `${existing.notes ? existing.notes + ' | ' : ''}${body.stockDelta > 0 ? '+' : ''}${body.stockDelta} ${existing.unit} (${body.reason})`
        : existing.notes;
      const now = new Date();

      const db = prisma as any;
      if (db.ingredient?.update) {
        try {
          const updated = await db.ingredient.update({
            where: { id },
            data: {
              currentStock: newStock,
              lastRestockedAt: restockedAt,
              notes,
            },
          });
          return NextResponse.json({ success: true, ingredient: updated });
        } catch {}
      }

      await prisma.$executeRawUnsafe(
        `UPDATE Ingredient SET currentStock = ?, lastRestockedAt = ?, notes = ?, updatedAt = ? WHERE id = ? AND hotelId = ?`,
        newStock,
        restockedAt ? restockedAt.toISOString() : null,
        notes,
        now.toISOString(),
        id,
        auth.hotelId
      );

      return NextResponse.json({
        success: true,
        ingredient: { ...existing, currentStock: newStock, lastRestockedAt: restockedAt, notes, updatedAt: now },
      });
    }

    // Full detail update
    const newName = body.name !== undefined ? String(body.name).trim().slice(0, 100) : existing.name;
    const newCategory = body.category !== undefined ? String(body.category).trim() : existing.category;
    const newStock = body.currentStock !== undefined ? Math.max(0, Number(body.currentStock) || 0) : existing.currentStock;
    const newUnit = body.unit !== undefined ? String(body.unit).trim() : existing.unit;
    const newMin = body.minAlertStock !== undefined ? Math.max(0, Number(body.minAlertStock) || 0) : existing.minAlertStock;
    const newCost = body.costPerUnit !== undefined ? (body.costPerUnit !== null ? Math.max(0, Number(body.costPerUnit)) : null) : existing.costPerUnit;
    const newSupplier = body.supplier !== undefined ? (body.supplier ? String(body.supplier).trim().slice(0, 100) : null) : existing.supplier;
    const newNotes = body.notes !== undefined ? (body.notes ? String(body.notes).trim().slice(0, 300) : null) : existing.notes;
    const restockedAt = newStock > existing.currentStock ? new Date() : (existing.lastRestockedAt ? new Date(existing.lastRestockedAt) : null);
    const now = new Date();

    const db = prisma as any;
    if (db.ingredient?.update) {
      try {
        const updated = await db.ingredient.update({
          where: { id },
          data: {
            name: newName,
            category: newCategory,
            currentStock: newStock,
            unit: newUnit,
            minAlertStock: newMin,
            costPerUnit: newCost,
            supplier: newSupplier,
            notes: newNotes,
            lastRestockedAt: restockedAt,
          },
        });
        return NextResponse.json({ success: true, ingredient: updated });
      } catch {}
    }

    await prisma.$executeRawUnsafe(
      `UPDATE Ingredient SET name = ?, category = ?, currentStock = ?, unit = ?, minAlertStock = ?, costPerUnit = ?, supplier = ?, notes = ?, lastRestockedAt = ?, updatedAt = ? WHERE id = ? AND hotelId = ?`,
      newName,
      newCategory,
      newStock,
      newUnit,
      newMin,
      newCost,
      newSupplier,
      newNotes,
      restockedAt ? restockedAt.toISOString() : null,
      now.toISOString(),
      id,
      auth.hotelId
    );

    return NextResponse.json({
      success: true,
      ingredient: {
        ...existing,
        name: newName,
        category: newCategory,
        currentStock: newStock,
        unit: newUnit,
        minAlertStock: newMin,
        costPerUnit: newCost,
        supplier: newSupplier,
        notes: newNotes,
        lastRestockedAt: restockedAt,
        updatedAt: now,
      },
    });
  } catch (error: any) {
    console.error('Update ingredient error:', error);
    return NextResponse.json(
      { error: 'Failed to update ingredient', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = getHotelAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = params.id;
    const existing = await findIngredient(id, auth.hotelId);
    if (!existing) {
      return NextResponse.json({ error: 'Ingredient not found' }, { status: 404 });
    }

    const db = prisma as any;
    if (db.ingredient?.delete) {
      try {
        await db.ingredient.delete({ where: { id } });
        return NextResponse.json({ success: true, message: 'Ingredient deleted successfully' });
      } catch {}
    }

    await prisma.$executeRawUnsafe(`DELETE FROM Ingredient WHERE id = ? AND hotelId = ?`, id, auth.hotelId);
    return NextResponse.json({ success: true, message: 'Ingredient deleted successfully' });
  } catch (error: any) {
    console.error('Delete ingredient error:', error);
    return NextResponse.json(
      { error: 'Failed to delete ingredient', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
