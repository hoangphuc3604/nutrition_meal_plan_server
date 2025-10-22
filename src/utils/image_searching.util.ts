import 'dotenv/config';

export async function getUnsplashImage(query: string): Promise<string | null> {
  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
      query
    )}&per_page=1&orientation=landscape&client_id=${process.env.IMAGE_SEARCHING_KEY}`;

    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Unsplash API error: ${res.status}`);
    }

    const data = await res.json();

    if (data.results.length === 0) {
      throw new Error("No image found for that query.");
    }

    const imageUrl = data.results[0].urls.regular;
    return imageUrl;
  } catch (err: any) {
    console.error("Error fetching image:", err.message);
    throw new Error("Failed to fetch image from Unsplash.");    
  }
}
