const DEFAULT_TRIPS = {
  trips: [],
  tombstones: [],
  rev: 0,
};

const ALLOWED_ORIGINS = new Set([
  "https://cmr2334.github.io",
  "http://127.0.0.1:8749",
  "http://localhost:8749",
]);

const LOGO_NAME_RE = /^[a-z0-9-]+\.(png|jpg|jpeg|webp|svg)$/;
const TRIP_ID_RE = /^[a-z0-9]+$/;
const SCREENSHOT_NUMBER_RE = /^[0-9]$/;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function corsHeaders(request) {
  const headers = new Headers({
    "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    Vary: "Origin",
  });

  const origin = request.headers.get("Origin");
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }

  return headers;
}

function response(request, body, init = {}) {
  const headers = new Headers(init.headers);
  for (const [name, value] of corsHeaders(request)) {
    headers.set(name, value);
  }

  return new Response(body, {
    ...init,
    headers,
  });
}

function jsonResponse(request, payload, status = 200) {
  return response(request, JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function decodePathSegments(pathname) {
  return pathname.split("/").slice(1).map((segment) => {
    try {
      return decodeURIComponent(segment);
    } catch {
      throw new HttpError(400, "Invalid URL path");
    }
  });
}

function isAuthorized(request, env) {
  const token = typeof env.SYNC_TOKEN === "string" ? env.SYNC_TOKEN : "";
  return (
    token.length > 0 &&
    request.headers.get("Authorization") === `Bearer ${token}`
  );
}

function requireValidTripId(tripId) {
  if (!TRIP_ID_RE.test(tripId)) {
    throw new HttpError(400, "Invalid tripId");
  }
}

function requireValidScreenshotNumber(number) {
  if (!SCREENSHOT_NUMBER_RE.test(number)) {
    throw new HttpError(400, "Invalid screenshot number");
  }
}

async function getTrips(request, env) {
  const object = await env.GT_BUCKET.get("trips.json");
  if (!object) {
    return jsonResponse(request, DEFAULT_TRIPS);
  }

  return response(request, object.body, {
    status: 200,
    headers: {
      "Content-Type":
        object.httpMetadata?.contentType || "application/json; charset=utf-8",
    },
  });
}

async function putTrips(request, env) {
  const body = await request.arrayBuffer();
  let parsed;

  try {
    parsed = JSON.parse(new TextDecoder().decode(body));
  } catch {
    throw new HttpError(400, "Request body must be valid JSON");
  }

  if (
    !parsed ||
    !Array.isArray(parsed.trips) ||
    !Array.isArray(parsed.tombstones) ||
    typeof parsed.rev !== "number" ||
    !Number.isFinite(parsed.rev)
  ) {
    throw new HttpError(
      400,
      "Request body must contain trips, tombstones, and a numeric rev",
    );
  }

  await env.GT_BUCKET.put("trips.json", body, {
    httpMetadata: {
      contentType: "application/json; charset=utf-8",
    },
  });

  return jsonResponse(request, { ok: true });
}

async function getLogo(request, env, name) {
  if (!LOGO_NAME_RE.test(name)) {
    throw new HttpError(400, "Invalid logo name");
  }

  const object = await env.GT_BUCKET.get(`logos/${name}`);
  if (!object) {
    return jsonResponse(request, { error: "Not found" }, 404);
  }

  return response(request, object.body, {
    status: 200,
    headers: {
      "Content-Type":
        object.httpMetadata?.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

async function putScreenshot(request, env, tripId, number) {
  requireValidTripId(tripId);
  requireValidScreenshotNumber(number);

  const contentType = request.headers.get("Content-Type") || "image/jpeg";
  const body = await request.arrayBuffer();

  await env.GT_BUCKET.put(`screenshots/${tripId}/${number}`, body, {
    httpMetadata: {
      contentType,
    },
  });

  return jsonResponse(request, { ok: true });
}

async function getScreenshot(request, env, tripId, number) {
  requireValidTripId(tripId);
  requireValidScreenshotNumber(number);

  const object = await env.GT_BUCKET.get(`screenshots/${tripId}/${number}`);
  if (!object) {
    return jsonResponse(request, { error: "Not found" }, 404);
  }

  return response(request, object.body, {
    status: 200,
    headers: {
      "Content-Type":
        object.httpMetadata?.contentType || "application/octet-stream",
    },
  });
}

async function deleteScreenshots(request, env, tripId) {
  requireValidTripId(tripId);

  const prefix = `screenshots/${tripId}/`;
  const keysToDelete = [];
  let cursor;

  while (true) {
    const options = { prefix };
    if (cursor) {
      options.cursor = cursor;
    }

    const page = await env.GT_BUCKET.list(options);
    keysToDelete.push(...page.objects.map((object) => object.key));

    if (!page.truncated) {
      break;
    }

    cursor = page.cursor;
    if (!cursor) {
      break;
    }
  }

  for (let index = 0; index < keysToDelete.length; index += 1000) {
    await env.GT_BUCKET.delete(keysToDelete.slice(index, index + 1000));
  }

  return jsonResponse(request, { ok: true });
}

async function route(request, env, url) {
  const segments = decodePathSegments(url.pathname);
  const method = request.method;

  if (segments.length === 1 && segments[0] === "trips") {
    if (method === "GET") {
      return getTrips(request, env);
    }
    if (method === "PUT") {
      return putTrips(request, env);
    }
  }

  if (segments.length === 2 && segments[0] === "logos" && method === "GET") {
    return getLogo(request, env, segments[1]);
  }

  if (segments.length === 3 && segments[0] === "screenshots") {
    if (method === "PUT") {
      return putScreenshot(request, env, segments[1], segments[2]);
    }
    if (method === "GET") {
      return getScreenshot(request, env, segments[1], segments[2]);
    }
  }

  if (
    segments.length === 2 &&
    segments[0] === "screenshots" &&
    method === "DELETE"
  ) {
    return deleteScreenshots(request, env, segments[1]);
  }

  return jsonResponse(request, { error: "Not found" }, 404);
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      if (request.method === "OPTIONS") {
        return response(request, null, { status: 204 });
      }

      const isPublicLogo =
        request.method === "GET" && url.pathname.startsWith("/logos/");
      if (!isPublicLogo && !isAuthorized(request, env)) {
        return jsonResponse(request, { error: "Unauthorized" }, 401);
      }

      return await route(request, env, url);
    } catch (error) {
      if (error instanceof HttpError) {
        return jsonResponse(request, { error: error.message }, error.status);
      }

      const message =
        error instanceof Error && error.message
          ? error.message
          : "Internal Server Error";
      return jsonResponse(request, { error: message }, 500);
    }
  },
};
