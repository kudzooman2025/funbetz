import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;

      // Guests can browse the app — dashboard, schedules and the leaderboard
      // are open so someone can look around before signing up. Anything that
      // touches a wallet or an actual bet still requires an account.
      const requiresAccount =
        nextUrl.pathname.startsWith("/ticket") ||
        nextUrl.pathname.startsWith("/parlays") ||
        nextUrl.pathname.startsWith("/wallet") ||
        nextUrl.pathname.startsWith("/eacf") ||
        nextUrl.pathname.startsWith("/admin");

      if (requiresAccount) {
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
