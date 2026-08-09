import bcrypt from "bcrypt";
import { pool } from "../config/database.js";

const requiredEnvironmentValue = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
};

const bootstrapMasterAdmin = async (): Promise<void> => {
  const organizationName =
    process.env.MASTER_ADMIN_ORGANIZATION?.trim() || "AXiM Systems";
  const email = requiredEnvironmentValue("MASTER_ADMIN_EMAIL").toLowerCase();
  const firstName = requiredEnvironmentValue("MASTER_ADMIN_FIRST_NAME");
  const lastName = requiredEnvironmentValue("MASTER_ADMIN_LAST_NAME");
  const resetPassword =
    process.env.MASTER_ADMIN_RESET_PASSWORD?.trim().toLowerCase() === "true";
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const organizationResult = await client.query(
      "SELECT id FROM organizations WHERE lower(name) = lower($1) FOR UPDATE",
      [organizationName],
    );
    const organizationId =
      organizationResult.rows[0]?.id ??
      (
        await client.query(
          "INSERT INTO organizations (name) VALUES ($1) RETURNING id",
          [organizationName],
        )
      ).rows[0].id;
    const userResult = await client.query(
      "SELECT id FROM users WHERE lower(email) = lower($1) FOR UPDATE",
      [email],
    );

    if (userResult.rows[0]) {
      const passwordHash = resetPassword
        ? await bcrypt.hash(requiredEnvironmentValue("MASTER_ADMIN_PASSWORD"), 12)
        : undefined;
      await client.query(
        `UPDATE users
         SET organization_id = $1, email = $2, first_name = $3, last_name = $4,
             role = 'ADMIN', is_active = true,
             password_hash = COALESCE($5, password_hash)
         WHERE id = $6`,
        [organizationId, email, firstName, lastName, passwordHash, userResult.rows[0].id],
      );
    } else {
      const passwordHash = await bcrypt.hash(
        requiredEnvironmentValue("MASTER_ADMIN_PASSWORD"),
        12,
      );
      await client.query(
        `INSERT INTO users (
          organization_id, email, password_hash, first_name, last_name, role
        ) VALUES ($1, $2, $3, $4, $5, 'ADMIN')`,
        [organizationId, email, passwordHash, firstName, lastName],
      );
    }

    await client.query("COMMIT");
    console.log(`Master administrator configured for ${organizationName}.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

bootstrapMasterAdmin()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error
        ? `Master administrator bootstrap failed: ${error.message}`
        : "Master administrator bootstrap failed.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
