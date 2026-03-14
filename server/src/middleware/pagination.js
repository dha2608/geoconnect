/**
 * Pagination middleware
 * Extracts and validates page, limit from query params.
 * Defaults: page=1, limit=20, maxLimit=100
 * Attaches req.pagination = { page, limit, skip }
 */
export const paginate = (req, res, next) => {
  const MAX_LIMIT = 100;
  const DEFAULT_LIMIT = 20;

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT));

  req.pagination = {
    page,
    limit,
    skip: (page - 1) * limit,
  };

  next();
};
