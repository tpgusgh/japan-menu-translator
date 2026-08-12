export async function fetchSummary(term: string): Promise<string | null> {
  try {
    const response = await fetch(`https://ko.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`, {
      headers: { 'User-Agent': 'JapanMenuTranslator/1.0 (Android app; contact: gimgibae2@gmail.com)' },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return typeof data.extract === 'string' && data.extract.length > 0 ? data.extract : null;
  } catch (e) {
    console.warn(e);
    return null;
  }
}
