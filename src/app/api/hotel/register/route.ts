import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getHotelAuth } from '@/lib/auth';

function getTodayString(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kathmandu' }).format(new Date());
}

export async function GET(request: NextRequest) {
  try {
    const auth = getHotelAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date') || getTodayString();

    const startOfDay = new Date(`${dateStr}T00:00:00+05:45`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999+05:45`);

    // 1. Get or find register record
    let register = await prisma.dailyRegister.findUnique({
      where: {
        hotelId_date: {
          hotelId: auth.hotelId,
          date: dateStr,
        },
      },
    });

    // 2. Fetch completed active orders and settled historical sales on this date
    const doneOrders = await prisma.order.findMany({
      where: {
        hotelId: auth.hotelId,
        status: 'done',
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
      select: { totalAmount: true },
    });

    let historicalSales: Array<{ totalAmount: number }> = [];
    try {
      historicalSales = await prisma.historicalSale.findMany({
        where: {
          hotelId: auth.hotelId,
          orderDate: { gte: startOfDay, lte: endOfDay },
        },
        select: { totalAmount: true },
      });
    } catch {
      // Fallback if historicalSale not available
      historicalSales = [];
    }

    const activeSales = doneOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const settledSales = historicalSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const daySales = activeSales + settledSales;

    // 3. Fetch expenses for this date
    const dayExpenses = await prisma.expense.findMany({
      where: {
        hotelId: auth.hotelId,
        date: { gte: startOfDay, lte: endOfDay },
      },
    });

    const totalExpenses = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
    const cashExpenses = dayExpenses
      .filter((e) => e.paymentMethod === 'cash')
      .reduce((sum, e) => sum + e.amount, 0);

    const openingBalance = register?.openingBalance ?? 0;
    const income = Math.round(daySales);
    const expenses = Math.round(totalExpenses);
    const closingBalance = Math.round(openingBalance + income - expenses);

    return NextResponse.json({
      date: dateStr,
      registerId: register?.id || null,
      openingBalance,
      income,
      expenses,
      closingBalance,
      daySales: income,
      totalExpenses: expenses,
      notes: register?.notes || '',
      isClosed: register?.isClosed || false,
      closedAt: register?.closedAt || null,
    });
  } catch (error) {
    console.error('Fetch daily register error:', error);
    return NextResponse.json({ error: 'Failed to fetch register' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = getHotelAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { date, openingBalance, notes, isClosed } = body;

    const targetDate = date ? String(date).trim() : getTodayString();

    const updateData: any = {};
    if (openingBalance !== undefined) {
      updateData.openingBalance = Math.max(parseFloat(String(openingBalance)) || 0, 0);
    }
    if (notes !== undefined) {
      updateData.notes = notes ? String(notes).trim() : null;
    }
    if (typeof isClosed === 'boolean') {
      updateData.isClosed = isClosed;
      updateData.closedAt = isClosed ? new Date() : null;
    }

    const register = await prisma.dailyRegister.upsert({
      where: {
        hotelId_date: {
          hotelId: auth.hotelId,
          date: targetDate,
        },
      },
      update: updateData,
      create: {
        hotelId: auth.hotelId,
        date: targetDate,
        openingBalance: updateData.openingBalance ?? 0,
        notes: updateData.notes ?? null,
        isClosed: updateData.isClosed ?? false,
        closedAt: updateData.closedAt ?? null,
      },
    });

    // Compute live calculations
    const startOfDay = new Date(`${targetDate}T00:00:00+05:45`);
    const endOfDay = new Date(`${targetDate}T23:59:59.999+05:45`);

    const doneOrders = await prisma.order.findMany({
      where: {
        hotelId: auth.hotelId,
        status: 'done',
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
      select: { totalAmount: true },
    });

    let historicalSales: Array<{ totalAmount: number }> = [];
    try {
      historicalSales = await prisma.historicalSale.findMany({
        where: {
          hotelId: auth.hotelId,
          orderDate: { gte: startOfDay, lte: endOfDay },
        },
        select: { totalAmount: true },
      });
    } catch {
      historicalSales = [];
    }

    const activeSales = doneOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const settledSales = historicalSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const daySales = activeSales + settledSales;

    const dayExpenses = await prisma.expense.findMany({
      where: {
        hotelId: auth.hotelId,
        date: { gte: startOfDay, lte: endOfDay },
      },
    });
    const totalExpenses = dayExpenses.reduce((sum, e) => sum + e.amount, 0);

    const income = Math.round(daySales);
    const expenses = Math.round(totalExpenses);
    const closingBalance = Math.round(register.openingBalance + income - expenses);

    return NextResponse.json({
      success: true,
      register: {
        ...register,
        income,
        expenses,
        closingBalance,
      },
      openingBalance: register.openingBalance,
      income,
      expenses,
      closingBalance,
    });
  } catch (error) {
    console.error('Update daily register error:', error);
    return NextResponse.json({ error: 'Failed to save register' }, { status: 500 });
  }
}
