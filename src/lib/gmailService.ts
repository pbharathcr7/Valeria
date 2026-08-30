import { initFirebase } from './firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { WeeklyDigest } from '../types';

const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
const TOKEN_STORAGE_KEY = 'mm_gmail_access_token';
const EXPIRY_STORAGE_KEY = 'mm_gmail_token_expiry';

/**
 * Retrieves a valid Gmail OAuth Access Token.
 * Prompts user with Google Sign-In popup with gmail.send scope if not already authorized.
 */
export async function getGmailAccessToken(forcePrompt = false): Promise<string> {
  if (!forcePrompt) {
    const cachedToken = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    const cachedExpiry = sessionStorage.getItem(EXPIRY_STORAGE_KEY);
    if (cachedToken && cachedExpiry) {
      const expiryTime = parseInt(cachedExpiry, 10);
      // Ensure at least 5 minutes remaining
      if (Date.now() < expiryTime - 5 * 60 * 1000) {
        return cachedToken;
      }
    }
  }

  const { auth } = await initFirebase();
  const provider = new GoogleAuthProvider();
  provider.addScope(GMAIL_SEND_SCOPE);
  provider.setCustomParameters({
    prompt: 'consent'
  });

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const token = credential?.accessToken;

  if (!token) {
    throw new Error('Could not obtain Gmail authorization from your Google account.');
  }

  // Google OAuth tokens are valid for 1 hour. Cache for 50 minutes.
  const expiry = Date.now() + 50 * 60 * 1000;
  sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  sessionStorage.setItem(EXPIRY_STORAGE_KEY, expiry.toString());

  return token;
}

/**
 * Clear cached token if expired or revoked.
 */
export function clearGmailAccessToken() {
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(EXPIRY_STORAGE_KEY);
}

/**
 * Builds an RFC 2822 compliant email string and encodes it in URL-safe base64.
 */
function createRawEmail(to: string, from: string, subject: string, htmlBody: string): string {
  const emailLines = [
    `To: ${to}`,
    `From: ${from}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    htmlBody
  ];

  const email = emailLines.join('\r\n');
  
  // URL-safe Base64 encoding
  const utf8Bytes = new TextEncoder().encode(email);
  let binary = '';
  for (let i = 0; i < utf8Bytes.byteLength; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Generates an elegant, high-contrast HTML email body styled for Valeria.
 */
export function buildWeeklyDigestHtml(digest: WeeklyDigest, recipientName?: string): string {
  const { content, weekStart, weekEnd, entryCount } = digest;
  const name = recipientName || 'Valeria User';

  const nextFocusItems = content.nextWeekFocus
    .map(f => `<li style="margin-bottom: 8px; color: #44403c; line-height: 1.5;">${f}</li>`)
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your Weekly Reflection Digest</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1c1917;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f5f5f4; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e7e5e4; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #1c1917; padding: 28px 32px; text-align: left;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 700; color: #fde68a; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 4px;">Valeria COGNITIVE DIGEST</div>
                    <div style="font-size: 22px; font-weight: 700; color: #fafaf9; font-family: Georgia, serif;">Weekly Reflection Digest</div>
                    <div style="font-size: 12px; color: #a8a29e; margin-top: 4px;">Week of ${weekStart} to ${weekEnd} • ${entryCount} Reflections</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="font-size: 14px; line-height: 1.6; color: #292524; margin: 0 0 24px 0;">
                Hello ${name}, here is your synthesized cognitive summary and mindset evolution synthesized by Gemini from this week's reflections:
              </p>

              <!-- 1. Weekly Overview -->
              <div style="background-color: #f5f5f4; border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 1px solid #e7e5e4;">
                <div style="font-size: 11px; font-weight: 700; color: #78716c; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">🧠 Weekly Overview</div>
                <div style="font-size: 14px; line-height: 1.6; color: #1c1917; font-weight: 500;">
                  ${content.weeklyOverview}
                </div>
              </div>

              <!-- 2. Wins & Challenges Grid -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                <tr>
                  <td width="48%" valign="top" style="background-color: #fefce8; border: 1px solid #fef08a; border-radius: 12px; padding: 16px;">
                    <div style="font-size: 11px; font-weight: 700; color: #854d0e; text-transform: uppercase; margin-bottom: 6px;">🏆 Biggest Win</div>
                    <div style="font-size: 13px; line-height: 1.5; color: #713f12;">
                      ${content.biggestWin}
                    </div>
                  </td>
                  <td width="4%"></td>
                  <td width="48%" valign="top" style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; padding: 16px;">
                    <div style="font-size: 11px; font-weight: 700; color: #9f1239; text-transform: uppercase; margin-bottom: 6px;">⚖️ Biggest Challenge</div>
                    <div style="font-size: 13px; line-height: 1.5; color: #881337;">
                      ${content.biggestChallenge}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- 3. Growth Insight -->
              <div style="background-color: #ecfdf5; border-radius: 12px; padding: 18px; margin-bottom: 20px; border: 1px solid #a7f3d0;">
                <div style="font-size: 11px; font-weight: 700; color: #065f46; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">📈 Growth Insight</div>
                <div style="font-size: 13px; line-height: 1.6; color: #064e3b;">
                  ${content.growthInsight}
                </div>
              </div>

              <!-- 4. Next Week Focus -->
              <div style="background-color: #ffffff; border-radius: 12px; padding: 18px; border: 1px solid #e7e5e4;">
                <div style="font-size: 11px; font-weight: 700; color: #1c1917; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px;">🧭 Focus for Next Week</div>
                <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
                  ${nextFocusItems}
                </ul>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #fafaf9; border-top: 1px solid #e7e5e4; padding: 20px 32px; text-align: center;">
              <div style="font-size: 11px; color: #78716c; line-height: 1.5;">
                Valeria AI Cognitive Reflection Journal • Built with Gemini &amp; Firebase<br>
                This digest was synthesized at your request.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Dispatches the Weekly Digest email to the user's Gmail using the official Google Gmail REST API.
 */
export async function sendWeeklyDigestEmail(digest: WeeklyDigest, userEmail: string, userName?: string): Promise<{ success: boolean; messageId: string }> {
  if (!userEmail) {
    throw new Error('No recipient email provided.');
  }

  let token: string;
  try {
    token = await getGmailAccessToken(false);
  } catch (err) {
    token = await getGmailAccessToken(true);
  }

  const subject = `Your Valeria Weekly Digest (${digest.weekStart} - ${digest.weekEnd})`;
  const htmlBody = buildWeeklyDigestHtml(digest, userName);
  const rawEmail = createRawEmail(userEmail, userEmail, subject, htmlBody);

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: rawEmail })
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      clearGmailAccessToken();
      // Retry once with re-auth
      const freshToken = await getGmailAccessToken(true);
      const retryResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${freshToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: rawEmail })
      });

      if (!retryResponse.ok) {
        const errData = await retryResponse.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `Gmail API error: ${retryResponse.statusText}`);
      }

      const retryData = await retryResponse.json();
      return { success: true, messageId: retryData.id };
    }

    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Failed to send email via Gmail: ${response.statusText}`);
  }

  const data = await response.json();
  return { success: true, messageId: data.id };
}
