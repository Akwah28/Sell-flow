/**
 * Service to handle direct WhatsApp messaging via backend API
 */

export interface WhatsAppResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export async function sendWhatsAppMessage(
  to: string, 
  message: string, 
  credentials?: { token?: string, phoneId?: string }
): Promise<WhatsAppResponse> {
  try {
    const response = await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        to, 
        message, 
        token: credentials?.token, 
        phoneId: credentials?.phoneId 
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Extract specific error message if available
      const errorMessage = data.error?.message || data.error || "Failed to send message";
      return { success: false, error: errorMessage };
    }

    return { success: true, data };
  } catch (error) {
    console.error("WhatsApp Service Error:", error);
    return { success: false, error: "Network error while sending WhatsApp message" };
  }
}
