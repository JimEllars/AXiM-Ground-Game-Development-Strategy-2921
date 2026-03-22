import { Response } from "express";
import { pool } from "../config/database.js";
import { AuthRequest } from "../types/index.js";
import { teamSchema } from "../utils/validationSchemas.js";
import catchAsync from "../utils/catchAsync.js";

export const getTeams = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = req.user!;

  // Get all teams for the organization
  const result = await pool.query(
    `SELECT
        t.id, t.name, t.description, t.created_at, t.updated_at,
        (SELECT COUNT(*) FROM users u WHERE u.team_id = t.id) as member_count
      FROM teams t
      WHERE t.organization_id = $1
      ORDER BY t.name ASC`,
    [user.organization_id],
  );

  const teams = result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    memberCount: parseInt(row.member_count),
  }));

  res.json(teams);
});

export const createTeam = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const validation = teamSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ error: validation.error.flatten() });
    }

    const { name, description } = validation.data;

    const result = await pool.query(
      `INSERT INTO teams (organization_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [user.organization_id, name, description],
    );

    const newTeam = result.rows[0];

    res.status(201).json({
      id: newTeam.id,
      name: newTeam.name,
      description: newTeam.description,
      createdAt: newTeam.created_at,
      updatedAt: newTeam.updated_at,
      memberCount: 0,
    });
  },
);

export const updateTeam = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const { id } = req.params;
    const validation = teamSchema.partial().safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ error: validation.error.flatten() });
    }

    const { name, description } = validation.data;

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      params.push(name);
      paramIndex++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      params.push(description);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const teamIdParamIndex = paramIndex++;
    params.push(id);

    const orgIdParamIndex = paramIndex++;
    params.push(user.organization_id);

    const result = await pool.query(
      `UPDATE teams
       SET ${updates.join(", ")}
       WHERE id = $${teamIdParamIndex} AND organization_id = $${orgIdParamIndex}
       RETURNING *, (SELECT COUNT(*) FROM users WHERE team_id = teams.id) as member_count`,
      params,
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Team not found" });
    }

    const updatedTeam = result.rows[0];

    res.json({
      id: updatedTeam.id,
      name: updatedTeam.name,
      description: updatedTeam.description,
      createdAt: updatedTeam.created_at,
      updatedAt: updatedTeam.updated_at,
      memberCount: parseInt(updatedTeam.member_count),
    });
  },
);

export const deleteTeam = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const { id } = req.params;

    // Check ownership
    const result = await pool.query(
      "DELETE FROM teams WHERE id = $1 AND organization_id = $2 RETURNING id",
      [id, user.organization_id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Team not found" });
    }

    // Users who were in this team will have team_id set to NULL automatically due to ON DELETE SET NULL

    res.json({ message: "Team deleted successfully" });
  },
);

export const assignUserToTeam = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const currentUser = req.user!;
    const { id } = req.params; // teamId
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Verify team belongs to organization
    const teamCheck = await pool.query(
      "SELECT id FROM teams WHERE id = $1 AND organization_id = $2",
      [id, currentUser.organization_id],
    );

    if (teamCheck.rows.length === 0) {
      return res.status(404).json({ error: "Team not found" });
    }

    // Verify target user belongs to organization
    const userCheck = await pool.query(
      "SELECT id FROM users WHERE id = $1 AND organization_id = $2",
      [userId, currentUser.organization_id],
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update user
    await pool.query("UPDATE users SET team_id = $1 WHERE id = $2", [
      id,
      userId,
    ]);

    res.json({ message: "User assigned to team successfully" });
  },
);
