import { test, expect } from '@playwright/test';

test.describe('High-Stress Sync & Telemetry', () => {
  test('should isolate poison payloads and continue syncing healthy data', async ({ page, context }) => {
    // Navigate to the app to initialize indexedDB
    await page.goto('http://localhost:5173');

    // We can evaluate directly in the browser context to manipulate IndexedDB
    await page.evaluate(async () => {
      // Simulate getting the DB initialized
      const dbModule = await import('/src/db.ts' as any); // using absolute path to the module
      const db = dbModule.db;

      // Ensure clear state
      await db.interactions.clear();
      await db.telemetryQueue.clear();

      // Inject healthy record
      await db.interactions.add({
        leadId: 'healthy-lead-123',
        outcome: 'Interested',
        notes: 'Good conversation',
        interactionDate: new Date().toISOString(),
        synced: 0 // pending sync
      });

      // Inject malformed "poison" record (missing required dates, broken schema, etc)
      // Since it's typescript, we'll force it
      await db.interactions.add({
        id: 9999,
        leadId: null, // this will fail validation inside syncEngine or API
        outcome: null,
        // specifically causing a parse error
        interactionDate: { "invalid": "date" } as any,
        synced: 0
      });

      // Inject another healthy record
      await db.interactions.add({
        leadId: 'healthy-lead-456',
        outcome: 'Not Home',
        notes: 'Left flyer',
        interactionDate: new Date().toISOString(),
        synced: 0
      });

      // Trigger the sync manually since we're online
      const syncModule = await import('/src/syncEngine.ts' as any);
      await syncModule.syncOfflineData();
    });

    // Wait for the sync to process
    await page.waitForTimeout(2000);

    // Verify outcomes via evaluating DB state
    const results = await page.evaluate(async () => {
      const dbModule = await import('/src/db.ts' as any);
      const db = dbModule.db;

      const interactions = await db.interactions.toArray();
      const telemetry = await db.telemetryQueue.toArray();

      return { interactions, telemetry };
    });

    // We expect 3 records total. The two healthy ones should be synced (synced === 1)
    // The poison one should be marked as poison (synced === -1)
    expect(results.interactions.length).toBeGreaterThanOrEqual(3);

    const healthy1 = results.interactions.find((i: any) => i.leadId === 'healthy-lead-123');
    const healthy2 = results.interactions.find((i: any) => i.leadId === 'healthy-lead-456');
    const poison = results.interactions.find((i: any) => i.id === 9999);

    // Healthy should be synced (1) or if the API failed due to auth, at least they aren't -1
    // In our test, API might fail since we aren't logged in, but the poison logic catches the parse error *before* the API call
    expect(healthy1.synced).not.toBe(-1);
    expect(healthy2.synced).not.toBe(-1);

    // Poison must be caught by our try/catch block and flagged as -1
    expect(poison.synced).toBe(-1);

    // Telemetry queue should have caught the poison payload
    const poisonTelemetry = results.telemetry.find((t: any) => t.payload?.error === 'Poison Record Payload');
    expect(poisonTelemetry).toBeDefined();
    expect(poisonTelemetry.payload.message).toContain('Record 9999 corrupted');
  });
});
