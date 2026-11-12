import { apiError } from "@/lib/api-error";

/** Any /api path without its own route, including bare /api, gets a problem document rather than the HTML 404. */
function notFound(request: Request) {
  return apiError(
    "not-found",
    `No API endpoint at ${new URL(request.url).pathname}`,
    "Read /openapi.json for supported endpoints and methods.",
    new URL(request.url).pathname + new URL(request.url).search,
  );
}

export {
  notFound as GET,
  notFound as POST,
  notFound as PUT,
  notFound as PATCH,
  notFound as DELETE,
};
