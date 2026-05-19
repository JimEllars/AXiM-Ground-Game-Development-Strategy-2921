import { Response } from "express";
import { pool } from "../config/database.js";
import { AuthRequest } from "../types/index.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";

export const getSurveys = catchAsync(async (req: AuthRequest, res: Response) => {
    const user = req.user!;

    const result = await pool.query(
        "SELECT id, name, description, questions FROM custom_surveys WHERE organization_id = $1",
        [user.organization_id]
    );

    res.json(result.rows);
});

export const createSurvey = catchAsync(async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const { name, description, questions } = req.body;

    if (!name) {
        throw new AppError('Survey name is required', 400);
    }

    if (!Array.isArray(questions) || questions.length === 0) {
        throw new AppError('Questions array is required and cannot be empty', 400);
    }

    for (const q of questions) {
        if (!q.id || !q.type || !q.text) {
            throw new AppError('Each question must have an id, type, and text', 400);
        }
        if (!['text', 'multiple_choice', 'boolean'].includes(q.type)) {
            throw new AppError('Invalid question type: ' + q.type + '. Must be text, multiple_choice, or boolean', 400);
        }
        if (q.type === 'multiple_choice' && (!Array.isArray(q.options) || q.options.length === 0)) {
            throw new AppError('multiple_choice questions must include an options array with at least one option', 400);
        }
    }

    const result = await pool.query(
        "INSERT INTO custom_surveys (organization_id, name, description, questions) VALUES ($1, $2, $3, $4) RETURNING *",
        [user.organization_id, name, description || null, JSON.stringify(questions)]
    );

    res.status(201).json(result.rows[0]);
});
