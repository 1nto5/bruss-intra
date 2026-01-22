import bcrypt from 'bcryptjs';
import { dbc } from '@/lib/db/mongo';

import NextAuth, { User } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
const LdapClient = require('ldapjs-client');

// Helper function to fetch the latest roles for a user
async function fetchLatestUserRoles(email: string) {
  try {
    const emailLower = email.toLowerCase();

    // External users (non-bruss) - check employees collection
    if (!emailLower.includes('@bruss-group.com')) {
      const employeesCollection = await dbc('employees');
      const employee = await employeesCollection.findOne({
        email: emailLower,
        authType: 'external',
      });
      return employee?.roles || ['external-overtime-user'];
    }

    // LDAP users - check users collection
    const usersCollection = await dbc('users');
    const user = await usersCollection.findOne({ email: emailLower });
    return user ? user.roles : ['user'];
  } catch (error) {
    console.error('Error fetching latest user roles:', error);
    throw new Error('Failed to refresh user roles');
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  logger: {
    error: (code: any, ...message: any[]) => {
      // Handle CredentialsSignin errors more reliably
      if (
        code?.name === 'CredentialsSignin' ||
        code?.type === 'CredentialsSignin' ||
        code?.code === 'credentials' ||
        (typeof message[0] === 'string' &&
          message[0].includes('CredentialsSignin'))
      ) {
        // Check if this contains a system error (LDAP/DB connection issues)
        const errorStr = JSON.stringify([code, ...message]);
        if (/ldap|database|refresh|connection|timeout/i.test(errorStr)) {
          // System error - must be logged
          console.error('SYSTEM AUTH ERROR:', code, ...message);
          return;
        }
        // Generic credential failure (wrong password) - suppress
        return;
      }

      // Suppress other expected auth failures
      if (
        code?.name === 'SIGNIN_OAUTH_ERROR' ||
        code?.name === 'SIGNIN_EMAIL_ERROR'
      ) {
        return;
      }

      // Log all other errors normally
      console.error(code, ...message);
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        const { email, password } = credentials as {
          email: string;
          password: string;
        };
        const ldapClient = new LdapClient({
          url: process.env.LDAP,
        });

        try {
          await ldapClient.bind(process.env.LDAP_DN, process.env.LDAP_PASS);
        } catch (error) {
          throw new Error('authorize ldap admin error');
        }

        try {
          const options = {
            filter: `(mail=${email})`,
            scope: 'sub',
            attributes: ['dn'],
          };
          const searchResults = await ldapClient.search(
            process.env.LDAP_BASE_DN,
            options,
          );
          if (searchResults.length === 0) {
            try {
              await ldapClient.unbind();
            } catch (unbindError) {
              // Unbind error can be ignored - connection might be already closed
            }
            return null; // User not found in LDAP - silent failure
          } else {
            const userDn = searchResults[0].dn;
            try {
              await ldapClient.bind(userDn, password);
            } catch (error) {
              try {
                await ldapClient.unbind();
              } catch (unbindError) {
                // Unbind error can be ignored - connection might be already closed
              }
              return null; // Wrong password - silent failure
            }

            try {
              const usersCollection = await dbc('users');
              let user;

              try {
                user = await usersCollection.findOne({
                  email: email.toLowerCase(),
                });
              } catch (error) {
                try {
                  await ldapClient.unbind();
                } catch (unbindError) {
                  // Unbind error can be ignored - connection might be already closed
                }
                throw new Error('authorize database error: findOne failed');
              }

              if (!user) {
                try {
                  await usersCollection.insertOne({
                    email: email.toLowerCase(),
                    roles: ['user'],
                  });
                } catch (error) {
                  try {
                    await ldapClient.unbind();
                  } catch (unbindError) {
                    // Unbind error can be ignored - connection might be already closed
                  }
                  throw new Error('authorize database error: insertOne failed');
                }
                return {
                  email,
                  roles: ['user'],
                } as User;
              } else {
                return {
                  email,
                  roles: user.roles,
                } as User;
              }
            } catch (error) {
              try {
                await ldapClient.unbind();
              } catch (unbindError) {
                // Unbind error can be ignored - connection might be already closed
              }
              throw new Error('authorize database error');
            }
          }
        } catch (error) {
          try {
            await ldapClient.unbind();
          } catch (unbindError) {
            // Unbind error can be ignored - connection might be already closed
          }

          throw new Error('authorize ldap error');
        }
      },
    }),
    // External user authentication (non-LDAP users with password via employees collection)
    Credentials({
      id: 'external',
      name: 'External',
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        const { email, password } = credentials as {
          email: string;
          password: string;
        };

        try {
          const employeesCollection = await dbc('employees');
          const employee = await employeesCollection.findOne({
            email: email.toLowerCase(),
            authType: 'external',
          });

          if (!employee || !employee.passwordHash) {
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            password,
            employee.passwordHash,
          );
          if (!isPasswordValid) {
            return null;
          }

          return {
            email: employee.email,
            roles: employee.roles || ['external-overtime-user'],
            firstName: employee.firstName,
            lastName: employee.lastName,
            displayName: `${employee.firstName} ${employee.lastName}`,
            identifier: employee.identifier,
          } as User;
        } catch (error) {
          console.error('External auth error:', error);
          throw new Error('External auth error');
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.roles;
        token.rolesLastRefreshed = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      const REFRESH_INTERVAL = Number(
        process.env.SESSION_ROLES_REFRESH_INTERVAL || 1 * 60 * 60 * 1000,
      ); // 1 hour default
      const shouldRefreshRoles =
        !token.rolesLastRefreshed ||
        Date.now() - token.rolesLastRefreshed > REFRESH_INTERVAL;

      if (shouldRefreshRoles && session.user.email) {
        try {
          const latestRoles = await fetchLatestUserRoles(session.user.email);
          token.role = latestRoles;
          token.rolesLastRefreshed = Date.now();
          session.user.roles = latestRoles;
        } catch (error) {
          console.error('Failed to refresh user roles:', error);
          // Fall back to cached roles instead of crashing
          session.user.roles = token.role as string[];
        }
      } else {
        session.user.roles = token.role as string[];
      }
      return session;
    },
  },
});

// Type extensions for NextAuth
declare module 'next-auth' {
  interface User {
    roles: string[];
    rolesLastRefreshed?: Date;
  }

  interface Session {
    user: {
      roles: string[];
      email?: string | null;
    };
    error?: 'RolesRefreshError';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string[];
    rolesLastRefreshed?: number;
  }
}
