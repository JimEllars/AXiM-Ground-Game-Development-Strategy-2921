import { Response } from "express";
import { pool } from "../config/database.js";
import { AuthRequest } from "../types/index.js";
import catchAsync from "../utils/catchAsync.js";

export const getSettings = catchAsync(async (req: AuthRequest, res: Response) => {
    const user = req.user!;

    const surveyResult = await pool.query(
        "SELECT id, name, description, questions FROM custom_surveys WHERE organization_id = $1",
        [user.organization_id]
    );

    const dispositionResult = await pool.query(
        "SELECT id, name, require_notes FROM custom_dispositions WHERE organization_id = $1",
        [user.organization_id]
    );

    res.json({
        surveys: surveyResult.rows,
        dispositions: dispositionResult.rows
    });
});

export const updateSettings = catchAsync(async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const { surveys, dispositions } = req.body;

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        if (surveys) {
            await client.query("DELETE FROM custom_surveys WHERE organization_id = $1", [user.organization_id]);
            for (const survey of surveys) {
                await client.query(
                    "INSERT INTO custom_surveys (organization_id, name, description, questions) VALUES ($1, $2, $3, $4)",
                    [user.organization_id, survey.name, survey.description, JSON.stringify(survey.questions)]
                );
            }
        }

        if (dispositions) {
            await client.query("DELETE FROM custom_dispositions WHERE organization_id = $1", [user.organization_id]);
            for (const disp of dispositions) {
                await client.query(
                    "INSERT INTO custom_dispositions (organization_id, name, require_notes) VALUES ($1, $2, $3)",
                    [user.organization_id, disp.name, disp.require_notes]
                );
            }
        }

        await client.query("COMMIT");
        res.json({ message: "Settings updated successfully" });
    } catch (e) {
        await client.query("ROLLBACK");
        throw e;
    } finally {
        client.release();
    }
});
