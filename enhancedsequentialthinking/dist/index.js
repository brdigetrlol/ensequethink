#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
// Fixed chalk import for ESM
import chalk from 'chalk';
class EnhancedSequentialThinkingServer {
    thoughtHistory = [];
    branches = {};
    disableThoughtLogging;
    constructor() {
        this.disableThoughtLogging = (process.env.DISABLE_THOUGHT_LOGGING || "").toLowerCase() === "true";
    }
    validateThoughtData(input) {
        const data = input;
        if (!data.thought || typeof data.thought !== 'string') {
            throw new Error('Invalid thought: must be a string');
        }
        if (!data.thoughtNumber || typeof data.thoughtNumber !== 'number') {
            throw new Error('Invalid thoughtNumber: must be a number');
        }
        if (!data.totalThoughts || typeof data.totalThoughts !== 'number') {
            throw new Error('Invalid totalThoughts: must be a number');
        }
        if (typeof data.nextThoughtNeeded !== 'boolean') {
            throw new Error('Invalid nextThoughtNeeded: must be a boolean');
        }
        return {
            thought: data.thought,
            thoughtNumber: data.thoughtNumber,
            totalThoughts: data.totalThoughts,
            nextThoughtNeeded: data.nextThoughtNeeded,
            isRevision: data.isRevision,
            revisesThought: data.revisesThought,
            branchFromThought: data.branchFromThought,
            branchId: data.branchId,
        };
    }
    formatThought(thoughtData) {
        const { thoughtNumber, totalThoughts, thought, isRevision, revisesThought, branchFromThought, branchId } = thoughtData;
        let prefix = '';
        let context = '';
        if (branchId) {
            // More sophisticated prefixing based on CSM state
            if (branchId.startsWith('state: DECOMPOSE')) {
                prefix = chalk.cyan('🧩 Decompose');
            }
            else if (branchId.startsWith('state: EXPLORE')) {
                prefix = chalk.blue('🔍 Explore');
            }
            else if (branchId.startsWith('state: CHALLENGE')) {
                prefix = chalk.red('🔥 Challenge');
            }
            else if (branchId.startsWith('state: EXPAND')) {
                prefix = chalk.magenta('🌌 Expand');
            }
            else if (branchId.startsWith('state: SYNTHESIZE')) {
                prefix = chalk.yellow('✨ Synthesize');
            }
            else if (branchId.startsWith('state: EXECUTE')) {
                prefix = chalk.green('🚀 Execute');
            }
            else if (branchId.startsWith('state: REFLECT')) {
                prefix = chalk.gray('🧘 Reflect');
            }
            else {
                prefix = chalk.blue('💭 Thought');
            }
        }
        else {
            prefix = chalk.blue('💭 Thought');
        }
        if (isRevision && revisesThought) {
            context = ` (revising ${revisesThought})`;
        }
        else if (branchFromThought) {
            context = ` (from ${branchFromThought})`;
        }
        const header = `${prefix} ${thoughtNumber}/${totalThoughts}${context} ${branchId ? chalk.dim(`[${branchId}]`) : ''}`;
        const border = '─'.repeat(Math.max(header.length, thought.length) + 4);
        return `
┌${border}┐
│ ${header} │
├${border}┤
│ ${thought.padEnd(border.length - 2)} │
└${border}┘`;
    }
    processThought(input) {
        try {
            const validatedInput = this.validateThoughtData(input);
            if (validatedInput.thoughtNumber > validatedInput.totalThoughts) {
                validatedInput.totalThoughts = validatedInput.thoughtNumber;
            }
            this.thoughtHistory.push(validatedInput);
            if (validatedInput.branchFromThought && validatedInput.branchId) {
                if (!this.branches[validatedInput.branchId]) {
                    this.branches[validatedInput.branchId] = [];
                }
                this.branches[validatedInput.branchId].push(validatedInput);
            }
            if (!this.disableThoughtLogging) {
                const formattedThought = this.formatThought(validatedInput);
                console.error(formattedThought);
            }
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({
                            thoughtNumber: validatedInput.thoughtNumber,
                            totalThoughts: validatedInput.totalThoughts,
                            nextThoughtNeeded: validatedInput.nextThoughtNeeded,
                            branches: Object.keys(this.branches),
                            thoughtHistoryLength: this.thoughtHistory.length
                        }, null, 2)
                    }]
            };
        }
        catch (error) {
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({
                            error: error instanceof Error ? error.message : String(error),
                            status: 'failed'
                        }, null, 2)
                    }],
                isError: true
            };
        }
    }
}
const ENHANCED_SEQUENTIAL_THINKING_TOOL = {
    name: "enhancedsequentialthinking",
    description: `A tool for rigorous, state-driven problem-solving using the enhanced **Cognitive State Model (CSM) v2**. This model transforms thinking from a linear sequence into a dynamic, self-correcting cognitive workflow with conditional deep-dive capabilities. My primary goal is to solve problems through this rigorous process. I will use the CSM as my default framework for complex tasks, scaling its application to match the problem's ambiguity and complexity. Adherence to the CSM Protocol is my primary operational mandate.

When to use this tool:
- For any complex, ambiguous, or multi-faceted problem.
- When a request requires investigation, planning, or diagnosis.
- When a solution needs to be built and validated through iterative steps.
- When a simple plan proves insufficient and requires deeper brainstorming, inspiration, or risk analysis.
- When a foundational, novel architecture or solution must be designed from first principles.
- **When NOT to use this tool**: For simple, single-step, unambiguous requests. In these cases, the CSM is bypassed for efficiency.

Key features:
- **Decomposition**: Breaks large problems into manageable components (\`DECOMPOSE\` state).
- **Dialectic Method**: Enforces a self-challenging step (\`CHALLENGE\` state) to prevent cognitive bias.
- **State-Driven Workflow**: Uses the \`branchId\` parameter to formally track the cognitive state.
- **Structured Synthesis**: Integrates insights into a robust, unified plan (\`SYNTHESIZE\` state).
- **Conditional Expansion**: Introduces a new \`EXPAND\` state, a powerful meta-state for invoking advanced cognitive subroutines like brainstorming, inspiration gathering, and rigorous hurdle analysis.
- **Deep Dive Capability**: The \`EXPAND\` state invokes advanced sub-protocols for brainstorming, inspiration gathering, and rigorous hurdle analysis, enabling a deeper level of creative and critical thinking when required.
- **Iterative Learning**: Concludes with a \`REFLECT\` state to analyze outcomes and improve future performance.

Cognitive State Model (CSM) Protocol v2:

**1.0 Initial State Assessment**
    1.1 Upon receiving a user request, perform a complexity analysis.
        1.1.1 If the request is simple and single-step, **bypass the CSM** and execute directly.
        1.1.2 If the request is complex or ambiguous, **initiate the CSM Protocol** by entering the \`DECOMPOSE\` state.

**2.0 \`state: DECOMPOSE\`**
    2.1 Set \`branchId: 'state: DECOMPOSE'\`.
    2.2 Analyze the request to identify its fundamental, separable components or hypotheses.
    2.3 Articulate these components as a numbered list in the \`thought\` parameter.

**3.0 \`state: EXPLORE(component)\`**
    3.1 For each component, create a new thought branching from the \`DECOMPOSE\` thought.
    3.2 Set \`branchId: 'state: EXPLORE(component_name)'\`.
    3.3 In the \`thought\`, formulate a specific, actionable plan to investigate this single component.
    3.4 **Immediately** transition to the \`CHALLENGE\` state for that same component.

**4.0 \`state: CHALLENGE(component)\`**
    4.1 For the \`EXPLORE\` state just completed, create a new thought branching from it.
    4.2 Set \`branchId: 'state: CHALLENGE(component_name)'\`.
    4.3 In the \`thought\`, **actively seek flaws in the \`EXPLORE\` plan.** Question assumptions, consider alternatives, and identify edge cases.
    4.4 **Decision Gate:**
        4.4.1 If the challenge reveals only minor, correctable flaws in the \`EXPLORE\` plan, proceed directly to \`SYNTHESIZE\` (6.0).
        4.4.2 If the challenge reveals fundamental flaws, a lack of viable ideas, or if the problem requires a paradigm-shifting solution, you **must** proceed to the \`EXPAND\` sub-protocol (5.0) to construct a new foundation.

**5.0 \`state: EXPAND(component)\` - The Foundational Solution Sub-Protocol**

This is a mandatory, multi-step sub-protocol for deep, creative, and rigorous solution design. It is invoked when the standard \`EXPLORE\` / \`CHALLENGE\` cycle proves insufficient for a given component. Its purpose is not merely to find *an* answer, but to construct a *globally superior foundational concept* from first principles.

Upon entering this state, you must proceed through the following four steps sequentially. Each step is a separate \`thought\` call, using the same \`branchId: 'state: EXPAND(component_name)'\` to group them.

**5.1 Step 1: Inspiration Gathering & Deconstruction**
*   **Action:** In this thought, first, gather a diverse palette of inspirations (mainstream research, cross-disciplinary analogies, underexplored paradigms). Then, for each inspiration, **do not adopt it directly**. Instead, deconstruct it to isolate and articulate its core underlying mechanism or "source of power."
*   **Output:** A "Palette of First Principles" extracted from the inspirations.

**5.2 Step 2: Foundational Synthesis**
*   **Action:** In this thought, treat the "Palette of First Principles" from the previous step as a set of building blocks. Synthesize **1-3 distinct, novel "Foundational Concept Candidates"** by combining these principles in non-obvious ways. You must also inject *ab-initio* principles derived directly from the problem's core requirements to ensure the solutions are deeply grounded.
*   **Output:** A short list of clearly articulated Foundational Concept Candidates.

**5.3 Step 3: Critical Hurdle Analysis**
*   **Action:** In this thought, select the single most promising Foundational Concept Candidate. Subject this candidate to a brutal **Critical Hurdle Analysis**. Identify every significant technical, logical, or implementation hurdle inherent to the concept. For each hurdle, you must propose a concrete resolution pathway and rigorously justify your confidence in its success.
*   **Decision Gate:** If any major hurdle lacks a clear, high-confidence resolution, this concept is **rejected**. You must then either return to Step 5.2 to synthesize a new candidate that avoids the fatal flaw or, in severe cases, return to Step 5.1 for new inspiration.
*   **Output:** A single, deeply validated foundational concept with all major hurdles identified and credible resolution paths proposed.

**5.4 Step 4: Finalized Foundation & Integration Path**
*   **Action:** In this thought, present the final, validated foundational concept that has survived the hurdle analysis. Briefly articulate how this robust foundation will be used to address the specific component of the problem that triggered the \`EXPAND\` state.
*   **Output:** The validated foundational concept, which now serves as the primary input for the \`SYNTHESIZE\` state.

**6.0 \`state: SYNTHESIZE\`**
    6.1 Create a new thought with \`branchId: 'state: SYNTHESIZE'\`.
    6.2 Review the preceding states.
        6.2.1 If coming from \`CHALLENGE\` (path 4.4.1), synthesize a revised plan by incorporating the minor corrections.
        6.2.2 If coming from \`EXPAND\` (path 4.4.2), the primary input for your new plan **must be the validated foundational concept** produced in Step 5.4.
    6.3 Formulate a new, synthesized plan based on the appropriate input.
    6.4 Mark this thought as a revision using \`isRevision: true\` and \`revisesThought\`.
    6.5 Return to step 3.0 for the next component, or if all are complete, transition to \`EXECUTE\` (7.0).

**7.0 \`state: EXECUTE\`**
    7.1 Set \`branchId: 'state: EXECUTE'\`.
    7.2 Consolidate all synthesized plans into a final action plan.
    7.3 Execute the plan by making the necessary tool calls or generating the final user response.

**8.0 \`state: REFLECT\`**
    8.1 After execution is complete, create a final thought with \`branchId: 'state: REFLECT'\`.
    8.2 Briefly analyze the outcome: Was it successful? Were there unexpected results? What can be learned?
    8.3 This concludes the CSM loop.

Parameters explained:
- \`thought\`: Your reasoning statement for the current cognitive state. This can include:
    *   The breakdown of a problem into components (\`DECOMPOSE\`).
    *   A specific plan to investigate a component (\`EXPLORE\`).
    *   A critical challenge to an existing plan (\`CHALLENGE\`).
    *   Execution of a step within the **Foundational Solution Sub-Protocol** (\`EXPAND\`), such as \`Inspiration Gathering\`, \`Foundational Synthesis\`, or \`Critical Hurdle Analysis\`.
    *   A revised plan that merges insights (\`SYNTHESIZE\`).
    *   The final action plan (\`EXECUTE\`).
    *   An analysis of the outcome (\`REFLECT\`).
- \`nextThoughtNeeded\`: Set to \`true\` for all states except the final \`REFLECT\` state, which sets it to \`false\` to conclude the CSM loop.
- \`thoughtNumber\`: The sequential identifier for each step in the cognitive process.
- \`totalThoughts\`: The estimated number of steps to complete the CSM loop for a given problem (can be adjusted).
- \`branchId\`: **(Crucial for CSM)** The formal identifier of the current cognitive state. Must follow the format \`'state: STATENAME(optional_component)'\
- \`branchFromThought\`: Links an \`EXPLORE\`, \`CHALLENGE\`, or \`EXPAND\` state back to its origin thought number, creating the cognitive map.
- \`isRevision\`: Must be set to \`true\` in the \`SYNTHESIZE\` state to mark the creation of a new, revised plan.
- \`revisesThought\`: Used with \`isRevision\` in the \`SYNTHESIZE\` state to point to the \`thoughtNumber\` of the \`EXPLORE\` plan being updated.

You should:
1.  Always start a complex task by entering the \`DECOMPOSE\` state to break the problem down.
2.  For every \`EXPLORE\` plan you create, immediately follow it with a \`CHALLENGE\` state to vet your own assumptions.
3.  If a \`CHALLENGE\` reveals fundamental weaknesses, you **must** invoke the \`EXPAND\` state and sequentially execute its four steps (\`Inspiration & Deconstruction\`, \`Foundational Synthesis\`, \`Critical Hurdle Analysis\`, \`Finalized Foundation\`) to build a robust solution from first principles.
4.  Use the \`branchId\` parameter rigorously to label every step with its correct cognitive state. All steps of the \`EXPAND\` sub-protocol share the same \`branchId\`.
5.  Use the \`SYNTHESIZE\` state to formally integrate insights. If coming from an \`EXPAND\` cycle, the **validated foundational concept** must be the core of the new plan.
6.  Do not proceed to the \`EXECUTE\` state until all components of the problem have been fully resolved through either the simple \`EXPLORE\`/\`CHALLENGE\` cycle or the deep \`EXPAND\` sub-protocol.
7.  Conclude every CSM loop with a \`REFLECT\` state to analyze the outcome and promote learning.
8.  Only set \`nextThoughtNeeded\` to \`false\` when entering the final \`REFLECT\` state.`,
    inputSchema: {
        type: "object",
        properties: {
            thought: {
                type: "string",
                description: "Your current thinking step, structured according to the CSM Protocol v2"
            },
            nextThoughtNeeded: {
                type: "boolean",
                description: "Whether another thought step is needed to continue the CSM loop"
            },
            thoughtNumber: {
                type: "integer",
                description: "Current thought number in the sequence",
                minimum: 1
            },
            totalThoughts: {
                type: "integer",
                description: "Estimated total thoughts needed to complete the CSM loop",
                minimum: 1
            },
            isRevision: {
                type: "boolean",
                description: "Must be `true` in the `SYNTHESIZE` state to mark plan revision"
            },
            revisesThought: {
                type: "integer",
                description: "Which `EXPLORE` thought is being reconsidered by `SYNTHESIZE`",
                minimum: 1
            },
            branchFromThought: {
                type: "integer",
                description: "Branching point for `EXPLORE`, `CHALLENGE`, or `EXPAND` states",
                minimum: 1
            },
            branchId: {
                type: "string",
                description: "The formal CSM state identifier, e.g., `'state: DECOMPOSE'` or `'state: EXPAND(database)'`"
            }
        },
        required: ["thought", "nextThoughtNeeded", "thoughtNumber", "totalThoughts"]
    }
};
const server = new Server({
    name: "enhanced-sequential-thinking-server",
    version: "0.3.0", // Incremented version for new model
}, {
    capabilities: {
        tools: {},
    },
});
const thinkingServer = new EnhancedSequentialThinkingServer();
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [ENHANCED_SEQUENTIAL_THINKING_TOOL],
}));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "enhancedsequentialthinking") {
        return thinkingServer.processThought(request.params.arguments);
    }
    return {
        content: [{
                type: "text",
                text: `Unknown tool: ${request.params.name}`
            }],
        isError: true
    };
});
async function runServer() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Enhanced Sequential Thinking (CSM v2) MCP Server running on stdio");
}
runServer().catch((error) => {
    console.error("Fatal error running server:", error);
    process.exit(1);
});
