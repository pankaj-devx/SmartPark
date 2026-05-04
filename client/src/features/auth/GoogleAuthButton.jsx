import { GoogleLogin } from '@react-oauth/google';
import { apiClient } from '../../lib/apiClient.js';
import { getApiErrorMessage } from '../../lib/getApiErrorMessage.js';
import { useAuth } from './useAuth.js';

/**
 * Renders the Google "Sign in with Google" button.
 *
 * On success it sends the credential to POST /api/auth/google,
 * stores the returned JWT exactly like a normal login, then calls
 * onSuccess(authData) so the parent can redirect or close a modal.
 *
 * @param {{ onSuccess: (authData: object) => void, onError?: (msg: string) => void }} props
 */
export function GoogleAuthButton({ onSuccess, onError }) {
  const { login } = useAuth();

  async function handleCredentialResponse(credentialResponse) {
    try {
      const response = await apiClient.post('/auth/google', {
        credential: credentialResponse.credential
      });
      const authData = response.data.data;
      login(authData);
      onSuccess?.(authData);
    } catch (apiError) {
      const message = getApiErrorMessage(apiError, 'Google sign-in failed. Please try again.');
      onError?.(message);
    }
  }

  return (
    <div className="flex justify-center">
      <GoogleLogin
        onSuccess={handleCredentialResponse}
        onError={() => onError?.('Google sign-in failed. Please try again.')}
        useOneTap={false}
        shape="rectangular"
        theme="outline"
        size="large"
        width="100%"
      />
    </div>
  );
}
