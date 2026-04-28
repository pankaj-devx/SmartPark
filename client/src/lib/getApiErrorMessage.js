export function getApiErrorMessage(error, fallbackMessage) {
  const validationMessage = error.response?.data?.errors?.[0]?.message;
  const serverMessage = error.response?.data?.message;

  if (validationMessage) {
    return validationMessage;
  }

  if (serverMessage) {
    return serverMessage;
  }

  if (error.request) {
    return 'Cannot reach the API. Check that the backend is running and that the frontend URL is allowed by CORS.';
  }

  return fallbackMessage;
}
