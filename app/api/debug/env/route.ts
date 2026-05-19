import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    PEXELS_API_KEY: !!process.env.PEXELS_API_KEY,
    PIXABAY_API_KEY: !!process.env.PIXABAY_API_KEY,
    UNSPLASH_ACCESS_KEY: !!process.env.UNSPLASH_ACCESS_KEY,
    YOUTUBE_API_KEY_MEDIA: !!process.env.YOUTUBE_API_KEY_MEDIA,
    NEXT_PUBLIC_YOUTUBE_API_KEY: !!process.env.NEXT_PUBLIC_YOUTUBE_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
  });
}
