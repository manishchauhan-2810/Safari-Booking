import ApiError from "./ApiError.js";

const validate = (schema, source) => (req, _res, next) => {
  const input = source ? req[source] : req.method === "GET" ? req.query : req.body;
  const result = schema.safeParse(input);

  if (!result.success) {
    const issues = result.error.issues.map((i) => ({ field: i.path.join("."), message: i.message }));
    const first = issues[0];
    const message = first ? (first.field ? `${first.field}: ${first.message}` : first.message) : "Validation failed";
    return next(new ApiError(400, message, issues));
  }

  req.validated = { ...(req.validated || {}), ...result.data };
  next();
};

export default validate;