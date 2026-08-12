const USER_AGENT = 'JapanMenuTranslator/1.0 (Android app; contact: gimgibae2@gmail.com)';

async function findBestTitle(term: string): Promise<string | null> {
  const url = `https://ko.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
    term
  )}&srlimit=1&format=json&origin=*`;
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) return null;
  const data = await response.json();
  const title = data?.query?.search?.[0]?.title;
  return typeof title === 'string' && title.length > 0 ? title : null;
}

async function fetchSummaryByTitle(title: string): Promise<string | null> {
  const response = await fetch(`https://ko.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!response.ok) return null;
  const data = await response.json();
  return typeof data.extract === 'string' && data.extract.length > 0 ? data.extract : null;
}

export async function fetchSummary(term: string): Promise<string | null> {
  try {
    const direct = await fetchSummaryByTitle(term);
    if (direct) return direct;

    const bestTitle = await findBestTitle(term);
    if (!bestTitle) return null;

    return await fetchSummaryByTitle(bestTitle);
  } catch (e) {
    console.warn(e);
    return null;
  }
}
