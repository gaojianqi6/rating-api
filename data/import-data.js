const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;

// Initialize Prisma Client
const prisma = new PrismaClient();

// Helper to format time duration
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

// Function to load and insert data from a JSON file into the database using Prisma
async function importData(fileName) {
  const startTime = Date.now();
  console.log(`Starting to import data from ${fileName}...`);

  // Read the JSON file
  let data;
  try {
    const fileContent = await fs.readFile(fileName, 'utf8');
    data = JSON.parse(fileContent);
  } catch (error) {
    console.error(`Error reading ${fileName}:`, error.message);
    throw error;
  }

  if (!Array.isArray(data)) {
    throw new Error(`${fileName} does not contain a valid array of data`);
  }

  console.log(`Loaded ${data.length} entries from ${fileName}`);

  let insertedCount = 0;
  for (let i = 0; i < data.length; i++) {
    const entry = data[i];
    try {
      // Check for duplicate slugs
      const existingItem = await prisma.item.findUnique({
        where: { slug: entry.slug },
      });
      if (existingItem) {
        console.log(`Skipping entry with duplicate slug "${entry.slug}" (title: "${entry.title}")`);
        continue;
      }

      // Start a transaction to ensure consistency
      const item = await prisma.$transaction(async (prisma) => {
        // Insert into Item table
        const newItem = await prisma.item.create({
          data: {
            templateId: entry.templateId,
            title: entry.title,
            slug: entry.slug,
            createdAt: new Date(entry.createdAt),
            updatedAt: new Date(entry.updatedAt),
            createdBy: 2, // Use a valid user ID (replace 2 with the actual user ID if different)
          },
        });

        // Insert into ItemFieldValue table
        const fieldValues = entry.fieldValues.map((field) => ({
          itemId: newItem.id,
          fieldId: field.fieldId,
          textValue: field.textValue || null,
          numericValue: field.numericValue != null ? parseFloat(field.numericValue) : null,
          jsonValue: field.jsonValue || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        console.log(`Inserted Item with ID: ${newItem.id}, title: ${entry.title}`);

        await prisma.itemFieldValue.createMany({
          data: fieldValues,
        });

        return newItem;
      });

      insertedCount++;

      if ((i + 1) % 50 === 0) {
        console.log(`Inserted ${i + 1} entries...`);
      }
    } catch (error) {
      console.error(`Error inserting entry "${entry.title}" (slug: "${entry.slug}"):`, error.message);
    }
  }

  const endTime = Date.now();
  console.log(`Finished importing ${insertedCount} entries from ${fileName}. Time taken: ${formatDuration(endTime - startTime)}`);
}

// Main function to handle command-line arguments
async function main() {
  const args = process.argv.slice(2);
  const command = args[0]?.toLowerCase();

  let fileName;
  switch (command) {
    case 'movies':
      fileName = 'movies.json';
      break;
    case 'variety-shows':
      fileName = 'variety-shows.json';
      break;
    case 'tv-series':
      fileName = 'tv-series.json';
      break;
    case 'test':
      fileName = 'test.json';
      break;
    default:
      console.log('Usage: node import-data-prisma.js [movies | variety-shows | tv-series | test]');
      console.log('Example: node import-data-prisma.js test');
      process.exit(1);
  }

  try {
    await importData(fileName);
  } catch (error) {
    console.error('Error during import:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('Prisma connection closed');
  }
}

// Run the main function
main().catch((error) => {
  console.error('Error during script execution:', error.message);
  process.exit(1);
});