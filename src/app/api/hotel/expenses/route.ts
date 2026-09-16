import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getHotelAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = getHotelAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date'); // YYYY-MM-DD
    const range = searchParams.get('range') || '7days';

    const whereClause: any = { hotelId: auth.hotelId };

    if (dateStr) {
      const start = new Date(`${dateStr}T00:00:00.000Z`);
      const end = new Date(`${dateStr}T23:59:59.999Z`);
      whereClause.date = { gte: start, lte: end };
    } else {
      const now = new Date();
      if (range === 'today') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        whereClause.date = { gte: start };
      } else if (range === '7days') {
        const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        whereClause.date = { gte: start };
      } else if (range === 'month') {
        const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        whereClause.date = { gte: start };
      }
    }

    const expenses = await prisma.expense.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
    });

    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Group by category
    const categoryMap: Record<string, number> = {};
    expenses.forEach((e) => {
      categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
    });

    const categoryBreakdown = Object.entries(categoryMap).map(([category, amount]) => ({
      category,
      amount,
      percentage: totalAmount > 0 ? Math.round((amount / totalAmount) * 100) : 0,
    })).sort((a, b) => b.amount - a.amount);

    return NextResponse.json({
      expenses,
      totalAmount,
      categoryBreakdown,
    });
  } catch (error) {
    console.error('Fetch expenses error:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = getHotelAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { category, title, amount, paymentMethod, date, notes } = body;

    if (!category || !String(category).trim()) {
      return NextResponse.json({ error: 'Expense category is required' }, { status: 400 });
    }

    if (!title || !String(title).trim()) {
      return NextResponse.json({ error: 'Expense description/title is required' }, { status: 400 });
    }

    const parsedAmount = parseFloat(String(amount));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Valid expense amount is required' }, { status: 400 });
    }

    const expenseDate = date ? new Date(date) : new Date();

    const expense = await prisma.expense.create({
      data: {
        hotelId: auth.hotelId,
        category: String(category).trim(),
        title: String(title).trim(),
        amount: parsedAmount,
        paymentMethod: paymentMethod ? String(paymentMethod).trim().toLowerCase() : 'cash',
        date: expenseDate,
        notes: notes ? String(notes).trim() : null,
      },
    });

    return NextResponse.json({ success: true, expense });
  } catch (error) {
    console.error('Create expense error:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = getHotelAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
    }

    const existing = await prisma.expense.findFirst({
      where: { id, hotelId: auth.hotelId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    await prisma.expense.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Expense deleted' });
  } catch (error) {
    console.error('Delete expense error:', error);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}
