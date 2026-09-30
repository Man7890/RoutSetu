import { PrismaClient } from "@prisma/client";
import { SEED_DESTINATIONS } from "../shared/seed.ts";
import { toDb } from "../server/lib/repo.ts";

const db = new PrismaClient();

async function main() {
  await db.simulationEvent.deleteMany();
  await db.crowdSnapshot.deleteMany();
  for (const d of SEED_DESTINATIONS) {
    const data = toDb(d);
    await db.destination.upsert({ where: { id: d.id }, create: data, update: data });
    await db.crowdSnapshot.create({
      data: {
        destinationId: d.id,
        visitorCount: d.currentVisitors,
        crowdScore: d.crowdScore,
        capacityUtilization: d.currentVisitors / d.capacity,
        source: "SIMULATION",
      },
    });
  }
  // A few earlier simulated balancing events so the command center isn't empty on first load.
  const hour = 60 * 60 * 1000;
  const demo = [
    { destinationId: "tirathgarh-falls", previousCrowdScore: 73, newCrowdScore: 92, alternativeId: "chitradhara-falls", visitorsRedistributed: 214, co2AvoidedKg: 38.4, pressureReducedPct: 19, ago: 5 },
    { destinationId: "kutumsar-caves", previousCrowdScore: 68, newCrowdScore: 95, alternativeId: "kailash-gufa", visitorsRedistributed: 72, co2AvoidedKg: 14.2, pressureReducedPct: 24, ago: 3 },
    { destinationId: "danteshwari-temple", previousCrowdScore: 71, newCrowdScore: 93, alternativeId: "barsur-temples", visitorsRedistributed: 152, co2AvoidedKg: 33.4, pressureReducedPct: 16, ago: 1.5 },
  ];
  for (const { ago, ...e } of demo) {
    await db.simulationEvent.create({ data: { ...e, triggerType: "SEEDED_DEMO", createdAt: new Date(Date.now() - ago * hour) } });
  }
  console.log(`Seeded ${SEED_DESTINATIONS.length} destinations and ${demo.length} demo simulation events.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
