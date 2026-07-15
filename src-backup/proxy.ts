import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const OLD_HOSTNAME = "chetile-tracker.vercel.app";
const NEW_HOSTNAME = "qadamtrack.vercel.app";

export function proxy(request: NextRequest) {
  const currentHostname = request.nextUrl.hostname;

  // На новом домене и localhost сайт работает как обычно.
  if (currentHostname !== OLD_HOSTNAME) {
    return NextResponse.next();
  }

  // Сохраняем текущий путь и параметры ссылки,
  // но заменяем старый домен на новый.
  const newUrl = request.nextUrl.clone();

  newUrl.protocol = "https:";
  newUrl.hostname = NEW_HOSTNAME;
  newUrl.port = "";

  return NextResponse.redirect(newUrl, 308);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};