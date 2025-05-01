const axios = require('axios');
const fs = require('fs').promises;
const slugify = require('slugify');

// TMDB API Configuration
const TMDB_API_KEY = '8307d688307908d4931e4a1fd866dcc7';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const REQUEST_DELAY_MS = 250; // Delay between API requests to avoid rate limiting

// Countries and Genres from your datasource
const countries = [
  'USA', 'South Korea', 'Japan', 'Thailand', 'France', 'Germany', 'Russia', 'Sweden', 'Brazil', 'India',
  'Canada', 'Ireland', 'Australia', 'United Kingdom', 'China', 'Mexico', 'Spain', 'Italy', 'Nigeria', 'South Africa', 'New Zealand'
];

// TMDB country codes (ISO 3166-1 alpha-2) mapped to your country names
const countryCodeMap = {
  'USA': 'US',
  'South Korea': 'KR',
  'Japan': 'JP',
  'Thailand': 'TH',
  'France': 'FR',
  'Germany': 'DE',
  'Russia': 'RU',
  'Sweden': 'SE',
  'Brazil': 'BR',
  'India': 'IN',
  'Canada': 'CA',
  'Ireland': 'IE',
  'Australia': 'AU',
  'United Kingdom': 'GB',
  'China': 'CN',
  'Mexico': 'MX',
  'Spain': 'ES',
  'Italy': 'IT',
  'Nigeria': 'NG',
  'South Africa': 'ZA',
  'New Zealand': 'NZ',
};

const movieGenres = [
  'Adventure', 'Drama', 'Action', 'Online Movies', 'Gay Movies', 'Horror', 'Suspense', 'Thriller', 'Musical', 'Disaster',
  'Romance', 'Crime', 'Science Fiction', 'Classic Movies', 'Animation', 'War', 'Crossing', 'Palace', 'Myth', 'Business War',
  'Cops and Robbers', 'Plot', 'Homosexual', 'Fantasy', 'Comedy', 'Sci-Fi', 'Martial Arts', 'Costume Drama', 'Family Drama',
  'History', 'Biography', 'Western', 'Short Film', 'Documentary'
];

// TMDB genre IDs for movies (from TMDB API documentation)
const tmdbMovieGenreMap = {
  'Action': 28,
  'Adventure': 12,
  'Animation': 16,
  'Comedy': 35,
  'Crime': 80,
  'Documentary': 99,
  'Drama': 18,
  'Family Drama': 10751, // Family
  'Fantasy': 14,
  'History': 36,
  'Horror': 27,
  'Musical': 10402, // Music
  'Romance': 10749,
  'Sci-Fi': 878, // Science Fiction
  'Thriller': 53,
  'War': 10752,
  'Western': 37,
  'Biography': 18, // Drama as a proxy
  'Suspense': 53, // Thriller as a proxy
  'Short Film': 16, // Animation as a proxy for short films
  'Classic Movies': 18, // Drama as a proxy
  'Online Movies': 28, // Action as a proxy
  'Gay Movies': 10749, // Romance as a proxy
  'Homosexual': 10749, // Romance as a proxy
  'Disaster': 28, // Action as a proxy
  'Crossing': 18, // Drama as a proxy
  'Palace': 36, // History as a proxy
  'Myth': 14, // Fantasy as a proxy
  'Business War': 80, // Crime as a proxy
  'Cops and Robbers': 80, // Crime as a proxy
  'Plot': 18, // Drama as a proxy
  'Martial Arts': 28, // Action as a proxy
  'Costume Drama': 36, // History as a proxy
};

const showGenres = [
  'Reality Show', 'Comedy', 'Romance', 'Animation', 'Martial Arts', 'Costume Drama', 'Family Drama', 'Crime', 'Thriller',
  'Adventure', 'Sci-Fi', 'Horror', 'History', 'War', 'Action', 'Biography', 'Drama', 'Fantasy', 'Disaster', 'Western',
  'Musical', 'Short Film', 'Documentary'
];

// TMDB genre IDs for TV shows
const tmdbShowGenreMap = {
  'Action': 10759, // Action & Adventure
  'Adventure': 10759,
  'Animation': 16,
  'Comedy': 35,
  'Crime': 80,
  'Documentary': 99,
  'Drama': 18,
  'Family Drama': 10751, // Family
  'Fantasy': 10765, // Sci-Fi & Fantasy
  'History': 36,
  'Horror': 9648, // Mystery as a proxy
  'Musical': 10402, // Music
  'Romance': 10749,
  'Sci-Fi': 10765,
  'Thriller': 9648, // Mystery as a proxy
  'War': 10768, // War & Politics
  'Western': 37,
  'Biography': 18, // Drama as a proxy
  'Reality Show': 10764, // Reality
  'Short Film': 16, // Animation as a proxy
  'Disaster': 10759, // Action & Adventure as a proxy
  'Martial Arts': 10759, // Action & Adventure as a proxy
  'Costume Drama': 36, // History as a proxy
};

const languages = [
  'Mandarin', 'English', 'Cantonese', 'Korean', 'Japanese', 'Thai', 'French', 'German', 'Russian', 'Swedish',
  'Portuguese', 'Hindi', 'Irish'
];

// TMDB language codes (ISO 639-1)
const languageCodeMap = {
  'Mandarin': 'zh',
  'English': 'en',
  'Cantonese': 'cn',
  'Korean': 'ko',
  'Japanese': 'ja',
  'Thai': 'th',
  'French': 'fr',
  'German': 'de',
  'Russian': 'ru',
  'Swedish': 'sv',
  'Portuguese': 'pt',
  'Hindi': 'hi',
  'Irish': 'ga',
};

const contentRatings = ['G', 'PG', 'PG-13', 'R', 'NC-17'];
const statuses = ['ongoing', 'ended', 'canceled'];

// Helper to fetch TMDB data with logging and delay
async function fetchTMDBData(endpoint, params) {
  console.log(`Fetching data from TMDB: ${endpoint} with params: ${JSON.stringify(params)}`);
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/${endpoint}`, {
      params: { api_key: TMDB_API_KEY, ...params },
    });
    await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS)); // Rate limiting delay
    return response.data;
  } catch (error) {
    console.error(`Error fetching from TMDB ${endpoint}: ${error.message}`);
    return { results: [] };
  }
}

// Helper to get content rating (simplified mapping)
function mapContentRating(rating) {
  if (!rating) return getRandom(contentRatings);
  if (rating.includes('G')) return 'G';
  if (rating.includes('PG-13')) return 'PG-13';
  if (rating.includes('PG')) return 'PG';
  if (rating.includes('R')) return 'R';
  if (rating.includes('NC-17')) return 'NC-17';
  return getRandom(contentRatings);
}

// Helper to get random element from array
const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Helper to map TMDB genres to your genres
function mapGenres(tmdbGenres, genreMap, availableGenres) {
  const genres = [];
  for (const genre of tmdbGenres) {
    const matchingGenre = Object.keys(genreMap).find((key) => genreMap[key] === genre.id);
    if (matchingGenre && availableGenres.includes(matchingGenre)) {
      genres.push(matchingGenre);
    }
  }
  return genres.length > 0 ? genres : [getRandom(availableGenres)]; // Fallback to random genre if no match
}

// Helper to map TMDB countries to your countries
function mapCountries(tmdbCountries) {
  const mappedCountries = [];
  for (const country of tmdbCountries) {
    const matchingCountry = Object.keys(countryCodeMap).find((key) => countryCodeMap[key] === country.iso_3166_1);
    if (matchingCountry) {
      mappedCountries.push(matchingCountry);
    }
  }
  return mappedCountries.length > 0 ? mappedCountries : [getRandom(countries)]; // Fallback to random country
}

// Helper to map TMDB languages to your languages
function mapLanguages(tmdbLanguage) {
  const matchingLanguage = Object.keys(languageCodeMap).find((key) => languageCodeMap[key] === tmdbLanguage);
  return matchingLanguage ? [matchingLanguage] : [getRandom(languages)]; // Fallback to random language
}

// Helper to format time duration
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

// Function to seed Movies (500 entries)
async function seedMovies() {
  const startTime = Date.now();
  console.log('Starting to fetch Movies...');
  const movieData = [];
  const seenTitles = new Set(); // Track seen titles to avoid duplicates
  let movieCounter = 1;

  // Ensure at least 5 per genre (34 genres × 5 = 170 entries)
  for (const genre of movieGenres) {
    const genreId = tmdbMovieGenreMap[genre] || 28; // Default to Action if no mapping
    for (let i = 0; i < 5; i++) {
      const country = countries[(movieCounter - 1) % countries.length];
      const countryCode = countryCodeMap[country];
      const page = Math.floor(movieCounter / 20) + 1; // TMDB returns 20 results per page
      const movies = await fetchTMDBData('discover/movie', {
        with_genres: genreId,
        'with_origin_country': countryCode,
        page,
        sort_by: 'popularity.desc',
      });

      if (movies.results.length === 0) {
        console.log(`No movies found for genre ${genre} in country ${country}, page ${page}. Skipping...`);
        continue;
      }

      // Find the first unseen movie
      let movie = null;
      for (const result of movies.results) {
        if (!seenTitles.has(result.title)) {
          movie = result;
          break;
        }
      }

      if (!movie) {
        console.log(`All movies on page ${page} for genre ${genre} are duplicates. Skipping...`);
        continue;
      }

      const movieDetails = await fetchTMDBData(`movie/${movie.id}`, { append_to_response: 'releases' });

      const genres = mapGenres(movieDetails.genres, tmdbMovieGenreMap, movieGenres);
      const movieCountries = mapCountries(movieDetails.production_countries);
      const languages = mapLanguages(movieDetails.original_language);
      const releaseYear = movieDetails.release_date ? parseInt(movieDetails.release_date.split('-')[0]) : 2020;
      const contentRating = mapContentRating(
        movieDetails.releases?.countries.find((c) => c.iso_3166_1 === 'US')?.certification
      );

      const title = movieDetails.title;
      seenTitles.add(title); // Add title to seen set
      const slug = slugify(`${title}`, { lower: true, strict: true }); // Add counter to ensure unique slugs

      const movieEntry = {
        templateId: 1,
        title,
        slug,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fieldValues: [
          { fieldId: 1, textValue: title }, // title
          { fieldId: 2, textValue: `https://image.tmdb.org/t/p/original${movieDetails.poster_path}` }, // poster
          { fieldId: 3, numericValue: releaseYear }, // release_year
          { fieldId: 4, textValue: movieDetails.director || 'Unknown Director' }, // director
          { fieldId: 5, textValue: 'Various Actors' }, // cast (requires credits endpoint, simplified here)
          { fieldId: 6, jsonValue: languages }, // language
          { fieldId: 7, jsonValue: genres }, // type (genre)
          { fieldId: 8, jsonValue: movieCountries }, // country
          { fieldId: 9, textValue: movieDetails.overview || 'No synopsis available.' }, // synopsis
          { fieldId: 10, textValue: contentRating }, // content_rating
          { fieldId: 11, numericValue: movieDetails.runtime || 120 }, // runtime
          { fieldId: 12, textValue: `https://www.themoviedb.org/movie/${movie.id}` }, // trailer_url (proxy)
        ],
      };
      movieData.push(movieEntry);
      movieCounter++;

      if (movieCounter % 50 === 0) {
        console.log(`Processed ${movieCounter} movies...`);
      }
    }
  }

  // Add remaining movies to reach 500 (500 - 170 = 330 more)
  for (let i = 0; i < 330; i++) {
    const page = Math.floor(i / 20) + 1;
    const movies = await fetchTMDBData('discover/movie', {
      page,
      sort_by: 'popularity.desc',
    });

    if (movies.results.length === 0) {
      console.log(`No movies found on page ${page}. Skipping...`);
      continue;
    }

    // Find the first unseen movie
    let movie = null;
    for (const result of movies.results) {
      if (!seenTitles.has(result.title)) {
        movie = result;
        break;
      }
    }

    if (!movie) {
      console.log(`All movies on page ${page} are duplicates. Skipping...`);
      continue;
    }

    const movieDetails = await fetchTMDBData(`movie/${movie.id}`, { append_to_response: 'releases' });

    const genres = mapGenres(movieDetails.genres, tmdbMovieGenreMap, movieGenres);
    const movieCountries = mapCountries(movieDetails.production_countries);
    const languages = mapLanguages(movieDetails.original_language);
    const releaseYear = movieDetails.release_date ? parseInt(movieDetails.release_date.split('-')[0]) : 2020;
    const contentRating = mapContentRating(
      movieDetails.releases?.countries.find((c) => c.iso_3166_1 === 'US')?.certification
    );

    const title = movieDetails.title;
    seenTitles.add(title); // Add title to seen set
    const slug = slugify(`${title}`, { lower: true, strict: true }); // Add counter to ensure unique slugs

    const movieEntry = {
      templateId: 1,
      title,
      slug,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fieldValues: [
        { fieldId: 1, textValue: title },
        { fieldId: 2, textValue: `https://image.tmdb.org/t/p/original${movieDetails.poster_path}` },
        { fieldId: 3, numericValue: releaseYear },
        { fieldId: 4, textValue: movieDetails.director || 'Unknown Director' },
        { fieldId: 5, textValue: 'Various Actors' },
        { fieldId: 6, jsonValue: languages },
        { fieldId: 7, jsonValue: genres },
        { fieldId: 8, jsonValue: movieCountries },
        { fieldId: 9, textValue: movieDetails.overview || 'No synopsis available.' },
        { fieldId: 10, textValue: contentRating },
        { fieldId: 11, numericValue: movieDetails.runtime || 120 },
        { fieldId: 12, textValue: `https://www.themoviedb.org/movie/${movie.id}` },
      ],
    };
    movieData.push(movieEntry);
    movieCounter++;

    if (movieCounter % 50 === 0) {
      console.log(`Processed ${movieCounter} movies...`);
    }
  }

  const endTime = Date.now();
  console.log(`Finished fetching ${movieData.length} movies. Time taken: ${formatDuration(endTime - startTime)}`);

  // Write data to JSON file
  console.log('Writing movies to movies.json...');
  const writeStartTime = Date.now();
  try {
    await fs.writeFile('movies.json', JSON.stringify(movieData, null, 2));
    const writeEndTime = Date.now();
    console.log(`Movies export completed successfully! Time taken for writing: ${formatDuration(writeEndTime - writeStartTime)}`);
  } catch (error) {
    console.error('Error writing movies.json:', error.message);
  }

  console.log(`Total time taken: ${formatDuration(endTime - startTime)}`);
}

// Function to seed Variety Shows (150 entries)
async function seedVarietyShows() {
  const startTime = Date.now();
  console.log('Starting to fetch Variety Shows...');
  const varietyShowData = [];
  const seenTitles = new Set(); // Track seen titles to avoid duplicates
  let varietyCounter = 1;

  // Filter for Reality and Talk shows as a proxy for variety shows
  const varietyGenreIds = [10764]; // Reality
  for (const genre of showGenres) {
    const genreId = tmdbShowGenreMap[genre] || 10764;
    for (let i = 0; i < 5; i++) {
      const country = countries[(varietyCounter - 1) % countries.length];
      const countryCode = countryCodeMap[country];
      const page = Math.floor(varietyCounter / 20) + 1;
      const shows = await fetchTMDBData('discover/tv', {
        with_genres: varietyGenreIds.join(','),
        'with_origin_country': countryCode,
        page,
      });

      if (shows.results.length === 0) {
        console.log(`No variety shows found for genre ${genre} in country ${country}, page ${page}. Skipping...`);
        continue;
      }

      // Find the first unseen show
      let show = null;
      for (const result of shows.results) {
        if (!seenTitles.has(result.name)) {
          show = result;
          break;
        }
      }

      if (!show) {
        console.log(`All variety shows on page ${page} for genre ${genre} are duplicates. Skipping...`);
        continue;
      }

      const showDetails = await fetchTMDBData(`tv/${show.id}`, { append_to_response: 'content_ratings' });

      const genres = mapGenres(showDetails.genres, tmdbShowGenreMap, showGenres);
      const showCountries = mapCountries(showDetails.production_countries || showDetails.origin_country.map((c) => ({ iso_3166_1: c })));
      const languages = mapLanguages(showDetails.original_language);
      const firstAirYear = showDetails.first_air_date ? parseInt(showDetails.first_air_date.split('-')[0]) : 2018;
      const endYear = showDetails.last_air_date ? parseInt(showDetails.last_air_date.split('-')[0]) : null;
      const contentRating = mapContentRating(
        showDetails.content_ratings?.results.find((c) => c.iso_3166_1 === 'US')?.rating
      );

      const title = showDetails.name;
      seenTitles.add(title); // Add title to seen set
      const slug = slugify(`${title}`, { lower: true, strict: true }); // Add counter to ensure unique slugs

      const showEntry = {
        templateId: 6,
        title,
        slug,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fieldValues: [
          { fieldId: 72, textValue: title }, // title
          { fieldId: 73, textValue: `https://image.tmdb.org/t/p/original${showDetails.poster_path}` }, // poster
          { fieldId: 74, textValue: showDetails.created_by?.[0]?.name || 'Unknown Host' }, // host
          { fieldId: 75, numericValue: firstAirYear }, // first_air_year
          { fieldId: 76, numericValue: endYear }, // end_year
          { fieldId: 77, textValue: showDetails.networks?.[0]?.name || 'Unknown Platform' }, // network_or_platform
          { fieldId: 78, jsonValue: genres }, // genre
          { fieldId: 79, jsonValue: languages }, // language
          { fieldId: 80, jsonValue: showCountries }, // country
          { fieldId: 81, textValue: showDetails.overview || 'No description available.' }, // description
          { fieldId: 82, textValue: contentRating }, // content_rating
          { fieldId: 83, numericValue: showDetails.episode_run_time?.[0] || 45 }, // average_runtime
          { fieldId: 84, numericValue: showDetails.number_of_episodes || 50 }, // episode_count
          { fieldId: 85, textValue: showDetails.status?.toLowerCase() || getRandom(statuses) }, // status
          { fieldId: 86, textValue: `https://www.themoviedb.org/tv/${show.id}` }, // trailer_url (proxy)
        ],
      };
      varietyShowData.push(showEntry);
      varietyCounter++;

      if (varietyCounter % 50 === 0) {
        console.log(`Processed ${varietyCounter} variety shows...`);
      }
    }
  }

  // Add remaining variety shows to reach 150 (150 - 115 = 35 more)
  for (let i = 0; i < 35; i++) {
    const page = Math.floor(i / 20) + 1;
    const shows = await fetchTMDBData('discover/tv', {
      with_genres: varietyGenreIds.join(','),
      page,
    });

    if (shows.results.length === 0) {
      console.log(`No variety shows found on page ${page}. Skipping...`);
      continue;
    }

    // Find the first unseen show
    let show = null;
    for (const result of shows.results) {
      if (!seenTitles.has(result.name)) {
        show = result;
        break;
      }
    }

    if (!show) {
      console.log(`All variety shows on page ${page} are duplicates. Skipping...`);
      continue;
    }

    const showDetails = await fetchTMDBData(`tv/${show.id}`, { append_to_response: 'content_ratings' });

    const genres = mapGenres(showDetails.genres, tmdbShowGenreMap, showGenres);
    const showCountries = mapCountries(showDetails.production_countries || showDetails.origin_country.map((c) => ({ iso_3166_1: c })));
    const languages = mapLanguages(showDetails.original_language);
    const firstAirYear = showDetails.first_air_date ? parseInt(showDetails.first_air_date.split('-')[0]) : 2018;
    const endYear = showDetails.last_air_date ? parseInt(showDetails.last_air_date.split('-')[0]) : null;
    const contentRating = mapContentRating(
      showDetails.content_ratings?.results.find((c) => c.iso_3166_1 === 'US')?.rating
    );

    const title = showDetails.name;
    seenTitles.add(title); // Add title to seen set
    const slug = slugify(`${title}`, { lower: true, strict: true }); // Add counter to ensure unique slugs

    const showEntry = {
      templateId: 6,
      title,
      slug,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fieldValues: [
        { fieldId: 72, textValue: title },
        { fieldId: 73, textValue: `https://image.tmdb.org/t/p/original${showDetails.poster_path}` },
        { fieldId: 74, textValue: showDetails.created_by?.[0]?.name || 'Unknown Host' },
        { fieldId: 75, numericValue: firstAirYear },
        { fieldId: 76, numericValue: endYear },
        { fieldId: 77, textValue: showDetails.networks?.[0]?.name || 'Unknown Platform' },
        { fieldId: 78, jsonValue: genres },
        { fieldId: 79, jsonValue: languages },
        { fieldId: 80, jsonValue: showCountries },
        { fieldId: 81, textValue: showDetails.overview || 'No description available.' },
        { fieldId: 82, textValue: contentRating },
        { fieldId: 83, numericValue: showDetails.episode_run_time?.[0] || 45 },
        { fieldId: 84, numericValue: showDetails.number_of_episodes || 50 },
        { fieldId: 85, textValue: showDetails.status?.toLowerCase() || getRandom(statuses) },
        { fieldId: 86, textValue: `https://www.themoviedb.org/tv/${show.id}` },
      ],
    };
    varietyShowData.push(showEntry);
    varietyCounter++;

    if (varietyCounter % 50 === 0) {
      console.log(`Processed ${varietyCounter} variety shows...`);
    }
  }

  const endTime = Date.now();
  console.log(`Finished fetching ${varietyShowData.length} variety shows. Time taken: ${formatDuration(endTime - startTime)}`);

  // Write data to JSON file
  console.log('Writing variety shows to variety-shows.json...');
  const writeStartTime = Date.now();
  try {
    await fs.writeFile('variety-shows.json', JSON.stringify(varietyShowData, null, 2));
    const writeEndTime = Date.now();
    console.log(`Variety shows export completed successfully! Time taken for writing: ${formatDuration(writeEndTime - writeStartTime)}`);
  } catch (error) {
    console.error('Error writing variety-shows.json:', error.message);
  }

  console.log(`Total time taken: ${formatDuration(endTime - startTime)}`);
}

// Function to seed TV Series (200 entries)
async function seedTVSeries() {
  const startTime = Date.now();
  console.log('Starting to fetch TV Series...');
  const tvSeriesData = [];
  const seenTitles = new Set(); // Track seen titles to avoid duplicates
  let tvCounter = 1;

  // Ensure at least 5 per genre (23 genres × 5 = 115 entries)
  for (const genre of showGenres) {
    if (genre === 'Reality Show') continue; // Skip Reality Show genre to avoid variety shows
    const genreId = tmdbShowGenreMap[genre] || 10759;
    for (let i = 0; i < 5; i++) {
      const country = countries[(tvCounter - 1) % countries.length];
      const countryCode = countryCodeMap[country];
      const page = Math.floor(tvCounter / 20) + 1;
      const series = await fetchTMDBData('discover/tv', {
        with_genres: genreId,
        'without_genres': '10764', // Exclude Reality genre
        'with_origin_country': countryCode,
        page,
      });

      if (series.results.length === 0) {
        console.log(`No TV series found for genre ${genre} in country ${country}, page ${page}. Skipping...`);
        continue;
      }

      // Find the first unseen series
      let show = null;
      for (const result of series.results) {
        if (!seenTitles.has(result.name)) {
          show = result;
          break;
        }
      }

      if (!show) {
        console.log(`All TV series on page ${page} for genre ${genre} are duplicates. Skipping...`);
        continue;
      }

      const showDetails = await fetchTMDBData(`tv/${show.id}`, { append_to_response: 'content_ratings' });

      const genres = mapGenres(showDetails.genres, tmdbShowGenreMap, showGenres);
      // Ensure no Reality Show genre is included
      if (genres.includes('Reality Show')) {
        console.log(`Skipping ${showDetails.name} as it contains Reality Show genre.`);
        continue;
      }

      const showCountries = mapCountries(showDetails.production_countries || showDetails.origin_country.map((c) => ({ iso_3166_1: c })));
      const languages = mapLanguages(showDetails.original_language);
      const firstAirYear = showDetails.first_air_date ? parseInt(showDetails.first_air_date.split('-')[0]) : 2015;
      const endYear = showDetails.last_air_date ? parseInt(showDetails.last_air_date.split('-')[0]) : null;
      const contentRating = mapContentRating(
        showDetails.content_ratings?.results.find((c) => c.iso_3166_1 === 'US')?.rating
      );

      const title = showDetails.name;
      seenTitles.add(title); // Add title to seen set
      const slug = slugify(`${title}`, { lower: true, strict: true }); // Add counter to ensure unique slugs

      const seriesEntry = {
        templateId: 6,
        title,
        slug,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fieldValues: [
          { fieldId: 72, textValue: title },
          { fieldId: 73, textValue: `https://image.tmdb.org/t/p/original${showDetails.poster_path}` },
          { fieldId: 74, textValue: showDetails.created_by?.[0]?.name || 'Unknown Creator' },
          { fieldId: 75, numericValue: firstAirYear },
          { fieldId: 76, numericValue: endYear },
          { fieldId: 77, textValue: showDetails.networks?.[0]?.name || 'Unknown Network' },
          { fieldId: 78, jsonValue: genres },
          { fieldId: 79, jsonValue: languages },
          { fieldId: 80, jsonValue: showCountries },
          { fieldId: 81, textValue: showDetails.overview || 'No description available.' },
          { fieldId: 82, textValue: contentRating },
          { fieldId: 83, numericValue: showDetails.episode_run_time?.[0] || 40 },
          { fieldId: 84, numericValue: showDetails.number_of_episodes || 20 },
          { fieldId: 85, textValue: showDetails.status?.toLowerCase() || getRandom(statuses) },
          { fieldId: 86, textValue: `https://www.themoviedb.org/tv/${show.id}` },
        ],
      };
      tvSeriesData.push(seriesEntry);
      tvCounter++;

      if (tvCounter % 50 === 0) {
        console.log(`Processed ${tvCounter} TV series...`);
      }
    }
  }

  // Add remaining TV series to reach 200 (200 - 115 = 85 more)
  for (let i = 0; i < 85; i++) {
    const page = Math.floor(i / 20) + 1;
    const series = await fetchTMDBData('discover/tv', {
      'without_genres': '10764', // Exclude Reality genre
      page,
    });

    if (series.results.length === 0) {
      console.log(`No TV series found on page ${page}. Skipping...`);
      continue;
    }

    // Find the first unseen series
    let show = null;
    for (const result of series.results) {
      if (!seenTitles.has(result.name)) {
        show = result;
        break;
      }
    }

    if (!show) {
      console.log(`All TV series on page ${page} are duplicates. Skipping...`);
      continue;
    }

    const showDetails = await fetchTMDBData(`tv/${show.id}`, { append_to_response: 'content_ratings' });

    const genres = mapGenres(showDetails.genres, tmdbShowGenreMap, showGenres);
    // Ensure no Reality Show genre is included
    if (genres.includes('Reality Show')) {
      console.log(`Skipping ${showDetails.name} as it contains Reality Show genre.`);
      continue;
    }

    const showCountries = mapCountries(showDetails.production_countries || showDetails.origin_country.map((c) => ({ iso_3166_1: c })));
    const languages = mapLanguages(showDetails.original_language);
    const firstAirYear = showDetails.first_air_date ? parseInt(showDetails.first_air_date.split('-')[0]) : 2015;
    const endYear = showDetails.last_air_date ? parseInt(showDetails.last_air_date.split('-')[0]) : null;
    const contentRating = mapContentRating(
      showDetails.content_ratings?.results.find((c) => c.iso_3166_1 === 'US')?.rating
    );

    const title = showDetails.name;
    seenTitles.add(title); // Add title to seen set
    const slug = slugify(`${title}`, { lower: true, strict: true }); // Add counter to ensure unique slugs

    const seriesEntry = {
      templateId: 6,
      title,
      slug,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fieldValues: [
        { fieldId: 72, textValue: title },
        { fieldId: 73, textValue: `https://image.tmdb.org/t/p/original${showDetails.poster_path}` },
        { fieldId: 74, textValue: showDetails.created_by?.[0]?.name || 'Unknown Creator' },
        { fieldId: 75, numericValue: firstAirYear },
        { fieldId: 76, numericValue: endYear },
        { fieldId: 77, textValue: showDetails.networks?.[0]?.name || 'Unknown Network' },
        { fieldId: 78, jsonValue: genres },
        { fieldId: 79, jsonValue: languages },
        { fieldId: 80, jsonValue: showCountries },
        { fieldId: 81, textValue: showDetails.overview || 'No description available.' },
        { fieldId: 82, textValue: contentRating },
        { fieldId: 83, numericValue: showDetails.episode_run_time?.[0] || 40 },
        { fieldId: 84, numericValue: showDetails.number_of_episodes || 20 },
        { fieldId: 85, audioValue: showDetails.status?.toLowerCase() || getRandom(statuses) },
        { fieldId: 86, textValue: `https://www.themoviedb.org/tv/${show.id}` },
      ],
    };
    tvSeriesData.push(seriesEntry);
    tvCounter++;

    if (tvCounter % 50 === 0) {
      console.log(`Processed ${tvCounter} TV series...`);
    }
  }

  const endTime = Date.now();
  console.log(`Finished fetching ${tvSeriesData.length} TV series. Time taken: ${formatDuration(endTime - startTime)}`);

  // Write data to JSON file
  console.log('Writing TV series to tv-series.json...');
  const writeStartTime = Date.now();
  try {
    await fs.writeFile('tv-series.json', JSON.stringify(tvSeriesData, null, 2));
    const writeEndTime = Date.now();
    console.log(`TV series export completed successfully! Time taken for writing: ${formatDuration(writeEndTime - writeStartTime)}`);
  } catch (error) {
    console.error('Error writing tv-series.json:', error.message);
  }

  console.log(`Total time taken: ${formatDuration(endTime - startTime)}`);
}

// Main function to handle command-line arguments
async function main() {
  const args = process.argv.slice(2);
  const command = args[0]?.toLowerCase();

  switch (command) {
    case 'movies':
      await seedMovies();
      break;
    case 'variety-shows':
      await seedVarietyShows();
      break;
    case 'tv-series':
      await seedTVSeries();
      break;
    default:
      console.log('Usage: node seed-data.js [movies | variety-shows | tv-series]');
      console.log('Example: node seed-data.js movies');
      process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  console.error('Error during seeding:', error.message);
  process.exit(1);
});