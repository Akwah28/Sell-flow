/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";
import { Lead, Product } from "../types";

const getGeminiKey = (): string => {
  try {
    return process.env.GEMINI_API_KEY || "";
  } catch (e) {
    return "";
  }
};

export async function generateFollowUpMessage(lead: Lead, product?: Product) {
  try {
    const key = getGeminiKey();
    if (!key) {
      throw new Error("GEMINI_API_KEY not configured.");
    }
    const ai = new GoogleGenAI({ apiKey: key });
    const prompt = `
      You are mysellflow AI, a sales assistant for Nigerian WhatsApp sellers.
      Lead Name: ${lead.name}
      Product Interested in: ${product?.name || lead.interest}
      Notes: ${lead.notes}
      Status: ${lead.status}
      
      Suggest a friendly, persuasive WhatsApp follow-up message in Nigerian English (Pidgin or safe professional English).
      The goal is to move the lead to the next stage (closer to payment).
      Keep it short, use emojis, and sound human.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.warn("AI Follow-Up generative fallback:", error);
    return "Hello! I was just checking in to see if you are still interested in our products. Let me know if you have any questions!";
  }
}

export async function getSalesInsight(leads: Lead[], orders: any[]) {
  try {
    const key = getGeminiKey();
    if (!key) {
      throw new Error("GEMINI_API_KEY not configured.");
    }
    const ai = new GoogleGenAI({ apiKey: key });
    const prompt = `
      Analyze these sales stats for a Nigerian business:
      Total Leads: ${leads.length}
      Total Orders: ${orders.length}
      
      Provide one short, punchy sentence of advice or insight for the seller to improve their sales today.
      Focus on conversion or follow-up.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.warn("AI Sales Insight fallback:", error);
    return "Follow up with your most recent leads to increase conversion!";
  }
}
