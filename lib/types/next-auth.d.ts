import NextAuth, { DefaultSession } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session extends DefaultSession {
    user: User | undefined;
  }

  /**
   * The structure of the `user` object returned in the session and used by the `signIn` callback
   */
  interface User {
    email: string;
    roles: string[];
  }
}
