const axios = require('axios');
const fs = require('fs').promises;
const slugify = require('slugify');

// Open Library API Configuration
const OPEN_LIBRARY_BASE_URL = 'https://openlibrary.org';
const REQUEST_DELAY_MS = 250; // Delay between API requests to avoid rate limiting

// Countries and Languages from your datasource
const countries = [
  'USA', 'South Korea', 'Japan', 'Thailand', 'France', 'Germany', 'Russia', 'Sweden', 'Brazil', 'India',
  'Canada', 'Ireland', 'Australia', 'United Kingdom', 'China', 'Mexico', 'Spain', 'Italy', 'Nigeria', 'South Africa', 'New Zealand'
];

// Book genres from book_type (dataSourceId: 4)
const bookGenres = [
  'Literature', 'Business', 'Mystery', 'Chinese Medicine Literature', 'Children\'s Literature', 'Popular Science',
  'Comics', 'Youth', 'Science Fiction', 'Romance', 'Crossing', 'Urban', 'Fantasy', 'Martial Arts', 'History',
  'Biography', 'Suspense', 'Thriller', 'Workplace', 'Entrepreneurship', 'Programming'
];

// Map book genres to Open Library subjects
const openLibrarySubjectMap = {
  'Literature': 'literature',
  'Business': 'business',
  'Mystery': 'mystery',
  'Chinese Medicine Literature': 'chinese medicine literature',
  'Children\'s Literature': 'juvenile literature',
  'Popular Science': 'popular science',
  'Comics': 'comics',
  'Youth': 'young adult',
  'Science Fiction': 'science fiction',
  'Romance': 'romance',
  'Crossing': 'time travel', // Assuming "Crossing" means time travel
  'Urban': 'urban fiction',
  'Fantasy': 'fantasy',
  'Martial Arts': 'martial arts',
  'History': 'history',
  'Biography': 'biography',
  'Suspense': 'suspense',
  'Thriller': 'thriller',
  'Workplace': 'workplace fiction',
  'Entrepreneurship': 'entrepreneurship',
  'Programming': 'programming'
};

const languages = [
  'Mandarin', 'English', 'Cantonese', 'Korean', 'Japanese', 'Thai', 'French', 'German', 'Russian', 'Swedish',
  'Portuguese', 'Hindi', 'Irish'
];

// Open Library language codes to your languages
const languageCodeMap = {
  'zh': 'Mandarin',
  'en': 'English',
  'cn': 'Cantonese',
  'ko': 'Korean',
  'ja': 'Japanese',
  'th': 'Thai',
  'fr': 'French',
  'de': 'German',
  'ru': 'Russian',
  'sv': 'Swedish',
  'pt': 'Portuguese',
  'hi': 'Hindi',
  'ga': 'Irish'
};

const contentRatings = ['G', 'PG', 'PG-13', 'R', 'NC-17'];

// Helper to fetch Open Library data with logging and delay
async function fetchOpenLibraryData(params) {
  console.log(`Fetching data from Open Library with params: ${JSON.stringify(params)}`);
  try {
    const response = await axios.get(`${OPEN_LIBRARY_BASE_URL}/search.json`, { params });
    await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS)); // Rate limiting delay
    return response.data;
  } catch (error) {
    console.error(`Error fetching from Open Library: ${error.message}`);
    return { docs: [] };
  }
}

// Helper to get random element from array
const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Helper to map Open Library languages to your languages
function mapLanguages(openLibraryLanguages) {
  if (!openLibraryLanguages || openLibraryLanguages.length === 0) {
    return [getRandom(languages)];
  }
  const primaryLanguage = openLibraryLanguages[0];
  const mappedLanguage = languageCodeMap[primaryLanguage] || getRandom(languages);
  return [mappedLanguage];
}

// Helper to map Open Library subjects to your genres
function mapGenres(subjects, availableGenres) {
  const genres = [];
  if (subjects) {
    for (const subject of subjects) {
      const matchingGenre = Object.keys(openLibrarySubjectMap).find(
        (key) => openLibrarySubjectMap[key].toLowerCase() === subject.toLowerCase()
      );
      if (matchingGenre && availableGenres.includes(matchingGenre)) {
        genres.push(matchingGenre);
      }
    }
  }
  return genres.length > 0 ? genres : [getRandom(availableGenres)]; // Fallback to random genre
}

// Helper to infer country from language or randomly assign
function mapCountryFromLanguage(languages) {
  const language = languages[0];
  if (language === 'Mandarin' || language === 'Cantonese') return 'China';
  if (language === 'English') return getRandom(['USA', 'United Kingdom', 'Australia', 'Canada']);
  if (language === 'Korean') return 'South Korea';
  if (language === 'Japanese') return 'Japan';
  if (language === 'Thai') return 'Thailand';
  if (language === 'French') return 'France';
  if (language === 'German') return 'Germany';
  if (language === 'Russian') return 'Russia';
  if (language === 'Swedish') return 'Sweden';
  if (language === 'Portuguese') return 'Brazil';
  if (language === 'Hindi') return 'India';
  if (language === 'Irish') return 'Ireland';
  return getRandom(countries);
}

// Helper to format time duration
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

// Function to seed Books (200 entries)
async function seedBooks() {
  const startTime = Date.now();
  console.log('Starting to fetch Books...');
  const bookData = [];
  const seenTitles = new Set();
  const slugCounts = {};
  let bookCounter = 1;

  // Ensure at least 5 per genre (21 genres × 5 = 105 entries)
  for (const genre of bookGenres) {
    const subject = openLibrarySubjectMap[genre] || 'literature';
    for (let i = 0; i < 5; i++) {
      const page = Math.floor(bookCounter / 10) + 1; // Open Library returns up to 10 results per page by default
      const books = await fetchOpenLibraryData({
        q: `subject:${subject}`,
        page,
        limit: 10,
        sort: 'rating desc', // Sort by rating to get popular books
      });

      if (books.docs.length === 0) {
        console.log(`No books found for genre ${genre}, page ${page}. Skipping...`);
        continue;
      }

      // Find the first unseen book
      let book = null;
      for (const result of books.docs) {
        if (!seenTitles.has(result.title)) {
          book = result;
          break;
        }
      }

      if (!book) {
        console.log(`All books on page ${page} for genre ${genre} are duplicates. Skipping...`);
        continue;
      }

      const languages = mapLanguages(book.language);
      const genres = mapGenres(book.subject, bookGenres);
      const country = mapCountryFromLanguage(languages);
      const publicationYear = book.first_publish_year || 2020;
      const publisher = book.publisher?.[0] || 'Unknown Publisher';
      const isbn = book.isbn?.[0] || 'Unknown ISBN';
      const synopsis = book.first_sentence?.[0] || 'No synopsis available.';
      const contentRating = getRandom(contentRatings);
      const pageCount = book.number_of_pages_median || 300;
      const format = book.has_fulltext ? 'E-book' : 'Book';
      const sourceUrl = book.key ? `https://openlibrary.org${book.key}` : '';

      const title = book.title;
      seenTitles.add(title);
      let slug = slugify(`${title}`, { lower: true, strict: true });
      slugCounts[slug] = (slugCounts[slug] || 0) + 1;
      if (slugCounts[slug] > 1) {
        slug = `${slug}-${slugCounts[slug]}`; // Append counter for unique slugs
      }

      const bookEntry = {
        templateId: 4, // Book template
        title,
        slug,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fieldValues: [
          { fieldId: 45, textValue: title }, // title
          { fieldId: 46, textValue: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : '' }, // cover_image
          { fieldId: 47, textValue: book.author_name?.join(', ') || 'Unknown Author' }, // author
          { fieldId: 48, numericValue: publicationYear }, // publication_year
          { fieldId: 49, textValue: publisher }, // publisher
          { fieldId: 50, textValue: isbn }, // isbn
          { fieldId: 51, jsonValue: languages }, // language
          { fieldId: 52, jsonValue: genres }, // genre
          { fieldId: 53, textValue: country }, // country
          { fieldId: 54, textValue: synopsis }, // synopsis
          { fieldId: 55, textValue: contentRating }, // content_rating
          { fieldId: 56, numericValue: pageCount }, // page_count
          { fieldId: 57, textValue: format }, // format
          { fieldId: 58, textValue: sourceUrl }, // source_url
        ],
      };
      bookData.push(bookEntry);
      bookCounter++;

      if (bookCounter % 50 === 0) {
        console.log(`Processed ${bookCounter} books...`);
      }
    }
  }

  // Add remaining books to reach 200 (200 - 105 = 95 more)
  for (let i = 0; i < 95; i++) {
    const page = Math.floor(i / 10) + 1;
    const books = await fetchOpenLibraryData({
      q: 'subject:*', // Broad search to get more books
      page,
      limit: 10,
      sort: 'rating desc',
    });

    if (books.docs.length === 0) {
      console.log(`No books found on page ${page}. Skipping...`);
      continue;
    }

    let book = null;
    for (const result of books.docs) {
      if (!seenTitles.has(result.title)) {
        book = result;
        break;
      }
    }

    if (!book) {
      console.log(`All books on page ${page} are duplicates. Skipping...`);
      continue;
    }

    const languages = mapLanguages(book.language);
    const genres = mapGenres(book.subject, bookGenres);
    const country = mapCountryFromLanguage(languages);
    const publicationYear = book.first_publish_year || 2020;
    const publisher = book.publisher?.[0] || 'Unknown Publisher';
    const isbn = book.isbn?.[0] || 'Unknown ISBN';
    const synopsis = book.first_sentence?.[0] || 'No synopsis available.';
    const contentRating = getRandom(contentRatings);
    const pageCount = book.number_of_pages_median || 300;
    const format = book.has_fulltext ? 'E-book' : 'Book';
    const sourceUrl = book.key ? `https://openlibrary.org${book.key}` : '';

    const title = book.title;
    seenTitles.add(title);
    let slug = slugify(`${title}`, { lower: true, strict: true });
    slugCounts[slug] = (slugCounts[slug] || 0) + 1;
    if (slugCounts[slug] > 1) {
      slug = `${slug}-${slugCounts[slug]}`;
    }

    const bookEntry = {
      templateId: 4,
      title,
      slug,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fieldValues: [
        { fieldId: 45, textValue: title },
        { fieldId: 46, textValue: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : '' },
        { fieldId: 47, textValue: book.author_name?.join(', ') || 'Unknown Author' },
        { fieldId: 48, numericValue: publicationYear },
        { fieldId: 49, textValue: publisher },
        { fieldId: 50, textValue: isbn },
        { fieldId: 51, jsonValue: languages },
        { fieldId: 52, jsonValue: genres },
        { fieldId: 53, textValue: country },
        { fieldId: 54, textValue: synopsis },
        { fieldId: 55, textValue: contentRating },
        { fieldId: 56, numericValue: pageCount },
        { fieldId: 57, textValue: format },
        { fieldId: 58, textValue: sourceUrl },
      ],
    };
    bookData.push(bookEntry);
    bookCounter++;

    if (bookCounter % 50 === 0) {
      console.log(`Processed ${bookCounter} books...`);
    }
  }

  const endTime = Date.now();
  console.log(`Finished fetching ${bookData.length} books. Time taken: ${formatDuration(endTime - startTime)}`);

  console.log('Writing books to books.json...');
  const writeStartTime = Date.now();
  try {
    await fs.writeFile('books.json', JSON.stringify(bookData, null, 2));
    const writeEndTime = Date.now();
    console.log(`Books export completed successfully! Time taken for writing: ${formatDuration(writeEndTime - writeStartTime)}`);
  } catch (error) {
    console.error('Error writing books.json:', error.message);
  }

  console.log(`Total time taken: ${formatDuration(endTime - startTime)}`);
}

// Main function to handle command-line arguments
async function main() {
  seedBooks();
}

// Run the main function
main().catch((error) => {
  console.error('Error during seeding:', error.message);
  process.exit(1);
});