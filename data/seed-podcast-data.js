const axios = require('axios');
const fs = require('fs').promises;
const slugify = require('slugify');

// iTunes Search API Configuration
const ITUNES_BASE_URL = 'https://itunes.apple.com';
const REQUEST_DELAY_MS = 250; // Delay between API requests to avoid rate limiting

// Countries and Languages from your podcast template
const countries = [
  'USA', 'South Korea', 'Japan', 'Thailand', 'France', 'Germany', 'Russia', 'Sweden', 'Brazil', 'India',
  'Canada', 'Ireland', 'Australia', 'United Kingdom', 'China', 'Mexico', 'Spain', 'Italy', 'Nigeria', 'South Africa', 'New Zealand'
];

const languages = [
  'Mandarin', 'English', 'Cantonese', 'Korean', 'Japanese', 'Thai', 'French', 'German', 'Russian', 'Swedish',
  'Portuguese', 'Hindi', 'Irish'
];

const podcastGenres = [
  'Hybrid Podcasts', 'Co-hosted Podcasts', 'Fiction: Storytelling', 'True Crime', 'Discussion Panel',
  'Solo', 'Educational Podcasts', 'Repurposed Content Podcasts', 'Co-host Conversational Podcasts',
  'Interview Podcasts', 'LIVE Podcasts', 'Roundtable', 'Comedy', 'The Documentary Podcast Format', 'Theatrical'
];

const contentRatings = ['G', 'PG', 'PG-13', 'R', 'NC-17'];

// Helper to fetch iTunes data with logging and delay
async function fetchITunesData(params) {
  console.log(`Fetching data from iTunes with params: ${JSON.stringify(params)}`);
  try {
    const response = await axios.get(`${ITUNES_BASE_URL}/search`, { params });
    await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS)); // Rate limiting delay
    return response.data;
  } catch (error) {
    console.error(`Error fetching from iTunes: ${error.message}`);
    return { results: [] };
  }
}

// Helper to get random element from array
const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Helper to map iTunes genres to your podcast genres
function mapGenres(iTunesGenres, availableGenres) {
  const genres = [];
  const genreMap = {
    'Hybrid Podcasts': ['Hybrid'],
    'Co-hosted Podcasts': ['Co-hosted'],
    'Fiction: Storytelling': ['Fiction', 'Storytelling'],
    'True Crime': ['True Crime'],
    'Discussion Panel': ['Discussion', 'Panel'],
    'Solo': ['Solo'],
    'Educational Podcasts': ['Education', 'Educational'],
    'Repurposed Content Podcasts': ['Repurposed', 'Content'],
    'Co-host Conversational Podcasts': ['Conversational'],
    'Interview Podcasts': ['Interview'],
    'LIVE Podcasts': ['Live'],
    'Roundtable': ['Roundtable'],
    'Comedy': ['Comedy'],
    'The Documentary Podcast Format': ['Documentary'],
    'Theatrical': ['Theatrical']
  };
  if (iTunesGenres) {
    for (const iTunesGenre of iTunesGenres) {
      const matchingGenre = Object.keys(genreMap).find((genre) =>
        genreMap[genre].some((keyword) => iTunesGenre.toLowerCase().includes(keyword.toLowerCase()))
      );
      if (matchingGenre && availableGenres.includes(matchingGenre)) {
        genres.push(matchingGenre);
      }
    }
  }
  return genres.length > 0 ? genres : [getRandom(availableGenres)]; // Fallback to random genre
}

// Helper to infer country from language or randomly assign
function mapCountryFromLanguage(language) {
  const languageCountryMap = {
    'Mandarin': 'China',
    'Cantonese': 'China',
    'English': getRandom(['USA', 'United Kingdom', 'Australia', 'Canada']),
    'Korean': 'South Korea',
    'Japanese': 'Japan',
    'Thai': 'Thailand',
    'French': 'France',
    'German': 'Germany',
    'Russian': 'Russia',
    'Swedish': 'Sweden',
    'Portuguese': 'Brazil',
    'Hindi': 'India',
    'Irish': 'Ireland'
  };
  return [languageCountryMap[language] || getRandom(countries)];
}

// Helper to format time duration
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

// Function to seed Podcasts (200 entries)
async function seedPodcasts() {
  const startTime = Date.now();
  console.log('Starting to fetch Podcasts...');
  const podcastData = [];
  const seenTitles = new Set();
  const slugCounts = {};
  let podcastCounter = 1;

  // Ensure at least 5 per genre (15 genres × 5 = 75 entries)
  for (const genre of podcastGenres) {
    for (let i = 0; i < 5; i++) {
      const offset = (podcastCounter - 1) * 50;
      const podcasts = await fetchITunesData({
        term: 'podcast',
        country: 'CN',
        media: 'podcast',
        attribute: 'genreTerm',
        entity: 'podcast',
        limit: 50,
        offset,
        genreTerm: genre.split(':')[0].replace(' ', '+') // Simplify genre for search
      });

      if (podcasts.results.length === 0) {
        console.log(`No podcasts found for genre ${genre}, offset ${offset}. Skipping...`);
        continue;
      }

      let podcast = null;
      for (const result of podcasts.results) {
        if (!seenTitles.has(result.trackName)) {
          podcast = result;
          break;
        }
      }

      if (!podcast) {
        console.log(`All podcasts at offset ${offset} for genre ${genre} are duplicates. Skipping...`);
        continue;
      }

      const releaseYear = podcast.releaseDate ? parseInt(podcast.releaseDate.split('-')[0]) : 2020;
      const network = podcast.primaryGenreName || 'Apple Podcasts';
      const genres = mapGenres([podcast.primaryGenreName, ...podcast.genres], podcastGenres);
      const language = languages.find((lang) => podcast.language?.includes(lang.toLowerCase())) || getRandom(languages);
      const country = mapCountryFromLanguage(language);
      const description = podcast.description || podcast.shortDescription || `A ${genres[0]} podcast by ${podcast.artistName}.`;
      const contentRating = getRandom(contentRatings);
      const averageEpisodeDuration = Math.floor(Math.random() * 31) + 30; // 30-60 minutes
      const episodeCount = podcast.trackCount || Math.floor(Math.random() * 100) + 1;
      const status = getRandom(['Active', 'Completed', 'On Hiatus']);
      const audioUrl = podcast.feedUrl || `https://itunes.apple.com/podcast/id${podcast.collectionId}`;
      const poster = podcast.artworkUrl100.replace('100x100', '600x600'); // Upscale cover image

      const title = podcast.trackName;
      seenTitles.add(title);
      let slug = slugify(`${title}`, { lower: true, strict: true });
      slugCounts[slug] = (slugCounts[slug] || 0) + 1;
      if (slugCounts[slug] > 1) {
        slug = `${slug}-${slugCounts[slug]}`;
      }

      const podcastEntry = {
        templateId: 6,
        title,
        slug,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fieldValues: [
          { fieldId: 73, textValue: title }, // title
          { fieldId: 74, textValue: poster }, // poster
          { fieldId: 75, textValue: podcast.artistName }, // host
          { fieldId: 76, numericValue: releaseYear }, // release_year
          { fieldId: 77, textValue: network }, // network
          { fieldId: 78, jsonValue: genres }, // genre
          { fieldId: 79, jsonValue: [language] }, // language
          { fieldId: 80, jsonValue: country }, // country
          { fieldId: 81, textValue: description }, // description
          { fieldId: 82, textValue: contentRating }, // content_rating
          { fieldId: 83, numericValue: averageEpisodeDuration }, // average_episode_duration
          { fieldId: 84, numericValue: episodeCount }, // episode_count
          { fieldId: 85, textValue: status }, // status
          { fieldId: 86, textValue: audioUrl }, // audio_url
        ],
      };
      podcastData.push(podcastEntry);
      podcastCounter++;

      if (podcastCounter % 50 === 0) {
        console.log(`Processed ${podcastCounter} podcast entries...`);
      }
    }
  }

  // Add remaining entries to reach 200 (200 - 75 = 125 more)
  for (let i = 0; i < 125; i++) {
    const offset = (i + 75) * 50;
    const podcasts = await fetchITunesData({
      term: 'podcast',
      country: 'CN',
      media: 'podcast',
      entity: 'podcast',
      limit: 50,
      offset,
    });

    if (podcasts.results.length === 0) {
      console.log(`No podcasts found at offset ${offset}. Skipping...`);
      continue;
    }

    let podcast = null;
    for (const result of podcasts.results) {
      if (!seenTitles.has(result.trackName)) {
        podcast = result;
        break;
      }
    }

    if (!podcast) {
      console.log(`All podcasts at offset ${offset} are duplicates. Skipping...`);
      continue;
    }

    const releaseYear = podcast.releaseDate ? parseInt(podcast.releaseDate.split('-')[0]) : 2020;
    const network = podcast.primaryGenreName || 'Apple Podcasts';
    const genres = mapGenres([podcast.primaryGenreName, ...podcast.genres], podcastGenres);
    const language = languages.find((lang) => podcast.language?.includes(lang.toLowerCase())) || getRandom(languages);
    const country = mapCountryFromLanguage(language);
    const description = podcast.description || podcast.shortDescription || `A ${genres[0]} podcast by ${podcast.artistName}.`;
    const contentRating = getRandom(contentRatings);
    const averageEpisodeDuration = Math.floor(Math.random() * 31) + 30; // 30-60 minutes
    const episodeCount = podcast.trackCount || Math.floor(Math.random() * 100) + 1;
    const status = getRandom(['Active', 'Completed', 'On Hiatus']);
    const audioUrl = podcast.feedUrl || `https://itunes.apple.com/podcast/id${podcast.collectionId}`;
    const poster = podcast.artworkUrl100.replace('100x100', '600x600'); // Upscale cover image

    const title = podcast.trackName;
    seenTitles.add(title);
    let slug = slugify(`${title}`, { lower: true, strict: true });
    slugCounts[slug] = (slugCounts[slug] || 0) + 1;
    if (slugCounts[slug] > 1) {
      slug = `${slug}-${slugCounts[slug]}`;
    }

    const podcastEntry = {
      templateId: 6,
      title,
      slug,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fieldValues: [
        { fieldId: 73, textValue: title },
        { fieldId: 74, textValue: poster },
        { fieldId: 75, textValue: podcast.artistName },
        { fieldId: 76, numericValue: releaseYear },
        { fieldId: 77, textValue: network },
        { fieldId: 78, jsonValue: genres },
        { fieldId: 79, jsonValue: [language] },
        { fieldId: 80, jsonValue: country },
        { fieldId: 81, textValue: description },
        { fieldId: 82, textValue: contentRating },
        { fieldId: 83, numericValue: averageEpisodeDuration },
        { fieldId: 84, numericValue: episodeCount },
        { fieldId: 85, textValue: status },
        { fieldId: 86, textValue: audioUrl },
      ],
    };
    podcastData.push(podcastEntry);
    podcastCounter++;

    if (podcastCounter % 50 === 0) {
      console.log(`Processed ${podcastCounter} podcast entries...`);
    }
  }

  const endTime = Date.now();
  console.log(`Finished fetching ${podcastData.length} podcast entries. Time taken: ${formatDuration(endTime - startTime)}`);

  console.log('Writing podcasts to podcasts.json...');
  const writeStartTime = Date.now();
  try {
    await fs.writeFile('podcasts.json', JSON.stringify(podcastData, null, 2));
    const writeEndTime = Date.now();
    console.log(`Podcasts export completed successfully! Time taken for writing: ${formatDuration(writeEndTime - writeStartTime)}`);
  } catch (error) {
    console.error('Error writing podcasts.json:', error.message);
  }

  console.log(`Total time taken: ${formatDuration(endTime - startTime)}`);
}

// Main function to handle command-line arguments
async function main() {
  seedPodcasts();
}

// Run the main function
main().catch((error) => {
  console.error('Error during seeding:', error.message);
  process.exit(1);
});