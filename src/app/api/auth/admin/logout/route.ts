import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Admin logged out' });
  response.cookies.delete('admin_token');
  return response;
}
