/* Top 10: the titles watched most on this account (or, as settings, the best rated or ten shuffled each day), as a row of posters with big numbers. */

var TOP_LIMIT = 10;
var MIN_TITLES = 3; // a ranking of fewer titles is not worth showing
var PLAYS_LOOKED_AT = 400;
var DAILY_POOL = 1000; // how many titles the daily shuffle draws from
var MIN_RATING = 1; // titles without a community rating are left out of the "rated" ranking

var TOP_TEXT = {
  en: { daily: 'Picked for today', rated: 'Top rated', title: 'Your top 10' },
  it: { daily: 'Scelti per oggi', rated: 'I più votati', title: 'I tuoi 10 più visti' },
  es: { daily: 'Elegidas para hoy', rated: 'Mejor valoradas', title: 'Tus 10 más vistos' },
  fr: { daily: 'Sélection du jour', rated: 'Les mieux notés', title: 'Vos 10 plus regardés' },
  de: { daily: 'Auswahl für heute', rated: 'Am besten bewertet', title: 'Deine 10 meistgesehenen' },
  pt: { daily: 'Escolhidos para hoje', rated: 'Mais bem avaliados', title: 'Os seus 10 mais vistos' },
};
ag.textTables = ag.textTables || {};
ag.textTables.topTen = TOP_TEXT;

/** An episode stands for its series: same id, name and poster, so the card opens the series page. */
function seriesOf(episode) {
  if (!episode.SeriesId) return undefined;
  return {
    Id: episode.SeriesId,
    Name: episode.SeriesName || episode.Name,
    Type: 'Series',
    ImageTags: episode.SeriesPrimaryImageTag ? { Primary: episode.SeriesPrimaryImageTag } : undefined,
  };
}

/**
 * The most watched titles: `plays` is everything watched, newest first. Every episode counts for its series;
 * on a tie the title watched most recently goes first. Returns nothing below `minTitles` titles.
 */
ag.topTitles = function (plays, limit, minTitles) {
  var counts = {};
  var order = [];
  plays.forEach(function (play) {
    var title = play.Type === 'Episode' ? seriesOf(play) : play;
    if (!title) return;
    if (counts[title.Id]) counts[title.Id].count += 1;
    else { counts[title.Id] = { item: title, count: 1 }; order.push(title.Id); }
  });
  // `order` is first-seen (newest first) and the sort is stable, so ties stay in recency order.
  var ranked = order.map(function (id) { return counts[id]; }).sort(function (a, b) { return b.count - a.count; });
  return ranked.length < (minTitles === undefined ? MIN_TITLES : minTitles) ? [] : ranked.slice(0, limit).map(function (entry) { return entry.item; });
};

/** A repeatable stream of numbers in [0, 1) from a whole-number seed (mulberry32): the same seed always gives the same stream. */
function seededRandom(seed) {
  var state = seed >>> 0;
  return function () {
    state = (state + 0x6D2B79F5) >>> 0;
    var t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Ten titles shuffled by the day: the same `day` always gives the same titles in the same order (the order of `items`
 * must be stable, e.g. by name), and the next day gives others. Returns nothing below `minTitles` titles.
 */
ag.dailyTitles = function (items, day, limit, minTitles) {
  if (items.length < (minTitles === undefined ? MIN_TITLES : minTitles)) return [];
  var random = seededRandom(Math.imul(day + 1, 2654435761));
  var shuffled = items.slice();
  for (var i = shuffled.length - 1; i > 0; i--) {
    var j = Math.floor(random() * (i + 1));
    var swap = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = swap;
  }
  return shuffled.slice(0, limit);
};

/**
 * Where the shelf goes among the home page's shelves. `sections` describes them in order: { visible, monitor }, where
 * `monitor` is the web client's data-monitor of the shelf (shelves of what is being watched start with "videoplayback").
 * Returns { place: 'top' }, { place: 'end' } or { place: 'after', index }.
 */
ag.topTenSpot = function (position, sections) {
  if (position === 'end') return { place: 'end' };
  if (position === 'afterContinue') {
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].visible && /^videoplayback/.test(sections[i].monitor || '')) return { place: 'after', index: i };
    }
  }
  return { place: 'top' };
};

function placeRow(home, row, position) {
  var sectionsHost = home.querySelector('.sections');
  var sections = sectionsHost ? Array.prototype.slice.call(sectionsHost.children) : [];
  var spot = ag.topTenSpot(position, sections.map(function (section) {
    var items = section.querySelector('.itemsContainer');
    return { visible: section.offsetHeight > 0, monitor: (items && items.getAttribute('data-monitor')) || '' };
  }));
  if (spot.place === 'after' && sections[spot.index]) sections[spot.index].after(row);
  else if (spot.place === 'end' && sectionsHost) sectionsHost.appendChild(row);
  else {
    var hero = home.querySelector('.ag-hero');
    home.insertBefore(row, hero ? hero.nextSibling : home.firstChild);
  }
}

function buildRow(titles, mode) {
  var words = TOP_TEXT[ag.language()] || TOP_TEXT.en;
  var heading = mode === 'rated' ? words.rated : mode === 'daily' ? words.daily : words.title;
  var cards = titles.map(function (item, position) {
    var tag = item.ImageTags && item.ImageTags.Primary;
    return ag.el('a', { class: 'ag-top-card', href: ag.itemHref(item.Id), 'aria-label': (position + 1) + '. ' + item.Name }, [
      ag.el('span', { class: 'ag-top-rank', 'aria-hidden': 'true', text: String(position + 1) }),
      tag ? ag.el('img', { class: 'ag-top-poster', src: ag.imageUrl(item.Id, 'Primary', { maxWidth: 300, tag: tag }), alt: '', loading: 'lazy', decoding: 'async' })
        : ag.el('span', { class: 'ag-top-poster ag-top-noimage', text: item.Name }),
    ]);
  });
  return ag.el('section', { class: 'ag-top' }, [
    ag.el('h2', { class: 'ag-top-title', text: heading }),
    ag.el('div', { class: 'ag-top-scroller' }, cards),
  ]);
}

function mode() {
  var chosen = ag.config && ag.config.topTenMode;
  return chosen === 'rated' || chosen === 'daily' ? chosen : 'watched';
}

ag.startTopTen = function () {
  var loading = false;

  // One answer for each person signed in: the ranking is made from the watch history of whoever is signed in.
  var load = ag.perUser(function () {
    if (mode() === 'daily') {
      return ag.items({
        IncludeItemTypes: 'Movie,Series', Recursive: true, ImageTypes: 'Primary', SortBy: 'SortName', SortOrder: 'Ascending',
        Limit: DAILY_POOL, EnableImageTypes: 'Primary', ImageTypeLimit: 1, EnableUserData: false,
      }).then(function (result) {
        return ag.dailyTitles(result.Items || [], ag.dayNumber(), TOP_LIMIT);
      });
    }
    if (mode() === 'rated') {
      return ag.items({
        IncludeItemTypes: 'Movie,Series', Recursive: true, SortBy: 'CommunityRating', SortOrder: 'Descending',
        MinCommunityRating: MIN_RATING, Limit: TOP_LIMIT, EnableImageTypes: 'Primary', ImageTypeLimit: 1, EnableUserData: false,
      }).then(function (result) {
        var items = result.Items || [];
        return items.length < MIN_TITLES ? [] : items.slice(0, TOP_LIMIT);
      });
    }
    return ag.items({
      IncludeItemTypes: 'Movie,Episode', Recursive: true, Filters: 'IsPlayed', SortBy: 'DatePlayed', SortOrder: 'Descending',
      Limit: PLAYS_LOOKED_AT, EnableImageTypes: 'Primary', ImageTypeLimit: 1, EnableUserData: false,
    }).then(function (result) {
      return ag.topTitles(result.Items || [], TOP_LIMIT);
    });
  });

  function sync() {
    var params = ag.pageParams();
    var home = document.getElementById('homeTab');
    if (ag.pageName() !== 'home' || params.tab || params.seerrfinTab || !home || home.querySelector('.ag-top') || loading) return;
    loading = true;
    load().then(function (titles) {
      var current = document.getElementById('homeTab');
      if (!titles.length || !current || current.querySelector('.ag-top')) return;
      placeRow(current, buildRow(titles, mode()), (ag.config && ag.config.topTenPosition) || 'top');
    }).catch(function () {}).then(function () { loading = false; });
  }

  new MutationObserver(ag.debounce(sync, 250)).observe(document.body, { childList: true, subtree: true });
  ag.onPageChange(sync);
};
