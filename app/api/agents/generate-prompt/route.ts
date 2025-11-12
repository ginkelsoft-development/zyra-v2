import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentName, agentRole, agentDescription, capabilities, tools, promptType, existingPrompt } = body;

    if (!agentName || !agentRole) {
      return NextResponse.json({ error: 'Agent name and role are required' }, { status: 400 });
    }

    // Build the generation prompt based on promptType
    let userPrompt = '';

    if (promptType === 'system') {
      if (existingPrompt) {
        // Rewrite existing prompt
        userPrompt = `Herschrijf de volgende system prompt voor een AI agent genaamd "${agentName}" met rol "${agentRole}".

Huidige prompt:
${existingPrompt}

Agent details:
- Beschrijving: ${agentDescription || 'Niet opgegeven'}
- Capabilities: ${capabilities || 'Niet opgegeven'}
- Tools: ${tools || 'Niet opgegeven'}

Maak de prompt duidelijker, specifieker en effectiever. Houd de toon professioneel en instructief.
Geef ALLEEN de herschreven prompt terug, geen extra uitleg.`;
      } else {
        // Generate new prompt
        userPrompt = `Genereer een professionele system prompt voor een AI agent met de volgende specificaties:

Agent naam: ${agentName}
Rol: ${agentRole}
Beschrijving: ${agentDescription || 'Niet opgegeven'}
Capabilities: ${capabilities || 'Niet opgegeven'}
Tools: ${tools || 'Niet opgegeven'}

De system prompt moet:
1. Duidelijk de rol en verantwoordelijkheden definiëren
2. Specifieke instructies geven over hoe de agent moet werken
3. Vermelden welke tools beschikbaar zijn en hoe te gebruiken
4. Professioneel en beknopt zijn

Geef ALLEEN de system prompt terug, geen extra uitleg of context.`;
      }
    } else if (promptType === 'full') {
      if (existingPrompt) {
        // Rewrite existing full prompt
        userPrompt = `Herschrijf de volgende volledige prompt voor een AI agent genaamd "${agentName}" met rol "${agentRole}".

Huidige prompt:
${existingPrompt}

Agent details:
- Beschrijving: ${agentDescription || 'Niet opgegeven'}
- Capabilities: ${capabilities || 'Niet opgegeven'}
- Tools: ${tools || 'Niet opgegeven'}

Maak de prompt uitgebreider, met meer context en voorbeelden. Houd de toon professioneel.
Geef ALLEEN de herschreven prompt terug, geen extra uitleg.`;
      } else {
        // Generate new full prompt
        userPrompt = `Genereer een uitgebreide volledige prompt voor een AI agent met de volgende specificaties:

Agent naam: ${agentName}
Rol: ${agentRole}
Beschrijving: ${agentDescription || 'Niet opgegeven'}
Capabilities: ${capabilities || 'Niet opgegeven'}
Tools: ${tools || 'Niet opgegeven'}

De volledige prompt moet:
1. Een uitgebreide introductie van de agent en zijn rol
2. Gedetailleerde instructies over werkprocessen
3. Specifieke voorbeelden van hoe taken uit te voeren
4. Richtlijnen voor communicatie en output formatting
5. Best practices en tips
6. Error handling instructies

Geef ALLEEN de volledige prompt terug, geen extra uitleg of context.`;
      }
    }

    // Call Claude to generate/rewrite the prompt
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const generatedPrompt = message.content[0].type === 'text' ? message.content[0].text : '';

    return NextResponse.json({ prompt: generatedPrompt });
  } catch (error: any) {
    console.error('Error generating prompt:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate prompt' },
      { status: 500 }
    );
  }
}
