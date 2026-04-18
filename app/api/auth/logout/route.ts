import { NextResponse } from "next/server";
import {
  getNonceCookieName,
  getNonceCookieOptions,
  getSessionCookieName,
  getSessionCookieOptions,
} from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ success: true });

  response.cookies.set(getSessionCookieName(), "", {
    ...getSessionCookieOptions(),
    maxAge: 0,
  });

  response.cookies.set(getNonceCookieName(), "", {
    ...getNonceCookieOptions(),
    maxAge: 0,
  });

  return response;
}