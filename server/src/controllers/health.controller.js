export function getHealth(_req, res) {
  res.status(200).json({
    success: true,
    data: {
      service: 'smartpark-api',
      status: 'ok',
      timestamp: new Date().toISOString()
    }
  });
}

