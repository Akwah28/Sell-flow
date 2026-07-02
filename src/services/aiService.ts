/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Lead, Product } from "../types";

export async function generateFollowUpMessage(lead: Lead, product?: Product): Promise<string> {
  try {
    const response = await fetch("/api/ai/followup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ lead, product }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.text || "Hello! I was just checking in to see if you are still interested in our products. Let me know if you have any questions!";
  } catch (error) {
    console.warn("Client AI Follow-Up fallback:", error);
    return "Hello! I was just checking in to see if you are still interested in our products. Let me know if you have any questions!";
  }
}

export async function getSalesInsight(leads: Lead[], orders: any[]): Promise<string> {
  try {
    const response = await fetch("/api/ai/insight", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ leads, orders }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.text || "Follow up with your most recent leads to increase conversion!";
  } catch (error) {
    console.warn("Client AI Sales Insight fallback:", error);
    return "Follow up with your most recent leads to increase conversion!";
  }
}
