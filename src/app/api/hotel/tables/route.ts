import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import prisma from '@/lib/prisma';
import { getHotelAuth } from '@/lib/auth';
import { getAppBaseUrl } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const auth = getHotelAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hotel = await prisma.hotel.findUnique({
      where: { id: auth.hotelId },
      select: { id: true, name: true, slug: true },
    });

    if (!hotel) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
    }

    let tables = await prisma.restaurantTable.findMany({
      where: { hotelId: hotel.id },
      orderBy: { createdAt: 'asc' },
    });

    // If hotel has zero tables configured, initialize default tables 1 to 8
    if (tables.length === 0) {
      const defaultTables = [
        { tableNumber: '1', name: 'Main Dining', capacity: 4 },
        { tableNumber: '2', name: 'Main Dining', capacity: 4 },
        { tableNumber: '3', name: 'Main Dining', capacity: 4 },
        { tableNumber: '4', name: 'Main Dining', capacity: 4 },
        { tableNumber: '5', name: 'Window Booth', capacity: 6 },
        { tableNumber: '6', name: 'Window Booth', capacity: 6 },
        { tableNumber: '7', name: 'Outdoor Terrace', capacity: 4 },
        { tableNumber: '8', name: 'Outdoor Terrace', capacity: 4 },
      ];

      for (const t of defaultTables) {
        await prisma.restaurantTable.create({
          data: {
            hotelId: hotel.id,
            tableNumber: t.tableNumber,
            name: t.name,
            capacity: t.capacity,
            isActive: true,
          },
        });
      }

      tables = await prisma.restaurantTable.findMany({
        where: { hotelId: hotel.id },
        orderBy: { createdAt: 'asc' },
      });
    }

    const baseUrl = getAppBaseUrl(request);

    // Generate individual QR codes for each table in parallel
    const tablesWithQRs = await Promise.all(
      tables.map(async (table) => {
        const targetUrl = `${baseUrl}/menu/${hotel.slug}?table=${encodeURIComponent(table.tableNumber)}&qr=1`;
        const qrDataUrl = await QRCode.toDataURL(targetUrl, {
          width: 500,
          margin: 2,
          color: {
            dark: '#0a0b0e',
            light: '#ffffff',
          },
          errorCorrectionLevel: 'H',
        });

        return {
          id: table.id,
          tableNumber: table.tableNumber,
          name: table.name,
          capacity: table.capacity,
          isActive: table.isActive,
          targetUrl,
          qrDataUrl,
          createdAt: table.createdAt,
        };
      })
    );

    return NextResponse.json({
      hotelName: hotel.name,
      hotelSlug: hotel.slug,
      tables: tablesWithQRs,
    });
  } catch (error) {
    console.error('Failed to fetch restaurant tables:', error);
    return NextResponse.json({ error: 'Failed to fetch tables' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = getHotelAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Case 1: Bulk table generation (e.g. from 1 to N, or "T-01" to "T-10", or "room1" to "room10")
    if (body.bulk) {
      const count = Math.min(Math.max(parseInt(body.count || '5', 10), 1), 50);
      const start = Math.max(parseInt(body.start || '1', 10), 1);
      const sectionName = body.sectionName ? String(body.sectionName).trim() : null;
      let prefix = body.prefix !== undefined ? String(body.prefix).trim() : '';

      // If prefix is blank but Section is Room/Rooms, default prefix to 'room'
      if (!prefix && sectionName) {
        if (/room/i.test(sectionName)) {
          prefix = 'room';
        } else {
          const lodgingTypes = ['cabana', 'cottage', 'villa', 'suite', 'vip'];
          for (const t of lodgingTypes) {
            if (sectionName.toLowerCase().includes(t)) {
              prefix = t;
              break;
            }
          }
        }
      }

      const capacity = body.capacity ? Math.max(parseInt(body.capacity, 10), 1) : 4;

      const createdList = [];
      for (let i = start; i < start + count; i++) {
        const tableNumber = prefix ? `${prefix}${i}` : `${i}`;
        const table = await prisma.restaurantTable.upsert({
          where: {
            hotelId_tableNumber: {
              hotelId: auth.hotelId,
              tableNumber,
            },
          },
          update: {
            name: sectionName || undefined,
            capacity,
            isActive: true,
          },
          create: {
            hotelId: auth.hotelId,
            tableNumber,
            name: sectionName,
            capacity,
            isActive: true,
          },
        });
        createdList.push(table);
      }

      return NextResponse.json({ success: true, count: createdList.length });
    }

    // Case 2: Single table / QR creation
    const { tableNumber, name, capacity } = body;
    if (!tableNumber || !String(tableNumber).trim()) {
      return NextResponse.json({ error: 'QR number or label is required' }, { status: 400 });
    }

    const sectionName = name ? String(name).trim() : '';
    let cleanNumber = String(tableNumber).trim();
    cleanNumber = cleanNumber.replace(/^table\s*#?/i, '').trim();
    cleanNumber = cleanNumber.replace(/^#+/, '').trim();
    cleanNumber = cleanNumber.replace(/^room\s+(\d+)/i, (_, num) => `room${num}`);

    // If Section Name specifies Room / Rooms and cleanNumber does not already start with room
    if (sectionName && /room/i.test(sectionName) && !cleanNumber.toLowerCase().startsWith('room')) {
      cleanNumber = `room${cleanNumber}`;
    } else if (sectionName) {
      const lodgingTypes = ['cabana', 'cottage', 'villa', 'suite', 'vip'];
      for (const t of lodgingTypes) {
        if (sectionName.toLowerCase().includes(t) && !cleanNumber.toLowerCase().startsWith(t)) {
          cleanNumber = `${t}${cleanNumber}`;
          break;
        }
      }
    }

    if (!cleanNumber) {
      return NextResponse.json({ error: 'Valid QR number or label is required' }, { status: 400 });
    }

    // Check if table / QR already exists in this hotel
    const existing = await prisma.restaurantTable.findUnique({
      where: {
        hotelId_tableNumber: {
          hotelId: auth.hotelId,
          tableNumber: cleanNumber,
        },
      },
    });

    if (existing) {
      const sectionInfo = existing.name ? ` in "${existing.name}"` : '';
      return NextResponse.json(
        { error: `QR "#${cleanNumber}" already exists${sectionInfo}. Table numbers and Room numbers are kept distinct per section.` },
        { status: 409 }
      );
    }

    const newTable = await prisma.restaurantTable.create({
      data: {
        hotelId: auth.hotelId,
        tableNumber: cleanNumber,
        name: name ? String(name).trim() : null,
        capacity: capacity ? Math.max(parseInt(capacity, 10), 1) : 4,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, table: newTable });
  } catch (error: any) {
    console.error('Failed to create restaurant table:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create table' },
      { status: 500 }
    );
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
      return NextResponse.json({ error: 'Table ID is required' }, { status: 400 });
    }

    // Ensure the table belongs to this hotel
    const table = await prisma.restaurantTable.findFirst({
      where: {
        id,
        hotelId: auth.hotelId,
      },
    });

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    await prisma.restaurantTable.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: `Table ${table.tableNumber} deleted.` });
  } catch (error) {
    console.error('Failed to delete table:', error);
    return NextResponse.json({ error: 'Failed to delete table' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = getHotelAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, isActive, name, capacity, tableNumber } = body;

    if (!id) {
      return NextResponse.json({ error: 'Table ID is required' }, { status: 400 });
    }

    const existing = await prisma.restaurantTable.findFirst({
      where: { id, hotelId: auth.hotelId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    const updated = await prisma.restaurantTable.update({
      where: { id },
      data: {
        isActive: typeof isActive === 'boolean' ? isActive : undefined,
        name: name !== undefined ? (name ? String(name).trim() : null) : undefined,
        capacity: capacity ? Math.max(parseInt(capacity, 10), 1) : undefined,
        tableNumber: tableNumber ? String(tableNumber).trim() : undefined,
      },
    });

    return NextResponse.json({ success: true, table: updated });
  } catch (error: any) {
    console.error('Failed to update table:', error);
    return NextResponse.json({ error: 'Failed to update table' }, { status: 500 });
  }
}
