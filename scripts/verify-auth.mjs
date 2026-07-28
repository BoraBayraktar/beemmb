const candidateBaseUrls = [
  process.env.APP_URL,
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean);

let baseUrl = candidateBaseUrls[0];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function extractCookie(setCookieHeader) {
  if (!setCookieHeader) {
    return null;
  }

  return setCookieHeader.split(";")[0] || null;
}

async function login(email, password) {
  const response = await fetch(`${baseUrl}/api/identity/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  assert(response.ok, `Login failed for ${email} with status ${response.status}`);

  const cookie = extractCookie(response.headers.get("set-cookie"));
  assert(cookie, `No auth cookie received for ${email}`);

  const payload = await response.json();
  return { cookie, user: payload.user };
}

async function authFetch(path, cookie, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Cookie: cookie,
    },
  });
}

async function resolveBaseUrl() {
  for (const candidate of candidateBaseUrls) {
    try {
      const response = await fetch(`${candidate}/api/identity/me`, {
        method: "GET",
        headers: {
          Cookie: "auth=probe",
        },
      });

      if (response.status === 401 || response.status === 200 || response.status === 403) {
        return candidate;
      }
    } catch {
      // try next candidate
    }
  }

  throw new Error(`No reachable base URL found. Tried: ${candidateBaseUrls.join(", ")}`);
}

async function main() {
  baseUrl = await resolveBaseUrl();
  const { cookie, user } = await login("admin@beemmb.local", "Admin123!");
  assert(user.role === "ADMIN", `Admin login expected ADMIN role, got ${user.role}`);

  const meResponse = await authFetch("/api/identity/me", cookie);
  assert(meResponse.status === 200, `Identity me expected 200, got ${meResponse.status}`);
  const mePayload = await meResponse.json();
  assert(mePayload?.user?.email === "admin@beemmb.local", "Identity me should return the admin user");

  const loginPageResponse = await fetch(`${baseUrl}/tr/admin/login`, {
    headers: {
      Cookie: cookie,
    },
    redirect: "manual",
  });
  assert(
    loginPageResponse.status >= 300 && loginPageResponse.status < 400,
    `Authenticated admin login page expected redirect, got ${loginPageResponse.status}`,
  );
  assert(
    loginPageResponse.headers.get("location")?.includes("/tr/admin"),
    `Authenticated admin login page should redirect to /tr/admin, got ${loginPageResponse.headers.get("location")}`,
  );

  const logoutResponse = await authFetch("/api/identity/logout", cookie, {
    method: "POST",
  });
  assert(logoutResponse.ok, `Logout expected 200, got ${logoutResponse.status}`);

  const postLogoutMeResponse = await authFetch("/api/identity/me", cookie);
  assert(postLogoutMeResponse.status === 401, `Post-logout me expected 401, got ${postLogoutMeResponse.status}`);

  console.log("Auth verification passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
