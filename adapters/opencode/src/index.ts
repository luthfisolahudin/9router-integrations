import { createOpenCodePlugin } from "@luthfisolahudin/ai-integrations-opencode";
import { provider } from "@luthfisolahudin/9router-integrations-provider";

export default createOpenCodePlugin(provider.packs[0]!, provider.effort);
