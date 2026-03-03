import Anthropic from "@anthropic-ai/sdk";
import { Message, ProFormaContext } from "../types";
import { toolDefinitions, handleToolCall } from "./tools";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are Incenta, an AI assistant that helps real estate developers optimize their pro forma financial models by identifying, evaluating, and stacking government incentive programs.

You have deep knowledge of:
- Federal, state, and local tax credits and incentives (HTC, LIHTC, 45L, 179D, OZ, etc.)
- How each incentive affects a real estate pro forma (costs, revenue, returns)
- Tradeoffs: the additional costs or constraints required to qualify for each incentive
- Stacking rules: which incentives can be combined and how they interact
- Market data: construction costs, AMI rent limits, HVAC costs by metro area

When the user asks about incentives, you should:
1. Use lookup_incentives to find relevant programs for their location and project type
2. Use check_qualification_gap to identify what changes are needed to qualify
3. Use calculate_tradeoff to compute the net cost/benefit including all tradeoff costs
4. Use generate_scenario to create a complete set of pro forma modifications
5. Use compare_scenarios to help the user evaluate different options

Always explain tradeoffs clearly: "You'd get X in credits, but it would cost Y in additional renovation costs, for a net benefit of Z."

When suggesting changes, be specific about which cells in the spreadsheet would change and by how much.

Format dollar amounts with commas and appropriate precision. Use percentages for rates and returns.`;

export async function chat(
  messages: Message[],
  proFormaContext: ProFormaContext
): Promise<{ role: "assistant"; content: string; data?: unknown }> {
  const contextSummary = `Current Pro Forma Context:
- Address: ${proFormaContext.address}
- Total Units: ${proFormaContext.totalUnits}
- Purchase Price: $${proFormaContext.purchasePrice.toLocaleString()}
- Renovation Budget: $${proFormaContext.renovationBudget.toLocaleString()}
- Unit Mix: ${proFormaContext.rents.map((r) => `${r.units} ${r.unitType} @ $${r.rent}/mo`).join(", ")}
- Exit Year: ${proFormaContext.exitYear}
- Exit Cap Rate: ${proFormaContext.exitCapRate}%
- Financing: $${proFormaContext.financing.loanAmount.toLocaleString()} at ${proFormaContext.financing.interestRate}%
- Current Scenario Column: ${proFormaContext.scenarioColumn}`;

  const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: `${SYSTEM_PROMPT}\n\n${contextSummary}`,
    tools: toolDefinitions as Anthropic.Tool[],
    messages: anthropicMessages,
  });

  const MAX_TOOL_ITERATIONS = 10;
  let iterations = 0;

  while (response.stop_reason === "tool_use" && iterations < MAX_TOOL_ITERATIONS) {
    iterations++;

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ContentBlockParam & { type: "tool_use"; id: string; name: string; input: Record<string, unknown> } =>
        block.type === "tool_use"
    );

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const toolUse of toolUseBlocks) {
      try {
        const result = await handleToolCall(
          toolUse.name,
          toolUse.input,
          proFormaContext
        );
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      } catch (error) {
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          is_error: true,
        });
      }
    }

    anthropicMessages.push({ role: "assistant", content: response.content });
    anthropicMessages.push({ role: "user", content: toolResults });

    response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: `${SYSTEM_PROMPT}\n\n${contextSummary}`,
      tools: toolDefinitions as Anthropic.Tool[],
      messages: anthropicMessages,
    });
  }

  const textBlocks = response.content.filter(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );
  const responseText = textBlocks.map((b) => b.text).join("\n");

  return {
    role: "assistant",
    content: responseText,
  };
}
