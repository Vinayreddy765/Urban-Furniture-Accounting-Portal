function ok(res, data, status = 200) {
  return res.status(status).json({ success: true, data, error: null });
}

function fail(res, message, status = 400, details = null) {
  return res.status(status).json({
    success: false,
    data: null,
    error: { message, details },
  });
}

module.exports = { ok, fail };
