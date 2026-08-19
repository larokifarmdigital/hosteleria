import type { APIRoute } from 'astro';
import type { RestaurantData } from '@hosteleria/sanity-client';

export type CreateRobotsOpts = {
  fetchRestaurantData: () => Promise<RestaurantData>;
};

/**
 * robots.txt — permite explícitamente los crawlers de IA (además de los clásicos).
 * Los sitios que NO explicitan un Allow para GPTBot, PerplexityBot, Google-Extended,
 * etc. quedan en un limbo (algunos crawlers respetan Allow por defecto, otros no).
 */
export function createRobotsGET({ fetchRestaurantData }: CreateRobotsOpts): APIRoute {
  return async () => {
    const { restaurant } = await fetchRestaurantData();
    const siteUrl = restaurant.dominio ?? '';

    const body = `# ${restaurant.nombre} — robots.txt
# Buscadores clásicos y crawlers de IA permitidos explícitamente.

User-agent: *
Allow: /

# --- Buscadores IA / LLM ---
User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Perplexity-User
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: CCBot
Allow: /

User-agent: cohere-ai
Allow: /

User-agent: Bytespider
Allow: /

User-agent: DuckAssistBot
Allow: /

User-agent: Amazonbot
Allow: /
${siteUrl ? `\nSitemap: ${siteUrl}/sitemap.xml` : ''}
`;

    return new Response(body, {
      headers: { 'content-type': 'text/plain; charset=utf-8' }
    });
  };
}
