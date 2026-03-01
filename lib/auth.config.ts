import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAppRoute = nextUrl.pathname.startsWith("/dashboard") ||
        nextUrl.pathname.startsWith("/games") ||
        nextUrl.pathname.startsWith("/ticket") ||
        nextUrl.pathname.startsWith("/parlays") ||
        nextUrl.pathname.startsWith("/leaderboard") ||
        nextUrl.pathname.startsWith("/wallet");

      if (isAppRoute) {
        return isLoggedIn;
      }

      // Redirect logged-in users away from auth pages
      if (isLoggedIn && (nextUrl.pathname === "/login" || nextUrl.pathname === "/register")) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      return true;
    },
  },
  providers: [],
};
