import { apiError } from "@/lib/api-error";

/** Any /api path without its own route, including bare /api, gets a problem document rather than the HTML 404. */
function notFound(request: Request) {
  return apiError(
    404,
    "ENDPOINT_NOT_FOUND",
    "API endpoint not found",
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
