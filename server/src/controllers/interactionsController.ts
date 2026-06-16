import { createInteractions as repoCreateInteractions, getInteractions as repoGetInteractions } from "../repositories/InteractionRepository.js";
import { dispatchLeadConversion } from "../services/aximService.js";
import logger from "../utils/logger.js";
import { Response } from "express";
import { pool } from "../config/database.js";
import { AuthRequest } from "../types/index.js";
import catchAsync from "../utils/catchAsync.js";

export const createInteractions = catchAsync(
  async (req: AuthRequest, res: Response) => {
const user = req.user!;
    const interactions = req.body;

    if (!Array.isArray(interactions) || interactions.length === 0) {
      return res
        .status(400)
        .json({ error: "Array of interactions is required" });
    }

    // Validate each interaction
    const validInteractions = interactions.filter((interaction) => {
      return interaction.leadId && interaction.outcome;
    });

    if (validInteractions.length === 0) {
      return res.status(400).json({ error: "No valid interactions provided" });
    }

    // Validate location coordinates to prevent SQL injection
    for (const interaction of validInteractions) {
      if (interaction.location) {
        const { longitude, latitude } = interaction.location;
        if (
          typeof longitude !== "number" ||
          typeof latitude !== "number" ||
          isNaN(longitude) ||
          isNaN(latitude)
        ) {
          return res.status(400).json({
            error:
              "Invalid location coordinates provided. Longitude and latitude must be numeric.",
          });
        }
      }
    }

    const result = await repoCreateInteractions(validInteractions, user);

    if (result.asyncMode) {
      return res.status(202).json({
        message: "Interactions sync accepted and processing in the background."
      });
    }

    // Dispatch webhook for high value dispositions
    for (const interaction of validInteractions) {
      const outcome = interaction.outcome.toLowerCase();
      if (outcome === 'appointment set' || outcome === 'sale' || outcome === 'sold' || outcome === 'completed') {
        // Find lead details locally for webhook
        const leadRes = await pool.query(`
          SELECT pii.first_name, pii.last_name, pii.email, pii.phone, pii.street_address, pii.city, pii.state, pii.zip
          FROM leads l JOIN lead_pii pii ON l.id = pii.lead_id WHERE l.id = $1`, [interaction.leadId]);

        if (leadRes.rows.length > 0) {
          const leadData = leadRes.rows[0];
          dispatchLeadConversion(leadData, interaction).catch((err: any) => {
            logger.error('Failed to dispatch webhook:', err);
          });
        }
      }
    }

    res.json({
      message: "Interactions created successfully",
      count: result.rows?.length || 0,
      interactions: (result.rows || []).map((row: any) => ({
        id: row.id,
        interactionDate: row.interaction_date,
      })),
    });
  },
);

export const getInteractions = catchAsync(
  async (req: AuthRequest, res: Response) => {
const user = req.user!;
    const result = await repoGetInteractions(req.query, user);

    if (result.asyncMode) {
      return res.status(202).json(result.data);
    }

    res.json(result.data);
  },
);
