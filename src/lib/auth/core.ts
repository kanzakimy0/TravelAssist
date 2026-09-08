import {
  isAuthSessionMissingError,
  type SupabaseClient,
} from "@supabase/supabase-js";
import type { Database } from "../../types/database.generated";
import type { AuthResult, AuthSuccess, OAuthProvider } from "./contracts";
import { authFailure } from "./errors";
import {
  safeReturnTo,
  validEmail,
  validOtp,
  validPassword,
  validPhone,
} from "./policy";

type Client = SupabaseClient<Database>;
type Input = Record<string, unknown>;

/** Reusable non-visual operations. Only Supabase Auth owns credentials/identity. */
export function createAuthCore(client: Client, callbackUrl: string) {
  const invalid = { ok: false as const, code: "invalid_input" as const };
  const success = (
    state: AuthSuccess["state"],
    input: Input,
    extra: Partial<AuthSuccess> = {},
  ): AuthResult<AuthSuccess> => ({
    ok: true,
    data: { state, returnTo: safeReturnTo(input.returnTo), ...extra },
  });

  const operations = {
    async signUp(input: Input): Promise<AuthResult<AuthSuccess>> {
      if (!validEmail(input.email)) return invalid;
      if (!validPassword(input.password))
        return { ok: false, code: "weak_password" };
      const { data, error } = await client.auth.signUp({
        email: input.email,
        password: input.password,
        options: { emailRedirectTo: callbackUrl },
      });
      if (error) return authFailure(error, "invalid_credentials");
      // Confirmation/obfuscated duplicate responses must not disclose an identity.
      return data.session && data.user
        ? success("signed_in", input, { userId: data.user.id })
        : success("verification_required", input);
    },

    async signIn(input: Input): Promise<AuthResult<AuthSuccess>> {
      if (
        !validEmail(input.email) ||
        typeof input.password !== "string" ||
        !input.password
      )
        return invalid;
      const { data, error } = await client.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });
      return error
        ? authFailure(error, "invalid_credentials")
        : success("signed_in", input, { userId: data.user.id });
    },

    async requestPhoneOtp(input: Input): Promise<AuthResult<AuthSuccess>> {
      if (!validPhone(input.phone)) return invalid;
      const { error } = await client.auth.signInWithOtp({
        phone: input.phone,
        options: { shouldCreateUser: true, channel: "sms" },
      });
      return error ? authFailure(error) : success("otp_sent", input);
    },

    async verifyPhoneOtp(input: Input): Promise<AuthResult<AuthSuccess>> {
      if (!validPhone(input.phone) || !validOtp(input.token)) return invalid;
      const { data, error } = await client.auth.verifyOtp({
        phone: input.phone,
        token: input.token,
        type: "sms",
      });
      return error
        ? authFailure(error, "invalid_otp")
        : data.user && data.session
          ? success("signed_in", input, { userId: data.user.id })
          : { ok: false, code: "invalid_otp" };
    },

    async requestEmailOtp(input: Input): Promise<AuthResult<AuthSuccess>> {
      if (!validEmail(input.email)) return invalid;
      const { error } = await client.auth.signInWithOtp({
        email: input.email,
        options: { shouldCreateUser: false, emailRedirectTo: callbackUrl },
      });
      if (error?.code === "otp_disabled" || error?.code === "signup_disabled")
        return { ok: false, code: "email_not_registered" };
      return error ? authFailure(error) : success("otp_sent", input);
    },

    async verifyEmailOtp(input: Input): Promise<AuthResult<AuthSuccess>> {
      if (!validEmail(input.email) || !validOtp(input.token)) return invalid;
      const { data, error } = await client.auth.verifyOtp({
        email: input.email,
        token: input.token,
        type: "email",
      });
      return error
        ? authFailure(error, "invalid_otp")
        : data.user && data.session
          ? success("signed_in", input, { userId: data.user.id })
          : { ok: false, code: "invalid_otp" };
    },

    async signOut(input: Input = {}): Promise<AuthResult<AuthSuccess>> {
      const { error } = await client.auth.signOut({ scope: "local" });
      return error ? authFailure(error) : success("signed_out", input);
    },

    async requestRecovery(input: Input): Promise<AuthResult<AuthSuccess>> {
      if (!validEmail(input.email)) return invalid;
      const { error } = await client.auth.resetPasswordForEmail(input.email, {
        redirectTo: callbackUrl,
      });
      return error ? authFailure(error) : success("recovery_sent", input);
    },

    async updatePassword(input: Input): Promise<AuthResult<AuthSuccess>> {
      if (!validPassword(input.password))
        return { ok: false, code: "weak_password" };
      // This is a core session operation, not an account-settings reauth framework.
      const { data: verified, error: verificationError } =
        await client.auth.getUser();
      if (verificationError)
        return isAuthSessionMissingError(verificationError)
          ? { ok: false, code: "unauthenticated" }
          : authFailure(verificationError);
      if (!verified.user) return { ok: false, code: "unauthenticated" };
      const { error } = await client.auth.updateUser({
        password: input.password,
      });
      return error ? authFailure(error) : success("password_updated", input);
    },

    async startOAuth(input: Input): Promise<AuthResult<AuthSuccess>> {
      if (input.provider !== "google" && input.provider !== "apple")
        return invalid;
      const provider: OAuthProvider = input.provider;
      const { data, error } = await client.auth.signInWithOAuth({
        provider,
        options: { redirectTo: callbackUrl, skipBrowserRedirect: true },
      });
      return error || !data.url
        ? authFailure(error, "provider_unavailable")
        : success("oauth_redirect", input, { url: data.url });
    },

    async completeCallback(
      code: unknown,
      returnTo: unknown,
    ): Promise<AuthResult<AuthSuccess>> {
      if (typeof code !== "string" || !code || code.length > 4096)
        return { ok: false, code: "callback_failed" };
      const { data, error } = await client.auth.exchangeCodeForSession(code);
      return error || !data.user || !data.session
        ? { ok: false, code: "callback_failed" }
        : success("signed_in", { returnTo }, { userId: data.user.id });
    },
  };

  // SDK transport failures also follow the public result contract. No caller
  // receives a raw exception that could include a credential-bearing request.
  function safe<T extends unknown[]>(
    operation: (...args: T) => Promise<AuthResult<AuthSuccess>>,
  ) {
    return async (...args: T): Promise<AuthResult<AuthSuccess>> => {
      try {
        return await operation(...args);
      } catch (error) {
        return authFailure(error);
      }
    };
  }
  return {
    signUp: safe(operations.signUp),
    signIn: safe(operations.signIn),
    requestPhoneOtp: safe(operations.requestPhoneOtp),
    verifyPhoneOtp: safe(operations.verifyPhoneOtp),
    requestEmailOtp: safe(operations.requestEmailOtp),
    verifyEmailOtp: safe(operations.verifyEmailOtp),
    signOut: safe(operations.signOut),
    requestRecovery: safe(operations.requestRecovery),
    updatePassword: safe(operations.updatePassword),
    startOAuth: safe(operations.startOAuth),
    completeCallback: safe(operations.completeCallback),
  };
}
