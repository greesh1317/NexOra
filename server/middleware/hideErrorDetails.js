// In production, 500 responses must not leak internal error text to the browser.
// Controllers send { message, error: error.message }; this removes the `error` part
// (and logs it on the server instead). In development nothing changes.
export function hideErrorDetails(req, res, next) {
  if (process.env.NODE_ENV !== "production") return next();

  const original = res.json.bind(res);
  res.json = (body) => {
    if (body && typeof body === "object" && res.statusCode >= 500 && "error" in body) {
      console.error(`[${req.method} ${req.originalUrl}]`, body.error);
      const { error, ...safe } = body;
      return original(safe);
    }
    return original(body);
  };
  next();
}
