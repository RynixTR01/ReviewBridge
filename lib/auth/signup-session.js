export async function ensureVerifiedSignupSession(authClient, { email, password }) {
  let activeEmail;

  try {
    const sessionResult = await authClient.getSession();
    activeEmail = sessionResult.data?.session?.user?.email || sessionResult.data?.user?.email;
  } catch {
    // A missing session is handled by the verified account's email/password sign-in.
  }

  if (
    typeof activeEmail === "string" &&
    activeEmail.trim().toLowerCase() === String(email ?? "").trim().toLowerCase()
  ) {
    return { error: null };
  }

  try {
    const result = await authClient.signIn.email({ email, password });
    return { error: result?.error || null };
  } catch (error) {
    return { error };
  }
}
