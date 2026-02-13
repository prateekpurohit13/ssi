type BiometricAuthResult =
  | { ok: true }
  | { ok: false; message: string }

const BIOMETRIC_CREDENTIAL_KEY = 'nh-biometric-credential-id'

function createChallenge() {
  return crypto.getRandomValues(new Uint8Array(32))
}

function toBase64Url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  const binary = atob(padded)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

export async function authenticateWithBiometric(userHint: string): Promise<BiometricAuthResult> {
  if (typeof PublicKeyCredential === 'undefined' || !navigator.credentials) {
    return { ok: false, message: 'Biometric authentication is not supported on this browser/device.' }
  }

  try {
    let credentialId = localStorage.getItem(BIOMETRIC_CREDENTIAL_KEY)

    if (!credentialId) {
      const registration = await navigator.credentials.create({
        publicKey: {
          challenge: createChallenge(),
          rp: { name: 'NeuralHash SSI' },
          user: {
            id: new TextEncoder().encode(userHint || 'neuralhash-user'),
            name: userHint || 'user@neuralhash.local',
            displayName: 'NeuralHash User',
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },
            { type: 'public-key', alg: -257 },
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'preferred',
          },
          timeout: 60000,
          attestation: 'none',
        },
      })

      if (!(registration instanceof PublicKeyCredential)) {
        return { ok: false, message: 'Failed to initialize biometric authentication.' }
      }

      credentialId = toBase64Url(registration.rawId)
      localStorage.setItem(BIOMETRIC_CREDENTIAL_KEY, credentialId)
    }

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: createChallenge(),
        allowCredentials: [
          {
            type: 'public-key',
            id: fromBase64Url(credentialId),
          },
        ],
        userVerification: 'required',
        timeout: 60000,
      },
    })

    if (!assertion) {
      return { ok: false, message: 'Biometric authentication was cancelled.' }
    }

    return { ok: true }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'InvalidStateError') {
      localStorage.removeItem(BIOMETRIC_CREDENTIAL_KEY)
      return { ok: false, message: 'Biometric profile reset. Please retry biometric auth.' }
    }

    if (err instanceof DOMException && err.name === 'NotAllowedError') {
      return { ok: false, message: 'Biometric authentication was cancelled or timed out.' }
    }

    return { ok: false, message: 'Biometric authentication failed.' }
  }
}
