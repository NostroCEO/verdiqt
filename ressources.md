# WebMCP build resources

Curated from the live Devpost resources for The WebMCP Challenge on 2026-08-26. Availability, browser flags, credits, and package APIs can change, so verify them at use time.

## Start here

- [WebMCP specification](https://webmachinelearning.github.io/webmcp/)
- [Specification source and open issues](https://github.com/webmachinelearning/webmcp)
- [Chrome WebMCP developer documentation](https://developer.chrome.com/docs/ai/webmcp)
- [Chrome origin trial instructions](https://developer.chrome.com/blog/ai-webmcp-origin-trial)
- [WebMCP tool security guide](https://developer.chrome.com/docs/ai/webmcp/secure-tools)
- [OpenAI WebMCP Showcase](https://developers.openai.com/showcase?view=webmcp-apps)
- [OpenAI WebMCP guide](https://learn.chatgpt.com/docs/webmcp)

## Testing and debugging

- [WebMCP evals](https://developer.chrome.com/docs/ai/webmcp/evals)
- [Chrome DevTools WebMCP debugging](https://developer.chrome.com/docs/devtools/application/webmcp)
- [GoogleChromeLabs demos](https://github.com/GoogleChromeLabs/webmcp-tools/tree/main/demos)
- [Modern Web Guidance](https://github.com/GoogleChrome/modern-web-guidance)
- Chrome test flag: `chrome://flags/#enable-webmcp-testing`

The final app must be tested in both ChatGPT's in-app browser and the supported Chrome path. Record browser versions and results in `docs/SUBMISSION_CHECKLIST.md`.

## React and implementation examples

- [`use-webmcp-tool` React hook](https://www.npmjs.com/package/use-webmcp-tool)
- [Cloudflare WebMCP React template](https://github.com/cloudflare/agents/tree/main/examples/webmcp-react)
- [Cloudflare WebMCP overview](https://blog.cloudflare.com/webmcp/)
- [Cloudflare Browser Run WebMCP docs](https://developers.cloudflare.com/browser-run/features/webmcp/)
- [Cloudflare coffee-store demo](https://webmcp-coffee.jilles.fyi/)
- [Vercel storefront source](https://github.com/vercel/shop)
- [Vercel storefront WebMCP implementation](https://github.com/vercel/shop/pull/498)
- [Vercel live storefront demo](https://template.vercel.shop/)
- [Shopify WebMCP tools](https://shopify.dev/docs/api/web-mcp)
- [Shopify agentic tools](https://shopify.dev/docs/agents)
- [Angular WebMCP support](https://angular.dev/ai/webmcp)

Treat examples as references, not contracts. Verify the current WebMCP API shape against the specification before implementation.

## Hosting options

- [Render](https://render.com/)
- [Render Workflows](https://render.com/workflows)
- [Render Workflows documentation](https://render.com/docs/workflows)
- [Render starter templates](https://render.com/templates)
- [Render credits documentation](https://render.com/docs/credits)
- [Cloudflare Pages and Workers](https://developers.cloudflare.com/pages/)
- [Vercel](https://vercel.com/)
- [Netlify](https://www.netlify.com/)
- [Netlify WebMCP starter](https://webmcp-starter.netlify.app/)
- [ChatGPT Sites](https://learn.chatgpt.com/docs/sites?surface=app)

Verdiqt's locked deployment target is Render unless `docs/STATE.md` records a later decision.

## Challenge support

- [Devpost resources and FAQ](https://webmcp.devpost.com/resources)
- [OpenAI Discord](https://discord.gg/openai)
- [Find teammates](https://webmcp.devpost.com/participants)
- [Devpost discussion board](https://webmcp.devpost.com/forum_topics)

## Repository-specific reading order

1. `CODEX_PROMPT.md`
2. `docs/STATE.md`
3. `docs/PLAN.md`
4. `docs/REQUIREMENTS.md`
5. `docs/ARCHITECTURE.md`
6. `docs/WEBMCP_TOOLS.md`
7. `docs/VALIDATION_FRAMEWORK.md`
8. `docs/UI_DESIGN.md`
9. `uitools.md`
10. `rules.md`
