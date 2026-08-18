import type { APIRoute } from 'astro';
import { fetchRestaurantData } from '../lib/queries';

export const prerender = true;

/**
 * robots.txt — permite explícitamente los crawlers de IA (además de los clásicos).
 * Los sitios que NO explicitan un Allow para GPTBot, PerplexityBot, Google-Extended,
 * etc. quedan en un limbo (algunos crawlers respetan Allow por defecto, otros no).
 * Aquí lo hacemos explícito para que nos indexen sin dudas.
 */
export const GET: APIRoute = async () => {
  const { restaurant } = await fetchRestaurantData();
  const siteUrl = restaurant.dominio ?? '';

  const body = `# Casabella — robots.txt
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
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
};
