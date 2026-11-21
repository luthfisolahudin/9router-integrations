import { createPiExtension } from "@luthfisolahudin/ai-integrations-pi";
import { provider } from "@luthfisolahudin/9router-integrations-provider";

export default createPiExtension(provider.packs[0]!, provider.effort);
