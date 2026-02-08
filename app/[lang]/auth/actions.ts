'use server';

import { auth, signIn, signOut } from '@/lib/auth';
import { dbc } from '@/lib/db/mongo';
import bcrypt from 'bcryptjs';
import mailer from '@/lib/services/mailer';
import { passwordResetCodeEmail } from '@/lib/services/email-templates';

export async function logout() {
  await signOut();
}

export async function signOutAction(formData: FormData) {
  const lang = formData.get('lang') as string;
  await signOut({ redirectTo: `/${lang}` });
}

export async function login(email: string, password: string, provider: 'credentials' | 'external' = 'credentials') {
  try {
    await signIn(provider, {
      email: email.toLowerCase(),
      password,
      redirect: false,
    });

    // If we get here, login was successful
    return { success: true };
  } catch (error) {
    // Check error type/name for CredentialsSignin (not message content)
    if (
      error instanceof Error &&
      (error.name === 'CredentialsSignin' ||
       (error as any).type === 'CredentialsSignin')
    ) {
      return { error: 'invalid credentials' };
    }

    // CallbackRouteError wraps authorize() errors — extract the cause
    if (error instanceof Error && (error as any).type === 'CallbackRouteError') {
      const cause = (error as any).cause;
      const causeMsg = cause?.message || cause?.err?.message || '';
      console.error('Login CallbackRouteError cause:', causeMsg);

      // If the wrapped cause is CredentialsSignin, treat as invalid credentials
      if (cause?.name === 'CredentialsSignin') {
        return { error: 'invalid credentials' };
      }
    }

    // For any other type of error (LDAP, database, etc.)
    return { error: 'default error' };
  }
}

export async function getSession() {
  const session = await auth();
  return session;
}

/**
 * Request password reset - generates 6-digit code and sends via email
 * Only available for external users (non-bruss-group.com emails)
 */
export async function requestPasswordReset(email: string): Promise<{ success: boolean } | { error: string }> {
  // Only allow for non-bruss-group emails
  if (email.toLowerCase().includes('@bruss-group.com')) {
    return { error: 'bruss_email' };
  }

  try {
    const employeesCollection = await dbc('employees');
    const employee = await employeesCollection.findOne({
      email: email.toLowerCase(),
      authType: 'external',
    });

    // Always return success to not reveal if email exists
    if (!employee) {
      return { success: true };
    }

    // Generate 6-digit code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetCodeExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Hash the code before storing
    const resetCodeHash = await bcrypt.hash(resetCode, 10);

    await employeesCollection.updateOne(
      { _id: employee._id },
      {
        $set: {
          resetCodeHash,
          resetCodeExpiry,
        },
      },
    );

    // Send email with code
    const displayName = `${employee.firstName} ${employee.lastName}`;
    const emailData = passwordResetCodeEmail({
      code: resetCode,
      displayName,
      lang: 'pl',
    });
    await mailer({
      to: email,
      subject: emailData.subject,
      html: emailData.html,
    });

    return { success: true };
  } catch (error) {
    console.error('Password reset error:', error);
    return { error: 'server_error' };
  }
}

/**
 * Register external user
 * Only for non-bruss-group.com emails
 * Requires valid employee identifier from employees collection
 * Updates the employee document with auth fields instead of creating a separate user
 */
export async function registerExternalUser(data: {
  identifier: string;
  email: string;
  password: string;
}): Promise<{ success: boolean } | { error: string }> {
  const { identifier, email, password } = data;

  // Only allow for non-bruss-group emails
  if (email.toLowerCase().includes('@bruss-group.com')) {
    return { error: 'bruss_email' };
  }

  try {
    const employeesCollection = await dbc('employees');

    // Verify employee exists
    const employee = await employeesCollection.findOne({ identifier });
    if (!employee) {
      return { error: 'employee_not_found' };
    }

    // Check if email already registered to another employee
    const existingEmail = await employeesCollection.findOne({
      email: email.toLowerCase(),
      identifier: { $ne: identifier },
    });
    if (existingEmail) {
      return { error: 'email_exists' };
    }

    // Check if this employee already has auth
    if (employee.authType === 'external' && employee.passwordHash) {
      return { error: 'identifier_exists' };
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Update employee with auth fields
    await employeesCollection.updateOne(
      { identifier },
      {
        $set: {
          email: email.toLowerCase(),
          passwordHash,
          authType: 'external',
          roles: ['external-overtime-user'],
          createdAt: new Date(),
        },
      },
    );

    return { success: true };
  } catch (error) {
    console.error('Registration error:', error);
    return { error: 'server_error' };
  }
}

/**
 * Verify reset code and set new password
 */
export async function resetPassword(
  email: string,
  code: string,
  newPassword: string,
): Promise<{ success: boolean } | { error: string }> {
  try {
    const employeesCollection = await dbc('employees');
    const employee = await employeesCollection.findOne({
      email: email.toLowerCase(),
      authType: 'external',
    });

    if (!employee) {
      return { error: 'invalid_code' };
    }

    if (!employee.resetCodeHash || !employee.resetCodeExpiry) {
      return { error: 'invalid_code' };
    }

    // Check if code has expired
    if (new Date() > new Date(employee.resetCodeExpiry)) {
      return { error: 'code_expired' };
    }

    // Verify code
    const isCodeValid = await bcrypt.compare(code, employee.resetCodeHash);
    if (!isCodeValid) {
      return { error: 'invalid_code' };
    }

    // Hash new password and update
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await employeesCollection.updateOne(
      { _id: employee._id },
      {
        $set: { passwordHash },
        $unset: { resetCodeHash: '', resetCodeExpiry: '' },
      },
    );

    return { success: true };
  } catch (error) {
    console.error('Reset password error:', error);
    return { error: 'server_error' };
  }
}
