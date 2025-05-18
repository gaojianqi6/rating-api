const axios = require('axios');
const fs = require('fs').promises;
const slugify = require('slugify');

// TMDB API Configuration
const TMDB_API_KEY = '8307d688307908d4931e4a1fd866dcc7';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const REQUEST_DELAY_MS = 250; // Delay between API requests to avoid rate limiting

// Countries and Languages from your datasource
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

// TMDB genre IDs for movies
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
  'Short Film': 16, // Animation as a proxy
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

// TV Series genres from tv_type (dataSourceId: 2)
const tvGenres = [
  'love', 'romance', 'comedy', 'history', 'competition', 'emotional', 'animation', 'costume_drama', 'family_drama',
  'crime', 'thriller', 'adventure', 'horror', 'war', 'action', 'biography', 'drama', 'fantasy', 'disaster', 'musical'
];

// Variety Show genres from show_type (dataSourceId: 3)
const varietyGenres = [
  'reality_show', 'talent_show', 'talk_show', 'dance_show', 'comedy_show', 'martial_arts', 'interview', 'concert', 'others'
];

// TMDB genre IDs for TV shows (aligned with tv_type)
const tmdbShowGenreMap = {
  'action': 10759, // Action & Adventure
  'adventure': 10759,
  'animation': 16,
  'comedy': 35,
  'crime': 80,
  'drama': 18,
  'family_drama': 10751, // Family
  'fantasy': 10765, // Sci-Fi & Fantasy
  'history': 36,
  'horror': 9648, // Mystery as a proxy
  'musical': 10402, // Music
  'romance': 10749,
  'thriller': 9648, // Mystery as a proxy
  'war': 10768, // War & Politics
  'biography': 18, // Drama as a proxy
  'disaster': 10759, // Action & Adventure as a proxy
  'costume_drama': 36, // History as a proxy
  'love': 10749, // Romance as a proxy
  'emotional': 18, // Drama as a proxy
  'competition': 10764, // Reality as a proxy (for scripted competition)
};

// TMDB keyword IDs for variety show types
const tmdbKeywordMap = {
  'talent_show': 263106, // Talent show keyword
  'dance_show': 18018, // Dance keyword
  'comedy_show': 176684, // Comedy keyword
  'martial_arts': 77991,
  'concert': 11199,
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

// Helper to get content rating
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
  return genres.length > 0 ? genres : [getRandom(availableGenres)]; // Fallback to random genre
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
  const seenTitles = new Set();
  const slugCounts = {};
  let movieCounter = 1;

  // Ensure at least 5 per genre (34 genres × 5 = 170 entries)
  for (const genre of movieGenres) {
    const genreId = tmdbMovieGenreMap[genre] || 28; // Default to Action
    for (let i = 0; i < 5; i++) {
      const country = countries[(movieCounter - 1) % countries.length];
      const countryCode = countryCodeMap[country];
      const page = Math.floor(movieCounter / 20) + 1; // TMDB returns 20 results per page
      const movies = await fetchTMDBData('discover/movie', {
        with_genres: genreId,
        with_origin_country: countryCode,
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

      const movieDetails = await fetchTMDBData(`movie/${movie.id}`, { append_to_response: 'releases,credits' });

      const genres = mapGenres(movieDetails.genres || [], tmdbMovieGenreMap, movieGenres);
      const movieCountries = mapCountries(movieDetails.production_countries || []);
      const languages = mapLanguages(movieDetails.original_language);
      const releaseYear = movieDetails.release_date ? parseInt(movieDetails.release_date.split('-')[0]) : 2020;
      const contentRating = mapContentRating(
        movieDetails.releases?.countries.find((c) => c.iso_3166_1 === 'US')?.certification
      );

      const title = movieDetails.title;
      seenTitles.add(title);
      let slug = slugify(`${title}`, { lower: true, strict: true });
      slugCounts[slug] = (slugCounts[slug] || 0) + 1;
      if (slugCounts[slug] > 1) {
        slug = `${slug}-${slugCounts[slug]}`; // Append counter for unique slugs
      }

      const movieEntry = {
        templateId: 1,
        title,
        slug,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fieldValues: [
          { fieldId: 1, textValue: title }, // title
          { fieldId: 2, textValue: movieDetails.poster_path ? `https://image.tmdb.org/t/p/original${movieDetails.poster_path}` : '' }, // poster
          { fieldId: 3, numericValue: releaseYear }, // release_year
          { fieldId: 4, textValue: movieDetails.credits?.crew.find((c) => c.job === 'Director')?.name || 'Unknown Director' }, // director
          { fieldId: 5, textValue: movieDetails.credits?.cast.slice(0, 3).map((c) => c.name).join(', ') || 'Various Actors' }, // cast
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

    const movieDetails = await fetchTMDBData(`movie/${movie.id}`, { append_to_response: 'releases,credits' });

    const genres = mapGenres(movieDetails.genres || [], tmdbMovieGenreMap, movieGenres);
    const movieCountries = mapCountries(movieDetails.production_countries || []);
    const languages = mapLanguages(movieDetails.original_language);
    const releaseYear = movieDetails.release_date ? parseInt(movieDetails.release_date.split('-')[0]) : 2020;
    const contentRating = mapContentRating(
      movieDetails.releases?.countries.find((c) => c.iso_3166_1 === 'US')?.certification
    );

    const title = movieDetails.title;
    seenTitles.add(title);
    let slug = slugify(`${title}`, { lower: true, strict: true });
    slugCounts[slug] = (slugCounts[slug] || 0) + 1;
    if (slugCounts[slug] > 1) {
      slug = `${slug}-${slugCounts[slug]}`;
    }

    const movieEntry = {
      templateId: 1,
      title,
      slug,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fieldValues: [
        { fieldId: 1, textValue: title },
        { fieldId: 2, textValue: movieDetails.poster_path ? `https://image.tmdb.org/t/p/original${movieDetails.poster_path}` : '' },
        { fieldId: 3, numericValue: releaseYear },
        { fieldId: 4, textValue: movieDetails.credits?.crew.find((c) => c.job === 'Director')?.name || 'Unknown Director' },
        { fieldId: 5, textValue: movieDetails.credits?.cast.slice(0, 3).map((c) => c.name).join(', ') || 'Various Actors' },
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
  const seenTitles = new Set();
  const slugCounts = {};
  let varietyCounter = 1;

  // Ensure at least 5 per genre (9 genres × 5 = 45 entries)
  for (const genre of varietyGenres) {
    const params = {
      with_genres: '10764,10767', // Reality and Talk
      with_origin_country: countryCodeMap[countries[(varietyCounter - 1) % countries.length]],
      page: Math.floor(varietyCounter / 20) + 1,
      sort_by: 'popularity.desc',
    };

    // Add keyword filters for specific genres
    if (genre === 'talent_show') {
      params.with_keywords = tmdbKeywordMap['talent_show'];
    } else if (genre === 'dance_show') {
      params.with_keywords = tmdbKeywordMap['dance_show'];
    } else if (genre === 'comedy_show') {
      params.with_keywords = tmdbKeywordMap['comedy_show'];
    } else if (genre === 'martial_arts') {
      params.with_keywords = tmdbKeywordMap['martial_arts'];
    } else if (genre === 'concert') {
      params.with_keywords = tmdbKeywordMap['concert'];
    }

    const shows = await fetchTMDBData('discover/tv', params);

    if (shows.results.length === 0) {
      console.log(`No variety shows found for genre ${genre}, page ${params.page}. Skipping...`);
      continue;
    }

    let show = null;
    for (const result of shows.results) {
      if (!seenTitles.has(result.name)) {
        show = result;
        break;
      }
    }

    if (!show) {
      console.log(`All variety shows on page ${params.page} for genre ${genre} are duplicates. Skipping...`);
      continue;
    }

    const showDetails = await fetchTMDBData(`tv/${show.id}`, { append_to_response: 'content_ratings,credits,keywords' });

    // Map genres based on TMDB data and target genre
    let genres = [];
    if (genre === 'reality_show' && showDetails.genres.some((g) => g.id === 10764)) {
      genres = ['reality_show'];
    } else if (genre === 'talk_show' && showDetails.genres.some((g) => g.id === 10767)) {
      genres = ['talk_show'];
    } else if (genre === 'talent_show' && showDetails.keywords?.results.some((k) => k.id === tmdbKeywordMap['talent_show'])) {
      genres = ['talent_show'];
    } else if (genre === 'dance_show' && showDetails.keywords?.results.some((k) => k.id === tmdbKeywordMap['dance_show'])) {
      genres = ['dance_show'];
    } else if (genre === 'comedy_show' && showDetails.keywords?.results.some((k) => k.id === tmdbKeywordMap['comedy_show'])) {
      genres = ['comedy_show'];
    } else if (genre === 'martial_arts' && showDetails.keywords?.results.some((k) => k.id === tmdbKeywordMap['martial_arts'])) {
      genres = ['martial_arts'];
    } else if (genre === 'concert' && showDetails.keywords?.results.some((k) => k.id === tmdbKeywordMap['concert'])) {
      genres = ['concert'];
    } else if (genre === 'interview' && showDetails.genres.some((g) => g.id === 10767)) {
      genres = ['interview']; // Proxy with Talk
    } else {
      genres = ['others']; // Fallback
    }

    const showCountries = mapCountries(showDetails.production_countries || showDetails.origin_country.map((c) => ({ iso_3166_1: c })));
    const languages = mapLanguages(showDetails.original_language);
    const firstAirYear = showDetails.first_air_date ? parseInt(showDetails.first_air_date.split('-')[0]) : 2018;
    const endYear = showDetails.last_air_date ? parseInt(showDetails.last_air_date.split('-')[0]) : null;
    const contentRating = mapContentRating(
      showDetails.content_ratings?.results.find((c) => c.iso_3166_1 === 'US')?.rating
    );

    const title = showDetails.name;
    seenTitles.add(title);
    let slug = slugify(`${title}`, { lower: true, strict: true });
    slugCounts[slug] = (slugCounts[slug] || 0) + 1;
    if (slugCounts[slug] > 1) {
      slug = `${slug}-${slugCounts[slug]}`;
    }

    const showEntry = {
      templateId: 3, // Variety Show template
      title,
      slug,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fieldValues: [
        { fieldId: 30, textValue: title }, // title
        { fieldId: 31, textValue: showDetails.poster_path ? `https://image.tmdb.org/t/p/original${showDetails.poster_path}` : '' }, // poster
        { fieldId: 32, textValue: showDetails.credits?.cast[0]?.name || showDetails.created_by?.[0]?.name || 'Unknown Host' }, // host
        { fieldId: 33, numericValue: firstAirYear }, // first_air_year
        { fieldId: 34, numericValue: endYear }, // end_year
        { fieldId: 35, textValue: showDetails.networks?.[0]?.name || 'Unknown Platform' }, // network_or_platform
        { fieldId: 36, jsonValue: genres }, // genre
        { fieldId: 37, jsonValue: languages }, // language
        { fieldId: 38, jsonValue: showCountries }, // country
        { fieldId: 39, textValue: showDetails.overview || 'No description available.' }, // description
        { fieldId: 40, textValue: contentRating }, // content_rating
        { fieldId: 41, numericValue: showDetails.episode_run_time?.[0] || 45 }, // average_runtime
        { fieldId: 42, numericValue: showDetails.number_of_episodes || 50 }, // episode_count
        { fieldId: 43, textValue: showDetails.status?.toLowerCase() || getRandom(statuses) }, // status
        { fieldId: 44, textValue: `https://www.themoviedb.org/tv/${show.id}` }, // trailer_url
      ],
    };
    varietyShowData.push(showEntry);
    varietyCounter++;

    if (varietyCounter % 50 === 0) {
      console.log(`Processed ${varietyCounter} variety shows...`);
    }
  }

  // Add remaining variety shows to reach 150 (150 - 45 = 105 more)
  for (let i = 0; i < 105; i++) {
    const page = Math.floor(i / 20) + 1;
    const shows = await fetchTMDBData('discover/tv', {
      with_genres: '10764,10767',
      page,
      sort_by: 'popularity.desc',
    });

    if (shows.results.length === 0) {
      console.log(`No variety shows found on page ${page}. Skipping...`);
      continue;
    }

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

    const showDetails = await fetchTMDBData(`tv/${show.id}`, { append_to_response: 'content_ratings,credits,keywords' });

    // Assign genre based on TMDB genres or keywords
    let genres = [];
    if (showDetails.genres.some((g) => g.id === 10764)) {
      genres = ['reality_show'];
    } else if (showDetails.genres.some((g) => g.id === 10767)) {
      genres = ['talk_show'];
    } else if (showDetails.keywords?.results.some((k) => k.id === tmdbKeywordMap['talent_show'])) {
      genres = ['talent_show'];
    } else if (showDetails.keywords?.results.some((k) => k.id === tmdbKeywordMap['dance_show'])) {
      genres = ['dance_show'];
    } else if (showDetails.keywords?.results.some((k) => k.id === tmdbKeywordMap['comedy_show'])) {
      genres = ['comedy_show'];
    } else {
      genres = ['others'];
    }

    const showCountries = mapCountries(showDetails.production_countries || showDetails.origin_country.map((c) => ({ iso_3166_1: c })));
    const languages = mapLanguages(showDetails.original_language);
    const firstAirYear = showDetails.first_air_date ? parseInt(showDetails.first_air_date.split('-')[0]) : 2018;
    const endYear = showDetails.last_air_date ? parseInt(showDetails.last_air_date.split('-')[0]) : null;
    const contentRating = mapContentRating(
      showDetails.content_ratings?.results.find((c) => c.iso_3166_1 === 'US')?.rating
    );

    const title = showDetails.name;
    seenTitles.add(title);
    let slug = slugify(`${title}`, { lower: true, strict: true });
    slugCounts[slug] = (slugCounts[slug] || 0) + 1;
    if (slugCounts[slug] > 1) {
      slug = `${slug}-${slugCounts[slug]}`;
    }

    const showEntry = {
      templateId: 3,
      title,
      slug,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fieldValues: [
        { fieldId: 30, textValue: title },
        { fieldId: 31, textValue: showDetails.poster_path ? `https://image.tmdb.org/t/p/original${showDetails.poster_path}` : '' },
        { fieldId: 32, textValue: showDetails.credits?.cast[0]?.name || showDetails.created_by?.[0]?.name || 'Unknown Host' },
        { fieldId: 33, numericValue: firstAirYear },
        { fieldId: 34, numericValue: endYear },
        { fieldId: 35, textValue: showDetails.networks?.[0]?.name || 'Unknown Platform' },
        { fieldId: 36, jsonValue: genres },
        { fieldId: 37, jsonValue: languages },
        { fieldId: 38, jsonValue: showCountries },
        { fieldId: 39, textValue: showDetails.overview || 'No description available.' },
        { fieldId: 40, textValue: contentRating },
        { fieldId: 41, numericValue: showDetails.episode_run_time?.[0] || 45 },
        { fieldId: 42, numericValue: showDetails.number_of_episodes || 50 },
        { fieldId: 43, textValue: showDetails.status?.toLowerCase() || getRandom(statuses) },
        { fieldId: 44, textValue: `https://www.themoviedb.org/tv/${show.id}` },
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
  const seenTitles = new Set();
  const slugCounts = {};
  let tvCounter = 1;

  // Ensure at least 5 per genre (20 genres × 5 = 100 entries)
  for (const genre of tvGenres) {
    const genreId = tmdbShowGenreMap[genre] || 10759;
    const page = Math.floor(tvCounter / 20) + 1;
    const series = await fetchTMDBData('discover/tv', {
      with_genres: genreId,
      without_genres: '10764,10767', // Exclude Reality and Talk
      with_origin_country: countryCodeMap[countries[(tvCounter - 1) % countries.length]],
      page,
      sort_by: 'popularity.desc',
    });

    if (series.results.length === 0) {
      console.log(`No TV series found for genre ${genre}, page ${page}. Skipping...`);
      continue;
    }

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

    const showDetails = await fetchTMDBData(`tv/${show.id}`, { append_to_response: 'content_ratings,credits' });

    const genres = mapGenres(showDetails.genres || [], tmdbShowGenreMap, tvGenres);
    const showCountries = mapCountries(showDetails.production_countries || showDetails.origin_country.map((c) => ({ iso_3166_1: c })));
    const languages = mapLanguages(showDetails.original_language);
    const firstAirYear = showDetails.first_air_date ? parseInt(showDetails.first_air_date.split('-')[0]) : 2015;
    const endYear = showDetails.last_air_date ? parseInt(showDetails.last_air_date.split('-')[0]) : null;
    const contentRating = mapContentRating(
      showDetails.content_ratings?.results.find((c) => c.iso_3166_1 === 'US')?.rating
    );

    const title = showDetails.name;
    seenTitles.add(title);
    let slug = slugify(`${title}`, { lower: true, strict: true });
    slugCounts[slug] = (slugCounts[slug] || 0) + 1;
    if (slugCounts[slug] > 1) {
      slug = `${slug}-${slugCounts[slug]}`;
    }

    const seriesEntry = {
      templateId: 2, // TV Series template
      title,
      slug,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fieldValues: [
        { fieldId: 13, textValue: title }, // title
        { fieldId: 14, textValue: showDetails.poster_path ? `https://image.tmdb.org/t/p/original${showDetails.poster_path}` : '' }, // poster
        { fieldId: 15, numericValue: firstAirYear }, // first_air_year
        { fieldId: 16, numericValue: endYear }, // end_year
        { fieldId: 17, textValue: showDetails.created_by?.[0]?.name || 'Unknown Creator' }, // created_by
        { fieldId: 18, textValue: showDetails.credits?.cast.slice(0, 3).map((c) => c.name).join(', ') || 'Various Actors' }, // cast
        { fieldId: 19, jsonValue: languages }, // language
        { fieldId: 20, jsonValue: genres }, // genre
        { fieldId: 21, jsonValue: showCountries }, // country
        { fieldId: 22, textValue: showDetails.overview || 'No description available.' }, // synopsis
        { fieldId: 23, textValue: contentRating }, // content_rating
        { fieldId: 24, numericValue: showDetails.episode_run_time?.[0] || 40 }, // average_runtime
        { fieldId: 25, numericValue: showDetails.number_of_seasons || 1 }, // number_of_seasons
        { fieldId: 26, numericValue: showDetails.number_of_episodes || 20 }, // number_of_episodes
        { fieldId: 27, textValue: showDetails.networks?.[0]?.name || 'Unknown Network' }, // network_or_platform
        { fieldId: 28, textValue: showDetails.status?.toLowerCase() || getRandom(statuses) }, // status
        { fieldId: 29, textValue: `https://www.themoviedb.org/tv/${show.id}` }, // trailer_url
      ],
    };
    tvSeriesData.push(seriesEntry);
    tvCounter++;

    if (tvCounter % 50 === 0) {
      console.log(`Processed ${tvCounter} TV series...`);
    }
  }

  // Add remaining TV series to reach 200 (200 - 100 = 100 more)
  for (let i = 0; i < 100; i++) {
    const page = Math.floor(i / 20) + 1;
    const series = await fetchTMDBData('discover/tv', {
      without_genres: '10764,10767',
      page,
      sort_by: 'popularity.desc',
    });

    if (series.results.length === 0) {
      console.log(`No TV series found on page ${page}. Skipping...`);
      continue;
    }

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

    const showDetails = await fetchTMDBData(`tv/${show.id}`, { append_to_response: 'content_ratings,credits' });

    const genres = mapGenres(showDetails.genres || [], tmdbShowGenreMap, tvGenres);
    const showCountries = mapCountries(showDetails.production_countries || showDetails.origin_country.map((c) => ({ iso_3166_1: c })));
    const languages = mapLanguages(showDetails.original_language);
    const firstAirYear = showDetails.first_air_date ? parseInt(showDetails.first_air_date.split('-')[0]) : 2015;
    const endYear = showDetails.last_air_date ? parseInt(showDetails.last_air_date.split('-')[0]) : null;
    const contentRating = mapContentRating(
      showDetails.content_ratings?.results.find((c) => c.iso_3166_1 === 'US')?.rating
    );

    const title = showDetails.name;
    seenTitles.add(title);
    let slug = slugify(`${title}`, { lower: true, strict: true });
    slugCounts[slug] = (slugCounts[slug] || 0) + 1;
    if (slugCounts[slug] > 1) {
      slug = `${slug}-${slugCounts[slug]}`;
    }

    const seriesEntry = {
      templateId: 2,
      title,
      slug,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fieldValues: [
        { fieldId: 13, textValue: title },
        { fieldId: 14, textValue: showDetails.poster_path ? `https://image.tmdb.org/t/p/original${showDetails.poster_path}` : '' },
        { fieldId: 15, numericValue: firstAirYear },
        { fieldId: 16, numericValue: endYear },
        { fieldId: 17, textValue: showDetails.created_by?.[0]?.name || 'Unknown Creator' },
        { fieldId: 18, textValue: showDetails.credits?.cast.slice(0, 3).map((c) => c.name).join(', ') || 'Various Actors' },
        { fieldId: 19, jsonValue: languages },
        { fieldId: 20, jsonValue: genres },
        { fieldId: 21, jsonValue: showCountries },
        { fieldId: 22, textValue: showDetails.overview || 'No description available.' },
        { fieldId: 23, textValue: contentRating },
        { fieldId: 24, numericValue: showDetails.episode_run_time?.[0] || 40 },
        { fieldId: 25, numericValue: showDetails.number_of_seasons || 1 },
        { fieldId: 26, numericValue: showDetails.number_of_episodes || 20 },
        { fieldId: 27, textValue: showDetails.networks?.[0]?.name || 'Unknown Network' },
        { fieldId: 28, textValue: showDetails.status?.toLowerCase() || getRandom(statuses) },
        { fieldId: 29, textValue: `https://www.themoviedb.org/tv/${show.id}` },
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