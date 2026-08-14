# 🤖 Agent Instructions & Architectural Reference

When working on code in this repository:

1. **Architecture Reference**: Always read and adhere to [ARCHITECTURE.md](file:///Users/rafaolid/Desktop/Snowball-HQ/ARCHITECTURE.md) before making structural, database, or API changes.
2. **Project Structure**:
   - Backend routes: `server/routes/`
   - Business services: `server/services/`
   - Database schemas: `server/db/schema.sql`
   - Frontend views: `src/pages/`
   - Components & Modals: `src/components/`
3. **Multi-Currency Rules**: Ensure all holding and price calculations respect currency conversions and GBX (pence) vs. GBP (pound) handling as defined in `ARCHITECTURE.md`.
