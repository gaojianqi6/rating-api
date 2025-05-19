const axios = require('axios');
const fs = require('fs').promises;
const slugify = require('slugify');

// MusicBrainz API Configuration
const MUSICBRAINZ_BASE_URL = 'https://musicbrainz.org';
const COVER_ART_ARCHIVE_URL = 'https://coverartarchive.org';
const REQUEST_DELAY_MS = 1000; // 1 request/second to comply with MusicBrainz rate limit

// Countries and Languages from your music template
const countries = [
  'USA', 'South Korea', 'Japan', 'Thailand', 'France', 'Germany', 'Russia', 'Sweden', 'Brazil', 'India',
  'Canada', 'Ireland', 'Australia', 'United Kingdom', 'China', 'Mexico', 'Spain', 'Italy', 'Nigeria', 'South Africa', 'New Zealand'
];

const languages = [
  'Mandarin', 'English', 'Cantonese', 'Korean', 'Japanese', 'Thai', 'French', 'German', 'Russian', 'Swedish',
  'Portuguese', 'Hindi', 'Irish'
];

const musicGenres = [
  'Jazz', 'Classical', 'Rock', 'Pop', 'Electronic', 'Folk', 'Rap', 'Country', 'Hip-Hop', 'Blues', 'Punk',
  'Metal', 'Reggae', 'Indie', 'Ambient', 'Experimental', 'Religious', 'Children\'s'
];

const contentRatings = ['G', 'PG', 'PG-13', 'R', 'NC-17'];

// Helper to fetch MusicBrainz data with logging and delay
async function fetchMusicBrainzData(params) {
  console.log(`Fetching data from MusicBrainz with params: ${JSON.stringify(params)}`);
  try {
    const response = await axios.get(`${MUSICBRAINZ_BASE_URL}/ws/2/release`, {
      params,
      headers: { 'Accept': 'application/json' }
    });
    await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS)); // Rate limiting delay
    return response.data;
  } catch (error) {
    console.error(`Error fetching from MusicBrainz: ${error.message}`);
    return { releases: [] };
  }
}

// Helper to get random element from array
const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Helper to map MusicBrainz tags to your genres
function mapGenres(tags, availableGenres) {
  const genres = [];
  if (tags) {
    for (const tag of tags) {
      const matchingGenre = availableGenres.find((genre) => tag.name.toLowerCase() === genre.toLowerCase());
      if (matchingGenre) {
        genres.push(matchingGenre);
      }
    }
  }
  return genres.length > 0 ? genres : [getRandom(availableGenres)]; // Fallback to random genre
}

// Helper to infer country from artist or randomly assign
function mapCountryFromArtist(artistCountry) {
  if (artistCountry) return [artistCountry];
  return [getRandom(countries)];
}

// Helper to infer language from country or randomly assign
function mapLanguageFromCountry(country) {
  const countryLanguageMap = {
    'China': ['Mandarin', 'Cantonese'],
    'USA': ['English'],
    'United Kingdom': ['English'],
    'Australia': ['English'],
    'Canada': ['English'],
    'South Korea': ['Korean'],
    'Japan': ['Japanese'],
    'Thailand': ['Thai'],
    'France': ['French'],
    'Germany': ['German'],
    'Russia': ['Russian'],
    'Sweden': ['Swedish'],
    'Brazil': ['Portuguese'],
    'India': ['Hindi'],
    'Ireland': ['Irish'],
    'Mexico': ['Spanish'],
    'Spain': ['Spanish'],
    'Italy': ['Italian'],
    'Nigeria': ['English'],
    'South Africa': ['English'],
    'New Zealand': ['English']
  };
  return countryLanguageMap[country]?.length > 0 ? [getRandom(countryLanguageMap[country])] : [getRandom(languages)];
}

// Helper to format time duration
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

// Function to seed Music (200 entries)
async function seedMusic() {
  const startTime = Date.now();
  console.log('Starting to fetch Music...');
  const musicData = [];
  const seenTitles = new Set();
  const slugCounts = {};
  let musicCounter = 1;

  // Ensure at least 5 per genre (18 genres × 5 = 90 entries)
  for (const genre of musicGenres) {
    for (let i = 0; i < 5; i++) {
      const page = Math.floor(musicCounter / 25) + 1; // MusicBrainz returns up to 25 results per page by default
      const releases = await fetchMusicBrainzData({
        query: `tag:${genre.toLowerCase()}`,
        page,
        limit: 25,
        sort: 'date',
      });

      if (releases.releases.length === 0) {
        console.log(`No releases found for genre ${genre}, page ${page}. Skipping...`);
        continue;
      }

      let release = null;
      for (const result of releases.releases) {
        if (!seenTitles.has(result.title)) {
          release = result;
          break;
        }
      }

      if (!release) {
        console.log(`All releases on page ${page} for genre ${genre} are duplicates. Skipping...`);
        continue;
      }

      const artist = release['artist-credit']?.[0]?.name || 'Unknown Artist';
      const releaseYear = release.date ? parseInt(release.date.split('-')[0]) : 2020;
      const label = release['label-info']?.[0]?.label?.name || 'Unknown Label';
      const genres = mapGenres(release.tags, musicGenres);
      const country = mapCountryFromArtist(release['artist-credit']?.[0]?.artist?.country);
      const languages = mapLanguageFromCountry(country[0]);
      const description = `A ${genres[0]} album by ${artist} released in ${releaseYear}.`;
      const contentRating = getRandom(contentRatings);
      const trackCount = release['medium-list']?.[0]?.track_count || 10;
      const duration = trackCount * (Math.floor(Math.random() * 2) + 3); // 3-5 minutes per track × track count
      const format = getRandom(['Digital', 'CD', 'Vinyl']);
      const audioUrl = release['id'] ? `https://musicbrainz.org/release/${release['id']}` : '';
      const poster = release['id'] ? `${COVER_ART_ARCHIVE_URL}/release/${release['id']}/front-250` : '';

      const title = release.title;
      seenTitles.add(title);
      let slug = slugify(`${title}`, { lower: true, strict: true });
      slugCounts[slug] = (slugCounts[slug] || 0) + 1;
      if (slugCounts[slug] > 1) {
        slug = `${slug}-${slugCounts[slug]}`;
      }

      const musicEntry = {
        templateId: 5,
        title,
        slug,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fieldValues: [
          { fieldId: 59, textValue: title }, // title
          { fieldId: 60, textValue: poster }, // poster
          { fieldId: 61, textValue: artist }, // artist
          { fieldId: 62, numericValue: releaseYear }, // release_year
          { fieldId: 63, textValue: label }, // label
          { fieldId: 64, jsonValue: genres }, // genre
          { fieldId: 65, jsonValue: languages }, // language
          { fieldId: 66, jsonValue: country }, // country
          { fieldId: 67, textValue: description }, // description
          { fieldId: 68, textValue: contentRating }, // content_rating
          { fieldId: 69, numericValue: duration }, // duration
          { fieldId: 70, numericValue: trackCount }, // track_count
          { fieldId: 71, textValue: format }, // format
          { fieldId: 72, textValue: audioUrl }, // audio_url
        ],
      };
      musicData.push(musicEntry);
      musicCounter++;

      if (musicCounter % 50 === 0) {
        console.log(`Processed ${musicCounter} music entries...`);
      }
    }
  }

  // Add remaining entries to reach 200 (200 - 90 = 110 more)
  for (let i = 0; i < 110; i++) {
    const page = Math.floor(i / 25) + 1;
    const releases = await fetchMusicBrainzData({
      query: 'tag:*', // Broad search to get more releases
      page,
      limit: 25,
      sort: 'date',
    });

    if (releases.releases.length === 0) {
      console.log(`No releases found on page ${page}. Skipping...`);
      continue;
    }

    let release = null;
    for (const result of releases.releases) {
      if (!seenTitles.has(result.title)) {
        release = result;
        break;
      }
    }

    if (!release) {
      console.log(`All releases on page ${page} are duplicates. Skipping...`);
      continue;
    }

    const artist = release['artist-credit']?.[0]?.name || 'Unknown Artist';
    const releaseYear = release.date ? parseInt(release.date.split('-')[0]) : 2020;
    const label = release['label-info']?.[0]?.label?.name || 'Unknown Label';
    const genres = mapGenres(release.tags, musicGenres);
    const country = mapCountryFromArtist(release['artist-credit']?.[0]?.artist?.country);
    const languages = mapLanguageFromCountry(country[0]);
    const description = `A ${genres[0]} album by ${artist} released in ${releaseYear}.`;
    const contentRating = getRandom(contentRatings);
    const trackCount = release['medium-list']?.[0]?.track_count || 10;
    const duration = trackCount * (Math.floor(Math.random() * 2) + 3); // 3-5 minutes per track × track count
    const format = getRandom(['Digital', 'CD', 'Vinyl']);
    const audioUrl = release['id'] ? `https://musicbrainz.org/release/${release['id']}` : '';
    const poster = release['id'] ? `${COVER_ART_ARCHIVE_URL}/release/${release['id']}/front-250` : '';

    const title = release.title;
    seenTitles.add(title);
    let slug = slugify(`${title}`, { lower: true, strict: true });
    slugCounts[slug] = (slugCounts[slug] || 0) + 1;
    if (slugCounts[slug] > 1) {
      slug = `${slug}-${slugCounts[slug]}`;
    }

    const musicEntry = {
      templateId: 5,
      title,
      slug,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fieldValues: [
        { fieldId: 59, textValue: title },
        { fieldId: 60, textValue: poster },
        { fieldId: 61, textValue: artist },
        { fieldId: 62, numericValue: releaseYear },
        { fieldId: 63, textValue: label },
        { fieldId: 64, jsonValue: genres },
        { fieldId: 65, jsonValue: languages },
        { fieldId: 66, jsonValue: country },
        { fieldId: 67, textValue: description },
        { fieldId: 68, textValue: contentRating },
        { fieldId: 69, numericValue: duration },
        { fieldId: 70, numericValue: trackCount },
        { fieldId: 71, textValue: format },
        { fieldId: 72, textValue: audioUrl },
      ],
    };
    musicData.push(musicEntry);
    musicCounter++;

    if (musicCounter % 50 === 0) {
      console.log(`Processed ${musicCounter} music entries...`);
    }
  }

  const endTime = Date.now();
  console.log(`Finished fetching ${musicData.length} music entries. Time taken: ${formatDuration(endTime - startTime)}`);

  console.log('Writing music to music.json...');
  const writeStartTime = Date.now();
  try {
    await fs.writeFile('music.json', JSON.stringify(musicData, null, 2));
    const writeEndTime = Date.now();
    console.log(`Music export completed successfully! Time taken for writing: ${formatDuration(writeEndTime - writeStartTime)}`);
  } catch (error) {
    console.error('Error writing music.json:', error.message);
  }

  console.log(`Total time taken: ${formatDuration(endTime - startTime)}`);
}

// Main function to handle command-line arguments
async function main() {
  seedMusic();
}

// Run the main function
main().catch((error) => {
  console.error('Error during seeding:', error.message);
  process.exit(1);
});